'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DRILL_STROKES,
  DRILL_STROKE_LABEL,
  type DrillItem,
  type DrillStroke,
} from '@/types/drill';

type FormState = {
  stroke: DrillStroke;
  title: string;
  youtube_url: string;
  overview: string;
  key_points: string;
  sort_order: number;
  is_published: boolean;
};

const emptyForm = (): FormState => ({
  stroke: 'freestyle',
  title: '',
  youtube_url: '',
  overview: '',
  key_points: '',
  sort_order: 0,
  is_published: false,
});

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// 行コンポーネント（D&D対応）
function SortableRow({
  drill,
  editingId,
  onEdit,
  onDelete,
  onTogglePublish,
}: {
  drill: DrillItem;
  editingId: string | null;
  onEdit: (d: DrillItem) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (d: DrillItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: drill.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-slate-100 last:border-0 ${isDragging ? 'bg-cyan-50' : 'hover:bg-slate-50/80'}`}
    >
      <td className="px-3 py-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 select-none"
          title="ドラッグして並べ替え"
        >
          ⠿
        </button>
      </td>
      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{DRILL_STROKE_LABEL[drill.stroke]}</td>
      <td className="px-4 py-3 text-slate-900 font-medium">{drill.title}</td>
      <td className="px-4 py-3 text-slate-500 text-xs">{drill.sort_order}</td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => onTogglePublish(drill)}
          className={`text-xs font-bold px-2 py-1 rounded-lg border ${
            drill.is_published
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          {drill.is_published ? '公開中' : '下書き'}
        </button>
      </td>
      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(drill.updated_at)}</td>
      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
        <button
          type="button"
          onClick={() => onEdit(drill)}
          className={`text-sky-600 font-semibold hover:underline ${editingId === drill.id ? 'underline' : ''}`}
        >
          編集
        </button>
        <button
          type="button"
          onClick={() => onDelete(drill.id)}
          className="text-red-600 font-semibold hover:underline"
        >
          削除
        </button>
      </td>
    </tr>
  );
}

export default function AdminDrillsPage() {
  const [drills, setDrills] = useState<DrillItem[]>([]);
  const [filterStroke, setFilterStroke] = useState<DrillStroke | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const pendingReorder = useRef<DrillItem[]>([]);

  const sensors = useSensors(useSensor(PointerSensor));

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = filterStroke === 'all' ? '' : `?stroke=${filterStroke}`;
      const res = await fetch(`/api/admin/drills${q}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '取得に失敗しました');
      setDrills((data.drills as DrillItem[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [filterStroke]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const startEdit = (d: DrillItem) => {
    setEditingId(d.id);
    setForm({
      stroke: d.stroke,
      title: d.title,
      youtube_url: `https://www.youtube.com/watch?v=${d.youtube_video_id}`,
      overview: d.overview,
      key_points: d.key_points,
      sort_order: d.sort_order,
      is_published: d.is_published,
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/drills/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '保存に失敗しました');
      } else {
        const res = await fetch('/api/admin/drills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '作成に失敗しました');
      }
      await fetchList();
      startCreate();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('このドリルを削除しますか？')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/drills/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '削除に失敗しました');
      if (editingId === id) startCreate();
      await fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました');
    }
  };

  const togglePublish = async (d: DrillItem) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/drills/${d.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_published: !d.is_published }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '更新に失敗しました');
      await fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新に失敗しました');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = drills.findIndex((d) => d.id === active.id);
    const newIndex = drills.findIndex((d) => d.id === over.id);
    const reordered = arrayMove(drills, oldIndex, newIndex).map((d, i) => ({
      ...d,
      sort_order: i,
    }));
    setDrills(reordered);
    pendingReorder.current = reordered;

    setReordering(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/drills/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orders: reordered.map((d) => ({ id: d.id, sort_order: d.sort_order })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '並べ替えに失敗しました');
    } catch (e) {
      setError(e instanceof Error ? e.message : '並べ替えに失敗しました');
      await fetchList();
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ドリル練習 管理</h1>
        <p className="text-sm text-slate-500 mt-1">
          YouTube の URL を登録し、公開フラグで会員向け表示を制御します。行をドラッグして並べ替え可能。会員画面は{' '}
          <code className="text-xs bg-slate-100 px-1 rounded">NEXT_PUBLIC_DRILL_PRACTICE_ENABLED=true</code>{' '}
          のときのみナビに表示されます。
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3">{error}</div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">種目フィルタ</span>
            <button
              type="button"
              onClick={() => setFilterStroke('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                filterStroke === 'all'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              すべて
            </button>
            {DRILL_STROKES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStroke(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  filterStroke === s
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {DRILL_STROKE_LABEL[s]}
              </button>
            ))}
            {reordering && (
              <span className="text-xs text-slate-500 ml-2 flex items-center gap-1">
                <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                保存中…
              </span>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-slate-500 py-12 text-center">読み込み中…</p>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={drills.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="w-8 px-3 py-3" />
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">種目</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">タイトル</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 w-16">順序</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">公開</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">更新日</th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-600">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drills.map((d) => (
                        <SortableRow
                          key={d.id}
                          drill={d}
                          editingId={editingId}
                          onEdit={startEdit}
                          onDelete={remove}
                          onTogglePublish={togglePublish}
                        />
                      ))}
                    </tbody>
                  </table>
                </SortableContext>
              </DndContext>
              {drills.length === 0 && (
                <p className="text-center text-slate-500 py-10 text-sm">ドリルがありません。右のフォームから追加してください。</p>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 sticky top-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">{editingId ? '編集' : '新規作成'}</h2>
              <button
                type="button"
                onClick={startCreate}
                className="text-xs font-semibold text-sky-600 hover:underline"
              >
                クリア
              </button>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">種目</span>
              <select
                value={form.stroke}
                onChange={(e) => setForm((f) => ({ ...f, stroke: e.target.value as DrillStroke }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {DRILL_STROKES.map((s) => (
                  <option key={s} value={s}>
                    {DRILL_STROKE_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">タイトル</span>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                maxLength={200}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">YouTube URL</span>
              <input
                value={form.youtube_url}
                onChange={(e) => setForm((f) => ({ ...f, youtube_url: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">並び順（小さいほど上）</span>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">概要（Markdown可）</span>
              <textarea
                value={form.overview}
                onChange={(e) => setForm((f) => ({ ...f, overview: e.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-y"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">ポイント（Markdown可）</span>
              <textarea
                value={form.key_points}
                onChange={(e) => setForm((f) => ({ ...f, key_points: e.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-y"
              />
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                className="rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700">会員に公開する</span>
            </label>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? '保存中…' : editingId ? '更新する' : '作成する'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
