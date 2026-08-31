import type { NextConfig } from "next";
import path from "path";
import { config } from "dotenv";

// Vercelでは管理画面の環境変数を使い、ローカル用の.env.aiで上書きしません。
if (!process.env.VERCEL) {
  config({
    path: path.resolve(process.cwd(), ".env.ai"),
    override: false,
  });
}

const securityHeaders = [
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: { bodySizeLimit: '100mb' },
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
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
