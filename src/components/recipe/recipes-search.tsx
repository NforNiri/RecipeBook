"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { RecipeCategory } from "@/types/db";

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

const MAX_COOK_OPTIONS = [
  { value: "15", label: "≤ 15 min" },
  { value: "30", label: "≤ 30 min" },
  { value: "60", label: "≤ 1 hour" },
  { value: "120", label: "≤ 2 hours" },
];

interface RecipesSearchProps {
  initialQ?: string;
  initialCategory?: string;
  initialMaxCook?: string;
  initialHasRating?: string;
}

function buildUrl(params: {
  q: string;
  category: string;
  maxCook: string;
  hasRating: boolean;
}) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.category) sp.set("category", params.category);
  if (params.maxCook) sp.set("maxCook", params.maxCook);
  if (params.hasRating) sp.set("hasRating", "1");
  const qs = sp.toString();
  return qs ? `/recipes?${qs}` : "/recipes";
}

export function RecipesSearch({
  initialQ = "",
  initialCategory = "",
  initialMaxCook = "",
  initialHasRating = "",
}: RecipesSearchProps) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState(initialCategory);
  const [maxCook, setMaxCook] = useState(initialMaxCook);
  const [hasRating, setHasRating] = useState(initialHasRating === "1");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback(
    (next: { q: string; category: string; maxCook: string; hasRating: boolean }) => {
      router.push(buildUrl(next), { scroll: false });
    },
    [router]
  );

  function handleSearch(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      push({ q: value, category, maxCook, hasRating });
    }, 400);
  }

  function handleCategory(value: string) {
    const next = category === value ? "" : value;
    setCategory(next);
    push({ q, category: next, maxCook, hasRating });
  }

  function handleMaxCook(value: string) {
    const next = maxCook === value ? "" : value;
    setMaxCook(next);
    push({ q, category, maxCook: next, hasRating });
  }

  function handleHasRating() {
    const next = !hasRating;
    setHasRating(next);
    push({ q, category, maxCook, hasRating: next });
  }

  function clearAll() {
    setQ("");
    setCategory("");
    setMaxCook("");
    setHasRating(false);
    router.push("/recipes", { scroll: false });
  }

  const hasFilters = q || category || maxCook || hasRating;

  const chipBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: "var(--radius-full)",
    border: "1px solid var(--border-default)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--ink-secondary)",
    fontFamily: "var(--font-inter, sans-serif)",
    fontSize: "0.8125rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all var(--duration-fast)",
    whiteSpace: "nowrap",
  };

  const chipActive: React.CSSProperties = {
    ...chipBase,
    backgroundColor: "var(--accent-primary)",
    borderColor: "var(--accent-primary)",
    color: "var(--ink-inverse)",
  };

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Search input */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search
          size={17}
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--ink-tertiary)",
            pointerEvents: "none",
          }}
        />
        <input
          type="search"
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search recipes…"
          style={{
            width: "100%",
            padding: "10px 12px 10px 40px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            backgroundColor: "var(--bg-surface)",
            color: "var(--ink-primary)",
            fontFamily: "var(--font-source-serif, Georgia, serif)",
            fontSize: "1rem",
            outline: "none",
            transition: "border-color var(--duration-fast)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--border-focus)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border-default)";
          }}
        />
        {q && (
          <button
            type="button"
            onClick={() => handleSearch("")}
            aria-label="Clear search"
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
              border: "none",
              background: "transparent",
              color: "var(--ink-tertiary)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        {/* Category chips */}
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => handleCategory(cat.value)}
            style={category === cat.value ? chipActive : chipBase}
          >
            {cat.label}
          </button>
        ))}

        {/* Has rating chip */}
        <button
          type="button"
          onClick={handleHasRating}
          style={hasRating ? chipActive : chipBase}
        >
          ★ Rated
        </button>

        {/* Max cook time chips */}
        {MAX_COOK_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleMaxCook(opt.value)}
            style={maxCook === opt.value ? chipActive : chipBase}
          >
            {opt.label}
          </button>
        ))}

        {/* Clear all */}
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            style={{
              ...chipBase,
              color: "var(--status-danger)",
              borderColor: "var(--status-danger)",
            }}
          >
            <X size={12} />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
