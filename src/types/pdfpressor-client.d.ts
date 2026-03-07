declare module 'pdfpressor-client' {
  export function compressPdfClient(
    pdfBytes: Uint8Array,
    outputName?: string,
    dpi?: number,
    quality?: number,
    options?: { parallel?: boolean; chunkSize?: number; progressCallback?: (p: { current: number; total: number }) => void }
  ): Promise<{
    compressFile: {
      bytes: Uint8Array;
      blob: Blob;
      stats: { compressedSize: number; originalSize: number };
    };
  }>;
}
