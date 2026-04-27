import { createServerSupabaseClient } from "@/lib/db/server";
import type { Database, RecipeCategory } from "@/types/db";
import type { Recipe, RecipeCard, Ingredient, TiptapDocument } from "@/types/recipe";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

function rowToRecipe(row: RecipeRow): Recipe {
  return {
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
}

export interface RecipeFilters {
  q?: string;
  category?: string;
  maxCook?: string;
  hasRating?: string; // "1" = true
}

export async function getOwnerRecipes(
  filters: RecipeFilters = {}
): Promise<RecipeCard[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Pre-fetch rated recipe IDs when filtering by rating
  let ratedIds: string[] | null = null;
  if (filters.hasRating === "1") {
    const { data: ratings } = await supabase
      .from("owner_ratings")
      .select("recipe_id");
    if (!ratings || ratings.length === 0) return [];
    ratedIds = ratings.map((r) => r.recipe_id);
  }

  // Fetch all owner ratings for displaying stars on cards
  const { data: allRatings } = await supabase
    .from("owner_ratings")
    .select("recipe_id, stars");
  const ratingMap = new Map(
    allRatings?.map((r) => [r.recipe_id, r.stars]) ?? []
  );

  type Row = {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    hero_image_url: string | null;
    category: string;
    tags: string[];
    prep_minutes: number | null;
    cook_minutes: number | null;
    servings: number | null;
    created_at: string;
  };

  let query = supabase
    .from("recipes")
    .select(
      "id, slug, title, description, hero_image_url, category, tags, prep_minutes, cook_minutes, servings, created_at"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (filters.q) {
    const term = filters.q.trim();
    if (term) {
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }
  }

  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category as RecipeCategory);
  }

  if (filters.maxCook) {
    const max = parseInt(filters.maxCook, 10);
    if (!isNaN(max) && max > 0) {
      query = query.lte("cook_minutes", max);
    }
  }

  if (ratedIds) {
    query = query.in("id", ratedIds);
  }

  const { data } = await query;
  if (!data) return [];

  return (data as Row[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    heroImageUrl: row.hero_image_url,
    category: row.category as RecipeCategory,
    tags: row.tags,
    prepMinutes: row.prep_minutes,
    cookMinutes: row.cook_minutes,
    servings: row.servings,
    createdAt: row.created_at,
    ownerRating: ratingMap.get(row.id) ?? null,
  }));
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("recipes")
    .select("*")
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return rowToRecipe(data);
}

/** Returns all unique tags across the owner's recipes, sorted. */
export async function getOwnerTags(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("recipes")
    .select("tags")
    .eq("owner_id", user.id);

  if (!data) return [];

  const all = data.flatMap((r) => r.tags as string[]);
  return [...new Set(all)].sort();
}
