import { notFound } from "next/navigation";
import { Clock, Users } from "lucide-react";
import { getRecipeByShareId } from "@/lib/db/queries/recipes";
import { RecipeHero } from "@/components/recipe/recipe-hero";
import { InstructionsView } from "@/components/recipe/instructions-view";
import { IngredientsList } from "@/components/recipe/ingredients-list";
import { GuestRatingForm } from "@/components/recipe/guest-rating-form";
import type { Metadata } from "next";

// Cache this page for 60 s on Vercel's CDN; serve stale for up to 1 h.
// This is set both here (Next.js ISR) and in next.config.ts (explicit header).
export const revalidate = 60;

interface PageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params;
  const recipe = await getRecipeByShareId(shareId);
  if (!recipe) return { title: "Recipe not found" };

  const description = recipe.description ?? "A shared recipe.";
  return {
    title: recipe.title,
    description,
    openGraph: {
      title: recipe.title,
      description,
      type: "article",
      ...(recipe.heroImageUrl
        ? { images: [{ url: recipe.heroImageUrl, width: 1280, height: 720, alt: recipe.title }] }
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

export default async function PublicRecipePage({ params }: PageProps) {
  const { shareId } = await params;
  const recipe = await getRecipeByShareId(shareId);

  if (!recipe) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          backgroundColor: "var(--bg-canvas)",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <h1
            style={{
              fontFamily: "var(--font-fraunces, Georgia, serif)",
              fontSize: "2rem",
              fontWeight: 600,
              color: "var(--ink-primary)",
              marginBottom: 12,
            }}
          >
            Recipe not found
          </h1>
          <p
            style={{
              fontFamily: "var(--font-source-serif, Georgia, serif)",
              fontSize: "1.0625rem",
              color: "var(--ink-secondary)",
              lineHeight: 1.6,
            }}
          >
            This recipe is no longer shared or the link may have expired.
          </p>
        </div>
      </div>
    );
  }

  const prepStr = formatTime(recipe.prepMinutes);
  const cookStr = formatTime(recipe.cookMinutes);

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--bg-canvas)",
      }}
    >
      {/* Minimal header — no app shell, no auth-related controls */}
      <header
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-default)",
          backgroundColor: "var(--bg-surface)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-fraunces, Georgia, serif)",
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "var(--ink-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          Cookbook
        </span>
      </header>

      <main
        style={{
          maxWidth: "var(--container-app, 1280px)",
          margin: "0 auto",
          padding: "32px 24px 80px",
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

        {/* Content */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr", gap: 40 }}
          className="md:grid-cols-[1fr_240px]"
        >
          {/* ─── Main column ─────────────────────────────────────── */}
          <div>
            {/* Title — no edit button on public view */}
            <h1
              style={{
                fontFamily: "var(--font-fraunces, Georgia, serif)",
                fontSize: "clamp(2rem, 5vw, 3rem)",
                fontWeight: 600,
                color: "var(--ink-primary)",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                marginBottom: 12,
              }}
            >
              {recipe.title}
            </h1>

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

            {/* Guest rating form — always shown on the public route */}
            <GuestRatingForm shareId={shareId} />
          </div>

          {/* ─── Sidebar (metadata only) ─────────────────────────── */}
          <aside>
            <div
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-lg)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                position: "sticky",
                top: 24,
              }}
            >
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
          </aside>
        </div>
      </main>
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
