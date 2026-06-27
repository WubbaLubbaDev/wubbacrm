# Auth Review

Review of WubbaCRM authentication: Supabase client, login, protected routes, auth state listener, logout, and security.

**Verdict: APPROVED**

## Build / Lint / Test Results

- `npm run build` — PASS (187 modules, 4.07s)
- `npm run lint` (biome check) — PASS (38 files, no fixes applied)
- `npm run test` (vitest run) — PASS (16/16 tests across 4 files)

## Files Reviewed

- `src/lib/supabase.ts` — Supabase client wrapper
- `src/routes/login.tsx` — Login page
- `src/routes/_authenticated.tsx` — Protected layout route
- `src/routes/__root.tsx` — Root route with onAuthStateChange
- `src/components/layout/topbar.tsx` — Logout handler
- `.gitignore` — Env file exclusion
- `.env.example` — Placeholder template

## Findings

### 1. Supabase Client (`src/lib/supabase.ts`) — PASS

- Env var validation: throws with a clear error message if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing (lines 6-10). Error message instructs developer to copy `.env.example` to `.env.local`.
- Client creation via `createClient(supabaseUrl, supabaseAnonKey)` (line 12). Matches `research/setup/supabase-client.md` spec.
- No hardcoded keys or secrets in source.
- Env var name `VITE_SUPABASE_ANON_KEY` matches the research spec (documented as intentional — publishable key works as drop-in for legacy anon key).

### 2. Login Page (`src/routes/login.tsx`) — PASS

- Uses UI primitives: `Button`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Input`, `Label` — not raw HTML inputs. Matches the styled login page spec from `layout-patterns.md`.
- Email/password form with `signInWithPassword()` (line 25).
- Error handling: `setError(error.message)` on failure, displayed with `role="alert"` for accessibility (line 77).
- Loading state: `setLoading(true/false)` toggles Button `loading` prop (line 82).
- Redirect on success: `navigate({ to: '/' })` (line 33).
- Form uses `e.preventDefault()` to prevent default form submission (line 21).
- Inputs have `required`, `autoComplete="email"` / `autoComplete="current-password"` — good accessibility/UX.
- Centered card layout with logo badge — matches `layout-patterns.md` Login Page Styling.

### 3. Protected Route (`src/routes/_authenticated.tsx`) — PASS

- `beforeLoad` guard calls `supabase.auth.getSession()` and redirects to `/login` if no session (lines 6-13).
- Matches `research/setup/auth-patterns.md` Pattern 1 exactly.
- Layout component wraps pages in `DashboardLayout` with `<Outlet />` (lines 17-22).

### 4. Auth State Listener (`src/routes/__root.tsx`) — PASS

- `onAuthStateChange` listener in `RootComponent` calls `router.invalidate()` on any auth state change (line 13-17).
- This re-runs `beforeLoad` guards so protected routes redirect to `/login` when session is gone.
- Proper cleanup: `subscription.subscription.unsubscribe()` in useEffect return (line 20).
- Matches `research/setup/auth-patterns.md` Pattern 4.

### 5. Logout Flow (`src/components/layout/topbar.tsx`) — PASS

- `handleLogout` calls `supabase.auth.signOut()` then `navigate({ to: '/login' })` (lines 39-42).
- The `navigate` provides immediate redirect; `onAuthStateChange` fires `router.invalidate()` which re-runs `beforeLoad` as a second guard. Belt-and-suspenders — not redundant, just robust.
- Full flow: signOut() → onAuthStateChange → router.invalidate() → beforeLoad → redirect to /login. Verified.

### 6. Security — PASS

- `.gitignore` includes `.env`, `.env.local`, `.env.*.local` (lines 19-22).
- `.env.example` exists with placeholder values only — no real keys.
- `.env.local` exists locally (mode 600) but is NOT tracked in git (confirmed via `git log -- .env.local` — no commits).
- No secrets, API keys, or service role keys found in any source file.
- Only the publishable/anon key (client-side safe) is used in the app. The secret key is never referenced.

## Summary

The auth implementation is correct, secure, and matches the research patterns. All five auth patterns from `auth-patterns.md` are properly implemented: protected route guard, login page, logout, auth state listener, and protected pages. No secrets are committed. No blocking issues found.

## Update: Google Calendar Integration Review (2026-06-26)

Branch: `feat/google-calendar-integration` (commit 1a52931)

### OAuth Flow — PASS

- `src/lib/google-oauth.ts` builds the Google OAuth authorization URL with all required parameters: `client_id` (from `VITE_GOOGLE_CLIENT_ID` env var), `redirect_uri`, `response_type=code`, `scope=https://www.googleapis.com/auth/calendar`, `access_type=offline`, `state` (CSRF token), `prompt=consent`, `include_granted_scopes=true` (lines 15-31). Matches the research brief exactly.
- Uses the correct Google OAuth endpoint: `https://accounts.google.com/o/oauth2/v2/auth` (line 4).
- Client secret is NOT in frontend code. Only `VITE_GOOGLE_CLIENT_ID` (public, safe) is used. The client secret is only referenced in the Edge Function via `Deno.env.get('GOOGLE_CLIENT_SECRET')` — server-side only.
- Token exchange happens via Supabase Edge Function `google-oauth-exchange` (lines 53-66). The frontend sends the auth code to the Edge Function with the user's Supabase JWT as `Authorization: Bearer`. The Edge Function exchanges the code for tokens using the client secret.

