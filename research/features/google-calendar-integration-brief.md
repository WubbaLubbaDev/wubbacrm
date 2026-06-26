# Google Calendar Integration — Feature Brief

## Objective

Add a Google Calendar integration to WubbaCRM's Settings page. Users connect their Google account via OAuth 2.0, grant calendar read/write access, and the system stores their OAuth tokens in Supabase for later use (reading/creating calendar events under selected contacts). The UI lives under a new sub-sidebar within the Settings page's main content area — not the app sidebar.

This phase covers: the Settings sub-navigation, the Integrations listing, the Google Calendar connect/disconnect flow, OAuth callback handling, token storage, and the connected state with calendar selection. Future phases will use the stored tokens to read/create events.

## Findings

### 1. Google Calendar API

The Google Calendar API v3 is a REST API with base URI `https://www.googleapis.com/calendar/v3`. It uses OAuth 2.0 for authorization. There is no separate API key mode for user data — OAuth is required.

**Resource types relevant to this feature:**

| Resource | Purpose |
|---|---|
| CalendarList | Lists calendars in the user's list (for the calendar selection dropdown) |
| Calendars | Calendar metadata (get, insert, update, delete) |
| Events | Event CRUD (list, get, insert, update, delete, quickAdd) |
| Acl | Access control rules (not needed now) |
| Colors | Color definitions (cosmetic, optional) |
| Freebusy | Free/busy queries (future feature) |
| Settings | User settings (optional) |
| Channels | Push notifications (future optimization) |

**Key endpoints for this feature:**

| Operation | Method | Endpoint |
|---|---|---|
| List calendars | GET | `/users/me/calendarList` |
| Get calendar | GET | `/calendars/{calendarId}` |
| List events | GET | `/calendars/{calendarId}/events` |
| Create event | POST | `/calendars/{calendarId}/events` |
| Get event | GET | `/calendars/{calendarId}/events/{eventId}` |
| Update event | PUT | `/calendars/{calendarId}/events/{eventId}` |
| Patch event | PATCH | `/calendars/{calendarId}/events/{eventId}` |
| Delete event | DELETE | `/calendars/{calendarId}/events/{eventId}` |
| Quick add | POST | `/calendars/{calendarId}/events/quickAdd?text=...` |

All endpoints require an `Authorization: Bearer {access_token}` header.

**OAuth scopes needed:**

| Scope | Description | When to use |
|---|---|---|
| `https://www.googleapis.com/auth/calendar` | Full read/write access to all calendars | Recommended — needed for creating events |
| `https://www.googleapis.com/auth/calendar.events` | Read/write access to events only | Narrower alternative |
| `https://www.googleapis.com/auth/calendar.readonly` | Read-only access | Too narrow — we need write later |
| `https://www.googleapis.com/auth/calendar.events.readonly` | Read-only events | Too narrow |

**Recommendation:** Use `https://www.googleapis.com/auth/calendar` — full read/write. The feature description says we will read AND create events, so readonly is insufficient. The `calendar` scope covers both calendar list and events operations.

**Rate limits and quotas (Cloud Console project-level):**

| Limit | Value |
|---|---|
| Per minute per project | 10,000 requests |
| Per minute per user per project | 600 requests |
| Per day per project | 1,000,000 requests |

These are generous for a CRM. A typical sync cycle (list calendars + list events for a few calendars) is well under 10 requests. Exceeding returns `403 usageLimits` or `429 usageLimits`. Handle with truncated exponential backoff (wait = min(2^n + random_ms, 32s)). No billing currently; charges for over-quota planned later in 2026 with 90 days notice.

Sources:
- API reference: https://developers.google.com/workspace/calendar/api/v3/reference
- Quotas: https://developers.google.com/workspace/calendar/api/guides/quota
- Scopes: https://developers.google.com/identity/protocols/oauth2/scopes

### 2. OAuth 2.0 Flow — Authorization Code with Server-Side Exchange

**Critical decision: use the Web Server flow (with client secret), NOT the PKCE-only client-side flow.**

