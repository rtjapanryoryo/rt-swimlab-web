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
  webpack: (config) => {
    // pdfjs-dist / pdfpressor-client が canvas を参照するが、ブラウザでは不要
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: path.resolve(__dirname, 'src/lib/canvas-stub.js'),
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
