'use server';

import { createClient, getEffectiveUser } from '@/lib/supabase/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';

const MAX_SIZE = 20 * 1024 * 1024; // 20MB（圧縮前の上限。圧縮後は10MB以下を想定）

export type UploadResult = { profile?: { id: string; display_name: string; created_at: string }; error?: string };

export async function uploadGeneProfile(formData: FormData): Promise<UploadResult> {
  const user = await getEffectiveUser();
  if (!user) {
    return { error: 'login_required' };
  }

  const supabase = user.isBypass
    ? getSupabaseServiceRole()
    : await createClient();
  if (!supabase) {
    return { error: 'not_configured' };
  }

  const { count } = await supabase
    .from('gene_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if ((count ?? 0) >= 1) {
    return { error: '格納できるPDFは1件までです。新しいPDFを追加するには、既存のものを削除してください。' };
  }

  const file = formData.get('file') as File | null;
  const displayName = (formData.get('display_name') as string) || 'RT GENE PROFILE';

  if (!file || file.size === 0) {
    return { error: 'ファイルを選択してください' };
  }

  if (file.type !== 'application/pdf') {
    return { error: 'PDF ファイルのみアップロードできます' };
  }

  if (file.size > MAX_SIZE) {
    return { error: 'ファイルサイズは 20MB までです（自動圧縮で10MB以下になります）' };
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
    return { error: uploadError.message };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('gene_profiles')
    .insert({
      user_id: user.id,
      file_path: filePath,
      display_name: displayName,
    })
    .select('id, display_name, created_at')
    .single();

  if (insertError) {
    await supabase.storage.from('gene-profiles').remove([filePath]);
    console.error('[gene-profiles] insert error:', insertError);
    return { error: insertError.message };
  }

  return { profile: inserted };
}
