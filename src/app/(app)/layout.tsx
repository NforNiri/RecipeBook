import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/db/server";
import { AppShell } from "@/components/layout/app-shell";
import { getOwnerRecipeFilterCounts } from "@/lib/db/queries/recipes";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const filterCounts = await getOwnerRecipeFilterCounts();

  return <AppShell filterCounts={filterCounts}>{children}</AppShell>;
}
