'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PERIOD_META } from '@/types/training';
import type { PeriodKey } from '@/types/training';
import { allocatePeriods } from '@/lib/training/period-allocator';

const STROKES = ['Fr', 'Ba', 'Br', 'Fly', 'IM'];
const EVENTS  = ['Fr', 'Ba', 'Br', 'Fly', 'IM'];
const LEVELS  = [
  'フィットネス（健康・運動目的 / マスターズ健康）',
  '一般スイマー（定期練習 / マスターズ継続）',
  'クラブ選手（育成〜県大会 / マスターズ大会参加）',
  '競技選手（地区〜全国 / マスターズ記録挑戦）',
  'トップ選手（日本代表クラス）',
];
const DISTANCE_TYPES = [
  { value: 'S', label: 'S — 短距離', hint: '50m / 100m 種目' },
  { value: 'M', label: 'M — 中距離', hint: '200m / 400m 種目' },
  { value: 'D', label: 'D — 長距離', hint: '800m以上・オープンウォーター' },
];

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function NewPlanPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const today = toISODate(new Date());

  const [form, setForm] = useState({
    name:               '',
    goal_event:         'Fr',
    goal_distance_type: 'M' as 'S' | 'M' | 'D',
    goal_time_mm:       '',
    goal_time_ss:       '',
    goal_meet_date:     '',
    goal_meet_name:     '',
    start_date:         today,
    level:              'クラブ選手（育成〜県大会 / マスターズ大会参加）',
    stroke_primary:     'Fr',
    coach_memo:         '',
  });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const preview = form.start_date && form.goal_meet_date && form.start_date < form.goal_meet_date
    ? allocatePeriods(form.start_date, form.goal_meet_date)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim())    return setError('計画名を入力してください');
    if (!form.goal_meet_date) return setError('試合日を入力してください');

    const mm = parseInt(form.goal_time_mm);
    const ss = parseInt(form.goal_time_ss);
    const goal_time_sec = !isNaN(mm) && !isNaN(ss) ? mm * 60 + ss : null;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/training/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name:               form.name.trim(),
          goal_event:         form.goal_event,
          goal_distance_type: form.goal_distance_type,
          goal_time_sec,
          goal_meet_date:     form.goal_meet_date,
          goal_meet_name:     form.goal_meet_name || null,
          start_date:         form.start_date,
          level:              form.level,
          stroke_primary:     form.stroke_primary,
          coach_memo:         form.coach_memo || null,
          auto_allocate:      true,
        }),
      });
      const data = await res.json() as { plan?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? '作成に失敗しました');
      router.push(`/mypage/plan/${data.plan!.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">新しいトレーニング計画</h1>
        <p className="text-sm text-slate-500 mt-0.5">試合日を基準にAIがトレーニング期を自動で配分します</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* 基本情報 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">基本情報</p>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">計画名 <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              required
              placeholder="例：2026 インターハイ向けシーズン計画"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">開始日</label>
              <input
                type="date"
                value={form.start_date}
                onChange={set('start_date')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">レベル</label>
              <select
                value={form.level}
                onChange={set('level')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">専門ストローク</label>
              <select
                value={form.stroke_primary}
                onChange={set('stroke_primary')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {STROKES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              {/* spacer */}
            </div>
          </div>
        </div>

        {/* 目標試合 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">目標試合</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">試合日 <span className="text-red-400">*</span></label>
              <input
                type="date"
                value={form.goal_meet_date}
                onChange={set('goal_meet_date')}
                required
                min={form.start_date}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">試合名</label>
              <input
                type="text"
                value={form.goal_meet_name}
                onChange={set('goal_meet_name')}
                placeholder="例：インターハイ地区予選"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          </div>

          {/* 距離タイプ：ボタン選択 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">距離タイプ</label>
            <div className="grid grid-cols-3 gap-2">
              {DISTANCE_TYPES.map(dt => (
                <button
                  key={dt.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, goal_distance_type: dt.value as 'S' | 'M' | 'D' }))}
                  className={`py-2.5 px-3 rounded-xl border text-left transition-all ${
                    form.goal_distance_type === dt.value
                      ? 'border-cyan-400 bg-cyan-50 ring-1 ring-cyan-400'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-800">{dt.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{dt.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">目標種目</label>
              <select
                value={form.goal_event}
                onChange={set('goal_event')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {EVENTS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">目標タイム（任意）</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={form.goal_time_mm}
                  onChange={set('goal_time_mm')}
                  placeholder="分"
                  min={0} max={59}
                  className="w-full px-2 py-2.5 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <span className="text-slate-400 font-bold shrink-0">:</span>
                <input
                  type="number"
                  value={form.goal_time_ss}
                  onChange={set('goal_time_ss')}
                  placeholder="秒"
                  min={0} max={59}
                  className="w-full px-2 py-2.5 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* コーチメモ */}
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 space-y-3">
          <div>
            <p className="text-sm font-bold text-amber-800">コーチメモ / 練習の方針（任意）</p>
            <p className="text-xs text-amber-600 mt-0.5">ここに入力した内容はAIのすべての提案・メニュー生成に最優先で反映されます</p>
          </div>
          <textarea
            value={form.coach_memo}
            onChange={set('coach_memo')}
            rows={3}
            placeholder="例：AN系は週1回まで。試合1週前は必ずリカバリー優先。Brのキックドリルを毎セッション入れること。"
            className="w-full px-3 py-2.5 border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none"
          />
        </div>

        {/* 期自動配分プレビュー */}
        {preview.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              トレーニング期の自動配分プレビュー
            </p>
            <p className="text-xs text-slate-500">試合日から逆算して以下の期に自動配分されます。作成後に調整できます。</p>
            <div className="space-y-1.5">
              {preview.map(a => {
                const meta = PERIOD_META[a.period as PeriodKey];
                return (
                  <div key={a.period} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${meta.color}`}>
                    <span className={`text-xs font-bold px-2 py-0.5 bg-white/60 rounded-lg ${meta.textColor} shrink-0`}>
                      期{a.period} {meta.label}
                    </span>
                    <span className="text-xs text-slate-600 min-w-0 truncate">
                      {fmtDate(a.start_date)} 〜 {fmtDate(a.end_date)}（{a.weeks}週間）
                    </span>
                    <span className="ml-auto text-xs text-slate-400 shrink-0">
                      週{(a.target_weekly_volume_m / 1000).toFixed(0)}km
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-xl hover:from-cyan-400 hover:to-teal-400 disabled:opacity-60 transition-all shadow-lg shadow-cyan-500/25 text-sm"
          >
            {saving ? '作成中…' : '計画を作成する'}
          </button>
        </div>
      </form>
    </div>
  );
}
