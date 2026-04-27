"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      data-no-print
      onClick={() => window.print()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
        marginTop: 8,
        padding: "8px 16px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-default)",
        backgroundColor: "transparent",
        color: "var(--ink-secondary)",
        cursor: "pointer",
        fontFamily: "var(--font-inter, sans-serif)",
        fontSize: "0.875rem",
        fontWeight: 500,
      }}
      aria-label="Print or save as PDF"
    >
      <Printer size={14} />
      Print / Save as PDF
    </button>
  );
}
