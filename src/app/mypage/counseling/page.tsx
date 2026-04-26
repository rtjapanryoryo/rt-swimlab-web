'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type PlanId = 'free' | 'athlete' | 'coach';

const ADMIN_EMAIL = '06ra.ra06@gmail.com';

const PLANS = [
  {
    id: 'free' as PlanId,
    tag: '初回無料',
    name: '無料カウンセリング',
    price: '¥0',
    detail: '20分 / 1人1回限り',
    description: '練習の方向性や目標の立て方について、コーチと一緒に確認します。まずは気軽にご相談ください。',
    points: [
      'アプリの使い方・目標シートの立て方',
      '現在の課題の整理',
      '練習の方向性の確認',
    ],
    availability: null,
    note: '※1アカウント1回限りです。',
    color: 'border-slate-300',
    tagColor: 'text-slate-500',
  },
  {
    id: 'athlete' as PlanId,
    tag: '個人向け',
    name: '選手プラン',
    price: '¥1,500',
    detail: '/ 回（30分）',
    description: '目標シートを一緒に作成・レビューし、次の練習までに具体的なアクションを設定します。',
    points: [
      '目標シート作成・レビュー',
      'アプリ設定の最適化',
      '次回までのアクション設定',
    ],
    availability: {
      slots: ['土日　10:00 〜 18:00', '平日夜　19:00 〜 21:00'],
      note: '※ 希望日時は第1〜第3希望をご記入ください。調整後にご連絡いたします。',
    },
    note: '',
    color: 'border-cyan-400',
    tagColor: 'text-cyan-600',
  },
  {
    id: 'coach' as PlanId,
    tag: '指導者向け',
    name: 'コーチプラン',
    price: '¥2,980',
    detail: '/ 回（60分）4名以上 +¥1,000/人',
    description: 'チームや学校向けに、課題のヒアリングから解決策の提案まで行います。',
    points: [
      'チームへのヒアリング・課題整理',
      '解決策の提案',
      '次回までのアクション設定',
    ],
    availability: {
      slots: ['土日　10:00 〜 18:00', '平日夜　19:00 〜 21:00'],
      note: '※ 4名以上の場合は +¥1,000/人となります。',
    },
    note: '',
    color: 'border-amber-400',
    tagColor: 'text-amber-600',
  },
];

function CounselingPageInner() {
  const searchParams = useSearchParams();
  const initialPlan = (searchParams.get('plan') as PlanId | null) ?? null;

  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(initialPlan);
  const [datetime1, setDatetime1] = useState('');
  const [datetime2, setDatetime2] = useState('');
  const [datetime3, setDatetime3] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const plan = PLANS.find(p => p.id === selectedPlan);
  const canSubmit = !!selectedPlan && datetime1.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/counseling', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_type: selectedPlan,
          preferred_datetime_1: datetime1,
          preferred_datetime_2: datetime2,
          preferred_datetime_3: datetime3,
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'エラーが発生しました');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">✓</div>
        <h2 className="text-lg font-bold text-slate-900">申し込みを受け付けました</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          3〜5営業日以内にコーチよりご連絡いたします。
        </p>
        <p className="text-xs text-slate-400">
          連絡先：{ADMIN_EMAIL}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">カウンセリング</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          コーチが伴走し、練習の方向性を一緒に設計します。
        </p>
      </div>

      {/* プラン選択 */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">プランを選ぶ</p>
        {PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedPlan(p.id)}
            className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
              selectedPlan === p.id
                ? `${p.color} bg-white shadow-sm`
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 mb-1.5 ${p.tagColor}`}>
                  {p.tag}
                </span>
                <p className="text-sm font-bold text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{p.description}</p>
                {p.note && <p className="text-[10px] text-slate-400 mt-1">{p.note}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-slate-900">{p.price}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{p.detail}</p>
              </div>
            </div>

            {selectedPlan === p.id && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                <ul className="space-y-1">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="text-cyan-500 shrink-0">✓</span>{pt}
                    </li>
                  ))}
                </ul>

                {p.availability && (
                  <div className="mt-2 bg-slate-50 rounded-xl p-3 space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">対応可能時間帯</p>
                    {p.availability.slots.map((s) => (
                      <p key={s} className="text-xs text-slate-700 font-medium">{s}</p>
                    ))}
                    <p className="text-[10px] text-slate-400 mt-1">{p.availability.note}</p>
                  </div>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* フォーム */}
      {selectedPlan && (
        <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm font-bold text-slate-700">{plan?.name}を申し込む</p>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">
                希望日時（第1〜3希望） <span className="text-red-400">*</span>
              </p>
              <p className="text-[10px] text-slate-400 mb-2">例：5月10日（土）10:00〜12:00</p>
            </div>
            {[
              { label: '第1希望', value: datetime1, set: setDatetime1, required: true },
              { label: '第2希望', value: datetime2, set: setDatetime2, required: false },
              { label: '第3希望', value: datetime3, set: setDatetime3, required: false },
            ].map(({ label, value, set, required }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 w-14 shrink-0">{label}</span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  required={required}
                  placeholder={required ? '必須' : '任意'}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-slate-50/50"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              相談したいこと <span className="text-slate-300 font-normal">（任意）</span>
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="現在の課題・目標・気になっていることなど"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? '送信中...' : '申し込みを送信する'}
          </button>

          <p className="text-center text-[10px] text-slate-400">
            送信後、{ADMIN_EMAIL} よりご連絡いたします
          </p>
        </form>
      )}
    </div>
  );
}

export default function CounselingPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CounselingPageInner />
    </Suspense>
  );
}
