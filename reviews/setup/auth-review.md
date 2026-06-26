# Auth Issues — Recurring Patterns & Regression Checklist

Focused list of auth-specific findings from WubbaCRM reviews. Check these against every feature that touches authentication, session management, or route guards. Patch this file when a new auth issue pattern is discovered.

---

## AI1: Logout without redirect (Phase 0, F1 — RESOLVED)

**Symptom:** `supabase.auth.signOut()` is called but the user stays on the protected page. No navigation occurs.

**Root cause:** `signOut()` destroys the session but does not trigger any client-side navigation. Without an auth-state listener, the router doesn't know to re-evaluate route guards.

**Fix (implemented in 3f87f0c):** Add an `onAuthStateChange` listener in `src/routes/__root.tsx` that calls `router.invalidate()`. This re-runs `beforeLoad` guards, which call `getSession()` and redirect to `/login` when the session is gone.

**Regression check:** When reviewing any logout button or auth flow change:
1. Verify `__root.tsx` still has the `onAuthStateChange` → `router.invalidate()` listener.
2. Verify the listener's cleanup function calls `subscription.subscription.unsubscribe()`.
3. Trace the full redirect chain: signOut → onAuthStateChange → router.invalidate → beforeLoad getSession → redirect to /login.
4. Test both explicit logout AND token expiry (session revoked server-side).

---

## AI2: beforeLoad guard pattern (Phase 0 — PASS, verify on every new protected route)

**Pattern:** Protected routes use `beforeLoad` + `supabase.auth.getSession()` + `throw redirect({ to: '/login' })` in `_authenticated.tsx`. This is the canonical TanStack Router approach.

**Regression check:** When a new protected route is added:
1. Verify it nests under `_authenticated` (not a standalone route at root level).
2. Do NOT add a second `beforeLoad` auth guard on the child route — the parent `_authenticated` guard already covers it.
3. If the route needs role-based access, add a separate `beforeLoad` check for the role, but keep the session check in the parent.

---

## AI3: Session retrieval — getSession vs getUser (Phase 0 — PASS)

**Pattern:** Route guards use `supabase.auth.getSession()` (reads local storage — fast, no network). Do NOT use `supabase.auth.getUser()` in `beforeLoad` — it makes a network call to Supabase and adds latency to every route transition.

**Regression check:** If a new guard or hook uses `getUser()` where `getSession()` would suffice, flag it as a performance issue.

---

## AI4: Environment variable validation (Phase 0 — PASS)

**Pattern:** `src/lib/supabase.ts` validates `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at module load with a clear `throw new Error(...)` if missing.

**Regression check:** If a new Supabase client is created elsewhere (e.g. server-side code, a separate edge function), verify it also validates its env vars. Never read `import.meta.env.VITE_*` without a guard.

---

## AI5: Secrets hygiene (Phase 0 — PASS)

**Pattern:** Only the anon (publishable) key is used client-side. No service_role key or `SUPABASE_ACCESS_TOKEN` appears anywhere in the codebase or git history. `.env.local` is gitignored. `.env.example` has placeholder values only.

**Regression check:** On every diff, grep for:
- `sb_secret_` (service role key prefix)
- `SUPABASE_ACCESS_TOKEN`
- `service_role`
- Any hardcoded URL that looks like `https://<project-ref>.supabase.co` with a real project ref in source files (should only be in `.env.local` / `.env.example`)

Flag any match as at least CHANGES REQUESTED.