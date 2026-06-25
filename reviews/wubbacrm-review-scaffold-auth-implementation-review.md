# Review: WubbaCRM Scaffold + Auth Implementation

**Task:** t_c93b4b40 — Review scaffold + auth implementation
**Reviewer:** reviewer profile
**Date:** 2026-06-24
**Commit reviewed:** 13a556d (main, pushed to origin/main)
**Verdict:** CHANGES REQUESTED

---

## Summary

The scaffold is structurally sound — React 19 + TanStack Router + Vite 6 + Tailwind v4 + BiomeJS + Supabase are all correctly wired. The build, lint, type-check, and tests all pass clean. No secrets are committed. The code is pushed to WubbaLubbaDev/wubbacrm.

However, there is one functional bug: **the logout flow does not redirect the user to `/login`**. The README and task spec both state that logout should redirect back to `/login`, but the implementation calls `signOut()` with no subsequent navigation or auth-state listener. This is a broken auth flow that must be fixed.

---

## Verification Results

| Check | Result |
|-------|--------|
| `npm run build` (tsc -b && vite build) | PASS — 167 modules, 0 errors, exit 0 |
| `npm run lint` (biome check --write) | PASS — 18 files, no fixes needed |
| `npm run check` (biome ci) | PASS — 18 files, no fixes needed |
| `npm run test` (vitest run) | PASS — 1 test passed (sanity) |
| `npm run format` (biome format --write) | PASS — 17 files, no fixes needed |
| Git push to origin/main | PASS — HEAD = origin/main = 13a556d |
| Secrets in git history | CLEAN — no real keys committed |
| .env.local gitignored | PASS — not tracked, .gitignore covers .env, .env.local, .env.*.local |
| .env.example present | PASS — placeholder values only |

---

## Checklist Findings

### 1. Project Structure — PASS

The scaffold is correct and minimal. File-based routing with `@tanstack/router-plugin` in `vite.config.ts`, plugin order is correct (tanstackRouter → react → tailwindcss). Path alias `@` → `./src` configured in both `vite.config.ts` and `tsconfig.app.json`. TypeScript strict mode enabled. No unnecessary files or scope creep.

Tracked files (23 total) are all purposeful — no leftover scaffold cruft in git.

### 2. Tailwind CSS v4 — PASS

Configured via `@tailwindcss/vite` plugin (v4 approach, not PostCSS). `src/index.css` contains `@import "tailwindcss";`. Build produces a 9.48 kB CSS bundle. Tailwind utility classes are used throughout the login and home pages. Working correctly.

### 3. BiomeJS — PASS

`biome.json` uses v2.5.1 schema with sensible React defaults: recommended preset, 2-space indent, single quotes, semicolons, 100-char line width. `routeTree.gen.ts` excluded via `files.includes` negation pattern (`!**/src/routeTree.gen.ts`). `dist`, `node_modules`, `coverage` also excluded. Lint and CI check both pass clean.

### 4. Supabase Auth — CHANGES REQUESTED

