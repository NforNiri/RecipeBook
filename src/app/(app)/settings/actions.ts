"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, getServerProfile } from "@/lib/db/server";

// ─── Guard ────────────────────────────────────────────────────────────────────

async function requireOwner() {
  const profile = await getServerProfile();
  if (!profile || profile.role !== "owner") {
    throw new Error("Unauthorized");
  }
  return profile;
}

// ─── inviteFamily ─────────────────────────────────────────────────────────────

export type InviteResult =
  | { ok: true }
  | { ok: false; error: "already_invited" | "send_failed" | "unknown" };

export async function inviteFamily(
  _prevState: InviteResult | null,
  formData: FormData
): Promise<InviteResult> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  if (!email) return { ok: false, error: "unknown" };

  const profile = await requireOwner();
  const supabase = await createServerSupabaseClient();

  // Check if already invited.
  const { data: existing } = await supabase
    .from("invites")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) return { ok: false, error: "already_invited" };

  // Insert into allow-list first so the invite gate passes when they log in.
  const { error: insertError } = await supabase.from("invites").insert({
    email,
    invited_by: profile.id,
  });

  if (insertError) return { ok: false, error: "unknown" };

  // Send magic link. signInWithOtp is a stateless call — it just triggers
  // Supabase to email the link; it doesn't affect the owner's current session.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/callback`,
      shouldCreateUser: true,
    },
  });

  if (otpError) {
    // Roll back the invite row so the state stays consistent.
    await supabase.from("invites").delete().eq("email", email);
    return { ok: false, error: "send_failed" };
  }

  revalidatePath("/settings");
  return { ok: true };
}

// ─── removeInvite ─────────────────────────────────────────────────────────────

export type RemoveResult = { ok: true } | { ok: false; error: string };

export async function removeInvite(
  _prevState: RemoveResult | null,
  formData: FormData
): Promise<RemoveResult> {
  const email = formData.get("email") as string | null;
  if (!email) return { ok: false, error: "Missing email" };

  await requireOwner();
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("invites").delete().eq("email", email);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

// ─── updateDisplayName ───────────────────────────────────────────────────────

export type UpdateNameResult = { ok: true } | { ok: false; error: string };

export async function updateDisplayName(
  _prevState: UpdateNameResult | null,
  formData: FormData
): Promise<UpdateNameResult> {
  const displayName = (formData.get("displayName") as string | null)?.trim();
  if (!displayName) return { ok: false, error: "Display name cannot be empty" };

  const profile = await getServerProfile();
  if (!profile) return { ok: false, error: "Not authenticated" };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq("id", profile.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}
