"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

interface TagPickerProps {
  tags: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagPicker({
  tags,
  suggestions,
  onChange,
  placeholder = "Add tags…",
}: TagPickerProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  );
  const showDropdown = open && filtered.length > 0;

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput("");
    setOpen(false);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (input.trim()) addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Tag chips + input */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "8px 10px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-default)",
          backgroundColor: "var(--bg-muted)",
          minHeight: 44,
          alignItems: "center",
          cursor: "text",
        }}
        onClick={() => {
          const inp = containerRef.current?.querySelector("input");
          inp?.focus();
        }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--accent-soft)",
              color: "var(--ink-secondary)",
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "0.8125rem",
              fontWeight: 500,
            }}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              aria-label={`Remove tag ${tag}`}
              style={{
                display: "flex",
                alignItems: "center",
                border: "none",
                background: "transparent",
                color: "var(--ink-tertiary)",
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
              }}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // slight delay so click on suggestion registers first
            setTimeout(() => {
              if (input.trim()) addTag(input);
              setOpen(false);
            }, 150);
          }}
          placeholder={tags.length === 0 ? placeholder : ""}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--ink-primary)",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.875rem",
            outline: "none",
            flex: 1,
            minWidth: 100,
          }}
        />
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            marginTop: 4,
            padding: "4px 0",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            backgroundColor: "var(--bg-elevated)",
            boxShadow: "var(--shadow-md)",
            listStyle: "none",
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {filtered.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur first
                  addTag(tag);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "7px 12px",
                  border: "none",
                  background: "transparent",
                  color: "var(--ink-primary)",
                  fontFamily: "var(--font-inter, sans-serif)",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "var(--bg-muted)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "transparent";
                }}
              >
                {tag}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