#### 4a. Supabase client wrapper (`src/lib/supabase.ts`) — PASS
Correct implementation. Reads `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, validates their presence with a clear error message, creates the client. Clean.

#### 4b. Login page (`src/routes/login.tsx`) — PASS
Functional email/password form with proper state management (email, password, error, loading). Calls `supabase.auth.signInWithPassword()`, displays errors, navigates to `/` on success. Inputs have `required` attributes, proper `type="email"` and `type="password"`. Tailwind-styled. Good.

#### 4c. Protected route redirect (`src/routes/_authenticated.tsx`) — PASS
Uses `beforeLoad` + `supabase.auth.getSession()` + `throw redirect({ to: '/login' })`. This is the correct TanStack Router pattern. Unauthenticated users will be redirected before the route loads.

#### 4d. Protected page "Hello World" (`src/routes/_authenticated/index.tsx`) — PASS (rendering) / FAIL (logout)
The page renders "Hello World" with a logout button. However, the logout flow is broken — see Finding F1 below.

### 5. Security — PASS

- No real secrets in git history. The research brief contains truncated key prefixes only (`sb_publishable_DzPG1...`, `sb_secret_VUb-p...`) — not usable values.
- `.env.local` exists locally with real values but is NOT tracked by git (confirmed via `git ls-files`).
- `.gitignore` covers `.env`, `.env.local`, `.env.*.local`.
- `.env.example` is tracked with placeholder values (`your-project-ref.supabase.co`, `your-publishable-key-here`).
- No service_role keys or `SUPABASE_ACCESS_TOKEN` anywhere in the codebase.

### 6. Build — PASS

`npm run build` completes without errors. Output:
- `dist/assets/index-BUABKk2P.js` — 498.52 kB (146.20 kB gzipped) — main chunk (React + TanStack Router + Supabase)
- `dist/assets/login-DXKtTVRr.js` — 1.68 kB (code-split login route)
- `dist/assets/_authenticated-8Ga3ukLI.js` — 0.10 kB (code-split protected route)
- `dist/assets/index-CInM83-B.css` — 9.48 kB (Tailwind)

Auto code splitting is working (login and _authenticated are separate chunks).

### 7. Git — PASS

Code is pushed to `WubbaLubbaDev/wubbacrm` on `main`. Local HEAD (13a556d) = origin/main (13a556d). Working tree clean.

### 8. README — PASS (with one inaccuracy)

README is clear and comprehensive: tech stack, prerequisites, setup steps, env var configuration, project structure, auth flow description, available scripts table, Supabase config notes. Setup instructions are complete — a new developer could clone and run this.

**Inaccuracy:** The "Auth Flow" section states "Logout button calls `supabase.auth.signOut()` and user is redirected back to `/login`" — but the code does not perform this redirect. See Finding F1.

---

## Findings Requiring Changes

### F1: Logout does not redirect to /login (FUNCTIONAL BUG)

**File:** `src/routes/_authenticated/index.tsx:9-11`
**Severity:** CHANGES REQUESTED

```typescript
const handleLogout = async () => {
  await supabase.auth.signOut();
};
```

After `signOut()`, the session is destroyed, but:
1. There is no `navigate({ to: '/login' })` call after `signOut()`.
2. There is no `onAuthStateChange` listener anywhere in the app (confirmed by searching all source files).
3. The `beforeLoad` guard in `_authenticated.tsx` only runs on route entry — it does NOT re-run when the auth state changes while already on the protected page.

**Result:** The user clicks "Logout", the session is gone, but the user remains on the "Hello World" page. The stated behavior in the README ("user is redirected back to `/login`") does not happen. If the user manually refreshes, `beforeLoad` would then redirect them — but without a refresh, the user stays on a page that should require auth.

**Fix (either approach):**

Option A (minimal — explicit navigation):
```typescript
import { useNavigate } from '@tanstack/react-router';

// In handleLogout:
const navigate = useNavigate();
const handleLogout = async () => {
  await supabase.auth.signOut();
  navigate({ to: '/login' });
};
```

Option B (robust — auth state listener in root route):
```typescript
// In src/routes/__root.tsx
import { createRootRoute, Outlet, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function RootComponent() {
  const router = useRouter();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
    });
    return () => subscription.unsubscribe();
  }, [router]);
  return <Outlet />;
}
```

Option B is recommended because it also handles session expiry while the page is open, not just explicit logout. With Option B, `router.invalidate()` triggers `beforeLoad` to re-run, which will redirect to `/login` when the session is gone.

---

## Non-Blocking Observations

### O1: Empty `docs/` and `tests/` directories in workspace
These directories exist in the workspace but are empty and not tracked by git. They appear to be leftover from the initial project creation. No action needed — they won't affect anything since they're not in git.

### O2: `routeTree.gen.ts` is committed to git
The `.gitignore` comment says "routeTree.gen.ts is committed for CI builds but ignored by linter." The file IS tracked by git and IS excluded from Biome via `biome.json`. This is a valid approach (committing the generated file ensures CI builds work without regenerating it first). Not a blocker, but some teams prefer to gitignore it and generate on build. The current approach is acceptable.

### O3: Main bundle size (498 kB / 146 kB gzipped)
The index chunk includes React 19 + TanStack Router + Supabase JS. This is expected for a scaffold with these dependencies. Not a blocker at this stage — can be addressed with manual chunk configuration or dependency analysis later if needed.

---

## What Must Change Before Approval

1. **Fix the logout redirect (F1).** Either add explicit `navigate({ to: '/login' })` after `signOut()`, or add an `onAuthStateChange` listener in the root route that calls `router.invalidate()`. The recommended approach is the auth state listener (Option B) as it also handles session expiry.

2. **Update the README if the fix differs from the documented behavior.** If you implement Option A (explicit navigate), the README is already accurate. If you implement Option B (listener), the README description is still accurate since the redirect happens via router invalidation.

---

## What Is Good

- Clean, minimal scaffold — no scope creep, no unnecessary dependencies
- Correct plugin ordering in Vite config (tanstackRouter before react before tailwindcss)
- Proper env var validation with actionable error message in `supabase.ts`
- Correct TanStack Router `beforeLoad` + `redirect` pattern for route protection
- Auto code splitting is working (login and authenticated routes are separate chunks)
- All tooling passes: build, lint, type-check, format, tests
- No secrets committed, proper `.gitignore` and `.env.example`
- Code is pushed to the correct remote/branch
- README is comprehensive and well-structured
- TypeScript strict mode is enabled
- Biome config is sensible and excludes generated files