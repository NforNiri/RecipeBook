/**
 * Server-only in-memory sliding-window rate limiter for guest ratings.
 * Keyed on a salted SHA-256 hash of the client IP (never the raw IP).
 *
 * Limit: 5 guest ratings per IP per hour across all recipes.
 *
 * Note: this can be replaced with Upstash Redis later if the app scales
 * beyond a single serverless instance.
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 5;

// Stores arrays of request timestamps per hashed key.
const store = new Map<string, number[]>();

/** Returns true if the request is within the allowed rate. */
export function checkRateLimit(hashedKey: string): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const timestamps = (store.get(hashedKey) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_PER_WINDOW) {
    store.set(hashedKey, timestamps);
    return false;
  }

  timestamps.push(now);
  store.set(hashedKey, timestamps);
  return true;
}
