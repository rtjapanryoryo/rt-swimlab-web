/**
 * YouTube の URL または生の動画 ID から埋め込み用 video ID を抽出する。
 * 不正な場合は null。
 */
export function extractYouTubeVideoId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  const short = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?|&|#|$)/)
    ?? s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})$/);
  if (short) return short[1];

  try {
    const href = s.includes('://') ? s : `https://${s}`;
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const v = u.searchParams.get('v');
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const shorts = u.pathname.match(/\/shorts\/([\w-]{11})/);
      if (shorts) return shorts[1];
      const embed = u.pathname.match(/\/embed\/([\w-]{11})/);
      if (embed) return embed[1];
    }
  } catch {
    /* ignore */
  }

  if (/^[\w-]{11}$/.test(s)) return s;
  return null;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
}
