# Research Brief: WubbaCRM Scaffold + Supabase Auth Setup

## Objective

Determine the best approach for scaffolding a React + TanStack Router project with Tailwind CSS v4 and BiomeJS, integrated with Supabase authentication. Provide the Coder with exact steps, configs, and Supabase project details to build a working scaffold where a user can log in and see "Hello World" on an authenticated page.

---

## Findings

### 1. Project Scaffold: React + TanStack Router (Vite)

**Recommended approach:** Use the official TanStack CLI to scaffold, then customize.

The TanStack Router project offers a dedicated scaffolding CLI:

```shell
npx @tanstack/cli create --router-only
```

This launches an interactive prompt that lets you choose:
- File-based or code-based routing (file-based is recommended)
- TypeScript support
- Tailwind CSS integration (the CLI can add it for you)
- Git initialization

The CLI generates a Vite + React + TanStack Router project with `@tanstack/router-plugin` already wired into `vite.config.ts`.

**Alternative (manual):** Scaffold with `npm create vite@latest -- --template react-ts`, then install `@tanstack/react-router` and `@tanstack/router-plugin` manually. This gives more control but requires manual Vite config setup.

**Recommendation:** Use the CLI scaffold (`npx @tanstack/cli create --router-only`) for speed, then add BiomeJS and Supabase manually. The CLI can optionally add Tailwind CSS too, but we'll verify/configure it manually to ensure v4 specifics are correct.

**Sources:**
- https://tanstack.com/router/v1/docs/quick-start
- https://tanstack.com/router/v1/docs/installation/with-vite

#### Key Vite Config (file-based routing)

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

**Important:** The generated `routeTree.gen.ts` file should be ignored by Biome (add to `files.ignore` in `biome.json`) and should not be manually edited. VSCode users should mark it read-only.

#### Default file-based routing config (from the plugin):
- Routes directory: `./src/routes`
- Generated route tree: `./src/routeTree.gen.ts`
- Route file ignore prefix: `-` (files starting with `-` are not counted as routes)

---

### 2. Tailwind CSS v4 Setup

Tailwind CSS v4 ships with a first-class Vite plugin — no more `tailwind.config.js`, `postcss.config.js`, or content array configuration needed. The plugin auto-detects template files.

**Installation:**

```shell
npm install tailwindcss @tailwindcss/vite
```

**Vite config:** Add `tailwindcss()` to the plugins array (shown in the Vite config above).

**CSS entry point:** In your main CSS file (e.g., `src/index.css` or `src/style.css`), add a single line:

```css
@import "tailwindcss";
```

That's it. No config file required for v4. The Vite plugin handles scanning and purging automatically.

**Note:** The TanStack CLI scaffold can add Tailwind for you during setup. If it does, verify that it uses `@tailwindcss/vite` (v4 approach) and not the older PostCSS approach.

**Sources:**
- https://tailwindcss.com/docs (official v4 Vite installation guide)

---

### 3. BiomeJS Setup

Biome is a zero-config linter and formatter that replaces ESLint + Prettier. It's fast (Rust-based) and handles formatting, linting, and import organizing in one tool.

**Installation:**

```shell
npm install -D -E @biomejs/biome
```

**Initialization:**

```shell
npx @biomejs/biome init
```

This creates a `biome.json` config file. The recommended config for a React + TanStack Router project:

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

**Note on `routeTree.gen.ts`:** This auto-generated file must be excluded from Biome's linter/formatter. Use `files.ignore` in `biome.json` (shown above).

**Package.json scripts:**

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

**Sources:**
- https://biomejs.dev/guides/getting-started/

---

### 4. Supabase Auth: Project Details & Configuration

#### 4.1 Supabase Project Details (via Management API)

The WubbaCRM Supabase project has been created and is active:

| Property | Value |
|---|---|
| **Project name** | WubbaCRM |
| **Project ref/ID** | `ilzybrpxitjcdcoxuqak` |
| **Organization ID** | `cxzjihxdzhkbndhhkzgb` |
| **Region** | `ap-southeast-1` (Singapore) |
| **Status** | `ACTIVE_HEALTHY` |
| **Database host** | `db.ilzybrpxitjcdcoxuqak.supabase.co` |
| **Project URL** | `https://ilzybrpxitjcdcoxuqak.supabase.co` |
| **Postgres version** | 17.6.1.127 |
| **Created** | 2026-06-24 |

#### 4.2 API Keys

The project has both legacy keys and the new publishable/secret keys:

