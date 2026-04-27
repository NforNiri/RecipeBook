import { redirect } from "next/navigation";
import { Printer } from "lucide-react";
import { getServerProfile } from "@/lib/db/server";
import { getAllOwnerRecipesForPrint } from "@/lib/db/queries/recipes";
import { IngredientsList } from "@/components/recipe/ingredients-list";
import { InstructionsView } from "@/components/recipe/instructions-view";
import { PrintButton } from "@/components/recipe/print-button";
import type { Metadata } from "next";
import type { Recipe } from "@/types/recipe";

export const metadata: Metadata = { title: "Print Cookbook" };

const CATEGORY_LABELS: Record<string, string> = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner",
  dessert: "Dessert", baking: "Baking", soup: "Soup",
  salad: "Salad", sauce: "Sauce", drink: "Drink",
  snack: "Snack", other: "Other",
};

function formatTime(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default async function PrintCookbookPage() {
  const profile = await getServerProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "owner") redirect("/recipes?error=forbidden");

  const recipes = await getAllOwnerRecipesForPrint();

  return (
    <div
      style={{
        maxWidth: "var(--container-app, 1280px)",
        margin: "0 auto",
        padding: "24px 24px 64px",
      }}
    >
      {/* ── Screen-only header ─────────────────────────────────────────── */}
      <div
        data-no-print
        style={{
          marginBottom: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-fraunces, Georgia, serif)",
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--ink-primary)",
              marginBottom: 8,
            }}
          >
            Print Cookbook
          </h1>
          <p
            style={{
              fontFamily: "var(--font-source-serif, Georgia, serif)",
              fontSize: "1rem",
              color: "var(--ink-secondary)",
              lineHeight: 1.6,
            }}
          >
            {recipes.length === 0
              ? "No recipes yet."
              : `${recipes.length} recipe${recipes.length === 1 ? "" : "s"} — sorted by category then title. Each recipe starts on a new page.`}
          </p>
        </div>

        {recipes.length > 0 && (
          <PrintButton />
        )}
      </div>

      {/* ── Print-only title page ───────────────────────────────────────── */}
      <div
        className="print-only"
        style={{ marginBottom: 48, display: "none" }}
      >
        <h1
          style={{
            fontFamily: "var(--font-fraunces, Georgia, serif)",
            fontSize: "3rem",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--ink-primary)",
            marginBottom: 8,
          }}
        >
          My Cookbook
        </h1>
        <p
          style={{
            fontFamily: "var(--font-source-serif, Georgia, serif)",
            fontSize: "1.125rem",
            color: "var(--ink-secondary)",
          }}
        >
          {recipes.length} recipe{recipes.length === 1 ? "" : "s"}
        </p>
      </div>

      {recipes.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-source-serif, Georgia, serif)",
            fontSize: "1.125rem",
            color: "var(--ink-secondary)",
          }}
        >
          No recipes to print yet. Add some recipes first.
        </p>
      ) : (
        <div>
          {recipes.map((recipe, index) => (
            <RecipeBlock
              key={recipe.id}
              recipe={recipe}
              isFirst={index === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RecipeBlock({
  recipe,
  isFirst,
}: {
  recipe: Recipe;
  isFirst: boolean;
}) {
  const prepStr = formatTime(recipe.prepMinutes);
  const cookStr = formatTime(recipe.cookMinutes);
  const totalMinutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  const totalStr = totalMinutes > 0 ? formatTime(totalMinutes) : null;

  return (
    <article
      className={isFirst ? undefined : "cookbook-recipe-block"}
      style={{
        paddingTop: isFirst ? 0 : 48,
        marginTop: isFirst ? 0 : 48,
        borderTop: isFirst ? "none" : "2px solid var(--border-default)",
      }}
    >
      {/* Hero image */}
      {recipe.heroImageUrl && (
        <div
          className="recipe-hero"
          style={{
            width: "100%",
            marginBottom: 24,
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
            aspectRatio: "16 / 9",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recipe.heroImageUrl}
            alt={recipe.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
      )}

      {/* Title */}
      <h1
        style={{
          fontFamily: "var(--font-fraunces, Georgia, serif)",
          fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "var(--ink-primary)",
          marginBottom: 8,
          lineHeight: 1.15,
        }}
      >
        {recipe.title}
      </h1>

      {/* Category */}
      <p
        style={{
          fontFamily: "var(--font-inter, sans-serif)",
          fontSize: "0.8125rem",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-tertiary)",
          marginBottom: 12,
        }}
      >
        {CATEGORY_LABELS[recipe.category] ?? recipe.category}
      </p>

      {/* Description */}
      {recipe.description && (
        <p
          className="recipe-description"
          style={{
            fontFamily: "var(--font-source-serif, Georgia, serif)",
            fontSize: "1.0625rem",
            lineHeight: 1.7,
            color: "var(--ink-secondary)",
            marginBottom: 20,
          }}
        >
          {recipe.description}
        </p>
      )}

      {/* Tags */}
      {recipe.tags.length > 0 && (
        <div
          className="recipe-tags"
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}
        >
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              style={{
                padding: "2px 10px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--accent-soft)",
                color: "var(--ink-secondary)",
                fontFamily: "var(--font-inter, sans-serif)",
                fontSize: "0.75rem",
                fontWeight: 500,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Time / servings meta */}
      {(prepStr || cookStr || recipe.servings) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: "1px solid var(--border-default)",
          }}
        >
          {prepStr && <MetaPair label="Prep" value={prepStr} />}
          {cookStr && <MetaPair label="Cook" value={cookStr} />}
          {totalStr && <MetaPair label="Total" value={totalStr} />}
          {recipe.servings && (
            <MetaPair label="Servings" value={String(recipe.servings)} />
          )}
        </div>
      )}

      {/* Two-column content: ingredients + instructions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 32,
        }}
        className="md:grid-cols-[260px_1fr]"
      >
        {/* Ingredients */}
        <section className="recipe-ingredients">
          <h2
            className="recipe-section-heading"
            style={{
              fontFamily: "var(--font-fraunces, Georgia, serif)",
              fontSize: "1.25rem",
              fontWeight: 500,
              color: "var(--ink-primary)",
              letterSpacing: "-0.01em",
              marginBottom: 12,
              paddingBottom: 6,
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            Ingredients
          </h2>
          <IngredientsList ingredients={recipe.ingredients} />
        </section>

        {/* Instructions */}
        <section className="recipe-instructions">
          <h2
            className="recipe-section-heading"
            style={{
              fontFamily: "var(--font-fraunces, Georgia, serif)",
              fontSize: "1.25rem",
              fontWeight: 500,
              color: "var(--ink-primary)",
              letterSpacing: "-0.01em",
              marginBottom: 12,
              paddingBottom: 6,
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            Instructions
          </h2>
          <InstructionsView doc={recipe.instructions} />
        </section>
      </div>
    </article>
  );
}

function MetaPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt
        style={{
          fontFamily: "var(--font-inter, sans-serif)",
          fontSize: "0.6875rem",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-tertiary)",
          marginBottom: 2,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          fontFamily: "var(--font-inter, sans-serif)",
          fontSize: "0.9375rem",
          fontWeight: 500,
          color: "var(--ink-primary)",
          margin: 0,
        }}
      >
        {value}
      </dd>
    </div>
  );
}
