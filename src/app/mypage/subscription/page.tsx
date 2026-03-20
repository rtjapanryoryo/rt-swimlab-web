import { ExternalLinks } from '@/components/ExternalLinks';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '¥0',
    period: '永久無料',
    gradient: 'from-slate-100 to-slate-50',
    border: 'border-slate-200',
    badge: null,
    features: [
      { label: 'クイック生成', value: '月5回まで', ok: true },
      { label: 'カスタム生成 (AI)', value: '月3回まで', ok: true },
      { label: 'メニュー履歴', value: '直近10件', ok: true },
      { label: 'PDF保存', value: '◯', ok: true },
      { label: 'テキストコピー', value: '◯', ok: true },
      { label: 'シーズン管理', value: '◯', ok: true },
      { label: 'GENE PROFILE', value: '1件まで', ok: true },
      { label: '高代コーチメニュー', value: '—', ok: false },
      { label: '無制限生成', value: '—', ok: false },
      { label: '優先サポート', value: '—', ok: false },
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '¥980',
    period: '/ 月',
    gradient: 'from-cyan-50 to-teal-50',
    border: 'border-cyan-300',
    badge: '人気',
    features: [
      { label: 'クイック生成', value: '無制限', ok: true },
      { label: 'カスタム生成 (AI)', value: '月30回', ok: true },
      { label: 'メニュー履歴', value: '全件', ok: true },
      { label: 'PDF保存', value: '◯', ok: true },
      { label: 'テキストコピー', value: '◯', ok: true },
      { label: 'シーズン管理', value: '◯', ok: true },
      { label: 'GENE PROFILE', value: '無制限', ok: true },
      { label: '高代コーチメニュー', value: '◯', ok: true },
      { label: '無制限生成', value: '—', ok: false },
      { label: '優先サポート', value: '—', ok: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '¥2,480',
    period: '/ 月',
    gradient: 'from-violet-50 to-purple-50',
    border: 'border-violet-300',
    badge: 'コーチ向け',
    features: [
      { label: 'クイック生成', value: '無制限', ok: true },
      { label: 'カスタム生成 (AI)', value: '無制限', ok: true },
      { label: 'メニュー履歴', value: '全件', ok: true },
      { label: 'PDF保存', value: '◯', ok: true },
      { label: 'テキストコピー', value: '◯', ok: true },
      { label: 'シーズン管理', value: '◯', ok: true },
      { label: 'GENE PROFILE', value: '無制限', ok: true },
      { label: '高代コーチメニュー', value: '◯', ok: true },
      { label: '無制限生成', value: '◯', ok: true },
      { label: '優先サポート', value: '◯', ok: true },
    ],
  },
];

export default function SubscriptionPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">プランを選ぶ</h1>
        <p className="text-slate-500 mt-1 text-sm">
          あなたの練習スタイルに合ったプランで、より質の高いトレーニングを。
        </p>
      </header>

      {/* プラン比較 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-3xl border-2 ${plan.border} bg-gradient-to-br ${plan.gradient} p-6 flex flex-col`}
          >
            {/* バッジ */}
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md shadow-cyan-500/30 whitespace-nowrap">
                {plan.badge}
              </span>
            )}

            {/* プラン名・価格 */}
            <div className="mb-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{plan.name}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">{plan.price}</span>
                <span className="text-sm text-slate-500">{plan.period}</span>
              </div>
            </div>

            {/* 機能一覧 */}
            <ul className="space-y-2 flex-1 mb-6">
              {plan.features.map((f) => (
                <li key={f.label} className={`flex items-center justify-between text-sm ${f.ok ? '' : 'opacity-40'}`}>
                  <span className={`font-medium ${f.ok ? 'text-slate-700' : 'text-slate-400'}`}>
                    {f.ok ? '✓' : '✗'} {f.label}
                  </span>
                  <span className={`text-xs font-semibold ${f.ok ? 'text-slate-600' : 'text-slate-300'}`}>
                    {f.value}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            {plan.id === 'free' ? (
              <div className="w-full py-2.5 text-center text-sm font-semibold text-slate-400 border-2 border-slate-200 rounded-2xl bg-white/60">
                現在のプラン
              </div>
            ) : (
              <div className="w-full py-2.5 text-center text-sm font-semibold text-slate-400 border-2 border-slate-200 rounded-2xl bg-white/60">
                準備中
              </div>
            )}
          </div>
        ))}
      </div>

      {/* お問い合わせ */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
        <p className="text-sm font-bold text-slate-700 mb-1">ご質問・最新情報はこちら</p>
        <p className="text-xs text-slate-400 mb-4">有料プランの開始時期はコミュニティでお知らせします</p>
        <div className="flex justify-center">
          <ExternalLinks variant="buttons" />
        </div>
      </section>
    </div>
  );
}
