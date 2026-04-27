"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/editor/image-upload";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { IngredientsEditor } from "@/components/editor/ingredients-editor";
import { TagPicker } from "@/components/recipe/tag-picker";
import { createRecipe, updateRecipe, deleteRecipe } from "@/app/(app)/recipes/actions";
import type { RecipeFormData } from "@/app/(app)/recipes/actions";
import { slugBase } from "@/lib/utils/slug";
import type { RecipeCategory } from "@/types/db";
import type { Recipe, Ingredient, TiptapDocument } from "@/types/recipe";

const CATEGORIES: { value: RecipeCategory; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "dessert", label: "Dessert" },
  { value: "baking", label: "Baking" },
  { value: "soup", label: "Soup" },
  { value: "salad", label: "Salad" },
  { value: "sauce", label: "Sauce" },
  { value: "drink", label: "Drink" },
  { value: "snack", label: "Snack" },
  { value: "other", label: "Other" },
];

const EMPTY_DOC: TiptapDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

interface RecipeFormProps {
  mode: "create" | "update";
  recipe?: Recipe;
  existingTags?: string[];
  /** Pre-fill form fields in create mode (used by AI import flows). */
  prefill?: Partial<RecipeFormData>;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  backgroundColor: "var(--bg-muted)",
  color: "var(--ink-primary)",
  fontFamily: "var(--font-source-serif, Georgia, serif)",
  fontSize: "1rem",
  lineHeight: 1.5,
  outline: "none",
  transition: `border-color var(--duration-fast)`,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-inter, sans-serif)",
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "var(--ink-secondary)",
  marginBottom: 6,
  letterSpacing: "0.01em",
};

const fieldStyle: React.CSSProperties = {
  marginBottom: 24,
};

