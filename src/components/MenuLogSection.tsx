'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useProfile } from '@/contexts/ProfileContext';

type MenuLog = {
  id: string;
  source: string;
  created_at: string;
  input?: {
    period?: string;
    stroke?: string;
    distance?: string;
    distanceType?: string;
    level?: string;
  };
};

const PERIOD_SHORT: Record<string, string> = {
  '1': '① リカバリー', '2': '② 基礎形成', '3': '③ 発展形成',
  '4': '④ 強化(SL)', '5': '⑤ 強化(AN)', '6': '⑥ 調整', '7': '⑦ テーパー',
};
const PERIOD_COLOR: Record<string, string> = {
  '1': 'bg-slate-100 text-slate-600',
  '2': 'bg-blue-50 text-blue-700',
  '3': 'bg-teal-50 text-teal-700',
  '4': 'bg-orange-50 text-orange-700',
  '5': 'bg-red-50 text-red-700',
  '6': 'bg-violet-50 text-violet-700',
  '7': 'bg-amber-50 text-amber-700',
};

export function MenuLogSection() {
  const { profile } = useProfile();
  const [menus, setMenus] = useState<MenuLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    void Promise.resolve().then(() => fetchMenus());
  }, [fetchMenus]);

  // タブに戻ったとき・メニュー保存イベントでメニュー一覧を再取得（プロフィールは ProfileContext で即時反映）
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchMenus();
    };
    const onMenuSaved = () => fetchMenus();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('menu-saved', onMenuSaved);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('menu-saved', onMenuSaved);
    };
  }, [fetchMenus]);

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
      <div className="px-6 py-5 border-b border-cyan-100/80 flex items-center gap-2">
        <span className="w-2 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-teal-500" />
        <h2 className="text-sm font-bold text-slate-800 tracking-wide">メニューログ</h2>
      </div>
      <div className="p-6">
        {/* 生成回数（横1行） */}
        <div className="mb-6 pb-6 border-b border-cyan-100/80 flex flex-wrap items-center gap-x-6 gap-y-1">
          <span className="text-sm text-slate-600">
            累計生成回数 <span className="font-bold text-cyan-600 tabular-nums">{profile?.total_usage_count ?? 0}</span> 回
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-100 to-teal-100 flex items-center justify-center text-3xl">
              🏊
            </div>
            <p className="text-slate-600 font-bold text-sm">保存されたメニューはありません</p>
            <p className="text-slate-500 text-xs mt-1">
              RT swim lab でメニューを作成すると、ログイン中は自動で作成日時が記録されます
            </p>
            <Link
              href="/mypage/menu"
              className="mt-5 inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold rounded-2xl hover:from-cyan-600 hover:to-teal-600 shadow-lg shadow-cyan-500/25 transition-all text-sm"
            >
              メニューを作成する
            </Link>
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto space-y-2">
            {menus.map((m) => {
              const period = m.input?.period ?? '';
              const stroke = m.input?.stroke ?? '';
              const distance = m.input?.distance;
              const distType = m.input?.distanceType ?? '';
              const periodLabel = PERIOD_SHORT[period] ?? '';
              const periodCls = PERIOD_COLOR[period] ?? 'bg-slate-100 text-slate-600';
              return (
                <div
                  key={m.id}
                  className="flex items-start gap-3 py-3 px-4 rounded-xl border border-slate-100 bg-white hover:border-cyan-200 hover:bg-cyan-50/30 transition-colors"
                >
                  {/* 期バッジ */}
                  {periodLabel ? (
                    <span className={`flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-lg text-xs font-semibold ${periodCls}`}>
                      {periodLabel}
                    </span>
                  ) : (
                    <span className="flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500">-</span>
                  )}
                  {/* 詳細 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {stroke && <span className="text-sm font-semibold text-slate-800">{stroke}</span>}
                      {distance && <span className="text-sm text-slate-600 tabular-nums">{parseInt(distance, 10).toLocaleString()}m</span>}
                      {distType && <span className="text-xs text-slate-400">[{distType}]</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded-md ${m.source === 'custom' ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600'}`}>
                        {m.source === 'custom' ? 'カスタム' : 'クイック'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 tabular-nums">{formatDate(m.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
