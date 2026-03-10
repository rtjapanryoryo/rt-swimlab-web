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
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toUserFriendlyError(res: Response, data: { error?: string }, fallback: string): string {
    const raw = data?.error ?? '';
    if (/relation|does not exist|relation.*gene_profiles/i.test(raw)) {
      return 'GENE PROFILEの設定が完了していません。しばらく経ってからお試しください。';
    }
    if (/request entity too large|payload too large/i.test(raw)) {
      return 'ファイルが大きすぎます。20MB以下のPDFを選択してください。';
    }
    if (res.status >= 500) {
      return raw && !raw.startsWith('<') ? raw : 'サーバーエラーが発生しました。しばらく経ってからお試しください。';
    }
    return raw || fallback;
  }

  async function parseJsonOrText(res: Response) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      if (text.trimStart().startsWith('<')) {
        return { error: res.status >= 500 ? 'サーバーエラーが発生しました。しばらく経ってからお試しください。' : '不明なエラー' };
      }
      return { error: text || '不明なエラー' };
    }
  }

  function fetchProfiles() {
    setLoading(true);
    setError(null);
    fetch('/api/gene-profiles', { credentials: 'include', cache: 'no-store' })
      .then(async (res) => {
        const data = await parseJsonOrText(res);
        if (!res.ok) {
          throw new Error(toUserFriendlyError(res, data, '取得に失敗しました'));
        }
        setProfiles(data.profiles ?? []);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : '取得に失敗しました';
        const friendly = /fetch|network|failed/i.test(msg) ? '接続に失敗しました。ネットワークを確認して再度お試しください。' : msg;
        setError(friendly);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchProfiles();
  }, []);

  // 1件のみなので格納済みなら自動表示
  useEffect(() => {
    if (profiles.length > 0 && !viewingId) {
      setViewingId(profiles[0].id);
    }
  }, [profiles, viewingId]);

  // PDFを fetch で取得し Blob URL にして表示（iframe の認証問題を回避）
  useEffect(() => {
    if (!viewingId) {
      setPdfBlobUrl(null);
      return;
    }
    let cancelled = false;
    setPdfLoading(true);
    setPdfBlobUrl(null);
    setError(null);
    fetch(`/api/gene-profiles/${viewingId}/pdf`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) {
          const status = res.status;
          let msg = 'PDFの表示に失敗しました。';
          if (status === 401) msg = 'セッションが切れています。再ログインしてください。';
          else if (status === 404) msg = 'PDFが見つかりません。削除された可能性があります。';
          else if (status >= 500) msg = 'サーバーエラーが発生しました。しばらく経ってからお試しください。';
          try {
            const data = await res.json();
            if (data._debug) msg += ` (${data._debug})`;
          } catch {
            /* レスポンスがJSONでない場合は無視 */
          }
          throw new Error(msg);
        }
        const blob = await res.blob();
        // 200 OK なので API は PDF を返している。blob.type は環境により空や不定になるため、size > 0 を信頼する
        if (!cancelled && blob.size > 0) {
          setPdfBlobUrl(URL.createObjectURL(blob));
          setError(null);
        } else if (!cancelled) {
          setError('PDFの取得に失敗しました。ファイルが空の可能性があります。');
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'PDFの表示に失敗しました。ネットワークを確認してください。';
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setPdfLoading(false);
      });
    return () => {
      cancelled = true;
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [viewingId]);

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


  /** PDFを保存（ダウンロード） */
  async function handleDownloadPdf() {
    if (!viewingId) return;
    setError(null);
    try {
      const res = await fetch(`/api/gene-profiles/${viewingId}/pdf`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(res.status >= 500 ? 'PDFの取得に失敗しました。しばらく経ってからお試しください。' : '取得に失敗しました');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const profile = profiles.find((p) => p.id === viewingId) || profiles[0];
      a.download = (profile?.display_name || 'RT-GENE-PROFILE').replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\-]/g, '_') + '.pdf';
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
        setPdfBlobUrl(null);
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
        <div
          role="alert"
          className="p-4 md:p-5 bg-amber-50 border-2 border-amber-300/90 rounded-xl text-amber-900 text-sm md:text-base leading-relaxed"
        >
          <p className="font-medium">エラー</p>
          <p className="mt-1">{error}</p>
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

      {/* PDF表示（全ページ表示・縦スクロール可能） */}
      <section className="dashboard-card overflow-hidden">
        <div className="p-4">
          {loading ? (
            <div className="py-8 text-center text-slate-500 text-sm">読み込み中...</div>
          ) : error && profiles.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xl">
                !
              </div>
              <p className="text-slate-600 font-medium text-sm">データの取得に失敗しました</p>
              <p className="text-slate-400 text-xs mt-1">上のエラーメッセージを確認してください</p>
            </div>
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
              {/* ファイル名＋操作（PDFを保存・削除） */}
              <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-1 border-b border-cyan-100/80 mb-4">
                <p className="text-sm font-semibold text-slate-800 truncate min-w-0" title={profiles[0]?.display_name}>
                  {profiles[0]?.display_name}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  {viewingId && (
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-600 hover:to-teal-600 transition-all"
                    >
                      PDFを保存
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => profiles[0] && handleDelete(profiles[0].id)}
                    disabled={deletingId === profiles[0]?.id}
                    className="px-4 py-2 text-sm font-medium rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {deletingId === profiles[0]?.id ? '削除中...' : '削除'}
                  </button>
                </div>
              </div>
              {/* PDFビューア（fetch→Blob URL で認証を確実に、表示を安定化） */}
              <div className="bg-slate-50/50 rounded-xl border-2 border-slate-200/60 overflow-hidden min-h-[500px] h-[calc(100vh-320px)] relative">
                {pdfLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 text-slate-500 text-sm z-10">
                    PDFを読み込み中...
                  </div>
                ) : pdfBlobUrl ? (
                  <iframe
                    src={pdfBlobUrl}
                    title="RT GENE PROFILE"
                    className="w-full h-full min-h-[500px] border-0"
                  />
                ) : viewingId ? (
                  <div className="flex items-center justify-center py-24 text-slate-500 text-sm">
                    PDFの読み込みに失敗しました
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-24 text-slate-500 text-sm">
                    読み込み中...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
