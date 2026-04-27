import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/db/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  return <AppShell>{children}</AppShell>;
}
