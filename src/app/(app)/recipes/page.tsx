import Link from "next/link";
import { PlusCircle, BookOpen } from "lucide-react";
import { getOwnerRecipes } from "@/lib/db/queries/recipes";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { RecipesSearch } from "@/components/recipe/recipes-search";

export const metadata = { title: "My Recipes" };

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    maxCook?: string;
    hasRating?: string;
    rating?: string;
  }>;
}

export default async function RecipesPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const recipes = await getOwnerRecipes(filters);

  const hasActiveFilter =
    filters.q || filters.category || filters.maxCook || filters.hasRating;

  return (
    <div
      style={{
        maxWidth: "var(--container-app, 1280px)",
        margin: "0 auto",
        padding: "40px 24px",
      }}
    >
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 32,
          gap: 16,
          flexWrap: "wrap",
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
          My Recipes
        </h1>

        <Link
          href="/recipes/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--accent-primary)",
            color: "var(--ink-inverse)",
            textDecoration: "none",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.9375rem",
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          <PlusCircle size={16} />
          New recipe
        </Link>
      </div>

      {/* Search */}
      <RecipesSearch
        key={filters.q ?? ""}
        initialQ={filters.q}
      />

      {/* Results */}
      {recipes.length === 0 ? (
        hasActiveFilter ? (
          /* Empty state — search / filter produced no results */
          <div
            style={{
              textAlign: "center",
              padding: "80px 24px",
              borderRadius: "var(--radius-lg)",
              border: "2px dashed var(--border-default)",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            <BookOpen
              size={40}
              style={{
                margin: "0 auto 16px",
                color: "var(--ink-tertiary)",
                opacity: 0.4,
              }}
            />
            <p
              style={{
                fontFamily: "var(--font-fraunces, Georgia, serif)",
                fontSize: "1.375rem",
                fontWeight: 500,
                color: "var(--ink-secondary)",
                marginBottom: 8,
              }}
            >
              No recipes found
            </p>
            <p
              style={{
                fontFamily: "var(--font-source-serif, Georgia, serif)",
                fontSize: "1rem",
                color: "var(--ink-tertiary)",
              }}
            >
              Try adjusting your search or clearing the filters.
            </p>
          </div>
        ) : (
          /* Empty state — no recipes at all */
          <div
            style={{
              textAlign: "center",
              padding: "80px 24px",
              borderRadius: "var(--radius-lg)",
              border: "2px dashed var(--border-default)",
              backgroundColor: "var(--bg-surface)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-fraunces, Georgia, serif)",
                fontSize: "1.5rem",
                fontWeight: 500,
                color: "var(--ink-secondary)",
                marginBottom: 12,
              }}
            >
              No recipes yet
            </p>
            <p
              style={{
                fontFamily: "var(--font-source-serif, Georgia, serif)",
                fontSize: "1rem",
                color: "var(--ink-tertiary)",
                marginBottom: 28,
              }}
            >
              Add your first recipe to start your cookbook.
            </p>
            <Link
              href="/recipes/new"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 24px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--accent-primary)",
                color: "var(--ink-inverse)",
                textDecoration: "none",
                fontFamily: "var(--font-inter, sans-serif)",
                fontSize: "0.9375rem",
                fontWeight: 600,
              }}
            >
              <PlusCircle size={16} />
              Add your first recipe
            </Link>
          </div>
        )
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
