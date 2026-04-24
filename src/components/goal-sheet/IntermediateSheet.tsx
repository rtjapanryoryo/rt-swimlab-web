'use client';

import { useState } from 'react';
import type { IntermediateContent } from '@/types/goal-sheet';
import { INTERMEDIATE_DEFAULT } from '@/types/goal-sheet';

type Props = {
  initialData: IntermediateContent | null;
  aiAdvice: string | null;
  savedAt: string | null;
  onSave: (data: IntermediateContent) => Promise<void>;
};

type GoalTab = 'season' | 'monthly' | 'weekly' | 'tomorrow';

function Section({ num, title, subtitle, children }: {
  num: string; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print-section">
      <div className="px-5 pt-4 pb-3 flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-blue-200">
          <span className="text-[11px] font-black text-white">{num}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-800 leading-snug">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      <div className="border-t border-slate-50 px-5 py-4 space-y-4 bg-slate-50/40">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, rows = 2, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; hint?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      {hint && <p className="text-[11px] text-slate-400 mb-1.5 leading-relaxed">{hint}</p>}
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition-all resize-none shadow-sm"
      />
    </div>
  );
}

function InlineField({ label, value, onChange, placeholder, className = '' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition-all shadow-sm"
      />
    </div>
  );
}

const GOAL_TABS: { key: GoalTab; label: string; desc: string }[] = [
  { key: 'season',   label: 'シーズン', desc: '今シーズンの最終目標' },
  { key: 'monthly',  label: '今月',     desc: '今月の重点テーマ' },
  { key: 'weekly',   label: '今週',     desc: '今週のフォーカス' },
  { key: 'tomorrow', label: '明日',     desc: '明日の練習テーマ' },
];

