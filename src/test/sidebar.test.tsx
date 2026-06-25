import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Sidebar } from '@/components/layout/sidebar';

// Helper: wrap Sidebar in a minimal TanStack Router so Link/useLocation work
function renderWithRouter(initialPath = '/') {
  const rootRoute = createRootRoute({
    component: () => <Sidebar />,
  });

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Home</div>,
  });

  const contactsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/contacts',
    component: () => <div>Contacts</div>,
  });

  const routeTree = rootRoute.addChildren([indexRoute, contactsRoute]);

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  return render(<RouterProvider router={router} />);
}

describe('Sidebar', () => {
  it('renders all nav items', async () => {
    renderWithRouter('/');
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeDefined();
    });
    expect(screen.getByText('Contacts')).toBeDefined();
    expect(screen.getByText('Companies')).toBeDefined();
    expect(screen.getByText('Deals')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('renders the logo', async () => {
    renderWithRouter('/');
    await waitFor(() => {
      expect(screen.getByText('WubbaCRM')).toBeDefined();
    });
  });

  it('highlights the active link', async () => {
    renderWithRouter('/');
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeDefined();
    });
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink?.className).toContain('bg-primary');
  });

  it('highlights contacts link when on /contacts', async () => {
    renderWithRouter('/contacts');
    await waitFor(() => {
      expect(screen.getByText('Contacts')).toBeDefined();
    });
    const contactsLink = screen.getByText('Contacts').closest('a');
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(contactsLink?.className).toContain('bg-primary');
    expect(dashboardLink?.className).not.toContain('bg-primary');
  });
});
