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

## Cross-References

- Supabase client setup (`src/lib/supabase.ts`): see `supabase-client.md`
- `beforeLoad` and route file conventions: see `tanstack-router.md`
- Login page styling (design system version): see `../style/layout-patterns.md`

## Sources

- Supabase React auth quickstart: https://supabase.com/docs/guides/auth/quickstarts/react
- Supabase password auth: https://supabase.com/docs/guides/auth/passwords
- TanStack Router quick start: https://tanstack.com/router/v1/docs/quick-start