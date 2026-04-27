import { GoogleGenAI } from "@google/genai";
import type { RecipeFormData } from "@/app/(app)/recipes/actions";
import type { RecipeCategory } from "@/types/db";
import type { Ingredient } from "@/types/recipe";
import { randomId, stepsToTiptap } from "./utils";

// ── Model configuration ────────────────────────────────────────────────────

const MODEL = "gemini-2.0-flash";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set");
  return new GoogleGenAI({ apiKey });
}

// ── Shared prompt + response shape ────────────────────────────────────────

const RECIPE_JSON_SCHEMA = `{
  "title": "string (required)",
  "description": "string (1-2 sentence summary, optional)",
  "category": "one of: breakfast|lunch|dinner|dessert|baking|soup|salad|sauce|drink|snack|other",
  "tags": ["array", "of", "lowercase", "tags"],
  "prepMinutes": "number or null",
  "cookMinutes": "number or null",
  "servings": "number or null",
  "ingredients": [
    { "qty": "number or null", "unit": "string or null", "item": "string (required)", "note": "string or null" }
  ],
  "instructionSteps": ["Each step as a plain string"]
}`;

const EXTRACTION_SYSTEM_PROMPT = `You are a recipe data extractor. Your job is to extract structured recipe data and return it as valid JSON matching this schema exactly:

${RECIPE_JSON_SCHEMA}

Rules:
- Return ONLY valid JSON, no markdown fences, no explanation.
- If a field cannot be determined, use null for numbers and empty arrays for lists.
- For ingredients, try to split "2 cups flour" into qty=2, unit="cups", item="flour".
- For instructionSteps, return each step as a separate string in the array.
- For category, pick the closest match from the allowed values.
- Tags should be concise, lowercase, single words or short phrases (max 10 tags).`;

/** Intermediate shape returned by Gemini before mapping to RecipeFormData. */
interface GeminiRecipeOutput {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  servings?: number | null;
  ingredients?: Array<{
    qty?: number | null;
    unit?: string | null;
    item?: string;
    note?: string | null;
  }>;
  instructionSteps?: string[];
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Calls Gemini Flash with the full HTML of a recipe page and extracts
 * structured recipe data. Returns `{ result, tokensUsed }` for use with
 * `runAiJob`, or throws on failure.
 */
export async function extractRecipeFromHtml(
  html: string
): Promise<{ result: RecipeFormData | null; tokensUsed: number }> {
  const ai = getClient();

  // Trim HTML to a reasonable size to avoid excessive token spend.
  // Most recipe content is in the first ~50 kB of rendered HTML.
  const trimmedHtml = html.slice(0, 50_000);

  const prompt = `Extract the recipe from the following HTML page content. Return JSON only.\n\n${trimmedHtml}`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: EXTRACTION_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0;
  const text = response.text ?? "";

  const parsed = safeParseJson<GeminiRecipeOutput>(text);
  if (!parsed || !parsed.title) return { result: null, tokensUsed };

  return { result: mapGeminiOutput(parsed, "url"), tokensUsed };
}

/**
 * Calls Gemini Flash Vision with a base64-encoded image and extracts
 * structured recipe data. Returns `{ result, tokensUsed }` for use with
 * `runAiJob`, or throws on failure.
 */
export async function extractRecipeFromImage(
  base64: string,
  mimeType: string
): Promise<{ result: RecipeFormData | null; tokensUsed: number }> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: "Extract the recipe from this image. Return JSON only." },
        ],
      },
    ],
    config: {
      systemInstruction: EXTRACTION_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0;
  const text = response.text ?? "";

  const parsed = safeParseJson<GeminiRecipeOutput>(text);
  if (!parsed || !parsed.title) return { result: null, tokensUsed };

  return { result: mapGeminiOutput(parsed, "photo"), tokensUsed };
}

// ── Internal helpers ───────────────────────────────────────────────────────

function mapGeminiOutput(
  raw: GeminiRecipeOutput,
  sourceType: "url" | "photo"
): RecipeFormData {
  const ingredients: Ingredient[] = (raw.ingredients ?? [])
    .filter((i) => i.item)
    .map((i) => ({
      id: randomId(),
      qty: i.qty ?? null,
      unit: i.unit ?? null,
      item: i.item!,
      note: i.note ?? null,
    }));

  const steps = (raw.instructionSteps ?? []).filter(Boolean);

  return {
    title: raw.title ?? "Imported Recipe",
    description: raw.description ?? "",
    category: normalizeCategory(raw.category),
    tags: (raw.tags ?? []).slice(0, 10),
    prepMinutes: raw.prepMinutes ?? null,
    cookMinutes: raw.cookMinutes ?? null,
    servings: raw.servings ?? null,
    heroImageUrl: null,
    ingredients,
    instructions: stepsToTiptap(steps),
    sourceType,
  };
}

const VALID_CATEGORIES: RecipeCategory[] = [
  "breakfast", "lunch", "dinner", "dessert", "baking",
  "soup", "salad", "sauce", "drink", "snack", "other",
];

function normalizeCategory(raw?: string): RecipeCategory {
  if (!raw) return "other";
  const lower = raw.toLowerCase().trim() as RecipeCategory;
  return VALID_CATEGORIES.includes(lower) ? lower : "other";
}

function safeParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Gemini sometimes wraps JSON in markdown fences despite the mime type setting
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
