// Edge Function: google-oauth-exchange
// Exchanges an OAuth authorization code for Google Calendar tokens,
// then stores them in the google_oauth_tokens table (UPSERT).
//
// Environment variables:
//   SUPABASE_URL          — Auto-injected by Supabase (NOT a custom secret)
//   SUPABASE_SECRET_KEYS  — Auto-injected by Supabase (NOT a custom secret);
//                           JSON dict; SUPABASE_SECRET_KEYS['default'] is the
//                           service role key used to bypass RLS for DB writes.
//   GOOGLE_CLIENT_ID      — Custom secret (set via `supabase secrets set` or Dashboard)
//   GOOGLE_CLIENT_SECRET  — Custom secret (set via `supabase secrets set` or Dashboard)
//   GOOGLE_REDIRECT_URI   — Custom secret (set via `supabase secrets set` or Dashboard)

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
    const { code } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing authorization code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Exchange the authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        redirect_uri: Deno.env.get('GOOGLE_REDIRECT_URI')!,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    if (tokens.error) {
      return new Response(
        JSON.stringify({ error: tokens.error, error_description: tokens.error_description }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
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

    // Calculate expires_at from expires_in (seconds)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // UPSERT tokens — one row per user
    const { error: upsertError } = await supabase.from('google_oauth_tokens').upsert(
      {
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        scope: tokens.scope,
      },
      { onConflict: 'user_id' },
    );

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), {
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
