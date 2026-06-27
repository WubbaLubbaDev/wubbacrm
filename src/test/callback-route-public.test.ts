import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// This test guards against a regression where the Google OAuth callback route
// is accidentally placed under the _authenticated layout route. When it's under
// _authenticated, the beforeLoad auth guard runs BEFORE the callback component
// mounts, redirecting the user to /login during the session hydration race that
// follows Google's full-page redirect back to the SPA. The callback must be a
// top-level (public) route so it can handle the session check itself.
//
// We verify by inspecting the auto-generated route tree source, which reflects
// the actual file-based route structure. If the callback import path changes
// back to './routes/_authenticated/...', the test fails.

describe('OAuth callback route placement', () => {
  it('is a top-level public route (NOT nested under _authenticated)', () => {
    const routeTreePath = path.resolve(import.meta.dirname, '../routeTree.gen.ts');
    const routeTreeSrc = readFileSync(routeTreePath, 'utf-8');

    // The callback route should be imported from './routes/oauth/...' (public),
    // NOT from './routes/_authenticated/settings/integrations/google-calendar/callback'.
    expect(routeTreeSrc).toContain("from './routes/oauth/google-calendar/callback'");
    expect(routeTreeSrc).not.toContain(
      "from './routes/_authenticated/settings/integrations/google-calendar/callback'",
    );

    // The callback route's parent should be rootRouteImport, NOT AuthenticatedRoute.
    const callbackMatch = routeTreeSrc.match(
      /OauthGoogleCalendarCallbackRouteImport\.update\(\{[^}]*getParentRoute:\s*\(\)\s*=>\s*(\w+)/,
    );
    expect(callbackMatch).not.toBeNull();
    expect(callbackMatch?.[1]).toBe('rootRouteImport');
  });
});
