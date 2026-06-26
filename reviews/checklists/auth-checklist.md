# Auth Checklist — Verify on Every Auth-Related Feature

Things to check against any feature that touches authentication, session management, or route guards. Patch this file when a new auth issue pattern is discovered.

---

## Logout redirect

- [ ] `__root.tsx` still has the `onAuthStateChange` → `router.invalidate()` listener
- [ ] The listener's cleanup function calls `subscription.subscription.unsubscribe()`
- [ ] Full redirect chain works: signOut → onAuthStateChange → router.invalidate → beforeLoad getSession → redirect to /login
- [ ] Test both explicit logout AND token expiry (session revoked server-side)

## Protected route guards

- [ ] New protected route nests under `_authenticated` (not a standalone route at root level)
- [ ] No second `beforeLoad` auth guard on child routes — the parent `_authenticated` guard already covers it
- [ ] Role-based access (if needed) uses a separate `beforeLoad` check for the role, with the session check left in the parent

## Session retrieval

- [ ] Route guards use `supabase.auth.getSession()` (reads local storage — fast, no network)
- [ ] No `supabase.auth.getUser()` in `beforeLoad` — it makes a network call and adds latency to every route transition

## Environment variable validation

- [ ] `src/lib/supabase.ts` validates `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at module load with a clear `throw new Error(...)` if missing
- [ ] Any new Supabase client created elsewhere (server-side, edge function) also validates its env vars
- [ ] Never read `import.meta.env.VITE_*` without a guard

## Secrets hygiene

- [ ] Only the anon (publishable) key is used client-side
- [ ] No service_role key or `SUPABASE_ACCESS_TOKEN` anywhere in the codebase or git history
- [ ] `.env.local` is gitignored
- [ ] `.env.example` has placeholder values only
- [ ] Grep the diff for: `sb_secret_`, `SUPABASE_ACCESS_TOKEN`, `service_role`, hardcoded `https://<project-ref>.supabase.co` URLs in source files — flag any match as at least CHANGES REQUESTED