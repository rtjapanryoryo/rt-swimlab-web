'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MenuLogSection } from '@/components/MenuLogSection';

const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL || '';

const menuItems: Array<{
  href: string;
  label: string;
  description: string;
  external?: boolean;
  disabled?: boolean;
}> = [
  { href: '/mypage', label: 'ダッシュボード', description: 'サマリーとプロフィールを確認' },
  { href: '/mypage/menu', label: 'RT swim lab', description: '練習メニューをクイック作成・カスタム作成で生成' },
  { href: '/mypage/genetic', label: 'RT GENE PROFILE', description: '遺伝子検査結果を確認' },
  { href: '/mypage/subscription', label: '有料プラン', description: 'プレミアム機能の利用状況とプラン変更' },
  { href: COMMUNITY_URL || '#', label: 'RTコミュニティ', description: 'RT公式コミュニティに参加', external: true, disabled: !COMMUNITY_URL },
  { href: '/mypage/settings', label: '設定', description: '表示名・パスワード・アカウント連携を変更' },
];

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

      {/* メニュー一覧（モバイルでカルーセルに気づかない人向け。PC2列・モバイル1列） */}
      <section className="dashboard-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100/80 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-blue-500/70" />
          <h2 className="text-sm font-semibold text-slate-800">メニュー</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {menuItems.map((item) => {
              const cardClass = 'block p-4 rounded-xl border border-slate-200/80 bg-white hover:border-blue-200 hover:bg-blue-50/50 transition-colors';
              const disabledClass = 'block p-4 rounded-xl border border-slate-200/60 bg-slate-50/50 opacity-75 cursor-default';
              if ('disabled' in item && item.disabled) {
                return (
                  <div key={item.label} className={disabledClass}>
                    <p className="font-medium text-slate-600">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-1">{item.description}（設定でURLを有効にすると利用可能）</p>
                  </div>
                );
              }
              if ('external' in item && item.external) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cardClass}
                  >
                    <p className="font-medium text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                  </a>
                );
              }
              return (
                <Link key={item.label} href={item.href} className={cardClass}>
                  <p className="font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* メニューログ（ダッシュボード内） */}
      <MenuLogSection />
    </div>
  );
}
