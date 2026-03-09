'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/contexts/ProfileContext';

export function ProfileSection() {
  const { profile, setProfile } = useProfile();
  const [goalInput, setGoalInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setGoalInput(profile?.goal ?? '');
  }, [profile?.goal]);

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
      const newGoal = goalInput.trim() || null;
      setProfile((prev) => (prev ? { ...prev, goal: newGoal } : null));
      window.dispatchEvent(new Event('profile-updated'));
    } catch {
      setMessage('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  const showGoal = profile?.show_goal !== false;

  return (
    <section className="dashboard-card overflow-hidden">
      <div className="px-6 py-5 border-b border-cyan-100/80 flex items-center gap-2">
        <span className="w-2 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-teal-500" />
        <h2 className="text-sm font-bold text-slate-800 tracking-wide">
          {profile?.display_name?.trim() ? `${profile.display_name.trim()}様の目標` : 'あなたの目標'}
        </h2>
      </div>
      <div className="p-6 space-y-6">
        {showGoal && (
          <div>
            <form onSubmit={handleSaveGoal} className="flex flex-col sm:flex-row gap-3 items-start">
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="例：100m自由形で1分を切る"
                className="flex-1 w-full px-4 py-2.5 border-2 border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold rounded-2xl hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 text-sm shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </form>
            {message && (
              <p className={`mt-2 text-sm ${message.includes('失敗') ? 'text-amber-600' : 'text-cyan-600 font-medium'}`}>
                {message}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
