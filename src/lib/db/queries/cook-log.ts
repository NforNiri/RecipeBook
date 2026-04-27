import { createServerSupabaseClient } from "@/lib/db/server";
import type { CookLogEntry } from "@/types/recipe";

export async function getCookHistory(
  recipeId: string,
  limit = 10
): Promise<CookLogEntry[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("cook_log")
    .select("id, recipe_id, user_id, cooked_at, note, result_rating")
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id)
    .order("cooked_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    recipeId: row.recipe_id,
    userId: row.user_id,
    cookedAt: row.cooked_at,
    note: row.note,
    resultRating: row.result_rating,
  }));
}
