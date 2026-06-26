import { describe, expect, it } from 'vitest';
import { isTokenExpired } from '@/lib/google-calendar';

describe('google-calendar', () => {
  describe('isTokenExpired', () => {
    it('returns true when expires_at is in the past', () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      expect(isTokenExpired(pastDate)).toBe(true);
    });

    it('returns true when expires_at is now', () => {
      const now = new Date().toISOString();
      expect(isTokenExpired(now)).toBe(true);
    });

    it('returns false when expires_at is in the future', () => {
      const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
      expect(isTokenExpired(futureDate)).toBe(false);
    });
  });
});