export function IntermediateSheet({ initialData, aiAdvice, savedAt, onSave }: Props) {
  const [form, setForm] = useState<IntermediateContent>(() => ({
    ...INTERMEDIATE_DEFAULT,
    ...(initialData ?? {}),
  }));
  const [goalTab, setGoalTab] = useState<GoalTab>('monthly');
  const [saving, setSaving] = useState(false);

  const set = (key: keyof IntermediateContent, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* テーマ説明 */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl px-5 py-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-75 mb-1">中級テーマ</p>
        <p className="text-base font-bold">具体化と数値化</p>
        <p className="text-xs opacity-80 mt-1 leading-relaxed">
          「なんとなく」から抜け出し、成長できる状態をつくります。目標を数字に落とし込み、シーズン→今月→今週→明日の順に具体化します。
        </p>
      </div>

      {/* ① ビジョン */}
      <Section num="①" title="夢・ビジョン設定（具体性アップ）" subtitle="出場大会と目標記録を定め、理想の選手像まで具体化します">
        <p className="text-xs text-slate-400 bg-blue-50 rounded-xl px-3 py-2">
          例：2026年JO 100m平泳ぎで1:02.50を出す。最後まで落ち着いてレースをつくれる選手になる。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InlineField label="① いつまでに" value={form.vision_deadline} onChange={v => set('vision_deadline', v)} placeholder="例：2026年6月 JO" />
          <InlineField label="② どの種目で" value={form.vision_event} onChange={v => set('vision_event', v)} placeholder="例：100m平泳ぎ" />
          <InlineField label="③ 何秒出すか" value={form.vision_target_time} onChange={v => set('vision_target_time', v)} placeholder="例：1:02.50" />
        </div>
        <Field
          label="④ どんな選手になりたいか（技術・メンタル）"
          value={form.vision_player_type}
          onChange={v => set('vision_player_type', v)}
          placeholder="例：最後まで落ち着いてレースをつくれる選手 / プレッシャーに強い選手"
          rows={2}
        />
      </Section>

      {/* ② 現在の自分 */}
      <Section num="②" title="現在の自分を数字で見てみよう" subtitle="今の自分を知ることが、成長のスタートです">
        <div className="grid grid-cols-2 gap-3">
          <InlineField label="専門種目" value={form.current_event} onChange={v => set('current_event', v)} placeholder="例：100m平泳ぎ" />
          <InlineField label="ベストタイム" value={form.current_best_time} onChange={v => set('current_best_time', v)} placeholder="例：1:04.20" />
        </div>
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">レースの分析・振り返り</p>
          <Field label="前半（スピード感）" value={form.current_race_first} onChange={v => set('current_race_first', v)}
            placeholder="例：落ち着いて入れた / 力んでしまった" rows={2} />
          <Field label="後半（ペース維持）" value={form.current_race_second} onChange={v => set('current_race_second', v)}
            placeholder="例：最後までフォームを保てた / 足が重くなった" rows={2} />
          <Field label="ストロークの感覚" value={form.current_stroke} onChange={v => set('current_stroke', v)}
            placeholder="例：伸びがある / ピッチが上がるなど" rows={2} />
          <Field label="ターン・タッチ" value={form.current_turn} onChange={v => set('current_turn', v)}
            placeholder="例：スムーズ / 壁を強く蹴れるなど" rows={2} />
        </div>
        <Field label="強みと伸びしろ" value={form.current_strengths} onChange={v => set('current_strengths', v)}
          placeholder="例：スタートが得意 / フォームが崩れない / 練習を継続できる" rows={2} />
        <Field label="課題・改善したいこと" value={form.current_improvements} onChange={v => set('current_improvements', v)}
          placeholder="例：後半のスタミナ不足 / キックの打ち込み / クイックターンの精度" rows={2} />
      </Section>

      {/* ③ 目標（タブ切り替え） */}
      <Section num="③" title="目標達成までを小さく分けて進める" subtitle="シーズン → 今月 → 今週 → 明日 の順に具体化します">
        <div className="no-print flex gap-1 p-1 bg-slate-100 rounded-xl">
          {GOAL_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setGoalTab(tab.key)}
              className={`flex-1 py-2 px-1 text-xs font-semibold rounded-lg transition-all ${
                goalTab === tab.key
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-blue-500 font-medium -mt-1">
          {GOAL_TABS.find(t => t.key === goalTab)?.desc}
        </p>

        {goalTab === 'season' && (
          <div className="space-y-3">
            <InlineField label="目標とする大会" value={form.season_meet} onChange={v => set('season_meet', v)} placeholder="例：2026年6月 JO大会" />
            <InlineField label="目標タイム" value={form.season_time} onChange={v => set('season_time', v)} placeholder="例：1:02.50" />
            <Field label="目指す泳ぎ" value={form.season_swimming} onChange={v => set('season_swimming', v)}
              placeholder="例：最後まで力まず泳ぎ切る / 前半から積極的なレースをする" rows={2} />
            <Field label="半年後の中間タイム" value={form.midterm_time} onChange={v => set('midterm_time', v)}
              placeholder="例：1:03.50 を目安" rows={1} />
            <Field label="強化ポイントの進捗" value={form.midterm_strength} onChange={v => set('midterm_strength', v)}
              placeholder="例：後半のスタミナ向上、キックの強化" rows={2} />
            <Field label="フォームの目標" value={form.midterm_form} onChange={v => set('midterm_form', v)}
              placeholder="例：ストロークの伸びを意識する、抵抗を減らす" rows={2} />
          </div>
        )}
        {goalTab === 'monthly' && (
          <div className="space-y-3">
            <Field label="メイン練習の目標" value={form.monthly_main} onChange={v => set('monthly_main', v)}
              placeholder="例：週○回は目標ペースで泳ぐ、○m×○本を揃える" rows={2} />
            <Field label="コンディショニング" value={form.monthly_conditioning} onChange={v => set('monthly_conditioning', v)}
              placeholder="例：週○回の筋トレ・ストレッチ、柔軟性を高める" rows={2} />
            <Field label="技術課題" value={form.monthly_technique} onChange={v => set('monthly_technique', v)}
              placeholder="例：ターンの成功率を上げる、壁を強く蹴る" rows={2} />
          </div>
        )}
        {goalTab === 'weekly' && (
          <div className="space-y-3">
            <Field label="練習の質" value={form.weekly_quality} onChange={v => set('weekly_quality', v)}
              placeholder="例：メイン練習で目標の○秒以内をキープする" rows={2} />
            <Field label="フォーム確認" value={form.weekly_form} onChange={v => set('weekly_form', v)}
              placeholder="例：ストローク数を意識して泳ぐ" rows={2} />
            <Field label="体調管理" value={form.weekly_condition} onChange={v => set('weekly_condition', v)}
              placeholder="例：睡眠時間を確保する、しっかりケアをする" rows={2} />
          </div>
        )}
        {goalTab === 'tomorrow' && (
          <div className="space-y-3">
            <Field label="具体的なタイム目標" value={form.tomorrow_time} onChange={v => set('tomorrow_time', v)}
              placeholder="例：メインの○本目まで○秒以内で揃える" rows={2} />
            <Field label="意識するポイント" value={form.tomorrow_focus} onChange={v => set('tomorrow_focus', v)}
              placeholder="例：呼吸の時に頭を上げない、指先の入水を丁寧に" rows={2} />
            <Field label="反復練習" value={form.tomorrow_repeat} onChange={v => set('tomorrow_repeat', v)}
              placeholder="例：ターンやスタートの練習を○回集中して行う" rows={2} />
          </div>
        )}
      </Section>

      {/* ④ 振り返り */}
      <Section num="④" title="振り返り（次につなげるセルフチェック）">
        <div className="space-y-3">
          {[
            { key: 'reflection_specific'  as const, label: '目標は具体的だったか', desc: '「頑張る」だけでなく、具体的に何を達成したかを振り返ります' },
            { key: 'reflection_executed'  as const, label: '決めたことを実行できたか', desc: '自分なりにやり遂げたか確認します' },
            { key: 'reflection_next_task' as const, label: '次に試したい課題は見つかったか', desc: '次の練習でどう変えたいかを明確にします' },
          ].map(item => (
            <label key={item.key} className="flex items-start gap-3 cursor-pointer group bg-white rounded-xl border border-slate-100 px-4 py-3 shadow-sm hover:border-blue-200 transition-colors">
              <input
                type="checkbox"
                checked={form[item.key]}
                onChange={e => set(item.key, e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded accent-blue-500 shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">{item.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </Section>

      {/* 保存ボタン */}
      <div className="no-print">
        {savedAt && (
          <p className="text-[11px] text-slate-400 text-center mb-2">
            最終保存：{new Date(savedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-200/60 hover:from-blue-400 hover:to-cyan-400 disabled:opacity-60 transition-all active:scale-[0.99]"
        >
          {saving ? '保存中...' : '✓ 保存してAIアドバイスをもらう'}
        </button>
      </div>

      {/* AIフィードバック */}
      {aiAdvice && (
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 p-5">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-base">🤖</span>
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">AI からの分析</span>
          </div>
          <p className="text-sm text-blue-900 leading-relaxed">{aiAdvice}</p>
        </div>
      )}
    </div>
  );
}
