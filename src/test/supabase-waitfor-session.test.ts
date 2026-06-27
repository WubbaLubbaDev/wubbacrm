import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @supabase/supabase-js createClient BEFORE importing the module.
// This way waitForSession() in supabase.ts uses our mock client.
const mockGetSession = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
  }),
}));

// Stub env vars so the module doesn't throw on load
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

// Import after mock is set up
const { waitForSession } = await import('@/lib/supabase');

describe('waitForSession', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns session immediately when available', async () => {
    const mockSession = { user: { id: 'test-user' }, access_token: 'token' };
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });

    const result = await waitForSession(1000, 50);

    expect(result.data.session).toBe(mockSession);
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it('returns null session after timeout when no session available', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const result = await waitForSession(150, 50);

    expect(result.data.session).toBeNull();
    // Should have polled multiple times before giving up
    expect(mockGetSession.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('polls until session becomes available', async () => {
    const mockSession = { user: { id: 'test-user' }, access_token: 'token' };
    // First two calls return null, third returns the session
    mockGetSession
      .mockResolvedValueOnce({ data: { session: null } })
      .mockResolvedValueOnce({ data: { session: null } })
      .mockResolvedValueOnce({ data: { session: mockSession } });

    const result = await waitForSession(3000, 10);

    expect(result.data.session).toBe(mockSession);
    expect(mockGetSession).toHaveBeenCalledTimes(3);
  });
});
