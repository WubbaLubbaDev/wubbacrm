# Color System (Black & White Tokens)

Semantic CSS variable token system using OKLCH color space with chroma `0` (pure grayscale). The one exception is `destructive`, which uses a red OKLCH for UX safety convention (delete buttons, error states).

## Design Philosophy

1. **Semantic CSS variable token system.** Colors are never hardcoded. Every component references semantic tokens like `bg-primary`, `text-muted-foreground`, `border-border`. The actual color values live in `:root` and `.dark` CSS blocks. Changing the theme = changing one CSS block, not touching components.

2. **Neutral grayscale palette (zero saturation).** The "Neutral" base color uses `oklch()` with chroma `0` — pure grayscale. This is the black-and-white aesthetic.

## Light Mode (`:root`)

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

## Dark Mode (`.dark`)

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

## Tailwind v4 Theme Mapping (`@theme inline`)

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

Note: `--color-sidebar-primary` and `--color-sidebar-primary-foreground` are also mapped in the full theme block. Add them to `@theme inline` if sidebar primary styling is needed via Tailwind classes.

## Full CSS Variable Definitions

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

## Cross-References

- Border radius and shadow tokens: see `spacing-layout.md`
- Typography (font-sans token): see `typography.md`
- Component class recipes using these tokens: see `component-patterns.md`
- Sidebar-specific tokens in context: see `layout-patterns.md`

## Sources

- shadcn/ui theming docs: https://ui.shadcn.com/docs/theming
- shadcn/ui v4 globals.css (neutral theme): https://github.com/shadcn-ui/ui/blob/main/apps/v4/app/globals.css
- shadcn/ui color reference: https://colors.id/shadcn-colors
- Tailwind CSS v4 upgrade guide: https://tailwindcss.com/docs/upgrade-guide