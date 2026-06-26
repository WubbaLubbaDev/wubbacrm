# Spacing & Layout Tokens

Spacing scale, border radius, shadow tokens, and gap/padding conventions.

## Border Radius Scale

A single `--radius: 0.625rem` (10px) base token derives the entire scale.

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

## Spacing Conventions

Components use Tailwind's spacing scale with fixed pixel values:

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

## Shadow Scale

Minimal shadows — the look is flat with subtle depth, no heavy drop shadows.

| Context | Class |
|---|---|
| Cards | `shadow-sm` |
| Buttons (outline variant only) | `shadow-xs` |
| Toasts | `shadow-md` |
| Everything else | none (flat) |

## Cross-References

- Radius token definitions in `@theme inline`: see `color-system.md`
- Component-specific spacing usage: see `component-patterns.md`
- Dashboard layout dimensions (sidebar width, header height): see `layout-patterns.md`

## Sources

- shadcn/ui v4 globals.css (neutral theme): https://github.com/shadcn-ui/ui/blob/main/apps/v4/app/globals.css
- Tailwind CSS v4 docs: https://tailwindcss.com/docs