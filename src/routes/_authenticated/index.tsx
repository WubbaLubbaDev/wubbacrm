import { createFileRoute } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';

export const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
});

function HomePage() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Hello World</h1>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
      >
        Logout
      </button>
    </div>
  );
}
