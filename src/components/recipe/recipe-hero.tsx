import Image from "next/image";
import { placeholderGradient } from "@/lib/utils/placeholder-gradient";

interface RecipeHeroProps {
  imageUrl: string | null;
  title: string;
  recipeId: string;
}

export function RecipeHero({ imageUrl, title, recipeId }: RecipeHeroProps) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        /* 16:9 desktop, 4:3 mobile via aspect-ratio */
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
      }}
    >
      <div
        className="aspect-[4/3] md:aspect-[16/9]"
        style={{ position: "relative", width: "100%" }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1280px"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: placeholderGradient(recipeId),
            }}
          />
        )}
      </div>
    </div>
  );
}
