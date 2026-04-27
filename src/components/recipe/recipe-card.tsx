import Link from "next/link";
import Image from "next/image";
import type { RecipeCard as RecipeCardType } from "@/types/recipe";
import { placeholderGradient } from "@/lib/utils/placeholder-gradient";

interface RecipeCardProps {
  recipe: RecipeCardType;
}

const CATEGORY_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  dessert: "Dessert",
  baking: "Baking",
  soup: "Soup",
  salad: "Salad",
  sauce: "Sauce",
  drink: "Drink",
  snack: "Snack",
  other: "Other",
};

function formatTime(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const totalTime = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  const timeStr = formatTime(totalTime || null);

  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <article
        className="recipe-card"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Hero image — 4:3 */}
        <div
          style={{
            position: "relative",
            aspectRatio: "4 / 3",
            width: "100%",
            overflow: "hidden",
          }}
        >
          {recipe.heroImageUrl ? (
            <Image
              src={recipe.heroImageUrl}
              alt={recipe.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: placeholderGradient(recipe.id),
              }}
            />
          )}
        </div>

        {/* Card body */}
        <div style={{ padding: "var(--spacing-5, 20px)" }}>
          <h3
            style={{
              fontFamily: "var(--font-fraunces, Georgia, serif)",
              fontSize: "1.25rem",
              fontWeight: 500,
              lineHeight: 1.25,
              color: "var(--ink-primary)",
              marginBottom: 6,
              letterSpacing: "-0.005em",
            }}
          >
            {recipe.title}
          </h3>

          {recipe.description && (
            <p
              style={{
                fontFamily: "var(--font-source-serif, Georgia, serif)",
                fontSize: "0.875rem",
                lineHeight: 1.55,
                color: "var(--ink-secondary)",
                marginBottom: 12,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {recipe.description}
            </p>
          )}

          {/* Owner rating */}
          {recipe.ownerRating != null && (
            <div style={{ marginBottom: 8 }}>
              <span
                style={{
                  fontFamily: "var(--font-inter, sans-serif)",
                  fontSize: "0.875rem",
                  color: "oklch(72% 0.18 60)",
                  letterSpacing: 1,
                }}
                aria-label={`Rated ${recipe.ownerRating} out of 5`}
              >
                {"★".repeat(recipe.ownerRating)}
                <span style={{ color: "var(--border-strong)" }}>
                  {"★".repeat(5 - recipe.ownerRating)}
                </span>
              </span>
            </div>
          )}

          {/* Metadata row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-inter, sans-serif)",
                fontSize: "0.6875rem",
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--ink-tertiary)",
              }}
            >
              {CATEGORY_LABELS[recipe.category] ?? recipe.category}
            </span>
            {timeStr && (
              <>
                <span style={{ color: "var(--border-strong)" }}>·</span>
                <span
                  style={{
                    fontFamily: "var(--font-inter, sans-serif)",
                    fontSize: "0.6875rem",
                    fontWeight: 500,
                    color: "var(--ink-tertiary)",
                  }}
                >
                  {timeStr}
                </span>
              </>
            )}
            {recipe.servings && (
              <>
                <span style={{ color: "var(--border-strong)" }}>·</span>
                <span
                  style={{
                    fontFamily: "var(--font-inter, sans-serif)",
                    fontSize: "0.6875rem",
                    fontWeight: 500,
                    color: "var(--ink-tertiary)",
                  }}
                >
                  {recipe.servings} servings
                </span>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
