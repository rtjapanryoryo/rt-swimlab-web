import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SplashScreenProvider } from "@/components/SplashScreen";
import { AuthProvider } from "@/components/AuthProvider";
import { UserNav } from "@/components/UserNav";

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
      <body className="antialiased font-sans">
        <AuthProvider>
          <div className="fixed top-0 right-0 z-50 p-4 no-print">
            <UserNav />
          </div>
          <div className="w-full min-w-0 pt-2 pr-3 sm:pr-20 md:pr-40">
            <SplashScreenProvider>{children}</SplashScreenProvider>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
