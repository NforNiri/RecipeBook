"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { upsertRating } from "@/app/(app)/recipes/actions";

interface RatingStarsProps {
  recipeId: string;
  initialRating: number | null;
}

export function RatingStars({ recipeId, initialRating }: RatingStarsProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [hovered, setHovered] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayed = hovered ?? rating;

  async function handleRate(stars: number) {
    const prev = rating;
    setRating(stars);
    setError(null);
    setSaving(true);
    try {
      await upsertRating(recipeId, stars);
    } catch (err) {
      setRating(prev);
      setError(
        err instanceof Error ? err.message : "Could not save rating — please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p
        style={{
          fontFamily: "var(--font-inter, sans-serif)",
          fontSize: "0.6875rem",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-tertiary)",
          marginBottom: 6,
        }}
      >
        My rating
      </p>
      <div style={{ display: "flex", gap: 0 }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = displayed !== null && star <= displayed;
          return (
            <button
              key={star}
              type="button"
              disabled={saving}
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(null)}
              aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                /* 44px tap target per WCAG */
                width: 44,
                height: 44,
                border: "none",
                background: "transparent",
                cursor: saving ? "wait" : "pointer",
                color: filled ? "oklch(72% 0.18 60)" : "var(--border-strong)",
                transition: "color var(--duration-fast)",
                padding: 0,
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Star
                size={22}
                fill={filled ? "currentColor" : "none"}
                strokeWidth={1.5}
              />
            </button>
          );
        })}
      </div>
      {rating && (
        <p
          style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.75rem",
            color: "var(--ink-tertiary)",
            marginTop: 2,
          }}
        >
          {rating} / 5
        </p>
      )}
      {error && (
        <p
          role="alert"
          style={{
            marginTop: 6,
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.75rem",
            color: "var(--status-danger)",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
