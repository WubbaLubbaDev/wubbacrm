import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock import.meta.env before importing the module
vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id');
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');

// We need to mock window.location.origin and sessionStorage
const mockOrigin = 'http://localhost:5173';
Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    get origin() {
      return mockOrigin;
    },
    set href(val: string) {
      // Capture the redirect URL for testing
      (window as unknown as { _redirectUrl: string })._redirectUrl = val;
    },
    get href() {
      return (window as unknown as { _redirectUrl?: string })._redirectUrl ?? '';
    },
  },
  writable: true,
});

// Import after mocks are set up
const { buildAuthUrl, initiateOAuthFlow, validateOAuthState } = await import('@/lib/google-oauth');

describe('google-oauth', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('buildAuthUrl', () => {
    it('returns a URL with the correct OAuth parameters', () => {
      const { url, state } = buildAuthUrl();

      expect(state).toBeDefined();
      expect(state).toHaveLength(36); // UUID length

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar');
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
      expect(url).toContain('include_granted_scopes=true');
      expect(url).toContain(`state=${state}`);
    });

    it('uses the correct redirect URI', () => {
      const { url } = buildAuthUrl();

      const redirectUri = encodeURIComponent(
        'http://localhost:5173/settings/integrations/google-calendar/callback',
      );
      expect(url).toContain(`redirect_uri=${redirectUri}`);
    });

    it('generates a unique state each time', () => {
      const { state: state1 } = buildAuthUrl();
      const { state: state2 } = buildAuthUrl();
      expect(state1).not.toBe(state2);
    });
  });

  describe('initiateOAuthFlow', () => {
    it('stores state in sessionStorage and redirects', () => {
      initiateOAuthFlow();

      const stored = sessionStorage.getItem('google_oauth_state');
      expect(stored).toBeDefined();
      expect(stored).toHaveLength(36);

      // window.location.href should have been set to the auth URL
      const redirectUrl = (window as unknown as { _redirectUrl?: string })._redirectUrl;
      expect(redirectUrl).toContain('accounts.google.com');
    });
  });

  describe('validateOAuthState', () => {
    it('returns true when state matches', () => {
      const { state } = buildAuthUrl();
      sessionStorage.setItem('google_oauth_state', state);

      expect(validateOAuthState(state)).toBe(true);
    });

    it('returns false when state does not match', () => {
      sessionStorage.setItem('google_oauth_state', 'original-state');

      expect(validateOAuthState('wrong-state')).toBe(false);
    });

    it('returns false when no state is stored', () => {
      expect(validateOAuthState('some-state')).toBe(false);
    });

    it('returns false when state param is null', () => {
      sessionStorage.setItem('google_oauth_state', 'stored-state');
      expect(validateOAuthState(null)).toBe(false);
    });

    it('clears the stored state after validation', () => {
      sessionStorage.setItem('google_oauth_state', 'test-state');
      validateOAuthState('test-state');

      expect(sessionStorage.getItem('google_oauth_state')).toBeNull();
    });

    it('clears the stored state even on mismatch', () => {
      sessionStorage.setItem('google_oauth_state', 'test-state');
      validateOAuthState('wrong-state');

      expect(sessionStorage.getItem('google_oauth_state')).toBeNull();
    });
  });
});
