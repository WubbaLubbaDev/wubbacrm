import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export const Route = createFileRoute('/_authenticated/contacts')({
  component: ContactsPage,
});

function ContactsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Contacts</h2>
        <p className="text-sm text-muted-foreground">Manage your contact list.</p>
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          }
          title="No contacts yet"
          description="Contacts will appear here once you start adding them. Get started by creating your first contact."
          action={<Button>Add Contact</Button>}
        />
      </Card>
    </div>
  );
}
