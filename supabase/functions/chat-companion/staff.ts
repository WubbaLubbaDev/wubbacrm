// Bookable-staff directory for the chat companion.
//
// "Bookable staff" = any registered user who has connected their Google Calendar
// (i.e. has a row in google_oauth_tokens). Display names come from the user's
// auth.users metadata (display_name, falling back to full_name / name / email).
// This is a prototype: no roles/permissions — every connected user is bookable.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface BookableStaff {
  userId: string;
  name: string;
}

/**
 * List all registered users who have connected a Google Calendar, with the
 * display name from their auth.users metadata. Requires the service-role client
 * (uses the admin API to read auth.users).
 */
export async function listBookableStaff(supabase: SupabaseClient): Promise<BookableStaff[]> {
  const { data: tokens } = await supabase.from('google_oauth_tokens').select('user_id');
  const connectedIds = new Set((tokens ?? []).map((t) => t.user_id as string));
  if (connectedIds.size === 0) return [];

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error || !data) return [];

  return data.users
    .filter((u) => connectedIds.has(u.id))
    .map((u) => {
      const meta = u.user_metadata ?? {};
      const name =
        (meta.display_name as string | undefined) ??
        (meta.full_name as string | undefined) ??
        (meta.name as string | undefined) ??
        u.email ??
        'Team member';
      return { userId: u.id, name };
    });
}

/**
 * Resolve which staff member a visitor's message refers to, by matching the
 * display name (or first name) against the bookable list. Returns null when no
 * clear match is found, so the caller can ask the visitor who they mean.
 */
export function resolveStaff(message: string, staff: BookableStaff[]): BookableStaff | null {
  const lower = message.toLowerCase();

  // 1. Full display-name match (e.g. "Andrew Budikusuma").
  const byFull = staff.find((s) => s.name && lower.includes(s.name.toLowerCase()));
  if (byFull) return byFull;

  // 2. First-name match as a whole word (e.g. "Andrew" → "Andrew Budikusuma").
  const words = new Set(lower.split(/[^a-z0-9]+/).filter(Boolean));
  const byFirst = staff.find((s) => {
    const first = s.name.split(/\s+/)[0]?.toLowerCase();
    return first && first.length > 1 && words.has(first);
  });
  return byFirst ?? null;
}
