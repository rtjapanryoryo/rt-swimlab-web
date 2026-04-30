import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ドリル練習 | RT swim lab',
  description:
    'フォーム改善のためのドリル練習動画と要点をストローク別に確認できます。自由形・背泳ぎ・平泳ぎ・バタフライ対応。',
  openGraph: {
    title: 'ドリル練習 | RT swim lab',
    description:
      'フォーム改善のためのドリル練習動画と要点をストローク別に確認できます。',
    type: 'website',
    locale: 'ja_JP',
  },
  robots: { index: false, follow: false },
};

export default function DrillPracticeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'ドリル練習',
            description:
              'RT swim lab のドリル練習ページ。ストローク別に動画と要点で泳法フォームを改善できます。',
            inLanguage: 'ja',
          }),
        }}
      />
      {children}
    </>
  );
}
