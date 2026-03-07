'use server';

import { createClient, getEffectiveUser } from '@/lib/supabase/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';

const MAX_SIZE = 100 * 1024 * 1024; // 100MB

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

  const file = formData.get('file') as File | null;
  const displayName = (formData.get('display_name') as string) || 'RT GENE PROFILE';

  if (!file || file.size === 0) {
    return { error: 'ファイルを選択してください' };
  }

  if (file.type !== 'application/pdf') {
    return { error: 'PDF ファイルのみアップロードできます' };
  }

  if (file.size > MAX_SIZE) {
    return { error: 'ファイルサイズは 100MB までです' };
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
