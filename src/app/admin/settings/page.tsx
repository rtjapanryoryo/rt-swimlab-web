'use client';

import { useState } from 'react';

/**
 * サイドバー「設定・同期」— auth.users → profiles の手動同期（既存 API を呼ぶだけ）
 */
export default function AdminSettingsPage() {
  const [message, setMessage] = useState<string | null>(null);
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
      setMessage(`同期が完了しました。追加: ${data.inserted_count ?? 0} 件`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">設定・同期</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Supabase の auth ユーザーと public.profiles の整合を取ります。
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">プロフィール同期</p>
          <p className="text-sm text-slate-600 mt-1">
            <code className="text-xs bg-slate-100 px-1 rounded">sync_profiles_from_auth</code>{' '}
            を実行し、auth にのみ存在するユーザーを profiles に追加します。
          </p>
        </div>
        <button
          type="button"
          onClick={syncProfiles}
          disabled={loading}
          className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '実行中…' : 'プロフィールを同期'}
        </button>
        {message && (
          <p className={`text-sm ${message.includes('失敗') || message.includes('エラー') ? 'text-red-600' : 'text-emerald-700'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
