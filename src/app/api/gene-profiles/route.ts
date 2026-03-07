/**
 * RT GENE PROFILE - PDF 一覧取得・アップロード
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';

export async function GET() {
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

  const { data, error } = await supabase
    .from('gene_profiles')
    .select('id, display_name, file_path, created_at')
    .eq('user_id', user.id as string)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[gene-profiles] list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profiles: data ?? [] });
}

export async function POST(request: NextRequest) {
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

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const displayName = (formData.get('display_name') as string) || 'RT GENE PROFILE';

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'ファイルを選択してください' }, { status: 400 });
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'PDF ファイルのみアップロードできます' }, { status: 400 });
  }

  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'ファイルサイズは 100MB までです' }, { status: 400 });
  }

  const ext = file.name.toLowerCase().endsWith('.pdf') ? '' : '.pdf';
  const fileId = crypto.randomUUID();
  const filePath = `${user.id}/${fileId}${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('gene-profiles')
    .upload(filePath, arrayBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    console.error('[gene-profiles] upload error:', uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from('gene_profiles')
    .insert({
      user_id: user.id,
      file_path: filePath,
      display_name: displayName,
    })
    .select('id, display_name, file_path, created_at')
    .single();

  if (insertError) {
    await supabase.storage.from('gene-profiles').remove([filePath]);
    console.error('[gene-profiles] insert error:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ profile: inserted });
}
