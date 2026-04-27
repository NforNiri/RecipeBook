import { getCookHistory } from "@/lib/db/queries/cook-log";
import { UtensilsCrossed } from "lucide-react";

interface CookHistoryProps {
  recipeId: string;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function CookHistory({ recipeId }: CookHistoryProps) {
  const entries = await getCookHistory(recipeId, 10);

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
          marginBottom: 10,
        }}
      >
        Cook history
      </p>

      {entries.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            padding: "16px 8px",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--border-default)",
            textAlign: "center",
          }}
        >
          <UtensilsCrossed
            size={18}
            style={{ color: "var(--ink-tertiary)", opacity: 0.5 }}
          />
          <p
            style={{
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "0.8125rem",
              color: "var(--ink-tertiary)",
            }}
          >
            Not cooked yet
          </p>
        </div>
      ) : (
        <ol
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {entries.map((entry) => (
            <li
              key={entry.id}
              style={{
                padding: "8px 10px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-subtle)",
                border: "1px solid var(--border-default)",
              }}
            >
              <time
                dateTime={entry.cookedAt}
                style={{
                  fontFamily: "var(--font-inter, sans-serif)",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: "var(--ink-primary)",
                }}
              >
                {formatDate(entry.cookedAt)}
              </time>
              {entry.note && (
                <p
                  style={{
                    fontFamily: "var(--font-source-serif, Georgia, serif)",
                    fontSize: "0.8125rem",
                    color: "var(--ink-secondary)",
                    lineHeight: 1.5,
                    marginTop: 3,
                  }}
                >
                  {entry.note}
                </p>
              )}
              {entry.resultRating && (
                <p
                  style={{
                    fontFamily: "var(--font-inter, sans-serif)",
                    fontSize: "0.75rem",
                    color: "var(--ink-tertiary)",
                    marginTop: 2,
                  }}
                >
                  {"★".repeat(entry.resultRating)}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
