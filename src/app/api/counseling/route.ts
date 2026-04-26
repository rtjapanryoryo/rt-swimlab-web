import { NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';
import { Resend } from 'resend';

const VALID_PLAN_TYPES = ['free', 'athlete', 'coach'] as const;
type PlanType = typeof VALID_PLAN_TYPES[number];

const PLAN_LABELS: Record<PlanType, string> = {
  free:    '無料カウンセリング（20分）',
  athlete: '選手プラン（30分 / ¥1,500）',
  coach:   'コーチプラン（60分 / ¥2,980〜）',
};

const ADMIN_EMAIL = '06ra.ra06@gmail.com';

async function sendNotificationEmail(params: {
  userName: string;
  userEmail: string;
  planType: PlanType;
  dt1: string;
  dt2: string | null;
  dt3: string | null;
  message: string | null;
  requestId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // 未設定時はスキップ（ログのみ）

  const resend = new Resend(apiKey);
  const { userName, userEmail, planType, dt1, dt2, dt3, message, requestId } = params;

  const body = `
━━━━━━━━━━━━━━━━━━━━━━━━━━
【RT swim lab】カウンセリング申し込みが届きました
━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 申し込み者
　名前：${userName}
　メール：${userEmail}

■ プラン
　${PLAN_LABELS[planType]}

■ 希望日時
　第1希望：${dt1}
${dt2 ? `　第2希望：${dt2}\n` : ''}${dt3 ? `　第3希望：${dt3}\n` : ''}
■ 相談内容
　${message ?? '（記入なし）'}

■ 管理画面で確認
　https://rt-swimlab-web-tl3a.vercel.app/admin/counseling

━━━━━━━━━━━━━━━━━━━━━━━━━━
申し込みID：${requestId}
`.trim();

  await resend.emails.send({
    from: 'RT swim lab <onboarding@resend.dev>',
    to: ADMIN_EMAIL,
    subject: `【申し込み】${PLAN_LABELS[planType]} — ${userName}様`,
    text: body,
  });
}

export async function POST(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const body = await req.json() as {
    plan_type: PlanType;
    preferred_datetime_1: string;
    preferred_datetime_2?: string;
    preferred_datetime_3?: string;
    message?: string;
  };

  const { plan_type, preferred_datetime_1, preferred_datetime_2, preferred_datetime_3, message } = body;

  if (!plan_type || !VALID_PLAN_TYPES.includes(plan_type)) {
    return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
  }
  if (!preferred_datetime_1?.trim()) {
    return NextResponse.json({ error: '第1希望日時は必須です' }, { status: 400 });
  }

  // 無料カウンセリングは1アカウント1回まで
  if (plan_type === 'free') {
    const { count } = await sb
      .from('counseling_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('plan_type', 'free');

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: '無料カウンセリングは1アカウント1回までです。選手プランをご利用ください。' },
        { status: 409 }
      );
    }
  }

  // プロフィール取得（氏名・メール）
  const { data: profile } = await sb
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const userName  = profile?.display_name ?? '（名前未設定）';
  const userEmail = user.email ?? '（メール不明）';

  // DB保存
  const { data, error } = await sb
    .from('counseling_requests')
    .insert({
      user_id: user.id,
      plan_type,
      preferred_datetime_1: preferred_datetime_1.trim(),
      preferred_datetime_2: preferred_datetime_2?.trim() || null,
      preferred_datetime_3: preferred_datetime_3?.trim() || null,
      message: message?.trim() || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // メール通知（失敗してもレスポンスには影響させない）
  sendNotificationEmail({
    userName,
    userEmail,
    planType: plan_type,
    dt1: preferred_datetime_1.trim(),
    dt2: preferred_datetime_2?.trim() || null,
    dt3: preferred_datetime_3?.trim() || null,
    message: message?.trim() || null,
    requestId: data.id,
  }).catch(err => console.error('[counseling] email send failed:', err));

  return NextResponse.json({ request: data }, { status: 201 });
}

export async function GET(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const isAdmin = searchParams.get('admin') === '1';

  if (isAdmin) {
    const { data: profile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await sb
      .from('counseling_requests')
      .select('*, profiles(display_name)')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ requests: data });
  }

  const { data, error } = await sb
    .from('counseling_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data });
}

export async function PATCH(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as { id: string; status: string; admin_note?: string };
  const { id, status, admin_note } = body;

  const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!id || !status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('counseling_requests')
    .update({ status, admin_note: admin_note ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ request: data });
}
