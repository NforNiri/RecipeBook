import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, Users, Pencil } from "lucide-react";
import { getRecipeBySlug } from "@/lib/db/queries/recipes";
import { getOwnerRating, getGuestRatingsSummary } from "@/lib/db/queries/ratings";
import { RecipeHero } from "@/components/recipe/recipe-hero";
import { InstructionsView } from "@/components/recipe/instructions-view";
import { IngredientsList } from "@/components/recipe/ingredients-list";
import { RatingStars } from "@/components/recipe/rating-stars";
import { CookButton } from "@/components/recipe/cook-button";
import { CookHistory } from "@/components/recipe/cook-history";
// SuggestionsPanel is owner-only — absent from the public /r/[shareId] route.
import { SuggestionsPanel } from "@/components/recipe/suggestions-panel";
import { PublicRatingsPanel } from "@/components/recipe/public-ratings-panel";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) return { title: "Recipe not found" };

  const description = recipe.description ?? "A recipe in my personal cookbook.";

  return {
    title: recipe.title,
    description,
    openGraph: {
      title: recipe.title,
      description,
      type: "article",
      ...(recipe.heroImageUrl
        ? {
            images: [
              {
                url: recipe.heroImageUrl,
                width: 1280,
                height: 720,
                alt: recipe.title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: recipe.heroImageUrl ? "summary_large_image" : "summary",
      title: recipe.title,
      description,
      ...(recipe.heroImageUrl ? { images: [recipe.heroImageUrl] } : {}),
    },
  };
}

function formatTime(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const CATEGORY_LABELS: Record<string, string> = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner",
  dessert: "Dessert", baking: "Baking", soup: "Soup",
  salad: "Salad", sauce: "Sauce", drink: "Drink",
  snack: "Snack", other: "Other",
};

const divider: React.CSSProperties = {
  borderTop: "1px solid var(--border-default)",
  paddingTop: 16,
  marginTop: 4,
};

export default async function RecipePage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) notFound();

  const [ownerRating, guestRatings] = await Promise.all([
    getOwnerRating(recipe.id),
    recipe.isPublic ? getGuestRatingsSummary(recipe.id) : null,
  ]);

  const prepStr = formatTime(recipe.prepMinutes);
  const cookStr = formatTime(recipe.cookMinutes);

  return (
    <div
      style={{
        maxWidth: "var(--container-app, 1280px)",
        margin: "0 auto",
        padding: "24px 24px 64px",
      }}
    >
      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <RecipeHero
          imageUrl={recipe.heroImageUrl}
          title={recipe.title}
          recipeId={recipe.id}
        />
      </div>

      {/* Content + sidebar layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 40,
        }}
        className="md:grid-cols-[1fr_260px]"
      >
        {/* ─── Main column ─────────────────────────────────────── */}
        <div>
          {/* Title + edit button */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 12,
            }}
          >
            <h1
              style={{
                fontFamily: "var(--font-fraunces, Georgia, serif)",
                fontSize: "clamp(2rem, 5vw, 3rem)",
                fontWeight: 600,
                color: "var(--ink-primary)",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {recipe.title}
            </h1>

            <Link
              href={`/recipes/${slug}/edit`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
                marginTop: 8,
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-default)",
                backgroundColor: "transparent",
                color: "var(--ink-secondary)",
                textDecoration: "none",
                fontFamily: "var(--font-inter, sans-serif)",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              <Pencil size={14} />
              Edit
            </Link>
          </div>

          {recipe.description && (
            <p
              style={{
                fontFamily: "var(--font-source-serif, Georgia, serif)",
                fontSize: "1.125rem",
                lineHeight: 1.7,
                color: "var(--ink-secondary)",
                marginBottom: 24,
              }}
            >
              {recipe.description}
            </p>
          )}

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: "3px 12px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "var(--accent-soft)",
                    color: "var(--ink-secondary)",
                    fontFamily: "var(--font-inter, sans-serif)",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Ingredients */}
          <section style={{ marginBottom: 40 }}>
            <h2
              style={{
                fontFamily: "var(--font-fraunces, Georgia, serif)",
                fontSize: "1.5rem",
                fontWeight: 500,
                color: "var(--ink-primary)",
                letterSpacing: "-0.01em",
                marginBottom: 16,
                paddingBottom: 8,
                borderBottom: "1px solid var(--border-default)",
              }}
            >
              Ingredients
            </h2>
            <IngredientsList ingredients={recipe.ingredients} />
          </section>

          {/* Instructions */}
          <section>
            <h2
              style={{
                fontFamily: "var(--font-fraunces, Georgia, serif)",
                fontSize: "1.5rem",
                fontWeight: 500,
                color: "var(--ink-primary)",
                letterSpacing: "-0.01em",
                marginBottom: 16,
                paddingBottom: 8,
                borderBottom: "1px solid var(--border-default)",
              }}
            >
              Instructions
            </h2>
            <InstructionsView doc={recipe.instructions} />
          </section>

          {/* AI Suggestions — owner-only; absent from the public /r/[shareId] route */}
          <SuggestionsPanel recipeId={recipe.id} />
        </div>

        {/* ─── Sidebar ─────────────────────────────────────────── */}
        <aside>
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              position: "sticky",
              top: 24,
            }}
          >
            {/* Star rating */}
            <RatingStars
              recipeId={recipe.id}
              initialRating={ownerRating?.stars ?? null}
            />

            {/* Cook this button */}
            <div style={divider}>
              <CookButton recipeId={recipe.id} />
            </div>

            {/* Metadata */}
            <div style={divider}>
              <MetaRow
                label="Category"
                value={CATEGORY_LABELS[recipe.category] ?? recipe.category}
              />
              {prepStr && (
                <MetaRow label="Prep" value={prepStr} icon={<Clock size={14} />} />
              )}
              {cookStr && (
                <MetaRow label="Cook" value={cookStr} icon={<Clock size={14} />} />
              )}
              {(recipe.prepMinutes || recipe.cookMinutes) && (
                <MetaRow
                  label="Total"
                  value={
                    formatTime(
                      (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0)
                    ) ?? "—"
                  }
                  icon={<Clock size={14} />}
                />
              )}
              {recipe.servings && (
                <MetaRow
                  label="Servings"
                  value={String(recipe.servings)}
                  icon={<Users size={14} />}
                />
              )}
            </div>

            {/* Cook history */}
            <div style={divider}>
              <CookHistory recipeId={recipe.id} />
            </div>

            {/* Public guest ratings — only shown when recipe is public and has ratings */}
            {recipe.isPublic && guestRatings && (
              <PublicRatingsPanel summary={guestRatings} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
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
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-inter, sans-serif)",
          fontSize: "0.9375rem",
          fontWeight: 500,
          color: "var(--ink-primary)",
          margin: 0,
        }}
      >
        {icon && <span style={{ color: "var(--ink-secondary)" }}>{icon}</span>}
        {value}
      </dd>
    </div>
  );
}
