# Project Structure

Reference for WubbaCRM's folder layout, file organization, and naming conventions.

## Folder Layout

```
src/
  lib/
    supabase.ts              # Supabase client
    utils.ts                 # cn() utility (clsx + tailwind-merge)
  components/
    ui/                      # Primitive components (one file per component)
    layout/                  # Dashboard chrome (sidebar, header, layout shell)
    dashboard/               # Composed dashboard widgets
  routes/
    __root.tsx               # Root route (layout, auth state listener)
    login.tsx                # Login page (/login)
    _authenticated.tsx       # Layout route for protected pages
    _authenticated/
      index.tsx              # Dashboard home (/)
      contacts.tsx           # Contacts page (/contacts)
      contacts/$id.tsx       # Contact detail (/contacts/:id)
  main.tsx                   # App entry, router setup
  index.css                  # Tailwind import + theme tokens
```

## Stack Components

| Component | Version / Package | Purpose |
|---|---|---|
| React | 19.x | UI library |
| TanStack Router | `@tanstack/react-router` 1.x | File-based routing, type-safe |
| Vite | 6.x | Build tool / dev server |
| Tailwind CSS | 4.x (`@tailwindcss/vite`) | Styling (no config file needed) |
| BiomeJS | `@biomejs/biome` 2.x | Linter + formatter (replaces ESLint + Prettier) |
| Supabase | `@supabase/supabase-js` | Auth + DB client |
| clsx + tailwind-merge | utility deps | `cn()` class merge utility |
| lucide-react | icon set | Tree-shakeable icons |

## Naming Conventions

- Files: `kebab-case.tsx` (e.g., `scroll-area.tsx`)
- Components: `PascalCase` (e.g., `ScrollArea`)
- Exports: named exports, no default exports (matches shadcn convention, better for tree-shaking)
- Index barrel: `src/components/ui/index.ts` re-exporting all primitives (optional but convenient)

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "biome check --write",
    "format": "biome format --write",
    "check": "biome ci"
  }
}
```

## Cross-References

- Routing conventions: see `tanstack-router.md`
- Vite + Tailwind + Biome config: see `vite-config.md`
- Supabase client: see `supabase-client.md`
- Auth flow patterns: see `auth-patterns.md`

## Sources

- TanStack Router quick start: https://tanstack.com/router/v1/docs/quick-start
- TanStack Router Vite installation: https://tanstack.com/router/v1/docs/installation/with-vite
- Tailwind CSS v4 docs: https://tailwindcss.com/docs
- BiomeJS getting started: https://biomejs.dev/guides/getting-started/