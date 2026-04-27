import { NextRequest, NextResponse } from "next/server";
import { getServerUser, createServerSupabaseClient } from "@/lib/db/server";
import { extractRecipeFromImage } from "@/lib/ai/gemini";
import { runAiJob } from "@/lib/ai/jobs";

export const runtime = "nodejs";

const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse multipart form data ─────────────────────────────────────────
  let file: File;
  try {
    const formData = await req.formData();
    const raw = formData.get("image");
    if (!raw || typeof raw === "string") {
      return NextResponse.json({ error: "Missing image file in form data" }, { status: 400 });
    }
    file = raw as File;
  } catch {
    return NextResponse.json({ error: "Could not parse multipart form data" }, { status: 400 });
  }

  // ── Validate file type ────────────────────────────────────────────────
  if (!ACCEPTED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: `Unsupported file type "${file.type}". Please upload a JPEG, PNG, WebP, or HEIC image.`,
      },
      { status: 415 }
    );
  }

  // ── Validate file size (server-side belt-and-suspenders) ─────────────
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Please upload an image under 10 MB." },
      { status: 413 }
    );
  }

  // ── Read file contents ────────────────────────────────────────────────
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");

  // ── Upload to recipes-imports bucket (temporary, will be deleted) ─────
  const supabase = await createServerSupabaseClient();
  const ext = file.type.split("/")[1].replace("heif", "heic");
  const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("recipes-imports")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[import-photo] storage upload failed:", uploadError.message);
    return NextResponse.json(
      { error: "Failed to upload image. Please try again." },
      { status: 500 }
    );
  }

  // ── Run Gemini vision extraction (always delete storage file after) ───
  let recipeData;
  try {
    recipeData = await runAiJob({
      userId: user.id,
      jobType: "photo_import",
      input: { filename: file.name, mimeType: file.type, sizeBytes: file.size },
      fn: () => extractRecipeFromImage(base64, file.type),
    });
  } catch (err) {
    // Delete the stored image even on failure
    await supabase.storage.from("recipes-imports").remove([storagePath]);

    const message = err instanceof Error ? err.message : "AI extraction failed";
    console.error("[import-photo] extraction error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // ── Delete the stored image now that extraction is complete ───────────
  await supabase.storage.from("recipes-imports").remove([storagePath]);

  if (!recipeData) {
    return NextResponse.json(
      {
        error:
          "Could not extract a recipe from this image. Make sure the photo shows a recipe clearly, then try again.",
      },
      { status: 422 }
    );
  }

  recipeData.sourceType = "photo";
  return NextResponse.json(recipeData);
}
