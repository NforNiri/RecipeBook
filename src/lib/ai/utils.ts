import type { Ingredient, TiptapDocument, TiptapNode } from "@/types/recipe";

/** Generates a short random id for ingredient rows. */
export function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Converts an array of plain text steps to a Tiptap document.
 * Each step becomes a paragraph node.
 */
export function stepsToTiptap(steps: string[]): TiptapDocument {
  if (steps.length === 0) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }

  const content: TiptapNode[] = steps.map((step) => ({
    type: "paragraph",
    content: [{ type: "text", text: step }],
  }));

  return { type: "doc", content };
}

// ── Ingredient string parser ───────────────────────────────────────────────

const UNICODE_FRACS: Record<string, number> = {
  "½": 0.5,  "¼": 0.25, "¾": 0.75,
  "⅓": 1/3,  "⅔": 2/3,
  "⅛": 0.125,"⅜": 0.375,"⅝": 0.625,"⅞": 0.875,
  "⅙": 1/6,  "⅚": 5/6,
  "⅕": 0.2,  "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
};

/** Recognised measurement units (lowercase → canonical). */
const MEASUREMENT_UNITS: Record<string, string> = {
  cup: "cup",   cups: "cup",
  tablespoon: "tbsp", tablespoons: "tbsp", tbsp: "tbsp", tbs: "tbsp",
  teaspoon: "tsp",    teaspoons: "tsp",    tsp: "tsp",
  ounce: "oz",  ounces: "oz",  oz: "oz",
  "fl oz": "fl oz",
  pound: "lb",  pounds: "lb",  lb: "lb",  lbs: "lb",
  gram: "g",    grams: "g",    g: "g",
  kilogram: "kg", kilograms: "kg", kg: "kg",
  milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml", ml: "ml",
  liter: "l", liters: "l", litre: "l", litres: "l",
  pint: "pint", pints: "pint", pt: "pint",
  quart: "quart", quarts: "quart", qt: "quart",
  gallon: "gal", gallons: "gal",
  can: "can",   cans: "can",
  package: "pkg", packages: "pkg", pkg: "pkg",
  bunch: "bunch", bunches: "bunch",
  head: "head",   heads: "head",
  sprig: "sprig", sprigs: "sprig",
  stalk: "stalk", stalks: "stalk",
  slice: "slice", slices: "slice",
  piece: "piece", pieces: "piece",
  clove: "clove", cloves: "clove",
  stick: "stick", sticks: "stick",
  pinch: "pinch", pinches: "pinch",
  dash: "dash",   dashes: "dash",
  handful: "handful",
};

/** Unit words — used to filter out measurement-only notes like "1½ cups". */
const UNIT_WORD_RE =
  /\b(cup|cups|tbsp|tsp|oz|lb|lbs|g|ml|kg|gram|grams|tablespoon|teaspoon|pound|ounce|liter|litre)\b/i;

/**
 * Parses a raw ingredient string (as it comes from schema.org `recipeIngredient`)
 * into structured `{ qty, unit, item, note }`.
 *
 * Handles: Unicode fractions (½), written fractions (1/2), mixed numbers (1½),
 * nested parentheses (Budget Bytes metric/price annotations), ranges (2–3 → 2).
 */
export function parseIngredientString(
  raw: string
): Omit<Ingredient, "id"> {
  // Remove asterisk footnote markers
  let str = raw.trim().replace(/\*+/g, "");

  // ── Extract parenthesised notes (innermost-first to handle nesting) ──
  const collectedNotes: string[] = [];
  let prev = "";
  do {
    prev = str;
    str = str.replace(/\(([^()]*)\)/, (_m, inner: string) => {
      const cleaned = inner
        .replace(/\$[\d.,]+/g, "")                         // prices: $6.24
        .replace(/\b\d+(?:\.\d+)?\s*(?:g|ml|kg|oz|lb|l)\b/gi, "") // metric: 453g
        .replace(/,\s*$/, "").replace(/^\s*,/, "")          // stray commas
        .trim();
      if (cleaned.length > 1) collectedNotes.push(cleaned);
      return " ";
    });
    str = str.replace(/\s+/g, " ").trim();
  } while (str !== prev);

  // Prefer a note that doesn't contain measurement units (e.g. skip "1½ cups")
  const note =
    collectedNotes.find((n) => !UNIT_WORD_RE.test(n)) ??
    collectedNotes[0] ??
    null;

  const tokens = str.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { qty: null, unit: null, item: raw.trim(), note };

  let idx = 0;

  // ── Quantity ──────────────────────────────────────────────────────────
  let qty: number | null = null;
  const first = parseFraction(tokens[0]);
  if (first !== null) {
    qty = first;
    idx = 1;
    // "1 1/2" — check if next token is also numeric (no letters)
    if (idx < tokens.length && /^[\d½¼¾⅓⅔⅛⅜⅝⅞⅙⅚⅕⅖⅗⅘./\-–]+$/.test(tokens[idx])) {
      const frac = parseFraction(tokens[idx]);
      if (frac !== null) { qty += frac; idx++; }
    }
  }

  // ── Unit ──────────────────────────────────────────────────────────────
  let unit: string | null = null;
  if (idx < tokens.length) {
    const candidate = tokens[idx].toLowerCase().replace(/\.$/, "");
    const canonical = MEASUREMENT_UNITS[candidate];
    if (canonical !== undefined) { unit = canonical; idx++; }
  }

  const item = tokens.slice(idx).join(" ") || raw.trim();
  return { qty, unit, item, note };
}

/** Converts a quantity string to a number, supporting fractions and Unicode. */
function parseFraction(str: string): number | null {
  let s = str.trim();
  if (!s) return null;

  // Expand Unicode fractions to decimals
  for (const [ch, val] of Object.entries(UNICODE_FRACS)) {
    s = s.replace(new RegExp(ch, "g"), ` ${val} `);
  }

  // Written fractions: "3/4" → 0.75
  s = s.replace(/(\d+)\s*\/\s*(\d+)/g, (_, n, d) => {
    const denom = parseInt(d, 10);
    return denom === 0 ? "0" : ` ${parseInt(n, 10) / denom} `;
  });

  // Ranges: take the first number
  s = s.replace(/(\d+(?:\.\d+)?)\s*[-–]\s*\d+(?:\.\d+)?/, "$1");

  const parts = s
    .trim()
    .split(/\s+/)
    .map(parseFloat)
    .filter((n) => !isNaN(n));

  if (parts.length === 0) return null;
  const sum = parts.reduce((a, b) => a + b, 0);
  return Math.round(sum * 1000) / 1000;
}
