"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/db/server";
import { generateUniqueSlug, isSlugAvailable, validateSlug } from "@/lib/utils/slug";
import type { Json, RecipeCategory } from "@/types/db";
import type { TiptapDocument, Ingredient } from "@/types/recipe";

/** Cast our typed structures to Supabase's Json type for storage. */
function toJson<T>(value: T): Json {
  return value as unknown as Json;
}

export interface RecipeFormData {
  title: string;
  description: string;
  category: RecipeCategory;
  tags: string[];
  prepMinutes: number | null;
  cookMinutes: number | null;
  servings: number | null;
  heroImageUrl: string | null;
  instructions: TiptapDocument;
  ingredients: Ingredient[];
  /** Only provided when the user manually edits the slug in the edit view. */
  slug?: string;
}

export async function createRecipe(data: RecipeFormData): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const slug = await generateUniqueSlug(data.title, user.id, supabase);

  const { error } = await supabase.from("recipes").insert({
    owner_id: user.id,
    slug,
    title: data.title,
    description: data.description || null,
    category: data.category,
    tags: data.tags,
    prep_minutes: data.prepMinutes,
    cook_minutes: data.cookMinutes,
    servings: data.servings,
    hero_image_url: data.heroImageUrl,
    instructions: toJson(data.instructions),
    ingredients: toJson(data.ingredients),
  });

  if (error) throw new Error(error.message);
  redirect(`/recipes/${slug}`);
}

export async function updateRecipe(
  recipeId: string,
  data: RecipeFormData
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("recipes")
    .select("slug, owner_id")
    .eq("id", recipeId)
    .eq("owner_id", user.id)
    .single();

  if (!existing) throw new Error("Recipe not found");

  // Determine the slug to use
  let newSlug = existing.slug;

  if (data.slug && data.slug !== existing.slug) {
    // User manually changed the slug — validate format then check uniqueness
    const formatError = validateSlug(data.slug);
    if (formatError) throw new Error(formatError);

    const available = await isSlugAvailable(data.slug, user.id, supabase, recipeId);
    if (!available) {
      throw new Error(
        `The slug "${data.slug}" is already taken by another recipe. Please choose a different one.`
      );
    }
    newSlug = data.slug;
  } else if (!data.slug) {
    // No manual slug provided — keep existing slug (title change does NOT auto-update slug)
    newSlug = existing.slug;
  }

  const { error } = await supabase
    .from("recipes")
    .update({
      slug: newSlug,
      title: data.title,
      description: data.description || null,
      category: data.category,
      tags: data.tags,
      prep_minutes: data.prepMinutes,
      cook_minutes: data.cookMinutes,
      servings: data.servings,
      hero_image_url: data.heroImageUrl,
      instructions: toJson(data.instructions),
      ingredients: toJson(data.ingredients),
    })
    .eq("id", recipeId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  redirect(`/recipes/${newSlug}`);
}

// ── Delete ─────────────────────────────────────────────────────────────────

export async function deleteRecipe(recipeId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", recipeId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  redirect("/recipes");
}

// ── Ratings ────────────────────────────────────────────────────────────────

export async function upsertRating(
  recipeId: string,
  stars: number
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("owner_ratings").upsert(
    { recipe_id: recipeId, stars },
    { onConflict: "recipe_id" }
  );
  if (error) throw new Error(error.message);
}

// ── Cook log ───────────────────────────────────────────────────────────────

export async function logCookEvent(
  recipeId: string,
  note: string | null
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("cook_log").insert({
    recipe_id: recipeId,
    user_id: user.id,
    note: note || null,
  });
  if (error) throw new Error(error.message);
}
