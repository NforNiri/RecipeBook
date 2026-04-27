import { createServerSupabaseClient } from "@/lib/db/server";
import { createClient } from "@supabase/supabase-js";
import type { OwnerRating } from "@/types/recipe";
import type { Database } from "@/types/db";

export interface FamilyRating {
  userId: string;
  displayName: string | null;
  stars: number;
  comment: string | null;
  updatedAt: string;
}

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
 * Returns all family member ratings for a recipe, joined with display names.
 * RLS: owner sees all rows; a family member sees only their own row.
 */
export async function getFamilyRatings(recipeId: string): Promise<FamilyRating[]> {
  const supabase = await createServerSupabaseClient();

  const { data: ratings } = await supabase
    .from("family_ratings")
    .select("user_id, stars, comment, updated_at")
    .eq("recipe_id", recipeId)
    .order("updated_at", { ascending: false });

  if (!ratings || ratings.length === 0) return [];

  const userIds = ratings.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  const nameMap = new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []);

  return ratings.map((r) => ({
    userId: r.user_id,
    displayName: nameMap.get(r.user_id) ?? null,
    stars: r.stars,
    comment: r.comment,
    updatedAt: r.updated_at,
  }));
}

/**
 * Returns the current user's own family rating for a recipe, or null.
 */
export async function getMyFamilyRating(
  recipeId: string
): Promise<{ stars: number; comment: string | null } | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("family_ratings")
    .select("stars, comment")
    .eq("recipe_id", recipeId)
    .eq("user_id", user.id)
    .single();

  return data ?? null;
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
