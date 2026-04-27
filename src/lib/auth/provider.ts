/**
 * Auth abstraction layer.
 *
 * All app code imports from here — never directly from Supabase or any
 * other auth library. Swapping to Better Auth in v2 means writing a new
 * implementation of AuthProvider and changing one factory line.
 */

export interface Session {
  userId: string;
  email: string;
  role: "owner" | "family";
}

export interface AuthProvider {
  /** Returns the current session, or null if signed out. */
  getSession(): Promise<Session | null>;

  /** Sends a magic-link email. Throws on error. */
  signInWithMagicLink(email: string, redirectTo: string): Promise<void>;

  /** Signs the current user out. */
  signOut(): Promise<void>;

  /**
   * Subscribes to auth state changes.
   * Returns an unsubscribe function.
   */
  onAuthChange(cb: (session: Session | null) => void): () => void;
}
