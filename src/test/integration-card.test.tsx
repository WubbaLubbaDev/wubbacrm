import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { Calendar } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { IntegrationCard } from '@/components/integrations/integration-card';

function renderWithRouter(node: React.ReactNode) {
  const rootRoute = createRootRoute({
    component: () => <div id="test-wrapper">{node}</div>,
  });

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Home</div>,
  });

  const routeTree = rootRoute.addChildren([indexRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(<RouterProvider router={router} />);
}

describe('IntegrationCard', () => {
  it('renders the integration name and description', async () => {
    renderWithRouter(
      <IntegrationCard
        icon={Calendar}
        name="Google Calendar"
        description="Sync calendar events"
        status="disconnected"
        href="/"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Google Calendar')).toBeDefined();
    });
    expect(screen.getByText('Sync calendar events')).toBeDefined();
  });

  it('shows "Not connected" badge when disconnected', async () => {
    renderWithRouter(
      <IntegrationCard
        icon={Calendar}
        name="Google Calendar"
        description="Sync calendar events"
        status="disconnected"
        href="/"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Not connected')).toBeDefined();
    });
  });

  it('shows "Connected" badge when connected', async () => {
    renderWithRouter(
      <IntegrationCard
        icon={Calendar}
        name="Google Calendar"
        description="Sync calendar events"
        status="connected"
        href="/"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeDefined();
    });
  });

  it('shows "Connect" link when disconnected', async () => {
    renderWithRouter(
      <IntegrationCard
        icon={Calendar}
        name="Google Calendar"
        description="Sync calendar events"
        status="disconnected"
        href="/"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Connect')).toBeDefined();
    });
  });

  it('shows "Manage" link when connected', async () => {
    renderWithRouter(
      <IntegrationCard
        icon={Calendar}
        name="Google Calendar"
        description="Sync calendar events"
        status="connected"
        href="/"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Manage')).toBeDefined();
    });
  });
});
