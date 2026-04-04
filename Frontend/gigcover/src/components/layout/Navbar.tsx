import React from 'react';
import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'RA';

  const displayName = user?.name || 'Gig Worker';
  const displaySub = user ? `${user.zoneType || 'Urban'} • ${user.platform || 'RakshitArtha'}` : 'Urban Premium';

  return (
    <header className="h-20 bg-background/90 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-8 fixed top-0 left-0 right-0 z-40">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="w-5 h-5 text-foreground" />
        </Button>
        <div className="hidden sm:flex items-center relative">
          <span className="text-sm text-muted-foreground">
            Welcome back, <span className="font-semibold text-foreground">{displayName.split(' ')[0]}</span> 👋
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
        </Button>

        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">{displaySub}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-linear-to-tr from-primary to-orange-300 flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/20">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
