# Layout & Style Issues — Recurring Patterns & Regression Checklist

Focused list of layout and styling findings from WubbaCRM reviews. Check these against every feature that adds UI components, modifies the top bar / sidebar / dashboard layout, or introduces new content areas. Patch this file when a new layout issue pattern is discovered.

---

## LI1: Dropdown spacing & z-index (Phase 1, Bug A — RESOLVED)

**Symptom:** Dropdown menus overlap the navbar, have inconsistent spacing from the trigger button, or render behind other elements.

**Correct pattern (topbar.tsx):**
- `mt-2` (8px) gap between trigger button and dropdown.
- `z-[60]` on the dropdown (higher than the header, which has no z-index).
- `top-full` positioning so the dropdown appears below the trigger, not overlapping it.
- Container `p-1`, items `px-3 py-2`, separator `my-1`.
- Email/text in dropdown: `truncate` + `title` attribute for tooltip on overflow.

**Regression check:** When reviewing any new dropdown, popover, or floating menu:
1. Verify `mt-2` (or equivalent spacing) from the trigger.
2. Verify z-index is higher than the nearest positioned ancestor.
3. Verify `top-full` (or `bottom-full`) positioning — not overlapping the trigger.
4. Verify text truncation + `title` tooltip for long content.

---

## LI2: Full-width search bar in flex layout (Phase 1, Bug B — RESOLVED)

**Symptom:** Search bar is squished or overlaps the avatar/user menu on narrow viewports.

**Correct pattern (topbar.tsx):**
- Search container: `relative flex flex-1 items-center`.
- Siblings (title, user menu): `shrink-0` so they don't compress.
- Header gap: `gap-4` between title, search, and user menu.
- Search icon: `pointer-events-none absolute left-3 size-4 text-muted-foreground`.
- Input: `pl-9` to avoid overlapping the icon.

**Regression check:** When reviewing any flex row with a search input or flexible element:
1. The flexible element has `flex-1`.
2. Non-flexible siblings have `shrink-0`.
3. Gap is explicit (`gap-4` or similar), not relying on margin.
4. Absolutely-positioned icons inside inputs have `pointer-events-none` and matching `pl-*` padding.

---

## LI3: Container overflow & text truncation (Phase 1, Bug C — RESOLVED)

**Symptom:** Long text overflows its container, pushes siblings out of position, or breaks the layout in flex/grid contexts.

**Correct pattern:**
- `truncate` on text elements that may overflow (titles, values, email addresses).
- `overflow-hidden` on the container (e.g. `Card`).
- `min-w-0` on flex children that contain truncatable text — without this, flex items won't truncate.
- `shrink-0` on non-text siblings (badges, icons) to prevent them from being squished.
- `title` attribute on truncated elements for tooltip on hover.

**Regression check:** When reviewing any component that displays user-generated or variable-length text:
1. Does the text element have `truncate` (or `overflow-hidden` + `text-ellipsis` + `whitespace-nowrap`)?
2. Does the container have `overflow-hidden`?
3. If the text is inside a flex child, does that child have `min-w-0`?
4. Are non-text siblings marked `shrink-0`?
5. Is there a `title` attribute for tooltip fallback?

---

## LI4: Hardcoded colors instead of semantic tokens (Phase 1, F1 + F5 — RESOLVED)

**Symptom:** Components use raw Tailwind color classes (`bg-white`, `bg-blue-600`, `text-gray-700`) instead of semantic tokens (`bg-popover`, `bg-primary`, `text-muted-foreground`).

**Correct pattern:**
- All backgrounds use `bg-background`, `bg-card`, `bg-muted`, `bg-popover`, `bg-primary`.
- All text uses `text-foreground`, `text-muted-foreground`, `text-primary-foreground`, `text-destructive`.
- All borders use `border-border`.
- `--color-popover` and `--color-popover-foreground` must be defined in `@theme` if any component uses `bg-popover`.

**Regression check:** When reviewing any new component or page:
1. Grep for hardcoded color classes: `bg-white`, `bg-black`, `bg-blue-*`, `bg-gray-*`, `text-gray-*`, `text-blue-*`, `border-gray-*`. Flag every match.
2. Verify the corresponding semantic token is defined in `index.css` `@theme` block.
3. If a new token is introduced (e.g. `bg-accent`), verify it's defined in `@theme` before use.

---

## LI5: Missing component variants (Phase 1, F4 — OPEN, non-blocking)

**Symptom:** A component is used with a variant that doesn't exist (e.g. `<Button variant="destructive">`), causing a silent no-op or default styling.

**Currently implemented:**
- Button: `primary`, `secondary`, `outline`, `ghost` (missing: `destructive`, `link`)
- Badge: `default`, `outline` (missing: `secondary`, `destructive`)
- Card: `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` (missing: `CardDescription`, `CardAction`)

**Regression check:** When a new page uses a variant not in the list above:
1. Either add the variant to the component, or use an existing variant.
2. Do NOT pass an undefined variant string — it will silently fall back to default.

---

## LI6: cn() without tailwind-merge (Phase 1, F3 — OPEN, non-blocking)

**Symptom:** When a consumer passes `className="px-2"` to a component that internally has `px-4`, both classes appear in the DOM and CSS specificity determines the winner (unpredictable).

**Current state:** `src/lib/cn.ts` is `filter(Boolean).join(' ')` — no `clsx` or `tailwind-merge`.

**Regression check:** If a feature starts passing conflicting Tailwind utility classes via `className` props, flag that `cn()` needs upgrading to `clsx` + `tailwind-merge`. Until then, the simple join is acceptable for non-conflicting usage.

---

## LI7: Avatar onError fallback (Phase 1, F2 — OPEN, non-blocking)

**Symptom:** Avatar with a `src` that 404s shows empty alt text instead of fallback initials.

**Current state:** `src/components/ui/avatar.tsx` renders `<img>` when `src` is provided, fallback only when `src` is absent. No `onError` handler.

**Regression check:** When a feature starts using real avatar images (e.g. contacts with photo URLs), flag F2 as a blocker — the `onError` handler must be added before shipping.