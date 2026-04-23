'use client';

import { useState } from 'react';
import type { AdvancedContent } from '@/types/goal-sheet';
import { ADVANCED_DEFAULT } from '@/types/goal-sheet';

type Props = {
  initialData: AdvancedContent | null;
  aiAdvice: string | null;
  savedAt: string | null;
  onSave: (data: AdvancedContent) => Promise<void>;
};

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-100 overflow-hidden print-section">
      <div className="bg-amber-50 px-5 py-3.5 border-b border-amber-100">
        <h3 className="text-sm font-bold text-amber-800">{title}</h3>
        {subtitle && <p className="text-xs text-amber-600 mt-0.5">{subtitle}</p>}
      </div>
      <div className="bg-white px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, rows = 2, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1.5">{hint}</p>}
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition resize-none"
      />
    </div>
  );
}

function InlineField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-slate-600 shrink-0 w-28">{label}</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
      />
    </div>
  );
}

function ScoreSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-slate-600 shrink-0 w-32">{label}</span>
      <input
        type="range"
        min={0}
        max={10}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 accent-amber-500"
      />
      <span className="text-sm font-black text-amber-600 tabular-nums w-12 text-right">{value}/10</span>
    </div>
  );
}

// レースプランの区間ビジュアル
const SEGMENTS = [
  { key: 'race_0_15'   as const, label: '0〜15m',    width: 'w-[15%]', color: 'bg-amber-200', hint: 'スタート〜浮き上がり' },
  { key: 'race_15_50'  as const, label: '15〜50m',   width: 'w-[35%]', color: 'bg-amber-100', hint: '前半ストローク' },
  { key: 'race_50_75'  as const, label: '50〜75m',   width: 'w-[25%]', color: 'bg-amber-200', hint: 'ターン後' },
  { key: 'race_75_100' as const, label: '75〜100m',  width: 'w-[25%]', color: 'bg-amber-300', hint: 'ラスト勝負' },
];

