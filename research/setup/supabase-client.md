# Supabase Client

Supabase project details, API keys, client module, environment variables, and auth configuration.

## Project Details

| Property | Value |
|---|---|
| **Project name** | WubbaCRM |
| **Project ref/ID** | `ilzybrpxitjcdcoxuqak` |
| **Organization ID** | `cxzjihxdzhkbndhhkzgb` |
| **Region** | `ap-southeast-1` (Singapore) |
| **Database host** | `db.ilzybrpxitjcdcoxuqak.supabase.co` |
| **Project URL** | `https://ilzybrpxitjcdcoxuqak.supabase.co` |
| **Postgres version** | 17.6.1.127 |

## API Keys

The project has legacy keys (deprecated end of 2026) and new publishable/secret keys:

| Key type | Prefix | Status |
|---|---|---|
| legacy anon | `9KJYA...` | Deprecated end of 2026 |
| legacy service_role | `echff...` | Deprecated end of 2026 |
| **publishable** (new) | `sb_publishable_DzPG1...` | **Recommended for client-side** |
| secret (new) | `sb_secret_VUb-p...` | Server-side only |

**For the web app (client-side), use the publishable key.** It works as a drop-in replacement for the legacy anon key in `@supabase/supabase-js`.

**Security:** Never hardcode keys in source or commit them to git. Retrieve at build time via:
1. Supabase Dashboard (Settings > API Keys)
2. Supabase Management API: `GET /v1/projects/ilzybrpxitjcdcoxuqak/api-keys` (requires `SUPABASE_ACCESS_TOKEN`)

```shell
curl -H "Authorization: Bearer $SUPAB...KEN" \
  "https://api.supabase.com/v1/projects/ilzybrpxitjcdcoxuqak/api-keys" | \
  python3 -c "import json,sys; [print(k['api_key']) for k in json.load(sys.stdin) if k['type']=='publishable']"
```

## Auth Configuration

| Setting | Value |
|---|---|
| **Site URL** | `http://localhost:3000` |
| **Signup disabled** | `false` (signups enabled) |
| **External email enabled** | `true` |
| **Refresh token rotation** | `true` |

Email/password auth is enabled by default. `signInWithPassword()` and `signUp()` work without additional dashboard configuration.

**Local dev gotcha:** The Supabase site URL is `http://localhost:3000` but Vite dev server runs on `http://localhost:5173`. Either:
- Update the site URL in Supabase dashboard to `http://localhost:5173`, OR
- Add `http://localhost:5173` to the redirect URLs (Auth > URL Configuration)

## Supabase Client Module

Install:
```shell
npm install @supabase/supabase-js
```

Create `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## Key Auth Methods

| Method | Purpose |
|---|---|
| `supabase.auth.signUp({ email, password })` | Register a new user |
| `supabase.auth.signInWithPassword({ email, password })` | Login with email + password |
| `supabase.auth.signOut()` | Log out |
| `supabase.auth.getSession()` | Get current session (check if logged in) |
| `supabase.auth.onAuthStateChange(callback)` | Subscribe to auth state changes |
| `supabase.auth.getUser()` | Get current user object |

## Environment Variables

| Variable | Value | Source |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://ilzybrpxitjcdcoxuqak.supabase.co` | This document |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` (full value from API) | Supabase Management API or dashboard |
| `SUPABASE_ACCESS_TOKEN` | (in env) | Used only for retrieving keys, not needed in the app |

`.env.local`:
```env
VITE_SUPABASE_URL=https://ilzybrpxitjcdcoxuqak.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key from dashboard or API>
```

**Note:** The env var name `VITE_SUPABASE_ANON_KEY` is used per the task spec. The new publishable key (`sb_publishable_xxx`) works as a drop-in replacement for the legacy anon key. Supabase docs now call it `VITE_SUPABASE_PUBLISHABLE_KEY`, but either name works as long as the code references the same env var.

Add `.env.local` to `.gitignore` (the scaffold should already do this).

## Gotchas

1. **Supabase site URL mismatch** — Default is `http://localhost:3000`, Vite runs on `http://localhost:5173`. Update the dashboard or add redirect URL.
2. **Publishable vs anon key** — The new `sb_publishable_xxx` key replaces the legacy anon key. Both work for now, but legacy keys are deprecated end of 2026.
3. **Email confirmation** — Enabled by default on hosted Supabase. For local dev, disable in dashboard (Auth > Providers > Email > Confirm email = off) or users must confirm before logging in.

## Cross-References

- Auth flow patterns using the client: see `auth-patterns.md`
- Project structure (where `src/lib/supabase.ts` lives): see `project-structure.md`

## Sources

- Supabase React auth quickstart: https://supabase.com/docs/guides/auth/quickstarts/react
- Supabase password auth: https://supabase.com/docs/guides/auth/passwords