/**
 * RT GENE PROFILE - PDF バイナリをストリーム（モバイル PDF.js ビューア用・同一オリジンで CORS 回避）
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getEffectiveUser();
  if (!user) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 });
  }

  const supabase = user.isBypass
    ? getSupabaseServiceRole()
    : await createClient();
  if (!supabase) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const { data: profile, error: fetchError } = await supabase
    .from('gene_profiles')
    .select('file_path, display_name')
    .eq('id', id)
    .eq('user_id', user.id as string)
    .single();

  if (fetchError || !profile) {
    return NextResponse.json({ error: '見つかりません' }, { status: 404 });
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from('gene-profiles')
    .download(profile.file_path);

  if (downloadError || !blob) {
    console.error('[gene-profiles] download error:', downloadError);
    return NextResponse.json({ error: 'PDFの取得に失敗しました' }, { status: 500 });
  }

  const filename = (profile.display_name || 'gene-profile').replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\-]/g, '_') + '.pdf';
  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}
