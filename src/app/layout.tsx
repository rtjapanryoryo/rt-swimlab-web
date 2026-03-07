import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SplashScreenProvider } from "@/components/SplashScreen";
import { AuthProvider } from "@/components/AuthProvider";
import { MainContent } from "@/components/MainContent";
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
          <MainContent>
            <SplashScreenProvider>{children}</SplashScreenProvider>
          </MainContent>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
