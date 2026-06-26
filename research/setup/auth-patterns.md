# Auth Flow Patterns

Login, protected routes, onAuthStateChange listener, and logout redirect chain. All patterns use the Supabase client from `supabase-client.md` and TanStack Router from `tanstack-router.md`.

## Pattern 1: Protected Layout Route (`beforeLoad` + `getSession`)

The `_authenticated.tsx` layout route guards all protected pages. Before loading, it checks for a session and redirects to `/login` if none exists:

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw redirect({ to: '/login' })
    }
  },
})
```

The layout component wraps pages in DashboardLayout (see `../style/layout-patterns.md`).

## Pattern 2: Login Page

Login form with email + password. On submit, calls `signInWithPassword()`. On success, navigates to `/`:

```tsx
import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      navigate({ to: '/' })
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="block w-64 rounded border p-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="block w-64 rounded border p-2"
        />
        {error && <p className="text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="rounded bg-blue-500 px-4 py-2 text-white">
          {loading ? 'Loading...' : 'Login'}
        </button>
      </form>
    </div>
  )
}
```

For the styled login page (using the design system), see `../style/layout-patterns.md` → Login Page Styling.

## Pattern 3: Logout

```tsx
const handleLogout = async () => {
  await supabase.auth.signOut()
}
```

After `signOut()`, the `onAuthStateChange` listener (in root route) detects the `SIGNED_OUT` event and the router can redirect to `/login`.

## Pattern 4: Auth State Listener (`onAuthStateChange`)

Set up in the root route or app entry to react to login/logout events and trigger router refreshes:

```tsx
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Inside root route component:
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    // Handle auth state change — e.g., invalidate router, update context
  })
  return () => subscription.unsubscribe()
}, [])
```

## Pattern 5: Protected Page

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
})

function HomePage() {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Hello World</h1>
      <button onClick={handleLogout} className="rounded bg-gray-500 px-4 py-2 text-white">
        Logout
      </button>
    </div>
  )
}
```

## Pattern 6: Third-Party OAuth Token Storage (Google Calendar)

For integrations with third-party services like Google Calendar, we store OAuth tokens (access_token, refresh_token) in a dedicated Supabase table. The flow is distinct from Supabase's own auth — these are provider tokens for accessing Google APIs, not Supabase session tokens.

### Token Storage Table

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

### RLS Policies

```sql
ALTER TABLE public.google_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own oauth tokens"
  ON public.google_oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own oauth tokens"
  ON public.google_oauth_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own oauth tokens"
  ON public.google_oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own oauth tokens"
  ON public.google_oauth_tokens FOR DELETE
  USING (auth.uid() = user_id);
```

### Security Notes

- Edge Functions use the service role key (`sb_secret_...`) to bypass RLS for token writes during the OAuth exchange flow. The Edge Function validates the caller's JWT first.
- The client_secret for Google OAuth is stored ONLY in Supabase Edge Function secrets — never in frontend `.env.local`.
- The `state` parameter (random UUID stored in sessionStorage) protects against CSRF during the OAuth redirect.
- Access tokens expire after ~1 hour. Use the `google-token-refresh` Edge Function to refresh before calling Google APIs.
- On disconnect, revoke the token at Google's revocation endpoint and delete the DB row.

See `../features/google-calendar-integration-brief.md` for the full OAuth flow, Edge Function templates, and implementation details.

## Cross-References

- Supabase client setup (`src/lib/supabase.ts`): see `supabase-client.md`
- `beforeLoad` and route file conventions: see `tanstack-router.md`
- Login page styling (design system version): see `../style/layout-patterns.md`
- Google Calendar integration full brief: see `../features/google-calendar-integration-brief.md`

## Sources

- Supabase React auth quickstart: https://supabase.com/docs/guides/auth/quickstarts/react
- Supabase password auth: https://supabase.com/docs/guides/auth/passwords
- TanStack Router quick start: https://tanstack.com/router/v1/docs/quick-start
- Google OAuth 2.0 Web Server flow: https://developers.google.com/identity/protocols/oauth2/web-server
- Supabase Edge Functions: https://supabase.com/docs/guides/functions