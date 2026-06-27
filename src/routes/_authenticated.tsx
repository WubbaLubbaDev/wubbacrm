import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { waitForSession } from '@/lib/supabase';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await waitForSession();
    if (!session) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
