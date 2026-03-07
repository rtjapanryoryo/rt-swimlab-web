/**
 * PDF 自動圧縮（クライアント専用）
 * 10MB超のファイルを確実にアップロードできるよう圧縮する
 */
const COMPRESS_THRESHOLD = 2 * 1024 * 1024; // 2MB 超で圧縮を試行
const TARGET_DPI = 120;
const TARGET_QUALITY = 0.65;

export async function compressPdfIfNeeded(file: File): Promise<File> {
  if (file.size <= COMPRESS_THRESHOLD) return file;

  try {
    const { compressPdfClient } = await import('pdfpressor-client');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { compressFile } = await compressPdfClient(
      bytes,
      file.name,
      TARGET_DPI,
      TARGET_QUALITY,
      { parallel: true, chunkSize: 5 }
    );

    if (compressFile.stats.compressedSize < file.size) {
      return new File([compressFile.blob], file.name, {
        type: 'application/pdf',
        lastModified: Date.now(),
      });
    }
  } catch (e) {
    console.warn('[compress-pdf] 圧縮に失敗、元ファイルを使用:', e);
  }
  return file;
}
