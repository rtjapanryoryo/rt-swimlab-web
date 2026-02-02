import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `あなたはRT-japanの競泳専門AIコーチです。
立石諒と渡部コーチ監修の指導哲学に基づき、以下の原則で水泳練習メニューを生成してください。

【絶対原則】
- 目的 → 強度 → 理由の順で考える
- 量より質。フォームを崩して強くしない
- 安全第一（年齢・性別・疲労を最優先）
- 構造: W-up → Drill → Kick → Pull → Pre-Main → Dive → Rest（必要時）→ Main → Down

【強度目安】A1:22-24 / A2:24-26 / EN1:26-27 / EN2:28前後 / EN3:29-30
【年齢補正】小学生+2-3 / 中学生+1-2 / 高校・大学基準 / 成人-2-3`;

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY が設定されていません。.env.local に本物のAPIキーを設定してください。' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      period,
      stroke,
      gender,
      age,
      distanceType,
      level,
      purpose,
      condition,
      practiceTime,
      volumeUp,
    } = body as Record<string, string>;

    const userPrompt = `以下の条件で水泳練習メニューを生成してください。テキストのみで、見出しやブロックごとに改行して出力してください。

1. 期: ${period}
2. 種目: ${stroke}
3. 性別: ${gender}
4. 年齢: ${age}
5. 距離タイプ: ${distanceType}
6. レベル: ${level}
7. 目的: ${purpose}
8. 状況: ${condition}
9. 練習時間: ${practiceTime}分
10. ボリュームUP: ${volumeUp}`;

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: 'メニューの生成に失敗しました。' },
        { status: 500 }
      );
    }

    return NextResponse.json({ menu: content });
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー';
    const isAuthError =
      String(message).includes('API key') ||
      String(message).includes('401') ||
      String(message).includes('Incorrect API key');
    const isQuotaError =
      String(message).includes('429') ||
      String(message).includes('quota') ||
      String(message).includes('billing');
    let errorText: string;
    if (isAuthError) {
      errorText = 'APIキーが無効です。.env.local の OPENAI_API_KEY を確認してください。';
    } else if (isQuotaError) {
      errorText =
        'OpenAIの利用枠を超えました。Billingで支払い方法を追加するか、「ローカルで生成」ボタンをご利用ください。';
    } else {
      errorText = `メニュー生成エラー: ${message}`;
    }
    return NextResponse.json({ error: errorText }, { status: 500 });
  }
}
