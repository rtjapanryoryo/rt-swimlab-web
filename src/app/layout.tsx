import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SplashScreenProvider } from "@/components/SplashScreen";
import { AuthProvider } from "@/components/AuthProvider";
import { UserNav } from "@/components/UserNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "RT swim lab",
  description: "立石諒と高城直基が監修の指導哲学に基づく練習メニュー",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased font-sans flex flex-col min-h-screen">
        <AuthProvider>
          <div className="fixed top-0 right-0 z-50 p-4 md:p-5 no-print">
            <nav className="flex items-center gap-4 px-4 py-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-sm">
              <UserNav />
            </nav>
          </div>
          <div className="flex-1 w-full min-w-0 pt-2 pr-3 sm:pr-20 md:pr-40">
            <SplashScreenProvider>{children}</SplashScreenProvider>
          </div>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
