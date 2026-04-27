import type { Ingredient } from "@/types/recipe";

interface IngredientsListProps {
  ingredients: Ingredient[];
}

export function IngredientsList({ ingredients }: IngredientsListProps) {
  if (ingredients.length === 0) {
    return (
      <p
        style={{
          color: "var(--ink-tertiary)",
          fontFamily: "var(--font-source-serif, Georgia, serif)",
        }}
      >
        No ingredients listed.
      </p>
    );
  }

  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {ingredients.map((ing) => (
        <li
          key={ing.id}
          dir="auto"
          style={{
            fontFamily: "var(--font-source-serif, Georgia, serif)",
            fontSize: "1rem",
            lineHeight: 1.5,
            color: "var(--ink-primary)",
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "var(--accent-primary)",
              flexShrink: 0,
              marginTop: 7,
            }}
            aria-hidden="true"
          />
          {ing.qty != null && (
            <span style={{ fontWeight: 500 }}>{ing.qty}</span>
          )}
          {ing.unit && (
            <span style={{ color: "var(--ink-secondary)" }}>{ing.unit}</span>
          )}
          <span>{ing.item}</span>
          {ing.note && (
            <span
              style={{ color: "var(--ink-tertiary)", fontStyle: "italic" }}
            >
              ({ing.note})
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
