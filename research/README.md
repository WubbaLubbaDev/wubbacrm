# WubbaCRM Research Reference Docs

Modular reference documentation for the WubbaCRM project. Read only the modules relevant to your task; patch only what needs updating.

## Module Index

### setup/
- `project-structure.md` — folder layout, stack components, naming conventions, package.json scripts
- `vite-config.md` — Vite config, plugin order, Tailwind CSS v4 setup, BiomeJS config
- `tanstack-router.md` — file-based routing conventions, route tree gen, beforeLoad guards, layout routes
- `supabase-client.md` — Supabase project details, API keys, client module, env vars, auth config
- `auth-patterns.md` — login flow, protected routes, onAuthStateChange, logout redirect chain

### style/
- `color-system.md` — black & white OKLCH color tokens, CSS custom properties, light/dark themes, @theme inline mapping
- `typography.md` — Inter font, font stack, type hierarchy, weights
- `spacing-layout.md` — spacing scale, border radius, shadow tokens, gap/padding conventions
- `component-patterns.md` — Button/Card/Input/Label/Badge/Table/Separator/Skeleton/Avatar/Breadcrumb/ScrollArea/EmptyState/Toast variants and Tailwind classes
- `layout-patterns.md` — sidebar, header/topbar, DashboardLayout composition, login page styling

### features/
- `.gitkeep` — placeholder for feature-specific briefs (e.g. `contacts-table-brief.md`)

## How to Use

**When a new feature comes** (e.g. contacts table):
1. Researcher creates a feature-specific brief in `features/` (e.g. `features/contacts-table-brief.md`)
2. Researcher patches relevant modules (e.g. add table styling to `component-patterns.md`)
3. Researcher does NOT rewrite the whole reference

**The coder**:
1. Reads the feature brief
2. Pulls specific modules for context (e.g. `component-patterns.md` + `supabase-client.md`)
3. Does NOT re-read everything

## Git History

These modules were split from two original reference docs:
- `react-tanstack-supabase-setup.md` (setup modules)
- `brand-style-guide.md` (style modules)

The split was done in commit on branch `feat/research-modular-docs`. No information was lost in the split — every detail from the originals lives in the appropriate module.