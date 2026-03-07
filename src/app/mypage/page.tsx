'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MenuLogSection } from '@/components/MenuLogSection';

type Profile = {
  id: string;
  role: string;
  display_name: string | null;
  total_usage_count: number;
  created_at?: string;
};

export default function MyPageDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function fetchData() {
    setLoading(true);
    fetch('/api/profile', { credentials: 'include' })
      .then((r) => r.json())
      .then((profileRes) => {
        setProfile(profileRes.profile ?? null);
        if (profileRes.error) setError(profileRes.error);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'エラー');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
  }, []);

  // 設定で表示名・プロフィール更新時に再取得
  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, []);

  // タブに戻ったときに累計生成回数などを再取得（他タブで生成した場合など）
  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') fetchData(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const displayNameWithSama = profile?.display_name
    ? `${profile.display_name}様`
    : '（未設定）';

  return (
    <div className="space-y-8">
      {/* ウェルカム（AZACLI風：〇〇様） */}
      <header>
        <h1 className="text-xl sm:text-2xl font-semibold text-blue-700 tracking-tight">
          {displayNameWithSama}
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          サマリーと最新のお知らせをご確認ください。
        </p>
      </header>

      {error && (
        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-800 text-sm">
          {error}
        </div>
      )}

      {/* プロフィール（固定で上） */}
      <section className="dashboard-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100/80 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-blue-500/70" />
          <h2 className="text-sm font-semibold text-slate-800">プロフィール</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 animate-pulse">
              <div><div className="h-6 w-32 bg-slate-200 rounded" /></div>
              <div><div className="h-8 w-20 bg-slate-200 rounded" /></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                    表示名
                  </p>
                  <p className="text-lg font-medium text-slate-900">
                    {displayNameWithSama}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                    累計生成回数
                  </p>
                  <p className="text-2xl font-semibold text-blue-600 tabular-nums">
                    {profile?.total_usage_count ?? 0}
                    <span className="text-sm font-normal text-slate-500 ml-1">回</span>
                  </p>
                </div>
              </div>
              <Link
                href="/mypage/settings"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                設定で名前を変更する
                <span className="text-blue-500">→</span>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* RT swim lab への導線 */}
      <section className="dashboard-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100/80 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-blue-500/70" />
          <h2 className="text-sm font-semibold text-slate-800">練習メニュー</h2>
        </div>
        <div className="p-6">
          <p className="text-slate-600 text-sm mb-4">
            クイック作成やカスタム作成で、あなた専用の練習メニューを生成できます。
          </p>
          <Link
            href="/mypage/menu"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            RT swim lab を開く
            <span className="text-blue-200">→</span>
          </Link>
        </div>
      </section>

      {/* メニューログ（ダッシュボード内） */}
      <MenuLogSection />
    </div>
  );
}
