# WubbaCRM Phase 1 — Dashboard UI Components & Black-White Brand Style

**Research task:** `t_08ec3252`
**Date:** 2026-06-25
**Researcher profile:** researcher

---

## 1. Objective

Define the complete UI architecture for WubbaCRM's dashboard CRM layout: a black-and-white, clean aesthetic inspired by shadcn/ui's "Neutral" theme, implemented with Tailwind CSS v4 only — no shadcn library, no Radix UI primitives, no class-variance-authority dependency. The Coder will use this brief to build the component library and dashboard layout.

---

## 2. Findings

### 2.1 shadcn/ui Aesthetic Analysis — What Makes It Look Clean

shadcn/ui's visual identity comes from six design principles, all verified from the official source code (`apps/v4/registry/new-york-v4/` on GitHub):

1. **Semantic CSS variable token system.** Colors are never hardcoded. Every component references semantic tokens like `bg-primary`, `text-muted-foreground`, `border-border`. The actual color values live in `:root` and `.dark` CSS blocks. This means changing the theme = changing one CSS block, not touching components.

2. **Neutral grayscale palette (zero saturation).** The "Neutral" base color uses `oklch()` with chroma `0` — pure grayscale. This is the black-and-white aesthetic we want. The specific OKLCH values (light mode):
   - `--background: oklch(1 0 0)` → pure white (#FFFFFF)
   - `--foreground: oklch(0% 0 0)` → pure black (#000000)
   - `--primary: oklch(0% 0 0)` → pure black (buttons are black)
   - `--primary-foreground: oklch(0.985 0 0)` → near-white (#FAFAFA)
   - `--secondary: oklch(0.97 0 0)` → very light gray (#F4F4F5)
   - `--muted: oklch(0.97 0 0)` → same light gray
   - `--muted-foreground: oklch(0.556 0 0)` → medium gray (#71717A)
   - `--accent: oklch(0.97 0 0)` → light gray for hover states
   - `--border: oklch(0.922 0 0)` → light gray border (#E4E4E7)
   - `--ring: oklch(0.708 0 0)` → medium gray focus ring

3. **Border radius scale.** A single `--radius: 0.625rem` (10px) base token derives the entire scale:
   - `--radius-sm: calc(var(--radius) * 0.6)` → 6px
   - `--radius-md: calc(var(--radius) * 0.8)` → 8px
   - `--radius-lg: var(--radius)` → 10px (base)
   - `--radius-xl: calc(var(--radius) * 1.4)` → 14px
   - Cards use `rounded-xl` (14px), buttons/inputs use `rounded-md` (8px), badges use `rounded-full`.

4. **Minimal shadows.** Cards use `shadow-sm`, buttons use `shadow-xs` on outline variant only. The look is flat with subtle depth — no heavy drop shadows.

5. **Typography hierarchy.** shadcn uses Inter as both heading and body font. Hierarchy is achieved through font-weight (`font-medium`, `font-semibold`) and size (`text-sm` for body, `text-xs` for secondary, `text-base` for inputs), not through dramatic size jumps. Card titles use `font-semibold leading-none`. Descriptions use `text-sm text-muted-foreground`.

6. **Consistent spacing via fixed pixel values.** Components use Tailwind's spacing scale: `px-6` for card padding, `h-9` (36px) for default button/input height, `h-8` for small, `h-10` for large, `gap-2` for icon spacing.

**Sources:**
- shadcn/ui theming docs: https://ui.shadcn.com/docs/theming
- shadcn/ui v4 globals.css (neutral theme): https://github.com/shadcn-ui/ui/blob/main/apps/v4/app/globals.css
- shadcn/ui new-york-v4 component source: https://github.com/shadcn-ui/ui/tree/main/apps/v4/registry/new-york-v4/ui
- shadcn/ui color reference: https://colors.id/shadcn-colors

### 2.2 Tailwind CSS v4 Theming Model

WubbaCRM already uses Tailwind v4 (`@import "tailwindcss"` in `src/index.css`). Key v4 differences from v3:

- **No `tailwind.config.js` needed.** Theme is defined in CSS via `@theme inline { ... }` block.
- **CSS variables become utilities automatically.** Defining `--color-primary` in `@theme inline` generates `bg-primary`, `text-primary`, `border-primary`, `ring-primary`, etc.
- **`@custom-variant dark`** replaces the old `darkMode: 'class'` config. Use `@custom-variant dark (&:is(.dark *));` to enable class-based dark mode.
- **OKLCH color space** is the modern default — wider gamut, better perceptual uniformity.

This means the Coder can define all design tokens as CSS variables in `src/index.css`, map them through `@theme inline`, and every Tailwind utility class will work with semantic names like `bg-card`, `text-muted-foreground`, `border-border`.

### 2.3 Current Project State

The project already has:
- `src/index.css` — currently just `@import "tailwindcss"` (needs the full theme token system)
- `src/routes/__root.tsx` — root route with auth state listener, renders `<Outlet />`
- `src/routes/_authenticated.tsx` — auth guard layout, renders `<Outlet />` (currently no visual layout)
- `src/routes/_authenticated/index.tsx` — home page (currently a "Hello World" stub)
- `src/routes/login.tsx` — login page with inline Tailwind classes (blue accent, needs restyling)
- `src/lib/supabase.ts` — Supabase client
- No `src/components/` directory yet
- No `cn()` utility yet (shadcn's className merge function)

Dependencies in `package.json`: React 19, TanStack Router 1.127, Tailwind 4.1, Biome 2.0, Vitest 3.2. **No `class-variance-authority`, no `clsx`, no `tailwind-merge`, no `lucide-react`** — these need to be added by the Coder.

### 2.4 TanStack Router Layout Pattern

TanStack Router uses file-based routing with nested layouts via pathless routes (prefixed with `_`). The current structure already has the right pattern:

```
src/routes/
  __root.tsx              → RootRoute (auth listener, global providers)
  _authenticated.tsx      → Auth layout (guard + dashboard chrome: sidebar + header)
  _authenticated/
    index.tsx             → Dashboard home (/)
    contacts.tsx          → Contacts page (/contacts)
    contacts/$id.tsx      → Contact detail (/contacts/:id)
```

**Recommendation: dashboard layout lives in `_authenticated.tsx`.** This route already guards auth via `beforeLoad`. Its component should render the `<Sidebar>` + `<Header>` + `<Outlet>` layout shell. Every authenticated page inherits the dashboard chrome automatically. No per-page layout boilerplate needed.

The login page (`/login`) is outside the `_authenticated` group, so it gets no dashboard chrome — correct.

---

## 3. Recommendation

### 3.1 Approach: Hand-built components with shadcn's class recipes

Build all UI primitives from scratch using plain React + Tailwind classes, copying the exact class recipes from shadcn's new-york-v4 source. This gives us:
- The shadcn look (same classes = same visual result)
- Zero dependency on Radix UI or shadcn CLI
- Full control to modify any component
- Smaller bundle size

**Do NOT install:** `shadcn` CLI, `radix-ui`, `@radix-ui/*`, `class-variance-authority`.
**DO install:** `clsx` + `tailwind-merge` (for the `cn()` utility), `lucide-react` (for icons).

For variant management (button variants, badge variants), use a simple inline pattern instead of `cva`:

```tsx
const variants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border bg-background shadow-xs hover:bg-accent ...",
  ...
} as const;
```

This is readable, type-safe with `as const`, and avoids a dependency.

### 3.2 Color Token System for Black-and-White

The shadcn Neutral theme IS already black-and-white. We adopt it directly. Here are the exact tokens the Coder should put in `src/index.css`:

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, monospace;

  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.439 0 0);
}

@layer base {
  * {
    border-color: var(--border);
  }
  body {
    background-color: var(--background);
    color: var(--foreground);
    font-family: var(--font-sans);
  }
}
```

**Note on destructive:** Even though we're black-and-white, `destructive` uses a red OKLCH (`oklch(0.577 0.245 27.325)`) — this is the one color exception, used only for delete/error states. If the user wants strict B&W, replace with `oklch(0.205 0 0)` (dark gray). I recommend keeping the red for destructive — it's a UX convention, not a brand color.

### 3.3 Typography Recommendation

**Inter** (Google Fonts). This is what shadcn/ui uses for both heading and body. It's a neo-grotesque sans-serif designed for screen readability, with excellent x-height and a neutral character that suits the B&W aesthetic.

Load via Google Fonts in `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

Alternatively, use the `@fontsource/inter` npm package for self-hosting (avoids external request, better for privacy/CDN reliability). The `--font-sans` token in the CSS above already maps to Inter with a system-ui fallback.

---

## 4. Implementation Notes for the Coder

### 4.1 Dependencies to Install

```bash
npm install clsx tailwind-merge lucide-react
```

- `clsx` — conditional class names
- `tailwind-merge` — merges Tailwind classes intelligently (prevents `px-2 px-4` conflicts)
- `lucide-react` — icon set (shadcn uses this; tree-shakeable)

### 4.2 Utility: `cn()`

Create `src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 4.3 File Structure

```
src/
  lib/
    supabase.ts          (existing)
    utils.ts             (NEW — cn() utility)
  components/
    ui/                  (NEW — primitive components, one file per component)
      button.tsx
      card.tsx
      input.tsx
      label.tsx
      badge.tsx
      avatar.tsx
      separator.tsx
      skeleton.tsx
      table.tsx
      scroll-area.tsx    (simple CSS overflow version, no Radix)
      breadcrumb.tsx
      toast.tsx          (or use a lightweight toast lib — see 4.6)
    layout/              (NEW — dashboard chrome)
      sidebar.tsx
      header.tsx
      dashboard-layout.tsx
    dashboard/           (NEW — composed dashboard widgets)
      stat-card.tsx
      contact-table.tsx
      empty-state.tsx
  routes/
    __root.tsx           (existing — add font + global classes)
    _authenticated.tsx   (existing — replace component with dashboard layout)
    _authenticated/
      index.tsx          (existing — replace stub with dashboard content)
    login.tsx            (existing — restyle with new tokens)
  index.css              (existing — add full theme token system from §3.2)
```

**Naming conventions:**
- Files: `kebab-case.tsx` (e.g., `scroll-area.tsx`)
- Components: `PascalCase` (e.g., `ScrollArea`)
- Exports: named exports, no default exports (matches shadcn convention, better for tree-shaking)
- Index barrel: `src/components/ui/index.ts` re-exporting all primitives (optional but convenient)

### 4.4 Component Recipes (Tailwind Classes)

These are the exact Tailwind classes from shadcn's new-york-v4 source, adapted for hand-built components (removing Radix imports, using simple native elements). The Coder should use these verbatim.

#### Button (`src/components/ui/button.tsx`)

Base classes (all variants):
```
inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4
```

Variants:
| variant | classes |
|---|---|
| default | `bg-primary text-primary-foreground hover:bg-primary/90` |
| destructive | `bg-destructive text-white hover:bg-destructive/90` |
| outline | `border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground` |
| secondary | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| ghost | `hover:bg-accent hover:text-accent-foreground` |
| link | `text-primary underline-offset-4 hover:underline` |

Sizes:
| size | classes |
|---|---|
| default | `h-9 px-4 py-2 has-[>svg]:px-3` |
| sm | `h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5` |
| lg | `h-10 rounded-md px-6 has-[>svg]:px-4` |
| icon | `size-9` |

Props: `{ variant?, size?, asChild?, className, ...props }`. When `asChild` is true, render the children element with button classes (use a simple `Slot` pattern or just render an `<a>` with the classes). For Phase 1, `asChild` can be omitted — just support `<button>`.

#### Card (`src/components/ui/card.tsx`)

| Sub-component | Classes |
|---|---|
| Card | `flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm` |
| CardHeader | `grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6` |
| CardTitle | `leading-none font-semibold` |
| CardDescription | `text-sm text-muted-foreground` |
| CardAction | `col-start-2 row-span-2 row-start-1 self-start justify-self-end` |
| CardContent | `px-6` |
| CardFooter | `flex items-center px-6 [.border-t]:pt-6` |

#### Input (`src/components/ui/input.tsx`)

```
h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm
focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50
aria-invalid:border-destructive aria-invalid:ring-destructive/20
```

#### Label (`src/components/ui/label.tsx`)

```
flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50
```

(Use a native `<label>` element — no Radix needed.)

#### Badge (`src/components/ui/badge.tsx`)

Base: `inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3`

Variants:
| variant | classes |
|---|---|
| default | `bg-primary text-primary-foreground` |
| secondary | `bg-secondary text-secondary-foreground` |
| destructive | `bg-destructive text-white` |
| outline | `border-border text-foreground` |

#### Table (`src/components/ui/table.tsx`)

| Sub-component | Classes |
|---|---|
| Table (wrapper div) | `relative w-full overflow-x-auto` |
| Table (table) | `w-full caption-bottom text-sm` |
| TableHeader | `[&_tr]:border-b` |
| TableBody | `[&_tr:last-child]:border-0` |
| TableFooter | `border-t bg-muted/50 font-medium [&>tr]:last:border-b-0` |
| TableRow | `border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted` |
| TableHead | `h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0` |
| TableCell | `p-2 align-middle [&:has([role=checkbox])]:pr-0` |

#### Separator (`src/components/ui/separator.tsx`)

Simple `<div>` — no Radix needed:
- Horizontal: `shrink-0 h-px w-full bg-border`
- Vertical: `shrink-0 h-full w-px bg-border`

Props: `{ orientation?: "horizontal" | "vertical", className }`.

#### Skeleton (`src/components/ui/skeleton.tsx`)

```
animate-pulse rounded-md bg-accent
```

#### Avatar (`src/components/ui/avatar.tsx`)

Without Radix, use native `<img>` with fallback:
- Avatar container: `relative flex size-8 shrink-0 overflow-hidden rounded-full select-none`
- AvatarImage: `aspect-square size-full object-cover`
- AvatarFallback: `flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground`

Implement fallback by catching image `onError` and swapping to initials/text.

#### Breadcrumb (`src/components/ui/breadcrumb.tsx`)

| Sub-component | Classes |
|---|---|
| Breadcrumb | `<nav aria-label="breadcrumb">` |
| BreadcrumbList | `flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5` |
| BreadcrumbItem | `inline-flex items-center gap-1.5` |
| BreadcrumbLink | `transition-colors hover:text-foreground` |
| BreadcrumbPage | `font-normal text-foreground` |
| BreadcrumbSeparator | Render `<ChevronRight />` from lucide-react with `[&>svg]:size-3.5` |

#### ScrollArea (`src/components/ui/scroll-area.tsx`)

Skip Radix. Use a simple scrollable div with custom scrollbar styling:
```
relative overflow-auto
[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border
```

### 4.5 Dashboard Layout (`src/components/layout/`)

#### Sidebar (`src/components/layout/sidebar.tsx`)

The sidebar is a fixed-width left column (16rem / `w-64`). It contains:
1. Logo/brand at top
2. Navigation menu items (using `lucide-react` icons)
3. User section at bottom (avatar + name + logout)

Key classes from shadcn sidebar source:
- Sidebar wrapper: `flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground`
- Menu item button: `flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0`
- Active item: add `data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground`
- Menu group label: `flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70`

For Phase 1, the sidebar does NOT need to be collapsible. A fixed 16rem sidebar is sufficient. Collapsible can be added later.

Use TanStack Router's `Link` component with `activeProps` or check `useMatch()` to set the active state on menu items:
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

#### Header (`src/components/layout/header.tsx`)

Top bar with:
- Sidebar toggle button (optional for Phase 1 — can omit if sidebar is fixed)
- Page title or breadcrumb (left)
- Search input (center, optional)
- User menu / avatar dropdown (right)

Classes: `flex h-14 items-center gap-4 border-b bg-background px-6`

#### Dashboard Layout (`src/components/layout/dashboard-layout.tsx`)

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

Wire this into `_authenticated.tsx`:
```tsx
function AuthenticatedLayout() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
```

### 4.6 Toast/Notification

For Phase 1, a minimal approach is recommended — avoid adding a toast library. Build a simple toast component:

1. Create a `ToastContext` in `src/components/ui/toast.tsx`
2. Render toasts in a fixed container: `fixed bottom-4 right-4 z-50 flex flex-col gap-2`
3. Each toast: `flex items-center gap-3 rounded-md border bg-popover p-4 text-popover-foreground shadow-md`
4. Auto-dismiss after 3s with `setTimeout`

If the Coder prefers a library, `sonner` is the lightest and most popular (1.2kB, no Radix dependency). But for Phase 1 with minimal scope, hand-built is fine.

### 4.7 Empty State (`src/components/dashboard/empty-state.tsx`)

```
flex flex-col items-center justify-center gap-3 py-12 text-center
```

Icon: `size-12 text-muted-foreground/50`
Title: `text-sm font-medium`
Description: `text-sm text-muted-foreground`

### 4.8 DataTable Scaffold

For Phase 1, use the Table component with manual data (no TanStack Table dependency yet). The Coder can build a simple `ContactTable` component that maps an array of contact objects to `<TableRow>` elements. When pagination/sorting is needed in a later phase, add `@tanstack/react-table`.

### 4.9 Login Page Restyle

The existing `login.tsx` uses blue accents (`bg-blue-600`, `text-blue-500`). Replace with:
- Page background: `bg-background`
- Form container: `w-full max-w-sm rounded-xl border bg-card p-8 text-card-foreground shadow-sm`
- Title: `text-2xl font-semibold tracking-tight`
- Inputs: use the new `Input` component
- Button: use the new `Button` component with `default` variant (black background)
- Error: `text-sm text-destructive`

---

## 5. Open Questions

1. **Dark mode in Phase 1?** The token system supports it (`.dark` block is defined), but the Coder needs a toggle mechanism. Recommend: defer dark mode toggle to a later phase, ship light mode only. The tokens are ready when needed.

2. **Destructive color — keep red or go strict B&W?** I recommend keeping the red `oklch(0.577 0.245 27.325)` for destructive actions (delete buttons, error states) — it's a UX safety convention. If strict B&W is desired, replace with `oklch(0.205 0 0)` (dark gray). **Awaiting user decision.**

3. **Collapsible sidebar in Phase 1?** I recommend a fixed 16rem sidebar for Phase 1 — simpler, fewer moving parts. Collapsible can be added in Phase 2. **Awaiting user decision.**

4. **Inter font delivery — Google Fonts CDN or self-hosted via `@fontsource/inter`?** Google Fonts CDN is faster to set up (one `<link>` in HTML). Self-hosting is better for privacy and offline reliability. Recommend Google Fonts CDN for Phase 1, can switch later. **Awaiting user decision.**

---

## 6. Sources

- shadcn/ui theming documentation: https://ui.shadcn.com/docs/theming
- shadcn/ui v4 globals.css (Neutral theme, OKLCH values): https://github.com/shadcn-ui/ui/blob/main/apps/v4/app/globals.css
- shadcn/ui new-york-v4 button source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/button.tsx
- shadcn/ui new-york-v4 card source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/card.tsx
- shadcn/ui new-york-v4 input source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/input.tsx
- shadcn/ui new-york-v4 badge source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/badge.tsx
- shadcn/ui new-york-v4 table source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/table.tsx
- shadcn/ui new-york-v4 sidebar source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/sidebar.tsx
- shadcn/ui new-york-v4 label/separator/skeleton/avatar/breadcrumb/scroll-area: https://github.com/shadcn-ui/ui/tree/main/apps/v4/registry/new-york-v4/ui
- shadcn/ui color reference: https://colors.id/shadcn-colors
- Tailwind CSS v4 upgrade guide: https://tailwindcss.com/docs/upgrade-guide
- shadcn/ui button docs: https://ui.shadcn.com/docs/components/button
- shadcn/ui card docs: https://ui.shadcn.com/docs/components/card
- shadcn/ui theme builder: https://ui.shadcn.com/create