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