import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Converts a recipe title into a URL-safe base slug.
 * Does NOT guarantee uniqueness — use generateUniqueSlug for that.
 */
export function slugBase(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * Validates that a manually entered slug is URL-safe.
 * Returns an error message or null if valid.
 */
export function validateSlug(slug: string): string | null {
  if (!slug) return "Slug cannot be empty.";
  if (!/^[a-z0-9-]+$/.test(slug))
    return "Slug may only contain lowercase letters, numbers, and hyphens.";
  if (slug.startsWith("-") || slug.endsWith("-"))
    return "Slug cannot start or end with a hyphen.";
  return null;
}

/**
 * Generates a slug from a title that is unique per owner.
 * If the base slug is taken, appends -2, -3, … until it finds a free slot.
 * Excludes the given excludeRecipeId from collision checks (use when editing).
 */
export async function generateUniqueSlug(
  title: string,
  ownerId: string,
  supabase: SupabaseClient,
  excludeRecipeId?: string
): Promise<string> {
  const base = slugBase(title);
  const fallback = `recipe-${Date.now()}`;
  if (!base) return fallback;

  // Fetch existing slugs for this owner that start with the base
  let query = supabase
    .from("recipes")
    .select("slug")
    .eq("owner_id", ownerId)
    .like("slug", `${base}%`);

  if (excludeRecipeId) {
    query = query.neq("id", excludeRecipeId);
  }

  const { data } = await query;
  const existing = new Set(data?.map((r: { slug: string }) => r.slug) ?? []);

  if (!existing.has(base)) return base;

  for (let i = 2; i <= 999; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }

  // Extremely unlikely, but fall back gracefully
  return `${base}-${Date.now()}`;
}

/**
 * Checks whether a specific slug is already taken by another recipe for the owner.
 * Returns true if the slug is available (or belongs to excludeRecipeId).
 */
export async function isSlugAvailable(
  slug: string,
  ownerId: string,
  supabase: SupabaseClient,
  excludeRecipeId?: string
): Promise<boolean> {
  let query = supabase
    .from("recipes")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("slug", slug);

  if (excludeRecipeId) {
    query = query.neq("id", excludeRecipeId);
  }

  const { data } = await query;
  return !data || data.length === 0;
}
