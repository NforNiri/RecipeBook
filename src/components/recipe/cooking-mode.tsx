"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight, Timer, RotateCcw, List, Pause, Play } from "lucide-react";
import type { Recipe, TiptapNode } from "@/types/recipe";
import type { TiptapDocument } from "@/types/recipe";

// ─── Tiptap helpers ──────────────────────────────────────────────────────────

function extractText(node: TiptapNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(extractText).join(" ");
}

/** Pull all non-empty block nodes from the document as cooking steps. */
function extractSteps(doc: TiptapDocument): TiptapNode[] {
  return (doc.content ?? []).filter((node) => {
    if (node.type === "paragraph") {
      return extractText(node).trim().length > 0;
    }
    // Keep headings, list items, etc. if they have any text
    return extractText(node).trim().length > 0;
  });
}

/** Render a single Tiptap block node's inline content as React nodes. */
function renderInline(node: TiptapNode, key: string): React.ReactNode {
  if (node.type === "text") {
    const text = node.text ?? "";
    const hasBold = node.marks?.some((m) => m.type === "bold");
    const hasItalic = node.marks?.some((m) => m.type === "italic");
    if (hasBold) return <strong key={key}>{text}</strong>;
    if (hasItalic) return <em key={key}>{text}</em>;
    return <span key={key}>{text}</span>;
  }
  if (node.type === "hardBreak") return <br key={key} />;
  // Nested inline nodes
  return <span key={key}>{(node.content ?? []).map((c, i) => renderInline(c, `${key}-${i}`))}</span>;
}

/** Render a step node's content in cooking-mode styling (large, centred). */
function renderStep(node: TiptapNode): React.ReactNode {
  const inlines = (node.content ?? []).map((c, i) => renderInline(c, `s-${i}`));

  if (node.type === "heading") {
    return (
      <p dir="auto" style={{ margin: 0, fontWeight: 700 }}>
        {inlines}
      </p>
    );
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    // Flatten list items into simple paragraphs
    return (
      <div style={{ textAlign: "left" }}>
        {(node.content ?? []).map((item, i) => {
          const itemText = (item.content ?? []).map((p, j) =>
            (p.content ?? []).map((c, k) => renderInline(c, `li-${i}-${j}-${k}`))
          );
          return (
            <p key={i} dir="auto" style={{ margin: "0 0 0.5em" }}>
              {node.type === "orderedList" ? `${i + 1}. ` : "• "}
              {itemText}
            </p>
          );
        })}
      </div>
    );
  }

  // Default — paragraph
  return (
    <p dir="auto" style={{ margin: 0 }}>
      {inlines}
    </p>
  );
}

// ─── Timer helpers ────────────────────────────────────────────────────────────

/**
 * Parse total seconds from free text.
 * Matches: 1 hour 30 minutes, bake for 25 min, rest 1 hr, etc.
 * Spec: `(\d+)\s*(hour|hr|minute|min|second|sec)s?` case-insensitive.
 * Multiple matches are summed.
 */
function parseSecondsFromText(text: string): number {
  const re = /(\d+)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)/gi;
  let total = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const val = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit.startsWith("h")) total += val * 3600;
    else if (unit.startsWith("m")) total += val * 60;
    else total += val;
  }
  return total;
}

function formatCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Web Audio chime ──────────────────────────────────────────────────────────

/**
 * Play a soft synthesised bell chime.
 * The AudioContext must already exist and be in "running" state (unlocked
 * by the user gesture that started the timer).
 */
function playChime(ctxRef: React.RefObject<AudioContext | null>) {
  try {
    const ctx = ctxRef.current;
    if (!ctx || ctx.state === "closed") return;

    const now = ctx.currentTime;

    // Fundamental — soft sine wave
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(660, now + 0.8);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 1.8);

    // Overtone — higher partial, shorter decay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, now);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 1.0);

    // Second bell hit at +0.6s for a gentle "ding-dong"
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(660, now + 0.6);
    gain3.gain.setValueAtTime(0, now + 0.6);
    gain3.gain.linearRampToValueAtTime(0.2, now + 0.62);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.6);
    osc3.stop(now + 2.2);
  } catch {
    // Silently ignore if Web Audio is unavailable
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CookingModeProps {
  recipe: Recipe;
  slug: string;
}

type TimerState = {
  totalSeconds: number;
  remaining: number;
  running: boolean;
  done: boolean;
};

// Dark palette — always dark regardless of app theme
const dark = {
  bg: "#141414",
  bgPanel: "#1e1e1e",
  bgDrawer: "#1a1a1a",
  text: "#f2ebe0",
  textSecondary: "#a89e90",
  textTertiary: "#6b6259",
  accent: "oklch(72% 0.18 60)",
  accentMuted: "oklch(40% 0.08 60)",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.15)",
  danger: "oklch(65% 0.15 25)",
  success: "oklch(65% 0.15 145)",
};

const btnBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "none",
  cursor: "pointer",
  fontFamily: "var(--font-inter, sans-serif)",
  fontWeight: 500,
  borderRadius: "var(--radius-md)",
  transition: "opacity 120ms",
};

export function CookingMode({ recipe, slug }: CookingModeProps) {
  const router = useRouter();
  const steps = extractSteps(recipe.instructions);

  const [currentStep, setCurrentStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [wakeLockNotice, setWakeLockNotice] = useState(false);

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Navigation ────────────────────────────────────────────────
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimer(null);
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(steps.length - 1, index));
      setCurrentStep(next);
      clearTimer();
      setShowIngredients(false);
    },
    [steps.length, clearTimer]
  );

  // ── Keyboard navigation ───────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't interfere with input elements
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setCurrentStep((prev) => {
          const next = Math.min(steps.length - 1, prev + 1);
          if (next !== prev) { clearTimer(); setShowIngredients(false); }
          return next;
        });
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setCurrentStep((prev) => {
          const next = Math.max(0, prev - 1);
          if (next !== prev) { clearTimer(); setShowIngredients(false); }
          return next;
        });
      } else if (e.key === "Escape") {
        router.push(`/recipes/${slug}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steps.length, clearTimer, router, slug]);

  // ── Wake Lock ─────────────────────────────────────────────────
  useEffect(() => {
    const nav = navigator as Navigator & {
      wakeLock?: { request(type: "screen"): Promise<WakeLockSentinel> };
    };

    if (!nav.wakeLock) {
      setWakeLockNotice(true);
      return;
    }

    let released = false;
    nav.wakeLock.request("screen")
      .then((sentinel) => {
        if (released) {
          sentinel.release();
        } else {
          wakeLockRef.current = sentinel;
        }
      })
      .catch(() => setWakeLockNotice(true));

    return () => {
      released = true;
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  // ── Timer countdown ───────────────────────────────────────────
  useEffect(() => {
    if (!timer?.running) return;

    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (!prev) return null;
        if (prev.remaining <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          playChime(audioCtxRef);
          return { ...prev, remaining: 0, running: false, done: true };
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timer?.running]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // ── Derived state ─────────────────────────────────────────────
  const currentNode = steps[currentStep];
  const stepText = currentNode ? extractText(currentNode) : "";
  const stepTimerSeconds = stepText ? parseSecondsFromText(stepText) : 0;
  const progress = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 100;

  // ── Timer actions ─────────────────────────────────────────────
  function handleStartTimer() {
    // Create / unlock AudioContext inside the user gesture for iOS Safari
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    } catch {
      // Web Audio not available — chime won't play but timer still works
    }
    setTimer({ totalSeconds: stepTimerSeconds, remaining: stepTimerSeconds, running: true, done: false });
  }

  function handlePauseResume() {
    setTimer((prev) => (prev ? { ...prev, running: !prev.running } : null));
  }

  function handleResetTimer() {
    clearTimer();
  }

  // ── Empty state ───────────────────────────────────────────────
  if (steps.length === 0) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          backgroundColor: dark.bg,
          color: dark.text,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          fontFamily: "var(--font-source-serif, Georgia, serif)",
        }}
      >
        <p style={{ fontSize: "1.25rem", color: dark.textSecondary }}>
          This recipe has no instructions yet.
        </p>
        <button
          onClick={() => router.push(`/recipes/${slug}`)}
          style={{
            ...btnBase,
            padding: "10px 20px",
            backgroundColor: dark.accentMuted,
            color: dark.text,
            fontSize: "0.9375rem",
          }}
        >
          <X size={16} />
          Back to recipe
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: dark.bg,
        color: dark.text,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Progress bar ── */}
      <div style={{ height: 3, backgroundColor: "rgba(255,255,255,0.08)", flexShrink: 0 }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            backgroundColor: dark.accent,
            transition: "width 350ms var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1))",
          }}
        />
      </div>

      {/* ── Header ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "14px 20px",
          flexShrink: 0,
          borderBottom: `1px solid ${dark.border}`,
        }}
      >
        {/* Recipe title */}
        <span
          style={{
            fontFamily: "var(--font-fraunces, Georgia, serif)",
            fontSize: "0.9375rem",
            fontWeight: 500,
            color: dark.textSecondary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}
        >
          {recipe.title}
        </span>

        {/* Step counter */}
        <span
          style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: dark.textTertiary,
            flexShrink: 0,
          }}
        >
          Step {currentStep + 1} of {steps.length}
        </span>

        {/* Exit */}
        <button
          onClick={() => router.push(`/recipes/${slug}`)}
          aria-label="Exit cooking mode"
          style={{
            ...btnBase,
            padding: "7px 12px",
            backgroundColor: "rgba(255,255,255,0.06)",
            color: dark.textSecondary,
            fontSize: "0.8125rem",
            flexShrink: 0,
          }}
        >
          <X size={15} />
          Exit
        </button>
      </header>

      {/* ── Wake Lock notice ── */}
      {wakeLockNotice && (
        <div
          style={{
            padding: "6px 20px",
            backgroundColor: "rgba(255,200,100,0.08)",
            borderBottom: `1px solid rgba(255,200,100,0.15)`,
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.75rem",
            color: "oklch(78% 0.12 75)",
            flexShrink: 0,
          }}
        >
          Screen may sleep — Wake Lock is not supported in this browser.
        </div>
      )}

      {/* ── Main step content ── */}
      {/* overflow:auto + justifyContent:center clips the top on tall steps.
          Fix: flex-col on the parent, margin:auto on the inner div — this
          centres when content fits and scrolls correctly when it overflows. */}
      <main
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            maxWidth: 680,
            width: "100%",
            textAlign: "center",
            margin: "auto",
            padding: "40px 24px",
          }}
        >
          {/* Step text */}
          <div
            style={{
              fontFamily: "var(--font-source-serif, Georgia, serif)",
              fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
              lineHeight: 1.65,
              color: dark.text,
              marginBottom: stepTimerSeconds > 0 ? 40 : 0,
            }}
          >
            {currentNode && renderStep(currentNode)}
          </div>

          {/* Timer widget */}
          {stepTimerSeconds > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                padding: "20px 24px",
                borderRadius: "var(--radius-lg)",
                backgroundColor: dark.bgPanel,
                border: `1px solid ${dark.borderStrong}`,
              }}
            >
              {!timer ? (
                /* Not started */
                <button
                  onClick={handleStartTimer}
                  style={{
                    ...btnBase,
                    padding: "10px 20px",
                    backgroundColor: dark.accent,
                    color: "#fff",
                    fontSize: "0.9375rem",
                  }}
                >
                  <Timer size={16} />
                  Start timer — {formatCountdown(stepTimerSeconds)}
                </button>
              ) : (
                <>
                  {/* Countdown display */}
                  <span
                    style={{
                      fontFamily: "var(--font-inter, sans-serif)",
                      fontSize: "clamp(2rem, 8vw, 3.5rem)",
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                      color: timer.done ? dark.success : dark.text,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {formatCountdown(timer.remaining)}
                  </span>

                  {timer.done ? (
                    /* Done state */
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-inter, sans-serif)",
                          fontSize: "0.9375rem",
                          color: dark.success,
                          fontWeight: 500,
                        }}
                      >
                        ✓ Time&apos;s up!
                      </span>
                      <button
                        onClick={handleResetTimer}
                        style={{
                          ...btnBase,
                          padding: "7px 14px",
                          backgroundColor: "rgba(255,255,255,0.08)",
                          color: dark.textSecondary,
                          fontSize: "0.8125rem",
                        }}
                      >
                        <RotateCcw size={13} />
                        Reset
                      </button>
                    </div>
                  ) : (
                    /* Running / paused */
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={handlePauseResume}
                        style={{
                          ...btnBase,
                          padding: "7px 14px",
                          backgroundColor: dark.accentMuted,
                          color: dark.text,
                          fontSize: "0.8125rem",
                        }}
                      >
                        {timer.running ? <Pause size={13} /> : <Play size={13} />}
                        {timer.running ? "Pause" : "Resume"}
                      </button>
                      <button
                        onClick={handleResetTimer}
                        aria-label="Reset timer"
                        style={{
                          ...btnBase,
                          padding: "7px 10px",
                          backgroundColor: "rgba(255,255,255,0.06)",
                          color: dark.textSecondary,
                          fontSize: "0.8125rem",
                        }}
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Bottom navigation ── */}
      <footer
        style={{
          flexShrink: 0,
          borderTop: `1px solid ${dark.border}`,
          backgroundColor: dark.bgPanel,
        }}
      >
        {/* Ingredients drawer */}
        {showIngredients && (
          <div
            style={{
              borderBottom: `1px solid ${dark.border}`,
              padding: "16px 20px",
              maxHeight: "35vh",
              overflowY: "auto",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-inter, sans-serif)",
                fontSize: "0.6875rem",
                fontWeight: 500,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: dark.textTertiary,
                marginBottom: 12,
              }}
            >
              Ingredients
            </p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {recipe.ingredients.length === 0 && (
                <li
                  style={{
                    fontFamily: "var(--font-source-serif, Georgia, serif)",
                    fontSize: "0.9375rem",
                    color: dark.textTertiary,
                  }}
                >
                  No ingredients listed.
                </li>
              )}
              {recipe.ingredients.map((ing) => (
                <li
                  key={ing.id}
                  dir="auto"
                  style={{
                    fontFamily: "var(--font-source-serif, Georgia, serif)",
                    fontSize: "0.9375rem",
                    lineHeight: 1.5,
                    color: dark.text,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      backgroundColor: dark.accent,
                      flexShrink: 0,
                      marginTop: 7,
                    }}
                    aria-hidden="true"
                  />
                  {ing.qty != null && (
                    <span style={{ fontWeight: 500 }}>{ing.qty}</span>
                  )}
                  {ing.unit && (
                    <span style={{ color: dark.textSecondary }}>{ing.unit}</span>
                  )}
                  <span>{ing.item}</span>
                  {ing.note && (
                    <span style={{ color: dark.textTertiary, fontStyle: "italic" }}>
                      ({ing.note})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Nav row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            gap: 8,
          }}
        >
          {/* Previous */}
          <button
            onClick={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0}
            style={{
              ...btnBase,
              padding: "10px 18px",
              backgroundColor:
                currentStep === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)",
              color: currentStep === 0 ? dark.textTertiary : dark.text,
              fontSize: "0.9375rem",
              cursor: currentStep === 0 ? "not-allowed" : "pointer",
              opacity: currentStep === 0 ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          {/* Ingredients toggle */}
          <button
            onClick={() => setShowIngredients((v) => !v)}
            aria-label={showIngredients ? "Hide ingredients" : "Show ingredients"}
            style={{
              ...btnBase,
              padding: "9px 14px",
              backgroundColor: showIngredients
                ? dark.accentMuted
                : "rgba(255,255,255,0.06)",
              color: showIngredients ? dark.accent : dark.textSecondary,
              fontSize: "0.8125rem",
              border: showIngredients
                ? `1px solid ${dark.accent}`
                : `1px solid ${dark.border}`,
            }}
          >
            <List size={15} />
            <span className="sr-only sm:not-sr-only">Ingredients</span>
          </button>

          {/* Next */}
          <button
            onClick={() => goToStep(currentStep + 1)}
            disabled={currentStep === steps.length - 1}
            style={{
              ...btnBase,
              padding: "10px 18px",
              backgroundColor:
                currentStep === steps.length - 1
                  ? "rgba(255,255,255,0.03)"
                  : dark.accent,
              color:
                currentStep === steps.length - 1 ? dark.textTertiary : "#fff",
              fontSize: "0.9375rem",
              cursor: currentStep === steps.length - 1 ? "not-allowed" : "pointer",
              opacity: currentStep === steps.length - 1 ? 0.4 : 1,
            }}
          >
            {currentStep === steps.length - 1 ? "Finish" : "Next"}
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
}
