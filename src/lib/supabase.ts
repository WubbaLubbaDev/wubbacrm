import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in your values.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // This app uses password-based auth (signInWithPassword), not Supabase
    // OAuth or magic links. Disabling URL session detection prevents Supabase
    // from misinterpreting the `code` query param on the Google OAuth callback
    // URL (/oauth/google-calendar/callback?code=...) as a Supabase PKCE
    // callback — which would try to exchange the Google code with Supabase's
    // auth server, fail, and abort session recovery, leaving the user without
    // a session on the callback page.
    detectSessionInUrl: false,
  },
});

/**
 * Wait for Supabase to finish restoring the auth session from storage.
 *
 * Problem this solves: After a full page load (e.g. returning from an OAuth
 * redirect), the Supabase client's in-memory session is populated asynchronously
 * by `_recoverAndRefresh()`. Calling `supabase.auth.getSession()` immediately on
 * mount can return `{ session: null }` even when a valid session exists in
 * localStorage — the background refresh hasn't completed yet.
 *
 * This helper polls `getSession()` for up to `timeoutMs` (default 3000ms) until a
 * non-null session is available. If the timeout elapses with no session, it
 * returns null (the caller decides what to do — usually redirect to login).
 */
export async function waitForSession(timeoutMs = 3000, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await supabase.auth.getSession();
    if (result.data.session) return result;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return supabase.auth.getSession();
}
