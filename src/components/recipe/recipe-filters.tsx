"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, SlidersHorizontal, Star, X } from "lucide-react";
import {
  MAX_COOK_OPTIONS,
  RATING_OPTIONS,
  RECIPE_CATEGORIES,
  type RecipeFilterCounts,
} from "@/lib/recipe/filter-options";

interface RecipeFiltersProps {
  counts: RecipeFilterCounts;
}

type FilterLayout = "sidebar" | "sheet";

function recipesUrl(searchParams: URLSearchParams, next: Record<string, string | null>) {
  const sp = new URLSearchParams(searchParams);

  for (const [key, value] of Object.entries(next)) {
    if (value) {
      sp.set(key, value);
    } else {
      sp.delete(key);
    }
  }

  const qs = sp.toString();
  return qs ? `/recipes?${qs}` : "/recipes";
}

function countBadge(count: number) {
  return (
    <span
      style={{
        minWidth: 24,
        padding: "2px 7px",
        borderRadius: "var(--radius-full)",
        backgroundColor: "var(--bg-muted)",
        color: "var(--ink-tertiary)",
        fontFamily: "var(--font-inter, sans-serif)",
        fontSize: "0.6875rem",
        fontWeight: 600,
        textAlign: "center",
      }}
    >
      {count}
    </span>
  );
}

function starIcons(rating: number) {
  return (
    <span
      aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 1 }}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const filled = index < rating;
        return (
          <Star
            key={index}
            size={13}
            fill={filled ? "currentColor" : "none"}
            style={{
              color: filled ? "var(--accent-primary)" : "var(--ink-tertiary)",
            }}
          />
        );
      })}
    </span>
  );
}

function CollapsibleSection({
  title,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: open ? 10 : 6 }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "5px 4px",
          border: "none",
          background: "transparent",
          color: "var(--ink-tertiary)",
          cursor: "pointer",
          fontFamily: "var(--font-inter, sans-serif)",
          fontSize: "0.6875rem",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textAlign: "left",
          textTransform: "uppercase",
        }}
      >
        <span>{title}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {typeof count === "number" && countBadge(count)}
          <ChevronDown
            size={13}
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform var(--duration-fast)",
            }}
          />
        </span>
      </button>
      {open && <div style={{ paddingTop: 2 }}>{children}</div>}
    </div>
  );
}

function RecipeFilterPanel({
  counts,
  layout,
  onFilterChange,
}: RecipeFiltersProps & {
  layout: FilterLayout;
  onFilterChange?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const maxCook = searchParams.get("maxCook") ?? "";
  const rating = searchParams.get("rating") ?? "";
  const hasRating = searchParams.get("hasRating") === "1";
  const hasFilters = Boolean(category || maxCook || rating || hasRating);
  const isSheet = layout === "sheet";
  const compactGap = isSheet ? 4 : 2;

  function push(next: Record<string, string | null>) {
    router.push(recipesUrl(searchParams, next), { scroll: false });
    onFilterChange?.();
  }

  const optionStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
    padding: isSheet ? "8px 10px" : "5px 7px",
    borderRadius: "var(--radius-md)",
    border: `1px solid ${active ? "var(--accent-primary)" : "transparent"}`,
    backgroundColor: active ? "var(--accent-soft)" : "transparent",
    color: active ? "var(--ink-primary)" : "var(--ink-secondary)",
    cursor: "pointer",
    fontFamily: "var(--font-inter, sans-serif)",
    fontSize: isSheet ? "0.8125rem" : "0.71875rem",
    fontWeight: active ? 700 : 500,
    textAlign: "left",
  });

  return (
    <div>
      <CollapsibleSection
        title="Category"
        defaultOpen
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isSheet ? "repeat(2, minmax(0, 1fr))" : "1fr",
            gap: compactGap,
          }}
        >
          {RECIPE_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              aria-pressed={category === cat.value}
              onClick={() =>
                push({ category: category === cat.value ? null : cat.value })
              }
              style={optionStyle(category === cat.value)}
            >
              <span>{cat.label}</span>
              {countBadge(counts.categories[cat.value])}
            </button>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Rating"
        defaultOpen={Boolean(rating || hasRating)}
      >
        <div style={{ display: "grid", gap: compactGap }}>
          {RATING_OPTIONS.map((stars) => (
            <button
              key={stars}
              type="button"
              aria-pressed={rating === String(stars)}
              onClick={() =>
                push({
                  rating: rating === String(stars) ? null : String(stars),
                  hasRating: null,
                })
              }
              style={optionStyle(rating === String(stars))}
            >
              {starIcons(stars)}
              {countBadge(counts.ratings[stars])}
            </button>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Cook Time"
        defaultOpen={Boolean(maxCook)}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isSheet ? "repeat(2, minmax(0, 1fr))" : "1fr",
            gap: compactGap,
          }}
        >
          {MAX_COOK_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={maxCook === option.value}
              onClick={() =>
                push({ maxCook: maxCook === option.value ? null : option.value })
              }
              style={optionStyle(maxCook === option.value)}
            >
              <span>{option.label}</span>
              {countBadge(counts.maxCook[option.value])}
            </button>
          ))}
        </div>
      </CollapsibleSection>

      {hasFilters && (
        <button
          type="button"
          onClick={() =>
            push({
              category: null,
              maxCook: null,
              hasRating: null,
              rating: null,
            })
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            width: "100%",
            padding: "8px 10px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--status-danger)",
            backgroundColor: "transparent",
            color: "var(--status-danger)",
            cursor: "pointer",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.75rem",
            fontWeight: 700,
          }}
        >
          <X size={13} />
          Clear filters
        </button>
      )}
    </div>
  );
}

