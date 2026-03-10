'use client';

export interface PurposeFieldProps {
  value: string;
  onChange: (v: string) => void;
  /** 項目番号（クイック: "1" / カスタム: "5"） */
  itemNumber?: string;
}

const PERIOD_OPTIONS = [
  { value: '1', label: '① リカバリー期', sub: '回復・感覚維持' },
  { value: '2', label: '② 基礎形成期', sub: 'フォーム・水感覚' },
  { value: '3', label: '③ 発展形成期', sub: '技術精度・スピード導入' },
  { value: '4', label: '④ 強化期（スピード持久力）', sub: '心肺・ボリューム' },
  { value: '5', label: '⑤ 強化期（耐乳酸）', sub: 'レースペース・粘り' },
  { value: '6', label: '⑥ 調整期', sub: '疲労除去・スピード維持' },
  { value: '7', label: '⑦ テーパー期', sub: '仕上げ・神経調整' },
];

/**
 * 練習の目的（期）選択。コアな項目なので目立つUIにする。
 */
export function PurposeField({ value, onChange, itemNumber = '1' }: PurposeFieldProps) {
  return (
    <div className="relative rounded-2xl border-2 border-teal-300/90 bg-gradient-to-br from-teal-50/80 to-white p-5 sm:p-6 shadow-md shadow-teal-500/10">
      {/* まずここ・コアであることを示すバッジ */}
      <div className="absolute -top-2.5 left-4 px-3 py-0.5 rounded-full bg-teal-500 text-white text-xs font-bold tracking-wide shadow-sm">
        まずここを決める
      </div>

      <div className="pt-1">
        <h3 className="text-base font-bold text-slate-800 mb-0.5">
          {itemNumber}. 今日の目的（期）
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          練習のテーマを決めます。メニューの方向性を決める最重要項目です
        </p>

        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3.5 text-base font-medium border-2 border-teal-300/80 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400 transition-colors cursor-pointer hover:border-teal-400/80"
        >
          <option value="">選択してください</option>
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}　—　{opt.sub}
            </option>
          ))}
        </select>

        {value && (
          <p className="mt-2 text-xs text-teal-600 font-medium">
            ✓ {PERIOD_OPTIONS.find((o) => o.value === value)?.label ?? ''} でメニューを設計します
          </p>
        )}
      </div>
    </div>
  );
}
