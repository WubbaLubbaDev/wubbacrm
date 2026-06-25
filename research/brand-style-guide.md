# WubbaCRM Brand Style Guide

## Design Philosophy

WubbaCRM uses a black-and-white, clean aesthetic inspired by shadcn/ui's "Neutral" theme. The design system is implemented with Tailwind CSS v4 only — no shadcn library, no Radix UI primitives, no class-variance-authority dependency. Components are hand-built from plain React + Tailwind classes, copying the exact class recipes from shadcn's new-york-v4 source.

Six core principles define the visual identity:

1. **Semantic CSS variable token system.** Colors are never hardcoded. Every component references semantic tokens like `bg-primary`, `text-muted-foreground`, `border-border`. The actual color values live in `:root` and `.dark` CSS blocks. Changing the theme = changing one CSS block, not touching components.

2. **Neutral grayscale palette (zero saturation).** The "Neutral" base color uses `oklch()` with chroma `0` — pure grayscale. This is the black-and-white aesthetic.

3. **Border radius scale.** A single `--radius: 0.625rem` (10px) base token derives the entire scale.

4. **Minimal shadows.** Cards use `shadow-sm`, buttons use `shadow-xs` on outline variant only. The look is flat with subtle depth — no heavy drop shadows.

5. **Typography hierarchy.** Inter for both heading and body. Hierarchy is achieved through font-weight (`font-medium`, `font-semibold`) and size (`text-sm` for body, `text-xs` for secondary, `text-base` for inputs), not through dramatic size jumps.

6. **Consistent spacing via fixed pixel values.** Components use Tailwind's spacing scale: `px-6` for card padding, `h-9` (36px) for default button/input height, `h-8` for small, `h-10` for large, `gap-2` for icon spacing.

## Color System (Black & White Tokens)

All colors use OKLCH color space with chroma `0` (pure grayscale). The one exception is `destructive`, which uses a red OKLCH for UX safety convention (delete buttons, error states).

### Light Mode (`:root`)

| Token | OKLCH Value | Approximate Hex | Usage |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | #FFFFFF | Page background |
| `--foreground` | `oklch(0.145 0 0)` | #000000 | Primary text |
| `--card` | `oklch(1 0 0)` | #FFFFFF | Card background |
| `--card-foreground` | `oklch(0.145 0 0)` | #000000 | Card text |
| `--popover` | `oklch(1 0 0)` | #FFFFFF | Popover/dropdown background |
| `--popover-foreground` | `oklch(0.145 0 0)` | #000000 | Popover text |
| `--primary` | `oklch(0.205 0 0)` | #1A1A1A | Primary buttons, key UI |
| `--primary-foreground` | `oklch(0.985 0 0)` | #FAFAFA | Text on primary |
| `--secondary` | `oklch(0.97 0 0)` | #F4F4F5 | Secondary surfaces |
| `--secondary-foreground` | `oklch(0.205 0 0)` | #1A1A1A | Text on secondary |
| `--muted` | `oklch(0.97 0 0)` | #F4F4F5 | Muted backgrounds |
| `--muted-foreground` | `oklch(0.556 0 0)` | #71717A | Secondary/muted text |
| `--accent` | `oklch(0.97 0 0)` | #F4F4F5 | Hover states |
| `--accent-foreground` | `oklch(0.205 0 0)` | #1A1A1A | Text on accent |
| `--destructive` | `oklch(0.577 0.245 27.325)` | red | Delete/error states |
| `--destructive-foreground` | `oklch(0.985 0 0)` | #FAFAFA | Text on destructive |
| `--border` | `oklch(0.922 0 0)` | #E4E4E7 | Borders, dividers |
| `--input` | `oklch(0.922 0 0)` | #E4E4E7 | Input borders |
| `--ring` | `oklch(0.708 0 0)` | #A1A1AA | Focus ring |
| `--sidebar` | `oklch(0.985 0 0)` | #FAFAFA | Sidebar background |
| `--sidebar-foreground` | `oklch(0.145 0 0)` | #000000 | Sidebar text |
| `--sidebar-primary` | `oklch(0.205 0 0)` | #1A1A1A | Sidebar active/primary |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | #FAFAFA | Text on sidebar primary |
| `--sidebar-accent` | `oklch(0.97 0 0)` | #F4F4F5 | Sidebar hover |
| `--sidebar-accent-foreground` | `oklch(0.205 0 0)` | #1A1A1A | Text on sidebar hover |
| `--sidebar-border` | `oklch(0.922 0 0)` | #E4E4E7 | Sidebar borders |
| `--sidebar-ring` | `oklch(0.708 0 0)` | #A1A1AA | Sidebar focus ring |

