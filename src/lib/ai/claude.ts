import Anthropic from "@anthropic-ai/sdk";
import type { Recipe, TiptapNode } from "@/types/recipe";

// ── Model configuration ────────────────────────────────────────────────────

const MODEL = "claude-3-5-haiku-20241022";

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  return new Anthropic({ apiKey });
}

// ── Prompt templates ───────────────────────────────────────────────────────

const UPGRADE_SYSTEM_PROMPT =
  "You are a professional recipe editor. Here is a recipe. Suggest three specific improvements to technique, flavor, or texture. Be concise and actionable.";

const SWAP_SYSTEM_PROMPT =
  "You are a professional chef. Here is a recipe. Suggest three ingredient swaps that change the flavor profile, dietary profile, or availability. For each swap, explain the effect.";

// ── Recipe → prompt text ───────────────────────────────────────────────────

/** Recursively extracts plain text from a Tiptap document node. */
function nodeToText(node: TiptapNode): string {
  if (node.type === "text") return node.text ?? "";
  if (!node.content) return "";
  const inner = node.content.map(nodeToText).join("");
  // Add a newline after block-level nodes so steps are separated.
  const isBlock = ["paragraph", "heading", "listItem", "bulletList", "orderedList"].includes(
    node.type
  );
  return isBlock ? inner + "\n" : inner;
}

/** Builds a concise plain-text representation of a recipe for the AI prompt. */
function recipeToPromptText(recipe: Recipe): string {
  const lines: string[] = [];

  lines.push(`Title: ${recipe.title}`);
  if (recipe.description) lines.push(`Description: ${recipe.description}`);
  lines.push(`Category: ${recipe.category}`);
  if (recipe.servings) lines.push(`Servings: ${recipe.servings}`);
  if (recipe.prepMinutes) lines.push(`Prep time: ${recipe.prepMinutes} min`);
  if (recipe.cookMinutes) lines.push(`Cook time: ${recipe.cookMinutes} min`);

  if (recipe.ingredients.length > 0) {
    lines.push("\nIngredients:");
    for (const ing of recipe.ingredients) {
      const qty = ing.qty != null ? String(ing.qty) : "";
      const unit = ing.unit ?? "";
      const note = ing.note ? ` (${ing.note})` : "";
      lines.push(`- ${[qty, unit, ing.item].filter(Boolean).join(" ")}${note}`);
    }
  }

  const instructionsText = recipe.instructions.content
    .map(nodeToText)
    .join("")
    .trim();

  if (instructionsText) {
    lines.push("\nInstructions:");
    lines.push(instructionsText);
  }

  return lines.join("\n");
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface SuggestionStreamResult {
  /** UTF-8 encoded text chunks streamed from Claude. */
  textStream: ReadableStream<Uint8Array>;
  /**
   * Resolves to the total token count (input + output) when the stream
   * completes. Used by the route to update the `ai_jobs` row.
   */
  tokensUsed: Promise<number>;
}

/**
 * Calls Claude Haiku with streaming enabled.
 * Returns a ReadableStream of text chunks and a Promise for the total token
 * count once the stream finishes.
 */
export function streamSuggestion({
  recipe,
  mode,
}: {
  recipe: Recipe;
  mode: "upgrade" | "swap";
}): SuggestionStreamResult {
  const anthropic = getClient();
  const systemPrompt = mode === "upgrade" ? UPGRADE_SYSTEM_PROMPT : SWAP_SYSTEM_PROMPT;
  const userContent = recipeToPromptText(recipe);

  let resolveTokens!: (n: number) => void;
  let rejectTokens!: (e: unknown) => void;
  const tokensUsed = new Promise<number>((resolve, reject) => {
    resolveTokens = resolve;
    rejectTokens = reject;
  });

  const encoder = new TextEncoder();

  const textStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
        });

        stream.on("text", (text) => {
          controller.enqueue(encoder.encode(text));
        });

        const finalMsg = await stream.finalMessage();
        resolveTokens(
          (finalMsg.usage.input_tokens ?? 0) + (finalMsg.usage.output_tokens ?? 0)
        );
        controller.close();
      } catch (err) {
        rejectTokens(err);
        controller.error(err);
      }
    },
  });

  return { textStream, tokensUsed };
}
