'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Profile = {
  id: string;
  role: string;
  display_name: string | null;
  total_usage_count: number;
  created_at?: string;
};

type GenerationLog = {
  id: string;
  content_details: string;
  created_at: string;
};

export default function MyPageDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  function fetchData() {
    setLoading(true);
    Promise.all([
      fetch('/api/profile', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/generation-logs', { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([profileRes, logsRes]) => {
        setProfile(profileRes.profile ?? null);
        setLogs(logsRes.logs ?? []);
        if (profileRes.error || logsRes.error) setError(profileRes.error || logsRes.error);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'エラー');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleGenerateTest() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/generation-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_details: '（テスト用：新しい編集メニューを生成）' }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '失敗しました');
      setProfile((p) => (p ? { ...p, total_usage_count: data.total_usage_count ?? p.total_usage_count } : null));
      setLogs((prev) => [
        { id: data.log?.id ?? '', content_details: data.log?.content_details ?? '（テスト）', created_at: data.log?.created_at ?? new Date().toISOString() },
        ...prev,
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <p className="text-slate-600">読み込み中...</p>;
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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
        <p className="text-slate-600 mt-1">プロフィールと生成ログを確認できます。</p>
      </header>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">{error}</div>
      )}

      {/* プロフィールカード */}
      <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">プロフィール</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500">表示名</p>
            <p className="text-lg font-medium text-slate-900">
              {profile?.display_name || '（未設定）'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">累計生成回数</p>
            <p className="text-lg font-medium text-slate-900">
              {profile?.total_usage_count ?? 0}
            </p>
          </div>
        </div>
        <Link
          href="/mypage/settings"
          className="mt-4 inline-block text-sm text-slate-500 hover:text-slate-700 underline"
        >
          設定で名前を変更する →
        </Link>
      </div>

      {/* テスト用ボタン */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-sm text-slate-600 mb-3">
          テスト用：ダミーの編集メニューログを追加し、累計生成回数を +1 します。
        </p>
        <button
          type="button"
          onClick={handleGenerateTest}
          disabled={generating}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? '追加中...' : '新しい編集メニューを生成する'}
        </button>
      </div>

      {/* 生成ログ一覧 */}
      <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">生成ログ（編集メニュー履歴）</h2>
        {logs.length === 0 ? (
          <p className="text-slate-500 text-sm py-6 text-center">
            まだ生成ログがありません。上のボタンでテスト追加できます。
          </p>
        ) : (
          <ul className="space-y-2 max-h-[320px] overflow-y-auto">
            {logs.map((log) => (
              <li
                key={log.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-sm"
              >
                <span className="text-xs text-slate-500 block">{formatDate(log.created_at)}</span>
                <p className="text-slate-800 mt-0.5 line-clamp-2">{log.content_details}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
