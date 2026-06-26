import { Link } from '@tanstack/react-router';
import type { ComponentType } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/cn';

export interface IntegrationCardProps {
  icon: ComponentType<{ className?: string }>;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  href: string;
}

const statusBadge: Record<
  IntegrationCardProps['status'],
  { label: string; variant: 'default' | 'outline' }
> = {
  connected: { label: 'Connected', variant: 'default' },
  disconnected: { label: 'Not connected', variant: 'outline' },
  error: { label: 'Error', variant: 'default' },
};

export function IntegrationCard({
  icon: Icon,
  name,
  description,
  status,
  href,
}: IntegrationCardProps) {
  const badge = statusBadge[status];

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5 text-foreground" />
        </div>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold leading-none tracking-tight text-foreground">
            {name}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge
          variant={badge.variant}
          className={cn(
            'ml-auto',
            status === 'error' && 'bg-destructive text-destructive-foreground',
          )}
        >
          {badge.label}
        </Badge>
      </CardHeader>
      <CardContent />
      <CardFooter>
        <Link
          to={href}
          className={cn(
            'inline-flex h-8 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent',
          )}
        >
          {status === 'connected' ? 'Manage' : 'Connect'}
        </Link>
      </CardFooter>
    </Card>
  );
}
