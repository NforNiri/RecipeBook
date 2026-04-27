"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

const themeListeners = new Set<() => void>();

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

function getThemeSnapshot() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

function getServerThemeSnapshot() {
  return false;
}

function emitThemeChange() {
  themeListeners.forEach((listener) => listener());
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  function toggle() {
    const next = !dark;
    document.documentElement.setAttribute("data-theme", next ? "dark" : "");
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage may be unavailable in some browser contexts
    }
    emitThemeChange();
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        flexShrink: 0,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-default)",
        background: "transparent",
        color: "var(--ink-secondary)",
        cursor: "pointer",
        transition: `color var(--duration-fast), border-color var(--duration-fast)`,
      }}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
