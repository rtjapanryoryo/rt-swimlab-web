'use client';

import { useState, useEffect, useCallback } from 'react';

interface Section {
  title: string;
  body: string;
}

interface LegalDoc {
  id: string;
  doc_title: string;
  intro: string;
  sections: Section[];
  footer: string;
  updated_at: string;
}

type DocType = 'terms' | 'privacy';

const TYPES: { id: DocType; label: string }[] = [
  { id: 'terms',   label: '利用規約' },
  { id: 'privacy', label: 'プライバシーポリシー' },
];

export default function LegalPage() {
  const [activeType, setActiveType] = useState<DocType>('terms');
  const [docs, setDocs] = useState<Record<DocType, LegalDoc | null>>({ terms: null, privacy: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const fetchDoc = useCallback(async (type: DocType) => {
    const res = await fetch(`/api/admin/legal?type=${type}`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.doc as LegalDoc) ?? null;
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDoc('terms'), fetchDoc('privacy')])
      .then(([terms, privacy]) => setDocs({ terms, privacy }))
      .catch(() => setError('読み込みに失敗しました'))
      .finally(() => setLoading(false));
  }, [fetchDoc]);

  const doc = docs[activeType];

  const updateDoc = (updates: Partial<LegalDoc>) =>
    setDocs(prev => ({
      ...prev,
      [activeType]: prev[activeType] ? { ...prev[activeType]!, ...updates } : null,
    }));

  const updateSection = (idx: number, field: keyof Section, value: string) => {
    if (!doc) return;
    const next = [...doc.sections];
    next[idx] = { ...next[idx], [field]: value };
    updateDoc({ sections: next });
  };

  const addSection = () => {
    if (!doc) return;
    updateDoc({ sections: [...doc.sections, { title: '新しいセクション', body: '' }] });
  };

  const removeSection = (idx: number) => {
    if (!doc) return;
    updateDoc({ sections: doc.sections.filter((_, i) => i !== idx) });
  };

  const save = async () => {
    if (!doc) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/legal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: activeType,
          doc_title: doc.doc_title,
          intro:     doc.intro,
          sections:  doc.sections,
          footer:    doc.footer,
        }),
      });
      if (!res.ok) throw new Error('保存に失敗しました');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 p-12">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">法的文書の編集</h1>
          <p className="text-sm text-slate-500 mt-0.5">利用規約・プライバシーポリシーを管理します</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-emerald-600 font-medium">✓ 保存しました</span>}
          {error && <span className="text-sm text-red-500">{error}</span>}
          <button
            onClick={save}
            disabled={saving || !doc}
            className="px-5 py-2 bg-sky-500 text-white text-sm font-semibold rounded-lg hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveType(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeType === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {doc ? (
        <div className="space-y-5">

          {/* ドキュメント情報 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">ドキュメント情報</h2>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">タイトル</label>
              <input
                value={doc.doc_title}
                onChange={e => updateDoc({ doc_title: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">冒頭文</label>
              <textarea
                value={doc.intro}
                onChange={e => updateDoc({ intro: e.target.value })}
                rows={3}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 resize-y"
              />
            </div>
            {doc.updated_at && (
              <p className="text-xs text-slate-400">
                最終更新：{new Date(doc.updated_at).toLocaleString('ja-JP')}
              </p>
            )}
          </div>

          {/* セクション一覧 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">セクション（{doc.sections.length}件）</h2>
              <button
                onClick={addSection}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                セクション追加
              </button>
            </div>

            {doc.sections.map((section, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    value={section.title}
                    onChange={e => updateSection(idx, 'title', e.target.value)}
                    placeholder="セクションタイトル"
                    className="flex-1 px-3 py-1.5 text-sm font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <button
                    onClick={() => removeSection(idx)}
                    title="削除"
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-medium">
                    本文（行頭 <code className="bg-slate-100 px-1 rounded">- </code> で箇条書き、空行で段落区切り）
                  </label>
                  <textarea
                    value={section.body}
                    onChange={e => updateSection(idx, 'body', e.target.value)}
                    rows={7}
                    className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 resize-y font-mono leading-relaxed"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* フッター */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">フッターテキスト</h2>
            <textarea
              value={doc.footer}
              onChange={e => updateDoc({ footer: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 resize-y"
            />
          </div>

        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-14 text-center">
          <p className="text-sm text-slate-400">データを読み込めませんでした</p>
          <p className="text-xs text-slate-300 mt-1">マイグレーションが実行済みか確認してください</p>
        </div>
      )}
    </div>
  );
}
