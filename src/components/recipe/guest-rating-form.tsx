"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { getFingerprint } from "@/lib/utils/fingerprint";

interface GuestRatingFormProps {
  shareId: string;
}

interface StoredRating {
  stars: number;
  comment: string | null;
  guestName: string | null;
}

function storageKey(shareId: string) {
  return `__rb_rating_${shareId}`;
}

const sectionStyle: React.CSSProperties = {
  marginTop: 48,
  paddingTop: 32,
  borderTop: "2px solid var(--border-default)",
};

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
  resize: "vertical" as const,
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

export function GuestRatingForm({ shareId }: GuestRatingFormProps) {
  const [submitted, setSubmitted] = useState<StoredRating | null>(null);
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [guestName, setGuestName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey(shareId));
    if (stored) {
      try {
        setSubmitted(JSON.parse(stored) as StoredRating);
      } catch {
        // ignore malformed
      }
    }
  }, [shareId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (stars === 0) {
      setError("Please select a star rating.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const fingerprint = await getFingerprint();
      const res = await fetch("/api/ratings/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareId,
          fingerprint,
          stars,
          comment: comment.trim() || undefined,
          guestName: guestName.trim() || undefined,
        }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        stars?: number;
        comment?: string | null;
        error?: string;
      };

      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      const stored: StoredRating = {
        stars: json.stars ?? stars,
        comment: json.comment ?? null,
        guestName: guestName.trim() || null,
      };
      localStorage.setItem(storageKey(shareId), JSON.stringify(stored));
      setSubmitted(stored);
    } catch {
      setError("Could not submit rating. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section style={sectionStyle}>
        <h2
          style={{
            fontFamily: "var(--font-fraunces, Georgia, serif)",
            fontSize: "1.5rem",
            fontWeight: 500,
            color: "var(--ink-primary)",
            letterSpacing: "-0.01em",
            marginBottom: 12,
          }}
        >
          Rate this recipe
        </h2>
        <div
          style={{
            padding: "20px 24px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-default)",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-inter, sans-serif)",
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--ink-primary)",
              }}
            >
              Thanks for rating!
            </span>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: submitted.comment ? 10 : 0 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={20}
                fill={n <= submitted.stars ? "var(--accent-primary)" : "none"}
                stroke={n <= submitted.stars ? "var(--accent-primary)" : "var(--ink-tertiary)"}
              />
            ))}
          </div>
          {submitted.comment && (
            <p
              style={{
                fontFamily: "var(--font-source-serif, Georgia, serif)",
                fontSize: "0.9375rem",
                color: "var(--ink-secondary)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              &ldquo;{submitted.comment}&rdquo;
            </p>
          )}
          {submitted.guestName && (
            <p
              style={{
                fontFamily: "var(--font-inter, sans-serif)",
                fontSize: "0.8125rem",
                color: "var(--ink-tertiary)",
                marginTop: 6,
              }}
            >
              — {submitted.guestName}
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <h2
        style={{
          fontFamily: "var(--font-fraunces, Georgia, serif)",
          fontSize: "1.5rem",
          fontWeight: 500,
          color: "var(--ink-primary)",
          letterSpacing: "-0.01em",
          marginBottom: 4,
        }}
      >
        Rate this recipe
      </h2>
      <p
        style={{
          fontFamily: "var(--font-source-serif, Georgia, serif)",
          fontSize: "1rem",
          color: "var(--ink-secondary)",
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        Tried it? Leave a quick rating — it means a lot.
      </p>

      <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 480 }}>
        {/* Star picker */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Your rating</label>
          <div
            style={{ display: "flex", gap: 6 }}
            onMouseLeave={() => setHovered(0)}
            role="radiogroup"
            aria-label="Star rating"
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const active = n <= (hovered || stars);
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={n === stars}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => setStars(n)}
                  onMouseEnter={() => setHovered(n)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 2,
                    cursor: "pointer",
                    lineHeight: 1,
                  }}
                >
                  <Star
                    size={28}
                    fill={active ? "var(--accent-primary)" : "none"}
                    stroke={active ? "var(--accent-primary)" : "var(--ink-tertiary)"}
                    style={{ transition: "fill 0.1s, stroke 0.1s" }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Comment */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="comment" style={labelStyle}>
            Comment <span style={{ color: "var(--ink-tertiary)", fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            id="comment"
            rows={3}
            maxLength={500}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you think? Any tweaks you made?"
            style={inputStyle}
          />
          <p
            style={{
              marginTop: 4,
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "0.75rem",
              color: "var(--ink-tertiary)",
              textAlign: "right",
            }}
          >
            {comment.length}/500
          </p>
        </div>

        {/* Guest name */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="guestName" style={labelStyle}>
            Your name <span style={{ color: "var(--ink-tertiary)", fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id="guestName"
            type="text"
            maxLength={80}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="e.g. Grandma Rivka"
            style={inputStyle}
          />
        </div>

        {error && (
          <p
            style={{
              marginBottom: 12,
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

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "10px 24px",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: "var(--accent-primary)",
            color: "var(--ink-inverse)",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.9375rem",
            fontWeight: 600,
            cursor: isSubmitting ? "wait" : "pointer",
            opacity: isSubmitting ? 0.7 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {isSubmitting ? "Submitting…" : "Submit rating"}
        </button>
      </form>
    </section>
  );
}
