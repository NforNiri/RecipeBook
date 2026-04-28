"use client";

import { useActionState } from "react";
import { inviteFamily, type InviteResult } from "./actions";

export function InviteForm() {
  const [state, formAction, isPending] = useActionState<InviteResult | null, FormData>(
    inviteFamily,
    null
  );

  return (
    <form action={formAction} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <input
        name="email"
        type="email"
        placeholder="family@example.com"
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
        {isPending ? "Sending…" : "Send invite"}
      </button>

      {state?.ok === true && (
        <p
          style={{
            width: "100%",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.875rem",
            color: "var(--status-success, #16a34a)",
          }}
        >
          Invitation sent! They'll receive a magic-link email shortly.
        </p>
      )}

      {state?.ok === false && state.error === "already_invited" && (
        <p
          style={{
            width: "100%",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.875rem",
            color: "var(--ink-secondary)",
          }}
        >
          That email is already invited.
        </p>
      )}

      {state?.ok === false && state.error === "rate_limited" && (
        <p
          style={{
            width: "100%",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.875rem",
            color: "var(--status-warning, #ca8a04)",
          }}
        >
          Supabase rate-limits magic links to ~2 per hour per address. Wait an
          hour, then use the Resend button next to the invite below.
        </p>
      )}

      {state?.ok === false && state.error === "send_failed" && (
        <p
          style={{
            width: "100%",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.875rem",
            color: "var(--status-danger)",
          }}
        >
          The invite was saved but the email failed to send. Try again shortly.
        </p>
      )}

      {state?.ok === false && state.error === "unknown" && (
        <p
          style={{
            width: "100%",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.875rem",
            color: "var(--status-danger)",
          }}
        >
          Something went wrong. Make sure the Supabase invites table exists
          (run the migration SQL from{" "}
          <code style={{ fontSize: "0.8125rem" }}>
            supabase/migrations/0003_invites.sql
          </code>
          ).
        </p>
      )}
    </form>
  );
}
