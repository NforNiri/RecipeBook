"use client";

import { useState, useRef } from "react";
import { RecipeForm } from "@/components/recipe/recipe-form";
import type { RecipeFormData } from "@/app/(app)/recipes/actions";
import { Camera, UploadCloud } from "lucide-react";

type Phase = "input" | "loading" | "prefill" | "error";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export default function ImportPhotoPage() {
  const [phase, setPhase] = useState<Phase>("input");
  const [errorMsg, setErrorMsg] = useState("");
  const [prefill, setPrefill] = useState<RecipeFormData | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validateFile(file: File): string | null {
    if (!ACCEPTED.includes(file.type)) {
      return `Unsupported file type. Please upload a JPEG, PNG, WebP, or HEIC image.`;
    }
    if (file.size > MAX_BYTES) {
      return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Please upload an image under 10 MB.`;
    }
    return null;
  }

  function handleFileSelect(file: File) {
    const err = validateFile(file);
    if (err) {
      setErrorMsg(err);
      setPhase("error");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setPhase("input");
    setErrorMsg("");
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;

    setPhase("loading");
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const res = await fetch("/api/ai/import-photo", {
        method: "POST",
        body: formData,
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

  // ── Prefilled form view ───────────────────────────────────────────────
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
        </div>

        <RecipeForm mode="create" prefill={prefill} />
      </div>
    );
  }

  // ── File picker + loading + error views ──────────────────────────────
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
        <Camera
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
          Import from photo
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
        Upload a photo of a handwritten or printed recipe card. The recipe will
        be extracted and pre-filled into an editable form for you to review
        before saving. Supports JPEG, PNG, WebP, and HEIC — up to 10 MB.
      </p>

      <form onSubmit={handleImport} noValidate>
        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Click or drag to select a recipe photo"
          onClick={() => phase !== "loading" && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (phase !== "loading") fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (phase !== "loading") setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            marginBottom: 20,
            padding: "40px 24px",
            borderRadius: "var(--radius-lg, 12px)",
            border: `2px dashed ${dragOver ? "var(--accent-primary)" : selectedFile ? "var(--status-success, #2e7d32)" : "var(--border-default)"}`,
            backgroundColor: dragOver
              ? "oklch(58% 0.18 250 / 0.05)"
              : selectedFile
              ? "oklch(55% 0.15 145 / 0.05)"
              : "var(--bg-muted)",
            textAlign: "center",
            cursor: phase === "loading" ? "wait" : "pointer",
            transition: "border-color 150ms, background-color 150ms",
            outline: "none",
          }}
        >
          <UploadCloud
            size={36}
            style={{
              margin: "0 auto 12px",
              color: selectedFile
                ? "var(--status-success, #2e7d32)"
                : "var(--ink-tertiary)",
              display: "block",
            }}
          />
          {selectedFile ? (
            <>
              <p
                style={{
                  fontFamily: "var(--font-inter, sans-serif)",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  color: "var(--ink-primary)",
                  marginBottom: 4,
                  wordBreak: "break-all",
                }}
              >
                {selectedFile.name}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-inter, sans-serif)",
                  fontSize: "0.8125rem",
                  color: "var(--ink-secondary)",
                }}
              >
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB —{" "}
                <span style={{ color: "var(--accent-primary)" }}>
                  click to change
                </span>
              </p>
            </>
          ) : (
            <>
              <p
                style={{
                  fontFamily: "var(--font-inter, sans-serif)",
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  color: "var(--ink-secondary)",
                  marginBottom: 4,
                }}
              >
                Drop a photo here, or{" "}
                <span style={{ color: "var(--accent-primary)" }}>
                  browse files
                </span>
              </p>
              <p
                style={{
                  fontFamily: "var(--font-inter, sans-serif)",
                  fontSize: "0.8125rem",
                  color: "var(--ink-tertiary)",
                }}
              >
                JPEG, PNG, WebP, HEIC · max 10 MB
              </p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={handleInputChange}
          disabled={phase === "loading"}
          style={{ display: "none" }}
          aria-hidden
        />

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
            disabled={phase === "loading" || !selectedFile}
            style={{
              padding: "10px 28px",
              borderRadius: "var(--radius-md)",
              border: "none",
              backgroundColor: "var(--accent-primary)",
              color: "var(--ink-inverse)",
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor:
                phase === "loading" || !selectedFile ? "not-allowed" : "pointer",
              opacity: phase === "loading" || !selectedFile ? 0.65 : 1,
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
              "Extract recipe"
            )}
          </button>

          {phase === "error" && (
            <button
              type="button"
              onClick={() => {
                setPhase("input");
                setErrorMsg("");
              }}
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
          Sending photo to Gemini Vision — this typically takes 5–15 seconds…
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
