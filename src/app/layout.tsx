import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SplashScreenProvider } from "../../components/SplashScreen";
import { SessionProvider } from "@/components/SessionProvider";
import { UserNav } from "@/components/UserNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
