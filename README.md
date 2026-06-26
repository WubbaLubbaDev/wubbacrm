# WubbaCRM

A CRM web application built with React, TanStack Router, Tailwind CSS, BiomeJS, and Supabase authentication. Includes a Google Calendar integration via OAuth 2.0.

## Tech Stack

- **React 19** + **Vite 6** — UI framework and build tool
- **TanStack Router** — type-safe file-based routing with auto code splitting
- **Tailwind CSS v4** — utility-first CSS via Vite plugin
- **BiomeJS** — fast linter + formatter (replaces ESLint + Prettier)
- **Supabase** — auth, database, and storage backend
- **Vitest** + **Testing Library** — unit/integration tests

## Prerequisites

- Node.js 22+
- npm 10+
- A Supabase project with email/password auth enabled
- (Optional) A Google Cloud project with the Calendar API enabled — only if you want the Google Calendar integration

## Installation

### 1. Install dependencies

```shell
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your values:

```shell
cp .env.example .env.local
```

See the [Environment Variables](#environment-variables) section below for the complete list.

### 3. Run the dev server

```shell
npm run dev
```

The app runs at `http://localhost:5173`.

### 4. Build for production

```shell
npm run build
```

Output goes to `dist/`.

## Environment Variables

All configuration is driven by environment variables. There are two tiers: **frontend** vars (safe to expose in the browser, loaded from `.env.local`) and **server-side** secrets (used only by Supabase Edge Functions, set via `supabase secrets set` — never committed or placed in `.env.local`).

### Frontend (`.env.local`)

These are bundled into the client by Vite (any `VITE_`-prefixed var). Copy `.env.example` to `.env.local` and fill in your values.

| Variable | Description | Example | Where to get it |
|----------|-------------|---------|-----------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL. Used by the Supabase client and to call Edge Functions. | `https://your-project-ref.supabase.co` | Supabase Dashboard > **Settings > API** (Project URL) |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable/anon key. Client-side safe; used for auth and DB access (RLS-protected). | `your-publishable-key-here` | Supabase Dashboard > **Settings > API Keys** (publishable key) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID. Public value, safe for the frontend. Used to initiate the OAuth consent flow. | `123456789-abcdef.apps.googleusercontent.com` | Google Cloud Console > **APIs & Services > Credentials** (OAuth 2.0 Client ID) |

> **Redirect URI note:** The OAuth redirect URI is derived automatically from `window.location.origin` at runtime as `<origin>/settings/integrations/google-calendar/callback`. There is **no** `VITE_GOOGLE_REDIRECT_URI` env var — instead, make sure the redirect URI for each environment is registered in Google Cloud Console under **Authorized redirect URIs** (e.g. `http://localhost:5173/settings/integrations/google-calendar/callback` for local dev).

### Server-side secrets (Supabase Edge Functions)

These are required by the `google-oauth-exchange`, `google-oauth-disconnect`, and `google-token-refresh` Edge Functions (source in `supabase/functions/`). Set them via `supabase secrets set KEY=VALUE` or the Supabase Dashboard > **Edge Functions > Secrets**. **Never** put these in `.env.local` or commit them to the repo.

| Variable | Description | Example | Where to get it |
|----------|-------------|---------|-----------------|
| `GOOGLE_CLIENT_ID` | Same OAuth client ID as `VITE_GOOGLE_CLIENT_ID` above. | `123456789-abcdef.apps.googleusercontent.com` | Google Cloud Console > **Credentials** |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret — server-side only. Never expose in the frontend. | `GOCSPX-your-secret-here` | Google Cloud Console > **Credentials** (client secret, shown once at creation) |
| `GOOGLE_REDIRECT_URI` | Must match the frontend redirect URI exactly (the full origin + path). | `http://localhost:5173/settings/integrations/google-calendar/callback` | Compose from your deployment origin + `/settings/integrations/google-calendar/callback` |
| `SUPABASE_URL` | Your Supabase project URL (same value as `VITE_SUPABASE_URL`). | `https://your-project-ref.supabase.co` | Supabase Dashboard > **Settings > API** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — used by Edge Functions to write/refresh token rows in the `google_oauth_tokens` table. Bypasses RLS; keep secret. | `your-service-role-key-here` | Supabase Dashboard > **Settings > API Keys** (service role key) |

## Google Calendar Setup

WubbaCRM can connect to a user's Google Calendar via OAuth 2.0. The integration lets users list their calendars, select one for syncing, and (in future phases) create events under contacts. The OAuth flow uses the standard Authorization Code flow with server-side token exchange — the client secret never touches the frontend.

### Prerequisites

1. A Google Cloud project with the Calendar API enabled
2. OAuth 2.0 credentials (Web Application type) created in that project
3. Three Supabase Edge Functions deployed: `google-oauth-exchange`, `google-oauth-disconnect`, and `google-token-refresh` (source in `supabase/functions/`)

### Google Cloud Console setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create (or select) a project.
2. Enable the **Google Calendar API**:
   - Navigate to **APIs & Services > Library**
   - Search for "Google Calendar API" and click **Enable**
