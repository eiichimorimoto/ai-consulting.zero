"use client"

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Camera, Upload, CheckCircle, Loader2, Home, Building2, User } from 'lucide-react'
import Link from 'next/link'

interface OCRResult {
  personName?: string
  personNameKana?: string
  position?: string
  department?: string
  companyName?: string
  email?: string
  phone?: string
  mobile?: string
  postalCode?: string
  address?: string
  website?: string
}

export default function CompleteProfilePage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: 名刺OCR, 2: プロフィール入力, 3: 会社情報入力
  const [scanStep, setScanStep] = useState(1) // 1: アップロード, 2: 処理中, 3: 結果確認
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // ステップ状態の変更をログに記録
  React.useEffect(() => {
    console.log('📊 ステップ状態が変更されました:', { step, scanStep, hasOcrResult: !!ocrResult, isProcessing })
  }, [step, scanStep, ocrResult, isProcessing])
  
  const [profileData, setProfileData] = useState({
    name: '',
    nameKana: '',
    position: '',
    department: '',
    phone: '',
    mobile: '',
  })
  
  const [companyData, setCompanyData] = useState({
    name: '',
    nameKana: '',
    industry: '',
    employeeCount: '',
    annualRevenue: '',
    website: '',
    postalCode: '',
    prefecture: '',
    city: '',
    address: '',
    building: '',
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  
  const industries = [
    '情報通信業', '製造業', '卸売業・小売業', 'サービス業', '建設業',
    '不動産業', '金融業・保険業', '運輸業・郵便業', '医療・福祉', '教育・学習支援業', 'その他'
  ]
  
  const positions = [
    '代表取締役', '取締役', '執行役員', '部長', '次長', '課長', '係長', '主任', '一般社員', 'その他'
  ]
  
  const departments = [
    '営業部', 'マーケティング部', '開発部', '技術部', '人事部', '経理部', '総務部', '企画部', 'その他'
  ]
  
  const employeeRanges = [
    '1-9名', '10-29名', '30-49名', '50-99名', '100-299名', '300-499名', '500-999名', '1000名以上'
  ]
  
  const revenueRanges = [
    '1億円未満', '1-5億円', '5-10億円', '10-50億円', '50-100億円', '100-500億円', '500億円以上'
  ]

  useEffect(() => {
    // 認証状態とプロフィール登録状況を確認（初回のみ実行）
    let isMounted = true
    
    const checkAuthAndProfile = async () => {
      const supabase = createClient()
      if (!supabase) {
        console.warn('⚠️ Supabase client not available')
        return
      }
      
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.log('❌ 認証されていません:', userError?.message)
          if (isMounted) {
            router.push('/auth/login')
          }
          return
        }
        
        console.log('✅ 認証確認完了:', user.id)
        
        // プロフィールが既に登録されているか確認（エラーを無視）
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('name, company_id')
          .eq('user_id', user.id)
          .maybeSingle() // single()の代わりにmaybeSingle()を使用（存在しない場合エラーにならない）
        
        if (profileError) {
          // プロファイルが存在しない場合はエラーを無視（新規登録プロセス中）
          console.log('📝 プロファイル確認:', profileError.code === 'PGRST116' ? 'プロファイル未作成（正常）' : profileError.message)
        }
        
        // プロフィールと会社情報が既に登録されている場合のみダッシュボードへ
        if (profile && profile.name && profile.name !== 'User' && profile.company_id) {
          console.log('✅ プロファイル登録済み、ダッシュボードへリダイレクト')
          if (isMounted) {
            router.push('/dashboard')
          }
        } else {
          console.log('📝 プロファイル登録が必要:', {
            hasProfile: !!profile,
            name: profile?.name,
            hasCompanyId: !!profile?.company_id
          })
        }
      } catch (error) {
        console.error('❌ プロファイルチェックエラー:', error)
        // エラーが発生してもループしないようにする
      }
    }
    
    checkAuthAndProfile()
    
    // クリーンアップ
    return () => {
      isMounted = false
    }
  }, []) // 依存配列を空にして、初回のみ実行

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // ファイルタイプの確認（画像またはPDF）
      const isImage = file.type.startsWith('image/')
      const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      
      if (!isImage && !isPDF) {
        setErrors({ ocr: '画像またはPDFファイルを選択してください' })
        return
      }
      
      const reader = new FileReader()
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string)
        setScanStep(2)
        processOCR()
      }
      reader.readAsDataURL(file)
    }
  }

  const processOCR = async () => {
    if (!uploadedImage) return
    
    setIsProcessing(true)
    setErrors({})
    
    try {
      // Base64データURLを解析
      const dataUrlMatch = uploadedImage.match(/^data:([^;]+);base64,(.+)$/)
      if (!dataUrlMatch) {
        throw new Error('画像データの形式が正しくありません')
      }
      
      const mimeType = dataUrlMatch[1] || 'image/jpeg'
      const base64Data = dataUrlMatch[2] // base64データ部分のみ
      
      console.log('📸 ファイルデータを解析:', {
        mimeType,
        base64Length: base64Data.length,
        isPDF: mimeType.includes('pdf'),
      })
      
      // OCR APIを呼び出し（JSON形式でbase64データを送信）
      console.log('📤 OCR APIを呼び出します...')
      
      const response = await fetch('/api/ocr-business-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          image: base64Data, // base64データ部分のみ
          mimeType: mimeType, // PDF対応のためMIMEタイプを送信
        }),
      })
      
      console.log('📥 OCR API応答:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })
      
      if (!response.ok) {
        // エラーレスポンスの内容を取得
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        let errorData: any = null
        
        try {
          const contentType = response.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json()
            errorMessage = errorData.error || errorData.details || errorData.message || errorMessage
            console.error('❌ OCR API エラー (JSON):', errorData)
          } else {
            const textData = await response.text()
            console.error('❌ OCR API エラー (Text):', textData)
            errorMessage = textData || errorMessage
          }
        } catch (parseError) {
          console.error('❌ エラーレスポンスの解析に失敗:', parseError)
        }
        
        throw new Error(errorMessage)
      }
      
      // レスポンスをJSONとして解析
      const result = await response.json()
      console.log('✅ OCR API結果:', result)
      
      // エラーチェック
      if (result.error) {
        throw new Error(result.error)
      }
      
      // レスポンスからdataオブジェクトを取得（テストスクリプトと同じ形式）
      const data = result.data
      
      if (!data) {
        console.error('❌ レスポンスにdataオブジェクトが含まれていません:', result)
        throw new Error('OCR結果の形式が正しくありません')
      }
      
      console.log('📋 抽出されたデータ:', JSON.stringify(data, null, 2))
      
      // OCRResult形式に変換（テストスクリプトの結果と同じ形式）
      const ocrData: OCRResult = {
        personName: data.personName || data.fullName || null,
        personNameKana: data.personNameKana || null,
        position: data.position || null,
        department: data.department || null,
        companyName: data.companyName || null,
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        postalCode: data.postalCode || null,
        address: data.address || null,
        website: data.website || null,
      }
      
      console.log('✅ OCRデータ変換完了:', ocrData)
      
      // 少なくとも1つの情報が取得できた場合のみ結果を表示
      const hasValidData = ocrData.personName || ocrData.companyName || ocrData.email || ocrData.phone || ocrData.department
      
      if (hasValidData) {
        setOcrResult(ocrData)
        setScanStep(3)
        console.log('✅ OCR結果を表示ステップに設定')
      } else {
        console.warn('⚠️ 有効なデータが取得できませんでした:', ocrData)
        throw new Error('名刺から情報を読み取れませんでした。画像を確認してください。')
      }
    } catch (error) {
      console.error('❌ OCR処理エラー:', error)
      const errorMessage = error instanceof Error ? error.message : '名刺の読み取りに失敗しました。手動で入力してください。'
      setErrors({ 
        ocr: errorMessage
      })
      // エラーが発生しても、手動入力に進める
      setScanStep(1)
    } finally {
      setIsProcessing(false)
    }
  }

  const applyOCRData = () => {
    console.log('🔵 applyOCRData が呼ばれました')
    console.log('🔵 ocrResult:', ocrResult)
    
    if (!ocrResult) {
      console.warn('⚠️ ocrResult が存在しません')
      return
    }
    
    try {
      // 部署のマッチング（部分一致で検索）
      let matchedDepartment = ocrResult.department
      if (ocrResult.department) {
        // 「営業」「マーケティング」など部分一致で検索
        const deptKeywords: Record<string, string> = {
          '営業': '営業部',
          'マーケティング': 'マーケティング部',
          '開発': '開発部',
          '技術': '技術部',
          '人事': '人事部',
          '経理': '経理部',
          '総務': '総務部',
          '企画': '企画部',
        }
        
        let matched = departments.find((d) => 
          ocrResult.department?.includes(d.replace("・", "")) || 
          d.includes(ocrResult.department?.replace("・", "") || "")
        )
        
        // キーワードベースのマッチング
        if (!matched) {
          for (const [keyword, dept] of Object.entries(deptKeywords)) {
            if (ocrResult.department?.includes(keyword)) {
              matched = dept
              break
            }
          }
        }
        
        if (matched) {
          matchedDepartment = matched
          console.log('✅ 部署マッチング:', ocrResult.department, '->', matched)
        } else {
          // マッチしない場合は「その他」にセット
          matchedDepartment = 'その他'
          console.log('⚠️ 部署マッチングなし、「その他」に設定:', ocrResult.department)
        }
      }
      
      // 役職のマッチング（部分一致で検索）
      let matchedPosition = ocrResult.position
      if (ocrResult.position) {
        // 役職キーワードマッチング
        const posKeywords: Record<string, string> = {
          '代表取締役': '代表取締役',
          '社長': '代表取締役',
          '取締役': '取締役',
          '執行役員': '執行役員',
          '部長': '部長',
          '次長': '次長',
          '課長': '課長',
          '係長': '係長',
          '主任': '主任',
          'マネージャー': '課長',
          'リーダー': '係長',
        }
        
        let matched = positions.find((p) => 
          ocrResult.position?.includes(p.split("/")[0]) ||
          p.split("/").some(part => ocrResult.position?.includes(part))
        )
        
        // キーワードベースのマッチング
        if (!matched) {
          for (const [keyword, pos] of Object.entries(posKeywords)) {
            if (ocrResult.position?.includes(keyword)) {
              matched = pos
              break
            }
          }
        }
        
        if (matched) {
          matchedPosition = matched
          console.log('✅ 役職マッチング:', ocrResult.position, '->', matched)
        } else {
          // マッチしない場合は「その他」にセット
          matchedPosition = 'その他'
          console.log('⚠️ 役職マッチングなし、「その他」に設定:', ocrResult.position)
        }
      }
      
      // 設定するデータをログに出力
      const newProfileData = {
        name: ocrResult.personName || '',
        nameKana: ocrResult.personNameKana || '',
        position: matchedPosition || '',
        department: matchedDepartment || '',
        phone: ocrResult.phone || '',
        mobile: ocrResult.mobile || '',
      }
      
      const newCompanyData = {
        name: ocrResult.companyName || '',
        website: ocrResult.website || '',
        postalCode: ocrResult.postalCode || '',
        address: ocrResult.address || '',
      }
      
      console.log('📝 セットするプロフィールデータ:', newProfileData)
      console.log('📝 セットする会社データ:', newCompanyData)
      
      setProfileData(prev => ({
        ...prev,
        name: newProfileData.name || prev.name,
        nameKana: newProfileData.nameKana || prev.nameKana,
        position: newProfileData.position || prev.position,
        department: newProfileData.department || prev.department,
        phone: newProfileData.phone || prev.phone,
        mobile: newProfileData.mobile || prev.mobile,
      }))
      
      setCompanyData(prev => ({
        ...prev,
        name: newCompanyData.name || prev.name,
        website: newCompanyData.website || prev.website,
        postalCode: newCompanyData.postalCode || prev.postalCode,
        address: newCompanyData.address || prev.address,
      }))
      
      console.log('➡️ ステップ2に移動します')
      console.log('🔵 現在のstep状態:', step)
      
      // 状態をクリーンアップ
      setUploadedImage(null)
      setOcrResult(null)
      setErrors({})
      setScanStep(1)
      
      // ステップ2に移動
      console.log('➡️ setStep(2) を実行します')
      setStep(2)
      console.log('✅ setStep(2) 実行完了')
      
      console.log('✅ applyOCRData 完了')
    } catch (error) {
      console.error('❌ applyOCRData エラー:', error)
    }
  }

  const validateProfile = () => {
    const newErrors: Record<string, string> = {}
    if (!profileData.name.trim()) {
      newErrors.name = '氏名を入力してください'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateCompany = () => {
    const newErrors: Record<string, string> = {}
    if (!companyData.name.trim()) {
      newErrors.companyName = '会社名を入力してください'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveProfile = async () => {
    if (!validateProfile()) return
    
    setIsLoading(true)
    setErrors({})
    
    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabaseが設定されていません')
      }
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('User auth error:', userError)
        throw new Error(`認証エラー: ${userError.message}`)
      }
      
      if (!user) {
        throw new Error('認証されていません')
      }
      
      // プロファイルを作成または更新（upsert）
      console.log('📝 プロフィールを保存します:', {
        user_id: user.id,
        email: user.email,
        name: profileData.name,
      })
      
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          email: user.email, // NOT NULL制約があるためemailを追加
          name: profileData.name,
          name_kana: profileData.nameKana || null,
          position: profileData.position || null,
          department: profileData.department || null,
          phone: profileData.phone || null,
          mobile: profileData.mobile || null,
        }, {
          onConflict: 'user_id'
        })
      
      if (profileError) {
        console.error('Profile upsert error:', profileError)
        throw new Error(`プロフィールの保存に失敗しました: ${profileError.message || profileError.code || '不明なエラー'}`)
      }
      
      console.log('✅ プロフィール保存完了')
      
      setStep(3)
    } catch (error) {
      console.error('Profile update error:', error)
      
      // エラーメッセージを適切に取得
      let errorMessage = 'エラーが発生しました'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (error && typeof error === 'object') {
        // Supabaseのエラーオブジェクトの場合
        const supabaseError = error as any
        if (supabaseError.message) {
          errorMessage = supabaseError.message
        } else if (supabaseError.code) {
          errorMessage = `エラーコード: ${supabaseError.code}`
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details
        } else {
          errorMessage = JSON.stringify(error)
        }
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      setErrors({ general: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveCompany = async () => {
    if (!validateCompany()) return
    
    setIsLoading(true)
    setErrors({})
    
    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabaseが設定されていません')
      }
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('User auth error:', userError)
        throw new Error(`認証エラー: ${userError.message}`)
      }
      
      if (!user) {
        throw new Error('認証されていません')
      }
      
      // 会社情報を取得または作成
      console.log('📝 プロフィールから会社IDを取得します')
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (profileError) {
        console.error('Profile fetch error:', profileError)
        throw new Error(`プロフィールの取得に失敗しました: ${profileError.message}`)
      }
      
      // プロフィールが存在しない場合は作成
      if (!profile) {
        console.log('📝 プロフィールが存在しないため作成します')
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email, // NOT NULL制約があるためemailを追加
            name: 'User', // 仮の名前
          })
        
        if (createProfileError) {
          console.error('Profile create error:', createProfileError)
          throw new Error(`プロフィールの作成に失敗しました: ${createProfileError.message}`)
        }
      }
      
      let companyId = profile?.company_id
      console.log('📝 現在の会社ID:', companyId)
      
      if (!companyId) {
        // 会社を作成
        console.log('📝 新しい会社を作成します:', companyData.name)
        
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: companyData.name,
            name_kana: companyData.nameKana || null,
            industry: companyData.industry || null,
            employee_count: companyData.employeeCount || null,
            annual_revenue: companyData.annualRevenue || null,
            website: companyData.website || null,
            postal_code: companyData.postalCode || null,
            prefecture: companyData.prefecture || null,
            city: companyData.city || null,
            address: companyData.address || null,
            building: companyData.building || null,
          })
          .select()
          .single()
        
        if (companyError) {
          console.error('Company insert error:', companyError)
          throw new Error(`会社情報の作成に失敗しました: ${companyError.message || companyError.code || '不明なエラー'}`)
        }
        
        if (!newCompany || !newCompany.id) {
          throw new Error('会社情報の作成に失敗しました（IDが取得できませんでした）')
        }
        
        companyId = newCompany.id
        console.log('✅ 会社作成完了:', companyId)
        
        // プロファイルに会社IDを設定
        console.log('📝 プロフィールに会社IDを設定します')
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ company_id: companyId })
          .eq('user_id', user.id)
        
        if (updateError) {
          console.error('Profile update error:', updateError)
          throw new Error(`プロフィールの更新に失敗しました: ${updateError.message || updateError.code || '不明なエラー'}`)
        }
        console.log('✅ プロフィール更新完了')
      } else {
        // 既存の会社を更新
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            name: companyData.name,
            name_kana: companyData.nameKana || null,
            industry: companyData.industry || null,
            employee_count: companyData.employeeCount || null,
            annual_revenue: companyData.annualRevenue || null,
            website: companyData.website || null,
            postal_code: companyData.postalCode || null,
            prefecture: companyData.prefecture || null,
            city: companyData.city || null,
            address: companyData.address || null,
            building: companyData.building || null,
          })
          .eq('id', companyId)
        
        if (updateError) {
          console.error('Company update error:', updateError)
          throw new Error(`会社情報の更新に失敗しました: ${updateError.message || updateError.code || '不明なエラー'}`)
        }
      }
      
      // ダッシュボードにリダイレクト
      console.log('✅ 登録完了！ダッシュボードにリダイレクトします')
      router.push('/dashboard')
    } catch (error) {
      console.error('Company save error:', error)
      
      // エラーメッセージを適切に取得
      let errorMessage = 'エラーが発生しました'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (error && typeof error === 'object') {
        // Supabaseのエラーオブジェクトの場合
        const supabaseError = error as any
        if (supabaseError.message) {
          errorMessage = supabaseError.message
        } else if (supabaseError.code) {
          errorMessage = `エラーコード: ${supabaseError.code}`
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details
        } else {
          errorMessage = JSON.stringify(error)
        }
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      setErrors({ general: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                step >= 1 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
              }`}>
                {step > 1 ? <CheckCircle size={20} /> : <Camera size={20} />}
              </div>
              <span className="font-medium">名刺登録</span>
            </div>
            <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                step >= 2 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
              }`}>
                {step > 2 ? <CheckCircle size={20} /> : <User size={20} />}
              </div>
              <span className="font-medium">プロフィール</span>
            </div>
            <div className={`w-16 h-0.5 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                step >= 3 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
              }`}>
                <Building2 size={20} />
              </div>
              <span className="font-medium">会社情報</span>
            </div>
          </div>
        </div>

        {/* Step 1: Business Card OCR */}
        {step === 1 && (
          <Card className="shadow-2xl border border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">名刺を登録</CardTitle>
              <CardDescription className="text-center">
                名刺をスキャンして、プロフィール情報を自動入力します
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scanStep === 1 && (
                <div className="text-center py-12">
                  <div className="mb-6">
                    <div className="w-24 h-24 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-4">
                      <Camera className="w-12 h-12 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">名刺をアップロード</h3>
                    <p className="text-gray-600 text-sm mb-6">
                      名刺の画像をアップロードすると、自動で情報を読み取ります
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  >
                    <Upload size={18} className="mr-2" />
                    名刺を選択
                  </Button>
                  <div className="mt-6">
                    <button
                      onClick={() => setStep(2)}
                      className="text-sm text-gray-600 hover:text-gray-900 underline"
                    >
                      スキップして手動入力
                    </button>
                  </div>
                </div>
              )}
              
              {scanStep === 2 && (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">名刺を読み取っています...</p>
                  {errors.ocr && (
                    <p className="text-sm text-red-500 mt-2">{errors.ocr}</p>
                  )}
                </div>
              )}
              
              {scanStep === 3 && ocrResult && (
                <div className="space-y-4">
                  {/* OCR成功メッセージ */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                      名刺から情報を読み取りました。下のフォームに自動入力されています。
                    </p>
                  </div>
                  
                  {errors.ocr && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-red-600">{errors.ocr}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-2">読み取り結果</h4>
                    <div className="space-y-1 text-sm">
                      {ocrResult.personName && <p><strong>氏名:</strong> {ocrResult.personName}</p>}
                      {ocrResult.companyName && <p><strong>会社名:</strong> {ocrResult.companyName}</p>}
                      {ocrResult.position && <p><strong>役職:</strong> {ocrResult.position}</p>}
                      {ocrResult.department && <p><strong>部署:</strong> {ocrResult.department}</p>}
                      {ocrResult.email && <p><strong>メール:</strong> {ocrResult.email}</p>}
                      {ocrResult.phone && <p><strong>電話:</strong> {ocrResult.phone}</p>}
                      {ocrResult.mobile && <p><strong>携帯:</strong> {ocrResult.mobile}</p>}
                      {ocrResult.postalCode && <p><strong>郵便番号:</strong> {ocrResult.postalCode}</p>}
                      {ocrResult.address && <p><strong>住所:</strong> {ocrResult.address}</p>}
                      {ocrResult.website && <p><strong>ウェブサイト:</strong> {ocrResult.website}</p>}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setScanStep(1)
                        setUploadedImage(null)
                        setOcrResult(null)
                        setErrors({})
                      }}
                      className="flex-1"
                    >
                      やり直す
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.preventDefault()
                        console.log('🔵 「この情報を使用」ボタンがクリックされました')
                        console.log('🔵 現在の状態:', { step, scanStep, hasOcrResult: !!ocrResult })
                        applyOCRData()
                        console.log('🔵 applyOCRData 実行後')
                      }}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                      disabled={!ocrResult || isProcessing}
                    >
                      <CheckCircle size={18} className="mr-2" />
                      この情報を使用
                    </Button>
                  </div>
                </div>
              )}
              
              {errors.ocr && scanStep === 1 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-red-600">{errors.ocr}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Profile Information */}
        {step === 2 && (
          <Card className="shadow-2xl border border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">プロフィール情報</CardTitle>
              <CardDescription className="text-center">
                あなたの基本情報を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">氏名 <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="山田 太郎"
                    required
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="nameKana">氏名（カナ）</Label>
                  <Input
                    id="nameKana"
                    value={profileData.nameKana}
                    onChange={(e) => setProfileData(prev => ({ ...prev, nameKana: e.target.value }))}
                    placeholder="ヤマダ タロウ"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="position">役職</Label>
                    <select
                      id="position"
                      value={profileData.position}
                      onChange={(e) => setProfileData(prev => ({ ...prev, position: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="">選択してください</option>
                      {positions.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="department">部署</Label>
                    <select
                      id="department"
                      value={profileData.department}
                      onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="">選択してください</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">電話番号</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="03-1234-5678"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="mobile">携帯電話</Label>
                    <Input
                      id="mobile"
                      value={profileData.mobile}
                      onChange={(e) => setProfileData(prev => ({ ...prev, mobile: e.target.value }))}
                      placeholder="090-1234-5678"
                    />
                  </div>
                </div>
                
                {errors.general && (
                  <p className="text-sm text-red-500">{errors.general}</p>
                )}
                
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    戻る
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  >
                    {isLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                    次へ
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Company Information */}
        {step === 3 && (
          <Card className="shadow-2xl border border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">会社情報</CardTitle>
              <CardDescription className="text-center">
                会社の基本情報を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="companyName">会社名 <span className="text-red-500">*</span></Label>
                  <Input
                    id="companyName"
                    value={companyData.name}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="株式会社サンプル"
                    required
                  />
                  {errors.companyName && <p className="text-sm text-red-500">{errors.companyName}</p>}
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="companyNameKana">会社名（カナ）</Label>
                  <Input
                    id="companyNameKana"
                    value={companyData.nameKana}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, nameKana: e.target.value }))}
                    placeholder="カブシキガイシャサンプル"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="industry">業種</Label>
                    <select
                      id="industry"
                      value={companyData.industry}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, industry: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="">選択してください</option>
                      {industries.map(ind => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="employeeCount">従業員数</Label>
                    <select
                      id="employeeCount"
                      value={companyData.employeeCount}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, employeeCount: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="">選択してください</option>
                      {employeeRanges.map(range => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="annualRevenue">年間売上</Label>
                  <select
                    id="annualRevenue"
                    value={companyData.annualRevenue}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, annualRevenue: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="">選択してください</option>
                    {revenueRanges.map(range => (
                      <option key={range} value={range}>{range}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="website">ウェブサイト</Label>
                  <Input
                    id="website"
                    value={companyData.website}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="postalCode">郵便番号</Label>
                    <Input
                      id="postalCode"
                      value={companyData.postalCode}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, postalCode: e.target.value }))}
                      placeholder="150-0001"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="prefecture">都道府県</Label>
                    <Input
                      id="prefecture"
                      value={companyData.prefecture}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, prefecture: e.target.value }))}
                      placeholder="東京都"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="city">市区町村</Label>
                    <Input
                      id="city"
                      value={companyData.city}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="渋谷区"
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="address">番地</Label>
                  <Input
                    id="address"
                    value={companyData.address}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="恵比寿1-1-1"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="building">建物名</Label>
                  <Input
                    id="building"
                    value={companyData.building}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, building: e.target.value }))}
                    placeholder="○○ビル 3F"
                  />
                </div>
                
                {errors.general && (
                  <p className="text-sm text-red-500">{errors.general}</p>
                )}
                
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1"
                  >
                    戻る
                  </Button>
                  <Button
                    onClick={handleSaveCompany}
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  >
                    {isLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                    完了してダッシュボードへ
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Home size={18} />
            <span>トップページに戻る</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

