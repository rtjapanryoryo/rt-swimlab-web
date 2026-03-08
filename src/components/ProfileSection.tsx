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
      <div className="px-6 py-5 border-b border-slate-100/80 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-blue-500/70" />
        <h2 className="text-sm font-semibold text-slate-800">
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
          </div>
        )}
      </div>
    </section>
  );
}
