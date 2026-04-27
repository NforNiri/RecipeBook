"use client";

import { useState, useRef } from "react";
import { Sparkles, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

interface SuggestionsPanelProps {
  recipeId: string;
}

type Mode = "upgrade" | "swap";
type PanelState = "idle" | "streaming" | "done" | "error";

const MODE_LABELS: Record<Mode, string> = {
  upgrade: "Suggest upgrades",
  swap: "Suggest swaps",
};

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  upgrade: "Technique, flavour and texture improvements",
  swap: "Ingredient substitutions with different profiles",
};

export function SuggestionsPanel({ recipeId }: SuggestionsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<Mode | null>(null);
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [text, setText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function requestSuggestion(mode: Mode) {
    // Cancel any in-flight request.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setActiveMode(mode);
    setPanelState("streaming");
    setText("");
    setErrorMsg("");
    setCopied(false);

    try {
      const response = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId, mode }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const json = (await response.json()) as { error?: string };
        throw new Error(json.error ?? `Request failed (${response.status})`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setText((prev) => prev + chunk);
      }

      setPanelState("done");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setPanelState("error");
    }
  }

  async function copyText() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silent fail.
    }
  }

  return (
    <section
      style={{
        marginTop: 48,
        borderTop: "1px solid var(--border-default)",
        paddingTop: 24,
      }}
    >
      {/* ── Header / toggle ────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
        }}
      >
        <Sparkles
          size={18}
          style={{ color: "var(--accent-primary, #7c6ff7)", flexShrink: 0 }}
        />
        <span
          style={{
            fontFamily: "var(--font-fraunces, Georgia, serif)",
            fontSize: "1.5rem",
            fontWeight: 500,
            color: "var(--ink-primary)",
            letterSpacing: "-0.01em",
            flex: 1,
          }}
        >
          AI Suggestions
        </span>
        {isOpen ? (
          <ChevronUp size={18} style={{ color: "var(--ink-tertiary)" }} />
        ) : (
          <ChevronDown size={18} style={{ color: "var(--ink-tertiary)" }} />
        )}
      </button>

      {/* ── Panel body ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div style={{ marginTop: 20 }}>
          {/* Mode buttons */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            {(["upgrade", "swap"] as Mode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => requestSuggestion(mode)}
                disabled={panelState === "streaming"}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 2,
                  padding: "12px 20px",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${
                    activeMode === mode && panelState !== "idle" && panelState !== "error"
                      ? "var(--accent-primary, #7c6ff7)"
                      : "var(--border-default)"
                  }`,
                  backgroundColor:
                    activeMode === mode && panelState !== "idle" && panelState !== "error"
                      ? "var(--accent-soft)"
                      : "transparent",
                  cursor: panelState === "streaming" ? "not-allowed" : "pointer",
                  opacity: panelState === "streaming" && activeMode !== mode ? 0.5 : 1,
                  transition: "border-color 0.15s, background-color 0.15s",
                  textAlign: "left",
                  minWidth: 180,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-inter, sans-serif)",
                    fontSize: "0.9375rem",
                    fontWeight: 500,
                    color: "var(--ink-primary)",
                  }}
                >
                  {MODE_LABELS[mode]}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-inter, sans-serif)",
                    fontSize: "0.8125rem",
                    color: "var(--ink-tertiary)",
                  }}
                >
                  {MODE_DESCRIPTIONS[mode]}
                </span>
              </button>
            ))}
          </div>

          {/* Loading state */}
          {panelState === "streaming" && text === "" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "16px 0",
                fontFamily: "var(--font-inter, sans-serif)",
                fontSize: "0.9375rem",
                color: "var(--ink-secondary)",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: "2px solid var(--border-default)",
                  borderTopColor: "var(--accent-primary, #7c6ff7)",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              Thinking… this usually takes 5–8 seconds
            </div>
          )}

          {/* Streamed / completed text */}
          {text && (
            <div
              style={{
                position: "relative",
                padding: "20px 24px",
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-source-serif, Georgia, serif)",
                  fontSize: "1.0625rem",
                  lineHeight: 1.75,
                  color: "var(--ink-primary)",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {text}
                {panelState === "streaming" && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: "1.1em",
                      marginLeft: 2,
                      verticalAlign: "text-bottom",
                      backgroundColor: "var(--ink-secondary)",
                      animation: "blink 1s step-end infinite",
                    }}
                  />
                )}
              </p>

              {/* Copy button — visible once done */}
              {panelState === "done" && (
                <button
                  onClick={copyText}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 16,
                    padding: "6px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    fontFamily: "var(--font-inter, sans-serif)",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    color: "var(--ink-secondary)",
                    transition: "border-color 0.15s",
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied!" : "Copy suggestion"}
                </button>
              )}
            </div>
          )}

          {/* Error state */}
          {panelState === "error" && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-error-bg, #fef2f2)",
                border: "1px solid var(--color-error-border, #fecaca)",
                fontFamily: "var(--font-inter, sans-serif)",
                fontSize: "0.9375rem",
                color: "var(--color-error, #dc2626)",
              }}
            >
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* Keyframe animations injected once per mount */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </section>
  );
}
