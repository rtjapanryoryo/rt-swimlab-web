import { NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';
import type { FeedbackCategory } from '@/types/feedback';

const VALID_CATEGORIES: FeedbackCategory[] = ['bug', 'feature', 'ux', 'content', 'other'];

// POST /api/feedback — ユーザーがフィードバックを送信
export async function POST(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const body = await req.json() as {
    category: FeedbackCategory;
    message:  string;
    rating?:  number | null;
  };

  const { category, message, rating } = body;

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }
  if (!message?.trim() || message.trim().length > 2000) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }
  if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('feedbacks')
    .insert({
      user_id:  user.id,
      category,
      message:  message.trim(),
      rating:   rating ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ feedback: data }, { status: 201 });
}
