"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, RefreshCw, Globe, Lock } from "lucide-react";
import { togglePublic, rotateShareId } from "@/app/(app)/recipes/actions";

interface SharingSectionProps {
  recipeId: string;
  isPublic: boolean;
  shareId: string | null;
}

const sectionStyle: React.CSSProperties = {
  marginTop: 40,
  paddingTop: 32,
  borderTop: "1px solid var(--border-default)",
};

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-fraunces, Georgia, serif)",
  fontSize: "1.375rem",
  fontWeight: 600,
  color: "var(--ink-primary)",
  letterSpacing: "-0.01em",
  marginBottom: 4,
};

const bodyStyle: React.CSSProperties = {
  fontFamily: "var(--font-source-serif, Georgia, serif)",
  fontSize: "0.9375rem",
  color: "var(--ink-secondary)",
  lineHeight: 1.55,
  marginBottom: 20,
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-inter, sans-serif)",
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "var(--ink-secondary)",
  letterSpacing: "0.01em",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "9px 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  backgroundColor: "var(--bg-muted)",
  color: "var(--ink-primary)",
  fontFamily: "var(--font-inter, sans-serif)",
  fontSize: "0.875rem",
  outline: "none",
  minWidth: 0,
};

const btnBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 16px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  backgroundColor: "transparent",
  color: "var(--ink-secondary)",
  fontFamily: "var(--font-inter, sans-serif)",
  fontSize: "0.875rem",
  fontWeight: 500,
  cursor: "pointer",
  flexShrink: 0,
  transition: "opacity 0.15s",
};

export function SharingSection({ recipeId, isPublic, shareId }: SharingSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const siteUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const shareUrl = shareId ? `${siteUrl}/r/${shareId}` : null;

  function handleToggle() {
    startTransition(async () => {
      await togglePublic(recipeId, !isPublic);
      router.refresh();
    });
  }

  function handleRotate() {
    startTransition(async () => {
      await rotateShareId(recipeId);
      router.refresh();
    });
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Sharing</h2>
      <p style={bodyStyle}>
        Share a read-only link to this recipe. Guests can view the recipe and
        leave a star rating without signing in.
      </p>

      {/* Toggle */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: isPending ? "wait" : "pointer",
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          onClick={handleToggle}
          disabled={isPending}
          style={{
            position: "relative",
            width: 44,
            height: 24,
            borderRadius: 12,
            border: "none",
            backgroundColor: isPublic ? "var(--accent-primary)" : "var(--border-default)",
            cursor: isPending ? "wait" : "pointer",
            transition: "background-color 0.2s",
            flexShrink: 0,
            opacity: isPending ? 0.6 : 1,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: isPublic ? 22 : 2,
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "#fff",
              transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }}
          />
        </button>
        <span style={{ ...labelStyle, fontSize: "0.9375rem", display: "flex", alignItems: "center", gap: 6 }}>
          {isPublic ? (
            <>
              <Globe size={14} style={{ color: "var(--accent-primary)" }} />
              <span style={{ color: "var(--ink-primary)", fontWeight: 500 }}>Public</span>
              <span style={{ color: "var(--ink-tertiary)" }}>— anyone with the link can view this recipe</span>
            </>
          ) : (
            <>
              <Lock size={14} />
              <span>Private</span>
              <span style={{ color: "var(--ink-tertiary)" }}>— only you can see this recipe</span>
            </>
          )}
        </span>
      </label>

      {/* Share URL + actions */}
      {isPublic && shareUrl && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={labelStyle}>Shareable link</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="text"
              readOnly
              value={shareUrl}
              style={inputStyle}
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              onClick={handleCopy}
              style={{
                ...btnBase,
                backgroundColor: copied ? "var(--accent-soft)" : undefined,
                borderColor: copied ? "var(--accent-primary)" : undefined,
                color: copied ? "var(--accent-primary)" : undefined,
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={handleRotate}
              disabled={isPending}
              style={{
                ...btnBase,
                opacity: isPending ? 0.5 : 1,
                cursor: isPending ? "wait" : "pointer",
              }}
            >
              <RefreshCw size={13} style={isPending ? { animation: "spin 1s linear infinite" } : undefined} />
              Rotate link
            </button>
            <p
              style={{
                marginTop: 6,
                fontFamily: "var(--font-inter, sans-serif)",
                fontSize: "0.75rem",
                color: "var(--ink-tertiary)",
              }}
            >
              Generates a new link. The old link stops working immediately.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
