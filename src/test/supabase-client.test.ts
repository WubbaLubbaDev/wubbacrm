import { describe, expect, it, vi } from 'vitest';

// Capture the createClient call args so we can assert on the options.
const createClientCalls: Array<{ url: unknown; key: unknown; opts: unknown }> = [];

vi.mock('@supabase/supabase-js', () => ({
  createClient: (url: unknown, key: unknown, opts?: unknown) => {
    createClientCalls.push({ url, key, opts });
    return {
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
    };
  },
}));

// Stub env vars so the module doesn't throw on load
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

// Import after mock is set up — this triggers createClient with our options
await import('@/lib/supabase');

describe('supabase client configuration', () => {
  it('disables detectSessionInUrl to prevent PKCE false-positive on Google OAuth callback', () => {
    expect(createClientCalls).toHaveLength(1);
    expect(createClientCalls[0].opts).toEqual({
      auth: { detectSessionInUrl: false },
    });
  });
});