Google's PKCE flow for web apps still requires a client secret (Google's non-standard implementation), and more importantly, the client secret must never be in the frontend. The correct approach for a web app with a backend (Supabase Edge Functions) is the standard authorization code flow where the code exchange happens server-side.

**Why not pure client-side (PKCE without secret):**
1. Google requires the client secret even with PKCE for web app client types (StackOverflow confirmed: https://stackoverflow.com/questions/76528208)
2. Exposing the client secret in frontend JavaScript is a security violation
3. We need `access_type=offline` to get a refresh token — this works best with the server-side exchange
4. Token refresh requires the client secret — must be server-side

**The 6-step flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OAUTH 2.0 FLOW DIAGRAM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐      ┌───────────────┐      ┌──────────────┐                 │
│  │  User    │      │  React SPA    │      │  Supabase    │                 │
│  │  (browser)│     │  (frontend)   │      │  Edge Func   │                 │
│  └────┬─────┘      └──────┬────────┘      └──────┬───────┘                 │
│       │                   │                      │                         │
│   1. Click "Connect"      │                      │                         │
│       │──────────────────▶│                      │                         │
│       │                   │                      │                         │
│   2. Generate state,      │                      │                         │
│      store in localStorage│                      │                         │
│      Build auth URL:      │                      │                         │
│      accounts.google.com/ │                      │                         │
│      o/oauth2/v2/auth?    │                      │                         │
│        client_id=...      │                      │                         │
│        redirect_uri=...   │                      │                         │
│        response_type=code │                      │                         │
│        scope=calendar     │                      │                         │
│        access_type=offline│                      │                         │
│        state=<random>     │                      │                         │
│        prompt=consent     │                      │                         │
│       │                   │                      │                         │
│   3. Redirect to Google   │                      │                         │
│       │◀──────────────────│                      │                         │
│       │                   │                      │                         │
│   4. User consents on     │                      │                         │
│      Google's page        │                      │                         │
│       │                   │                      │                         │
│   5. Google redirects to  │                      │                         │
│      /settings/integrations│                     │                         │
│      /google-calendar/callback│                  │                         │
│      ?code=AUTH_CODE       │                     │                         │
│      &state=<same>         │                     │                         │
│       │──────────────────▶│                      │                         │
│       │                   │                      │                         │
│   6. Verify state matches │                      │                         │
│      (CSRF check)         │                      │                         │
│       │                   │                      │                         │
│   7. POST code to Edge    │                      │                         │
│      Function:            │                      │                         │
│      /functions/v1/       │                      │                         │
│      google-oauth-exchange│                      │                         │
│      { code, user_jwt }   │                      │                         │
│       │─────────────────────────────────────────▶│                        │
│       │                   │                      │                        │
│   8. Edge Function:       │                      │                        │
│      POST to              │                      │                        │
│      accounts.google.com/ │                      │                        │
│      o/oauth2/token       │                      │                        │
│      {                    │                      │                        │
│        code: AUTH_CODE,   │                      │                        │
│        client_id: ENV,    │                      │                        │
│        client_secret: ENV,│                      │                        │
│        redirect_uri: ENV, │                      │                        │
│        grant_type:        │                      │                        │
│          auth_code        │                      │                        │
│      }                    │                      │                        │
│      → receives:          │                      │                        │
│        access_token       │                      │                        │
│        refresh_token      │                      │                        │
│        expires_in (3600)  │                      │                        │
│        scope              │                      │                        │
│       │                   │                      │                        │
│   9. Edge Function:       │                      │                        │
│      INSERT into          │                      │                        │
│      google_oauth_tokens  │                      │                        │
│      (user_id from JWT,   │                      │                        │
│       access_token,       │                      │                        │
│       refresh_token,      │                      │                        │
│       expires_at)         │                      │                        │
│       │                   │                      │                        │
│  10. Return success JSON  │                      │                        │
│       │◀─────────────────────────────────────────│                        │
│       │                   │                      │                        │
│  11. Navigate to connected│                      │                        │
│      state, fetch         │                      │                        │
│      calendar list        │                      │                        │
│       │                   │                      │                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key OAuth parameters for the authorization URL:**

| Parameter | Value | Notes |
|---|---|---|
| `client_id` | From env `VITE_GOOGLE_CLIENT_ID` | Public, safe in frontend |
| `redirect_uri` | `http://localhost:5173/settings/integrations/google-calendar/callback` (dev) | Must match Google Console exactly |
| `response_type` | `code` | Authorization code flow |
| `scope` | `https://www.googleapis.com/auth/calendar` | Full calendar read/write |
| `access_type` | `offline` | Required to get refresh_token |
| `state` | Random hex string (crypto.randomUUID or randomBytes) | CSRF protection |
| `prompt` | `consent` | Forces consent screen — ensures refresh_token is returned every time |
| `include_granted_scopes` | `true` | Enables incremental authorization |

**Critical gotcha:** `refresh_token` is only returned on the FIRST authorization. If a user revokes and re-authorizes without `prompt=consent`, no new refresh_token is returned. Always use `prompt=consent` to guarantee a refresh_token on every connect flow.

**Token exchange endpoint:**

```
POST https://accounts.google.com/o/oauth2/token
Content-Type: application/x-www-form-urlencoded

code={auth_code}
client_id={client_id}
client_secret={client_secret}    ← server-side only, from Edge Function env
redirect_uri={redirect_uri}
grant_type=authorization_code
```

Response:
```json
{
  "access_token": "ya29.a0...",
  "expires_in": 3599,
  "refresh_token": "1//0e...",
  "scope": "https://www.googleapis.com/auth/calendar",
  "token_type": "Bearer"
}
```

**Token refresh endpoint (when access_token expires):**

```
POST https://accounts.google.com/o/oauth2/token
Content-Type: application/x-www-form-urlencoded

client_id={client_id}
client_secret={client_secret}
refresh_token={stored_refresh_token}
grant_type=refresh_token
```

Response:
```json
{
  "access_token": "ya29.a0...",
  "expires_in": 3599,
  "scope": "https://www.googleapis.com/auth/calendar",
  "token_type": "Bearer"
}
```

Note: refresh does NOT return a new refresh_token. The original refresh_token persists. Store expires_at as `now() + expires_in seconds` after each refresh.

Sources:
- Web server OAuth flow: https://developers.google.com/identity/protocols/oauth2/web-server
- OAuth 2.0 overview: https://developers.google.com/identity/protocols/oauth2
- Token refresh: https://medium.com/@ashokyogi5/a-beginners-guide-to-google-oauth-and-google-apis-450f36389184

### 3. Supabase Integration

#### Token Storage Table Schema

```sql
CREATE TABLE IF NOT EXISTS public.google_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  calendar_id TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
```

**Design decisions:**
- `UNIQUE(user_id)` — one Google connection per CRM user. If a user reconnects, we UPSERT (update the existing row).
- `calendar_id` — nullable. Set when the user selects which calendar to sync with. NULL until selection.
- `expires_at` — computed as `now() + expires_in seconds` at token exchange and at each refresh.
- `access_token` and `refresh_token` are stored as TEXT. For production hardening, consider encrypting with pgcrypto using a server-side key, but for now plaintext in an RLS-protected table is acceptable (same security level as Supabase auth.tokens).

#### Row Level Security

```sql
ALTER TABLE public.google_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tokens
CREATE POLICY "Users can view own oauth tokens"
  ON public.google_oauth_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own oauth tokens"
  ON public.google_oauth_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own oauth tokens"
  ON public.google_oauth_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own oauth tokens"
  ON public.google_oauth_tokens
  FOR DELETE
  USING (auth.uid() = user_id);
```

**Note on Edge Functions:** When an Edge Function needs to read/write tokens, it should use the service role key (`sb_secret_...`) to bypass RLS. The Edge Function authenticates the caller by validating their Supabase JWT (passed as `Authorization: Bearer <jwt>`), then uses the service role client for DB operations scoped to that user_id.

#### Token Refresh Strategy

Access tokens expire after ~3600 seconds (1 hour). Two approaches:

**Approach A (recommended for now): Lazy refresh on the client.**
When the frontend needs to call the Google Calendar API (e.g., list calendars), it first checks `expires_at` in the tokens table. If expired, it calls an Edge Function `google-token-refresh` which:
1. Reads the refresh_token from the DB (using service role key)
2. POSTs to Google's token endpoint with grant_type=refresh_token
3. Updates access_token and expires_at in the DB
4. Returns the fresh access_token to the client

The client then uses the access_token to call Google Calendar API directly from the browser.

**Approach B (future): Server-side API proxying.**
All Google Calendar API calls go through Edge Functions. The Edge Function handles refresh automatically. More secure (access_token never reaches the browser) but more complex. Defer to future phase.

**Recommendation:** Start with Approach A (lazy refresh). It's simpler and the access_token is short-lived (1 hour). The refresh_token never leaves the Edge Function / DB. When we add event creation features, evaluate moving to Approach B.

#### Edge Functions Needed

| Function | Purpose | Auth |
|---|---|---|
| `google-oauth-exchange` | Exchange auth code for tokens, store in DB | Validates caller JWT, uses service role for DB write |
| `google-token-refresh` | Refresh expired access token, update DB | Validates caller JWT, uses service role for DB read/write |
| `google-oauth-disconnect` | (Optional) Revoke token via Google, delete row | Validates caller JWT, uses service role for DB delete |

**Edge Function env secrets (set via Supabase dashboard or CLI):**

| Secret | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console (NEVER in frontend) |
| `GOOGLE_REDIRECT_URI` | `http://localhost:5173/settings/integrations/google-calendar/callback` (dev), production URL for prod |
| `SUPABASE_URL` | `https://ilzybrpxitjcdcoxuqak.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` (for DB writes bypassing RLS) |

Sources:
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase OAuth token storage discussion: https://github.com/orgs/supabase/discussions/22578

### 4. UI Architecture

#### Settings Sub-Sidebar (NOT the app sidebar)

The Settings page has its own internal navigation — a secondary sidebar inside the main content area. This is distinct from the app-level sidebar (`src/components/layout/sidebar.tsx`).

```
DashboardLayout
├── AppSidebar (w-64, fixed left)          ← existing, unchanged
├── Main area (flex-1 flex-col)
│   ├── Header (h-14)                       ← existing, unchanged
│   └── Main content (flex-1 overflow-auto)
│       └── <Outlet />                      ← page content
│           └── SettingsLayout              ← NEW: wraps /settings/*
│               ├── SettingsSidebar (w-56)  ← NEW: sub-navigation
│               └── SettingsContent (flex-1)
│                   └── <Outlet />          ← settings sub-pages
```

**SettingsSidebar items (initial):**
- General → `/settings`
- Integrations → `/settings/integrations`

**Integrations page items (shown as cards, not in the sub-sidebar):**
- Google Calendar → `/settings/integrations/google-calendar`
- (future: Slack, Zoom, etc.)

The sub-sidebar uses the same styling as the app sidebar (from `layout-patterns.md`) but narrower (`w-56` instead of `w-64`) and without the logo/brand and user section. It's a pure navigation list.

#### Route Structure (TanStack Router file-based)

```
src/routes/
  _authenticated.tsx                    # existing layout (DashboardLayout wrapper)
  _authenticated/
    settings.tsx                        # NEW: SettingsLayout (sub-sidebar + outlet)
    settings/
      index.tsx                         # /settings → General settings (redirect or placeholder)
      integrations.tsx                  # NEW: IntegrationsLayout (optional wrapper)
      integrations/
        index.tsx                       # /settings/integrations → Integration cards list
        google-calendar.tsx             # /settings/integrations/google-calendar → connect/connected state
        google-calendar/
          callback.tsx                  # /settings/integrations/google-calendar/callback → OAuth handler
```

**Route explanations:**
- `settings.tsx` — pathless layout route for the Settings sub-sidebar. Wraps children with `SettingsLayout` (sub-sidebar + outlet).
- `settings/index.tsx` — the General settings page. Can be a placeholder for now.
- `settings/integrations.tsx` — optional layout route if the integrations section needs its own wrapper. Can be skipped; the integrations index can be a direct child of settings.
- `settings/integrations/index.tsx` — the Integrations landing page showing `IntegrationCard` components.
- `settings/integrations/google-calendar.tsx` — the main Google Calendar page. Shows "Connect" button if not connected, or "Connected" state with calendar selection if connected.
- `settings/integrations/google-calendar/callback.tsx` — the OAuth callback handler. Reads `code` and `state` from URL params, validates state, calls the `google-oauth-exchange` Edge Function, then navigates to the main Google Calendar page.

**Simplified route structure (recommended — skip the intermediate integrations layout):**

```
src/routes/_authenticated/
  settings.tsx                          # SettingsLayout (sub-sidebar + outlet)
  settings/
    index.tsx                           # /settings → General
    integrations.tsx                    # /settings/integrations → Integration cards list
    integrations/
      google-calendar.tsx               # /settings/integrations/google-calendar
      google-calendar/
        callback.tsx                    # OAuth callback handler
```

Wait — TanStack Router file-based routing: `integrations.tsx` and `integrations/` directory at the same level creates a layout + children pattern. `integrations.tsx` is the layout route for `/settings/integrations`, and files inside `integrations/` are its children. This works. The `integrations.tsx` layout can just render `<Outlet />` if no extra wrapping is needed, or provide an integrations-specific layout.

#### New UI Components

| Component | File | Purpose |
|---|---|---|
| `SettingsLayout` | `src/components/layout/settings-layout.tsx` | Wraps Settings pages with sub-sidebar + content area |
| `SettingsSidebar` | `src/components/layout/settings-sidebar.tsx` | Sub-navigation for Settings (General, Integrations) |
| `IntegrationCard` | `src/components/integrations/integration-card.tsx` | Card showing an integration option (icon, name, description, status badge, connect/manage link) |
| `ConnectButton` | `src/components/integrations/connect-button.tsx` | Button that initiates OAuth flow (builds auth URL, stores state, redirects) |
| `OAuthCallbackHandler` | route component in `callback.tsx` | Handles the OAuth redirect, validates state, exchanges code via Edge Function |
| `CalendarSelector` | `src/components/integrations/calendar-selector.tsx` | Dropdown to select which Google Calendar to sync with |
| `DisconnectButton` | `src/components/integrations/disconnect-button.tsx` | Button to disconnect (revoke token, delete row) |

#### Component States

**GoogleCalendarPage states:**
1. `loading` — checking if user has tokens in DB
2. `disconnected` — no tokens found → show `ConnectButton`
3. `connecting` — OAuth redirect in progress (transient)
4. `connected` — tokens found → show connected status, `CalendarSelector`, `DisconnectButton`
5. `error` — OAuth failed or token exchange failed → show error message with retry

**IntegrationCard props:**
```typescript
interface IntegrationCardProps {
  icon: React.ComponentType<{ className?: string }>  // lucide-react icon
  name: string
  description: string
  status: 'connected' | 'disconnected' | 'error'
  href: string  // link to the integration's page
}
```

### 5. Data Flow — Detailed

#### Connect Flow

1. User navigates to `/settings/integrations/google-calendar`
2. Page checks Supabase for `google_oauth_tokens` where `user_id = current user`
3. No row found → render `ConnectButton`
4. User clicks Connect → `ConnectButton`:
   a. Generate `state` = `crypto.randomUUID()` (or `crypto.getRandomValues`)
   b. Store `state` in `sessionStorage` (survives redirect, cleared after)
   c. Build Google auth URL with all parameters (see OAuth flow section)
   d. `window.location.href = authUrl` (full page redirect to Google)
5. User consents on Google's page
6. Google redirects to `http://localhost:5173/settings/integrations/google-calendar/callback?code=...&state=...`
7. `callback.tsx` route component:
   a. Read `code` and `state` from URL search params
   b. Compare `state` with `sessionStorage` value — if mismatch, show error (CSRF)
   c. Clear `state` from sessionStorage
   d. Get current Supabase session JWT: `supabase.auth.getSession()`
   e. POST to Edge Function `google-oauth-exchange` with `{ code }` and `Authorization: Bearer <jwt>`
   f. Show loading spinner
8. Edge Function `google-oauth-exchange`:
   a. Validate JWT, extract user_id
   b. POST to `https://accounts.google.com/o/oauth2/token` with code, client_id, client_secret, redirect_uri, grant_type=authorization_code
   c. Receive access_token, refresh_token, expires_in
   d. UPSERT into `google_oauth_tokens` (user_id, access_token, refresh_token, expires_at = now() + expires_in seconds)
   e. Return `{ success: true }`
9. On success → navigate to `/settings/integrations/google-calendar` (connected state)
10. On error → show error message with "Try Again" button

#### Connected State

1. Page finds tokens row → render connected state
2. Fetch calendar list: call `google-token-refresh` Edge Function to ensure fresh token, then GET `https://www.googleapis.com/calendar/v3/users/me/calendarList` with `Authorization: Bearer <access_token>`
3. Show `CalendarSelector` with list of calendars
4. User selects a calendar → UPDATE `google_oauth_tokens` SET `calendar_id = selected`
5. Show `DisconnectButton`

#### Disconnect Flow

1. User clicks Disconnect
2. Optional: call Edge Function `google-oauth-disconnect` to revoke token at Google (`POST https://oauth2.googleapis.com/revoke?token={refresh_token}`)
3. DELETE from `google_oauth_tokens` WHERE user_id = current user
4. Navigate back to disconnected state

### 6. Security Considerations

| Concern | Mitigation |
|---|---|
| Client secret exposure | Store `GOOGLE_CLIENT_SECRET` only in Supabase Edge Function secrets. NEVER in `.env.local` or frontend code. |
| CSRF attack | Use `state` parameter — random UUID stored in sessionStorage before redirect, validated on callback. Mismatch = abort. |
| Token theft from DB | RLS policies ensure only the token owner can read/write their row. Service role key (Edge Functions only) bypasses RLS but is server-side only. |
| Access token in browser | Access tokens are short-lived (1 hour). Acceptable for Approach A (lazy refresh). Refresh tokens never leave the Edge Function/DB. |
| OAuth redirect URI mismatch | Configure exact URI in Google Cloud Console. Dev: `http://localhost:5173/settings/integrations/google-calendar/callback`. Prod: HTTPS URL. |
| Refresh token limit | Google limits 100 refresh tokens per account per client. Old tokens are invalidated. UPSERT ensures we only store one per user. |
| Token revocation | On disconnect, call Google's revocation endpoint to invalidate the token at Google's side. |

**Environment variables split:**

| Variable | Location | Purpose |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | `.env.local` (frontend) | Public client ID — safe to expose |
| `VITE_SUPABASE_URL` | `.env.local` (frontend) | Already exists |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` (frontend) | Already exists |
| `GOOGLE_CLIENT_ID` | Supabase Edge Function secrets | Same value, server-side |
| `GOOGLE_CLIENT_SECRET` | Supabase Edge Function secrets | Server-side only — NEVER in frontend |
| `GOOGLE_REDIRECT_URI` | Supabase Edge Function secrets | Must match frontend redirect URI |
| `SUPABASE_URL` | Supabase Edge Function secrets | Edge Function's own project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function secrets | For DB writes bypassing RLS |

## Recommendation

**Use the Web Server OAuth 2.0 flow with Supabase Edge Functions for the token exchange and refresh.** This is the only secure way to handle Google OAuth for a web app — the client secret must stay server-side.

**Architecture summary:**
1. Frontend builds the auth URL (client_id is public) and redirects to Google
2. Google redirects back to a TanStack Router callback route
3. Callback route sends the auth code to a Supabase Edge Function
4. Edge Function exchanges code for tokens (using client_secret) and stores them in `google_oauth_tokens` table
5. Frontend reads token status from Supabase to show connected/disconnected state
6. For API calls, frontend calls an Edge Function to refresh the token if needed, then calls Google Calendar API directly

**Why this approach:**
- Secure: client secret never in frontend
- Simple: no full API proxy layer needed yet
- Extensible: when we add event creation, we can either continue calling Google API directly (with refreshed token from Edge Function) or move to full proxy mode
- Uses existing Supabase infrastructure (Edge Functions, RLS, auth)

## Implementation Notes for the Coder

### Prerequisites (before coding)

1. **Create Google Cloud project and OAuth credentials:**
   - Go to https://console.cloud.google.com/
   - Create or select a project
   - Enable Google Calendar API (APIs & Services > Library > search "Google Calendar API" > Enable)
   - Go to APIs & Services > Credentials > Create Credentials > OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:5173/settings/integrations/google-calendar/callback` (dev)
     - Production URL (when deployed)
   - Copy Client ID and Client Secret
   - Configure OAuth consent screen (External, add scope `https://www.googleapis.com/auth/calendar`, add test users)

2. **Set Edge Function secrets (via Supabase CLI or dashboard):**
   ```bash
   supabase secrets set GOOGLE_CLIENT_ID=xxx
   supabase secrets set GOOGLE_CLIENT_SECRET=xxx
   supabase secrets set GOOGLE_REDIRECT_URI=http://localhost:5173/settings/integrations/google-calendar/callback
   ```

3. **Add frontend env vars to `.env.local`:**
   ```env
   VITE_GOOGLE_CLIENT_ID=<your_client_id>
   ```

4. **Run the SQL migration** (see Supabase schema above) via Supabase SQL Editor or a migration file.

### Files to create

| File | Purpose |
|---|---|
| `src/routes/_authenticated/settings.tsx` | SettingsLayout route (sub-sidebar + outlet) |
| `src/routes/_authenticated/settings/index.tsx` | General settings page (placeholder) |
| `src/routes/_authenticated/settings/integrations.tsx` | Integrations layout route (renders Outlet) |
| `src/routes/_authenticated/settings/integrations/index.tsx` | Integrations list page (IntegrationCards) |
| `src/routes/_authenticated/settings/integrations/google-calendar.tsx` | Google Calendar connect/connected page |
| `src/routes/_authenticated/settings/integrations/google-calendar/callback.tsx` | OAuth callback handler |
| `src/components/layout/settings-layout.tsx` | SettingsLayout component |
| `src/components/layout/settings-sidebar.tsx` | Settings sub-sidebar component |
| `src/components/integrations/integration-card.tsx` | IntegrationCard component |
| `src/components/integrations/connect-button.tsx` | ConnectButton component |
| `src/components/integrations/calendar-selector.tsx` | CalendarSelector component |
| `src/components/integrations/disconnect-button.tsx` | DisconnectButton component |
| `src/lib/google-oauth.ts` | Helper: build auth URL, generate state, exchange code (calls Edge Function) |
| `src/lib/google-calendar.ts` | Helper: list calendars, refresh token check (calls Edge Function for refresh) |
| `supabase/functions/google-oauth-exchange/index.ts` | Edge Function: code → tokens → DB |
| `supabase/functions/google-token-refresh/index.ts` | Edge Function: refresh expired access token |
| `supabase/functions/google-oauth-disconnect/index.ts` | Edge Function: revoke + delete (optional) |
| `supabase/migrations/0001_google_oauth_tokens.sql` | SQL migration for table + RLS |

### Implementation order (suggested)

1. SQL migration (table + RLS) — run in Supabase SQL Editor
2. Edge Function `google-oauth-exchange` — test with a dummy code
3. `src/lib/google-oauth.ts` — auth URL builder, state generation
4. `src/components/layout/settings-sidebar.tsx` and `settings-layout.tsx`
5. `src/routes/_authenticated/settings.tsx` + `settings/index.tsx`
6. `src/routes/_authenticated/settings/integrations.tsx` + `integrations/index.tsx`
7. `src/components/integrations/integration-card.tsx`
8. `src/components/integrations/connect-button.tsx`
9. `src/routes/_authenticated/settings/integrations/google-calendar.tsx`
10. `src/routes/_authenticated/settings/integrations/google-calendar/callback.tsx`
11. Edge Function `google-token-refresh`
12. `src/lib/google-calendar.ts` — calendar list fetch
13. `src/components/integrations/calendar-selector.tsx` and `disconnect-button.tsx`
14. Edge Function `google-oauth-disconnect` (optional)

### Edge Function template (google-oauth-exchange)

```typescript
// supabase/functions/google-oauth-exchange/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://accounts.google.com/o/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        redirect_uri: Deno.env.get("GOOGLE_REDIRECT_URI")!,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();
    if (tokens.error) {
      return new Response(JSON.stringify({ error: tokens.error }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from JWT
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate expires_at
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Upsert tokens
    const { error: upsertError } = await supabase
      .from("google_oauth_tokens")
      .upsert({
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        scope: tokens.scope,
      }, { onConflict: "user_id" });

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### Frontend OAuth helper template

```typescript
// src/lib/google-oauth.ts
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = "https://www.googleapis.com/auth/calendar";

export function buildAuthUrl(): { url: string; state: string } {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = `${window.location.origin}/settings/integrations/google-calendar/callback`;
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    state,
    prompt: "consent",
    include_granted_scopes: "true",
  });

  return { url: `${GOOGLE_AUTH_URL}?${params.toString()}`, state };
}

