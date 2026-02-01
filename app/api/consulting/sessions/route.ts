/**
 * Consulting Sessions API
 * 
 * 相談セッションの一覧取得・新規作成（添付ファイル対応）
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/lib/storage/upload'
import { extractText, isSupportedTextFile } from '@/lib/file-processing/text-extractor'

/**
 * GET /api/consulting/sessions
 * 
 * ユーザーの相談セッション一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // セッション一覧取得
    const { data: sessions, error: sessionsError } = await supabase
      .from('consulting_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (sessionsError) {
      console.error('Sessions fetch error:', sessionsError)
      return NextResponse.json(
        { error: sessionsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      sessions: sessions || [],
      count: sessions?.length || 0
    })

  } catch (error) {
    console.error('GET /api/consulting/sessions error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/consulting/sessions
 * 
 * 新規相談セッション作成（添付ファイル対応）
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // FormData取得（添付ファイル対応）
    const formData = await request.formData()
    const category = formData.get('category') as string
    const initialMessage = formData.get('initial_message') as string
    const title = formData.get('title') as string | null

    // バリデーション
    if (!initialMessage || initialMessage.trim().length === 0) {
      return NextResponse.json(
        { error: 'initial_message is required' },
        { status: 400 }
      )
    }

    // 添付ファイル取得
    const files: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File) {
        files.push(value)
      }
    }

    // ユーザープロフィール取得（company_id取得のため）
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    // セッション作成
    const { data: session, error: sessionError } = await supabase
      .from('consulting_sessions')
      .insert({
        user_id: user.id,
        company_id: profile?.company_id || null,
        title: title || (initialMessage ? initialMessage.slice(0, 50) + '...' : '新規相談'),
        category: category || 'general',
        status: 'active',
        max_rounds: 5,
        current_round: 0
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Session creation error:', sessionError)
      return NextResponse.json(
        { error: sessionError.message },
        { status: 500 }
      )
    }

    // 添付ファイル処理
    let attachments: any[] = []
    
    if (files.length > 0) {
      try {
        attachments = await Promise.all(
          files.map(async (file) => {
            // ファイルサイズ検証
            if (file.size > 10 * 1024 * 1024) {
              throw new Error(`File ${file.name} exceeds 10MB limit`)
            }
            
            // ファイルタイプ検証
            if (!isSupportedTextFile(file)) {
              throw new Error(`File ${file.name} is not supported. Allowed: .txt, .csv, .md, .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx`)
            }
            
            // Supabase Storageにアップロード
            const uploadResult = await uploadFile(file, user.id, session.id)
            
            // テキスト抽出（テキストファイルのみ）
            const textTypes = ['text/plain', 'text/csv', 'application/csv', 'text/markdown']
            let extraction = null
            
            if (textTypes.includes(file.type)) {
              extraction = await extractText(file)
            }
            
            return {
              id: crypto.randomUUID(),
              name: file.name,
              type: file.type,
              size: file.size,
              url: uploadResult.url,
              path: uploadResult.path,
              content: extraction?.content || null,
              preview: extraction?.preview || `${file.name} (${(file.size / 1024).toFixed(1)}KB)`,
              wordCount: extraction?.wordCount || 0,
              lineCount: extraction?.lineCount || 0,
            }
          })
        )
      } catch (error) {
        // ファイル処理エラーの場合、セッションは作成済みだが添付ファイルはなし
        console.error('File processing error:', error)
        return NextResponse.json(
          { 
            error: error instanceof Error ? error.message : 'File processing failed',
            session,
            attachments: []
          },
          { status: 400 }
        )
      }
    }

    // 初期メッセージ作成（添付ファイル情報を含む）
    const { error: messageError } = await supabase
      .from('consulting_messages')
      .insert({
        session_id: session.id,
        role: 'user',
        content: initialMessage,
        attachments: attachments.length > 0 ? attachments : null,
        message_order: 1
      })
    
    if (messageError) {
      console.error('Message creation error:', messageError)
      // メッセージ作成失敗だが、セッションは作成済み
      return NextResponse.json(
        { 
          error: 'Failed to save initial message',
          session,
          attachments
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      session,
      attachments,
      message: 'Session created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('POST /api/consulting/sessions error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    )
  }
}
