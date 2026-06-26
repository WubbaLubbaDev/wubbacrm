// Edge Function: google-token-refresh
// Refreshes an expired Google OAuth access token using the stored refresh_token.
// Updates the access_token and expires_at in the database.
//
// Environment variables:
//   SUPABASE_URL          — Auto-injected by Supabase (NOT a custom secret)
//   SUPABASE_SECRET_KEYS  — Auto-injected by Supabase (NOT a custom secret);
//                           JSON dict; SUPABASE_SECRET_KEYS['default'] is the
//                           service role key used to bypass RLS for DB read/write.
//   GOOGLE_CLIENT_ID      — Custom secret (set via `supabase secrets set` or Dashboard)
//   GOOGLE_CLIENT_SECRET  — Custom secret (set via `supabase secrets set` or Dashboard)

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

    // Read the stored refresh_token
    const { data: tokenRow, error: fetchError } = await supabase
      .from('google_oauth_tokens')
      .select('refresh_token, expires_at')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !tokenRow) {
      return new Response(
        JSON.stringify({ error: 'No Google connection found. Please connect first.' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Refresh the access token
    const refreshResponse = await fetch('https://accounts.google.com/o/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        refresh_token: tokenRow.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const refreshed = await refreshResponse.json();
    if (refreshed.error) {
      return new Response(
        JSON.stringify({ error: refreshed.error, error_description: refreshed.error_description }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Update the access_token and expires_at in the DB
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('google_oauth_tokens')
      .update({
        access_token: refreshed.access_token,
        expires_at: expiresAt,
      })
      .eq('user_id', user.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        access_token: refreshed.access_token,
        expires_at: expiresAt,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
