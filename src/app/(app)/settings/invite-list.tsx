"use client";

import { useActionState } from "react";
import { removeInvite, type RemoveResult } from "./actions";

interface Invite {
  id: string;
  email: string;
  created_at: string;
}

function RemoveButton({ email }: { email: string }) {
  const [, formAction, isPending] = useActionState<RemoveResult | null, FormData>(
    removeInvite,
    null
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="email" value={email} />
      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: "0.25rem 0.75rem",
          fontFamily: "var(--font-inter, sans-serif)",
          fontSize: "0.8125rem",
          fontWeight: 500,
          color: "var(--status-danger)",
          backgroundColor: "transparent",
          border: "1px solid color-mix(in srgb, var(--status-danger) 40%, transparent)",
          borderRadius: "var(--radius-md)",
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.5 : 1,
        }}
      >
        {isPending ? "Removing…" : "Remove"}
      </button>
    </form>
  );
}

export function InviteList({ invites }: { invites: Invite[] }) {
  if (invites.length === 0) {
    return (
      <p
        style={{
          fontFamily: "var(--font-source-serif, Georgia, serif)",
          fontSize: "0.9375rem",
          color: "var(--ink-tertiary)",
          fontStyle: "italic",
        }}
      >
        No family members invited yet.
      </p>
    );
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {invites.map((invite) => (
        <li
          key={invite.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.625rem 0",
            borderBottom: "1px solid var(--border-default)",
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "0.9375rem",
              color: "var(--ink-primary)",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {invite.email}
          </span>
          <span
            style={{
              fontFamily: "var(--font-inter, sans-serif)",
              fontSize: "0.8125rem",
              color: "var(--ink-tertiary)",
              flexShrink: 0,
            }}
          >
            {new Date(invite.created_at).toLocaleDateString()}
          </span>
          <RemoveButton email={invite.email} />
        </li>
      ))}
    </ul>
  );
}
