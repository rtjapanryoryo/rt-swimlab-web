import type { Metadata } from "next";
import "./globals.css";
import { SplashScreenProvider } from "@/components/SplashScreen";
import { SessionProvider } from "@/components/SessionProvider";
import { UserNav } from "@/components/UserNav";

export const metadata: Metadata = {
  title: "RT swim lab",
  description: "立石諒と高城直基が監修の指導哲学に基づく練習メニュー",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased font-sans">
        <SessionProvider>
          <div className="fixed top-0 right-0 z-50 p-4">
            <UserNav />
          </div>
          <div className="pr-40 pt-2">
            <SplashScreenProvider>{children}</SplashScreenProvider>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
