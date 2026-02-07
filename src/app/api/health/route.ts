import { NextResponse } from 'next/server';

/**
 * サーバー側の env のみで OpenAI 設定状態を返す。
 * 認証不要。APIキーは返さず、設定有無のみ。
 */
export async function GET() {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  const openaiConfigured = key.length > 0 && key !== 'YOUR_API_KEY_HERE';
  const openaiReason: 'missing' | 'placeholder' | undefined = openaiConfigured
    ? undefined
    : key === 'YOUR_API_KEY_HERE'
      ? 'placeholder'
      : 'missing';

  // 原因特定用ログ（キー本文は出さない）
  console.log('[health] OPENAI_API_KEY exists:', !!key);
  console.log('[health] OPENAI_API_KEY head:', key ? key.slice(0, 7) + '...' : '(empty)');

  return NextResponse.json({
    openaiConfigured,
    openaiReason,
  });
}
