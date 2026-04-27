import type { RecipeFormData } from "@/app/(app)/recipes/actions";
import type { RecipeCategory } from "@/types/db";
import type { Ingredient, TiptapDocument } from "@/types/recipe";
import { randomId, stepsToTiptap, parseIngredientString } from "./utils";

/** Minimal subset of schema.org/Recipe we care about. */
interface SchemaOrgRecipe {
  "@type": string;
  name?: string;
  description?: string;
  recipeCategory?: string | string[];
  keywords?: string | string[];
  prepTime?: string; // ISO 8601 duration e.g. "PT15M"
  cookTime?: string;
  totalTime?: string;
  recipeYield?: string | number | string[];
  recipeIngredient?: string[];
  recipeInstructions?:
    | string
    | string[]
    | Array<{ "@type": string; text?: string; name?: string }>;
}

/**
 * Parses all `<script type="application/ld+json">` blocks from HTML,
 * looks for a schema.org Recipe object, and maps it to `RecipeFormData`.
 * Returns null if no usable Recipe is found.
 */
export function parseSchemaOrg(html: string): RecipeFormData | null {
  const blocks = extractJsonLdBlocks(html);

  for (const block of blocks) {
    const recipe = findRecipeObject(block);
    if (recipe) return mapToFormData(recipe);
  }

  return null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function extractJsonLdBlocks(html: string): unknown[] {
  const results: unknown[] = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      results.push(parsed);
    } catch {
      // Malformed JSON-LD block — skip it
    }
  }

  return results;
}

function findRecipeObject(obj: unknown): SchemaOrgRecipe | null {
  if (!obj || typeof obj !== "object") return null;

  // Direct Recipe object
  if (isRecipeObject(obj)) return obj as SchemaOrgRecipe;

  // @graph array (common pattern on larger sites)
  const graph = (obj as Record<string, unknown>)["@graph"];
  if (Array.isArray(graph)) {
    for (const item of graph) {
      if (isRecipeObject(item)) return item as SchemaOrgRecipe;
    }
  }

  // Nested under "@context" wrapper or other properties
  for (const value of Object.values(obj as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findRecipeObject(item);
        if (found) return found;
      }
    }
  }

  return null;
}

function isRecipeObject(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;
  const rec = obj as Record<string, unknown>;
  const type = rec["@type"];
  if (typeof type === "string") return type === "Recipe";
  if (Array.isArray(type)) return type.includes("Recipe");
  return false;
}

function mapToFormData(recipe: SchemaOrgRecipe): RecipeFormData | null {
  const title = recipe.name?.trim();
  if (!title) return null;

  const ingredients = parseIngredients(recipe.recipeIngredient ?? []);
  const instructions = parseInstructions(recipe.recipeInstructions);

  // At minimum we need a title; ingredients/instructions improve quality but
  // are not strictly required (user can fill them in after import).
  if (!title) return null;

  return {
    title,
    description: recipe.description?.trim() ?? "",
    category: inferCategory(recipe),
    tags: parseTags(recipe),
    prepMinutes: parseDuration(recipe.prepTime),
    cookMinutes: parseDuration(recipe.cookTime ?? recipe.totalTime),
    servings: parseServings(recipe.recipeYield),
    heroImageUrl: null,
    ingredients,
    instructions,
    sourceType: "url",
  };
}

function parseIngredients(raw: string[]): Ingredient[] {
  return raw
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      id: randomId(),
      ...parseIngredientString(line),
    }));
}

function parseInstructions(
  raw: SchemaOrgRecipe["recipeInstructions"]
): TiptapDocument {
  if (!raw) return stepsToTiptap([]);

  if (typeof raw === "string") {
    const steps = raw
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return stepsToTiptap(steps);
  }

  if (Array.isArray(raw)) {
    const steps = raw
      .map((item) => {
        if (typeof item === "string") return item.trim();
        return (item.text ?? item.name ?? "").trim();
      })
      .filter(Boolean);
    return stepsToTiptap(steps);
  }

  return stepsToTiptap([]);
}

/** Parses ISO 8601 duration strings like "PT1H30M" → minutes as number. */
function parseDuration(iso?: string): number | null {
  if (!iso) return null;
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return null;
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  const total = hours * 60 + minutes;
  return total > 0 ? total : null;
}

function parseServings(raw?: string | number | string[]): number | null {
  if (!raw) return null;
  const str = Array.isArray(raw) ? raw[0] : String(raw);
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

const CATEGORY_KEYWORDS: Record<RecipeCategory, string[]> = {
  breakfast: ["breakfast", "brunch", "morning", "pancake", "waffle", "omelette"],
  lunch: ["lunch", "sandwich", "wrap", "salad", "soup", "bowl"],
  dinner: ["dinner", "supper", "entree", "main course", "main dish"],
  dessert: ["dessert", "cake", "cookie", "pie", "tart", "mousse", "ice cream"],
  baking: ["bread", "muffin", "scone", "loaf", "biscuit", "pastry"],
  soup: ["soup", "stew", "chili", "broth", "bisque"],
  salad: ["salad"],
  sauce: ["sauce", "dressing", "marinade", "condiment", "gravy"],
  drink: ["drink", "smoothie", "juice", "cocktail", "lemonade", "tea", "coffee"],
  snack: ["snack", "appetizer", "dip", "chips", "crackers"],
  other: [],
};

function inferCategory(recipe: SchemaOrgRecipe): RecipeCategory {
  const haystack = [
    recipe.name ?? "",
    recipe.description ?? "",
    ...(Array.isArray(recipe.recipeCategory)
      ? recipe.recipeCategory
      : [recipe.recipeCategory ?? ""]),
    ...(Array.isArray(recipe.keywords)
      ? recipe.keywords
      : [recipe.keywords ?? ""]),
  ]
    .join(" ")
    .toLowerCase();

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    RecipeCategory,
    string[],
  ][]) {
    if (cat === "other") continue;
    if (keywords.some((kw) => haystack.includes(kw))) return cat;
  }

  return "other";
}

function parseTags(recipe: SchemaOrgRecipe): string[] {
  const raw = recipe.keywords ?? [];
  const arr = Array.isArray(raw) ? raw : raw.split(/,\s*/);
  return arr
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0 && t.length < 40)
    .slice(0, 10);
}
