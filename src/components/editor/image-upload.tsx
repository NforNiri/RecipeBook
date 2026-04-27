"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { createBrowserClient } from "@/lib/db/client";
import { validateAndCompressImage } from "@/lib/utils/image-compress";

interface ImageUploadProps {
  defaultUrl?: string | null;
  onUpload: (url: string | null) => void;
}

export function ImageUpload({ defaultUrl, onUpload }: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    if (!raw) return;

    setError(null);
    setUploading(true);

    try {
      const file = await validateAndCompressImage(raw);

      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("recipes-images")
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("recipes-images")
        .getPublicUrl(path);

      setPreviewUrl(urlData.publicUrl);
      onUpload(urlData.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    setPreviewUrl(null);
    onUpload(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      {previewUrl ? (
        <div style={{ position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ position: "relative", aspectRatio: "16/9", width: "100%" }}>
            <Image
              src={previewUrl}
              alt="Hero image preview"
              fill
              style={{ objectFit: "cover" }}
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: "var(--radius-full)",
              border: "none",
              backgroundColor: "oklch(0% 0 0 / 0.6)",
              color: "#fff",
              cursor: "pointer",
            }}
            aria-label="Remove image"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            aspectRatio: "16/9",
            border: "2px dashed var(--border-default)",
            borderRadius: "var(--radius-lg)",
            backgroundColor: "var(--bg-muted)",
            color: "var(--ink-tertiary)",
            cursor: uploading ? "wait" : "pointer",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.875rem",
            fontWeight: 500,
            transition: `border-color var(--duration-fast), color var(--duration-fast)`,
          }}
        >
          {uploading ? (
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <Upload size={20} />
          )}
          {uploading ? "Uploading…" : "Upload hero image"}
          {!uploading && (
            <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>
              JPEG, PNG or WebP · max 5 MB
            </span>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {error && (
        <p
          role="alert"
          style={{
            marginTop: 8,
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "oklch(58% 0.18 25 / 0.08)",
            border: "1px solid oklch(58% 0.18 25 / 0.25)",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.8125rem",
            color: "var(--status-danger)",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
