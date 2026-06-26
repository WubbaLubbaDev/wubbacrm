# Layout Patterns

Sidebar, header/topbar, DashboardLayout composition, and login page styling.

## Dashboard Layout Structure

```
DashboardLayout
├── Sidebar (fixed w-64 left column)
├── Main area (flex-1 flex-col)
│   ├── Header (h-14 top bar)
│   └── Main content (flex-1 overflow-auto p-6)
│       └── <Outlet /> (page content)
```

```tsx
function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-svh w-full">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}  // or <Outlet /> if used as route component
        </main>
      </div>
    </div>
  );
}
```

The dashboard chrome (sidebar + header) lives in the `_authenticated.tsx` layout component. Every authenticated page inherits it automatically. The login page (`/login`) is outside this group, so it gets no dashboard chrome. See `../setup/tanstack-router.md` for route wiring and `../setup/auth-patterns.md` for the auth guard.

## Sidebar (`src/components/layout/sidebar.tsx`)

Fixed-width left column (16rem / `w-64`). Contains:
1. Logo/brand at top
2. Navigation menu items (using `lucide-react` icons)
3. User section at bottom (avatar + name + logout)

Key classes:
- Sidebar wrapper: `flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground`
- Menu item button: `flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0`
- Active item: add `data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground`
- Menu group label: `flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70`

Active state via TanStack Router's `Link` + `useMatch()`:
```tsx
import { Link, useMatch } from '@tanstack/react-router';

function NavItem({ to, icon: Icon, label }) {
  const isActive = useMatch({ to });
  return (
    <Link to={to} data-active={isActive}
      className="flex w-full items-center gap-2 ...">
      <Icon className="size-4" />
      <span>{label}</span>
    </Link>
  );
}
```

## Header (`src/components/layout/header.tsx`)

Top bar with:
- Sidebar toggle button (optional)
- Page title or breadcrumb (left)
- Search input (center, optional)
- User menu / avatar dropdown (right)

Classes: `flex h-14 items-center gap-4 border-b bg-background px-6`

## Login Page Styling

- Page background: `bg-background`
- Form container: `w-full max-w-sm rounded-xl border bg-card p-8 text-card-foreground shadow-sm`
- Title: `text-2xl font-semibold tracking-tight`
- Inputs: use the `Input` component
- Button: use the `Button` component with `default` variant (black background)
- Error: `text-sm text-destructive`

See `../setup/auth-patterns.md` for the login form logic (signInWithPassword, navigate on success).

## Cross-References

- Auth guard and route wiring: see `../setup/auth-patterns.md`
- Router layout route conventions: see `../setup/tanstack-router.md`
- Color tokens (bg-sidebar, bg-background, etc.): see `color-system.md`
- Spacing tokens (w-64, h-14, p-6): see `spacing-layout.md`
- Component primitives (Button, Input, Avatar): see `component-patterns.md`

## Sources

- shadcn/ui sidebar source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/sidebar.tsx
- shadcn/ui theming docs: https://ui.shadcn.com/docs/theming