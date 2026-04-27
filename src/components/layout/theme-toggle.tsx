"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  // Always start as false so the server and first hydration render both show
  // Moon (light mode). The anti-FOUC script in layout.tsx already applied the
  // correct theme to the <html> element before first paint, so colors/backgrounds
  // are correct. The icon corrects itself after mount via useEffect.
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "");
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage may be unavailable in some browser contexts
    }
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
