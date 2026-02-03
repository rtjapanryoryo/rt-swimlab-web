import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAllContent } from '@/lib/rt/content';

/**
 * GET: 共通コンテンツ（AI・ローカル両方）とローカル専用コンテンツを返す。
 * ログイン済みユーザーのみ。ローカル生成時にクライアントから利用。
 */
export async function GET(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token) {
    return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
  }

  try {
    const { common, local } = await getAllContent();
    return NextResponse.json({ common, local });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'コンテンツの取得に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
