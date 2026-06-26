import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { initiateOAuthFlow } from '@/lib/google-oauth';

export function ConnectButton() {
  return (
    <Button onClick={initiateOAuthFlow} className="gap-2">
      <CalendarPlus className="size-4" />
      Connect Google Calendar
    </Button>
  );
}
