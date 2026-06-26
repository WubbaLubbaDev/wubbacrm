import { createFileRoute } from '@tanstack/react-router';
import { AlertCircle, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CalendarSelector } from '@/components/integrations/calendar-selector';
import { ConnectButton } from '@/components/integrations/connect-button';
import { DisconnectButton } from '@/components/integrations/disconnect-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import {
  type GoogleCalendar,
  type GoogleOAuthTokenRow,
  getStoredTokens,
  listCalendars,
  saveSelectedCalendar,
} from '@/lib/google-calendar';
import { disconnectGoogleCalendar } from '@/lib/google-oauth';
import { supabase } from '@/lib/supabase';

export const Route = createFileRoute('/_authenticated/settings/integrations/google-calendar')({
  component: GoogleCalendarPage,
});

type PageState = 'loading' | 'disconnected' | 'connected' | 'error';

function GoogleCalendarPage() {
  const [state, setState] = useState<PageState>('loading');
  const [tokens, setTokens] = useState<GoogleOAuthTokenRow | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
  const [calendarsLoading, setCalendarsLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkConnection() {
      const stored = await getStoredTokens();
      if (stored) {
        setTokens(stored);
        setSelectedCalendar(stored.calendar_id);
        setState('connected');
      } else {
        setState('disconnected');
      }
    }
    checkConnection();
  }, []);

  // Fetch calendar list when connected
  useEffect(() => {
    if (state !== 'connected') return;
    setCalendarsLoading(true);
    listCalendars()
      .then((cals) => {
        if (cals) {
          setCalendars(cals);
        }
        setCalendarsLoading(false);
      })
      .catch(() => {
        setCalendarsLoading(false);
      });
  }, [state]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setDisconnecting(false);
      return;
    }

    const result = await disconnectGoogleCalendar(session.access_token);
    if (result.error) {
      setError(result.error);
      setDisconnecting(false);
    } else {
      setTokens(null);
      setCalendars([]);
      setSelectedCalendar(null);
      setState('disconnected');
      setDisconnecting(false);
    }
  };

  const handleCalendarChange = async (calendarId: string) => {
    setSelectedCalendar(calendarId);
    setSavingCalendar(true);
    await saveSelectedCalendar(calendarId);
    setSavingCalendar(false);
  };

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Checking connection status...</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <AlertCircle className="size-12 text-destructive" />
        <h3 className="text-base font-semibold text-foreground">Connection Error</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          {error ?? 'Something went wrong. Please try again.'}
        </p>
        <Button variant="outline" onClick={() => setState('disconnected')}>
          Try Again
        </Button>
      </div>
    );
  }

  if (state === 'disconnected') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Google Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Connect your Google account to sync calendar events and schedule meetings with contacts.
          </p>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Calendar className="size-5 text-foreground" />
              </div>
              <div className="flex flex-col gap-0.5">
                <h3 className="text-base font-semibold leading-none tracking-tight text-foreground">
                  Not Connected
                </h3>
                <p className="text-sm text-muted-foreground">
                  Click the button below to connect your Google Calendar account.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ConnectButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connected state
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Google Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Your Google Calendar is connected. Select which calendar to sync with.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <CheckCircle2 className="size-5 text-foreground" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h3 className="text-base font-semibold leading-none tracking-tight text-foreground">
                Connected
              </h3>
              <p className="text-sm text-muted-foreground">
                {tokens?.scope ?? 'Calendar read/write access granted'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="calendar-select" className="text-sm font-medium text-foreground">
              Sync Calendar
            </label>
            {calendarsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading calendars...
              </div>
            ) : (
              <CalendarSelector
                id="calendar-select"
                calendars={calendars}
                selectedId={selectedCalendar}
                onChange={handleCalendarChange}
                disabled={savingCalendar}
              />
            )}
            {savingCalendar && <p className={cn('text-xs text-muted-foreground')}>Saving...</p>}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DisconnectButton onClick={handleDisconnect} loading={disconnecting} />
        </CardContent>
      </Card>
    </div>
  );
}
