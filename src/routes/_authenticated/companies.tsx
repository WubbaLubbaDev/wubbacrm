import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export const Route = createFileRoute('/_authenticated/companies')({
  component: CompaniesPage,
});

function CompaniesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Companies</h2>
        <p className="text-sm text-muted-foreground">Manage your company accounts.</p>
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
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4v18" />
              <path d="M19 21V11l-6-4" />
            </svg>
          }
          title="No companies yet"
          description="Companies will appear here once you start adding them."
          action={<Button>Add Company</Button>}
        />
      </Card>
    </div>
  );
}
