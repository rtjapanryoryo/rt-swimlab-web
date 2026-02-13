/**
 * WebView 検出と Google ログイン用 URL 生成
 * Error 403: disallowed_useragent 対策（LINE・Twitter等のアプリ内ブラウザでは OAuth がブロックされる）
 */

/** アプリ内ブラウザ（WebView）の userAgent パターン */
const WEBVIEW_PATTERNS = [
  /Line\//i,
  /FBAN|FBAV/i, // Facebook
  /Twitter/i,
  /Instagram/i,
  /LinkedInApp/i,
  /Snapchat/i,
  /KAKAOTALK/i,
  /NAVER/i,
  /; wv\)/i, // Android WebView
  /WebView/i,
];

export function isLikelyWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return WEBVIEW_PATTERNS.some((p) => p.test(ua));
}

/** Google ログイン用の URL（ブラウザで開く用） */
export function getGoogleSignInUrl(callbackUrl: string): string {
  if (typeof window === 'undefined') return '';
  const base = window.location.origin;
  const url = `${base}/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  return url;
}
