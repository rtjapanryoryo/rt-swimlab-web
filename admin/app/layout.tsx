import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RT Swim Lab 管理ポータル",
  description: "管理者専用ダッシュボード",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="h-full">
      <body className={`${geist.className} min-h-full bg-slate-900 text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
