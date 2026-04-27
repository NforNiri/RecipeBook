import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase magic-link callback handler.
 *
 * The redirect response is created first so that Supabase can set
 * the session cookies directly on it — if we used next/headers cookies()
 * and then returned a separate NextResponse.redirect(), the auth cookies
 * would be lost and every visit would bounce back to /login.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const successResponse = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Write cookies onto the redirect response so the browser
            // receives the session on the very next request.
            cookiesToSet.forEach(({ name, value, options }) => {
              successResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return successResponse;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
