import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import type { Database } from "@/types/db";

interface RequestBody {
  shareId: string;
  fingerprint: string;
  stars: number;
  comment?: string;
  guestName?: string;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { shareId, fingerprint, stars, comment, guestName } = body;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!shareId || typeof shareId !== "string") {
    return NextResponse.json({ error: "Missing shareId" }, { status: 400 });
  }
  if (!fingerprint || typeof fingerprint !== "string") {
    return NextResponse.json({ error: "Missing fingerprint" }, { status: 400 });
  }
  if (!stars || typeof stars !== "number" || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "stars must be between 1 and 5" }, { status: 400 });
  }
  if (comment && comment.length > 500) {
    return NextResponse.json({ error: "Comment too long (max 500 chars)" }, { status: 400 });
  }
  if (guestName && guestName.length > 80) {
    return NextResponse.json({ error: "Name too long (max 80 chars)" }, { status: 400 });
  }

  // ── Rate limit ─────────────────────────────────────────────────────────────
  const salt = process.env.RATING_IP_SALT ?? "";
  const ip = getClientIp(req);
  const ipHash = createHash("sha256").update(ip + salt).digest("hex");

  if (!checkRateLimit(ipHash)) {
    return NextResponse.json(
      { error: "Too many ratings. Please try again later." },
      { status: 429 }
    );
  }

  // ── Look up recipe by share ID ─────────────────────────────────────────────
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, is_public")
    .eq("public_share_id", shareId)
    .eq("is_public", true)
    .maybeSingle();

  if (!recipe) {
    return NextResponse.json(
      { error: "Recipe not found or no longer shared." },
      { status: 404 }
    );
  }

  // ── Insert rating ──────────────────────────────────────────────────────────
  const { data: inserted, error } = await supabase
    .from("guest_ratings")
    .insert({
      recipe_id: recipe.id,
      fingerprint,
      stars,
      comment: comment ?? null,
      guest_name: guestName ?? null,
      ip_hash: ipHash,
    })
    .select("stars, comment")
    .single();

  if (error) {
    // Unique constraint violation: (recipe_id, fingerprint) — already rated.
    // Return the existing rating silently with HTTP 200.
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("guest_ratings")
        .select("stars, comment")
        .eq("recipe_id", recipe.id)
        .eq("fingerprint", fingerprint)
        .single();

      return NextResponse.json({
        ok: true,
        stars: existing?.stars ?? stars,
        comment: existing?.comment ?? null,
      });
    }

    return NextResponse.json({ error: "Could not save rating." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    stars: inserted.stars,
    comment: inserted.comment,
  });
}
