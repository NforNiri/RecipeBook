import { createServerSupabaseClient } from "@/lib/db/server";
import type { OwnerRating } from "@/types/recipe";

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
