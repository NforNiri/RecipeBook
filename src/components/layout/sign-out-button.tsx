"use client";

import { LogOut } from "lucide-react";
import { createBrowserClient } from "@/lib/db/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: "var(--radius-md)",
        border: "none",
        background: "transparent",
        color: "var(--ink-secondary)",
        fontFamily: "var(--font-inter, sans-serif)",
        fontSize: "0.875rem",
        fontWeight: 500,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: `background-color var(--duration-fast), color var(--duration-fast)`,
      }}
    >
      <LogOut size={16} />
      Sign out
    </button>
  );
}
