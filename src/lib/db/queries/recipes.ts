import { createServerSupabaseClient } from "@/lib/db/server";
import { createClient } from "@supabase/supabase-js";
import type { Database, RecipeCategory } from "@/types/db";
import type { Recipe, RecipeCard, Ingredient, TiptapDocument } from "@/types/recipe";
import {
  MAX_COOK_OPTIONS,
  RATING_OPTIONS,
  RECIPE_CATEGORIES,
  type RecipeFilterCounts,
} from "@/lib/recipe/filter-options";

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
  rating?: string;
}

export async function getOwnerRecipes(
  filters: RecipeFilters = {}
): Promise<RecipeCard[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Pre-fetch rated recipe IDs when filtering by rating.
  let ratedIds: string[] | null = null;
  const starRating = filters.rating ? parseInt(filters.rating, 10) : NaN;
  const shouldFilterRating =
    filters.hasRating === "1" || (starRating >= 1 && starRating <= 5);
  if (shouldFilterRating) {
    let ratingsQuery = supabase
      .from("owner_ratings")
      .select("recipe_id");

    if (starRating >= 1 && starRating <= 5) {
      ratingsQuery = ratingsQuery.eq("stars", starRating);
    }

    const { data: ratings } = await ratingsQuery;
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

export async function getOwnerRecipeFilterCounts(): Promise<RecipeFilterCounts> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const emptyCounts: RecipeFilterCounts = {
    total: 0,
    categories: Object.fromEntries(
      RECIPE_CATEGORIES.map((category) => [category.value, 0])
    ) as RecipeFilterCounts["categories"],
    rated: 0,
    ratings: Object.fromEntries(
      RATING_OPTIONS.map((rating) => [rating, 0])
    ) as RecipeFilterCounts["ratings"],
    maxCook: Object.fromEntries(
      MAX_COOK_OPTIONS.map((option) => [option.value, 0])
    ) as RecipeFilterCounts["maxCook"],
  };

  if (!user) return emptyCounts;

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, category, cook_minutes")
    .eq("owner_id", user.id);

  if (!recipes || recipes.length === 0) return emptyCounts;

  const counts: RecipeFilterCounts = {
    ...emptyCounts,
    total: recipes.length,
    categories: { ...emptyCounts.categories },
    ratings: { ...emptyCounts.ratings },
    maxCook: { ...emptyCounts.maxCook },
  };

  for (const recipe of recipes) {
    counts.categories[recipe.category] += 1;

    if (typeof recipe.cook_minutes === "number") {
      for (const option of MAX_COOK_OPTIONS) {
        if (recipe.cook_minutes <= Number(option.value)) {
          counts.maxCook[option.value] += 1;
        }
      }
    }
  }

  const recipeIds = recipes.map((recipe) => recipe.id);
  const { data: ratings } = await supabase
    .from("owner_ratings")
    .select("recipe_id, stars")
    .in("recipe_id", recipeIds);

  counts.rated = new Set(ratings?.map((rating) => rating.recipe_id) ?? []).size;
  for (const rating of ratings ?? []) {
    if (rating.stars >= 1 && rating.stars <= 5) {
      counts.ratings[rating.stars as keyof RecipeFilterCounts["ratings"]] += 1;
    }
  }

  return counts;
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

/**
 * Fetches a public recipe by its share ID using the anon client (no auth).
 * Only returns the recipe if is_public = true (enforced by RLS).
 */
export async function getRecipeByShareId(shareId: string): Promise<Recipe | null> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("recipes")
    .select("*")
    .eq("public_share_id", shareId)
    .eq("is_public", true)
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
