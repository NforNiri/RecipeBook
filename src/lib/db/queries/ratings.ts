import { createServerSupabaseClient } from "@/lib/db/server";
import { createClient } from "@supabase/supabase-js";
import type { OwnerRating } from "@/types/recipe";
import type { Database } from "@/types/db";

export async function getOwnerRating(recipeId: string): Promise<OwnerRating | null> {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("owner_ratings")
    .select("recipe_id, stars, notes, updated_at")
    .eq("recipe_id", recipeId)
    .single();

  if (!data) return null;

  return {
    recipeId: data.recipe_id,
    stars: data.stars,
    notes: data.notes,
    updatedAt: data.updated_at,
  };
}

export interface GuestRatingSummary {
  avgStars: number;
  count: number;
  recent: { id: string; stars: number; comment: string | null; guestName: string | null; createdAt: string }[];
}

/**
 * Returns a summary of guest ratings for a recipe.
 * Uses the anon client (no auth required) because the RLS policy allows
 * public reads when is_public = true.
 */
export async function getGuestRatingsSummary(
  recipeId: string
): Promise<GuestRatingSummary | null> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("guest_ratings")
    .select("id, stars, comment, guest_name, created_at")
    .eq("recipe_id", recipeId)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return null;

  const avg =
    Math.round((data.reduce((s, r) => s + r.stars, 0) / data.length) * 10) / 10;

  return {
    avgStars: avg,
    count: data.length,
    recent: data.slice(0, 3).map((r) => ({
      id: r.id,
      stars: r.stars,
      comment: r.comment,
      guestName: r.guest_name,
      createdAt: r.created_at,
    })),
  };
}
