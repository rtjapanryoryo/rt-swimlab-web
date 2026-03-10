/**
 * RT GENE PROFILE - PDF バイナリをストリーム（モバイル PDF.js ビューア用・同一オリジンで CORS 回避）
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';
import { safeContentDisposition } from '@/lib/content-disposition';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getEffectiveUser();
  if (!user) {
    return NextResponse.json({ error: 'login_required' }, { status: 401, headers: NO_CACHE });
  }

  const supabase = user.isBypass
    ? getSupabaseServiceRole()
    : await createClient();
  if (!supabase) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503, headers: NO_CACHE });
  }

  const { data: profile, error: fetchError } = await supabase
    .from('gene_profiles')
    .select('file_path, display_name')
    .eq('id', id)
    .eq('user_id', user.id as string)
    .single();

  if (fetchError || !profile) {
    console.error('[gene-profiles] profile fetch:', fetchError?.message ?? 'no profile', { id, userId: user.id });
    return NextResponse.json(
      { error: '見つかりません', _debug: process.env.NODE_ENV === 'development' ? fetchError?.message : undefined },
      { status: 404, headers: NO_CACHE }
    );
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from('gene-profiles')
    .download(profile.file_path);

  if (downloadError || !blob) {
    console.error('[gene-profiles] storage download error:', {
      message: downloadError?.message,
      file_path: profile.file_path,
      bucket: 'gene-profiles',
    });
    const devDetail = process.env.NODE_ENV === 'development' ? downloadError?.message : undefined;
    return NextResponse.json(
      { error: 'PDFの取得に失敗しました', _debug: devDetail },
      { status: 500, headers: NO_CACHE }
    );
  }

  const filename = (profile.display_name || 'gene-profile').replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\-.]/g, '_') + '.pdf';

  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': safeContentDisposition(filename, 'inline'),
      ...NO_CACHE,
    },
  });
}
