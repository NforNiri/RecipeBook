"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { upsertFamilyRating } from "@/app/(app)/recipes/actions";

interface FamilyRatingPanelProps {
  recipeId: string;
  initialRating: { stars: number; comment: string | null } | null;
}

export function FamilyRatingPanel({ recipeId, initialRating }: FamilyRatingPanelProps) {
  const router = useRouter();
  const [stars, setStars] = useState<number | null>(initialRating?.stars ?? null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [comment, setComment] = useState(initialRating?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayed = hovered ?? stars;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stars) return;

    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await upsertFamilyRating(recipeId, stars, comment.trim() || null);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save rating — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
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

      {/* Star picker */}
      <div style={{ display: "flex", gap: 0, marginBottom: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = displayed !== null && n <= displayed;
          return (
            <button
              key={n}
              type="button"
              disabled={saving}
              onClick={() => setStars(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(null)}
              aria-label={`Rate ${n} star${n !== 1 ? "s" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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

      {stars && (
        <p
          style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.75rem",
            color: "var(--ink-tertiary)",
            marginBottom: 10,
          }}
        >
          {stars} / 5
        </p>
      )}

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={saving}
        placeholder="Optional comment…"
        rows={3}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-default)",
          backgroundColor: "var(--bg-subtle)",
          fontFamily: "var(--font-source-serif, Georgia, serif)",
          fontSize: "0.875rem",
          color: "var(--ink-primary)",
          lineHeight: 1.5,
          resize: "vertical",
          boxSizing: "border-box",
          outline: "none",
          marginBottom: 10,
          opacity: saving ? 0.6 : 1,
        }}
      />

      <button
        type="submit"
        disabled={saving || !stars}
        style={{
          width: "100%",
          padding: "8px 16px",
          borderRadius: "var(--radius-md)",
          border: "none",
          backgroundColor:
            !stars ? "var(--border-default)" : "var(--accent-primary)",
          color: !stars ? "var(--ink-tertiary)" : "#fff",
          fontFamily: "var(--font-inter, sans-serif)",
          fontSize: "0.875rem",
          fontWeight: 500,
          cursor: saving || !stars ? "not-allowed" : "pointer",
          opacity: saving ? 0.7 : 1,
          transition: "background-color var(--duration-fast)",
        }}
      >
        {saving ? "Saving…" : initialRating ? "Update rating" : "Save rating"}
      </button>

      {saved && !error && (
        <p
          style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.75rem",
            color: "var(--status-success, oklch(60% 0.15 145))",
            marginTop: 6,
          }}
        >
          Rating saved!
        </p>
      )}

      {error && (
        <p
          role="alert"
          style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.75rem",
            color: "var(--status-danger)",
            marginTop: 6,
          }}
        >
          {error}
        </p>
      )}
    </form>
  );
}
