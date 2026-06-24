import { createRootRoute, Outlet, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const router = useRouter();

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      // Re-run beforeLoad guards so protected routes redirect to /login
      // when the session is gone (explicit logout or token expiry).
      router.invalidate();
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  return <Outlet />;
}
