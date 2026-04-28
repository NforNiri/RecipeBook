"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
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

  if (insertError) {
    console.error("[inviteFamily] insert error:", insertError.message, insertError.code);
    return { ok: false, error: "unknown" };
  }

  // Send magic link using a plain anon client — NOT the session-aware SSR
  // client. When the SSR client carries the owner's JWT, Supabase's /otp
  // endpoint sees an already-authenticated user and may reject OTPs for a
  // different email address. The anon client has no session, so the request
  // goes through as a standard unauthenticated OTP call.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error: otpError } = await anonClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/callback`,
      shouldCreateUser: true,
    },
  });

  if (otpError) {
    console.error("[inviteFamily] OTP error:", otpError.message);
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
