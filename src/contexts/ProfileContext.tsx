'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ProfileData = {
  display_name: string | null;
  total_usage_count: number;
  quick_count?: number;
  custom_count?: number;
  goal?: string | null;
  show_goal?: boolean;
};

type ProfileContextValue = {
  profile: ProfileData | null;
  refetch: () => void;
  setProfile: React.Dispatch<React.SetStateAction<ProfileData | null>>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const refetch = useCallback(() => {
    fetch('/api/profile', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => setProfile(res.profile ?? null))
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const onProfileUpdated = () => refetch();
    window.addEventListener('profile-updated', onProfileUpdated);
    return () => window.removeEventListener('profile-updated', onProfileUpdated);
  }, [refetch]);

  useEffect(() => {
    const onMenuSaved = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { total_usage_count?: number; quick_count?: number; custom_count?: number }
        | undefined;
      if (detail?.total_usage_count != null) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                total_usage_count: detail.total_usage_count ?? prev.total_usage_count,
                quick_count: detail.quick_count ?? prev.quick_count,
                custom_count: detail.custom_count ?? prev.custom_count,
              }
            : null
        );
        return;
      }
      refetch();
    };
    window.addEventListener('menu-saved', onMenuSaved);
    return () => window.removeEventListener('menu-saved', onMenuSaved);
  }, [refetch]);

  return (
    <ProfileContext.Provider value={{ profile, refetch, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
