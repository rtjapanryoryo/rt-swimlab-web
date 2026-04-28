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
    tagline: '目標シートへのフィードバックと考え方を学ぶ',
    time: '15分',
    price: '¥0',
    regularPrice: null,
    paid: false,
    description: '目標シートを作成した初心者の方を対象に、コーチがフィードバックを行います。目標の立て方・練習への向き合い方など、RTメソッドの考え方を一緒に確認します。',
    points: ['目標シートへのコーチフィードバック', 'RTメソッドの考え方・練習への向き合い方', '今後の練習の方向性の確認'],
    note: '1アカウント1回限りのご利用となります。',
    border: 'border-slate-200',
    activeBorder: 'border-slate-400',
    tagStyle: 'bg-slate-100 text-slate-600',
  },
  {
    id: 'athlete' as PlanId,
    tag: '個人向け',
    name: '選手プラン',
    tagline: '目標を具体的に設計する',
    time: '30分',
    price: '¥1,500 / 回',
    regularPrice: '¥1,950 / 回',
    paid: true,
    description: '目標シートをコーチと一緒に作成・レビューし、次の練習までのアクションを設定します。',
    points: ['目標シート作成・レビュー', 'アプリ設定の最適化', '次回までのアクション設定'],
    note: '',
    border: 'border-slate-200',
    activeBorder: 'border-cyan-400',
    tagStyle: 'bg-cyan-50 text-cyan-700',
  },
  {
    id: 'coach' as PlanId,
    tag: '指導者向け',
    name: 'コーチプラン',
    tagline: 'チームへのRTメソッド導入',
    time: '60分',
    price: '¥2,980 / 回〜',
    regularPrice: '¥3,880 / 回〜',
    paid: true,
    description: 'チームや学校向けに、課題のヒアリングから解決策の提案まで行います。',
    points: ['チームへのヒアリング・課題整理', '解決策の提案', '次回までのアクション設定'],
    note: '4名以上の場合は +¥1,000/人となります。',
    border: 'border-slate-200',
    activeBorder: 'border-amber-400',
    tagStyle: 'bg-amber-50 text-amber-700',
  },
];

function CounselingPageInner() {
  const searchParams = useSearchParams();
  const initialPlan = (searchParams.get('plan') as PlanId | null) ?? null;

  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(initialPlan);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const plan = PLANS.find(p => p.id === selectedPlan);
  const canSubmit = !!selectedPlan;

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
          preferred_datetime_1: null,
          preferred_datetime_2: null,
          preferred_datetime_3: null,
          message: message.trim() || null,
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
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-2xl">✓</div>
        <h2 className="text-lg font-bold text-slate-900">申し込みを受け付けました</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          コーチより改めてご連絡いたします。<br />
          しばらくお待ちください。
        </p>
        <p className="text-xs text-slate-400">{ADMIN_EMAIL}</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">

      <div>
        <h1 className="text-xl font-bold text-slate-900">カウンセリング</h1>
        <p className="text-sm text-slate-500 mt-0.5">コーチが伴走し、練習の方向性を一緒に設計します。</p>
      </div>

      {/* キャンペーンバナー */}
      <div className="rounded-2xl border-2 border-red-100 bg-gradient-to-r from-red-50 to-rose-50 px-5 py-3 flex items-center gap-3">
        <span className="shrink-0 text-base">🎉</span>
        <div>
          <p className="text-xs font-black text-red-700">期間限定キャンペーン実施中</p>
          <p className="text-[11px] text-red-600 mt-0.5">
            現在、通常価格より割引した特別料金でご提供しています。キャンペーン終了後は定価に戻ります。
          </p>
        </div>
      </div>

      {/* プラン選択 */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">プランを選ぶ</p>

        {PLANS.map((p) => {
          const isSelected = selectedPlan === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPlan(p.id)}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all bg-white ${
                isSelected ? `${p.activeBorder} shadow-sm` : `${p.border} hover:border-slate-300`
              }`}
            >
              <div className="flex items-start gap-3">
                {/* 選択インジケーター */}
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                  isSelected ? 'border-cyan-500 bg-cyan-500' : 'border-slate-300'
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.tagStyle}`}>
                      {p.tag}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{p.name}</span>
                    <span className="text-xs text-slate-400">{p.time}</span>
                    {p.paid && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-white">有料</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.tagline}</p>
                </div>

                {/* 金額：常時表示 */}
                <div className="shrink-0 text-right">
                  {isSelected && p.regularPrice && (
                    <p className="text-[10px] text-slate-400 line-through">{p.regularPrice}</p>
                  )}
                  <span className={`text-xs font-semibold ${p.regularPrice ? 'text-red-600' : 'text-slate-400'}`}>
                    {p.price}
                  </span>
                  {isSelected && p.regularPrice && (
                    <p className="text-[9px] text-red-500 font-bold">キャンペーン</p>
                  )}
                </div>
              </div>

              {/* 展開エリア */}
              {isSelected && (
                <div className="mt-3 ml-7 space-y-2">
                  <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>
                  <ul className="space-y-1">
                    {p.points.map(pt => (
                      <li key={pt} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className="text-cyan-500 shrink-0">✓</span>{pt}
                      </li>
                    ))}
                  </ul>
                  {p.note && <p className="text-[10px] text-slate-400">{p.note}</p>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 申し込みフォーム */}
      {selectedPlan && (
        <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div>
            <p className="text-sm font-bold text-slate-700">{plan?.name}を申し込む</p>
            <p className="text-xs text-slate-400 mt-0.5">送信後、コーチより日程のご連絡をいたします。</p>
          </div>

          {/* 相談内容 */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              相談したいこと
              <span className="text-slate-300 font-normal ml-1">（任意）</span>
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="現在の課題・目標・気になっていることなど"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              {error}
            </p>
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
