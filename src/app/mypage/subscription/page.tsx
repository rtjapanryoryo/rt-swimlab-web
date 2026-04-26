'use client';

import Link from 'next/link';

const APP_PLANS = [
  {
    id: 'free',
    name: 'フリー',
    price: '¥0',
    period: '永久無料',
    badge: null,
    highlight: false,
    customGen: '累計3回',
    customNote: '体験版',
    features: [
      'クイック生成：無制限',
      'カスタム生成（AI）：累計3回',
      'メニュー履歴：直近10件',
      'PDF保存・テキストコピー',
      'シーズン管理',
      'GENE PROFILE：1件',
    ],
  },
  {
    id: 'basic',
    name: 'ベーシック',
    price: '¥500',
    period: '/ 月（税込）',
    badge: null,
    highlight: false,
    customGen: '6回 / 月',
    customNote: '週1回＋やり直し分',
    features: [
      'クイック生成：無制限',
      'カスタム生成（AI）：6回 / 月',
      'メニュー履歴：全件',
      'PDF保存・テキストコピー',
      'シーズン管理',
      'GENE PROFILE：無制限',
      '残回数の繰越（有効期限30日）',
    ],
  },
  {
    id: 'standard',
    name: 'スタンダード',
    price: '¥980',
    period: '/ 月（税込）',
    badge: 'おすすめ',
    highlight: true,
    customGen: '12回 / 月',
    customNote: '週2〜3回使用',
    features: [
      'クイック生成：無制限',
      'カスタム生成（AI）：12回 / 月',
      'メニュー履歴：全件',
      'PDF保存・テキストコピー',
      'シーズン管理',
      'GENE PROFILE：無制限',
      '残回数の繰越（有効期限30日）',
    ],
  },
  {
    id: 'pro',
    name: 'プロ',
    price: '¥1,500',
    period: '/ 月（税込）',
    badge: null,
    highlight: false,
    customGen: '30回 / 月',
    customNote: '週7回使用',
    features: [
      'クイック生成：無制限',
      'カスタム生成（AI）：30回 / 月',
      'メニュー履歴：全件',
      'PDF保存・テキストコピー',
      'シーズン管理',
      'GENE PROFILE：無制限',
      '残回数の繰越（有効期限30日）',
      '超過利用：¥80 / 回',
    ],
  },
];

const COUNSELING_PLANS = [
  {
    id: 'free_counseling',
    tag: '初回無料',
    name: '無料カウンセリング',
    price: '¥0',
    detail: '20分 / 1人1回限り',
    description: '練習の方向性や目標の立て方について、コーチと一緒に確認します。まずは気軽にご相談ください。',
    cta: '申し込む',
    href: '/mypage/counseling',
    ctaStyle: 'border-2 border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50',
  },
  {
    id: 'athlete',
    tag: '個人向け',
    name: '選手プラン',
    price: '¥1,500',
    detail: '/ 回（30分）',
    description: '目標シート作成・レビュー、アプリ設定相談、次回までのアクション設定。',
    cta: '申し込む',
    href: '/mypage/counseling?plan=athlete',
    ctaStyle: 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-teal-400',
  },
  {
    id: 'coach_plan',
    tag: '指導者向け',
    name: 'コーチプラン',
    price: '¥2,980',
    detail: '/ 回（60分）4名以上 +¥1,000/人',
    description: 'チームへのヒアリング・ソリューション提案、次回までのアクション設定。',
    cta: '申し込む',
    href: '/mypage/counseling?plan=coach',
    ctaStyle: 'border-2 border-amber-400 text-amber-700 hover:bg-amber-50',
  },
];

export default function SubscriptionPage() {
  return (
    <div className="space-y-10 max-w-4xl mx-auto">

      {/* デモ期間バナー */}
      <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 px-6 py-5 flex items-start gap-4">
        <span className="text-2xl shrink-0">🎁</span>
        <div>
          <p className="text-base font-black text-amber-800">現在、3ヶ月間のデモ期間中です</p>
          <p className="text-sm text-amber-700 mt-1 leading-relaxed">
            すべての機能を無料でご利用いただけます。料金の請求はございません。<br />
            下記はいずれ有料化する際の予定料金です。参考としてご確認ください。
          </p>
        </div>
      </div>

      {/* アプリプラン */}
      <section className="space-y-5">
        <header>
          <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-1">App Plans</p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">アプリ課金プラン</h1>
          <p className="text-sm text-slate-500 mt-1">
            クイック生成は全プラン無制限。カスタム生成（AI）の回数で選ぶ。
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {APP_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-5 flex flex-col ${
                plan.highlight
                  ? 'border-cyan-400 bg-gradient-to-b from-cyan-50 to-white shadow-lg shadow-cyan-500/10'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md whitespace-nowrap">
                  {plan.badge}
                </span>
              )}

              <div className="mb-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{plan.name}</p>
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-2xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-xs text-slate-400">{plan.period}</span>
                </div>
                <div className="mt-2 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs font-bold text-slate-700">{plan.customGen}</p>
                  <p className="text-[10px] text-slate-400">{plan.customNote}</p>
                </div>
              </div>

              <ul className="space-y-1.5 flex-1 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <span className="text-cyan-500 mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="w-full py-2 text-center text-xs font-semibold text-slate-400 border border-slate-200 rounded-xl bg-slate-50/60">
                {plan.id === 'free' ? '現在のプラン' : '準備中'}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          繰越：残回数 ＋ 新プラン回数を加算（有効期限30日）　／　返金：購入・契約後の返金なし（特商法表記に明記）　／　超過：プロのみ ¥80/回で無制限利用可
        </p>
      </section>

      {/* カウンセリングプラン */}
      <section className="space-y-5">
        <header>
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Counseling Plans</p>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">カウンセリングプラン</h2>
          <p className="text-sm text-slate-500 mt-1">
            アプリサブスクとは別課金。コーチが伴走することで継続率と転換率を最大化。
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COUNSELING_PLANS.map((plan) => (
            <div key={plan.id} className="rounded-2xl border-2 border-slate-200 bg-white p-5 flex flex-col">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{plan.tag}</p>
              <p className="text-base font-black text-slate-900 mb-1">{plan.name}</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-black text-slate-900">{plan.price}</span>
              </div>
              <p className="text-xs text-slate-400 mb-3">{plan.detail}</p>
              <p className="text-xs text-slate-600 leading-relaxed flex-1 mb-4">{plan.description}</p>
              <Link
                href={plan.href}
                className={`w-full py-2.5 text-center text-sm font-bold rounded-xl transition-all ${plan.ctaStyle}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400">
          運用：渡部コーチ（メイン）/ 島谷（補佐）　無料枠は常時開放 / 返金なし統一
        </p>
      </section>

    </div>
  );
}
