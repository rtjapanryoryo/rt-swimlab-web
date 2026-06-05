export default function RTSwimLabMenuPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/25 shrink-0">
          🏊
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">RT swim lab</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            距離・強度・インターバルを科学的に設計したメニューを即時生成
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-amber-50 border border-amber-200 px-6 py-10 text-center space-y-3">
        <p className="text-3xl">🔧</p>
        <p className="text-base font-bold text-amber-800">現在、編集・準備中です</p>
        <p className="text-sm text-amber-700">デモ期間が終了したため、メニュー生成は一時的に停止しています。<br />近日中に正式公開予定ですので、もうしばらくお待ちください。</p>
      </div>
    </div>
  );
}
