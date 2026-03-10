/**
 * Content-Disposition ヘッダー用ユーティリティ
 *
 * ## 重要: HTTP ヘッダーと非 ASCII 文字
 *
 * HTTP ヘッダーは ByteString（各バイトが 0-255）である必要があります。
 * 日本語などの非 ASCII をそのまま入れると:
 *   TypeError: Cannot convert argument to a ByteString because the character at index N has a value of XXXXX which is greater than 255.
 * というエラーが発生します。
 *
 * ## 解決策: RFC 5987
 *
 * - filename= : ASCII のみ（非 ASCII はアンダースコアに置換したフォールバック）
 * - filename*=UTF-8'' : encodeURIComponent でエンコードした UTF-8 表現（ASCII の範囲に収まる）
 *
 * 両方指定することで、古いクライアントは filename= を、
 * 新しいクライアントは filename*= を優先して正しいファイル名を取得できます。
 *
 * @see https://www.rfc-editor.org/rfc/rfc5987
 */
export type DispositionType = 'inline' | 'attachment';

/**
 * ユーザー由来のファイル名を Content-Disposition ヘッダー用に安全にフォーマットする。
 * 日本語等を含むファイル名でもヘッダー送信で TypeError を起こさない。
 */
export function safeContentDisposition(
  filename: string,
  disposition: DispositionType = 'inline'
): string {
  const sanitized = filename.replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\-.]/g, '_');
  const asciiOnly = sanitized.replace(/[^\x00-\x7F]/g, '_');

  if (asciiOnly === sanitized) {
    return `${disposition}; filename="${asciiOnly}"`;
  }
  return `${disposition}; filename="${asciiOnly}"; filename*=UTF-8''${encodeURIComponent(sanitized)}`;
}