### Dark Mode (`.dark`)

| Token | OKLCH Value |
|---|---|
| `--background` | `oklch(0.145 0 0)` |
| `--foreground` | `oklch(0.985 0 0)` |
| `--card` | `oklch(0.205 0 0)` |
| `--card-foreground` | `oklch(0.985 0 0)` |
| `--popover` | `oklch(0.205 0 0)` |
| `--popover-foreground` | `oklch(0.985 0 0)` |
| `--primary` | `oklch(0.922 0 0)` |
| `--primary-foreground` | `oklch(0.205 0 0)` |
| `--secondary` | `oklch(0.269 0 0)` |
| `--secondary-foreground` | `oklch(0.985 0 0)` |
| `--muted` | `oklch(0.269 0 0)` |
| `--muted-foreground` | `oklch(0.708 0 0)` |
| `--accent` | `oklch(0.269 0 0)` |
| `--accent-foreground` | `oklch(0.985 0 0)` |
| `--destructive` | `oklch(0.704 0.191 22.216)` |
| `--destructive-foreground` | `oklch(0.985 0 0)` |
| `--border` | `oklch(1 0 0 / 10%)` |
| `--input` | `oklch(1 0 0 / 15%)` |
| `--ring` | `oklch(0.556 0 0)` |
| `--sidebar` | `oklch(0.205 0 0)` |
| `--sidebar-foreground` | `oklch(0.985 0 0)` |
| `--sidebar-primary` | `oklch(0.488 0.243 264.376)` |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` |
| `--sidebar-accent` | `oklch(0.269 0 0)` |
| `--sidebar-accent-foreground` | `oklch(0.985 0 0)` |
| `--sidebar-border` | `oklch(1 0 0 / 10%)` |
| `--sidebar-ring` | `oklch(0.439 0 0)` |

### Tailwind v4 Theme Mapping (`@theme inline`)

Defining `--color-primary` in `@theme inline` generates `bg-primary`, `text-primary`, `border-primary`, `ring-primary`, etc. automatically.

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
```

### Full CSS Variable Definitions

```css
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

**Note on destructive:** If strict B&W is desired (no red), replace `--destructive: oklch(0.577 0.245 27.325)` with `oklch(0.205 0 0)` (dark gray). The red is a UX convention, not a brand color.

## Typography

**Inter** (Google Fonts) — neo-grotesque sans-serif designed for screen readability, excellent x-height, neutral character that suits the B&W aesthetic.

Load via Google Fonts in `index.html`:
```html
<link rel="preconnect" href="fonts.googleapis.com" />
<link rel="preconnect" href="fonts.gstatic.com" crossorigin />
<link href="fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

Alternatively, use `@fontsource/inter` npm package for self-hosting (avoids external request, better for privacy/CDN reliability).

The `--font-sans` token maps to Inter with a system-ui fallback:
```css
--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
```

### Type Scale

| Context | Class | Notes |
|---|---|---|
| Card title | `font-semibold leading-none` | No dramatic size jump |
| Body text | `text-sm` | Default for most content |
| Secondary/description | `text-sm text-muted-foreground` | Muted color for hierarchy |
| Tertiary/meta | `text-xs` | Smallest text |
| Input text | `text-base md:text-sm` | Slightly larger on mobile |
| Page title | `text-2xl font-semibold tracking-tight` | Login/auth pages |

