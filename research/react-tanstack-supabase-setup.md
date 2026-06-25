# React + TanStack Router + Supabase Setup Reference

## Overview

This document is the foundational reference for WubbaCRM's web stack: React 19, TanStack Router (file-based routing), Vite, Tailwind CSS v4, BiomeJS, and Supabase authentication. Future phases can refer back to this for stack configuration, Supabase project details, and auth flow patterns without needing to re-research.

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

## Project Structure

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

### TanStack Router file-based routing conventions
- Routes directory: `./src/routes`
- Generated route tree: `./src/routeTree.gen.ts` (auto-generated, never manually edited)
- Route file ignore prefix: `-` (files starting with `-` are not counted as routes)
- Pathless layout routes: prefixed with `_` (e.g., `_authenticated.tsx` — not a URL segment, acts as layout wrapper)

## Vite Configuration

The `@tanstack/router-plugin` must be placed BEFORE `@vitejs/plugin-react` in the plugins array:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
})
```

### Tailwind CSS v4

No `tailwind.config.js` or `postcss.config.js` needed. The Vite plugin auto-detects template files.

Installation:
```shell
npm install tailwindcss @tailwindcss/vite
```

CSS entry point (e.g., `src/index.css`):
```css
@import "tailwindcss";
```

That's it — the Vite plugin handles scanning and purging automatically.

## BiomeJS Configuration

Biome is a zero-config linter/formatter (Rust-based) replacing ESLint + Prettier.

Installation:
```shell
npm install -D -E @biomejs/biome
npx @biomejs/biome init
```

`biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "files": {
    "ignore": [
      "src/routeTree.gen.ts",
      "dist",
      "node_modules"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always"
    }
  }
}
```

**Gotcha:** `routeTree.gen.ts` must be in `files.ignore` — it's auto-generated and should not be linted/formatted.

### Package.json scripts
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

## Supabase Setup

### Project Details

| Property | Value |
|---|---|
| **Project name** | WubbaCRM |
| **Project ref/ID** | `ilzybrpxitjcdcoxuqak` |
| **Organization ID** | `cxzjihxdzhkbndhhkzgb` |
| **Region** | `ap-southeast-1` (Singapore) |
| **Database host** | `db.ilzybrpxitjcdcoxuqak.supabase.co` |
| **Project URL** | `https://ilzybrpxitjcdcoxuqak.supabase.co` |
| **Postgres version** | 17.6.1.127 |

### API Keys

The project has legacy keys (deprecated end of 2026) and new publishable/secret keys:

| Key type | Prefix | Status |
|---|---|---|
| legacy anon | `9KJYA...` | Deprecated end of 2026 |
| legacy service_role | `echff...` | Deprecated end of 2026 |
| **publishable** (new) | `sb_publishable_DzPG1...` | **Recommended for client-side** |
| secret (new) | `sb_secret_VUb-p...` | Server-side only |

**For the web app (client-side), use the publishable key.** It works as a drop-in replacement for the legacy anon key in `@supabase/supabase-js`.

**Security:** Never hardcode keys in source or commit them to git. Retrieve at build time via:
1. Supabase Dashboard (Settings > API Keys)
2. Supabase Management API: `GET /v1/projects/ilzybrpxitjcdcoxuqak/api-keys` (requires `SUPABASE_ACCESS_TOKEN`)

```shell
curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/ilzybrpxitjcdcoxuqak/api-keys" | \
  python3 -c "import json,sys; [print(k['api_key']) for k in json.load(sys.stdin) if k['type']=='publishable']"
```

### Auth Configuration

| Setting | Value |
|---|---|
| **Site URL** | `http://localhost:3000` |
| **Signup disabled** | `false` (signups enabled) |
| **External email enabled** | `true` |
| **Refresh token rotation** | `true` |

Email/password auth is enabled by default. `signInWithPassword()` and `signUp()` work without additional dashboard configuration.

**Local dev gotcha:** The Supabase site URL is `http://localhost:3000` but Vite dev server runs on `http://localhost:5173`. Either:
- Update the site URL in Supabase dashboard to `http://localhost:5173`, OR
- Add `http://localhost:5173` to the redirect URLs (Auth > URL Configuration)

### Supabase Client Module

Install:
```shell
npm install @supabase/supabase-js
```

