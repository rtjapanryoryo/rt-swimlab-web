import type { NextConfig } from "next";
import path from "path";
import { config } from "dotenv";

// 環境変数は .env.ai から読み込む（.env / .env.local の代わり）
config({ path: path.resolve(process.cwd(), ".env.ai") });

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
