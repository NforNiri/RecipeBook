import type { RecipeCategory } from "@/types/db";

export const RECIPE_CATEGORIES: { value: RecipeCategory; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "dessert", label: "Dessert" },
  { value: "baking", label: "Baking" },
  { value: "soup", label: "Soup" },
  { value: "salad", label: "Salad" },
  { value: "sauce", label: "Sauce" },
  { value: "drink", label: "Drink" },
  { value: "snack", label: "Snack" },
  { value: "other", label: "Other" },
];

export const MAX_COOK_OPTIONS = [
  { value: "15", label: "\u2264 15 min" },
  { value: "30", label: "\u2264 30 min" },
  { value: "60", label: "\u2264 1 hour" },
  { value: "120", label: "\u2264 2 hours" },
] as const;

export const RATING_OPTIONS = [5, 4, 3, 2, 1] as const;

export type MaxCookValue = (typeof MAX_COOK_OPTIONS)[number]["value"];
export type RatingValue = (typeof RATING_OPTIONS)[number];

export interface RecipeFilterCounts {
  total: number;
  categories: Record<RecipeCategory, number>;
  rated: number;
  ratings: Record<RatingValue, number>;
  maxCook: Record<MaxCookValue, number>;
}
