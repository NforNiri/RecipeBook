import Link from "next/link";
import { BookOpen, PlusCircle, Link2, Camera } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { SignOutButton } from "./sign-out-button";
import {
  DesktopRecipeFilters,
  MobileRecipeFiltersTab,
} from "@/components/recipe/recipe-filters";
import type { RecipeFilterCounts } from "@/lib/recipe/filter-options";

interface AppShellProps {
  children: React.ReactNode;
  filterCounts: RecipeFilterCounts;
}

export function AppShell({ children, filterCounts }: AppShellProps) {
  return (
    <div style={{ display: "flex", minHeight: "100dvh" }}>
      {/* ─── Mobile top header ─────────────────────────────────────── */}
      <header
        className="flex md:hidden"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          backgroundColor: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-default)",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          zIndex: 20,
        }}
      >
        <Link href="/recipes" style={{ textDecoration: "none" }}>
          <span
            style={{
              fontFamily: "var(--font-fraunces, Georgia, serif)",
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "var(--ink-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Cookbook
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SignOutButton />
          <ThemeToggle />
        </div>
      </header>

      {/* ─── Desktop sidebar ───────────────────────────────────────── */}
      <aside
        className="hidden md:flex"
        style={{
          width: 220,
          flexShrink: 0,
          flexDirection: "column",
          borderRight: "1px solid var(--border-default)",
          backgroundColor: "var(--bg-surface)",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        <div style={{ padding: "24px 20px 16px" }}>
          <Link href="/recipes" style={{ textDecoration: "none" }}>
            <span
              style={{
                fontFamily: "var(--font-fraunces, Georgia, serif)",
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "var(--ink-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              Cookbook
            </span>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: "4px 12px" }}>
          <SidebarLink href="/recipes" icon={<BookOpen size={16} />}>
            My Recipes
          </SidebarLink>
          <SidebarLink href="/recipes/new" icon={<PlusCircle size={16} />}>
            New Recipe
          </SidebarLink>
          <SidebarLink href="/import/url" icon={<Link2 size={16} />}>
            Import from URL
          </SidebarLink>
          <SidebarLink href="/import/photo" icon={<Camera size={16} />}>
            Import from photo
          </SidebarLink>
          <DesktopRecipeFilters counts={filterCounts} />
        </nav>

        <div
          style={{
            padding: "12px",
            borderTop: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ flex: 1 }}>
            <SignOutButton />
          </div>
          <ThemeToggle />
        </div>
      </aside>

      {/* ─── Main content area ─────────────────────────────────────── */}
      <main
        className="md:ml-[220px] pt-14 md:pt-0"
        style={{
          flex: 1,
          minHeight: "100dvh",
          paddingBottom: 64,
        }}
      >
        {children}
      </main>

      {/* ─── Mobile bottom tab bar ─────────────────────────────────── */}
      <nav
        className="flex md:hidden"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          backgroundColor: "var(--bg-surface)",
          borderTop: "1px solid var(--border-default)",
          alignItems: "center",
          justifyContent: "space-around",
          zIndex: 10,
        }}
      >
        <MobileTab href="/recipes" icon={<BookOpen size={20} />} label="Recipes" />
        <MobileTab href="/recipes/new" icon={<PlusCircle size={20} />} label="New" />
        <MobileTab href="/import/url" icon={<Link2 size={20} />} label="Import URL" />
        <MobileTab href="/import/photo" icon={<Camera size={20} />} label="Photo" />
        <MobileRecipeFiltersTab counts={filterCounts} />
      </nav>
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: "var(--radius-md)",
        textDecoration: "none",
        color: "var(--ink-secondary)",
        fontFamily: "var(--font-inter, sans-serif)",
        fontSize: "0.875rem",
        fontWeight: 500,
        marginBottom: 2,
      }}
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileTab({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "8px 16px",
        textDecoration: "none",
        color: "var(--ink-secondary)",
        fontFamily: "var(--font-inter, sans-serif)",
        fontSize: "0.6875rem",
        fontWeight: 500,
      }}
    >
      {icon}
      {label}
    </Link>
  );
}
