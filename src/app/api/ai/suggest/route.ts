import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/server";
import { streamSuggestion } from "@/lib/ai/claude";
import type { AiJobType, Json } from "@/types/db";
import type { Ingredient, TiptapDocument } from "@/types/recipe";
import type { Recipe } from "@/types/recipe";

function toJson<T>(v: T): Json {
  return v as unknown as Json;
}

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const supabase = await createServerSupabaseClient();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { recipeId, mode } = body as { recipeId?: string; mode?: string };

  if (!recipeId || typeof recipeId !== "string") {
    return NextResponse.json({ error: "recipeId is required" }, { status: 400 });
  }
  if (mode !== "upgrade" && mode !== "swap") {
    return NextResponse.json(
      { error: "mode must be 'upgrade' or 'swap'" },
      { status: 400 }
    );
  }

  // ── Fetch recipe + verify ownership ──────────────────────────────────────
  const { data: row, error: fetchError } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", recipeId)
    .eq("owner_id", user.id)
    .single();

  if (fetchError || !row) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const recipe: Recipe = {
    id: row.id,
    ownerId: row.owner_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    heroImageUrl: row.hero_image_url,
    category: row.category,
    tags: row.tags,
    sourceType: row.source_type,
    sourceValue: row.source_value,
    prepMinutes: row.prep_minutes,
    cookMinutes: row.cook_minutes,
    servings: row.servings,
    ingredients: (row.ingredients as unknown) as Ingredient[],
    instructions: (row.instructions as unknown) as TiptapDocument,
    notes: (row.notes as unknown) as TiptapDocument | null,
    isPublic: row.is_public,
    publicShareId: row.public_share_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // ── Create ai_jobs row (pending) ──────────────────────────────────────────
  // runAiJob from jobs.ts awaits a complete fn() result and is not suitable for
  // streaming. We replicate its two-step logic (insert pending → update on
  // complete/error) inline so the HTTP response can stream concurrently.
  const { data: jobRow, error: insertError } = await supabase
    .from("ai_jobs")
    .insert({
      user_id: user.id,
      job_type: mode as AiJobType,
      input: toJson({ recipeId, mode }),
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !jobRow) {
    return NextResponse.json(
      { error: "Failed to create ai_jobs row" },
      { status: 500 }
    );
  }

  const jobId = jobRow.id;

  // ── Start streaming ───────────────────────────────────────────────────────
  let { textStream, tokensUsed } = streamSuggestion({ recipe, mode });

  // Fire-and-forget: update the job row once the stream resolves token usage.
  tokensUsed
    .then((tokens) =>
      supabase
        .from("ai_jobs")
        .update({
          status: "success",
          tokens_used: tokens,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId)
    )
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      supabase
        .from("ai_jobs")
        .update({
          status: "error",
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    });

  return new Response(textStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      // Prevent proxy buffering so text reaches the client incrementally.
      "X-Accel-Buffering": "no",
      "Cache-Control": "no-cache",
    },
  });
}
