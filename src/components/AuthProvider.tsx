'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

const AuthContext = createContext<{ user: User | null; loading: boolean }>({
  user: null,
  loading: true,
});

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

const BYPASS_COOKIE = 'dev-bypass-user-id';
const BYPASS_COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

function setBypassCookie(userId: string) {
  document.cookie = `${BYPASS_COOKIE}=${encodeURIComponent(userId)}; path=/; max-age=${BYPASS_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearBypassCookie() {
  document.cookie = `${BYPASS_COOKIE}=; path=/; max-age=0`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const devBypass =
    typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' &&
    process.env.NEXT_PUBLIC_DEV_BYPASS_USER_ID;

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (devBypass) {
        const mockUser = {
          id: process.env.NEXT_PUBLIC_DEV_BYPASS_USER_ID!,
          email: 'dev-bypass@local',
          app_metadata: {},
          user_metadata: { full_name: '開発用バイパス' },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as User;
        setBypassCookie(mockUser.id);
        if (mounted) setUser(mockUser);
        if (mounted) setLoading(false);
        return;
      }
      clearBypassCookie();
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) setUser(session?.user ?? null);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();

    if (devBypass) return;

    try {
      const supabase = createClient();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          setUser(session?.user ?? null);
          if (!session) clearBypassCookie();
        }
      });
      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch {
      setLoading(false);
      return () => { mounted = false; };
    }
  }, [devBypass]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