### CSRF State Parameter — PASS

- `buildAuthUrl()` generates `state = crypto.randomUUID()` (line 18) — a 36-char UUID.
- `initiateOAuthFlow()` stores state in `sessionStorage` before redirecting to Google (line 37).
- `validateOAuthState()` compares the returned state with the stored value, then removes the stored state regardless of match/mismatch (lines 46-49). Correct — prevents replay attacks.
- Callback handler (`callback.tsx` line 34) calls `validateOAuthState(stateParam)` and aborts on mismatch with an error message.
- Tests: 10 tests in `google-oauth.test.ts` cover buildAuthUrl parameters, redirect URI, state uniqueness, initiateOAuthFlow storage+redirect, validateOAuthState match/mismatch/null/empty/clear-after-validation. Thorough.

### Supabase Token Storage — PASS

- `supabase/migrations/0001_google_oauth_tokens.sql`: Table schema matches the research brief exactly — `id UUID PK`, `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `access_token TEXT NOT NULL`, `refresh_token TEXT NOT NULL`, `expires_at TIMESTAMPTZ NOT NULL`, `scope TEXT`, `calendar_id TEXT`, `connected_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`, `UNIQUE(user_id)`.
- RLS enabled with 4 policies: SELECT, INSERT, UPDATE, DELETE — all scoped to `auth.uid() = user_id`. Only the token owner can access their row. Correct.
- `updated_at` auto-update trigger properly defined.
- Edge Functions use the service role key to bypass RLS, but authenticate the caller first via `supabase.auth.getUser(jwt)` — the user_id is extracted from the validated JWT, not from the request body. Correct — prevents user_id spoofing.

### Edge Functions — PASS

- `google-oauth-exchange/index.ts`: Validates JWT, exchanges code with Google, UPSERTs tokens with `onConflict: 'user_id'`. Calculates `expires_at` from `expires_in`. Handles errors at each step. CORS headers present.
- `google-token-refresh/index.ts`: Validates JWT, reads stored `refresh_token`, calls Google refresh endpoint, updates `access_token` and `expires_at` in DB. Returns the new access token. Correct.
- `google-oauth-disconnect/index.ts`: Validates JWT, reads `refresh_token`, revokes at Google (`https://oauth2.googleapis.com/revoke`), deletes DB row. If no row exists, returns success (idempotent). Correct.
- All Edge Functions use `Deno.env.get()` for secrets — no hardcoded values.
- CORS: `Access-Control-Allow-Origin: *` — standard for Supabase Edge Functions (auth via JWT, not origin).

### Security — PASS

- `.env.example` only contains `VITE_GOOGLE_CLIENT_ID` (public, safe for frontend). No client secret in any tracked file.
- `.env.local` is gitignored (confirmed in `.gitignore` line 20). Not tracked in git.
- No secrets, API keys, or service role keys found in any source file.
- Access tokens are short-lived (1 hour). Refresh tokens never leave the Edge Function/DB. Matches the research brief's Approach A (lazy refresh).
- `Access-Control-Allow-Origin: *` on Edge Functions is acceptable — access control is enforced by JWT validation, not by origin.

### Minor Notes (non-blocking)

- `makeAuthHeader()` is duplicated in both `src/lib/google-oauth.ts` (line 9) and `src/lib/google-calendar.ts` (line 27). Same implementation. Could be extracted to a shared utility, but not a blocker.
- The `google-oauth-disconnect` function does not check the revoke response status from Google. If Google's revoke endpoint fails, the DB row is still deleted. This is acceptable — the user's intent (disconnect) is fulfilled, and the token becomes useless once the DB row is gone.

### Verdict: APPROVED

## Update: Google OAuth Callback Fix Review (2026-06-26, commit 669badb)

Branch: `feat/google-calendar-integration` (commit 669badb, pushed to origin)

### Bug 1: Deprecated Token Endpoint — PASS

- `google-oauth-exchange/index.ts:45` now uses `https://oauth2.googleapis.com/token` (modern endpoint). Was `https://accounts.google.com/o/oauth2/token` (deprecated).
- `google-token-refresh/index.ts:72` also updated to `https://oauth2.googleapis.com/token`. Was `https://accounts.google.com/o/oauth2/token`.
- No other source files reference the old endpoint. The only remaining references are in `research/features/google-calendar-integration-brief.md` (lines 187, 211, 457, 619) — the research brief itself, which is documentation, not executable code. The coder correctly deviated from the brief per Google's deprecation. Non-blocking.
- Note: `google-oauth-disconnect/index.ts` already used `https://oauth2.googleapis.com/revoke` (line not changed, was already correct).

