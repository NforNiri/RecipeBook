"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { Ingredient } from "@/types/recipe";

interface IngredientsEditorProps {
  defaultIngredients: Ingredient[];
  onChange: (ingredients: Ingredient[]) => void;
}

const COMMON_UNITS = [
  "g", "kg", "mg",
  "ml", "L",
  "tsp", "tbsp", "cup",
  "oz", "lb",
  "piece", "pieces",
  "slice", "slices",
  "clove", "cloves",
  "bunch", "pinch",
  "to taste",
];

const cellStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border-default)",
  backgroundColor: "var(--bg-muted)",
  color: "var(--ink-primary)",
  fontFamily: "var(--font-source-serif, Georgia, serif)",
  fontSize: "0.9375rem",
  lineHeight: 1.4,
  outline: "none",
  width: "100%",
};

function emptyRow(): Ingredient {
  return { id: crypto.randomUUID(), qty: null, unit: null, item: "", note: null };
}

export function IngredientsEditor({ defaultIngredients, onChange }: IngredientsEditorProps) {
  const [rows, setRows] = useState<Ingredient[]>(
    defaultIngredients.length > 0 ? defaultIngredients : [emptyRow()]
  );

  function update(newRows: Ingredient[]) {
    setRows(newRows);
    onChange(newRows);
  }

  function updateRow(id: string, patch: Partial<Ingredient>) {
    update(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    update([...rows, emptyRow()]);
  }

  function removeRow(id: string) {
    const next = rows.filter((r) => r.id !== id);
    update(next.length > 0 ? next : [emptyRow()]);
  }

  return (
    <div>
      <style>{`
        .ing-grid-header,
        .ing-grid-row {
          display: grid;
          grid-template-columns: 64px 88px 1fr 108px 32px;
          gap: 6px;
          align-items: center;
        }
        .ing-col-note,
        .ing-header-note {
          /* shown by default */
        }
        @media (max-width: 520px) {
          .ing-grid-header,
          .ing-grid-row {
            grid-template-columns: 60px 80px 1fr 32px;
          }
          .ing-col-note,
          .ing-header-note {
            display: none;
          }
        }
      `}</style>

      {/* Column headers */}
      <div className="ing-grid-header" style={{ marginBottom: 4, paddingLeft: 2 }} aria-hidden="true">
        {["Qty", "Unit", "Ingredient", <span key="note" className="ing-header-note">Note</span>, ""].map((h, i) => (
          <span
            key={i}
            style={{
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "0.6875rem",
              fontWeight: 500,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--ink-tertiary)",
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((row, idx) => (
          <div key={row.id} className="ing-grid-row">
            {/* Qty */}
            <input
              type="number"
              min={0}
              step="any"
              aria-label={`Row ${idx + 1} quantity`}
              value={row.qty ?? ""}
              onChange={(e) =>
                updateRow(row.id, {
                  qty: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              placeholder="2"
              style={cellStyle}
            />

            {/* Unit */}
            <>
              <input
                type="text"
                list="ingredient-units"
                aria-label={`Row ${idx + 1} unit`}
                value={row.unit ?? ""}
                onChange={(e) =>
                  updateRow(row.id, { unit: e.target.value || null })
                }
                placeholder="cup"
                style={cellStyle}
              />
              {idx === 0 && (
                <datalist id="ingredient-units">
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              )}
            </>

            {/* Item */}
            <input
              type="text"
              dir="auto"
              aria-label={`Row ${idx + 1} ingredient`}
              value={row.item}
              onChange={(e) => updateRow(row.id, { item: e.target.value })}
              placeholder="flour"
              style={cellStyle}
            />

            {/* Note — hidden on mobile via CSS */}
            <input
              type="text"
              dir="auto"
              aria-label={`Row ${idx + 1} note`}
              value={row.note ?? ""}
              onChange={(e) =>
                updateRow(row.id, { note: e.target.value || null })
              }
              placeholder="sifted"
              className="ing-col-note"
              style={{ ...cellStyle, fontStyle: "italic", color: "var(--ink-secondary)" }}
            />

            {/* Remove */}
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              aria-label={`Remove ingredient row ${idx + 1}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)",
                backgroundColor: "transparent",
                color: "var(--ink-tertiary)",
                cursor: "pointer",
                flexShrink: 0,
                transition: `color var(--duration-fast), background-color var(--duration-fast)`,
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Add row */}
      <button
        type="button"
        onClick={addRow}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 10,
          padding: "6px 14px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-default)",
          backgroundColor: "transparent",
          color: "var(--ink-secondary)",
          fontFamily: "var(--font-inter, sans-serif)",
          fontSize: "0.875rem",
          fontWeight: 500,
          cursor: "pointer",
          transition: `background-color var(--duration-fast)`,
        }}
      >
        <Plus size={14} />
        Add ingredient
      </button>
    </div>
  );
}
