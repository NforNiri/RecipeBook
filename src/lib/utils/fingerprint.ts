"use client";

const STORAGE_KEY = "__rbfp";

/**
 * Generates a stable per-browser fingerprint by hashing:
 * canvas output, user agent, screen dimensions, timezone offset, and language.
 *
 * The result is persisted in localStorage so it survives across page sessions
 * on the same browser. No third-party fingerprinting services are used.
 */
export async function getFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "";

  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached && /^[0-9a-f]{64}$/.test(cached)) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 220;
  canvas.height = 30;
  const ctx = canvas.getContext("2d");
  let canvasData = "";
  if (ctx) {
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.font = "14px 'Arial'";
    ctx.fillText("Cookbook 🍳", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.font = "14px 'Helvetica'";
    ctx.fillText("Cookbook 🍳", 4, 17);
    canvasData = canvas.toDataURL();
  }

  const raw = [
    canvasData,
    navigator.userAgent,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(new Date().getTimezoneOffset()),
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");

  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const fp = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  localStorage.setItem(STORAGE_KEY, fp);
  return fp;
}
