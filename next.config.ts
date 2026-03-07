import type { NextConfig } from "next";
import path from "path";
import { config } from "dotenv";

// .env.ai から読み込む（Vercel本番ではダッシュボードで設定）
config({
  path: path.resolve(process.cwd(), ".env.ai"),
  override: true, // 既存値を上書きして確実に反映
});

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: { bodySizeLimit: '100mb' },
  },
};

export default nextConfig;
