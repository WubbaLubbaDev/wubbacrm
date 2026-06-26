# WubbaCRM — Scaffold + Auth Review

**Phase:** Phase 0 — Scaffold & Supabase Auth
**Reviewer:** reviewer profile
**Date:** 2026-06-24
**Commits reviewed:** 13a556d (initial review) → 3f87f0c (fix)
**Final verdict:** APPROVED (after fix)

> **Related issue module:** `auth-review.md` — recurring auth patterns to check against in future reviews.

---

## Summary

The WubbaCRM scaffold is structurally sound — React 19 + TanStack Router + Vite 6 + Tailwind v4 + BiomeJS + Supabase are all correctly wired. The build, lint, type-check, and tests all pass clean. No secrets are committed. The code is pushed to WubbaLubbaDev/wubbacrm.

The initial review found one functional bug: the logout flow did not redirect to `/login`. The coder fixed it with an `onAuthStateChange` listener in `__root.tsx` (commit 3f87f0c). The fix was re-reviewed and approved. Full history is below.

---

## Verification Results (initial — commit 13a556d)

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

### 4. Supabase Auth — initially CHANGES REQUESTED, now APPROVED

#### 4a. Supabase client wrapper (`src/lib/supabase.ts`) — PASS

Correct implementation. Reads `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, validates their presence with a clear error message, creates the client. Clean.

#### 4b. Login page (`src/routes/login.tsx`) — PASS

Functional email/password form with proper state management (email, password, error, loading). Calls `supabase.auth.signInWithPassword()`, displays errors, navigates to `/` on success. Inputs have `required` attributes, proper `type="email"` and `type="password"`. Tailwind-styled. Good.

#### 4c. Protected route redirect (`src/routes/_authenticated.tsx`) — PASS

Uses `beforeLoad` + `supabase.auth.getSession()` + `throw redirect({ to: '/login' })`. This is the correct TanStack Router pattern. Unauthenticated users will be redirected before the route loads.

#### 4d. Protected page + logout — fixed (see Update below)

The page renders "Hello World" with a logout button. The logout flow was initially broken (no redirect after signOut). Fixed in commit 3f87f0c — see the Update section at the bottom.

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

### 8. README — PASS (after fix)

README is clear and comprehensive: tech stack, prerequisites, setup steps, env var configuration, project structure, auth flow description, available scripts table, Supabase config notes. Setup instructions are complete — a new developer could clone and run this.

The "Auth Flow" section states logout redirects back to `/login`. This was initially inaccurate (the code didn't perform the redirect), but is now accurate after the fix in commit 3f87f0c.

---

## Findings Requiring Changes (initial review)

### F1: Logout does not redirect to /login (FUNCTIONAL BUG)

**File:** `src/routes/_authenticated/index.tsx:9-11`
**Severity:** CHANGES REQUESTED (initially) → RESOLVED in 3f87f0c

```typescript
const handleLogout = async () => {
  await supabase.auth.signOut();
};
```

After `signOut()`, the session was destroyed, but there was no navigation or auth-state listener, so the user remained on the "Hello World" page. The fix is documented in the Update section below.

---

## Non-Blocking Observations

### O1: Empty `docs/` and `tests/` directories in workspace

These directories existed in the workspace but were empty and not tracked by git. No action needed.

### O2: `routeTree.gen.ts` is committed to git

The `.gitignore` comment says "routeTree.gen.ts is committed for CI builds but ignored by linter." The file IS tracked by git and IS excluded from Biome via `biome.json`. This is a valid approach (committing the generated file ensures CI builds work without regenerating it first). Acceptable.

### O3: Main bundle size (498 kB / 146 kB gzipped)

The index chunk includes React 19 + TanStack Router + Supabase JS. Expected for a scaffold with these dependencies. Not a blocker at this stage — can be addressed with manual chunk configuration later if needed.

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

---

## Update — Logout Fix (commit 3f87f0c, re-reviewed 2026-06-24)

**Re-review verdict:** APPROVED

The coder addressed Finding F1 by implementing Option B (the recommended approach): an `onAuthStateChange` listener in `src/routes/__root.tsx` that calls `router.invalidate()` on auth state changes. This causes the `beforeLoad` guard in `_authenticated.tsx` to re-run, which calls `getSession()` and redirects to `/login` when the session is gone. The fix handles both explicit logout and token expiry.

### Fix details

**File changed:** `src/routes/__root.tsx` (only file in the diff)

The change adds:
1. `useRouter` import from `@tanstack/react-router`
2. `useEffect` import from React
3. `supabase` import from `@/lib/supabase`
4. An `onAuthStateChange` subscription in `RootComponent` that calls `router.invalidate()` on any auth state change
5. Proper cleanup: `subscription.subscription.unsubscribe()` in the effect's return function

### Redirect chain (verified)

1. User clicks Logout → `handleLogout` calls `supabase.auth.signOut()` (`_authenticated/index.tsx:10`)
2. Supabase fires `onAuthStateChange` event → listener in `__root.tsx:13` calls `router.invalidate()`
3. `router.invalidate()` triggers re-evaluation of route guards → `beforeLoad` in `_authenticated.tsx:5` re-runs
4. `beforeLoad` calls `supabase.auth.getSession()` → session is null → `throw redirect({ to: '/login' })`
5. User is redirected to `/login`

### Code quality of the fix

- The `useEffect` dependency array correctly includes `router` (stable reference from TanStack Router)
- Subscription cleanup is correct — `onAuthStateChange` returns `{ data: { subscription } }` and the cleanup calls `subscription.subscription.unsubscribe()`
- No unnecessary re-subscriptions since `router` is stable
- Comment explains the purpose clearly

### Re-review verification (commit 3f87f0c)

| Check | Result |
|-------|--------|
| `npm run build` | PASS — 167 modules, 0 errors |
| `npm run lint` | PASS — 18 files, no fixes needed |
| `npm run check` | PASS — 18 files, no fixes needed |
| `npm run test` | PASS — 1 test passed |
| Git push to origin/main | PASS — HEAD = origin/main = 3f87f0c |
| Secrets in diff | CLEAN |

### F1 resolution

**Status:** RESOLVED. The coder implemented Option B exactly as recommended. The diff is minimal and focused — no drive-by changes, no scope creep. The README is now accurate. No new issues were introduced.

---

## Review History

| Date | Commit | Verdict | Note |
|------|--------|---------|------|
| 2026-06-24 | 13a556d | CHANGES REQUESTED | F1: logout does not redirect to /login |
| 2026-06-24 | 3f87f0c | APPROVED | F1 resolved via onAuthStateChange listener in __root.tsx |