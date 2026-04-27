"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

interface RecipesSearchProps {
  initialQ?: string;
}

function buildUrl(currentParams: URLSearchParams, q: string) {
  const sp = new URLSearchParams(currentParams);
  if (q) {
    sp.set("q", q);
  } else {
    sp.delete("q");
  }

  const qs = sp.toString();
  return qs ? `/recipes?${qs}` : "/recipes";
}

export function RecipesSearch({ initialQ = "" }: RecipesSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushSearch = useCallback(
    (value: string) => {
      router.push(buildUrl(searchParams, value), { scroll: false });
    },
    [router, searchParams]
  );

  function handleSearch(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushSearch(value);
    }, 400);
  }

  function clearSearch() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQ("");
    pushSearch("");
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ position: "relative" }}>
        <Search
          size={17}
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--ink-tertiary)",
            pointerEvents: "none",
          }}
        />
        <input
          type="search"
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search recipes..."
          style={{
            width: "100%",
            padding: "10px 12px 10px 40px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            backgroundColor: "var(--bg-surface)",
            color: "var(--ink-primary)",
            fontFamily: "var(--font-source-serif, Georgia, serif)",
            fontSize: "1rem",
            outline: "none",
            transition: "border-color var(--duration-fast)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--border-focus)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border-default)";
          }}
        />
        {q && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
              border: "none",
              background: "transparent",
              color: "var(--ink-tertiary)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