export function AdvancedSheet({ initialData, aiAdvice, savedAt, onSave }: Props) {
  const [form, setForm] = useState<AdvancedContent>(() => ({
    ...ADVANCED_DEFAULT,
    ...(initialData ?? {}),
  }));
  const [saving, setSaving] = useState(false);

  const set = (key: keyof AdvancedContent, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {/* テーマ説明 */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
        <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">テーマ</p>
        <p className="text-sm font-bold text-amber-800">再現性と戦略</p>
        <p className="text-xs text-amber-600 mt-1 leading-relaxed">
          「伸びる」段階から「勝つ」段階へ進みます。ライバル比較・レースプラン・コンディション管理で勝ち筋を明確にします。
        </p>
      </div>

      {/* ① 理想のレースビジョン */}
      <Section title="① 理想のレースビジョン" subtitle="ターゲット大会・目標順位・目標タイムを定めます">
        <InlineField label="ターゲット大会" value={form.vision_meet} onChange={v => set('vision_meet', v)} placeholder="例：2026年インターハイ" />
        <InlineField label="目標とする順位" value={form.vision_rank} onChange={v => set('vision_rank', v)} placeholder="例：決勝進出 / 3位以内" />
        <InlineField label="優勝（目標）タイム" value={form.vision_time} onChange={v => set('vision_time', v)} placeholder="例：54.50" />
        <Field
          label="自分の必勝パターン"
          value={form.vision_pattern}
          onChange={v => set('vision_pattern', v)}
          placeholder="例：前半から逃げ切る / 後半の追い上げで競り勝つ"
          rows={2}
        />
      </Section>

      {/* ② ライバル・自己分析 */}
      <Section title="② ライバル・自己分析" subtitle="上位選手のタイムと自分の差を数値で把握します">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* 上位選手 */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">【上位選手のタイム】</p>
            <InlineField label="前半" value={form.rival_first} onChange={v => set('rival_first', v)} placeholder="例：26.80" />
            <InlineField label="後半" value={form.rival_second} onChange={v => set('rival_second', v)} placeholder="例：28.20" />
            <Field label="特徴・強み" value={form.rival_strengths} onChange={v => set('rival_strengths', v)}
              placeholder="例：浮き上がりが速い、ピッチが落ちない" rows={2} />
          </div>
          {/* 自分との差 */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">【自分との差】</p>
            <InlineField label="前半の差" value={form.diff_first} onChange={v => set('diff_first', v)} placeholder="例：+0.30秒" />
            <InlineField label="後半の差" value={form.diff_second} onChange={v => set('diff_second', v)} placeholder="例：-0.50秒" />
            <Field label="技術・スタミナの差" value={form.diff_technique} onChange={v => set('diff_technique', v)}
              placeholder="例：ターンのキレ、ラストの粘り" rows={2} />
          </div>
        </div>
      </Section>

      {/* ③ レースプラン */}
      <Section title="③ レースプラン（100m）" subtitle="区間ごとの意識と理想の泳ぎを設計します">
        {/* プールビジュアル */}
        <div className="rounded-xl overflow-hidden border border-amber-200 no-print">
          <div className="flex h-10 text-[10px] font-bold">
            {SEGMENTS.map(seg => (
              <div key={seg.key} className={`${seg.width} ${seg.color} flex items-center justify-center border-r border-amber-300/50 last:border-r-0 text-amber-800`}>
                {seg.label}
              </div>
            ))}
          </div>
          <div className="flex h-6 text-[9px]">
            {SEGMENTS.map(seg => (
              <div key={seg.key} className={`${seg.width} flex items-center justify-center text-amber-600 bg-amber-50 border-r border-amber-100 last:border-r-0`}>
                {seg.hint}
              </div>
            ))}
          </div>
        </div>

        {/* 区間入力 */}
        <div className="space-y-3">
          {SEGMENTS.map(seg => (
            <Field key={seg.key} label={`${seg.label}（${seg.hint}）`} value={form[seg.key]}
              onChange={v => set(seg.key, v)}
              placeholder="意識するポイントを書いてください"
              rows={2}
            />
          ))}
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">【理想の泳ぎ】</p>
          <Field label="ストローク数" value={form.race_stroke_count} onChange={v => set('race_stroke_count', v)}
            placeholder="例：前半はゆったり大きく、後半は回数を増やす" rows={2} />
          <Field label="テンポ" value={form.race_tempo} onChange={v => set('race_tempo', v)}
            placeholder="例：後半に向けてだんだん速くする / 一定のリズムを保つ" rows={2} />
          <Field label="息継ぎのタイミング" value={form.race_breathing} onChange={v => set('race_breathing', v)}
            placeholder="例：ターンの直前は我慢する / ラスト10mは回数を減らす" rows={2} />
        </div>
      </Section>

      {/* ④ コンディション・メンタル */}
      <Section title="④ コンディション・メンタル準備" subtitle="試合当日に最高のパフォーマンスを出すための準備">
        <InlineField label="目標体重・体調管理" value={form.cond_weight} onChange={v => set('cond_weight', v)} placeholder="例：58kg前後を維持" />
        <InlineField label="理想の睡眠時間" value={form.cond_sleep} onChange={v => set('cond_sleep', v)} placeholder="例：7〜8時間" />
        <Field label="当日のルーティン（準備運動など）" value={form.cond_routine} onChange={v => set('cond_routine', v)}
          placeholder="例：レース2時間前に軽いアップ、ストレッチ20分" rows={2} />
        <Field label="緊張した時のリラックス法" value={form.cond_relaxation} onChange={v => set('cond_relaxation', v)}
          placeholder="例：深呼吸3回 / 好きな音楽を聴く / 成功イメージを描く" rows={2} />
      </Section>

      {/* ⑤ 年間ロードマップ */}
      <Section title="⑤ 年間ロードマップ" subtitle="大会ごとの位置づけを明確にします">
        {[
          { key: 'road_target' as const, label: 'ターゲット大会', badge: '🎯 照準', placeholder: '照準を合わせ、最高の結果を狙う大会' },
          { key: 'road_stepup' as const, label: 'ステップアップ大会', badge: '📈 実戦', placeholder: '次の大きな目標に向けて実戦感覚を養う大会' },
          { key: 'road_enjoy' as const, label: 'エンジョイ大会', badge: '🤝 繋がり', placeholder: '競い合うだけでなく、水泳を通じた繋がりを大切にする大会' },
        ].map(item => (
          <div key={item.key} className="flex items-start gap-3">
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 shrink-0 mt-0.5">
              {item.badge}
            </span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 mb-1">{item.label}</p>
              <input
                type="text"
                value={form[item.key]}
                onChange={e => set(item.key, e.target.value)}
                placeholder={item.placeholder}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
              />
            </div>
          </div>
        ))}
      </Section>

      {/* ⑥ 毎日のセルフ評価 */}
      <Section title="⑥ 毎日のセルフ評価（10点満点）" subtitle="4つの軸で今日の練習を振り返ります">
        <div className="space-y-4 py-1">
          <ScoreSlider label="技術（フォーム）" value={form.score_technique} onChange={v => set('score_technique', v)} />
          <ScoreSlider label="集中力" value={form.score_concentration} onChange={v => set('score_concentration', v)} />
          <ScoreSlider label="コンディション" value={form.score_condition} onChange={v => set('score_condition', v)} />
          <ScoreSlider label="充実度" value={form.score_satisfaction} onChange={v => set('score_satisfaction', v)} />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 bg-amber-50 rounded-xl px-4 py-2.5">
          <span>本日の総合スコア</span>
          <span className="text-lg font-black text-amber-600 tabular-nums">
            {Math.round((form.score_technique + form.score_concentration + form.score_condition + form.score_satisfaction) / 4 * 10) / 10}
            <span className="text-xs font-semibold text-amber-400">/10</span>
          </span>
        </div>
      </Section>

      {/* 保存ボタン */}
      <div className="no-print flex items-center justify-between gap-3 pt-1">
        {savedAt && (
          <p className="text-xs text-slate-400">
            最終保存：{new Date(savedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 transition-all"
        >
          {saving ? '保存中...' : '保存してAIアドバイスをもらう'}
        </button>
      </div>

      {/* AIフィードバック */}
      {aiAdvice && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🤖</span>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">AI 戦略フィードバック</span>
          </div>
          <p className="text-sm text-amber-900 leading-relaxed">{aiAdvice}</p>
        </div>
      )}
    </div>
  );
}
