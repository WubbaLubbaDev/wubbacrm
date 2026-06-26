import { Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DisconnectButtonProps {
  onClick: () => void;
  loading?: boolean;
}

export function DisconnectButton({ onClick, loading }: DisconnectButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      loading={loading}
      className="gap-2 text-destructive"
    >
      <Unplug className="size-4" />
      Disconnect
    </Button>
  );
}
