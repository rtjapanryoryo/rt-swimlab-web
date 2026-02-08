import { NextResponse } from 'next/server';
import { getMenuTemplates9, getQuickSettings } from '@/lib/rt/content';
import { menuTemplates9Fallback } from '@/lib/rt/menu-templates-9-fallback';

/**
 * GET: クイック作成用テンプレ＋設定（menu-templates-9.json, quick-settings.json）を返す。認証不要。
 * ファイルが読めない場合は同梱フォールバックを使用する。
 */
export async function GET() {
  try {
    const [fromFile, settings] = await Promise.all([
      getMenuTemplates9(),
      getQuickSettings(),
    ]);
    const hasData =
      fromFile &&
      (fromFile.S?.length > 0 || fromFile.M?.length > 0 || fromFile.D?.length > 0);
    const templates = hasData
      ? fromFile!
      : { S: menuTemplates9Fallback.S, M: menuTemplates9Fallback.M, D: menuTemplates9Fallback.D };
    return NextResponse.json({ ...templates, settings });
  } catch {
    const defaultOrder = ['warmUp', 'drill', 'kick', 'pull', 'rest', 'preMain', 'dive', 'main', 'down'];
    return NextResponse.json({
      S: [...menuTemplates9Fallback.S],
      M: [...menuTemplates9Fallback.M],
      D: [...menuTemplates9Fallback.D],
      settings: { sectionOrder: defaultOrder },
    });
  }
}
