import { redirect } from "next/navigation";
import { getRecipeBySlug } from "@/lib/db/queries/recipes";
import { CookingMode } from "@/components/recipe/cooking-mode";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CookPage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);

  if (!recipe) redirect(`/recipes/${slug}`);

  return <CookingMode recipe={recipe} slug={slug} />;
}
