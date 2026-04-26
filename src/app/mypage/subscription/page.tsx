'use client';

import { useState } from 'react';
import Link from 'next/link';

type PlanId = 'free' | 'basic' | 'standard' | 'pro';

const APP_PLANS: {
  id: PlanId;
  name: string;
  price: string;
  priceNote: string;
  customGen: string;
  badge: string | null;
  highlight: boolean;
  features: { label: string; value: string; available: boolean }[];
}[] = [
  {
    id: 'free',
    name: 'フリー',
    price: '¥0',
    priceNote: '永久無料',
    customGen: '累計3回',
    badge: null,
    highlight: false,
    features: [
      { label: 'クイック生成',       value: '無制限',    available: true },
      { label: 'カスタム生成（AI）', value: '累計3回',   available: true },
      { label: 'メニュー履歴',       value: '直近10件',  available: true },
      { label: 'PDF保存',            value: '◯',         available: true },
      { label: 'GENE PROFILE',       value: '1件',       available: true },
      { label: '残回数の繰越',       value: '—',         available: false },
    ],
  },
  {
    id: 'basic',
    name: 'ベーシック',
    price: '検討中',
    priceNote: '/ 月（税込）',
    customGen: '検討中',
    badge: null,
    highlight: false,
    features: [
      { label: 'クイック生成',       value: '無制限',   available: true },
      { label: 'カスタム生成（AI）', value: '検討中',   available: true },
      { label: 'メニュー履歴',       value: '全件',     available: true },
      { label: 'PDF保存',            value: '◯',        available: true },
      { label: 'GENE PROFILE',       value: '無制限',   available: true },
      { label: '残回数の繰越',       value: '◯',        available: true },
    ],
  },
  {
    id: 'standard',
    name: 'スタンダード',
    price: '検討中',
    priceNote: '/ 月（税込）',
    customGen: '検討中',
    badge: 'おすすめ',
    highlight: true,
    features: [
      { label: 'クイック生成',       value: '無制限',   available: true },
      { label: 'カスタム生成（AI）', value: '検討中',   available: true },
      { label: 'メニュー履歴',       value: '全件',     available: true },
      { label: 'PDF保存',            value: '◯',        available: true },
      { label: 'GENE PROFILE',       value: '無制限',   available: true },
      { label: '残回数の繰越',       value: '◯',        available: true },
    ],
  },
  {
    id: 'pro',
    name: 'プロ',
    price: '検討中',
    priceNote: '/ 月（税込）',
    customGen: '検討中',
    badge: null,
    highlight: false,
    features: [
      { label: 'クイック生成',       value: '無制限',   available: true },
      { label: 'カスタム生成（AI）', value: '検討中',   available: true },
      { label: 'メニュー履歴',       value: '全件',     available: true },
      { label: 'PDF保存',            value: '◯',        available: true },
      { label: 'GENE PROFILE',       value: '無制限',   available: true },
      { label: '残回数の繰越',       value: '◯',        available: true },
      { label: '超過利用',           value: '検討中',   available: true },
    ],
  },
];

const COUNSELING_PLANS = [
  {
    id: 'counseling_free',
    tag: '初回無料',
    name: '無料カウンセリング',
    price: '¥0',
    detail: '20分 / 1人1回限り',
    desc: '練習の方向性や目標の立て方を、コーチと一緒に確認します。',
    href: '/mypage/counseling',
    ctaLabel: '申し込む',
  },
  {
    id: 'counseling_athlete',
    tag: '個人向け',
    name: '選手プラン',
    price: '¥1,500',
    detail: '/ 回（30分）',
    desc: '目標シート作成・レビューとアクション設定。',
    href: '/mypage/counseling?plan=athlete',
    ctaLabel: '申し込む',
  },
  {
    id: 'counseling_coach',
    tag: '指導者向け',
    name: 'コーチプラン',
    price: '¥2,980〜',
    detail: '/ 回（60分）',
    desc: 'チームへのヒアリングと解決策の提案。',
    href: '/mypage/counseling?plan=coach',
    ctaLabel: '申し込む',
  },
];

type ModalState = 'closed' | 'confirm' | 'done';