export function initiateOAuthFlow() {
  const { url, state } = buildAuthUrl();
  sessionStorage.setItem("google_oauth_state", state);
  window.location.href = url;
}

export function validateOAuthState(state: string | null): boolean {
  const stored = sessionStorage.getItem("google_oauth_state");
  sessionStorage.removeItem("google_oauth_state");
  return stored !== null && stored === state;
}

export async function exchangeCodeForTokens(code: string, jwt: string) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-exchange`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`,
      },
      body: JSON.stringify({ code }),
    }
  );
  return response.json();
}
```

## Open Questions

1. **Google Cloud project ownership** — Who creates the Google Cloud project and OAuth credentials? The researcher cannot create these. Andrew (or a team member) needs to:
   - Create a Google Cloud project
   - Enable Google Calendar API
   - Create OAuth 2.0 credentials (Web application type)
   - Configure the consent screen
   - Provide the Client ID to the frontend env and Client ID + Secret to Supabase Edge Function secrets

2. **OAuth consent screen verification** — For production use with the `calendar` scope (a sensitive/restricted scope), Google requires an OAuth consent screen verification process. For development/testing, the app can run in "testing" mode with up to 100 test users. When is production verification needed?

3. **Production redirect URI** — What is the production domain for WubbaCRM? The redirect URI must be configured in Google Cloud Console. Currently only `http://localhost:5173` is known (dev).

