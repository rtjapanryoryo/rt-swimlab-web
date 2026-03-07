import { ExternalLinks } from '@/components/ExternalLinks';

export default function SubscriptionPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">有料プラン</h1>
        <p className="text-slate-500 mt-1 text-sm">Stripe との連携は準備中です</p>
      </header>
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="py-16 px-6 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl">◆</div>
          <p className="text-slate-600 font-medium">準備中</p>
          <p className="text-slate-400 text-sm mt-1">しばらくお待ちください</p>
          <div className="mt-8 pt-8 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-4">お問い合わせ・最新情報はこちら</p>
            <div className="flex justify-center">
              <ExternalLinks variant="buttons" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
