"use client";

import { useState } from "react";
import { RecipeForm } from "@/components/recipe/recipe-form";
import type { RecipeFormData } from "@/app/(app)/recipes/actions";
import { Link2 } from "lucide-react";

type Phase = "input" | "loading" | "prefill" | "error";

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
};

export default function ImportUrlPage() {
  const [phase, setPhase] = useState<Phase>("input");
  const [url, setUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [prefill, setPrefill] = useState<RecipeFormData | null>(null);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setPhase("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/ai/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setPhase("error");
        return;
      }

      setPrefill(data as RecipeFormData);
      setPhase("prefill");
    } catch {
      setErrorMsg("Network error. Check your connection and try again.");
      setPhase("error");
    }
  }

  // ── Prefilled form view ─────────────────────────────────────────────
  if (phase === "prefill" && prefill) {
    return (
      <div
        className="px-4 py-8 md:px-6 md:py-10"
        style={{ maxWidth: "var(--container-narrow, 720px)", margin: "0 auto" }}
      >
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: "var(--font-fraunces, Georgia, serif)",
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 600,
              color: "var(--ink-primary)",
              letterSpacing: "-0.02em",
              marginBottom: 8,
            }}
          >
            Review imported recipe
          </h1>
          <p
            style={{
              fontFamily: "var(--font-source-serif, Georgia, serif)",
              fontSize: "0.9375rem",
              color: "var(--ink-secondary)",
              lineHeight: 1.55,
            }}
          >
            Check the fields below, make any changes, then save.
          </p>
          {prefill.sourceValue && (
            <p
              style={{
                marginTop: 8,
                fontFamily: "var(--font-inter, sans-serif)",
                fontSize: "0.8125rem",
                color: "var(--ink-tertiary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Source:{" "}
              <a
                href={prefill.sourceValue}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent-primary)" }}
              >
                {prefill.sourceValue}
              </a>
            </p>
          )}
        </div>

        <RecipeForm mode="create" prefill={prefill} />
      </div>
    );
  }

  // ── URL input + loading + error views ──────────────────────────────
  return (
    <div
      className="px-4 py-8 md:px-6 md:py-10"
      style={{ maxWidth: "var(--container-narrow, 720px)", margin: "0 auto" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <Link2
          size={28}
          style={{ color: "var(--accent-primary)", flexShrink: 0 }}
        />
        <h1
          style={{
            fontFamily: "var(--font-fraunces, Georgia, serif)",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 600,
            color: "var(--ink-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Import from URL
        </h1>
      </div>
      <p
        style={{
          fontFamily: "var(--font-source-serif, Georgia, serif)",
          fontSize: "0.9375rem",
          color: "var(--ink-secondary)",
          lineHeight: 1.6,
          marginBottom: 40,
        }}
      >
        Paste any cooking blog or recipe site URL. The recipe will be extracted
        and pre-filled into an editable form for you to review before saving.
      </p>

      <form onSubmit={handleImport} noValidate>
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="import-url"
            style={{
              display: "block",
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "var(--ink-secondary)",
              marginBottom: 6,
              letterSpacing: "0.01em",
            }}
          >
            Recipe URL
          </label>
          <input
            id="import-url"
            type="url"
            required
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.seriouseats.com/some-recipe"
            disabled={phase === "loading"}
            style={{
              ...inputStyle,
              opacity: phase === "loading" ? 0.6 : 1,
              cursor: phase === "loading" ? "wait" : "text",
            }}
          />
        </div>

        {/* Error message */}
        {phase === "error" && errorMsg && (
          <div
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
            {errorMsg}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            type="submit"
            disabled={phase === "loading" || !url.trim()}
            style={{
              padding: "10px 28px",
              borderRadius: "var(--radius-md)",
              border: "none",
              backgroundColor: "var(--accent-primary)",
              color: "var(--ink-inverse)",
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor: phase === "loading" ? "wait" : "pointer",
              opacity: phase === "loading" || !url.trim() ? 0.65 : 1,
              transition: "opacity 150ms",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {phase === "loading" ? (
              <>
                <Spinner />
                Extracting…
              </>
            ) : (
              "Import recipe"
            )}
          </button>

          {phase === "error" && (
            <button
              type="button"
              onClick={() => setPhase("input")}
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
              Try again
            </button>
          )}
        </div>
      </form>

      {/* Loading hint */}
      {phase === "loading" && (
        <p
          style={{
            marginTop: 20,
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.8125rem",
            color: "var(--ink-tertiary)",
          }}
        >
          Fetching and extracting recipe data — this can take up to 30 seconds…
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
      aria-hidden
    />
  );
}
