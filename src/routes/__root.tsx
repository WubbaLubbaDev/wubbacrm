import { createRootRoute, Outlet, useLocation, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { ChatWidget } from '@/components/chat/chat-widget';
import { supabase } from '@/lib/supabase';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const router = useRouter();
  const location = useLocation();

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

  // Show the floating chat widget on the login page (public).
  // Authenticated dashboard routes have their own layout and don't need the widget.
  // The /chat route is a standalone page — no floating button needed there.
  const showChatWidget = location.pathname === '/login';

  return (
    <>
      <Outlet />
      {showChatWidget && <ChatWidget />}
    </>
  );
}
