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

/** LINE かどうか */
export function isLineWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Line\//i.test(navigator.userAgent);
}

/** Google ログイン用の URL（ブラウザで開く用） */
export function getGoogleSignInUrl(callbackUrl: string): string {
  if (typeof window === 'undefined') return '';
  const base = window.location.origin;
  const url = `${base}/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  return url;
}

/** Android かどうか */
function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}


function addParam(url: string, param: string, value: string): string {
  const u = new URL(url);
  u.searchParams.set(param, value);
  return u.toString();
}

/** ブラウザで開く用 URL
 * - LINE: openExternalBrowser=1 で外部ブラウザ起動
 * - Android（LINE以外）: intent で Chrome 起動
 */
export function getOpenInBrowserUrl(path = '/'): string {
  if (typeof window === 'undefined') return '';
  const url = `${window.location.origin}${path}`;
  if (isLineWebView()) {
    return addParam(url, 'openExternalBrowser', '1');
  }
  if (isAndroid()) {
    const fallback = encodeURIComponent(url);
    return `intent://${window.location.host}${path}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
  }
  return url;
}

/** LINEで共有するときのURL（openExternalBrowser=1 付き・相手がブラウザで開ける） */
export function getLineShareUrl(path = '/'): string {
  if (typeof window === 'undefined') return '';
  const url = `${window.location.origin}${path}`;
  return addParam(url, 'openExternalBrowser', '1');
}
