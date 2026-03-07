export default function GeneticPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">遺伝子情報PDF</h1>
        <p className="text-slate-500 mt-1 text-sm">PDFを格納する機能は準備中です</p>
      </header>
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="py-20 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl">◇</div>
          <p className="text-slate-600 font-medium">準備中</p>
          <p className="text-slate-400 text-sm mt-1">しばらくお待ちください</p>
        </div>
      </section>
    </div>
  );
}
