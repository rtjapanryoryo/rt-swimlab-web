This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 環境変数（必須）

`.env.ai` に以下を設定してください。テンプレートは `.env.ai.example` を参照。

```bash
cp .env.ai.example .env.ai
# .env.ai を編集して GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET を設定
```

**注意**: `.env.ai` は Git に含まれません。作成後は安全な場所にバックアップしてください。

詳細は [docs/ENV_SETUP.md](docs/ENV_SETUP.md) を参照。

## LINEで共有する場合

LINEでURLを送ると、デフォルトではLINE内ブラウザで開き、PDF保存が制限される場合があります。**URLの末尾に `?openExternalBrowser=1` を付ける**と外部ブラウザで開き、PDF保存・印刷が確実に動作します。詳細は [docs/LINE_SHARING.md](docs/LINE_SHARING.md) を参照。

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### ターミナルを閉じても動かし続けたい場合（常時起動）

pm2 でバックグラウンド起動すると、ターミナルを閉じてもアプリが動き続けます。

```bash
npm install          # 初回のみ（pm2 が入る）
npm run dev:daemon   # 常時起動で開始
```

- 停止: `npm run dev:daemon:stop`
- ログ: `npm run dev:daemon:logs`
- PC 再起動後も自動で起動させたい場合は、初回だけ `pm2 startup` と `pm2 save` を実行してください。

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

test
