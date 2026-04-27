"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/db/server";
import { generateUniqueSlug, isSlugAvailable, validateSlug } from "@/lib/utils/slug";
import type { Json, RecipeCategory, SourceType } from "@/types/db";
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
  /** Populated by AI import flows to record where the recipe came from. */
  sourceType?: SourceType;
  sourceValue?: string;
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
    source_type: data.sourceType ?? null,
    source_value: data.sourceValue ?? null,
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

// ── Public sharing ─────────────────────────────────────────────────────────

/** Generates a 12-character URL-safe share ID using the Web Crypto API. */
function generateShareId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

/**
 * Toggles the public visibility of a recipe.
 * - Turning on: generates a public_share_id and sets is_public = true.
 * - Turning off: sets is_public = false and clears public_share_id.
 */
export async function togglePublic(
  recipeId: string,
  makePublic: boolean
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const updatePayload = makePublic
    ? { is_public: true, public_share_id: generateShareId() }
    : { is_public: false, public_share_id: null as string | null };

  const { error } = await supabase
    .from("recipes")
    .update(updatePayload)
    .eq("id", recipeId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  const { data: recipe } = await supabase
    .from("recipes")
    .select("slug")
    .eq("id", recipeId)
    .single();

  if (recipe) {
    revalidatePath(`/recipes/${recipe.slug}/edit`);
    revalidatePath(`/recipes/${recipe.slug}`);
  }
}

/**
 * Rotates the public_share_id without changing is_public.
 * Useful if a share link is abused.
 */
export async function rotateShareId(recipeId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("recipes")
    .update({ public_share_id: generateShareId() })
    .eq("id", recipeId)
    .eq("owner_id", user.id)
    .eq("is_public", true);

  if (error) throw new Error(error.message);

  const { data: recipe } = await supabase
    .from("recipes")
    .select("slug")
    .eq("id", recipeId)
    .single();

  if (recipe) {
    revalidatePath(`/recipes/${recipe.slug}/edit`);
  }
}

// ── Family ratings ─────────────────────────────────────────────────────────

export async function upsertFamilyRating(
  recipeId: string,
  stars: number,
  comment: string | null
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("family_ratings").upsert(
    { recipe_id: recipeId, user_id: user.id, stars, comment: comment || null },
    { onConflict: "recipe_id,user_id" }
  );
  if (error) throw new Error(error.message);

  revalidatePath(`/recipes/[slug]`, "page");
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