## Component Styling Patterns

### Approach

Build all UI primitives from scratch using plain React + Tailwind classes, copying the exact class recipes from shadcn's new-york-v4 source.

**Do NOT install:** `shadcn` CLI, `radix-ui`, `@radix-ui/*`, `class-variance-authority`.
**DO install:** `clsx` + `tailwind-merge` (for `cn()`), `lucide-react` (for icons).

For variant management (button variants, badge variants), use a simple inline pattern instead of `cva`:

```tsx
const variants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border bg-background shadow-xs hover:bg-accent ...",
  ...
} as const;
```

### `cn()` utility (`src/lib/utils.ts`)

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Button (`src/components/ui/button.tsx`)

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

### Card (`src/components/ui/card.tsx`)

| Sub-component | Classes |
|---|---|
| Card | `flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm` |
| CardHeader | `grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6` |
| CardTitle | `leading-none font-semibold` |
| CardDescription | `text-sm text-muted-foreground` |
| CardAction | `col-start-2 row-span-2 row-start-1 self-start justify-self-end` |
| CardContent | `px-6` |
| CardFooter | `flex items-center px-6 [.border-t]:pt-6` |

### Input (`src/components/ui/input.tsx`)

```
h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm
focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50
aria-invalid:border-destructive aria-invalid:ring-destructive/20
```

### Label (`src/components/ui/label.tsx`)

```
flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50
```

(Use a native `<label>` element — no Radix needed.)

### Badge (`src/components/ui/badge.tsx`)

Base: `inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3`

Variants:
| variant | classes |
|---|---|
| default | `bg-primary text-primary-foreground` |
| secondary | `bg-secondary text-secondary-foreground` |
| destructive | `bg-destructive text-white` |
| outline | `border-border text-foreground` |

### Table (`src/components/ui/table.tsx`)

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

### Separator (`src/components/ui/separator.tsx`)

Simple `<div>` — no Radix needed:
- Horizontal: `shrink-0 h-px w-full bg-border`
- Vertical: `shrink-0 h-full w-px bg-border`

Props: `{ orientation?: "horizontal" | "vertical", className }`.

### Skeleton (`src/components/ui/skeleton.tsx`)

```
animate-pulse rounded-md bg-accent
```

### Avatar (`src/components/ui/avatar.tsx`)

Without Radix, use native `<img>` with fallback:
- Avatar container: `relative flex size-8 shrink-0 overflow-hidden rounded-full select-none`
- AvatarImage: `aspect-square size-full object-cover`
- AvatarFallback: `flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground`

Implement fallback by catching image `onError` and swapping to initials/text.

### Breadcrumb (`src/components/ui/breadcrumb.tsx`)

| Sub-component | Classes |
|---|---|
| Breadcrumb | `<nav aria-label="breadcrumb">` |
| BreadcrumbList | `flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5` |
| BreadcrumbItem | `inline-flex items-center gap-1.5` |
| BreadcrumbLink | `transition-colors hover:text-foreground` |
| BreadcrumbPage | `font-normal text-foreground` |
| BreadcrumbSeparator | Render `<ChevronRight />` from lucide-react with `[&>svg]:size-3.5` |

### ScrollArea (`src/components/ui/scroll-area.tsx`)

Skip Radix. Use a simple scrollable div with custom scrollbar styling:
```
relative overflow-auto
[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border
```

### Empty State

```
flex flex-col items-center justify-center gap-3 py-12 text-center
```
- Icon: `size-12 text-muted-foreground/50`
- Title: `text-sm font-medium`
- Description: `text-sm text-muted-foreground`

### Toast (minimal hand-built)

