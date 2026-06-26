import { useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { supabase } from '@/lib/supabase';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/contacts': 'Contacts',
  '/companies': 'Companies',
  '/deals': 'Deals',
  '/settings': 'Settings',
  '/settings/integrations': 'Integrations',
  '/settings/integrations/google-calendar': 'Google Calendar',
  '/settings/integrations/google-calendar/callback': 'Google Calendar',
};

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: '/login' });
  };

  const pageTitle = pageTitles[location.pathname] ?? 'Page';
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : 'U';

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-background px-6">
      <h1 className="shrink-0 text-lg font-semibold tracking-tight text-foreground">{pageTitle}</h1>

      {/* Full-width search bar */}
      <div className="relative flex flex-1 items-center">
        <SearchIcon className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search contacts, companies, deals..."
          className="h-9 w-full pl-9"
        />
      </div>

      {/* User menu */}
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="User menu"
          aria-expanded={menuOpen}
        >
          <Avatar fallback={initials} size="sm" />
        </button>

        {menuOpen && (
          <div
            className={cn(
              'absolute right-0 top-full z-[60] mt-2 w-56 rounded-lg border border-border bg-popover p-1 shadow-md',
            )}
            role="menu"
          >
            <div
              className="truncate px-3 py-2 text-sm text-muted-foreground"
              title={userEmail ?? undefined}
            >
              {userEmail ?? 'Signed in'}
            </div>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-accent"
              role="menuitem"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
