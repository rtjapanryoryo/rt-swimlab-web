'use client';

import { useState, useEffect, useRef } from 'react';
import { compressPdfIfNeeded } from '@/lib/compress-pdf';
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
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  async function parseJsonOrText(res: Response) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      const msg = text || '不明なエラー';
      if (/request entity too large|payload too large/i.test(msg)) {
        return { error: 'ファイルが大きすぎます。20MB以下のPDFを選択してください。' };
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

  // 1件のみなので格納済みなら自動表示
  useEffect(() => {
    if (profiles.length > 0 && !viewUrl && !viewingId) {
      handleView(profiles[0].id);
    }
  }, [profiles]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('PDFファイルのみアップロードできます');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('ファイルサイズは20MBまでです（自動圧縮されます）');
      return;
    }
    setUploading(true);
    setError(null);
    let fileToUpload = file;
    if (file.size > 2 * 1024 * 1024) {
      try {
        fileToUpload = await compressPdfIfNeeded(file);
      } catch {
        // 圧縮失敗時は元ファイルで続行
      }
    }
    const formData = new FormData();
    formData.append('file', fileToUpload);
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

  /** PDFをダウンロード（モバイルで表示できない場合のフォールバック） */
  async function handleDownloadPdf() {
    if (!viewingId) return;
    try {
      const res = await fetch(`/api/gene-profiles/${viewingId}/pdf`, { credentials: 'include' });
      if (!res.ok) throw new Error('取得に失敗しました');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (profiles[0]?.display_name || 'RT-GENE-PROFILE').replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\-]/g, '_') + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDFの保存に失敗しました');
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

  const GENE_PROFILE_LP_URL = 'https://rt-japan.jp/lp/rt-gene-profile/';

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">RT GENE PROFILE</h1>
        <p className="text-slate-500 mt-1 text-sm">
          遺伝子情報PDFを格納し、いつでも確認できます
        </p>
      </header>

      {/* 公式LPへの導線 */}
      <section className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/80 to-white p-6">
        <p className="text-slate-700 text-sm leading-relaxed mb-4">
          才能を決める検査ではありません。
          限られた時間の中で、あなたが最短距離を進むための
          身体の設計図（前提条件）を可視化するツールです。
        </p>
        <a
          href={GENE_PROFILE_LP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          詳しく見る・お申し込み
          <span className="text-blue-200">→</span>
        </a>
      </section>

      {error && (
        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-800 text-sm">
          {error}
        </div>
      )}

      {/* PDFを追加 */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-4 py-1 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">PDFを追加</h2>
        </div>
        <div className="px-4 py-2">
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
            disabled={uploading || profiles.length >= 1}
            className="w-full py-1 px-3 border border-dashed border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm text-slate-600"
          >
            {uploading ? (
              <span className="text-slate-500">圧縮・アップロード中...</span>
            ) : (
              <span className="text-slate-600">クリックしてPDFを選択</span>
            )}
          </button>
        </div>
      </section>

      {/* PDF表示（コンパクト枠） */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-4">
          {loading ? (
            <div className="py-8 text-center text-slate-500 text-sm">読み込み中...</div>
          ) : profiles.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl">
                ◇
              </div>
              <p className="text-slate-600 font-medium text-sm">まだPDFがありません</p>
              <p className="text-slate-400 text-xs mt-1">上のボタンからアップロードしてください</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* ファイル名＋操作（削除・保存） */}
              <div className="flex items-center justify-between gap-3 py-1.5 px-1 border-b border-slate-100 mb-3">
                <p className="text-sm font-medium text-slate-800 truncate min-w-0" title={profiles[0]?.display_name}>
                  {profiles[0]?.display_name}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  {viewUrl && (
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                    >
                      PDFを保存
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => profiles[0] && handleDelete(profiles[0].id)}
                    disabled={deletingId === profiles[0]?.id}
                    className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {deletingId === profiles[0]?.id ? '削除中...' : '削除'}
                  </button>
                </div>
              </div>
              {/* PDFビューア（署名付きURLで iframe 表示。モバイルでも同一方式） */}
              <div className={`bg-slate-50/30 rounded-lg border border-slate-200/60 ${isMobile ? 'min-h-[400px] overflow-hidden flex flex-col' : 'min-h-[400px] sm:min-h-[520px] md:min-h-[600px] overflow-auto'}`}>
                {viewUrl ? (
                  <>
                    {isMobile && (
                      <div className="shrink-0 flex gap-2 p-2">
                        <a
                          href={viewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 text-sm font-medium text-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                        >
                          ブラウザで開く
                        </a>
                        <button
                          type="button"
                          onClick={handleDownloadPdf}
                          className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                        >
                          PDFを保存
                        </button>
                      </div>
                    )}
                    <div className="flex-1 min-h-[300px] overflow-hidden">
                      <iframe
                        src={`${viewUrl}#navpanes=0&pagemode=none&view=FitH`}
                        title="PDFプレビュー"
                        className="w-full h-full min-h-[300px] border-0"
                      />
                    </div>
                  </>
                ) : viewingId ? (
                  <div className="flex items-center justify-center py-24 text-slate-500 text-sm">
                    読み込み中...
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