export function RecipeForm({ mode, recipe, existingTags = [], prefill }: RecipeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [title, setTitle] = useState(recipe?.title ?? prefill?.title ?? "");
  const [description, setDescription] = useState(recipe?.description ?? prefill?.description ?? "");
  const [category, setCategory] = useState<RecipeCategory>(
    recipe?.category ?? prefill?.category ?? "other"
  );
  const [tags, setTags] = useState<string[]>(recipe?.tags ?? prefill?.tags ?? []);
  const [prepMinutes, setPrepMinutes] = useState<string>(
    recipe?.prepMinutes
      ? String(recipe.prepMinutes)
      : prefill?.prepMinutes
      ? String(prefill.prepMinutes)
      : ""
  );
  const [cookMinutes, setCookMinutes] = useState<string>(
    recipe?.cookMinutes
      ? String(recipe.cookMinutes)
      : prefill?.cookMinutes
      ? String(prefill.cookMinutes)
      : ""
  );
  const [servings, setServings] = useState<string>(
    recipe?.servings
      ? String(recipe.servings)
      : prefill?.servings
      ? String(prefill.servings)
      : ""
  );
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(
    recipe?.heroImageUrl ?? prefill?.heroImageUrl ?? null
  );
  const [slug, setSlug] = useState<string>(recipe?.slug ?? "");
  const [instructions, setInstructions] = useState<TiptapDocument>(
    recipe?.instructions ?? prefill?.instructions ?? EMPTY_DOC
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients ?? prefill?.ingredients ?? []
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setError(null);

    const data = {
      title: title.trim(),
      description: description.trim(),
      category,
      tags,
      prepMinutes: prepMinutes ? parseInt(prepMinutes, 10) : null,
      cookMinutes: cookMinutes ? parseInt(cookMinutes, 10) : null,
      servings: servings ? parseInt(servings, 10) : null,
      heroImageUrl,
      instructions,
      ingredients,
      // Only pass slug in update mode — create mode auto-generates it server-side
      ...(mode === "update" ? { slug: slug.trim() || undefined } : {}),
      // Carry through AI import provenance if present
      ...(prefill?.sourceType ? { sourceType: prefill.sourceType } : {}),
      ...(prefill?.sourceValue ? { sourceValue: prefill.sourceValue } : {}),
    };

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createRecipe(data);
        } else {
          await updateRecipe(recipe!.id, data);
        }
      } catch (err) {
        // Next.js redirect() throws a special internal error — re-throw it so
        // the router can handle the navigation. Catch everything else as a
        // user-visible form error.
        if (
          err instanceof Error &&
          (err.message === "NEXT_REDIRECT" || "digest" in err)
        ) {
          throw err;
        }
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      try {
        await deleteRecipe(recipe!.id);
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message === "NEXT_REDIRECT" || "digest" in err)
        ) {
          throw err;
        }
        setError(err instanceof Error ? err.message : "Could not delete recipe.");
        setShowDeleteConfirm(false);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Hero image */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Hero image</label>
        <ImageUpload defaultUrl={heroImageUrl} onUpload={setHeroImageUrl} />
      </div>

      {/* Title */}
      <div style={fieldStyle}>
        <label htmlFor="title" style={labelStyle}>
          Title <span style={{ color: "var(--status-danger)" }}>*</span>
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Lemon ricotta pancakes"
          style={inputStyle}
        />
      </div>

      {/* Description */}
      <div style={fieldStyle}>
        <label htmlFor="description" style={labelStyle}>
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A short note about this recipe…"
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {/* Slug — edit mode only */}
      {mode === "update" && (
        <div style={fieldStyle}>
          <label htmlFor="slug" style={labelStyle}>
            URL slug
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder={slugBase(title) || "recipe-slug"}
              style={inputStyle}
            />
          </div>
          <p
            style={{
              marginTop: 4,
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "0.75rem",
              color: "var(--ink-tertiary)",
            }}
          >
            Only lowercase letters, numbers, and hyphens. Changing the slug will break existing links.
          </p>
        </div>
      )}

      {/* Category + time + servings row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <label htmlFor="category" style={labelStyle}>
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as RecipeCategory)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="prepMinutes" style={labelStyle}>
            Prep time (min)
          </label>
          <input
            id="prepMinutes"
            type="number"
            min={0}
            value={prepMinutes}
            onChange={(e) => setPrepMinutes(e.target.value)}
            placeholder="15"
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="cookMinutes" style={labelStyle}>
            Cook time (min)
          </label>
          <input
            id="cookMinutes"
            type="number"
            min={0}
            value={cookMinutes}
            onChange={(e) => setCookMinutes(e.target.value)}
            placeholder="30"
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="servings" style={labelStyle}>
            Servings
          </label>
          <input
            id="servings"
            type="number"
            min={1}
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            placeholder="4"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Tags */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Tags</label>
        <TagPicker
          tags={tags}
          suggestions={existingTags}
          onChange={setTags}
          placeholder="Add tags (press Enter or comma)"
        />
      </div>

      {/* Ingredients */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Ingredients</label>
        <IngredientsEditor
          defaultIngredients={ingredients}
          onChange={setIngredients}
        />
      </div>

      {/* Instructions */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Instructions</label>
        <TiptapEditor
          defaultContent={instructions}
          onChange={setInstructions}
        />
      </div>

      {error && (
        <p
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "oklch(58% 0.18 25 / 0.08)",
            border: "1px solid oklch(58% 0.18 25 / 0.3)",
            color: "var(--status-danger)",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", rowGap: 12 }}>
        <button
          type="submit"
          disabled={isPending || isDeleting}
          style={{
            padding: "10px 24px",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: "var(--accent-primary)",
            color: "var(--ink-inverse)",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.9375rem",
            fontWeight: 600,
            cursor: isPending ? "wait" : "pointer",
            opacity: isPending || isDeleting ? 0.7 : 1,
            transition: `background-color var(--duration-fast), opacity var(--duration-fast)`,
          }}
        >
          {isPending
            ? mode === "create"
              ? "Saving…"
              : "Updating…"
            : mode === "create"
            ? "Save recipe"
            : "Update recipe"}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending || isDeleting}
          style={{
            padding: "10px 20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            backgroundColor: "transparent",
            color: "var(--ink-secondary)",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.9375rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>

        {/* Delete — only in edit mode */}
        {mode === "update" && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isPending || isDeleting}
            style={{
              marginLeft: "auto",
              padding: "10px 20px",
              borderRadius: "var(--radius-md)",
              border: "1px solid oklch(58% 0.18 25 / 0.4)",
              backgroundColor: "transparent",
              color: "var(--status-danger)",
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "0.9375rem",
              fontWeight: 500,
              cursor: "pointer",
              opacity: isPending || isDeleting ? 0.5 : 1,
            }}
          >
            Delete recipe
          </button>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "oklch(0% 0 0 / 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 24,
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              padding: "32px",
              maxWidth: 420,
              width: "100%",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontFamily: "var(--font-fraunces, Georgia, serif)",
                fontSize: "1.375rem",
                fontWeight: 600,
                color: "var(--ink-primary)",
                marginBottom: 8,
              }}
            >
              Delete this recipe?
            </h2>
            <p
              style={{
                fontFamily: "var(--font-source-serif, Georgia, serif)",
                fontSize: "0.9375rem",
                color: "var(--ink-secondary)",
                marginBottom: 24,
                lineHeight: 1.55,
              }}
            >
              <strong style={{ color: "var(--ink-primary)" }}>{recipe?.title}</strong> will be permanently deleted. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                style={{
                  padding: "9px 20px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  backgroundColor: "transparent",
                  color: "var(--ink-secondary)",
                  fontFamily: "var(--font-inter, sans-serif)",
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  padding: "9px 20px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  backgroundColor: "var(--status-danger)",
                  color: "#fff",
                  fontFamily: "var(--font-inter, sans-serif)",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  cursor: isDeleting ? "wait" : "pointer",
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                {isDeleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
