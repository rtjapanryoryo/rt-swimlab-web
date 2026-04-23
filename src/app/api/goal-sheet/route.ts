import { NextResponse } from 'next/server';
import { createClient, getEffectiveUser } from '@/lib/supabase/server';
import type { GoalSheetLevel, BeginnerContent, IntermediateContent, AdvancedContent } from '@/types/goal-sheet';

const VALID_LEVELS: GoalSheetLevel[] = ['beginner', 'intermediate', 'advanced'];

// GET /api/goal-sheet?level=beginner
export async function GET(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const level = searchParams.get('level') as GoalSheetLevel | null;
  if (!level || !VALID_LEVELS.includes(level)) {
    return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
  }

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const { data, error } = await sb
    .from('goal_sheets')
    .select('*')
    .eq('user_id', user.id)
    .eq('level', level)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sheet: data });
}

// PUT /api/goal-sheet — upsert + AIフィードバック生成
export async function PUT(req: Request) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const body = await req.json() as { level: GoalSheetLevel; content: Record<string, unknown> };
  const { level, content } = body;

  if (!level || !VALID_LEVELS.includes(level)) {
    return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
  }

  const ai_feedback = generateFeedback(level, content);

  const { data, error } = await sb
    .from('goal_sheets')
    .upsert(
      { user_id: user.id, level, content, ai_feedback },
      { onConflict: 'user_id,level' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sheet: data });
}

// ── AIフィードバック生成（ルールベース） ─────────────────────
function generateFeedback(level: GoalSheetLevel, c: Record<string, unknown>): string {
  const str = (v: unknown) => String(v ?? '').trim();
  const filled = (v: unknown) => str(v).length > 2;

  if (level === 'beginner') {
    const bc = c as Partial<BeginnerContent>;
    if (!filled(bc.vision_how) && !filled(bc.vision_deadline)) {
      return '①の夢・ビジョンのセクションから始めましょう。大きな夢でも小さくても大丈夫です。まず「なりたい姿」を書いてみてください。';
    }
    if (!filled(bc.current_best_time)) {
      return `素晴らしいビジョンです！次は②の「今のベストタイム」を記入しましょう。現在地を知ることが成長の第一歩です。`;
    }
    if (!filled(bc.goal_this_week)) {
      return '夢と現在地が揃いました。③の「今週の目標」を具体的に書くことで、明日からの練習が変わります。';
    }
    return `目標シートが揃っています。④の振り返りを毎日続けることが、一番の近道です。「今日できたこと」を積み重ねていきましょう。`;
  }

  if (level === 'intermediate') {
    const ic = c as Partial<IntermediateContent>;
    const best = str(ic.current_best_time);
    const target = str(ic.vision_target_time);
    const event = str(ic.vision_event || ic.current_event);
    if (filled(best) && filled(target)) {
      return `${event ? event + ' ' : ''}現ベスト ${best} → 目標 ${target}。具体的な数値目標が決まりました。③のシーズン目標から逆算して、今月・今週に落とし込んでいきましょう。後半スタミナに課題があるなら、コンディショニングを週2回以上に設定することを推奨します。`;
    }
    if (filled(best)) {
      return `現ベスト ${best} を記録しました。①の「何秒出すか」を具体的に記入することで、逆算プランが立てられます。`;
    }
    return '②のセクションにベストタイムとレース分析を記入しましょう。数字で自分を知ることが中級の核心です。';
  }

  if (level === 'advanced') {
    const ac = c as Partial<AdvancedContent>;
    const diffFirst = str(ac.diff_first);
    const diffSecond = str(ac.diff_second);
    const pattern = str(ac.vision_pattern);
    if (filled(diffFirst) && filled(diffSecond)) {
      return `ライバル分析が完成しています。前半差 ${diffFirst}、後半差 ${diffSecond}。${pattern ? `あなたの必勝パターン「${pattern}」に沿った` : ''}レースプランを③に落とし込み、毎日⑥の10点評価で体調トレンドを把握しましょう。`;
    }
    if (filled(ac.vision_time)) {
      return `目標タイム ${str(ac.vision_time)} に向けた戦略シートが動き出しました。②のライバル分析に具体的なタイムを入力することで、差を埋めるポイントが明確になります。`;
    }
    return '①のターゲット大会・目標順位・目標タイムを記入することから始めましょう。上級は「勝つための逆算」が設計の核心です。';
  }

  return 'シートの記入ができました。続けていきましょう。';
}
