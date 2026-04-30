import { NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';
import nodemailer from 'nodemailer';

const VALID_PLAN_TYPES = ['free', 'athlete', 'coach'] as const;
type PlanType = typeof VALID_PLAN_TYPES[number];

const PLAN_LABELS: Record<PlanType, string> = {
  free:    '無料カウンセリング（15分）',
  athlete: '選手プラン（30分 / ¥1,500）',
  coach:   'コーチプラン（60分 / ¥2,980〜）',
};

const ADMIN_EMAIL = '06ra.ra06@gmail.com';

async function sendNotificationEmail(params: {
  userName: string;
  userEmail: string;
  planType: PlanType;
  message: string | null;
  requestId: string;
}) {
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!appPassword) return;

  const { userName, userEmail, planType, message, requestId } = params;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: ADMIN_EMAIL,
      pass: appPassword,
    },
  });

  const body = `
━━━━━━━━━━━━━━━━━━━━━━━━━━
【RT swim lab】カウンセリング申し込みが届きました
━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 申し込み者
　名前：${userName}
　メール：${userEmail}

■ プラン
　${PLAN_LABELS[planType]}

■ 相談内容
　${message ?? '（記入なし）'}

■ 管理画面で確認
　https://rt-swimlab-web-tl3a.vercel.app/admin/counseling

━━━━━━━━━━━━━━━━━━━━━━━━━━
申し込みID：${requestId}
`.trim();

  await transporter.sendMail({
    from: `"RT swim lab" <${ADMIN_EMAIL}>`,
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
      preferred_datetime_1: preferred_datetime_1?.trim() || null,
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

  // ログイン済みユーザーなら誰でも予約済み枠一覧を取得できる（個人情報なし）
  if (searchParams.get('booked') === '1') {
    const { data, error } = await sb
      .from('counseling_requests')
      .select('preferred_datetime_1')
      .not('status', 'eq', 'cancelled')
      .not('preferred_datetime_1', 'is', null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      booked: data.map(r => r.preferred_datetime_1).filter(Boolean),
    });
  }

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
