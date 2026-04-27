import { getOwnerTags } from "@/lib/db/queries/recipes";
import { RecipeForm } from "@/components/recipe/recipe-form";

export const metadata = { title: "New Recipe" };

export default async function NewRecipePage() {
  const existingTags = await getOwnerTags();

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
          marginBottom: 32,
        }}
      >
        New recipe
      </h1>

      <RecipeForm mode="create" existingTags={existingTags} />
    </div>
  );
}
