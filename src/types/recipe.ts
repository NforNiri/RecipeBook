import type { RecipeCategory, SourceType } from "./db";

/** One ingredient row — mirrors the JSONB shape in the schema. */
export interface Ingredient {
  id: string;
  qty: number | null;
  unit: string | null;
  item: string;
  note: string | null;
}

/** Tiptap JSON document — stored verbatim in recipes.instructions. */
export interface TiptapDocument {
  type: "doc";
  content: TiptapNode[];
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

/** Domain-level recipe, fully hydrated. */
export interface Recipe {
  id: string;
  ownerId: string;
  slug: string;
  title: string;
  description: string | null;
  heroImageUrl: string | null;
  category: RecipeCategory;
  tags: string[];
  sourceType: SourceType | null;
  sourceValue: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  servings: number | null;
  ingredients: Ingredient[];
  instructions: TiptapDocument;
  notes: TiptapDocument | null;
  isPublic: boolean;
  publicShareId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Lightweight card shape used in lists. */
export interface RecipeCard {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  heroImageUrl: string | null;
  category: RecipeCategory;
  tags: string[];
  prepMinutes: number | null;
  cookMinutes: number | null;
  servings: number | null;
  createdAt: string;
  ownerRating?: number | null;
}

export interface OwnerRating {
  recipeId: string;
  stars: number;
  notes: string | null;
  updatedAt: string;
}

export interface CookLogEntry {
  id: string;
  recipeId: string;
  userId: string;
  cookedAt: string;
  note: string | null;
  resultRating: number | null;
}
