'use client';

import { useState } from 'react';
import type { BeginnerContent } from '@/types/goal-sheet';
import { BEGINNER_DEFAULT } from '@/types/goal-sheet';

type Props = {
  initialData: BeginnerContent | null;
  aiAdvice: string | null;
  savedAt: string | null;
  onSave: (data: BeginnerContent) => Promise<void>;
};

function Section({ num, title, subtitle, children }: {
  num: string; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print-section">
      <div className="px-5 pt-4 pb-3 flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-emerald-200">
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

function Field({ label, value, onChange, placeholder, rows = 3, hint }: {
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
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 transition-all resize-none shadow-sm"
      />
    </div>
  );
}

function InlineField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 transition-all shadow-sm"
      />
    </div>
  );
}

const SATISFACTION_LABELS = ['', '😔 つらい', '😕 いまいち', '😐 ふつう', '😊 良い', '🌟 最高'];

export function BeginnerSheet({ initialData, aiAdvice, savedAt, onSave }: Props) {
  const [form, setForm] = useState<BeginnerContent>(() => ({
    ...BEGINNER_DEFAULT,
    ...(initialData ?? {}),
  }));
  const [saving, setSaving] = useState(false);

  const set = (key: keyof BeginnerContent, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* テーマ説明 */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl px-5 py-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-75 mb-1">初級テーマ</p>
        <p className="text-base font-bold">夢をカタチにしよう</p>
        <p className="text-xs opacity-80 mt-1 leading-relaxed">
          目標に向かって少しずつ進むためのシート。大きな夢を決めて、小さな目標に分けて、毎日一歩ずつ進んでいく流れをまとめます。
        </p>
      </div>

      {/* ① 夢・ビジョン */}
      <Section num="①" title="夢・ビジョンを決めよう" subtitle="夢は大きくて大丈夫です">
        <Field
          label="なぜその夢を持ったのですか？"
          value={form.why}
          onChange={v => set('why', v)}
          placeholder="例：憧れの先輩が全国大会に出ていたから／水泳で自分を証明したいから"
          rows={2}
        />
        <InlineField
          label="いつまでに？"
          value={form.vision_deadline}
          onChange={v => set('vision_deadline', v)}
          placeholder="例：2026年3月の県大会 / 中学3年の夏"
        />
        <Field
          label="どうなっていたいですか？（タイム・順位・理想の選手像）"
          value={form.vision_how}
          onChange={v => set('vision_how', v)}
          placeholder="例：全国大会に出たい / JO決勝に残りたい / 日本一になりたい"
          rows={2}
        />
      </Section>

      {/* ② 今の自分 */}
      <Section num="②" title="今の自分を知ろう" subtitle="今の自分を知ることが、成長のスタートです">
        <div className="grid grid-cols-2 gap-3">
          <InlineField label="専門種目" value={form.current_event} onChange={v => set('current_event', v)} placeholder="例：100m自由形" />
          <InlineField label="ベストタイム" value={form.current_best_time} onChange={v => set('current_best_time', v)} placeholder="例：1:05.23" />
        </div>
        <Field
          label="自分の強み・得意なこと"
          value={form.current_strengths}
          onChange={v => set('current_strengths', v)}
          placeholder="例：キックが強い / スタートが得意 / 最後まであきらめない / 練習を休まない"
          rows={2}
          hint="例文をヒントに、自分の言葉で書いてみましょう"
        />
        <Field
          label="自分の弱み・苦手なこと"
          value={form.current_weaknesses}
          onChange={v => set('current_weaknesses', v)}
          placeholder="例：後半バテる / 呼吸で頭が上がる / ターンが遅い"
          rows={2}
          hint="弱みはダメなことではなく、伸びるチャンスです"
        />
        <Field
          label="最近の練習で気になっていること"
          value={form.current_concern}
          onChange={v => set('current_concern', v)}
          placeholder="例：ターンのタイミングがずれている / 息継ぎのリズムが乱れる"
          rows={2}
        />
      </Section>

      {/* ③ 目標を段階に */}
      <Section num="③" title="目標を段階ごとにわけよう" subtitle="夢に近づくために、少しずつ分けて考えていきます">
        <Field
          label="今週の目標"
          value={form.goal_this_week}
          onChange={v => set('goal_this_week', v)}
          placeholder="例：メイン練習で目標タイムを3回出す / ターンを丁寧にする"
          rows={2}
        />
        <Field
          label="明日の練習で達成したい目標"
          value={form.goal_tomorrow}
          onChange={v => set('goal_tomorrow', v)}
          placeholder="例：ターンを丁寧にする / ストロークを大きく泳ぐ"
          rows={2}
        />
      </Section>

      {/* ④ 振り返り */}
      <Section num="④" title="小さなステップにわけよう" subtitle="着実に進めるため、振り返りの習慣をつくります">
        <Field
          label="今日できたこと"
          value={form.reflection_did}
          onChange={v => set('reflection_did', v)}
          placeholder="例：最後まで諦めなかった / ターンを意識して泳げた"
          rows={2}
        />
        <Field
          label="次に改善したいこと"
          value={form.reflection_next}
          onChange={v => set('reflection_next', v)}
          placeholder="例：呼吸のタイミングをもっと安定させる / スタートをもっと鋭く"
          rows={2}
        />
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">今日の練習の充実度</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={5}
              value={form.reflection_satisfaction}
              onChange={e => set('reflection_satisfaction', Number(e.target.value))}
              className="flex-1 accent-emerald-500 h-2"
            />
            <span className="text-sm font-bold text-emerald-700 shrink-0 w-20 text-right">
              {SATISFACTION_LABELS[form.reflection_satisfaction]}
            </span>
          </div>
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
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-emerald-200/60 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60 transition-all active:scale-[0.99]"
        >
          {saving ? '保存中...' : '✓ 保存してAIアドバイスをもらう'}
        </button>
      </div>

      {/* AIフィードバック */}
      {aiAdvice && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-5">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-base">🤖</span>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">AI からの一言</span>
          </div>
          <p className="text-sm text-emerald-900 leading-relaxed">{aiAdvice}</p>
        </div>
      )}
    </div>
  );
}
