import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      name,
      name_kana,
      industry,
      employee_count,
      annual_revenue,
      website,
      email,
      phone,
      fax,
      postal_code,
      prefecture,
      city,
      address,
      established_date,
      representative_name,
      business_description,
      retrieved_info,
    } = body

    // 必須フィールドのチェック
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: "会社名は必須です" },
        { status: 400 }
      )
    }

    // Service Roleクライアントを使用してINSERT（RLSをバイパス）
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEYが設定されていません')
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      )
    }

    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 挿入データの準備
    const insertData: any = {
      name: name.trim(),
      name_kana: name_kana?.trim() || null,
      industry: industry?.trim() || null,
      employee_count: employee_count || null,
      annual_revenue: annual_revenue || null,
      website: website?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      fax: fax?.trim() || null,
      postal_code: postal_code?.trim() || null,
      prefecture: prefecture?.trim() || null,
      city: city?.trim() || null,
      address: address?.trim() || null,
      established_date: established_date || null,
      representative_name: representative_name?.trim() || null,
      business_description: business_description?.trim() || null,
    }

    // retrieved_infoが存在する場合のみ追加
    if (retrieved_info) {
      try {
        insertData.retrieved_info = typeof retrieved_info === 'string' 
          ? JSON.parse(retrieved_info) 
          : retrieved_info
      } catch (parseError) {
        console.warn('retrieved_infoのパースに失敗しました:', parseError)
      }
    }

    console.log('📝 会社情報を挿入します:', { name: insertData.name, userId: user.id })

    const { data: newCompany, error: companyError } = await supabaseService
      .from('companies')
      .insert(insertData)
      .select()
      .single()

    if (companyError) {
      console.error('❌ Company insert error:', {
        message: companyError.message,
        code: companyError.code,
        details: companyError.details,
        hint: companyError.hint,
        fullError: JSON.stringify(companyError, Object.getOwnPropertyNames(companyError), 2)
      })
      return NextResponse.json(
        {
          error: "会社情報の作成に失敗しました",
          details: companyError.message || companyError.code || '不明なエラー',
          hint: companyError.hint,
        },
        { status: 500 }
      )
    }

    if (!newCompany || !newCompany.id) {
      return NextResponse.json(
        { error: "会社情報の作成に失敗しました（IDが取得できませんでした）" },
        { status: 500 }
      )
    }

    console.log('✅ 会社作成完了:', newCompany.id)

    return NextResponse.json({ 
      data: newCompany,
      message: "会社情報を作成しました"
    })

  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      {
        error: "サーバーエラーが発生しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

