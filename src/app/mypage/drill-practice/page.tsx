'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DRILL_STROKES,
  DRILL_STROKE_LABEL,
  type DrillItemPublic,
  type DrillStroke,
} from '@/types/drill';
import { youtubeEmbedUrl } from '@/lib/youtube-id';

const ENABLED = process.env.NEXT_PUBLIC_DRILL_PRACTICE_ENABLED === 'true';

export default function DrillPracticePage() {
  const [stroke, setStroke] = useState<DrillStroke>('freestyle');
  const [drills, setDrills] = useState<DrillItemPublic[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (s: DrillStroke) => {
    setLoading(true);
    setError(null);
    setSelectedId(null);
    try {
      const res = await fetch(`/api/drills?stroke=${s}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '読み込みに失敗しました');
      const list = (data.drills as DrillItemPublic[]) ?? [];
      setDrills(list);
      if (list.length > 0) setSelectedId(list[0].id);
    } catch (e) {
      setDrills([]);
      setError(e instanceof Error ? e.message : '読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ENABLED) return;
    load(stroke);
  }, [stroke, load]);

  if (!ENABLED) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">ドリル練習</h1>
        <p className="text-slate-600 rounded-2xl border border-cyan-100 bg-white/80 p-6">
          現在この機能は公開準備中です。リリースまでしばらくお待ちください。
        </p>
      </div>
    );
  }

  const selected = drills.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-800">ドリル練習</h1>
        <p className="text-sm text-slate-600">
          種目を選び、ドリルをタップして動画と要点を確認できます。
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {DRILL_STROKES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStroke(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              stroke === s
                ? 'bg-cyan-600 text-white border-cyan-600'
                : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-200 hover:bg-cyan-50/50'
            }`}
          >
            {DRILL_STROKE_LABEL[s]}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">ドリル一覧</h2>
          {loading ? (
            <div className="flex items-center gap-3 text-slate-500 text-sm py-8 justify-center border border-dashed border-slate-200 rounded-2xl">
              <span className="w-5 h-5 border-2 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
              読み込み中…
            </div>
          ) : drills.length === 0 ? (
            <p className="text-sm text-slate-500 border border-slate-100 rounded-2xl bg-white/80 p-6">
              この種目の公開中のドリルはまだありません。
            </p>
          ) : (
            <ul className="space-y-2">
              {drills.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(d.id)}
                    className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${
                      selectedId === d.id
                        ? 'border-cyan-400 bg-cyan-50/80 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-cyan-200'
                    }`}
                  >
                    <span className="font-semibold text-slate-800">{d.title}</span>
                    {d.overview ? (
                      <span className="block text-xs text-slate-500 mt-1 line-clamp-2">{d.overview}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          {selected ? (
            <article className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="aspect-video bg-slate-900">
                <iframe
                  title={selected.title}
                  src={youtubeEmbedUrl(selected.youtube_video_id)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <div className="p-5 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
                <section>
                  <h3 className="text-xs font-bold text-cyan-700 uppercase tracking-wider mb-2">概要</h3>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.overview || '—'}</p>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-cyan-700 uppercase tracking-wider mb-2">ポイント</h3>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.key_points || '—'}</p>
                </section>
              </div>
            </article>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center text-sm text-slate-500">
              左の一覧からドリルを選ぶと、ここに動画と説明が表示されます。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
