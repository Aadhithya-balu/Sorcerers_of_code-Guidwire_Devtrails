import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, FileText, Shield, Bell, Play,
  ShieldCheck, LogOut, ChevronLeft
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useAuth } from '@/context/AuthContext';
import { useAlerts, useRiskSnapshot } from '@/hooks/use-api';
import { updateUserProfileFields } from '@/services/auth-api';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

const baseTabs = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/claims', label: 'Claims', icon: FileText },
  { href: '/dashboard/policy', label: 'Policy', icon: Shield },
  { href: '/dashboard/alerts', label: 'Alerts', icon: Bell },
  { href: '/dashboard/demo', label: 'Demo', icon: Play },
];

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
}

export function MobileLayout({ children, title, showBack }: MobileLayoutProps) {
  const [location, navigate] = useLocation();
  const { user, logout, updateUser } = useAuth();
  const defaultUserEmail = import.meta.env.VITE_DEFAULT_USER_EMAIL || 'rajesh@swiggy.com';
  const userIdentifier = {
    userId: user?.backendUserId,
    email: user?.email || defaultUserEmail,
  };
  const { data: navAlerts = [] } = useAlerts();
  const { data: navRiskSnapshot } = useRiskSnapshot(userIdentifier);
  const riskAdvisoryCount = typeof navRiskSnapshot?.overallRisk === 'number' ? 1 : 0;
  const alertBadgeCount = navAlerts.length + riskAdvisoryCount;
  const tabs = baseTabs.map((tab) =>
    tab.href === '/dashboard/alerts'
      ? { ...tab, badge: alertBadgeCount > 0 ? String(alertBadgeCount) : undefined }
      : tab,
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileDraft, setProfileDraft] = useState({
    workingHours: user?.workingHours || '',
    workingDays: user?.workingDays || '',
    avgDailyHours: user?.avgDailyHours || '',
    dailyIncome: user?.dailyIncome ? String(user.dailyIncome) : '',
    themePreference: user?.themePreference || 'system',
    profileImage: user?.profileImage || '',
  });

  const activeTab = tabs.find((t) => t.href === location);
  const pageTitle = title || activeTab?.label || 'RakshitArtha';
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'RA';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const openProfile = () => {
    setProfileError('');
    setProfileDraft({
      workingHours: user?.workingHours || '',
      workingDays: user?.workingDays || '',
      avgDailyHours: user?.avgDailyHours || '',
      dailyIncome: user?.dailyIncome ? String(user.dailyIncome) : '',
      themePreference: user?.themePreference || 'system',
      profileImage: user?.profileImage || '',
    });
    setProfileOpen(true);
  };

  const handleProfileSave = async () => {
    if (!user) return;
    setProfileError('');
    const parsedIncome = profileDraft.dailyIncome.trim() === '' ? undefined : Number(profileDraft.dailyIncome);
    if (profileDraft.dailyIncome.trim() !== '' && (!parsedIncome || parsedIncome <= 0)) {
      setProfileError('Enter a valid daily income.');
      return;
    }

    try {
      setProfileSaving(true);
      if (user.backendUserId) {
        await updateUserProfileFields(user.backendUserId, {
          workingHours: profileDraft.workingHours,
          workingDays: profileDraft.workingDays,
          avgDailyHours: profileDraft.avgDailyHours,
          dailyIncome: parsedIncome,
          themePreference: profileDraft.themePreference as 'light' | 'dark' | 'system',
          profileImage: profileDraft.profileImage || undefined,
        });
      }
      updateUser({
        workingHours: profileDraft.workingHours,
        workingDays: profileDraft.workingDays,
        avgDailyHours: profileDraft.avgDailyHours,
        dailyIncome: parsedIncome,
        themePreference: profileDraft.themePreference as 'light' | 'dark' | 'system',
        profileImage: profileDraft.profileImage || undefined,
      });
      setProfileOpen(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <header className="fixed top-0 inset-x-0 bg-sidebar border-b border-sidebar-border shadow-md z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            {showBack ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-sidebar-foreground" />
              </button>
            ) : (
              <div className="bg-primary/20 p-1.5 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
            )}
            <span className="font-bold text-base text-sidebar-foreground tracking-tight">
              {pageTitle === 'RakshitArtha' || pageTitle === 'Home'
                ? <span>Rakshit<span className="text-primary">Artha</span></span>
                : pageTitle}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <button
                type="button"
                onClick={openProfile}
                className="w-8 h-8 rounded-full bg-linear-to-br from-primary to-orange-400 flex items-center justify-center text-white font-bold text-xs shadow-md overflow-hidden"
                aria-label="Update profile"
              >
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4 text-sidebar-foreground/70" />
            </button>
          </div>
        </div>
      </header>

      <main className="bg-background pt-14 pb-24">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-card-border shadow-[0_-2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_12px_rgba(0,0,0,0.3)] z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-around">
          {tabs.map((tab) => {
            const isActive = location === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2.5 flex-1 relative transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b-full" />
                )}
                <div className="relative">
                  <Icon className={cn('w-5 h-5', isActive ? 'text-primary' : 'text-muted-foreground/70')} />
                  {tab.badge && !isActive && (
                    <span className="absolute -top-1 -right-2 bg-primary text-white text-[9px] font-bold rounded-full min-w-3.5 h-3.5 flex items-center justify-center px-0.5">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className={cn('text-[10px] font-semibold', isActive ? 'text-primary' : 'text-muted-foreground/70')}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Working Hours</label>
              <input
                className="mt-1 w-full rounded-md border border-border bg-secondary text-card-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={profileDraft.workingHours}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, workingHours: e.target.value }))}
                placeholder="e.g., 9am - 6pm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Working Days</label>
              <input
                className="mt-1 w-full rounded-md border border-border bg-secondary text-card-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={profileDraft.workingDays}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, workingDays: e.target.value }))}
                placeholder="e.g., Full Week"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Avg Daily Hours</label>
              <input
                className="mt-1 w-full rounded-md border border-border bg-secondary text-card-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={profileDraft.avgDailyHours}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, avgDailyHours: e.target.value }))}
                placeholder="e.g., 8"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Daily Income (Rs)</label>
              <input
                type="number"
                min="0"
                className="mt-1 w-full rounded-md border border-border bg-secondary text-card-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={profileDraft.dailyIncome}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, dailyIncome: e.target.value }))}
                placeholder="e.g., 1200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Theme</label>
              <select
                className="mt-1 w-full rounded-md border border-border bg-secondary text-card-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={profileDraft.themePreference}
                onChange={(e) => setProfileDraft((prev) => ({
                  ...prev,
                  themePreference: e.target.value as 'light' | 'dark' | 'system',
                }))}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Profile Image (Mock)</label>
              <input
                type="file"
                accept="image/*"
                capture="user"
                className="mt-1 block w-full rounded-md border border-border bg-secondary text-card-foreground px-3 py-2 text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setProfileDraft((prev) => ({
                      ...prev,
                      profileImage: typeof reader.result === 'string' ? reader.result : prev.profileImage,
                    }));
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </div>
            {profileError && <div className="text-xs text-red-500">{profileError}</div>}
          </div>
          <DialogFooter className="mt-2">
            <button
              type="button"
              onClick={() => setProfileOpen(false)}
              className="px-4 py-2 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground"
              disabled={profileSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProfileSave}
              className="px-4 py-2 text-sm rounded-md bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-60"
              disabled={profileSaving}
            >
              {profileSaving ? 'Saving...' : 'Save changes'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
