# Typography

Font choice, font stack, type hierarchy, and weights for WubbaCRM.

## Font: Inter

**Inter** (Google Fonts) — neo-grotesque sans-serif designed for screen readability, excellent x-height, neutral character that suits the B&W aesthetic.

Load via Google Fonts in `index.html`:
```html
<link rel="preconnect" href="fonts.googleapis.com" />
<link rel="preconnect" href="fonts.gstatic.com" crossorigin />
<link href="fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

Alternatively, use `@fontsource/inter` npm package for self-hosting (avoids external request, better for privacy/CDN reliability).

## Font Stack

The `--font-sans` token maps to Inter with a system-ui fallback:
```css
--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
```

Mono font token:
```css
--font-mono: ui-monospace, monospace;
```

Both are defined in the `@theme inline` block (see `color-system.md`).

## Type Scale

Hierarchy is achieved through font-weight (`font-medium`, `font-semibold`) and size (`text-sm` for body, `text-xs` for secondary, `text-base` for inputs), not through dramatic size jumps.

| Context | Class | Notes |
|---|---|---|
| Card title | `font-semibold leading-none` | No dramatic size jump |
| Body text | `text-sm` | Default for most content |
| Secondary/description | `text-sm text-muted-foreground` | Muted color for hierarchy |
| Tertiary/meta | `text-xs` | Smallest text |
| Input text | `text-base md:text-sm` | Slightly larger on mobile |
| Page title | `text-2xl font-semibold tracking-tight` | Login/auth pages |

## Cross-References

- Font token definitions in `@theme inline`: see `color-system.md`
- Component text classes in practice: see `component-patterns.md`

## Sources

- shadcn/ui v4 globals.css (neutral theme): https://github.com/shadcn-ui/ui/blob/main/apps/v4/app/globals.css
- Tailwind CSS v4 docs: https://tailwindcss.com/docs