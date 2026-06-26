// Google Calendar integration for the chat booking flow.
// Queries Free/Busy to find available slots and creates calendar events.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const TOKEN_URL = 'https://accounts.google.com/o/oauth2/token';
const BUSINESS_HOURS_START = 9; // 09:00
const BUSINESS_HOURS_END = 17;  // 17:00
const APPOINTMENT_DURATION_MIN = 30;
const TIMEZONE = 'Asia/Jakarta';

/** A busy block from Google Calendar. */
interface BusyBlock {
  start: string;
  end: string;
}

/** An available time slot derived from free time. */
export interface AvailableSlot {
  start: string; // ISO 8601
  end: string;   // ISO 8601
  label: string; // Human-readable label (e.g., "10:00 - 10:30 WIB")
}

/** Refresh the dashboard user's Google OAuth access token if expired. */
async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

/** Get a valid access token for the dashboard user from the stored refresh token. */
async function getAccessToken(
  supabaseUrl: string,
  serviceRoleKey: string,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Get the most recently connected user's tokens (single-tenant assumption)
  const { data, error } = await supabase
    .from('google_oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .order('connected_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  // Check if access token is still valid
  const expiresAt = new Date(data.expires_at).getTime();
  if (expiresAt > Date.now() + 60_000) {
    return data.access_token;
  }

  // Token expired — refresh it
  return refreshAccessToken(data.refresh_token, clientId, clientSecret);
}

/**
 * Query Google Calendar Free/Busy for a given date and derive available slots
 * within business hours (09:00-17:00 Asia/Jakarta).
 *
 * @param dateISO - ISO date string (e.g., "2026-06-27")
 */
export async function getAvailableSlots(
  dateISO: string,
  env: {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    GOOGLE_CALENDAR_CLIENT_ID: string;
    GOOGLE_CALENDAR_CLIENT_SECRET: string;
  },
): Promise<AvailableSlot[] | null> {
  const accessToken = await getAccessToken(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    env.GOOGLE_CALENDAR_CLIENT_ID,
    env.GOOGLE_CALENDAR_CLIENT_SECRET,
  );

  if (!accessToken) return null;

  // Build timeMin / timeMax for the requested date in Asia/Jakarta
  const timeMin = `${dateISO}T${String(BUSINESS_HOURS_START).padStart(2, '0')}:00:00+07:00`;
  const timeMax = `${dateISO}T${String(BUSINESS_HOURS_END).padStart(2, '0')}:00:00+07:00`;

  const res = await fetch(`${CALENDAR_API}/freeBusy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: TIMEZONE,
      items: [{ id: 'primary' }],
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const busyBlocks: BusyBlock[] = data.calendars?.primary?.busy ?? [];

  // Derive free slots by subtracting busy blocks from the business-hours window
  const slots: AvailableSlot[] = [];
  const windowStart = new Date(timeMin);
  const windowEnd = new Date(timeMax);
  const slotMs = APPOINTMENT_DURATION_MIN * 60 * 1000;

  // Sort busy blocks by start time
  const sortedBusy = busyBlocks
    .map((b) => ({ start: new Date(b.start), end: new Date(b.end) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let cursor = windowStart;

  for (const block of sortedBusy) {
    // If there's a gap between cursor and this busy block, add slots
    while (cursor.getTime() + slotMs <= block.start.getTime()) {
      const slotEnd = new Date(cursor.getTime() + slotMs);
      slots.push({
        start: cursor.toISOString(),
        end: slotEnd.toISOString(),
        label: formatSlotLabel(cursor, slotEnd),
      });
      cursor = new Date(cursor.getTime() + slotMs);
    }
    // Move cursor past this busy block
    if (block.end.getTime() > cursor.getTime()) {
      cursor = block.end;
    }
  }

  // Fill remaining slots until window end
  while (cursor.getTime() + slotMs <= windowEnd.getTime()) {
    const slotEnd = new Date(cursor.getTime() + slotMs);
    slots.push({
      start: cursor.toISOString(),
      end: slotEnd.toISOString(),
      label: formatSlotLabel(cursor, slotEnd),
    });
    cursor = new Date(cursor.getTime() + slotMs);
  }

  return slots;
}

/** Format a slot as a human-readable label in WIB. */
function formatSlotLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${fmt(start)} - ${fmt(end)} WIB`;
}

/**
 * Create a Google Calendar event for a booked appointment.
 * Returns the event ID on success, null on failure.
 */
export async function createCalendarEvent(
  slot: { start: string; end: string },
  visitorName: string,
  visitorEmail: string,
  env: {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    GOOGLE_CALENDAR_CLIENT_ID: string;
    GOOGLE_CALENDAR_CLIENT_SECRET: string;
  },
): Promise<string | null> {
  const accessToken = await getAccessToken(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    env.GOOGLE_CALENDAR_CLIENT_ID,
    env.GOOGLE_CALENDAR_CLIENT_SECRET,
  );

  if (!accessToken) return null;

  const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: `Appointment with ${visitorName}`,
      description: 'Booked via AI Companion chat',
      start: { dateTime: slot.start, timeZone: TIMEZONE },
      end: { dateTime: slot.end, timeZone: TIMEZONE },
      attendees: [{ email: visitorEmail }],
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data.id ?? null;
}