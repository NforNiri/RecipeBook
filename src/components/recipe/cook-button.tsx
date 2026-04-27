"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChefHat, Check, UtensilsCrossed } from "lucide-react";
import { logCookEvent } from "@/app/(app)/recipes/actions";

interface CookButtonProps {
  recipeId: string;
  /** When provided, a "Start cooking mode" link is shown above the log button. */
  slug?: string;
}

export function CookButton({ recipeId, slug }: CookButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleLog() {
    setError(null);
    startTransition(async () => {
      try {
        await logCookEvent(recipeId, note.trim() || null);
        setDone(true);
        setNote("");
        setShowNote(false);
        router.refresh();
        setTimeout(() => setDone(false), 4000);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not log cook event — please try again."
        );
      }
    });
  }

  if (done) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--accent-soft)",
          color: "var(--ink-secondary)",
          fontFamily: "var(--font-inter, sans-serif)",
          fontSize: "0.875rem",
          fontWeight: 500,
        }}
      >
        <Check size={16} style={{ color: "var(--status-success)" }} />
        Logged!
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Start cooking mode link */}
      {slug && (
        <Link
          href={`/recipes/${slug}/cook`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            padding: "10px 16px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--accent-primary)",
            backgroundColor: "transparent",
            color: "var(--accent-primary)",
            textDecoration: "none",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          <UtensilsCrossed size={15} />
          Start cooking mode
        </Link>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {showNote && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="How did it go? (optional)"
          rows={2}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            backgroundColor: "var(--bg-muted)",
            color: "var(--ink-primary)",
            fontFamily: "var(--font-source-serif, Georgia, serif)",
            fontSize: "0.875rem",
            lineHeight: 1.5,
            resize: "vertical",
            outline: "none",
          }}
          autoFocus
        />
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          onClick={showNote ? handleLog : () => { setError(null); setShowNote(true); }}
          disabled={isPending}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            padding: "10px 16px",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: "var(--accent-primary)",
            color: "var(--ink-inverse)",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: isPending ? "wait" : "pointer",
            opacity: isPending ? 0.7 : 1,
            transition: "opacity var(--duration-fast)",
          }}
        >
          <ChefHat size={15} />
          {isPending ? "Logging…" : showNote ? "Log it" : "I cooked this"}
        </button>
        {showNote && (
          <button
            type="button"
            onClick={() => { setShowNote(false); setNote(""); setError(null); }}
            disabled={isPending}
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              backgroundColor: "transparent",
              color: "var(--ink-secondary)",
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        )}
      </div>
      {error && (
        <p
          role="alert"
          style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.75rem",
            color: "var(--status-danger)",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}
      </div>
    </div>
  );
}
