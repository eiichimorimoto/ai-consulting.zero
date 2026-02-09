/**
 * 音声認識テキストのAI自動補正API
 *
 * POST /api/voice-correct
 * Body: { text: string }
 * 認証: Supabase セッション必須
 * 返却: { text: string } 補正後のテキスト
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const MAX_INPUT_LENGTH = 10000

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEYが設定されていません' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const raw = body?.text
    const text = typeof raw === 'string' ? raw.trim() : ''
    if (!text) {
      return NextResponse.json(
        { error: 'テキスト（text）を送信してください' },
        { status: 400 }
      )
    }
    if (text.length > MAX_INPUT_LENGTH) {
      return NextResponse.json(
        { error: `テキストは${MAX_INPUT_LENGTH}文字以内にしてください` },
        { status: 400 }
      )
    }

    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたは音声認識（STT）の誤りを補正する専門家です。ビジネス・コンサルティングの文脈を想定してください。

【必須】入力は音声認識の生テキストです。次の修正を必ず行い、修正後のテキストのみを返してください。説明・前置きは一切不要です。

1. 同音異義語の修正: 文脈から正しい漢語に直す（例: 売上/ウリ上、課題/火事、施策/四策、経営/形影）
2. 数字・単位: 「いちまん」→「1万」、「にひゃくまん」→「200万」、「パーセント」→「％」など、表記を統一
3. 専門用語: ビジネス用語（DX、KPI、人件費、マーケティング、リモート、進捗 等）の誤認識を正す
4. 句読点: 読みやすく適宜追加。話し言葉の「えー」「あのー」は削除してよい
5. 明らかな誤変換はすべて修正し、自然な日本語の文に整える`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    })

    const corrected =
      completion.choices[0]?.message?.content?.trim() ?? text
    return NextResponse.json({ text: corrected })
  } catch (err) {
    console.error('voice-correct error:', err)
    const message = err instanceof Error ? err.message : '補正に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
