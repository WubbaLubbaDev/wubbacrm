# Component Checklist — Verify When Building/Reviewing Components

Things to check against any feature that creates or modifies UI primitives in `src/components/ui/`. Patch this file when a new component issue pattern is discovered.

---

## Button

- [ ] All 4 variants render correctly: `primary`, `secondary`, `outline`, `ghost`
- [ ] 3 sizes available and apply correct classes
- [ ] `loading` prop shows spinner and disables the button
- [ ] `disabled` state styles applied
- [ ] Uses `forwardRef`
- [ ] Accepts `className` via `cn()` and spreads remaining props

## Card

- [ ] Composition works: `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`
- [ ] All sub-components accept `className` via `cn()`
- [ ] `Card` has `overflow-hidden` for content clipping

## Input

- [ ] Has focus ring (visible on keyboard navigation)
- [ ] Has border using semantic token (`border-border`)
- [ ] Placeholder styling uses `text-muted-foreground` or equivalent
- [ ] Uses `forwardRef`
- [ ] Accepts `className` via `cn()` and spreads remaining props

## Label

- [ ] Uses native `<label>` element
- [ ] `peer-disabled` styling applied for disabled state

## Badge

- [ ] Variants available: `default`, `outline`
- [ ] Accepts `className` via `cn()`

## Avatar

- [ ] Renders `<img>` when `src` is provided, fallback (initials/text) when absent
- [ ] `size` prop works
- [ ] No `onError` handler — flag as blocker when real avatar images are used

## Separator

- [ ] Supports horizontal and vertical orientations
- [ ] Has `role="separator"`

## Skeleton

- [ ] Custom shimmer animation works
- [ ] Accepts `className` for sizing

## EmptyState

- [ ] Props work: `icon`, `title`, `description`, `action`
- [ ] Renders action button/element when provided

## General component quality

- [ ] All components are TypeScript typed with proper interfaces
- [ ] All components use `forwardRef`
- [ ] All components accept `className` via `cn()` and spread remaining props
- [ ] No component libraries installed (no shadcn, Radix, CVA, clsx, or tailwind-merge) — Tailwind only
- [ ] File structure clean: `src/components/ui/` for primitives, `src/components/layout/` for layout components
- [ ] Path alias `@/` used consistently (configured in `tsconfig.app.json` and `vite.config.ts`)