# WubbaCRM

A CRM web application built with React, TanStack Router, Tailwind CSS, BiomeJS, and Supabase authentication.

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

## Getting Started

### 1. Install dependencies

```shell
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your Supabase project details:

```shell
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-key-here
```

You can find these in your Supabase Dashboard under **Settings > API Keys**.

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

## Project Structure

```
src/
  lib/
    supabase.ts              # Supabase client wrapper
  routes/
    __root.tsx               # Root route (layout outlet)
    login.tsx                # Login page (/login)
    _authenticated.tsx       # Protected layout route (redirects to /login if not authed)
    _authenticated/
      index.tsx              # Protected home page (/) → "Hello World"
  test/
    setup.ts                 # Vitest setup (jest-dom matchers)
    sanity.test.ts           # Basic sanity test
  main.tsx                   # App entry, router setup
  index.css                  # Tailwind CSS import
  routeTree.gen.ts           # Auto-generated route tree (do not edit)
```

## Auth Flow

1. Unauthenticated users are redirected to `/login`
2. Login form calls `supabase.auth.signInWithPassword()`
3. On success, user is navigated to `/` which shows "Hello World"
4. Logout button calls `supabase.auth.signOut()` and user is redirected back to `/login`

The protected route uses TanStack Router's `beforeLoad` hook with `supabase.auth.getSession()` to check auth status before rendering.

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

## Supabase Configuration

The Supabase project for WubbaCRM is in `ap-southeast-1` (Singapore). For local development, ensure your Supabase project's auth redirect URLs include `http://localhost:5173` (Dashboard > Authentication > URL Configuration).

To create a test user, go to Supabase Dashboard > Authentication > Users > Add user, or use the signup flow in the app.

## Google Calendar Integration

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

### Environment variables

#### Frontend (`.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID (public, safe for frontend). Found in Cloud Console > Credentials. |

> **Note on the redirect URI:** The OAuth redirect URI is derived automatically from `window.location.origin` at runtime (`/settings/integrations/google-calendar/callback` is appended). There is no `VITE_GOOGLE_REDIRECT_URI` env var — just make sure the redirect URI for your environment is listed in Google Cloud Console's **Authorized redirect URIs**.

#### Supabase Edge Functions (server-side secrets)

Set these via `supabase secrets set KEY=VALUE` or the Supabase Dashboard > Edge Functions > Secrets. **Never** put these in `.env.local` or commit them to the repo.

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Same OAuth client ID as the frontend. |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret — server-side only. |
| `GOOGLE_REDIRECT_URI` | Must match the frontend redirect URI exactly (e.g. `http://localhost:5173/settings/integrations/google-calendar/callback`). |
| `SUPABASE_URL` | Your Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — used to write/refresh token rows in the `google_oauth_tokens` table. |

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

## License

Private — WubbaLubbaDev