| Key type | Name | Prefix | Status |
|---|---|---|---|
| legacy anon | anon | `9KJYA...` | Available (deprecated end of 2026) |
| legacy service_role | service_role | `echff...` | Available (deprecated end of 2026) |
| **publishable** (new) | default | `sb_publishable_DzPG1...` | **Recommended for client-side** |
| secret (new) | default | `sb_secret_VUb-p...` | For server-side only |

**For the web app (client-side), use the publishable key.** The legacy `anon` key also works but will be deprecated by end of 2026.

**IMPORTANT:** The actual key values must NOT be hardcoded in the brief or committed to git. The Coder should retrieve them at build time. The keys are available via:
1. The Supabase Dashboard (Settings > API Keys)
2. The Supabase Management API: `GET /v1/projects/ilzybrpxitjcdcoxuqak/api-keys` (requires `SUPABASE_ACCESS_TOKEN`)

The Coder should create a `.env.local` file with:
```env
VITE_SUPABASE_URL=https://ilzybrpxitjcdcoxuqak.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key from dashboard or API>
```

Note: The env var name `VITE_SUPABASE_ANON_KEY` is used per the task spec. The new publishable key (`sb_publishable_xxx`) works as a drop-in replacement for the legacy anon key in `@supabase/supabase-js`. The Supabase docs now call it `VITE_SUPABASE_PUBLISHABLE_KEY`, but either name works as long as the code references the same env var.

#### 4.3 Auth Configuration (current state)

Queried via Management API (`GET /v1/projects/{ref}/config/auth`):

| Setting | Value |
|---|---|
| **Site URL** | `http://localhost:3000` |
| **Signup disabled** | `false` (signups enabled) |
| **External email enabled** | `true` |
| **Refresh token rotation** | `true` |

Email/password auth is **enabled by default**. No additional configuration needed in the Supabase dashboard to use `signInWithPassword()` and `signUp()`.

**For local development:** The site URL is set to `http://localhost:3000`. The Vite dev server runs on `http://localhost:5173` by default. The Coder should either:
- Update the site URL in the Supabase dashboard to `http://localhost:5173`, OR
- Add `http://localhost:5173` to the redirect URLs in the dashboard (Auth > URL Configuration)

#### 4.4 Supabase Client Integration with React

Install the client library:

```shell
npm install @supabase/supabase-js
```

Create a Supabase client module (`src/lib/supabase.ts`):

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Key auth methods for email/password:**

| Method | Purpose |
|---|---|
| `supabase.auth.signUp({ email, password })` | Register a new user |
| `supabase.auth.signInWithPassword({ email, password })` | Login with email + password |
| `supabase.auth.signOut()` | Log out |
| `supabase.auth.getSession()` | Get current session (check if logged in) |
| `supabase.auth.onAuthStateChange(callback)` | Subscribe to auth state changes |
| `supabase.auth.getUser()` | Get current user object |

**Sources:**
- https://supabase.com/docs/guides/auth/quickstarts/react
- https://supabase.com/docs/guides/auth/passwords

---

### 5. Auth Flow: Minimal Login + Protected Route Pattern

#### Recommended file structure (TanStack Router file-based):

```
src/
  lib/
    supabase.ts              # Supabase client
  routes/
    __root.tsx               # Root route (layout, auth provider)
    login.tsx                # Login page (/login)
    _authenticated.tsx       # Layout route for protected pages (redirects to /login if not authed)
    _authenticated/
      index.tsx              # Protected home page (/) -> "Hello World"
  main.tsx                   # App entry, router setup
  index.css                  # Tailwind import
```

#### Auth pattern:

1. **Login route (`/login`):** Simple form with email + password. On submit, calls `supabase.auth.signInWithPassword()`. On success, navigate to `/`.

