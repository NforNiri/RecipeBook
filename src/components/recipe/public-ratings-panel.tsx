import { Star } from "lucide-react";
import type { GuestRatingSummary } from "@/lib/db/queries/ratings";

interface PublicRatingsPanelProps {
  summary: GuestRatingSummary;
}

function StarBar({ filled, size = 14 }: { filled: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= Math.round(filled) ? "var(--accent-primary)" : "none"}
          stroke={n <= Math.round(filled) ? "var(--accent-primary)" : "var(--ink-tertiary)"}
        />
      ))}
    </span>
  );
}

export function PublicRatingsPanel({ summary }: PublicRatingsPanelProps) {
  return (
    <div
      style={{
        paddingTop: 16,
        marginTop: 4,
        borderTop: "1px solid var(--border-default)",
      }}
    >
      <dt
        style={{
          fontFamily: "var(--font-inter, sans-serif)",
          fontSize: "0.6875rem",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-tertiary)",
          marginBottom: 8,
        }}
      >
        Guest ratings
      </dt>

      {/* Average + count */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <StarBar filled={summary.avgStars} />
        <span
          style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--ink-primary)",
          }}
        >
          {summary.avgStars.toFixed(1)}
        </span>
        <span
          style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.8125rem",
            color: "var(--ink-tertiary)",
          }}
        >
          ({summary.count} {summary.count === 1 ? "rating" : "ratings"})
        </span>
      </div>

      {/* Recent comments */}
      {summary.recent.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {summary.recent.map((r) => (
            <div
              key={r.id}
              style={{
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-muted)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: r.comment ? 4 : 0 }}>
                <StarBar filled={r.stars} size={12} />
                <span
                  style={{
                    fontFamily: "var(--font-inter, sans-serif)",
                    fontSize: "0.75rem",
                    color: "var(--ink-tertiary)",
                  }}
                >
                  {r.guestName ?? "Anonymous"}
                </span>
              </div>
              {r.comment && (
                <p
                  style={{
                    fontFamily: "var(--font-source-serif, Georgia, serif)",
                    fontSize: "0.875rem",
                    color: "var(--ink-secondary)",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  &ldquo;{r.comment}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