1. Create a `ToastContext` in `src/components/ui/toast.tsx`
2. Render toasts in a fixed container: `fixed bottom-4 right-4 z-50 flex flex-col gap-2`
3. Each toast: `flex items-center gap-3 rounded-md border bg-popover p-4 text-popover-foreground shadow-md`
4. Auto-dismiss after 3s with `setTimeout`

Alternatively, `sonner` is the lightest toast library (1.2kB, no Radix dependency).

## Layout Principles

### Dashboard Layout Structure

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

### Sidebar (`src/components/layout/sidebar.tsx`)

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

### Header (`src/components/layout/header.tsx`)

Top bar with:
- Sidebar toggle button (optional)
- Page title or breadcrumb (left)
- Search input (center, optional)
- User menu / avatar dropdown (right)

Classes: `flex h-14 items-center gap-4 border-b bg-background px-6`

### Login Page Styling

- Page background: `bg-background`
- Form container: `w-full max-w-sm rounded-xl border bg-card p-8 text-card-foreground shadow-sm`
- Title: `text-2xl font-semibold tracking-tight`
- Inputs: use the `Input` component
- Button: use the `Button` component with `default` variant (black background)
- Error: `text-sm text-destructive`

## Spacing & Border Tokens

### Border Radius Scale

| Token | Calc | Value | Usage |
|---|---|---|---|
| `--radius` | base | 10px (0.625rem) | Base token |
| `--radius-sm` | `calc(var(--radius) * 0.6)` | 6px | Small elements |
| `--radius-md` | `calc(var(--radius) * 0.8)` | 8px | Buttons, inputs |
| `--radius-lg` | `var(--radius)` | 10px | Medium elements |
| `--radius-xl` | `calc(var(--radius) * 1.4)` | 14px | Cards |

Component radius conventions:
- Cards: `rounded-xl` (14px)
- Buttons/inputs: `rounded-md` (8px)
- Badges: `rounded-full`

### Spacing Conventions

| Context | Class | Value |
|---|---|---|
| Card padding | `px-6` | 24px horizontal |
| Button default height | `h-9` | 36px |
| Button small height | `h-8` | 32px |
| Button large height | `h-10` | 40px |
| Icon gap | `gap-2` | 8px |
| Header height | `h-14` | 56px |
| Sidebar width | `w-64` | 256px (16rem) |
| Main content padding | `p-6` | 24px |
| Table cell padding | `p-2` | 8px |
| Table head height | `h-10` | 40px |

### Shadow Scale

| Context | Class |
|---|---|
| Cards | `shadow-sm` |
| Buttons (outline variant only) | `shadow-xs` |
| Toasts | `shadow-md` |
| Everything else | none (flat) |

## Naming Conventions

- Files: `kebab-case.tsx` (e.g., `scroll-area.tsx`)
- Components: `PascalCase` (e.g., `ScrollArea`)
- Exports: named exports, no default exports (matches shadcn convention, better for tree-shaking)
- Index barrel: `src/components/ui/index.ts` re-exporting all primitives (optional but convenient)

## Sources

- shadcn/ui theming docs: https://ui.shadcn.com/docs/theming
- shadcn/ui v4 globals.css (neutral theme): https://github.com/shadcn-ui/ui/blob/main/apps/v4/app/globals.css
- shadcn/ui new-york-v4 component source: https://github.com/shadcn-ui/ui/tree/main/apps/v4/registry/new-york-v4/ui
- shadcn/ui button source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/button.tsx
- shadcn/ui card source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/card.tsx
- shadcn/ui input source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/input.tsx
- shadcn/ui badge source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/badge.tsx
- shadcn/ui table source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/table.tsx
- shadcn/ui sidebar source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/sidebar.tsx
- shadcn/ui color reference: https://colors.id/shadcn-colors
- Tailwind CSS v4 upgrade guide: https://tailwindcss.com/docs/upgrade-guide
- shadcn/ui button docs: https://ui.shadcn.com/docs/components/button
- shadcn/ui card docs: https://ui.shadcn.com/docs/components/card
- shadcn/ui theme builder: https://ui.shadcn.com/create