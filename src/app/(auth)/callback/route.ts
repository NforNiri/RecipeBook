import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/db";

/**
 * Supabase magic-link callback handler with invite gate.
 *
 * After exchanging the code for a session we check whether the newly
 * signed-in user is the owner or is present in the `invites` allow-list.
 * If neither condition holds, we sign them out immediately and redirect to
 * /login?error=invite-only with a friendly message.
 *
 * The redirect response is created first so that Supabase can set the session
 * cookies directly on it — if we used next/headers cookies() and returned a
 * separate NextResponse.redirect(), the auth cookies would be lost.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const successResponse = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              successResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
    }

    // --- Invite gate ---
    // The session is now set on successResponse. We can use the same client
    // (it holds the session in memory) to query the database.

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // 1. Look up the user's profile role.
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const isOwner = profile?.role === "owner";

      if (!isOwner) {
        // 2. Check whether the user's email is in the invite list.
        //    The `invites_self_check` RLS policy allows this query.
        const { data: invite } = await supabase
          .from("invites")
          .select("id")
          .eq("email", user.email ?? "")
          .maybeSingle();

        if (!invite) {
          // Not invited — sign out and redirect with a clear error.
          await supabase.auth.signOut();
          const blockedResponse = NextResponse.redirect(
            `${origin}/login?error=invite-only`
          );
          // Clear the session cookies that were written onto successResponse.
          successResponse.cookies.getAll().forEach((c) => {
            blockedResponse.cookies.set(c.name, "", {
              maxAge: 0,
              path: "/",
            });
          });
          return blockedResponse;
        }
      }
    }

    return successResponse;
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