### Bug 2: iss/scope in Callback Search Schema — PASS

- `callback.tsx:15-16` — `validateSearch` schema now includes `iss: z.string().optional()` and `scope: z.string().optional()`. TanStack Router will no longer reject the callback URL when Google appends these params.
- The callback component still correctly extracts only `code` and `state` (lines 29-30) — `iss` and `scope` are accepted by the router but not used by the component logic. Correct: they're informational params from Google, not needed for the token exchange.
- No route errors or flow breakage — the extra params are silently accepted and ignored.

### OAuth Flow End-to-End Trace — PASS

1. Frontend `buildAuthUrl()` (`google-oauth.ts:15-31`): generates URL with `client_id` from `VITE_GOOGLE_CLIENT_ID`, `redirect_uri = window.location.origin + /settings/integrations/google-calendar/callback`, `response_type=code`, `scope=https://www.googleapis.com/auth/calendar`, `access_type=offline`, `state=crypto.randomUUID()`, `prompt=consent`, `include_granted_scopes=true`. Correct.
2. Google redirects to callback with `code`, `state`, `iss`, `scope` params.
3. Callback route `validateSearch` accepts all four params (code, state, iss, scope — all optional strings). Correct.
4. `validateOAuthState(stateParam)` (`google-oauth.ts:46-49`): compares against sessionStorage, removes stored state. CSRF protection intact.
5. `exchangeCodeForTokens(code, jwt)` (`google-oauth.ts:53-66`): POSTs `{ code }` to Edge Function with user's JWT as Authorization header.
6. Edge Function `google-oauth-exchange/index.ts`: validates JWT via `supabase.auth.getUser(jwt)`, exchanges code at `https://oauth2.googleapis.com/token` with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `grant_type=authorization_code`. UPSERTs tokens into `google_oauth_tokens` table. Correct.
7. On success, callback navigates to `/settings/integrations/google-calendar`.
8. `google-calendar.tsx:37-48` — `getStoredTokens()` checks Supabase for token row, shows connected state with calendar selector. Correct.

### Potential Remaining Issues — Checked

1. **redirect_uri consistency**: Frontend uses `window.location.origin + /settings/integrations/google-calendar/callback` (`google-oauth.ts:17`). Edge Function uses `GOOGLE_REDIRECT_URI` env var (`google-oauth-exchange/index.ts:52`). These MUST match — this is a deployment configuration concern, not a code bug. The code is correct on both sides; the operator must set `GOOGLE_REDIRECT_URI` to the same value the frontend will generate. Documented in README and `.env.example`. Non-blocking (configuration, not code).

2. **Missing GOOGLE_REDIRECT_URI handling**: The Edge Function uses `Deno.env.get('GOOGLE_REDIRECT_URI')!` with non-null assertion (line 52). If the env var is not set, this becomes `undefined`, and `new URLSearchParams` will serialize it as the string `"undefined"`, causing Google to return a `redirect_uri_mismatch` error. This is caught by the `tokens.error` check (line 58) and returned as a 400 with the error description. While the error message from Google would be somewhat clear, the non-null assertion is a minor code smell. However, this is pre-existing (not introduced by this fix commit) and the error is surfaced to the user. Non-blocking — noted as a minor improvement opportunity, not a blocker.

3. **Other Google OAuth callback params**: Google may also send `error` and `error_description` params if the user denies consent or an error occurs. These are NOT in the `validateSearch` schema. If Google redirects with `?error=access_denied`, TanStack Router would reject the URL. This is a pre-existing issue (not introduced by this fix) and is a low-probability scenario (user clicks "Cancel" on Google's consent screen). Worth noting for a future fix but not a blocker for this review — the fix under review correctly addresses `iss` and `scope` which are the params Google always sends on success.

### Build / Lint / Test — PASS

- `npm run lint` (biome check) — PASS (55 files, no fixes applied)
- `npm run build` (vite build) — PASS (187 modules, 6.85s)
- `npm run test` (vitest run) — PASS (38/38 tests across 8 files)

### Git — PASS

- Commit `669badb` pushed to `origin/feat/google-calendar-integration`. Branch is up to date with remote.

### PR

- PR #6 already exists: https://github.com/WubbaLubbaDev/wubbacrm/pull/6 (Feature: Google Calendar Integration, base: main, state: OPEN). No new PR needed — this fix commit is already part of the existing PR.

### Verdict: APPROVED

Both fixes are correct, minimal, and well-scoped. The deprecated token endpoint is replaced in both Edge Functions. The callback search schema now accepts `iss` and `scope` params. The full OAuth flow traces correctly end-to-end. Build, lint, and all 38 tests pass. The code is pushed and included in the existing PR #6.