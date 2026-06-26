# WubbaCRM Review Reports

Modular review documentation for the WubbaCRM project. Read only the modules relevant to your review; patch only what needs updating.

## Module Index

### setup/
- `scaffold-review.md` — Phase 0 scaffold + Supabase auth review (full CHANGES REQUESTED → fix → APPROVED history)
- `auth-review.md` — recurring auth patterns & regression checklist (logout redirect, beforeLoad guards, session retrieval, secrets hygiene)

### style/
- `component-review.md` — Phase 1 dashboard UI + component library review (with Phase 1.5 login restyle + bug fix history)
- `layout-review.md` — recurring layout/style patterns & regression checklist (dropdown spacing, search bar, overflow/truncation, hardcoded colors, missing variants, cn() merge, avatar onError)

### features/
- `.gitkeep` — placeholder for feature-specific reviews (e.g. `contacts-table-review.md`)

## How to Use

**When reviewing a new feature** (e.g. contacts table):
1. Create a feature-specific review in `features/` (e.g. `features/contacts-table-review.md`)
2. Patch relevant issue modules (e.g. add new layout bugs to `layout-review.md`, new auth bugs to `auth-review.md`)
3. Check against existing issue modules to catch regressions — if a past layout issue resurfaced, flag it
4. Do NOT rewrite the whole review history — only write the feature review and patch issue modules

**Issue modules** (`auth-review.md`, `layout-review.md`) are the regression checklists. Each entry has:
- Symptom: what the bug looks like
- Correct pattern: the fixed approach (with file references)
- Regression check: what to verify on future reviews touching that area

## Git History

These modules were split from two original review reports:
- `scaffold-auth-review.md` (setup modules) — now `scaffold-review.md` + `auth-review.md`
- `dashboard-ui-review.md` (style modules) — now `component-review.md` + `layout-review.md`

The split was done on branch `feat/research-modular-docs`. No information was lost in the split — every finding from the originals lives in the appropriate module.