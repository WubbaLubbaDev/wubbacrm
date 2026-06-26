import { createFileRoute } from '@tanstack/react-router';
import { Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { IntegrationCard } from '@/components/integrations/integration-card';
import { supabase } from '@/lib/supabase';

export const Route = createFileRoute('/_authenticated/settings/integrations/')({
  component: IntegrationsPage,
});

type ConnectionStatus = 'connected' | 'disconnected' | 'error';

function IntegrationsPage() {
  const [googleStatus, setGoogleStatus] = useState<ConnectionStatus>('disconnected');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('google_oauth_tokens')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      setGoogleStatus(data ? 'connected' : 'disconnected');
      setLoading(false);
    }
    checkStatus();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect WubbaCRM with your favorite tools and services.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <IntegrationCard
          icon={Calendar}
          name="Google Calendar"
          description="Sync calendar events and schedule meetings with contacts."
          status={loading ? 'disconnected' : googleStatus}
          href="/settings/integrations/google-calendar"
        />
      </div>
    </div>
  );
}
