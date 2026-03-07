'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

type Profile = {
  id: string;
  role: string;
  display_name: string | null;
  total_usage_count: number;
  created_at: string;
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  function fetchProfiles() {
    fetch('/api/admin/profiles', { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 403) {
            router.replace('/mypage');
            return;
          }
          throw new Error(data.error ?? '取得に失敗しました');
        }
        setProfiles(data.profiles ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'エラー'));
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/admin/sync-profiles', { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncMessage(data.error ?? '同期に失敗しました');
        return;
      }
      setSyncMessage(`${data.inserted_count ?? 0} 件を追加しました`);
      fetchProfiles();
    } catch {
      setSyncMessage('同期に失敗しました');
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    if (loading || !user) return;
    fetchProfiles();
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">読み込み中...</p>
      </div>
    );
  }

  const formatDate = (s: string) =>
    new Date(s).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">管理者画面</h1>
            <p className="text-slate-600 mt-1">ユーザー利用状況のマスター管理</p>
          </div>
          <Link
            href="/mypage"
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            ← マイページへ
          </Link>
        </header>

        <div className="mb-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-600 mb-3">
            auth.users に登録済みで profiles にいないユーザーを追加します。
          </p>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? '同期中...' : 'ユーザーを同期'}
          </button>
        </div>

        {syncMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            {syncMessage}
          </div>
        )}

        {error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
            {error}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      ユーザーID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      名前
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      累計生成回数
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      役割
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      登録日時
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profiles.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono truncate max-w-[180px]">
                        {p.id}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {p.display_name || '（未設定）'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {p.total_usage_count}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${
                            p.role === 'admin'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {p.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatDate(p.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {profiles.length === 0 && !error && (
              <div className="p-8 text-center text-slate-500">
                ユーザーがまだいません。
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
