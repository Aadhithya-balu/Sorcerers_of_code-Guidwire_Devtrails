import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { registerDeviceToken, syncUserToBackend, updateUserProfileFields } from '@/services/auth-api';

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
  platform: string;
  jobType: string;
  workingHours: string;
  workingDays: string;
  avgDailyHours: string;
  city: string;
  deliveryZone: string;
  zoneType: string;
  preferredAreas: string;
  dailyIncome?: number;
  activePlan?: 'basic' | 'standard' | 'premium';
  backendUserId?: string;
  kycVerified?: boolean;
  accountStatus?: string;
  themePreference?: 'light' | 'dark' | 'system';
  profileImage?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  login: (email: string, password: string) => boolean;
  register: (profile: UserProfile, password: string) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  logout: () => void;
  isNewUser: (email: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'rakshitartha_users';
const SESSION_KEY = 'rakshitartha_session';
const LEGACY_STORAGE_KEY = 'gigcover_users';
const LEGACY_SESSION_KEY = 'gigcover_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // One-time migration for users stored under the old app key names.
    const legacyUsers = localStorage.getItem(LEGACY_STORAGE_KEY);
    const legacySession = localStorage.getItem(LEGACY_SESSION_KEY);
    if (!localStorage.getItem(STORAGE_KEY) && legacyUsers) {
      localStorage.setItem(STORAGE_KEY, legacyUsers);
    }
    if (!localStorage.getItem(SESSION_KEY) && legacySession) {
      localStorage.setItem(SESSION_KEY, legacySession);
    }

    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const parsed = JSON.parse(session);
        setUser(parsed);
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (!user || user.backendUserId) {
      return;
    }

    let cancelled = false;

    const syncCurrentSession = async () => {
      try {
        const syncResult = await syncUserToBackend({
          name: user.name,
          email: user.email,
          phone: user.phone,
          location: [user.city, user.deliveryZone].filter(Boolean).join(', '),
          platform: user.platform,
        });

        if (cancelled) {
          return;
        }

        setUser((current) => {
          if (!current) {
            return current;
          }

          const updated = {
            ...current,
            backendUserId: syncResult.backendUserId,
            kycVerified: syncResult.kycVerified,
            accountStatus: syncResult.accountStatus,
          };
          const users = getUsers();
          if (users[current.email.toLowerCase()]) {
            users[current.email.toLowerCase()].profile = updated;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
          }
          localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
          return updated;
        });
      } catch {
        // Keep the app usable even if background sync is unavailable.
      }
    };

    void syncCurrentSession();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user?.backendUserId || typeof window === 'undefined') {
      return;
    }
    const backendUserId = user.backendUserId;

    if (user.themePreference) {
      localStorage.setItem('theme', user.themePreference);
      document.documentElement.setAttribute('data-user-theme', user.themePreference);
      if (user.themePreference === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (user.themePreference === 'light') {
        document.documentElement.classList.remove('dark');
      }
    }

    const syncPushToken = async () => {
      if (!('Notification' in window)) {
        return;
      }

      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        return;
      }

      const tokenStorageKey = `rakshitartha_push_token_${backendUserId}`;
      let token = localStorage.getItem(tokenStorageKey);
      if (!token) {
        token = `web_${backendUserId}_${Date.now().toString(36)}`;
        localStorage.setItem(tokenStorageKey, token);
      }

      try {
        await registerDeviceToken(backendUserId, token || '', 'web');
      } catch {
        // Keep app usable even if token registration fails.
      }
    };

    void syncPushToken();
  }, [user?.backendUserId, user?.themePreference]);

  const getUsers = (): Record<string, { profile: UserProfile; password: string }> => {
    try {
      return JSON.parse(
        localStorage.getItem(STORAGE_KEY) ||
          localStorage.getItem(LEGACY_STORAGE_KEY) ||
          '{}',
      );
    } catch {
      return {};
    }
  };

  const isNewUser = (email: string): boolean => {
    const users = getUsers();
    return !users[email.toLowerCase()];
  };

  const login = (email: string, password: string): boolean => {
    const users = getUsers();
    const record = users[email.toLowerCase()];
    if (!record || record.password !== password) return false;
    setUser(record.profile);
    setIsAuthenticated(true);
    localStorage.setItem(SESSION_KEY, JSON.stringify(record.profile));
    return true;
  };

  const register = (profile: UserProfile, password: string): void => {
    const users = getUsers();
    users[profile.email.toLowerCase()] = { profile, password };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    setUser(profile);
    setIsAuthenticated(true);
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
  };

  const updateUser = (updates: Partial<UserProfile>): void => {
    if (!user) return;
    const updated = { ...user, ...updates };
    const users = getUsers();
    if (users[user.email.toLowerCase()]) {
      users[user.email.toLowerCase()].profile = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    }
    setUser(updated);
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));

    if (user.backendUserId) {
      void updateUserProfileFields(user.backendUserId, {
        dailyIncome: updated.dailyIncome,
        workingDays: updated.workingDays,
        workingHours: updated.workingHours,
        avgDailyHours: updated.avgDailyHours,
        themePreference: updated.themePreference,
        profileImage: updated.profileImage,
      }).catch(() => {
        // Silent sync failure for local-first UX.
      });
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, updateUser, logout, isNewUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