4. **Calendar selection persistence** — Should `calendar_id` be a single selected calendar, or should we support multiple calendars per user? The current schema has one `calendar_id` per user. If multiple calendars are needed later, we'd need a separate `google_calendar_selections` table.

5. **Token encryption** — Should access_token and refresh_token be encrypted at rest in Supabase using pgcrypto? For now the brief assumes plaintext with RLS protection. If compliance requires encryption, the Edge Functions would handle encrypt/decrypt.

## Cross-References

- Supabase client setup: see `../setup/supabase-client.md`
- Auth patterns (JWT, session): see `../setup/auth-patterns.md`
- TanStack Router file-based routing: see `../setup/tanstack-router.md`
- Project structure: see `../setup/project-structure.md`
- Component styling (Button, Card, Badge): see `../style/component-patterns.md`
- Layout patterns (sidebar, header): see `../style/layout-patterns.md`
- Color tokens: see `../style/color-system.md`

## Sources

- Google OAuth 2.0 Web Server flow: https://developers.google.com/identity/protocols/oauth2/web-server
- Google OAuth 2.0 overview: https://developers.google.com/identity/protocols/oauth2
- Google OAuth 2.0 scopes: https://developers.google.com/identity/protocols/oauth2/scopes
- Google Calendar API v3 reference: https://developers.google.com/workspace/calendar/api/v3/reference
- Google Calendar API quotas: https://developers.google.com/workspace/calendar/api/guides/quota
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase OAuth token storage discussion: https://github.com/orgs/supabase/discussions/22578
- Google PKCE + client secret (StackOverflow): https://stackoverflow.com/questions/76528208/google-oauth-2-0-authorization-code-with-pkce-requires-a-client-secret
- Google token refresh guide: https://medium.com/@ashokyogi5/a-beginners-guide-to-google-oauth-and-google-apis-450f36389184