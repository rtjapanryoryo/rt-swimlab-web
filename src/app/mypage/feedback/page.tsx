'use client';

import { useState } from 'react';
import type { FeedbackCategory } from '@/types/feedback';
import { CATEGORY_META } from '@/types/feedback';

const CATEGORIES = Object.entries(CATEGORY_META) as [FeedbackCategory, typeof CATEGORY_META[FeedbackCategory]][];

const STAR_LABELS = ['', 'とても不満', '不満', '普通', '満足', 'とても満足'];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl transition-transform hover:scale-110"
        >
          <span className={(hovered || value) >= n ? 'text-amber-400' : 'text-slate-200'}>★</span>
        </button>
      ))}
      {(hovered || value) > 0 && (
        <span className="text-xs text-slate-500 ml-1 self-center">{STAR_LABELS[hovered || value]}</span>
      )}
    </div>
  );
}

type Step = 'form' | 'done';

export default function FeedbackPage() {
  const [step, setStep]         = useState<Step>('form');
  const [category, setCategory] = useState<FeedbackCategory | ''>('');
  const [message, setMessage]   = useState('');
  const [rating, setRating]     = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  const canSubmit = category !== '' && message.trim().length >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message: message.trim(), rating: rating || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'エラーが発生しました');
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">
          ✓
        </div>
        <h2 className="text-lg font-bold text-slate-900">ありがとうございます！</h2>
        <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
          フィードバックを受け付けました。いただいた内容はサービス改善に活用させていただきます。
        </p>
        <button
          onClick={() => { setStep('form'); setCategory(''); setMessage(''); setRating(0); }}
          className="mt-2 text-sm text-cyan-600 hover:text-cyan-500 font-medium"
        >
          続けてフィードバックを送る
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">フィードバック</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          使ってみた感想や、あったら嬉しい機能など、何でもお聞かせください。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* カテゴリ選択 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3">
            カテゴリ <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CATEGORIES.map(([key, meta]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${
                  category === key
                    ? 'border-cyan-400 bg-cyan-50 text-cyan-800 shadow-sm shadow-cyan-100'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg">{meta.icon}</span>
                <span>{meta.label}</span>
                {category === key && (
                  <span className="ml-auto text-cyan-500">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* メッセージ */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            内容 <span className="text-red-400">*</span>
          </label>
          <textarea
            rows={5}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="練習メニューの感想、使ってみて良かった点、こんな機能があったら嬉しいなど、何でもお聞かせください。&#10;&#10;例：〇〇の機能がとても使いやすかったです。△△もできると、さらに練習に活かせそうです。"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-cyan-300 transition resize-none"
          />
          <p className={`text-xs mt-1 text-right ${message.length > 1900 ? 'text-red-400' : 'text-slate-400'}`}>
            {message.length} / 2000
          </p>
        </div>

        {/* 満足度（任意） */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            現在のサービス満足度
            <span className="ml-1 text-xs font-normal text-slate-400">（任意）</span>
          </label>
          <StarRating value={rating} onChange={setRating} />
        </div>

        {/* エラー */}
        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
            {error}
          </p>
        )}

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {submitting ? '送信中...' : 'フィードバックを送る'}
        </button>
      </form>
    </div>
  );
}
