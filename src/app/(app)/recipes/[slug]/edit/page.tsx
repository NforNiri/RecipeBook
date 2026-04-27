import { notFound } from "next/navigation";
import { getRecipeBySlug, getOwnerTags } from "@/lib/db/queries/recipes";
import { RecipeForm } from "@/components/recipe/recipe-form";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) return { title: "Recipe not found" };
  return { title: `Edit — ${recipe.title}` };
}

export default async function EditRecipePage({ params }: PageProps) {
  const { slug } = await params;

  const [recipe, existingTags] = await Promise.all([
    getRecipeBySlug(slug),
    getOwnerTags(),
  ]);

  if (!recipe) notFound();

  return (
    <div
      className="px-4 py-8 md:px-6 md:py-10"
      style={{
        maxWidth: "var(--container-narrow, 720px)",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-fraunces, Georgia, serif)",
          fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
          fontWeight: 600,
          color: "var(--ink-primary)",
          letterSpacing: "-0.02em",
          marginBottom: 8,
        }}
      >
        Edit recipe
      </h1>
      <p
        style={{
          fontFamily: "var(--font-source-serif, Georgia, serif)",
          fontSize: "1rem",
          color: "var(--ink-secondary)",
          marginBottom: 32,
        }}
      >
        {recipe.title}
      </p>

      <RecipeForm mode="update" recipe={recipe} existingTags={existingTags} />
    </div>
  );
}
