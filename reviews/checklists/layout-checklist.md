# Layout Checklist — Verify on Every UI/Layout Feature

Things to check against any feature that adds UI components, modifies the top bar / sidebar / dashboard layout, or introduces new content areas. Patch this file when a new layout issue pattern is discovered.

---

## Dropdown / floating menu spacing & z-index

- [ ] `mt-2` (8px) or equivalent spacing from the trigger button
- [ ] z-index is higher than the nearest positioned ancestor (e.g. `z-[60]` on dropdown, header has no z-index)
- [ ] `top-full` (or `bottom-full`) positioning — dropdown appears below/above the trigger, not overlapping it
- [ ] Container `p-1`, items `px-3 py-2`, separator `my-1`
- [ ] Text in dropdown has `truncate` + `title` attribute for tooltip on overflow

## Full-width search bar in flex layout

- [ ] The flexible element (search container) has `flex-1`
- [ ] Non-flexible siblings (title, user menu) have `shrink-0`
- [ ] Gap is explicit (`gap-4` or similar), not relying on margin
- [ ] Absolutely-positioned icons inside inputs have `pointer-events-none` and matching `pl-*` padding (e.g. `pl-9` for `left-3` icon)

## Container overflow & text truncation

- [ ] Text elements that may overflow have `truncate` (or `overflow-hidden` + `text-ellipsis` + `whitespace-nowrap`)
- [ ] Container has `overflow-hidden` (e.g. `Card`)
- [ ] Flex children containing truncatable text have `min-w-0` — without this, flex items won't truncate
- [ ] Non-text siblings (badges, icons) are marked `shrink-0`
- [ ] `title` attribute on truncated elements for tooltip fallback

## Sidebar nav text when collapsed

- [ ] Label span has `truncate`
- [ ] When collapsed, labels are conditionally hidden (`!collapsed &&` or similar)
- [ ] `title` attribute provides tooltip when label is hidden

## Stat card numbers/labels fit without overflow

- [ ] `Card` has `overflow-hidden`
- [ ] `CardTitle` has `truncate`
- [ ] Value `div` has `truncate`
- [ ] Change indicator `p` has `truncate`

## Hardcoded colors vs semantic tokens

- [ ] All backgrounds use `bg-background`, `bg-card`, `bg-muted`, `bg-popover`, `bg-primary` (not `bg-white`, `bg-blue-*`, `bg-gray-*`)
- [ ] All text uses `text-foreground`, `text-muted-foreground`, `text-primary-foreground`, `text-destructive` (not `text-gray-*`, `text-blue-*`)
- [ ] All borders use `border-border` (not `border-gray-*`)
- [ ] `--color-popover` and `--color-popover-foreground` are defined in `@theme` if any component uses `bg-popover`
- [ ] Grep for `bg-white`, `bg-black`, `bg-blue-*`, `bg-gray-*`, `text-gray-*`, `text-blue-*`, `border-gray-*` — flag every match
- [ ] If a new token is introduced (e.g. `bg-accent`), verify it's defined in `@theme` before use

## Missing component variants

- [ ] Button variants used: only `primary`, `secondary`, `outline`, `ghost` (missing: `destructive`, `link`)
- [ ] Badge variants used: only `default`, `outline` (missing: `secondary`, `destructive`)
- [ ] Card sub-components used: only `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` (missing: `CardDescription`, `CardAction`)
- [ ] If a page uses a variant not in the list, either add the variant or use an existing one — do NOT pass an undefined variant string (silently falls back to default)

## cn() without tailwind-merge

- [ ] `cn()` is currently `filter(Boolean).join(' ')` — no `clsx` or `tailwind-merge`
- [ ] If a feature passes conflicting Tailwind utility classes via `className` props, flag that `cn()` needs upgrading to `clsx` + `tailwind-merge`
- [ ] Until upgraded, the simple join is acceptable for non-conflicting usage

## Avatar onError fallback

- [ ] `avatar.tsx` renders `<img>` when `src` is provided, fallback only when `src` is absent
- [ ] No `onError` handler currently — when a feature starts using real avatar images (e.g. contacts with photo URLs), flag this as a blocker