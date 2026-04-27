"use client";

import { useActionState } from "react";
import { updateDisplayName, type UpdateNameResult } from "./actions";
import { SignOutButton } from "@/components/layout/sign-out-button";

interface AccountFormProps {
  currentDisplayName: string;
  email: string;
}

export function AccountForm({ currentDisplayName, email }: AccountFormProps) {
  const [state, formAction, isPending] = useActionState<UpdateNameResult | null, FormData>(
    updateDisplayName,
    null
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Email (read-only) */}
      <div>
        <label
          style={{
            display: "block",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--ink-secondary)",
            marginBottom: "0.375rem",
          }}
        >
          Email
        </label>
        <p
          style={{
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.9375rem",
            color: "var(--ink-tertiary)",
          }}
        >
          {email}
        </p>
      </div>

      {/* Display name */}
      <form action={formAction}>
        <label
          htmlFor="displayName"
          style={{
            display: "block",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--ink-secondary)",
            marginBottom: "0.375rem",
          }}
        >
          Display name
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            id="displayName"
            name="displayName"
            type="text"
            defaultValue={currentDisplayName}
            required
            disabled={isPending}
            style={{
              flex: "1 1 200px",
              padding: "0.625rem 0.875rem",
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "0.9375rem",
              color: "var(--ink-primary)",
              backgroundColor: "var(--bg-muted)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={isPending}
            style={{
              padding: "0.625rem 1.25rem",
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--ink-inverse)",
              backgroundColor: isPending ? "var(--ink-tertiary)" : "var(--accent-primary)",
              border: "none",
              borderRadius: "var(--radius-md)",
              cursor: isPending ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>

        {state?.ok === true && (
          <p
            style={{
              marginTop: "0.5rem",
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "0.875rem",
              color: "var(--status-success, #16a34a)",
            }}
          >
            Display name updated.
          </p>
        )}
        {state?.ok === false && (
          <p
            style={{
              marginTop: "0.5rem",
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "0.875rem",
              color: "var(--status-danger)",
            }}
          >
            {state.error}
          </p>
        )}
      </form>

      {/* Sign out */}
      <div
        style={{
          paddingTop: "0.5rem",
          borderTop: "1px solid var(--border-default)",
        }}
      >
        <SignOutButton />
      </div>
    </div>
  );
}
