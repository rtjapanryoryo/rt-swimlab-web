'use client';

const LINE_URL = process.env.NEXT_PUBLIC_LINE_URL || '';
const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL || '';

type Variant = 'inline' | 'buttons' | 'compact';

export function ExternalLinks({ variant = 'inline' }: { variant?: Variant }) {
  if (!LINE_URL && !COMMUNITY_URL) return null;

  if (variant === 'buttons') {
    return (
      <div className="flex flex-wrap gap-3">
        {LINE_URL && (
          <a
            href={LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#06C755] text-white text-sm font-medium rounded-xl hover:bg-[#05b34a] transition-colors"
          >
            RT公式LINE
          </a>
        )}
        {COMMUNITY_URL && (
          <a
            href={COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            コミュニティ
            <span className="text-slate-400">→</span>
          </a>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        {LINE_URL && (
          <a
            href={LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-blue-700 font-medium transition-colors"
          >
            RT公式LINE
          </a>
        )}
        {COMMUNITY_URL && (
          <a
            href={COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-blue-700 transition-colors"
          >
            コミュニティ
          </a>
        )}
      </div>
    );
  }

  // inline (default)
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
      {LINE_URL && (
        <a
          href={LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-600 transition-colors"
        >
          RT公式LINE
        </a>
      )}
      {COMMUNITY_URL && (
        <a
          href={COMMUNITY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-700 transition-colors"
        >
          コミュニティ
        </a>
      )}
    </div>
  );
}
