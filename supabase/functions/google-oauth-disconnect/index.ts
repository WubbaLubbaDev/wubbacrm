// Edge Function: google-oauth-disconnect
// Revokes the Google OAuth token and deletes the row from google_oauth_tokens.
//
// Environment variables:
//   SUPABASE_URL          — Auto-injected by Supabase (NOT a custom secret)
//   SUPABASE_SECRET_KEYS  — Auto-injected by Supabase (NOT a custom secret);
//                           JSON dict; SUPABASE_SECRET_KEYS['default'] is the
//                           service role key used to bypass RLS for DB delete.
//   GOOGLE_CLIENT_ID      — Custom secret (not strictly needed for revoke)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate the caller's JWT and extract user_id
    // SUPABASE_URL and SUPABASE_SECRET_KEYS are auto-injected by Supabase.
    const SUPABASE_SECRET_KEYS = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')!);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      SUPABASE_SECRET_KEYS['default'],
    );
    const jwt = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read the stored refresh_token for revocation
    const { data: tokenRow, error: fetchError } = await supabase
      .from('google_oauth_tokens')
      .select('refresh_token')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !tokenRow) {
      // Already disconnected — return success
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Revoke the token at Google
    await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenRow.refresh_token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    // Delete the row from the DB
    const { error: deleteError } = await supabase
      .from('google_oauth_tokens')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
