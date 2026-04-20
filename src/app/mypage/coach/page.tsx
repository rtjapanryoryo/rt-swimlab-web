'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useProfile } from '@/contexts/ProfileContext';

interface Athlete {
  id: string;
  display_name: string | null;
  total_usage_count: number;
  active_plan?: {
    name: string;
    goal_meet_date: string;
    current_period: string | null;
  } | null;
  last_session?: {
    scheduled_date: string;
    status: string;
    fatigue_after: number | null;
  } | null;
}

const FATIGUE_COLOR = ['', 'text-emerald-500', 'text-teal-500', 'text-slate-500', 'text-orange-500', 'text-red-500'];
const FATIGUE_LABEL = ['', '快調', '良好', '普通', '疲労', '限界'];

export default function CoachPage() {
  const { profile } = useProfile();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading]   = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteMsg, setInviteMsg]   = useState('');

  useEffect(() => {
    // コーチの選手一覧を取得（将来の coach_athletes テーブルから）
    // 現状はダミーデータで画面を構築
    setLoading(false);
  }, []);

  const handleInvite = async () => {
    if (!inviteCode.trim()) return;
    setInviteMsg('招待機能は準備中です（Supabase 連携後に有効化されます）');
  };

  const isCoach = profile?.role === 'coach' || profile?.role === 'admin';

  if (!isCoach) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-4xl">🔒</p>
        <p className="text-base font-semibold text-slate-700">コーチ権限が必要です</p>
        <p className="text-sm text-slate-400">管理者にコーチロールの付与を依頼してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">コーチダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-0.5">担当選手のストーリーを管理します</p>
      </div>

      {/* 選手招待 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">選手を追加</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            placeholder="選手のメールアドレスまたはID"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <button
            onClick={handleInvite}
            className="px-4 py-2 bg-cyan-500 text-white text-sm font-bold rounded-xl hover:bg-cyan-400 transition-colors"
          >
            追加
          </button>
        </div>
        {inviteMsg && <p className="text-xs text-slate-500">{inviteMsg}</p>}
      </div>

      {/* 選手一覧 */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : athletes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center">
          <p className="text-3xl mb-3">🏊</p>
          <p className="text-base font-semibold text-slate-700">担当選手がいません</p>
          <p className="text-sm text-slate-400 mt-1">選手のメールアドレスを入力して追加してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {athletes.map(athlete => (
            <Link key={athlete.id} href={`/mypage/coach/${athlete.id}`}
              className="block bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-cyan-300 hover:shadow-md transition-all p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-cyan-700">
                    {(athlete.display_name ?? '?').charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {athlete.display_name ?? '（未設定）'}
                  </p>
                  {athlete.active_plan && (
                    <p className="text-xs text-slate-500 truncate">{athlete.active_plan.name}</p>
                  )}
                </div>
                {athlete.last_session?.fatigue_after && (
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${FATIGUE_COLOR[athlete.last_session.fatigue_after]}`}>
                      疲労{athlete.last_session.fatigue_after}
                    </p>
                    <p className="text-[10px] text-slate-400">{FATIGUE_LABEL[athlete.last_session.fatigue_after]}</p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