3. Create OAuth 2.0 credentials:
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth client ID**
   - Select **Web application** as the type
   - Under **Authorized redirect URIs**, add the callback URL for each environment:
     - Local dev: `http://localhost:5173/settings/integrations/google-calendar/callback`
     - Production: `https://your-domain.com/settings/integrations/google-calendar/callback`
   - Note the **Client ID** and **Client Secret** shown after creation
4. Configure the OAuth consent screen (**APIs & Services > OAuth consent screen**) with your app name, support email, and scopes. Add the `https://www.googleapis.com/auth/calendar` scope. If your app is in "Testing" status, add your own Google account as a test user.
5. Set the server-side secrets listed in the [Environment Variables](#server-side-secrets-supabase-edge-functions) section via `supabase secrets set`.

### OAuth flow

```
User clicks "Connect Google Calendar"
        │
        ▼
Frontend generates a CSRF state token, stores it in sessionStorage,
and redirects the browser to Google's consent screen.
        │
        ▼
User grants calendar access on Google's consent page.
        │
        ▼
Google redirects back to /settings/integrations/google-calendar/callback
with an authorization code + state parameter.
        │
        ▼
Callback route validates the state against sessionStorage, then calls
the google-oauth-exchange Edge Function (with the user's Supabase JWT)
to swap the code for access + refresh tokens server-side.
        │
        ▼
Edge Function stores the tokens in the google_oauth_tokens table
(RLS-protected, scoped to the user) and returns success.
        │
        ▼
User is redirected to the Google Calendar settings page, which now
shows the connected state and a calendar selector dropdown.
```

When the access token expires, the frontend calls the `google-token-refresh` Edge Function (with the user's JWT) to get a fresh token using the stored refresh token. Disconnecting revokes the token at Google and deletes the DB row via the `google-oauth-disconnect` Edge Function.

### Database table

The integration stores tokens in a `google_oauth_tokens` table (RLS-protected, one row per user). If you haven't already created it, run the migration in `supabase/migrations/` or create it manually with columns: `id`, `user_id`, `access_token`, `refresh_token`, `expires_at`, `scope`, `calendar_id`, `connected_at`, `updated_at`.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run Biome lint + format (with auto-fix) |
| `npm run format` | Format code with Biome |
| `npm run check` | Run Biome CI check (no fixes) |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
src/
  components/
    ui/                         # UI primitives (Button, Card, Input, Label, Badge, Avatar, Separator, Skeleton, EmptyState)
    layout/                     # Layout components (DashboardLayout, Sidebar, Topbar, SettingsLayout, SettingsSidebar)
    integrations/               # Google Calendar integration components (ConnectButton, DisconnectButton, CalendarSelector, IntegrationCard)
  lib/
    supabase.ts                 # Supabase client wrapper
    google-oauth.ts             # Google OAuth helpers (initiate, exchange, disconnect, refresh)
    google-calendar.ts          # Google Calendar API helpers (list calendars, list events)
    cn.ts                       # className merge utility
  routes/
    __root.tsx                  # Root route (layout outlet)
    login.tsx                   # Login page (/login)
    _authenticated.tsx          # Protected layout route (redirects to /login if not authed)
    _authenticated/
      index.tsx                 # Dashboard home (/)
      contacts.tsx              # Contacts page (/contacts)
      companies.tsx             # Companies page (/companies)
      deals.tsx                 # Deals page (/deals)
      settings.tsx              # Settings layout (/settings)
      settings/
        index.tsx               # General settings (/settings)
        integrations.tsx        # Integrations layout (/settings/integrations)
        integrations/
          index.tsx             # Integrations overview (/settings/integrations)
          google-calendar.tsx   # Google Calendar settings (/settings/integrations/google-calendar)
          google-calendar/
            callback.tsx        # OAuth callback handler (/settings/integrations/google-calendar/callback)
  test/
    setup.ts                    # Vitest setup (jest-dom matchers)
    *.test.tsx / *.test.ts      # Unit/integration tests
  main.tsx                      # App entry, router setup
  index.css                     # Tailwind CSS import
  routeTree.gen.ts              # Auto-generated route tree (do not edit)
  vite-env.d.ts                 # Vite client type reference
supabase/
  functions/                    # Edge Functions (google-oauth-exchange, google-oauth-disconnect, google-token-refresh)
  migrations/                   # SQL migrations (google_oauth_tokens table)
```

## Auth Flow

1. Unauthenticated users are redirected to `/login`
2. Login form calls `supabase.auth.signInWithPassword()`
3. On success, user is navigated to `/` (dashboard home)
4. Logout button calls `supabase.auth.signOut()` and user is redirected back to `/login`

The protected route uses TanStack Router's `beforeLoad` hook with `supabase.auth.getSession()` to check auth status before rendering.

## Supabase Configuration

The Supabase project for WubbaCRM is in `ap-southeast-1` (Singapore). For local development, ensure your Supabase project's auth redirect URLs include `http://localhost:5173` (Dashboard > Authentication > URL Configuration).

To create a test user, go to Supabase Dashboard > Authentication > Users > Add user, or use the signup flow in the app.

## License

Private — WubbaLubbaDev