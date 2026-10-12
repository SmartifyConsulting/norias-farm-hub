/**
 * Turns a raw Supabase/Postgres error into plain language for the UI. Covers the handful of
 * cases the co-op RLS policies and RPCs actually raise — everything else falls back to a
 * generic, still-friendly message rather than ever showing the user a Postgres error.
 */
export function friendlyError(
  error: { message?: string | undefined; code?: string | undefined } | null | undefined,
): string {
  const msg = error?.message ?? "";
  const code = error?.code;

  if (code === "42501" || /permission denied|not authorised|row-level security/i.test(msg)) {
    return "You don't have permission to do that.";
  }
  if (code === "23505" || /already exists|duplicate key/i.test(msg)) {
    return "That already exists.";
  }
  if (/not signed in|jwt/i.test(msg)) {
    return "Please sign in and try again.";
  }
  if (/not a member/i.test(msg)) {
    return "You need to be a member of this co-operative to do that.";
  }
  if (/invite not found/i.test(msg)) {
    return "That invite couldn't be found — it may have expired or already been used.";
  }
  if (/request not found|listing not found|co-?operative not found/i.test(msg)) {
    return "That item is no longer available.";
  }
  if (/failed to fetch|network/i.test(msg)) {
    return "Couldn't connect — check your internet connection and try again.";
  }
  if (/invalid/i.test(msg) && /email|password|credentials/i.test(msg)) {
    return "Email or password is incorrect.";
  }
  return "Something went wrong. Please try again.";
}
