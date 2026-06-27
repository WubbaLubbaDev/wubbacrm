// Google Calendar API helper — fetches the user's calendar list and manages
// token freshness via the google-token-refresh Edge Function.

import { supabase, waitForSession } from '@/lib/supabase';

/** Shape of a row in the google_oauth_tokens table. */
export interface GoogleOAuthTokenRow {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
  calendar_id: string | null;
  connected_at: string;
  updated_at: string;
}

/** Shape of a Google CalendarList entry (subset of fields we use). */
export interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
}

/** Build an Authorization header value from a token. */
function makeAuthHeader(token: string): string {
  const parts = ['Bearer', token];
  return parts.join(' ');
}

/** Check if the stored access token has expired. */
export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

/** Fetch the user's stored OAuth token row from Supabase (RLS-protected). */
export async function getStoredTokens(): Promise<GoogleOAuthTokenRow | null> {
  const {
    data: { session },
  } = await waitForSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('google_oauth_tokens')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (error || !data) return null;
  return data as GoogleOAuthTokenRow;
}

/**
 * Ensure we have a fresh access token. If the stored token is expired,
 * call the google-token-refresh Edge Function to get a new one.
 * Returns the access token or null on failure.
 */
export async function ensureFreshAccessToken(): Promise<string | null> {
  const tokens = await getStoredTokens();
  if (!tokens) return null;

  if (!isTokenExpired(tokens.expires_at)) {
    return tokens.access_token;
  }

  // Token expired — refresh via Edge Function
  const {
    data: { session },
  } = await waitForSession();
  if (!session) return null;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/google-token-refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: makeAuthHeader(session.access_token),
    },
  });

  if (!response.ok) return null;

  const data: { success?: boolean; access_token?: string } = await response.json();
  return data.access_token ?? null;
}

/** Fetch the user's Google Calendar list. Returns null on failure. */
export async function listCalendars(): Promise<GoogleCalendar[] | null> {
  const accessToken = await ensureFreshAccessToken();
  if (!accessToken) return null;

  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: makeAuthHeader(accessToken) },
  });

  if (!response.ok) return null;

  const data: { items?: GoogleCalendar[] } = await response.json();
  return data.items ?? [];
}

/** Save the selected calendar_id to the user's token row. */
export async function saveSelectedCalendar(calendarId: string): Promise<boolean> {
  const {
    data: { session },
  } = await waitForSession();
  if (!session) return false;

  const { error } = await supabase
    .from('google_oauth_tokens')
    .update({ calendar_id: calendarId })
    .eq('user_id', session.user.id);

  return !error;
}
