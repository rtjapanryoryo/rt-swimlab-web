'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type MenuLog = {
  id: string;
  source: string;
  created_at: string;
};

type Profile = {
  display_name: string | null;
  total_usage_count: number;
  quick_count?: number;
  custom_count?: number;
};

export function MenuLogSection() {
  const [menus, setMenus] = useState<MenuLog[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(() => {
    fetch('/api/profile', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => setProfile(res.profile ?? null))
      .catch(() => setProfile(null));
  }, []);

  const fetchMenus = useCallback(() => {
    const params = new URLSearchParams();
    params.set('summary', '1'); // 作成日時のみ取得（軽量）
    setLoading(true);
    fetch(`/api/menus?${params}`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? '取得に失敗しました');
        setMenus(data.menus ?? []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'エラーが発生しました');
        setMenus([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  // タブに戻ったとき・メニュー保存イベント・プロフィール更新で再取得
  useEffect(() => {
    const onRefresh = () => {
      fetchMenus();
      fetchProfile();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') onRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('menu-saved', onRefresh);
    window.addEventListener('profile-updated', onRefresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('menu-saved', onRefresh);
      window.removeEventListener('profile-updated', onRefresh);
    };
  }, [fetchMenus, fetchProfile]);

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <section className="dashboard-card overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100/80 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-blue-500/70" />
        <h2 className="text-sm font-semibold text-slate-800">メニューログ</h2>
      </div>
      <div className="p-6">
        {/* 生成回数（横1行） */}
        <div className="mb-6 pb-6 border-b border-slate-100/80 flex flex-wrap items-center gap-x-6 gap-y-1">
          <span className="text-sm text-slate-600">
            累計生成回数 <span className="font-semibold text-blue-600 tabular-nums">{profile?.total_usage_count ?? 0}</span> 回
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-sm text-slate-600">
            クイック <span className="font-medium tabular-nums">{profile?.quick_count ?? 0}</span> 回
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-sm text-slate-600">
            カスタム <span className="font-medium tabular-nums">{profile?.custom_count ?? 0}</span> 回
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500 text-sm animate-pulse">読み込み中...</div>
        ) : error ? (
          <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-800 text-sm">
            {error}
          </div>
        ) : menus.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl">
              ▸
            </div>
            <p className="text-slate-600 font-medium text-sm">保存されたメニューはありません</p>
            <p className="text-slate-400 text-xs mt-1">
              RT swim lab でメニューを作成すると、ログイン中は自動で作成日時が記録されます
            </p>
            <Link
              href="/mypage/menu"
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              メニューを作成する
            </Link>
          </div>
        ) : (
          <div className="max-h-[280px] overflow-y-auto space-y-1.5">
              {menus.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg border border-slate-100 bg-slate-50/30"
                >
                  <span className="text-sm font-medium text-slate-800 tabular-nums">
                    {formatDate(m.created_at)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {m.source === 'custom' ? 'カスタム' : 'クイック'}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