Create `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Key Auth Methods

| Method | Purpose |
|---|---|
| `supabase.auth.signUp({ email, password })` | Register a new user |
| `supabase.auth.signInWithPassword({ email, password })` | Login with email + password |
| `supabase.auth.signOut()` | Log out |
| `supabase.auth.getSession()` | Get current session (check if logged in) |
| `supabase.auth.onAuthStateChange(callback)` | Subscribe to auth state changes |
| `supabase.auth.getUser()` | Get current user object |

## Auth Flow Patterns

### Pattern 1: Protected Layout Route (`beforeLoad` + `getSession`)

The `_authenticated.tsx` layout route guards all protected pages. Before loading, it checks for a session and redirects to `/login` if none exists:

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw redirect({ to: '/login' })
    }
  },
})
```

### Pattern 2: Login Page

Login form with email + password. On submit, calls `signInWithPassword()`. On success, navigates to `/`:

```tsx
import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      navigate({ to: '/' })
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="block w-64 rounded border p-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="block w-64 rounded border p-2"
        />
        {error && <p className="text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="rounded bg-blue-500 px-4 py-2 text-white">
          {loading ? 'Loading...' : 'Login'}
        </button>
      </form>
    </div>
  )
}
```

### Pattern 3: Logout

```tsx
const handleLogout = async () => {
  await supabase.auth.signOut()
}
```

After `signOut()`, the `onAuthStateChange` listener (in root route) detects the `SIGNED_OUT` event and the router can redirect to `/login`.

### Pattern 4: Auth State Listener (`onAuthStateChange`)

Set up in the root route or app entry to react to login/logout events and trigger router refreshes:

```tsx
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Inside root route component:
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    // Handle auth state change — e.g., invalidate router, update context
  })
  return () => subscription.unsubscribe()
}, [])
```

### Pattern 5: Protected Page

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
})

function HomePage() {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Hello World</h1>
      <button onClick={handleLogout} className="rounded bg-gray-500 px-4 py-2 text-white">
        Logout
      </button>
    </div>
  )
}
```

## Environment Variables

| Variable | Value | Source |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://ilzybrpxitjcdcoxuqak.supabase.co` | This document |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` (full value from API) | Supabase Management API or dashboard |
| `SUPABASE_ACCESS_TOKEN` | (in env) | Used only for retrieving keys, not needed in the app |

`.env.local`:
```env
VITE_SUPABASE_URL=https://ilzybrpxitjcdcoxuqak.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key from dashboard or API>
```

**Note:** The env var name `VITE_SUPABASE_ANON_KEY` is used per the task spec. The new publishable key (`sb_publishable_xxx`) works as a drop-in replacement for the legacy anon key. Supabase docs now call it `VITE_SUPABASE_PUBLISHABLE_KEY`, but either name works as long as the code references the same env var.

Add `.env.local` to `.gitignore` (the scaffold should already do this).

## Key Code Snippets

### `cn()` utility (`src/lib/utils.ts`)

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Dashboard layout wiring in `_authenticated.tsx`

```tsx
function AuthenticatedLayout() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
```

The dashboard chrome (sidebar + header) lives in the `_authenticated.tsx` layout component. Every authenticated page inherits it automatically. The login page (`/login`) is outside this group, so it gets no dashboard chrome.

## Gotchas

1. **`routeTree.gen.ts`** — Auto-generated by `@tanstack/router-plugin`. Never manually edit. Add to Biome's `files.ignore`. VSCode users should mark it read-only.

2. **Tailwind v4 vs v3** — No `tailwind.config.js` needed in v4. Theme is defined in CSS via `@theme inline { ... }`. Don't use the old PostCSS approach.

3. **Supabase site URL mismatch** — Default is `http://localhost:3000`, Vite runs on `http://localhost:5173`. Update the dashboard or add redirect URL.

4. **Publishable vs anon key** — The new `sb_publishable_xxx` key replaces the legacy anon key. Both work for now, but legacy keys are deprecated end of 2026.

5. **Email confirmation** — Enabled by default on hosted Supabase. For local dev, disable in dashboard (Auth > Providers > Email > Confirm email = off) or users must confirm before logging in.

6. **TanStack Router API version** — The code examples use the v1 API (`createFileRoute`, `beforeLoad`, `redirect`). If a newer version is installed, verify against that version's docs.

## Sources

- TanStack Router quick start: https://tanstack.com/router/v1/docs/quick-start
- TanStack Router Vite installation: https://tanstack.com/router/v1/docs/installation/with-vite
- Tailwind CSS v4 docs: https://tailwindcss.com/docs
- BiomeJS getting started: https://biomejs.dev/guides/getting-started/
- Supabase React auth quickstart: https://supabase.com/docs/guides/auth/quickstarts/react
- Supabase password auth: https://supabase.com/docs/guides/auth/passwords