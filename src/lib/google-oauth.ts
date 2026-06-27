// Google OAuth helper — builds the authorization URL, manages CSRF state,
// and exchanges the authorization code for tokens via a Supabase Edge Function.

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = 'https://www.googleapis.com/auth/calendar';
const STATE_STORAGE_KEY = 'google_oauth_state';

/** Build an Authorization header value from a token. */
function makeAuthHeader(token: string): string {
  const parts = ['Bearer', token];
  return parts.join(' ');
}

/** Build the Google OAuth authorization URL and generate a CSRF state token. */
export function buildAuthUrl(): { url: string; state: string } {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = `${window.location.origin}/oauth/google-calendar/callback`;
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    state,
    prompt: 'consent',
    include_granted_scopes: 'true',
  });

  return { url: `${GOOGLE_AUTH_URL}?${params.toString()}`, state };
}

/** Initiate the OAuth flow: store state in sessionStorage, then redirect to Google. */
export function initiateOAuthFlow(): void {
  const { url, state } = buildAuthUrl();
  sessionStorage.setItem(STATE_STORAGE_KEY, state);
  window.location.href = url;
}

/**
 * Validate the OAuth state parameter returned by Google against the value
 * stored in sessionStorage. Removes the stored state after validation.
 * Returns true if state matches, false otherwise.
 */
export function validateOAuthState(state: string | null): boolean {
  const stored = sessionStorage.getItem(STATE_STORAGE_KEY);
  sessionStorage.removeItem(STATE_STORAGE_KEY);
  return stored !== null && stored === state;
}

/** Exchange the authorization code for tokens via the Supabase Edge Function. */
export async function exchangeCodeForTokens(
  code: string,
  jwt: string,
): Promise<{ success?: boolean; error?: string; error_description?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/google-oauth-exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: makeAuthHeader(jwt),
    },
    body: JSON.stringify({ code }),
  });
  return response.json();
}

/** Disconnect: revoke the token at Google and delete the DB row. */
export async function disconnectGoogleCalendar(
  jwt: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/google-oauth-disconnect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: makeAuthHeader(jwt),
    },
  });
  return response.json();
}
