# Re-Review: WubbaCRM Logout Fix

**Task:** t_aca9b47e — Re-review logout fix
**Reviewer:** reviewer profile
**Date:** 2026-06-24
**Commit reviewed:** 3f87f0c (main, pushed to origin/main)
**Previous review:** wubbacrm-review-scaffold-auth-implementation-review.md (CHANGES REQUESTED, Finding F1)
**Verdict:** APPROVED

---

## Summary

The coder addressed Finding F1 by implementing Option B (the recommended approach) from the previous review: an `onAuthStateChange` listener in `src/routes/__root.tsx` that calls `router.invalidate()` on auth state changes. This causes the `beforeLoad` guard in `_authenticated.tsx` to re-run, which calls `getSession()` and redirects to `/login` when the session is gone. The fix handles both explicit logout and token expiry. Build, lint, typecheck, and tests all pass. Code is pushed to origin/main.

---

## Verification Results

| Check | Result |
|-------|--------|
| `npm run build` (tsc -b && vite build) | PASS — 167 modules, 0 errors, exit 0 |
| `npm run lint` (biome check --write) | PASS — 18 files, no fixes needed |
| `npm run check` (biome ci) | PASS — 18 files, no fixes needed |
| `npm run test` (vitest run) | PASS — 1 test passed (sanity) |
| Git push to origin/main | PASS — HEAD = origin/main = 3f87f0c |
| Secrets in diff | CLEAN — no secrets in the change |

---

## F1 Resolution Analysis

### Previous Finding F1: Logout does not redirect to /login

**Status:** RESOLVED

**Fix implemented:** Option B from the previous review — `onAuthStateChange` listener in the root route.

**File:** `src/routes/__root.tsx` (lines 1-25)

The change adds:
1. `useRouter` import from `@tanstack/react-router`
2. `useEffect` import from React
3. `supabase` import from `@/lib/supabase`
4. An `onAuthStateChange` subscription in `RootComponent` that calls `router.invalidate()` on any auth state change
5. Proper cleanup: `subscription.subscription.unsubscribe()` in the effect's return function

**Redirect chain verification:**

1. User clicks Logout → `handleLogout` calls `supabase.auth.signOut()` (`_authenticated/index.tsx:10`)
2. Supabase fires `onAuthStateChange` event → listener in `__root.tsx:13` calls `router.invalidate()`
3. `router.invalidate()` triggers re-evaluation of route guards → `beforeLoad` in `_authenticated.tsx:5` re-runs
4. `beforeLoad` calls `supabase.auth.getSession()` → session is null → `throw redirect({ to: '/login' })`
5. User is redirected to `/login`

This is the correct and robust approach. It also handles token expiry while the page is open (the previous review's recommendation for choosing Option B over Option A).

**Code quality of the fix:**
- The `useEffect` dependency array correctly includes `router` (stable reference from TanStack Router)
- Subscription cleanup is correct — `onAuthStateChange` returns `{ data: { subscription } }` and the cleanup calls `subscription.subscription.unsubscribe()`
- No unnecessary re-subscriptions since `router` is stable
- Comment explains the purpose clearly

---

## Checklist

### 1. onAuthStateChange listener implemented in __root.tsx — PASS
Confirmed at `src/routes/__root.tsx:12-22`. The listener is set up in `RootComponent` via `useEffect`, subscribes to `supabase.auth.onAuthStateChange`, and calls `router.invalidate()`.

### 2. After signOut(), user is redirected to /login — PASS (via router.invalidate())
The redirect is indirect but correct: `signOut()` → `onAuthStateChange` → `router.invalidate()` → `beforeLoad` re-runs → `getSession()` returns null → `redirect({ to: '/login' })`. This is the recommended pattern from the previous review.

### 3. Build, lint, typecheck, and tests all pass — PASS
All four checks pass clean. `tsc -b` runs as part of `npm run build` and completes with no errors.

### 4. Code is pushed to origin/main — PASS
Local HEAD (3f87f0c) = origin/main (3f87f0c). Working tree clean (only untracked `reviews/` directory).

### 5. README is accurate — PASS
The README "Auth Flow" section (line 86) states: "Logout button calls `supabase.auth.signOut()` and user is redirected back to `/login`". This is now accurate — the redirect happens via the `onAuthStateChange` listener + `router.invalidate()` + `beforeLoad` guard chain. The README does not need to describe the internal mechanism; the user-facing behavior matches.

---

## Diff Reviewed

```
git diff 13a556d..3f87f0c -- src/routes/__root.tsx
```

Only one file changed: `src/routes/__root.tsx`. The diff is minimal and focused — no drive-by changes, no scope creep. The implementation matches Option B from the previous review exactly.

---

## Non-Blocking Observations

None. The fix is clean, minimal, and correct.

---

## Verdict

**APPROVED**

Finding F1 from the previous review is fully resolved. The coder implemented the recommended Option B (onAuthStateChange listener in root route). All verification checks pass. The code is pushed to origin/main. The README is accurate. No new issues were introduced.