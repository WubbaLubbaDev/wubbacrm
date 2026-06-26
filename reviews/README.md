# WubbaCRM Review Reports

Review documentation is split into two categories by purpose: reusable checklists (living, patched) and one-time verdict reports (frozen, historical).

## checklists/

Living reference docs — patched when new issue patterns are discovered. Read the relevant checklist BEFORE reviewing a feature.

- `auth-checklist.md` — things to verify on every auth-related feature (logout redirect, route guards, session retrieval, env var validation, secrets hygiene)
- `layout-checklist.md` — things to verify on every UI/layout feature (dropdown spacing & z-index, full-width search, overflow/truncation, sidebar collapse, stat card fit, hardcoded colors, missing variants, cn() merge, avatar onError)
- `component-checklist.md` — things to verify when building/reviewing UI primitives (Button, Card, Input, Label, Badge, Avatar, Separator, Skeleton, EmptyState, general quality)

## features/

Frozen verdict reports — one per feature/task. Never patched; use an `## Update` section within the report for fix history.

- `scaffold-review.md` — Phase 0 scaffold + Supabase auth review (full CHANGES REQUESTED → fix → APPROVED history, includes logout fix update)
- `dashboard-review.md` — Phase 1 dashboard UI + component library review (with Phase 1.5 login restyle + bug fix history)

## How to Use

**When reviewing a new feature:**
1. Read the relevant checklists in `checklists/` before starting the review
2. Create a feature-specific review report in `features/` (e.g. `features/contacts-table-review.md`)
3. If you discover new recurring issue patterns, patch the relevant checklist (e.g. add a new layout bug pattern to `layout-checklist.md`)
4. Check existing checklists to catch regressions — if a past issue resurfaced, flag it
5. Do NOT rewrite or patch frozen feature reports — add an `## Update` section instead