export default function SubscriptionPage() {
  const [selected, setSelected] = useState<PlanId>('free');
  const [modal, setModal]       = useState<ModalState>('closed');
  const [saving, setSaving]     = useState(false);

  const handleSelect = (id: PlanId) => {
    setSelected(id);
    if (id !== 'free') setModal('confirm');
  };

  const handleRegisterInterest = async () => {
    setSaving(true);
    try {
      await fetch('/api/plan-interest', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: selected }),
      });
      setModal('done');
    } catch {
      setModal('done');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto">

      {/* デモ期間バナー */}
      <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-6 py-4 flex items-start gap-3">
        <span className="text-xl shrink-0">🎁</span>
        <div>
          <p className="text-sm font-black text-amber-800">現在、3ヶ月間のデモ期間中です</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            すべての機能を無料でご利用いただけます。料金の請求は一切ございません。<br />
            下記は今後の有料プラン（予定）です。内容・金額は検討中です。
          </p>
        </div>
      </div>

      {/* アプリプラン */}
      <section className="space-y-4">
        <div>
          <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-1">App Plans</p>
          <h2 className="text-xl font-black text-slate-900">練習メニュー生成プラン</h2>
          <p className="text-sm text-slate-500 mt-1">
            クイック生成は全プラン無制限。カスタム生成（AI）の回数でプランが変わります。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {APP_PLANS.map((plan) => {
            const isSelected = selected === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => handleSelect(plan.id)}
                className={`relative text-left rounded-2xl border-2 p-4 flex flex-col transition-all ${
                  isSelected
                    ? plan.highlight
                      ? 'border-cyan-400 bg-cyan-50 shadow-lg shadow-cyan-500/10'
                      : 'border-slate-400 bg-white shadow-md'
                    : plan.highlight
                      ? 'border-cyan-200 bg-white hover:border-cyan-300'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-cyan-500 to-teal-500 text-white whitespace-nowrap shadow">
                    {plan.badge}
                  </span>
                )}

                {/* 選択インジケーター */}
                <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected ? 'border-cyan-500 bg-cyan-500' : 'border-slate-300'
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>

                <div className="mb-3 pr-5">
                  <p className="text-xs font-bold text-slate-500 mb-0.5">{plan.name}</p>
                  <p className={`text-xl font-black ${plan.price === '検討中' ? 'text-slate-400' : 'text-slate-900'}`}>
                    {plan.price}
                  </p>
                  <p className="text-[10px] text-slate-400">{plan.priceNote}</p>
                </div>

                <div className="mb-3 px-2 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-400">カスタム生成</p>
                  <p className={`text-sm font-bold ${plan.customGen === '検討中' ? 'text-slate-400' : 'text-slate-700'}`}>
                    {plan.customGen}
                  </p>
                </div>

                <ul className="space-y-1 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.label} className={`flex items-center justify-between text-xs gap-1 ${f.available ? '' : 'opacity-35'}`}>
                      <span className="text-slate-600 truncate">{f.label}</span>
                      <span className={`font-semibold shrink-0 ${f.value === '検討中' ? 'text-slate-400' : f.available ? 'text-slate-700' : 'text-slate-400'}`}>
                        {f.value}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className={`mt-3 w-full py-1.5 rounded-xl text-xs font-bold text-center transition-all ${
                  isSelected
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {isSelected ? '選択中' : 'このプランを選ぶ'}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          ※ 金額・回数は検討中です。デモ期間中は料金の請求は一切ありません。
        </p>
      </section>

      {/* カウンセリングプラン */}
      <section className="space-y-4">
        <div>
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Counseling Plans</p>
          <h2 className="text-xl font-black text-slate-900">カウンセリングプラン</h2>
          <p className="text-sm text-slate-500 mt-1">
            アプリサブスクとは別課金。コーチが直接伴走します。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {COUNSELING_PLANS.map((plan) => (
            <div key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{plan.tag}</span>
              <p className="text-base font-bold text-slate-900">{plan.name}</p>
              <div className="flex items-baseline gap-1 mt-1 mb-1">
                <span className="text-xl font-black text-slate-900">{plan.price}</span>
              </div>
              <p className="text-xs text-slate-400 mb-3">{plan.detail}</p>
              <p className="text-xs text-slate-600 leading-relaxed flex-1 mb-4">{plan.desc}</p>
              <Link
                href={plan.href}
                className="w-full py-2.5 text-center text-sm font-bold rounded-xl border-2 border-slate-200 text-slate-700 hover:border-cyan-400 hover:text-cyan-700 transition-all"
              >
                {plan.ctaLabel}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 確認モーダル */}
      {modal !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full space-y-5">
            {modal === 'confirm' ? (
              <>
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-cyan-50 flex items-center justify-center mx-auto text-2xl">📋</div>
                  <h3 className="text-lg font-black text-slate-900">
                    {APP_PLANS.find(p => p.id === selected)?.name} に興味を登録
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    現在このプランは準備中です。<br />
                    ご興味を登録しておくと、開始時にお知らせします。
                  </p>
                  <p className="text-xs text-slate-400 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    現在デモ期間中のため、料金の請求は一切ありません。
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setModal('closed')}
                    className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleRegisterInterest}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm font-bold shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-teal-400 disabled:opacity-50 transition-all"
                  >
                    {saving ? '登録中...' : '興味を登録する'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto text-2xl">✓</div>
                  <h3 className="text-lg font-black text-slate-900">登録しました</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    プランの提供が開始される際にご連絡します。<br />
                    引き続き全機能を無料でお使いいただけます。
                  </p>
                </div>
                <button
                  onClick={() => setModal('closed')}
                  className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 transition-all"
                >
                  閉じる
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
