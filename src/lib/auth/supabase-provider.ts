import type { AuthProvider, Session } from "./provider";
import type { Database } from "@/types/db";
import { createBrowserClient } from "../db/client";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function mapSession(
  supabaseUser: { id: string; email?: string | null } | null,
  role: "owner" | "family"
): Session | null {
  if (!supabaseUser || !supabaseUser.email) return null;
  return {
    userId: supabaseUser.id,
    email: supabaseUser.email,
    role,
  };
}

export function createSupabaseAuthProvider(): AuthProvider {
  const supabase = createBrowserClient();

  return {
    async getSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return null;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      const profile = profileData as Pick<ProfileRow, "role"> | null;
      return mapSession(session.user, profile?.role ?? "family");
    },

    async signInWithMagicLink(email, redirectTo) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },

    onAuthChange(cb) {
      const { data: listener } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (!session?.user) {
            cb(null);
            return;
          }
          const { data: profileData } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          const profile = profileData as Pick<ProfileRow, "role"> | null;
          cb(mapSession(session.user, profile?.role ?? "family"));
        }
      );
      return () => listener.subscription.unsubscribe();
    },
  };
}
