import type { NextConfig } from "next";
import path from "path";
import { config } from "dotenv";

// ローカル開発時は .env.ai から読み込む（Vercel本番環境では不要）
// Vercel では環境変数をダッシュボードから直接設定する
if (process.env.NODE_ENV !== "production") {
  config({ path: path.resolve(process.cwd(), ".env.ai") });
}

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
