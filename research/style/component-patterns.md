# Component Styling Patterns

Exact Tailwind class recipes for all UI primitives. Build from scratch using plain React + Tailwind classes, copying from shadcn's new-york-v4 source.

## Approach

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

## `cn()` utility (`src/lib/utils.ts`)

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Button (`src/components/ui/button.tsx`)

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

## Card (`src/components/ui/card.tsx`)

| Sub-component | Classes |
|---|---|
| Card | `flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm` |
| CardHeader | `grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6` |
| CardTitle | `leading-none font-semibold` |
| CardDescription | `text-sm text-muted-foreground` |
| CardAction | `col-start-2 row-span-2 row-start-1 self-start justify-self-end` |
| CardContent | `px-6` |
| CardFooter | `flex items-center px-6 [.border-t]:pt-6` |

## Input (`src/components/ui/input.tsx`)

```
h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm
focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50
aria-invalid:border-destructive aria-invalid:ring-destructive/20
```

## Label (`src/components/ui/label.tsx`)

```
flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50
```

(Use a native `<label>` element — no Radix needed.)

## Badge (`src/components/ui/badge.tsx`)

Base: `inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3`

Variants:
| variant | classes |
|---|---|
| default | `bg-primary text-primary-foreground` |
| secondary | `bg-secondary text-secondary-foreground` |
| destructive | `bg-destructive text-white` |
| outline | `border-border text-foreground` |

## Table (`src/components/ui/table.tsx`)

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

## Separator (`src/components/ui/separator.tsx`)

Simple `<div>` — no Radix needed:
- Horizontal: `shrink-0 h-px w-full bg-border`
- Vertical: `shrink-0 h-full w-px bg-border`

Props: `{ orientation?: "horizontal" | "vertical", className }`.

## Skeleton (`src/components/ui/skeleton.tsx`)

```
animate-pulse rounded-md bg-accent
```

## Avatar (`src/components/ui/avatar.tsx`)

Without Radix, use native `<img>` with fallback:
- Avatar container: `relative flex size-8 shrink-0 overflow-hidden rounded-full select-none`
- AvatarImage: `aspect-square size-full object-cover`
- AvatarFallback: `flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground`

Implement fallback by catching image `onError` and swapping to initials/text.

## Breadcrumb (`src/components/ui/breadcrumb.tsx`)

| Sub-component | Classes |
|---|---|
| Breadcrumb | `<nav aria-label="breadcrumb">` |
| BreadcrumbList | `flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5` |
| BreadcrumbItem | `inline-flex items-center gap-1.5` |
| BreadcrumbLink | `transition-colors hover:text-foreground` |
| BreadcrumbPage | `font-normal text-foreground` |
| BreadcrumbSeparator | Render `<ChevronRight />` from lucide-react with `[&>svg]:size-3.5` |

## ScrollArea (`src/components/ui/scroll-area.tsx`)

Skip Radix. Use a simple scrollable div with custom scrollbar styling:
```
relative overflow-auto
[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border
```

## Empty State

```
flex flex-col items-center justify-center gap-3 py-12 text-center
```
- Icon: `size-12 text-muted-foreground/50`
- Title: `text-sm font-medium`
- Description: `text-sm text-muted-foreground`

## Toast (minimal hand-built)

1. Create a `ToastContext` in `src/components/ui/toast.tsx`
2. Render toasts in a fixed container: `fixed bottom-4 right-4 z-50 flex flex-col gap-2`
3. Each toast: `flex items-center gap-3 rounded-md border bg-popover p-4 text-popover-foreground shadow-md`
4. Auto-dismiss after 3s with `setTimeout`

Alternatively, `sonner` is the lightest toast library (1.2kB, no Radix dependency).

## Cross-References

- Color tokens referenced by these classes: see `color-system.md`
- Spacing/radius/shadow tokens: see `spacing-layout.md`
- Typography classes (text-sm, font-semibold, etc.): see `typography.md`
- Layout components (sidebar, header): see `layout-patterns.md`
- File naming conventions (kebab-case files, PascalCase components): see `../setup/project-structure.md`

## Sources

- shadcn/ui new-york-v4 component source: https://github.com/shadcn-ui/ui/tree/main/apps/v4/registry/new-york-v4/ui
- shadcn/ui button source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/button.tsx
- shadcn/ui card source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/card.tsx
- shadcn/ui input source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/input.tsx
- shadcn/ui badge source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/badge.tsx
- shadcn/ui table source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/table.tsx
- shadcn/ui sidebar source: https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/sidebar.tsx
- shadcn/ui button docs: https://ui.shadcn.com/docs/components/button
- shadcn/ui card docs: https://ui.shadcn.com/docs/components/card
- shadcn/ui theme builder: https://ui.shadcn.com/create