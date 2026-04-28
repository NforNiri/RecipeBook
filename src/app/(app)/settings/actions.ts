"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive the app's public URL from the live request headers.
 * Works automatically on localhost, Vercel previews, and production — no
 * env var needed. Falls back to NEXT_PUBLIC_SITE_URL if set.
 */
async function getSiteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Send a magic-link email via a plain anon client (no session attached). */
async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  const siteUrl = await getSiteUrl();
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { error } = await anonClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl}/callback`, shouldCreateUser: true },
  });
  return { error: error?.message ?? null };
}

function isRateLimitError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("rate") || m.includes("limit") || m.includes("seconds") || m.includes("too many");
}

// ─── inviteFamily ─────────────────────────────────────────────────────────────

export type InviteResult =
  | { ok: true }
  | { ok: false; error: "already_invited" | "send_failed" | "rate_limited" | "unknown" };

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

  const { error: otpMessage } = await sendMagicLink(email);

  if (otpMessage) {
    console.error("[inviteFamily] OTP error:", otpMessage);
    // Roll back the invite row so state stays consistent.
    await supabase.from("invites").delete().eq("email", email);
    return { ok: false, error: isRateLimitError(otpMessage) ? "rate_limited" : "send_failed" };
  }

  revalidatePath("/settings");
  return { ok: true };
}

// ─── resendInvite ─────────────────────────────────────────────────────────────

export type ResendResult =
  | { ok: true }
  | { ok: false; error: "rate_limited" | "send_failed" | "unknown" };

export async function resendInvite(
  _prevState: ResendResult | null,
  formData: FormData
): Promise<ResendResult> {
  const email = formData.get("email") as string | null;
  if (!email) return { ok: false, error: "unknown" };

  await requireOwner();

  const { error: otpMessage } = await sendMagicLink(email);

  if (otpMessage) {
    console.error("[resendInvite] OTP error:", otpMessage);
    return { ok: false, error: isRateLimitError(otpMessage) ? "rate_limited" : "send_failed" };
  }

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
