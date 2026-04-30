'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  DRILL_STROKES,
  DRILL_STROKE_LABEL,
  type DrillItemPublic,
  type DrillStroke,
} from '@/types/drill';
import { youtubeEmbedUrl } from '@/lib/youtube-id';

const ENABLED = process.env.NEXT_PUBLIC_DRILL_PRACTICE_ENABLED === 'true';

const LS_FAVORITES = 'drill_favorites';
const LS_LAST = 'drill_last_viewed';

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_FAVORITES);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveFavorites(ids: Set<string>) {
  localStorage.setItem(LS_FAVORITES, JSON.stringify([...ids]));
}

function loadLastViewed(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_LAST);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLastViewed(stroke: string, id: string) {
  const map = loadLastViewed();
  map[stroke] = id;
  localStorage.setItem(LS_LAST, JSON.stringify(map));
}

export default function DrillPracticePage() {
  const [stroke, setStroke] = useState<DrillStroke>('freestyle');
  const [drills, setDrills] = useState<DrillItemPublic[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavorites(next);
      return next;
    });
  };

  const selectDrill = (id: string) => {
    setSelectedId(id);
    saveLastViewed(stroke, id);
  };

  const load = useCallback(async (s: DrillStroke) => {
    setLoading(true);
    setError(null);
    setSelectedId(null);
    setSearch('');
    setShowFavOnly(false);
    try {
      const res = await fetch(`/api/drills?stroke=${s}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '読み込みに失敗しました');
      const list = (data.drills as DrillItemPublic[]) ?? [];
      setDrills(list);
      setIsPreview(Boolean(data.preview));

      const last = loadLastViewed()[s];
      const resumeId = last && list.find((d) => d.id === last) ? last : list[0]?.id ?? null;
      if (resumeId) setSelectedId(resumeId);
    } catch (e) {
      setDrills([]);
      setError(e instanceof Error ? e.message : '読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPreview = useCallback(async (s: DrillStroke) => {
    setLoading(true);
    setError(null);
    setSelectedId(null);
    setSearch('');
    setShowFavOnly(false);
    try {
      const res = await fetch(`/api/drills?stroke=${s}&preview=1`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '読み込みに失敗しました');
      const list = (data.drills as DrillItemPublic[]) ?? [];
      setDrills(list);
      setIsPreview(true);
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

  const q = search.toLowerCase();
  const visible = drills.filter((d) => {
    if (showFavOnly && !favorites.has(d.id)) return false;
    if (q && !d.title.toLowerCase().includes(q) && !d.overview.toLowerCase().includes(q)) return false;
    return true;
  });

  const selected = drills.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">ドリル練習</h1>
          {isPreview && (
            <span className="text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg">
              プレビュー（未公開含む）
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600">
          種目を選び、ドリルをタップして動画と要点を確認できます。
        </p>
      </header>

      {/* 種目タブ */}
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
        {!isPreview && (
          <button
            type="button"
            onClick={() => loadPreview(stroke)}
            className="ml-auto px-3 py-2 rounded-xl text-xs font-semibold border border-dashed border-slate-300 text-slate-500 hover:border-amber-300 hover:text-amber-700 transition-colors"
            title="管理者：未公開ドリルをプレビュー"
          >
            プレビュー
          </button>
        )}
      </div>

      {/* 検索・フィルタ */}
      <div className="flex gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ドリルを検索…"
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
        />
        <button
          type="button"
          onClick={() => setShowFavOnly((v) => !v)}
          className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
            showFavOnly
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-white border-slate-200 text-slate-500 hover:border-amber-200'
          }`}
          title="お気に入りのみ表示"
        >
          ★ お気に入り
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* ドリル一覧 */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            ドリル一覧{visible.length !== drills.length && ` (${visible.length}/${drills.length})`}
          </h2>
          {loading ? (
            <div className="flex items-center gap-3 text-slate-500 text-sm py-8 justify-center border border-dashed border-slate-200 rounded-2xl">
              <span className="w-5 h-5 border-2 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
              読み込み中…
            </div>
          ) : visible.length === 0 ? (
            <p className="text-sm text-slate-500 border border-slate-100 rounded-2xl bg-white/80 p-6">
              {drills.length === 0
                ? '公開中のドリルはまだありません。'
                : '条件に一致するドリルがありません。'}
            </p>
          ) : (
            <ul className="space-y-2">
              {visible.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => selectDrill(d.id)}
                    className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${
                      selectedId === d.id
                        ? 'border-cyan-400 bg-cyan-50/80 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-cyan-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-800 block">{d.title}</span>
                        {d.overview ? (
                          <span className="block text-xs text-slate-500 mt-1 line-clamp-2">{d.overview}</span>
                        ) : null}
                        {isPreview && d.is_published === false && (
                          <span className="inline-block mt-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            未公開
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(d.id); }}
                        className={`shrink-0 text-lg leading-none transition-colors ${
                          favorites.has(d.id) ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'
                        }`}
                        title={favorites.has(d.id) ? 'お気に入り解除' : 'お気に入り追加'}
                      >
                        ★
                      </button>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 詳細パネル */}
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
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(selected.id)}
                    className={`text-xl leading-none transition-colors ${
                      favorites.has(selected.id) ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'
                    }`}
                  >
                    ★
                  </button>
                </div>
                <section>
                  <h3 className="text-xs font-bold text-cyan-700 uppercase tracking-wider mb-2">概要</h3>
                  <div className="prose prose-sm max-w-none text-slate-700">
                    <ReactMarkdown>{selected.overview || '—'}</ReactMarkdown>
                  </div>
                </section>
                <section>
                  <h3 className="text-xs font-bold text-cyan-700 uppercase tracking-wider mb-2">ポイント</h3>
                  <div className="prose prose-sm max-w-none text-slate-700">
                    <ReactMarkdown>{selected.key_points || '—'}</ReactMarkdown>
                  </div>
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
