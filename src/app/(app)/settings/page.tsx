import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getServerProfile, createServerSupabaseClient } from "@/lib/db/server";
import { InviteForm } from "./invite-form";
import { InviteList } from "./invite-list";
import { AccountForm } from "./account-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await getServerProfile();

  if (!profile) redirect("/login");
  if (profile.role !== "owner") redirect("/recipes?error=forbidden");

  const supabase = await createServerSupabaseClient();
  const { data: invites } = await supabase
    .from("invites")
    .select("id, email, created_at")
    .order("created_at", { ascending: true });

  return (
    <div
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: "clamp(2rem, 5vw, 3rem) 1.5rem",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-fraunces, Georgia, serif)",
          fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "var(--ink-primary)",
          marginBottom: "2.5rem",
        }}
      >
        Settings
      </h1>

      {/* ── Invite family members ─────────────────────────────── */}
      <section style={{ marginBottom: "2.5rem" }}>
        <SectionHeading>Invite family members</SectionHeading>
        <p
          style={{
            fontFamily: "var(--font-source-serif, Georgia, serif)",
            fontSize: "0.9375rem",
            color: "var(--ink-secondary)",
            lineHeight: 1.6,
            marginBottom: "1rem",
          }}
        >
          Enter an email address to send a magic-link invitation. Invited
          members can view (but not edit) your recipes.
        </p>
        <InviteForm />
      </section>

      {/* ── Invited members list ──────────────────────────────── */}
      <section style={{ marginBottom: "2.5rem" }}>
        <SectionHeading>Invited members</SectionHeading>
        <InviteList invites={invites ?? []} />
      </section>

      {/* ── Account ───────────────────────────────────────────── */}
      <section style={{ marginBottom: "2.5rem" }}>
        <SectionHeading>Account</SectionHeading>
        <AccountForm
          currentDisplayName={profile.display_name ?? ""}
          email={profile.email}
        />
      </section>

      {/* ── Print & Export ────────────────────────────────────── */}
      <section>
        <SectionHeading>Print &amp; Export</SectionHeading>
        <p
          style={{
            fontFamily: "var(--font-source-serif, Georgia, serif)",
            fontSize: "0.9375rem",
            color: "var(--ink-secondary)",
            lineHeight: 1.6,
            marginBottom: "1rem",
          }}
        >
          Print your entire cookbook or save it as a PDF. Each recipe starts on
          a new page with a magazine-quality layout.
        </p>
        <Link
          href="/recipes/print"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            backgroundColor: "var(--bg-surface)",
            color: "var(--ink-primary)",
            textDecoration: "none",
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.9375rem",
            fontWeight: 500,
          }}
        >
          <BookOpen size={16} />
          Print cookbook
        </Link>
      </section>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-fraunces, Georgia, serif)",
        fontSize: "1.125rem",
        fontWeight: 600,
        color: "var(--ink-primary)",
        marginBottom: "0.75rem",
        paddingBottom: "0.5rem",
        borderBottom: "1px solid var(--border-default)",
      }}
    >
      {children}
    </h2>
  );
}
