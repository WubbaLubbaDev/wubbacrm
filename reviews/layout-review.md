# Layout Review

Review of WubbaCRM dashboard layout: Sidebar, TopBar, DashboardLayout, dashboard page, placeholder routes, overflow handling.

**Verdict: APPROVED**

## Build / Lint / Test Results

- `npm run build` — PASS (187 modules, 4.07s)
- `npm run lint` (biome check) — PASS (38 files, no fixes applied)
- `npm run test` (vitest run) — PASS (16/16 tests across 4 files)

## Files Reviewed

- `src/components/layout/sidebar.tsx` — Sidebar with nav + collapse
- `src/components/layout/topbar.tsx` — Header with search + user menu
- `src/components/layout/dashboard-layout.tsx` — Layout composition
- `src/routes/_authenticated.tsx` — Layout route wrapper
- `src/routes/_authenticated/index.tsx` — Dashboard page
- `src/routes/_authenticated/contacts.tsx` — Placeholder route
- `src/routes/_authenticated/companies.tsx` — Placeholder route
- `src/routes/_authenticated/deals.tsx` — Placeholder route
- `src/routes/_authenticated/settings.tsx` — Placeholder route
- `src/index.css` — Theme tokens

## Findings

### 1. Sidebar (`src/components/layout/sidebar.tsx`) — PASS

- Collapsible: `w-64` expanded ↔ `w-16` collapsed, toggled via `useState` (lines 74, 79-82). Smooth transition with `transition-all duration-200`.
- 5 nav items: Dashboard (/), Contacts (/contacts), Companies (/companies), Deals (/deals), Settings (/settings) — all present with inline SVG icons (lines 11-71).
- Active state: Dashboard uses exact match (`pathname === '/'`), others use `startsWith` prefix match (lines 97-98). Active item gets `bg-primary text-primary-foreground` (line 107). Correct logic — prevents Dashboard from always being active.
- Logo area: "W" badge in primary-colored square + "WubbaCRM" text (hidden when collapsed) (lines 85-92). Matches spec.
- Collapsed mode: nav labels hidden, `title` attribute shows tooltip on hover (line 110). Good UX.
- Text overflow: nav labels use `truncate` class (line 113). No overflow.

Tests (4 tests): renders all nav items, renders logo, highlights active link (Dashboard on /), highlights Contacts on /contacts and not Dashboard. All pass and are meaningful.

### 2. TopBar / Header (`src/components/layout/topbar.tsx`) — PASS

- Page title on left (dynamic via `pageTitles` map, lines 8-14, 44, 49).
- Full-width search bar: `flex-1` container with search icon (`absolute left-3`) + `Input` with `pl-9` padding for icon clearance (lines 52-59). Placeholder: "Search contacts, companies, deals..." (line 56).
- Search icon is inline SVG with `aria-hidden="true"` (line 112). Good.
- User avatar on right with dropdown menu (lines 62-97).
- Header classes: `flex h-16 items-center gap-4 border-b border-border bg-background px-6` (line 48). Research spec says `h-14`; implementation uses `h-16`. Minor deviation — 4rem vs 3.5rem. Not a blocker; the extra height provides more breathing room and is visually consistent with the sidebar logo area (also h-16).

### 3. User Menu Dropdown (`src/components/layout/topbar.tsx`) — PASS

- Z-index: `z-[60]` (line 76). This is above the navbar (which has no explicit z-index, defaulting to auto/0). No overlap issues.
- Gap: `mt-2` = 0.5rem = 8px (line 76). Meets the "at least 8px gap" requirement.
- Positioned: `absolute right-0 top-full` (line 76). Correctly positioned below the avatar button.
- Click-outside-to-close: `useEffect` with `mousedown` listener on `document`, checks `menuRef.current.contains` (lines 29-37). Proper cleanup in return.
- Menu shows user email (truncated with `title` tooltip for full address) + Logout button (lines 80-94).
- Accessibility: `aria-label="User menu"`, `aria-expanded={menuOpen}` on trigger button (lines 67-68). `role="menu"` on dropdown, `role="menuitem"` on logout button (lines 78, 91).
- User email fetched via `supabase.auth.getUser()` on mount (lines 23-27). Initials derived from email for avatar fallback (line 45).

### 4. DashboardLayout (`src/components/layout/dashboard-layout.tsx`) — PASS

