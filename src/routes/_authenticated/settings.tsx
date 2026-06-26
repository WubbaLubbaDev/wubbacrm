import { createFileRoute, Outlet } from '@tanstack/react-router';
import { SettingsLayout } from '@/components/layout/settings-layout';

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsLayoutRoute,
});

function SettingsLayoutRoute() {
  return (
    <SettingsLayout>
      <Outlet />
    </SettingsLayout>
  );
}
