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

## License

Private — WubbaLubbaDev