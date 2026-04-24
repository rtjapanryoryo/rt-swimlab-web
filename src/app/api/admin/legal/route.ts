import { NextResponse } from 'next/server';
import { getEffectiveUser, createClient } from '@/lib/supabase/server';
import { getSupabaseServiceRole } from '@/lib/supabase/admin';

async function getAdminSb() {
  const user = await getEffectiveUser();
  if (!user) return null;
  const authSb = user.isBypass ? getSupabaseServiceRole() : await createClient();
  if (!authSb) return null;
  const { data: me } = await authSb.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') return null;
  return getSupabaseServiceRole() ?? authSb;
}

export async function GET(req: Request) {
  const sb = await getAdminSb();
  if (!sb) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  if (!type || !['terms', 'privacy'].includes(type)) {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }

  const { data, error } = await sb.from('legal_documents').select('*').eq('id', type).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ doc: data });
}

export async function PUT(req: Request) {
  const sb = await getAdminSb();
  if (!sb) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const { type, doc_title, intro, sections, footer } = body;
  if (!type || !['terms', 'privacy'].includes(type)) {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }

  const { error } = await sb.from('legal_documents').upsert({
    id: type,
    doc_title,
    intro,
    sections,
    footer,
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
