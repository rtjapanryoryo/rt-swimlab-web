import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { getAllContent } from '@/lib/rt/content';

/**
 * GET: 共通コンテンツ・ローカル専用コンテンツ・クイック専用アルゴリズムを返す。
 * ログイン済みユーザーのみ。クイック作成時にクライアントから利用。
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
  }

  try {
    const { common, local, quickAlgorithm, menuTemplates9 } = await getAllContent();
    return NextResponse.json({ common, local, quickAlgorithm, menuTemplates9 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'コンテンツの取得に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
