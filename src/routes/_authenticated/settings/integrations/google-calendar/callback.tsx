import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { exchangeCodeForTokens, validateOAuthState } from '@/lib/google-oauth';
import { supabase } from '@/lib/supabase';

export const Route = createFileRoute(
  '/_authenticated/settings/integrations/google-calendar/callback',
)({
  validateSearch: z.object({
    code: z.string().optional(),
    state: z.string().optional(),
  }),
  component: OAuthCallbackHandler,
});

type CallbackState = 'loading' | 'error' | 'success';

function OAuthCallbackHandler() {
  const search = useSearch({ from: Route.id });
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const code = search.code ?? null;
  const stateParam = search.state ?? null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount — code and stateParam come from URL search params and won't change
  useEffect(() => {
    async function handleCallback() {
      // Validate state for CSRF protection
      if (!validateOAuthState(stateParam)) {
        setState('error');
        setErrorMsg('Invalid state parameter. Please try connecting again.');
        return;
      }

      if (!code) {
        setState('error');
        setErrorMsg('No authorization code received from Google.');
        return;
      }

      // Get the current Supabase session JWT
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setState('error');
        setErrorMsg('You must be logged in to connect Google Calendar.');
        return;
      }

      // Exchange the code for tokens via the Edge Function
      const result = await exchangeCodeForTokens(code, session.access_token);
      if (result.error) {
        setState('error');
        setErrorMsg(result.error_description ?? result.error ?? 'Token exchange failed.');
        return;
      }

      // Success — navigate to the Google Calendar settings page
      setState('success');
      navigate({ to: '/settings/integrations/google-calendar' });
    }

    handleCallback();
  }, []);

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Connecting your Google Calendar...</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <AlertCircle className="size-12 text-destructive" />
        <h3 className="text-base font-semibold text-foreground">Connection Failed</h3>
        <p className="max-w-sm text-center text-sm text-muted-foreground">{errorMsg}</p>
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/settings/integrations/google-calendar' })}
        >
          Back to Google Calendar
        </Button>
      </div>
    );
  }

  // Success state — will be navigated away immediately
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Connected! Redirecting...</p>
    </div>
  );
}
