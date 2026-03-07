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

  const formatDate = (s: string) =>
    new Date(s).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 rounded-lg" />
        <div className="h-32 bg-slate-100 rounded-2xl" />
        <div className="h-24 bg-slate-100 rounded-2xl" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          ダッシュボード
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          プロフィールと生成ログを確認できます
        </p>
      </header>

      {error && (
        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-800 text-sm">
          {error}
        </div>
      )}

      {/* プロフィールカード */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">プロフィール</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                表示名
              </p>
              <p className="text-lg font-medium text-slate-900">
                {profile?.display_name || '（未設定）'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                累計生成回数
              </p>
              <p className="text-2xl font-semibold text-teal-600 tabular-nums">
                {profile?.total_usage_count ?? 0}
                <span className="text-sm font-normal text-slate-500 ml-1">回</span>
              </p>
            </div>
          </div>
          <Link
            href="/mypage/settings"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            設定で名前を変更する
            <span className="text-teal-500">→</span>
          </Link>
        </div>
      </section>

      {/* アクションカード */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">メニュー生成</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            テスト用：ダミーの編集メニューログを追加します
          </p>
        </div>
        <div className="p-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
          >
            新しくメニューを生成する
          </Link>
          <button
            type="button"
            onClick={handleGenerateTest}
            disabled={generating}
            className="ml-3 inline-flex items-center px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? '追加中...' : 'テストログを追加'}
          </button>
        </div>
      </section>

      {/* 生成ログ */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">生成ログ</h2>
            <p className="text-xs text-slate-500 mt-0.5">編集メニュー履歴</p>
          </div>
          {logs.length > 0 && (
            <span className="text-xs text-slate-400 tabular-nums">{logs.length} 件</span>
          )}
        </div>
        <div className="p-4 sm:p-6">
          {logs.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl">
                ▸
              </div>
              <p className="text-slate-500 text-sm">まだ生成ログがありません</p>
              <p className="text-slate-400 text-xs mt-1">上のボタンでテスト追加できます</p>
            </div>
          ) : (
            <ul className="space-y-3 max-h-[360px] overflow-y-auto pr-1 -mr-1">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <p className="text-xs text-slate-400 tabular-nums mb-1.5">
                    {formatDate(log.created_at)}
                  </p>
                  <p className="text-sm text-slate-800 line-clamp-2 leading-relaxed">
                    {log.content_details}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