- Composition: `flex h-screen overflow-hidden` → Sidebar + `flex flex-1 flex-col overflow-hidden` → TopBar + `main flex-1 overflow-y-auto bg-muted/30 p-6` (lines 7-11).
- Nested under `_authenticated.tsx` which wraps `<Outlet />` in DashboardLayout (lines 17-22 of _authenticated.tsx).
- Login page is outside this layout (separate `/login` route). Correct — no dashboard chrome on login.
- `overflow-hidden` on outer container + `overflow-y-auto` on main = scroll only in content area, sidebar/header stay fixed. Correct.

### 5. Dashboard Page (`src/routes/_authenticated/index.tsx`) — PASS

- 3 stat cards: Total Contacts (1,247), Active Deals (38), Revenue ($284,500) — placeholder data with change indicators (lines 10-14).
- Grid layout: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` (line 50). Responsive.
- Stat cards use `truncate` on both label and value (lines 54, 59). No overflow.
- Recent activity section: Card with 4 activity items, Separators between items, Badge ("New") on each title, timestamp on right (lines 16-37, 67-90).
- Activity items use `min-w-0 flex-1` + `truncate` on title (lines 76, 78). No overflow.
- Timestamps use `shrink-0` to prevent compression (line 85). Good.

### 6. Placeholder Routes — PASS

- `/contacts` (`contacts.tsx`): Renders EmptyState with contacts icon, "No contacts yet" title, description, "Add Contact" button.
- `/companies` (`companies.tsx`): Renders EmptyState with companies icon, "No companies yet" title, description, "Add Company" button.
- `/deals` (`deals.tsx`): Renders EmptyState with deals icon, "No deals yet" title, description, "Create Deal" button.
- `/settings` (`settings.tsx`): Renders EmptyState with settings icon, "Settings coming soon" title, description. No action button — appropriate for "coming soon" state.
- All use the `EmptyState` component wrapped in a `Card`. Consistent pattern across all four routes.

### 7. Text Overflow — PASS

- Stat card labels: `truncate text-sm font-medium text-muted-foreground` (line 54 of index.tsx).
- Stat card values: `truncate text-3xl font-bold` (line 59).
- Stat card change text: `truncate text-xs` (line 60).
- Sidebar nav items: `truncate` on label span (line 113 of sidebar.tsx).
- Recent activity titles: `truncate` on title (line 78 of index.tsx).
- User email in dropdown: `truncate` with `title` tooltip (line 81 of topbar.tsx).
- No overflow issues found in any layout component.

### 8. Color System Compliance — PASS

- Theme tokens defined in `src/index.css` using `@theme` block (lines 3-43).
- Black-and-white palette: background=#FFFFFF, foreground=#0a0a0a, primary=#0a0a0a, etc. Matches `color-system.md` spec (hex values are close approximations of the OKLCH values in the spec).
- Destructive uses red (#dc2626) — matches spec's UX convention exception.
- All components reference semantic tokens (bg-primary, text-muted-foreground, border-border, etc.) — no hardcoded colors in components.
- Minor note: Sidebar uses `bg-background` (white) instead of the spec's `bg-sidebar` token (#FAFAFA off-white). The sidebar-specific tokens from color-system.md are not defined in the theme. This is a very minor visual deviation — the sidebar is pure white instead of slightly off-white. Not a blocker.
- Minor note: No dark mode implementation (`.dark` class and dark token values from spec are not in index.css). The spec includes dark mode tokens, but the task does not require dark mode. Acceptable for current scope.

### 9. Layout vs Research Spec — PASS

- DashboardLayout structure matches `layout-patterns.md`: Sidebar + main area (flex-1 flex-col) + header + content (flex-1 overflow-auto p-6).
- Sidebar has logo, nav items, collapse toggle. Research spec mentions "User section at bottom (avatar + name + logout)" in sidebar — the implementation puts the user menu in the TopBar instead. This is a reasonable design choice — many modern apps put the user menu in the top bar. Not a blocker.
- Header has page title, search, user menu — matches spec's "Page title or breadcrumb (left), Search input (center), User menu / avatar dropdown (right)."

## Summary

The dashboard layout is well-structured, responsive, and handles overflow correctly. Sidebar is collapsible with all 5 nav items and proper active state logic. TopBar has full-width search and a properly positioned user dropdown with z-index and gap requirements met. All placeholder routes render EmptyState consistently. Minor notes on sidebar background color token and header height are non-blocking visual deviations.