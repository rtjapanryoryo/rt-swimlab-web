'use client';

import { useState } from 'react';

export default function AdminSettingsPage() {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const syncProfiles = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/sync-profiles', {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await res.json()) as { error?: string; inserted_count?: number };
      if (!res.ok) throw new Error(data.error ?? '同期に失敗しました');
      setMessage({ type: 'success', text: `同期が完了しました。追加: ${data.inserted_count ?? 0} 件` });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'エラーが発生しました' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">

      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">設定・同期</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Supabase の auth ユーザーと public.profiles の整合を取ります。
        </p>
      </div>

      {/* プロフィール同期カード */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">プロフィール同期</p>
          <p className="text-sm text-slate-500 mt-1">
            <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">sync_profiles_from_auth</code>{' '}
            を実行し、auth にのみ存在するユーザーを profiles に追加します。
          </p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <button
            type="button"
            onClick={syncProfiles}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 disabled:opacity-60 transition-colors"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                実行中…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
                プロフィールを同期
              </>
            )}
          </button>

          {message && (
            <div className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <span className="shrink-0 mt-0.5">
                {message.type === 'success' ? '✓' : '⚠'}
              </span>
              {message.text}
            </div>
          )}
        </div>
      </div>

      {/* 注意事項 */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-2">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">同期について</p>
        <ul className="text-sm text-slate-500 space-y-1.5 list-disc list-inside">
          <li>auth.users に存在するが profiles に未登録のユーザーを追加します</li>
          <li>既存のプロフィールデータは上書きされません</li>
          <li>ユーザー登録直後に手動で実行する場合に使います</li>
        </ul>
      </div>

    </div>
  );
}
