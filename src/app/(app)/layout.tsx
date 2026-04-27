import { redirect } from "next/navigation";
import { getServerProfile } from "@/lib/db/server";
import { AppShell } from "@/components/layout/app-shell";
import { getOwnerRecipeFilterCounts } from "@/lib/db/queries/recipes";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getServerProfile();
  if (!profile) redirect("/login");
  const filterCounts = await getOwnerRecipeFilterCounts();

  return (
    <AppShell filterCounts={filterCounts} role={profile.role}>
      {children}
    </AppShell>
  );
}
