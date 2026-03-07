'use client';

import { useState, useEffect, useRef } from 'react';
import { ExternalLinks } from '@/components/ExternalLinks';
import { uploadGeneProfile } from './actions';

type GeneProfile = {
  id: string;
  display_name: string;
  created_at: string;
};

export default function GeneticPage() {
  const [profiles, setProfiles] = useState<GeneProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function parseJsonOrText(res: Response) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      const msg = text || '不明なエラー';
      if (/request entity too large|payload too large/i.test(msg)) {
        return { error: 'ファイルが大きすぎます。100MB以下のPDFを選択してください。' };
      }
      return { error: msg };
    }
  }

  function fetchProfiles() {
    setLoading(true);
    setError(null);
    fetch('/api/gene-profiles', { credentials: 'include' })
      .then(async (res) => {
        const data = await parseJsonOrText(res);
        if (!res.ok) throw new Error(data.error ?? '取得に失敗しました');
        setProfiles(data.profiles ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'エラー'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('PDFファイルのみアップロードできます');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('ファイルサイズは100MBまでです');
      return;
    }
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('display_name', file.name.replace(/\.pdf$/i, ''));
    try {
      const result = await uploadGeneProfile(formData);
      if (result.error) throw new Error(result.error);
      fetchProfiles();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  }

  async function handleView(id: string) {
    setViewingId(id);
    setViewUrl(null);
    try {
      const res = await fetch(`/api/gene-profiles/${id}`, { credentials: 'include' });
      const data = await parseJsonOrText(res);
      if (!res.ok) throw new Error(data.error ?? '表示に失敗しました');
      setViewUrl(data.profile?.signed_url ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '表示に失敗しました');
      setViewingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このPDFを削除しますか？')) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/gene-profiles/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await parseJsonOrText(res);
        throw new Error(data.error ?? '削除に失敗しました');
      }
      if (viewingId === id) {
        setViewingId(null);
        setViewUrl(null);
      }
      fetchProfiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  }

  const formatDate = (s: string) =>
    new Date(s).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">RT GENE PROFILE</h1>
        <p className="text-slate-500 mt-1 text-sm">
          遺伝子情報PDFを格納し、いつでも確認できます
        </p>
      </header>

      {error && (
        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-800 text-sm">
          {error}
        </div>
      )}

      {/* アップロード */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">PDFを追加</h2>
          <p className="text-xs text-slate-500 mt-0.5">遺伝子情報PDFをアップロード（100MBまで）</p>
        </div>
        <div className="p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-8 px-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-teal-300 hover:bg-teal-50/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <span className="text-slate-500">アップロード中...</span>
            ) : (
              <span className="text-slate-600">クリックしてPDFを選択</span>
            )}
          </button>
        </div>
      </section>

      {/* 格納一覧 */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">格納済みPDF</h2>
            <p className="text-xs text-slate-500 mt-0.5">いつでも確認・ダウンロードできます</p>
          </div>
          {profiles.length > 0 && (
            <span className="text-xs text-slate-400 tabular-nums">{profiles.length} 件</span>
          )}
        </div>
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">読み込み中...</div>
          ) : profiles.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl">
                ◇
              </div>
              <p className="text-slate-600 font-medium">まだPDFがありません</p>
              <p className="text-slate-400 text-sm mt-1">上のボタンからアップロードしてください</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 一覧 */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border transition-all ${
                      viewingId === p.id
                        ? 'border-teal-200 bg-teal-50/80'
                        : 'border-slate-100 hover:bg-slate-50/80'
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-800 truncate" title={p.display_name}>
                      {p.display_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                      {formatDate(p.created_at)}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => handleView(p.id)}
                        disabled={viewingId === p.id}
                        className="px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                      >
                        表示
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {deletingId === p.id ? '削除中...' : '削除'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* プレビュー */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 min-h-[400px] overflow-hidden">
                {viewUrl ? (
                  <iframe
                    src={viewUrl}
                    title="PDFプレビュー"
                    className="w-full h-[480px] border-0"
                  />
                ) : viewingId ? (
                  <div className="flex items-center justify-center h-[400px] text-slate-500 text-sm">
                    読み込み中...
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 text-sm">
                    <span className="text-2xl mb-2">◇</span>
                    左のリストから「表示」をクリック
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 外部リンク */}
      <section className="pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-500 mb-3">お問い合わせ・最新情報はこちら</p>
        <ExternalLinks variant="buttons" />
      </section>
    </div>
  );
}
