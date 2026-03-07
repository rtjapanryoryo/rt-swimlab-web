/**
 * RT GENE PROFILE - 単体取得・署名付きURL・削除
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
    .select('id, display_name, file_path, created_at')
    .eq('id', id)
    .eq('user_id', user.id as string)
    .single();

  if (fetchError || !profile) {
    return NextResponse.json({ error: '見つかりません' }, { status: 404 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from('gene-profiles')
    .createSignedUrl(profile.file_path, 3600); // 1時間

  if (signError || !signed?.signedUrl) {
    console.error('[gene-profiles] signed url error:', signError);
    return NextResponse.json({ error: 'URLの取得に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({
    profile: { ...profile, signed_url: signed.signedUrl },
  });
}

export async function DELETE(
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
    .select('file_path')
    .eq('id', id)
    .eq('user_id', user.id as string)
    .single();

  if (fetchError || !profile) {
    return NextResponse.json({ error: '見つかりません' }, { status: 404 });
  }

  await supabase.storage.from('gene-profiles').remove([profile.file_path]);
  const { error: deleteError } = await supabase
    .from('gene_profiles')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id as string);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