2. **Protected layout route (`_authenticated.tsx`):** This is a layout route (prefix `_` means it's not a URL segment). Before loading, it checks `supabase.auth.getSession()`. If no session, redirect to `/login`. This is done using TanStack Router's `beforeLoad` hook:

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

3. **Protected index (`/`):** Shows "Hello World" and a logout button.

4. **Auth state listener:** In the root route or app entry, set up `onAuthStateChange` to react to login/logout events and trigger router refreshes.

#### Login page example (`src/routes/login.tsx`):

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

#### Protected page example (`src/routes/_authenticated/index.tsx`):

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

---

## Recommendation

1. **Scaffold** with `npx @tanstack/cli create --router-only` (file-based routing, TypeScript, Tailwind CSS enabled).
2. **Add BiomeJS** via `npm install -D -E @biomejs/biome && npx @biomejs/biome init`, then configure `biome.json` to ignore `routeTree.gen.ts`.
3. **Add Supabase** via `npm install @supabase/supabase-js`, create `src/lib/supabase.ts` client module.
4. **Configure env vars** in `.env.local` with the project URL and publishable key.
5. **Build the auth flow** with a login route, a protected layout route using `beforeLoad` + `getSession()`, and a protected index page showing "Hello World".
6. **Update Supabase site URL** to `http://localhost:5173` (or add it to redirect URLs) so auth redirects work with the Vite dev server.

---

## Implementation Notes (for the Coder)

### Step-by-step:

1. **Scaffold the project:**
   ```shell
   cd ~/projects/wubbacrm
   npx @tanstack/cli create --router-only
   ```
   Choose: file-based routing, TypeScript yes, Tailwind CSS yes, Git yes.
   This will create the project in the current or a subdirectory — move files to the project root if needed.

2. **Verify Tailwind CSS v4:**
   - Check `vite.config.ts` has `@tailwindcss/vite` plugin
   - Check `src/index.css` (or equivalent) has `@import "tailwindcss";`
   - If the CLI used the older PostCSS approach, replace with the Vite plugin method

3. **Install BiomeJS:**
   ```shell
   npm install -D -E @biomejs/biome
   npx @biomejs/biome init
   ```
   Edit `biome.json` — add `src/routeTree.gen.ts` to `files.ignore`.

4. **Install Supabase client:**
   ```shell
   npm install @supabase/supabase-js
   ```

5. **Create `.env.local`:**
   ```env
   VITE_SUPABASE_URL=https://ilzybrpxitjcdcoxuqak.supabase.co
   VITE_SUPABASE_ANON_KEY=<retrieve from Supabase dashboard or Management API>
   ```
   Retrieve the publishable key via:
   ```shell
   curl -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
     "https://api.supabase.com/v1/projects/ilzybrpxitjcdcoxuqak/api-keys" | \
     python3 -c "import json,sys; [print(k['api_key']) for k in json.load(sys.stdin) if k['type']=='publishable']"
   ```

6. **Create `src/lib/supabase.ts`** — the Supabase client module (see code above).

7. **Create routes:**
   - `src/routes/login.tsx` — login page
   - `src/routes/_authenticated.tsx` — protected layout route with `beforeLoad` session check
   - `src/routes/_authenticated/index.tsx` — "Hello World" page

8. **Set up root route** (`src/routes/__root.tsx`) — optionally add `onAuthStateChange` listener.

9. **Add `.env.local` to `.gitignore`** (the scaffold should already do this).

10. **Update Supabase auth redirect URL:** In the Supabase dashboard, go to Auth > URL Configuration and add `http://localhost:5173` to the redirect URLs. Or update the site URL to `http://localhost:5173`.

11. **Test the flow:**
    - Start dev server: `npm run dev`
    - Navigate to `http://localhost:5173` → should redirect to `/login`
    - Create a test user via Supabase dashboard (Authentication > Users > Add user) or via `signUp()`
    - Login → should see "Hello World"
    - Logout → should redirect back to `/login`

### Environment variables the Coder needs:

| Variable | Value | Source |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://ilzybrpxitjcdcoxuqak.supabase.co` | From this brief |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_DzPG1...` (full value from API) | Supabase Management API or dashboard |
| `SUPABASE_ACCESS_TOKEN` | (already in env) | Used only for retrieving keys, not needed in the app |

### Supabase Management API endpoint for key retrieval:
```
GET https://api.supabase.com/v1/projects/ilzybrpxitjcdcoxuqak/api-keys
Authorization: Bearer $SUPABASE_ACCESS_TOKEN
```

---

## Open Questions

1. **Email confirmation:** Email verification is enabled by default on hosted Supabase. For the scaffold, should signups require email confirmation, or should we disable it for local dev? If keeping it enabled, the Coder should note that users must confirm their email before they can log in. Disabling it for dev can be done in the dashboard (Auth > Providers > Email > Confirm email = off).

2. **Signup flow:** The task asks for login, but should the scaffold also include a signup page? Currently the brief covers login only. The Coder can add a simple signup form or the user can create test users via the Supabase dashboard.

3. **TanStack Router version:** The CLI may scaffold with the latest stable version. The code examples in this brief use the v1 API (`createFileRoute`, `beforeLoad`, `redirect`). If the CLI installs v2 or a newer version, the API may differ slightly — the Coder should verify against the installed version's docs.