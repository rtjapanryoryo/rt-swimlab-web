'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type Profile = {
  display_name: string | null;
  goal?: string | null;
  show_goal?: boolean;
};

export function ProfileSection() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchProfile = useCallback(() => {
    fetch('/api/profile', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        const p = res.profile ?? null;
        setProfile(p);
        setGoalInput(p?.goal ?? '');
      })
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const handler = () => fetchProfile();
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, [fetchProfile]);

  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goalInput.trim() || null }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('保存に失敗しました');
      setMessage('目標を保存しました');
      setProfile((prev) => (prev ? { ...prev, goal: goalInput.trim() || null } : null));
      window.dispatchEvent(new Event('profile-updated'));
    } catch {
      setMessage('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  const displayNameWithSama = profile?.display_name
    ? `${profile.display_name}様`
    : '（未設定）';
  const showGoal = profile?.show_goal !== false;

  return (
    <section className="dashboard-card overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100/80 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-blue-500/70" />
        <h2 className="text-sm font-semibold text-slate-800">プロフィール</h2>
      </div>
      <div className="p-6 space-y-6">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">表示名</p>
          <p className="text-lg font-medium text-slate-900">{displayNameWithSama}</p>
          <p className="text-xs text-slate-500 mt-1">
            <Link href="/mypage/settings" className="text-blue-600 hover:underline">
              アカウント情報で変更
            </Link>
          </p>
        </div>

        {showGoal && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">あなたの目標</p>
            <form onSubmit={handleSaveGoal} className="flex flex-col sm:flex-row gap-3 items-start">
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="例：100m自由形で1分を切る"
                className="flex-1 w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </form>
            {message && (
              <p className={`mt-2 text-sm ${message.includes('失敗') ? 'text-amber-600' : 'text-blue-600'}`}>
                {message}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1.5">
              <Link href="/mypage/settings" className="text-blue-600 hover:underline">
                設定で目標の表示を切り替え
              </Link>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