export function DesktopRecipeFilters({ counts }: RecipeFiltersProps) {
  const pathname = usePathname();

  if (pathname !== "/recipes") return null;

  return (
    <div
      style={{
        marginTop: 8,
        padding: "10px 6px 0",
        borderTop: "1px solid var(--border-default)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
          padding: "0 3px",
        }}
      >
        <span
          style={{
            color: "var(--ink-primary)",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.8125rem",
            fontWeight: 800,
          }}
        >
          Filters
        </span>
        {countBadge(counts.total)}
      </div>
      <RecipeFilterPanel counts={counts} layout="sidebar" />
    </div>
  );
}

export function MobileRecipeFiltersTab({ counts }: RecipeFiltersProps) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const activeCount = useMemo(() => {
    return ["category", "maxCook", "rating", "hasRating"].filter((key) =>
      searchParams.has(key)
    ).length;
  }, [searchParams]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open recipe filters"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          padding: "8px 16px",
          border: "none",
          background: "transparent",
          color: "var(--ink-secondary)",
          cursor: "pointer",
          fontFamily: "var(--font-inter, sans-serif)",
          fontSize: "0.6875rem",
          fontWeight: 500,
        }}
      >
        <span style={{ position: "relative", display: "inline-flex" }}>
          <SlidersHorizontal size={20} />
          {activeCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -7,
                right: -9,
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--accent-primary)",
                color: "var(--ink-inverse)",
                fontSize: "0.625rem",
                fontWeight: 800,
                lineHeight: "16px",
                textAlign: "center",
              }}
            >
              {activeCount}
            </span>
          )}
        </span>
        Filters
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Recipe filters"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
          }}
        >
          <button
            type="button"
            aria-label="Close recipe filters"
            onClick={() => setOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              border: "none",
              backgroundColor: "oklch(0% 0 0 / 0.35)",
              cursor: "pointer",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: "14px 16px 24px",
              borderTopLeftRadius: "var(--radius-2xl)",
              borderTopRightRadius: "var(--radius-2xl)",
              border: "1px solid var(--border-default)",
              backgroundColor: "var(--bg-elevated)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "var(--ink-primary)",
                    fontSize: "1.25rem",
                    lineHeight: 1.2,
                  }}
                >
                  Filters
                </h2>
                <p
                  style={{
                    marginTop: 2,
                    color: "var(--ink-tertiary)",
                    fontFamily: "var(--font-inter, sans-serif)",
                    fontSize: "0.75rem",
                  }}
                >
                  {counts.total} recipes in your cookbook
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  backgroundColor: "transparent",
                  color: "var(--ink-secondary)",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>
            <RecipeFilterPanel counts={counts} layout="sheet" />
          </div>
        </div>
      )}
    </>
  );
}
