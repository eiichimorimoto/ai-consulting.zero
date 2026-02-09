/**
 * 音声テキスト化（STT）API - OpenAI Whisper
 *
 * POST /api/stt
 * Body: multipart/form-data, field "audio" = 音声ファイル（webm, mp3, wav 等）
 * 認証: Supabase セッション必須
 * 返却: { text: string }
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25MB (Whisper 上限)

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

    const formData = await request.formData()
    const audio = formData.get('audio')
    if (!audio || !(audio instanceof Blob) || audio.size === 0) {
      return NextResponse.json(
        { error: '音声ファイル（audio）を送信してください' },
        { status: 400 }
      )
    }

    if (audio.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: '音声ファイルは25MB以下にしてください' },
        { status: 400 }
      )
    }

    const openai = new OpenAI({ apiKey })
    const file = new File([audio], 'audio.webm', { type: audio.type || 'audio/webm' })

    // 日本語のビジネス・相談でよく出る語をヒントに渡し、認識精度を上げる（224トークン以内）
    const vocabularyPrompt = [
      '売上 コスト 課題 施策 経営 分析 改善 業務 効率化 デジタル DX 会議 報告 予算',
      '万円 円 ％ パーセント 人件費 在庫 顧客 マーケティング 採用 人事',
      '組織 リモート テレワーク 評価 目標 KPI 進捗 レポート 提案 検討',
      '現状 問題 原因 対策 計画 実行 フォロー 確認 承認 決裁',
    ].join('。')

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'ja',
      response_format: 'text',
      prompt: vocabularyPrompt,
    })

    const text = (typeof transcription === 'string' ? transcription : '').trim()
    return NextResponse.json({ text })
  } catch (err) {
    console.error('STT error:', err)
    const message = err instanceof Error ? err.message : '音声の認識に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
