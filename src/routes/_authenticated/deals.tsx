import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export const Route = createFileRoute('/_authenticated/deals')({
  component: DealsPage,
});

function DealsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Deals</h2>
        <p className="text-sm text-muted-foreground">Track your sales pipeline.</p>
      </div>
      <Card>
        <EmptyState
          icon={
            <svg
              className="size-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          title="No deals yet"
          description="Your sales pipeline will appear here once you create deals."
          action={<Button>Create Deal</Button>}
        />
      </Card>
    </div>
  );
}
