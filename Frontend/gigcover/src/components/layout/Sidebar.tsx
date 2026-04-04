import React from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, FileText, Shield, Bell, Play, LogOut, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/claims', label: 'Claims', icon: FileText },
  { href: '/dashboard/policy', label: 'Policy', icon: Shield },
  { href: '/dashboard/alerts', label: 'Alerts', icon: Bell, badge: '3' },
  { href: '/dashboard/demo', label: 'Simulate Demo', icon: Play },
];

export function Sidebar({ className }: { className?: string }) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'GC';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div
      className={cn(
        "flex flex-col w-64 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-xl",
        className
      )}
    >
      {/* Logo — pinned top, never scrolls */}
      <div className="flex-shrink-0 p-6 flex items-center gap-3">
        <div className="bg-gradient-to-br from-primary to-orange-400 p-2 rounded-xl shadow-lg shadow-primary/20">
          <ShieldCheck className="w-6 h-6 text-primary-foreground" />
        </div>
        <span className="font-display font-bold text-2xl tracking-tight text-white">
          Gig<span className="text-primary">Cover</span>
        </span>
      </div>

      {/* User Info — pinned, never scrolls */}
      {user && (
        <div className="flex-shrink-0 mx-4 mb-2 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-orange-300 flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-white/50 truncate">{user.platform} • {user.city}</p>
          </div>
        </div>
      )}

      {/* Nav — scrollable middle section */}
      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1 min-h-0">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20 font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive
                    ? "text-white"
                    : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                )}
              />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    "ml-auto text-xs font-bold px-2 py-0.5 rounded-full",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sign Out — pinned bottom, always visible */}
      <div className="flex-shrink-0 p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-destructive transition-colors duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
