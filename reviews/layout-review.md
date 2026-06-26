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

## Update: Google Calendar Integration Review (2026-06-26)

Branch: `feat/google-calendar-integration` (commit 1a52931)

### Settings Sub-Sidebar — PASS

- `src/components/layout/settings-layout.tsx`: Wraps settings pages with `SettingsSidebar` (w-56) + content area (`flex-1 min-w-0`). The sub-sidebar is INSIDE the main content area, not the app sidebar. Matches the research brief's layout diagram exactly.
- `src/components/layout/settings-sidebar.tsx`: Sub-navigation with 2 items — General (`/settings`) and Integrations (`/settings/integrations`). Uses `w-56` (narrower than app sidebar's `w-64`) and no logo/brand/user section. Pure navigation list. Correct.
- Active state: General uses exact match (`pathname === '/settings'`), Integrations uses `startsWith` prefix match (lines 42-45). Same pattern as the app sidebar. Correct.
- Styling: `sticky top-0`, active items get `bg-primary text-primary-foreground`, inactive get `text-muted-foreground hover:bg-accent`. Consistent with app sidebar patterns.

### Route Structure — PASS

- `src/routes/_authenticated/settings.tsx`: Layout route wrapping children in `SettingsLayout` with `<Outlet />`. Correct.
- `src/routes/_authenticated/settings/index.tsx`: General settings page with EmptyState placeholder.
- `src/routes/_authenticated/settings/integrations.tsx`: Integrations layout route (renders `<Outlet />`).
- `src/routes/_authenticated/settings/integrations/index.tsx`: Integrations list page with `IntegrationCard` for Google Calendar. Checks connection status via Supabase query.
- `src/routes/_authenticated/settings/integrations/google-calendar.tsx`: Main Google Calendar page with 4 states (loading, disconnected, connected, error). Matches brief's state machine.
- `src/routes/_authenticated/settings/integrations/google-calendar/callback.tsx`: OAuth callback handler with zod `validateSearch` for `code` and `state` params. Correct.

### TopBar Page Titles — PASS

- `src/components/layout/topbar.tsx`: Added 3 new page titles to the `pageTitles` map: `/settings/integrations` → "Integrations", `/settings/integrations/google-calendar` → "Google Calendar", `/settings/integrations/google-calendar/callback` → "Google Calendar". Correct.

### Google Calendar Page States — PASS

- `src/routes/_authenticated/settings/integrations/google-calendar.tsx`:
  - `loading` — spinner with "Checking connection status..." (lines 97-103). Correct.
  - `disconnected` — Card with "Not Connected" status, ConnectButton (lines 121-151). Correct.
  - `connected` — Card with "Connected" status, CalendarSelector, DisconnectButton (lines 154-208). Correct.
  - `error` — AlertCircle icon, error message, "Try Again" button (lines 106-118). Correct.
  - State transitions: loading → connected (if tokens found) or disconnected (if no tokens). Error state is reachable from the error button. Matches the brief.

### Calendar Selection — PASS

- After connecting, the page calls `listCalendars()` which fetches the user's Google Calendar list via the Google Calendar API (with token refresh if needed).
- `CalendarSelector` renders the list. User selects a calendar → `saveSelectedCalendar()` updates the `calendar_id` column in `google_oauth_tokens`. Correct.
- Selected calendar is persisted and restored on page reload (line 41: `setSelectedCalendar(stored.calendar_id)`).

### Integrations List Page — PASS

- `src/routes/_authenticated/settings/integrations/index.tsx`: Checks Google Calendar connection status on mount via Supabase query (`select('id').eq('user_id', ...).maybeSingle()`). Uses `maybeSingle()` (not `single()`) — correct for a query that might return 0 rows. Shows IntegrationCard with the right status.
- Loading state: defaults to 'disconnected' while loading, then updates. Minor: could show a loading skeleton instead, but not a blocker.

### Verdict: APPROVED

## Update: Customer Chat with AI Companion Review (2026-06-26)

Branch: `feat/customer-chat-ai-companion` (commit acdd754)

### Public Chat Route — PASS

- `src/routes/chat.tsx`: Public standalone chat page at `/chat`. No auth guard — outside `_authenticated` layout. Renders `ChatWindow` with `standalone` prop (hides close button). Centered in `max-w-2xl` container, full height (`h-screen`). Correct per brief's route placement spec.
- `src/routes/__root.tsx`: ChatWidget (floating button) shown only on `/login` page (`location.pathname === '/login'`). Not on authenticated routes or `/chat` standalone page. Correct — matches brief's "floating chat button on public-facing page" requirement.

### ChatWidget Overlay Layout — PASS

- Full-screen on mobile: `fixed inset-0 z-50` with backdrop `bg-black/50 sm:bg-transparent`.
- Floating panel on desktop: `sm:bottom-20 sm:right-4 sm:inset-auto sm:h-[600px] sm:w-[400px] sm:rounded-xl sm:border sm:shadow-xl`.
- Z-index: `z-50` for both backdrop and panel. Above sidebar/header (which have no explicit z-index above 50).
- Correct per brief's mobile responsive spec: `fixed inset-0` on mobile, `sm:w-[400px] sm:h-[600px]` on desktop.

### ChatWindow Layout — PASS

- Flex column: header (`border-b px-4 py-3`) + message list (`flex-1 overflow-y-auto px-4 py-4 space-y-4`) + input (`border-t p-4`). Full height (`h-full`). Correct.
- Auto-scroll: `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })` on messages change. Correct.
- Message bubbles: `max-w-[80%]` to keep readable on narrow screens. Matches brief's mobile spec.

### TopBar Page Titles — PASS

- No new page titles needed for `/chat` (standalone page has no TopBar — it's outside the dashboard layout).

### Verdict: APPROVED