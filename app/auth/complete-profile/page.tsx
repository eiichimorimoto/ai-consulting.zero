"use client"

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Camera, Upload, CheckCircle, Loader2, Home, Building2, User, X, Globe, FileText } from 'lucide-react'
import Link from 'next/link'
import FileUpload from '@/components/FileUpload'
import { convertPdfToImageClient } from '@/lib/ocr/pdf-to-image-client'

interface OCRResult {
  personName?: string
  personNameKana?: string
  department?: string
  companyName?: string
  email?: string
  phone?: string
  mobile?: string
  postalCode?: string
  address?: string
  website?: string
}

interface OCRValidationResult {
  isValid: boolean
  warnings: string[]
  errors: string[]
  correctedData?: OCRResult // 修正されたデータ
}

export default function CompleteProfilePage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: 名刺OCR, 2: プロフィール入力, 3: 会社情報入力
  const [scanStep, setScanStep] = useState(1) // 1: アップロード, 2: 処理中, 3: 結果確認
  const [uploadedFile, setUploadedFile] = useState<{
    dataUrl: string
    mimeType: string
    name: string
  } | null>(null)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // PDFプレビュー用のObject URLは、ダイアログを閉じたタイミングで解放する（onOpenChangeで処理）

  const splitJapaneseAddressForCompanyForm = (fullAddress: string, prefecture?: string, city?: string) => {
    // 名刺OCRの住所（例: 愛知県名古屋市中村区名駅1-1-1 JPタワー名古屋25階）を
    // 「都道府県 / 市区町村 / 町名番地以下」に分割する
    const raw = (fullAddress || "").replace(/[〒]/g, "").trim()
    if (!raw) return { prefecture: "", city: "", street: "" }

    // 1) 郵便番号APIから確定できる都道府県/市区町村がある場合は、それを優先して"残り"を作る
    if (prefecture && city && raw.startsWith(`${prefecture}${city}`)) {
      return { prefecture, city, street: raw.slice(`${prefecture}${city}`.length).trim() }
    }
    if (prefecture && raw.startsWith(prefecture)) {
      const rest = raw.slice(prefecture.length)
      if (city && rest.startsWith(city)) {
        return { prefecture, city, street: rest.slice(city.length).trim() }
      }
    }

    // 2) フォールバック: 住所文字列だけから推定（推測ではなく"単純分割"）
    const mPref = raw.match(/^(.*?[都道府県])/)
    const parsedPref = mPref?.[1] || ""
    const afterPref = parsedPref ? raw.slice(parsedPref.length) : raw
    const mCity =
      afterPref.match(/^(.+?市.+?区)/) ||
      afterPref.match(/^(.+?(?:市|区|町|村))/)
    const parsedCity = mCity?.[1] || ""
    const afterCity = parsedCity ? afterPref.slice(parsedCity.length) : afterPref
    return {
      prefecture: prefecture || parsedPref,
      city: city || parsedCity,
      street: afterCity.trim(),
    }
  }

  /**
   * DB保存直前に住所データを正規化する
   * - prefecture/cityが空でaddressに都道府県・市区町村が含まれている場合は自動分割
   * - 名刺OCR情報を優先し、郵便番号APIで補完
   * - 優先順位: 1) 既存のprefecture/city 2) addressから抽出 3) 郵便番号APIから取得
   */
  const normalizeAddressForSave = async (data: typeof companyData): Promise<{
    prefecture: string
    city: string
    address: string
  }> => {
    let { prefecture, city, address } = data
    const postalCode = data.postalCode

    console.log('📍 住所正規化開始:', { prefecture, city, address, postalCode })

    // Step 1: prefecture/cityが空でaddressに都道府県・市区町村が含まれている場合
    if ((!prefecture || !city) && address) {
      const split = splitJapaneseAddressForCompanyForm(address, prefecture, city)
      console.log('📝 addressから住所を分割:', split)
      
      if (!prefecture && split.prefecture) {
        prefecture = split.prefecture
      }
      if (!city && split.city) {
        city = split.city
      }
      // addressから県・市を除去して町名番地以下のみにする
      if (split.street) {
        address = split.street
      }
    }

    // Step 2: まだ空の場合、郵便番号APIから取得を試みる
    if ((!prefecture || !city) && postalCode) {
      const cleanPostalCode = postalCode.replace(/[〒ー-]/g, '')
      if (/^\d{7}$/.test(cleanPostalCode)) {
        try {
          console.log('📮 郵便番号APIから住所を補完:', cleanPostalCode)
          const apiUrl = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanPostalCode}`
          const response = await fetch(apiUrl)
          const apiData = await response.json()
          
          if (apiData.status === 200 && apiData.results && apiData.results.length > 0) {
            const result = apiData.results[0]
            const apiPref = result.prefcode ? getPrefectureName(result.prefcode) : result.address1 || ''
            const apiCity = result.address2 || ''
            
            console.log('✅ 郵便番号APIから取得:', { apiPref, apiCity })
            
            if (!prefecture && apiPref) {
              prefecture = apiPref
            }
            if (!city && apiCity) {
              city = apiCity
            }
            
            // addressから重複する県・市を除去
            if (address && prefecture && address.startsWith(prefecture)) {
              address = address.slice(prefecture.length).trim()
            }
            if (address && city && address.startsWith(city)) {
              address = address.slice(city.length).trim()
            }
          }
        } catch (error) {
          console.error('❌ 郵便番号API補完エラー:', error)
        }
      }
    }

    console.log('✅ 住所正規化完了:', { prefecture, city, address })
    return { prefecture, city, address }
  }

  const createPdfObjectUrlFromDataUrl = (dataUrl: string): string => {
    // data:application/pdf;base64,xxxxx をBlob URLに変換（大きなdata URLの直接openが失敗するブラウザ対策）
    const match = dataUrl.match(/^data:application\/pdf;base64,(.+)$/i)
    if (!match) return dataUrl

    const base64 = match[1]
    const binaryString = atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'application/pdf' })
    return URL.createObjectURL(blob)
  }

  const openPdfPreview = () => {
    if (!uploadedFile?.dataUrl) return

    // 既存URLがあれば解放
    if (pdfViewerUrl) {
      URL.revokeObjectURL(pdfViewerUrl)
      setPdfViewerUrl(null)
    }

    const url = createPdfObjectUrlFromDataUrl(uploadedFile.dataUrl)
    setPdfViewerUrl(url)
    setPdfViewerOpen(true)
  }

  const openPdfInNewTab = () => {
    if (!uploadedFile?.dataUrl) return
    // プレビュー用URLとは別に、別タブ用に新しいURLを生成（プレビューを閉じても別タブが壊れないように）
    const url = createPdfObjectUrlFromDataUrl(uploadedFile.dataUrl)
    const opened = window.open(url, '_blank', 'noopener,noreferrer')
    if (!opened) {
      alert('ポップアップがブロックされました。ブラウザ設定でこのサイトのポップアップを許可してください。')
      return
    }
    if (url.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    }
  }
  
  // ステップ状態の変更をログに記録
  React.useEffect(() => {
    console.log('📊 ステップ状態が変更されました:', { step, scanStep, hasOcrResult: !!ocrResult, isProcessing })
  }, [step, scanStep, ocrResult, isProcessing])
  
  const [profileData, setProfileData] = useState({
    name: '',
    nameKana: '',
    department: '',
    phone: '',
    mobile: '',
    avatarUrl: '', // アバター画像URL
  })
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [companyDocuments, setCompanyDocuments] = useState<File[]>([])
  
  const [companyData, setCompanyData] = useState({
    name: '',
    nameKana: '',
    industry: '',
    employeeCount: '',
    annualRevenue: '',
    website: '',
    email: '', // 会社のemailを追加
    postalCode: '',
    prefecture: '',
    city: '',
    address: '',
    retrievedInfo: '',
    // Web検索から取得する追加フィールド
    establishedDate: '',
    representativeName: '',
    companyPhone: '', // 会社代表電話
    fax: '',
    businessDescription: '',
    capital: '',
    fiscalYearEnd: '', // 決算月（1-12）
  })
  const [companyIntel, setCompanyIntel] = useState<Record<string, any> | null>(null)
  const [companyIntelMeta, setCompanyIntelMeta] = useState<Record<string, any> | null>(null)
  const [isFetchingCompanyIntel, setIsFetchingCompanyIntel] = useState(false)
  const [companyIntelStatus, setCompanyIntelStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [useExternalCompanySources, setUseExternalCompanySources] = useState(true)
  const [showWebSearchHelp, setShowWebSearchHelp] = useState(false)
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [postalCodeStatus, setPostalCodeStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [ocrValidation, setOcrValidation] = useState<OCRValidationResult | null>(null)
  
  const industries = [
    '情報通信業', '製造業', '卸売業・小売業', 'サービス業', '建設業',
    '不動産業', '金融業・保険業', '運輸業・郵便業', '医療・福祉', '教育・学習支援業', 'その他'
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
          .select('name, name_kana, department, phone, mobile, avatar_url, company_id')
          .eq('user_id', user.id)
          .maybeSingle() // single()の代わりにmaybeSingle()を使用（存在しない場合エラーにならない）
        
        if (profileError) {
          // プロファイルが存在しない場合はエラーを無視（新規登録プロセス中）
          console.log('📝 プロファイル確認:', profileError.code === 'PGRST116' ? 'プロファイル未作成（正常）' : profileError.message)
        }
        
        // 既存のプロフィールデータがある場合はフォームに設定
        if (profile && isMounted) {
          setProfileData({
            name: profile.name || '',
            nameKana: profile.name_kana || '',
            department: profile.department || '',
            phone: profile.phone || '',
            mobile: profile.mobile || '',
            avatarUrl: profile.avatar_url || '',
          })
          
          if (profile.avatar_url) {
            setAvatarPreview(profile.avatar_url)
          }
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
  }, [router]) // 依存配列を空にして、初回のみ実行

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    console.log('📁 ファイルが選択されました:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      hasFile: !!file,
    })
    
    if (file) {
      // ファイルタイプの確認（画像 or PDF）
      const fileNameLower = (file.name || '').toLowerCase()
      const isImage = (file.type || '').startsWith('image/')
      const isPdf = (file.type || '').toLowerCase() === 'application/pdf' || fileNameLower.endsWith('.pdf')
      
      if (!isImage && !isPdf) {
        console.error('❌ 無効なファイル形式:', file.type)
        setErrors({ ocr: '画像ファイル（JPEG、PNG）またはPDFファイルを選択してください。' })
        return
      }
      
      console.log('📖 ファイルを読み込み中...')
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        console.log('✅ ファイル読み込み完了:', {
          dataUrlLength: result?.length,
          hasData: !!result,
        })
        const dataUrlMatch = result?.match(/^data:([^;]+);base64,(.+)$/)
        const mimeTypeFromDataUrl = dataUrlMatch?.[1] || file.type || 'application/octet-stream'
        if (pdfViewerUrl) URL.revokeObjectURL(pdfViewerUrl)
        setPdfViewerOpen(false)
        setPdfViewerUrl(null)
        setUploadedFile({
          dataUrl: result,
          mimeType: mimeTypeFromDataUrl,
          name: file.name,
        })
        setScanStep(2)
        console.log('🔄 processOCRを呼び出します（画像データを直接渡します）...')
        // 画像データを直接渡してOCR処理を開始
        processOCRWithImage(result)
      }
      reader.onerror = (error) => {
        console.error('❌ ファイル読み込みエラー:', error)
        setErrors({ ocr: 'ファイルの読み込みに失敗しました' })
      }
      reader.readAsDataURL(file)
    } else {
      console.warn('⚠️ ファイルが選択されていません')
    }
  }

  const processOCRWithImage = async (imageData: string) => {
    console.log('🚀 processOCRWithImage開始:', {
      imageDataLength: imageData?.length,
      hasImageData: !!imageData,
    })
    
    if (!imageData) {
      console.error('❌ imageDataが存在しません')
      return
    }
    
    console.log('⏳ OCR処理を開始します...')
    setIsProcessing(true)
    setErrors({})
    
    try {
      // Base64データURLを解析
      const dataUrlMatch = imageData.match(/^data:([^;]+);base64,(.+)$/)
      if (!dataUrlMatch) {
        throw new Error('画像データの形式が正しくありません')
      }
      
      let mimeType = dataUrlMatch[1] || 'image/jpeg'
      let base64Data = dataUrlMatch[2] // base64データ部分のみ
      const isPDF = mimeType.includes('pdf')
      
      console.log('📸 ファイルデータを解析:', {
        mimeType,
        base64Length: base64Data.length,
        isPDF,
      })
      
      // PDFの場合はクライアントサイドで画像に変換（根本的解決）
      if (isPDF) {
        console.log('📄 PDFを検出、クライアントサイドで画像に変換します...')
        try {
          const imageDataUrl = await convertPdfToImageClient(imageData, 1, 2.0)
          const imageMatch = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/)
          if (imageMatch) {
            mimeType = imageMatch[1] || 'image/png'
            base64Data = imageMatch[2]
            console.log('✅ PDF→画像変換完了:', {
              newMimeType: mimeType,
              newBase64Length: base64Data.length,
            })
          } else {
            throw new Error('画像変換後のデータ形式が正しくありません')
          }
        } catch (pdfError) {
          const pdfMsg = pdfError instanceof Error ? pdfError.message : String(pdfError)
          console.error('❌ PDF→画像変換エラー:', pdfMsg)
          throw new Error(`PDFを画像に変換できませんでした: ${pdfMsg}`)
        }
      }
      
      // OCR APIを呼び出し（JSON形式でbase64データを送信）
      console.log('📤 OCR APIを呼び出します...')
      
      // 認証状態を事前に確認
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabaseが設定されていません')
      }
      const { data: { user }, error: authCheckError } = await supabase.auth.getUser()
      
      if (authCheckError || !user) {
        console.error('❌ OCR呼び出し前の認証チェック失敗:', {
          hasError: !!authCheckError,
          errorMessage: authCheckError?.message,
          hasUser: !!user,
        })
        throw new Error('認証されていません。ページを再読み込みしてください。')
      }
      
      console.log('✅ 認証確認完了、OCR APIを呼び出します:', {
        userId: user.id,
        email: user.email,
      })
      
      const response = await fetch('/api/ocr-business-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include', // Cookieを含める
        body: JSON.stringify({
          image: base64Data, // base64データ部分のみ
          mimeType: mimeType, // PDF対応のためMIMEタイプを送信
        }),
      })
      
      console.log('📥 OCR API応答:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries()),
      })
      
      // レスポンスのContent-Typeを確認
      const contentType = response.headers.get('content-type') || ''
      console.log('📋 レスポンスContent-Type:', contentType)
      
      // レスポンス本文を取得（エラー/成功の両方で使用）
      const responseText = await response.text()
      console.log('📋 レスポンス本文（生）:', responseText?.substring(0, 500) || '(空)')
      console.log('📋 レスポンス本文の長さ:', responseText?.length || 0)
      
      if (!response.ok) {
        // エラーレスポンスの内容を取得
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        let errorData: any = null
        
        // 詳細なエラー情報をログに出力（安全に取得）
        try {
          const errorInfo: any = {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            contentType,
            responseTextLength: responseText?.length || 0,
            responseTextPreview: responseText?.substring(0, 200) || '(空)',
          }
          
          // response.urlが利用可能な場合のみ追加
          try {
            errorInfo.url = response.url
          } catch (e) {
            errorInfo.url = '(取得不可)'
          }
          
          // ヘッダーを安全に取得
          try {
            errorInfo.headers = Object.fromEntries(response.headers.entries())
          } catch (e) {
            errorInfo.headers = '(取得不可)'
          }
          
          console.error('❌ OCR API エラー:', errorInfo)
          console.error('❌ レスポンスステータス:', response.status)
          console.error('❌ レスポンスステータステキスト:', response.statusText)
          console.error('❌ Content-Type:', contentType)
          console.error('❌ レスポンス本文の長さ:', responseText?.length || 0)
          console.error('❌ レスポンス本文（最初の500文字）:', responseText?.substring(0, 500) || '(空)')
        } catch (logError) {
          console.error('❌ エラー情報のログ出力に失敗:', logError)
          console.error('❌ レスポンスステータス:', response.status)
          console.error('❌ レスポンス本文:', responseText?.substring(0, 500) || '(空)')
        }
        
        try {
          if (contentType.includes('application/json') && responseText && responseText.trim() !== '') {
            try {
              errorData = JSON.parse(responseText)
              console.error('❌ OCR API エラー (JSON):', errorData)
              
              // エラーメッセージを構築（複数の可能性を確認）
              errorMessage = errorData.error || errorData.details || errorData.message || errorMessage
              
              // 空のオブジェクトの場合は、ステータスコードから推測
              if (Object.keys(errorData).length === 0) {
                console.warn('⚠️ エラーデータが空のオブジェクトです')
                if (response.status === 401) {
                  errorMessage = '認証エラーが発生しました。ページを再読み込みしてください。'
                } else if (response.status === 500) {
                  errorMessage = 'サーバーエラーが発生しました。しばらく待ってから再度お試しください。'
                } else {
                  errorMessage = `エラーが発生しました (HTTP ${response.status})`
                }
              } else {
                console.log('✅ エラーメッセージを取得:', errorMessage)
              }
            } catch (jsonParseError) {
              console.error('❌ JSON解析エラー:', jsonParseError)
              console.error('❌ 解析しようとしたテキスト:', responseText?.substring(0, 200))
              errorMessage = responseText || errorMessage
            }
          } else {
            console.error('❌ OCR API エラー (Text):', responseText?.substring(0, 200))
            errorMessage = responseText || errorMessage
            
            // ステータスコードに基づくエラーメッセージ
            if (response.status === 401) {
              errorMessage = '認証エラーが発生しました。ページを再読み込みしてください。'
            } else if (response.status === 500) {
              errorMessage = 'サーバーエラーが発生しました。しばらく待ってから再度お試しください。'
            } else if (response.status === 429) {
              errorMessage = 'APIの利用制限に達しました。しばらく待ってから再度お試しください。'
            } else if (response.status === 503) {
              errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。'
            }
          }
        } catch (parseError) {
          console.error('❌ エラーレスポンスの解析に失敗:', parseError)
          console.error('❌ 解析エラーの詳細:', parseError instanceof Error ? parseError.message : String(parseError))
          errorMessage = `エラーが発生しました (HTTP ${response.status})`
        }
        
        throw new Error(errorMessage)
      }
      
      // 成功レスポンスをJSONとして解析
      let result: any
      try {
        result = JSON.parse(responseText)
      } catch (jsonError) {
        console.error('❌ レスポンスJSON解析エラー:', jsonError)
        throw new Error('サーバーからの応答が正しい形式ではありません')
      }
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
        // OCR結果を検証・修正
        const validation = await validateOCRResult(ocrData)
        setOcrValidation(validation)
        
        // 修正されたデータがある場合はそれを使用、なければ元のデータを使用
        const finalOcrData = validation.correctedData || ocrData
        setOcrResult(finalOcrData)
        setScanStep(3)
        console.log('✅ OCR結果を表示ステップに設定（修正済みデータを使用）')
      } else {
        console.warn('⚠️ 有効なデータが取得できませんでした:', ocrData)
        throw new Error('名刺から情報を読み取れませんでした。画像を確認してください。')
      }
    } catch (error) {
      console.error('❌ OCR処理エラー:', error)
      let errorMessage = '名刺の読み取りに失敗しました。手動で入力してください。'
      
      if (error instanceof Error) {
        errorMessage = error.message
        
        // より分かりやすいエラーメッセージに変換
        // 注意: 順序が重要。より具体的なエラーを先にチェックする
        
        // 1. PDF関連のエラーを最優先でチェック（「fetch」が含まれる可能性があるため）
        if (error.message.includes('PDFを画像に変換') || 
            error.message.includes('PDF→画像変換') ||
            error.message.includes('pdfjs-dist') ||
            error.message.includes('worker') ||
            error.message.includes('Setting up fake worker') ||
            (error.message.includes('PDF') && error.message.includes('変換'))) {
          errorMessage = 'PDFの処理に失敗しました。別のPDFをお試しください（1ページ目を使用します）。'
        } 
        // 2. 認証エラー
        else if (error.message.includes('401') || error.message.includes('認証') || error.message.includes('Unauthorized')) {
          errorMessage = '認証エラーが発生しました。ページを再読み込みしてから再度お試しください。'
        } 
        // 3. レート制限
        else if (error.message.includes('429') || error.message.includes('rate limit')) {
          errorMessage = 'APIの利用制限に達しました。しばらく待ってから再度お試しください。'
        } 
        // 4. 画像データの形式エラー
        else if (error.message.includes('画像データ') || error.message.includes('Invalid image')) {
          errorMessage = '画像データの形式が正しくありません。JPEGまたはPNG形式の画像をアップロードしてください。'
        } 
        // 5. タイムアウト
        else if (error.message.includes('タイムアウト') || error.message.includes('timeout')) {
          errorMessage = '処理がタイムアウトしました。画像サイズを小さくするか、しばらく待ってから再度お試しください。'
        } 
        // 6. サーバーエラー
        else if (error.message.includes('500') || error.message.includes('サーバー')) {
          errorMessage = 'サーバーエラーが発生しました。しばらく待ってから再度お試しください。'
        } 
        // 7. ネットワークエラー（PDF関連でない場合のみ）
        else if ((error.message.includes('network') || error.message.includes('ECONNREFUSED')) && 
                 !error.message.includes('PDF') && 
                 !error.message.includes('worker')) {
          errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。'
        } 
        // 8. fetchエラー（PDF関連でない場合のみ）
        else if (error.message.includes('fetch') && 
                 !error.message.includes('PDF') && 
                 !error.message.includes('worker') &&
                 !error.message.includes('dynamically imported module')) {
          errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。'
        }
      }
      
      setErrors({ 
        ocr: errorMessage
      })
      // エラーが発生しても、手動入力に進める
      setScanStep(1)
    } finally {
      setIsProcessing(false)
    }
  }

  const applyOCRData = async () => {
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
      
      // 設定するデータをログに出力
      const newProfileData = {
        name: ocrResult.personName || '',
        nameKana: ocrResult.personNameKana || '',
        department: matchedDepartment || '',
        phone: ocrResult.phone || '',
        mobile: ocrResult.mobile || '',
      }
      
      // websiteから「URL:」「url:」などのプレフィックスを除去
      const cleanWebsite = (ocrResult.website || '')
        .replace(/^(URL|url|Url)\s*[:：]\s*/i, '')
        .trim()

      const newCompanyData = {
        name: ocrResult.companyName || '',
        website: cleanWebsite,
        postalCode: ocrResult.postalCode || '',
        address: ocrResult.address || '',
        email: ocrResult.email || '', // 会社のemailを追加
      }
      
      console.log('📝 セットするプロフィールデータ:', newProfileData)
      console.log('📝 セットする会社データ:', newCompanyData)
      
      setProfileData(prev => ({
        ...prev,
        name: newProfileData.name || prev.name,
        nameKana: newProfileData.nameKana || prev.nameKana,
        department: newProfileData.department || prev.department,
        phone: newProfileData.phone || prev.phone,
        mobile: newProfileData.mobile || prev.mobile,
      }))
      
      // 会社データをセット
      setCompanyData(prev => ({
        ...prev,
        name: newCompanyData.name || prev.name,
        website: newCompanyData.website || prev.website,
        postalCode: newCompanyData.postalCode !== undefined && newCompanyData.postalCode !== '' ? newCompanyData.postalCode : prev.postalCode,
        address: newCompanyData.address || prev.address,
        email: newCompanyData.email || prev.email,
      }))
      
      console.log('✅ 会社データをセットしました:', {
        postalCode: newCompanyData.postalCode !== undefined && newCompanyData.postalCode !== '' ? newCompanyData.postalCode : '保持',
        email: newCompanyData.email || '保持',
      })
      
      // OCR結果から郵便番号が取得された場合、郵便番号から都道府県と市区町村を取得
      // その際、OCRで読み取った住所から「都道府県+市区町村」を引いた残りを「町名番地以下」にセットする
      if (newCompanyData.postalCode) {
        console.log('📍 OCR結果から郵便番号を検出、住所を取得します:', newCompanyData.postalCode)
        
        // OCRで読み取った元の住所を保存（町名番地以下の抽出に使う）
        const originalAddress = newCompanyData.address || ''
        console.log('📝 OCRで読み取った元の住所を保存:', originalAddress)
        
        // 〒マークとハイフンを除去してから検索
        const cleanPostalCode = newCompanyData.postalCode.replace(/[〒ー-]/g, '')
        if (/^\d{7}$/.test(cleanPostalCode)) {
          // 郵便番号から住所を取得（都道府県・市区町村・番地）
          try {
            const apiUrl = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanPostalCode}`
            const response = await fetch(apiUrl)
            const data = await response.json()
            
            if (data.status === 200 && data.results && data.results.length > 0) {
              const result = data.results[0]
              const prefecture = result.prefcode ? getPrefectureName(result.prefcode) : result.address1 || ''
              const city = result.address2 || ''
              const address = result.address3 || ''
              const split = splitJapaneseAddressForCompanyForm(originalAddress, prefecture, city)
              
              console.log('✅ 郵便番号から住所を取得:', { prefecture, city, address })
              
              // 都道府県・市区町村・番地をセット
              setCompanyData(prev => ({
                ...prev,
                prefecture: prefecture || prev.prefecture,
                city: city || prev.city,
                // 町名番地以下（例: 名駅1-1-1 JPタワー名古屋25階）
                address: (split.street || address || prev.address),
              }))
              
              console.log('✅ 住所情報をセットしました（町名番地以下を抽出）')
            }
          } catch (error) {
            console.error('❌ 郵便番号検索エラー:', error)
          }
        } else {
          console.warn('⚠️ OCR結果の郵便番号が正しい形式ではありません:', newCompanyData.postalCode)
        }
      }
      
      console.log('➡️ ステップ2に移動します')
      console.log('🔵 現在のstep状態:', step)
      
      // 状態をクリーンアップ
      setUploadedFile(null)
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

  // アバターファイル処理（共通処理）
  const handleAvatarFile = (file: File) => {
    // 画像ファイルのみ許可（JPEG、PNG）
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setErrors({ avatar: 'JPEGまたはPNG形式の画像を選択してください' })
      return
    }
    
    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ avatar: 'ファイルサイズは5MB以下にしてください' })
      return
    }
    
    setAvatarFile(file)
    
    // プレビュー用にDataURLを作成
    const reader = new FileReader()
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // アバターファイル選択ハンドラー
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    handleAvatarFile(file)
  }

  // アバタードラッグ＆ドロップ
  const handleAvatarDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingAvatar(true)
  }

  const handleAvatarDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingAvatar(false)
  }

  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingAvatar(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleAvatarFile(file)
    }
  }
  
  // アバターをSupabaseストレージにアップロード
  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null
    
    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabaseが設定されていません')
      }
      
      setIsUploadingAvatar(true)
      
      // ファイル名を生成（ユーザーID + タイムスタンプ）
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`
      
      // Supabaseストレージにアップロード
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        console.error('❌ アバターアップロードエラー:', error)
        throw new Error(`アバターのアップロードに失敗しました: ${error.message}`)
      }
      
      // 公開URLを取得
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
      
      console.log('✅ アバターアップロード成功:', urlData.publicUrl)
      return urlData.publicUrl
    } catch (error) {
      console.error('❌ アバターアップロードエラー:', error)
      throw error
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // 会社資料をアップロード
  const uploadCompanyDocuments = async (companyId: string): Promise<string[]> => {
    if (companyDocuments.length === 0) return []

    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabaseが設定されていません')
      }

      const uploadedPaths: string[] = [] // URLではなくパスを保存

      for (const file of companyDocuments) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${companyId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = fileName

        const { error } = await supabase.storage
          .from('company-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) {
          console.error('ファイルアップロードエラー:', error)
          continue
        }

        // パスのみを保存（Privateバケットのため）
        uploadedPaths.push(filePath)
      }

      return uploadedPaths
    } catch (error) {
      console.error('会社資料アップロードエラー:', error)
      throw error
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

  // OCR結果を検証・修正
  const validateOCRResult = async (ocrData: OCRResult): Promise<OCRValidationResult> => {
    const warnings: string[] = []
    const errors: string[] = []
    let correctedData: OCRResult = { ...ocrData } // コピーを作成
    
    console.log('🔍 OCR結果の検証を開始:', ocrData)
    
    // 1. 郵便番号と住所の整合性チェック・自動修正
    if (ocrData.postalCode) {
      try {
        // 郵便番号のクリーンアップ（全角→半角、各種ハイフン・記号除去）
        const cleanPostalCode = ocrData.postalCode
          .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角数字→半角
          .replace(/[〒\s　ー−‐‑–—\-]/g, '') // 〒、空白、各種ハイフン除去
          .trim()

        // クリーンアップした郵便番号を保存（フォーマット: XXX-XXXX）
        if (/^\d{7}$/.test(cleanPostalCode)) {
          const formattedPostalCode = `${cleanPostalCode.slice(0, 3)}-${cleanPostalCode.slice(3)}`
          if (formattedPostalCode !== ocrData.postalCode) {
            correctedData.postalCode = formattedPostalCode
            console.log('✅ 郵便番号を自動修正:', ocrData.postalCode, '→', formattedPostalCode)
          }

          const apiUrl = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanPostalCode}`
          const response = await fetch(apiUrl)
          const data = await response.json()
          
          if (data.status === 200 && data.results && data.results.length > 0) {
            // 複数結果がある場合は最初の住所を使用
            const result = data.results[0]
            const correctPrefecture = result.prefcode ? getPrefectureName(result.prefcode) : result.address1 || ''
            const correctCity = result.address2 || ''
            const correctAddress = result.address3 || ''
            const correctFullAddress = `${correctPrefecture}${correctCity}${correctAddress}`.trim()
            
            if (ocrData.address) {
              // 住所のクリーンアップ（全角数字→半角、記号除去）
              const ocrAddress = ocrData.address
                .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角→半角
                .replace(/[〒ー−‐‑–—\-]/g, '') // 各種記号除去
                .trim()
              
              // 住所の類似度をチェック
              const correctWords = correctFullAddress.split(/[都道府県市区町村]/).filter(w => w.length > 1)
              const ocrWords = ocrAddress.split(/[都道府県市区町村]/).filter(w => w.length > 1)
              
              // 共通の単語数をチェック
              const commonWords = correctWords.filter(word => 
                ocrWords.some(ocrWord => ocrWord.includes(word) || word.includes(ocrWord))
              )
              
              const similarity = correctWords.length > 0 ? commonWords.length / correctWords.length : 0
              
              // 類似度が低い場合（0.5未満）、住所を自動修正
              if (similarity < 0.5) {
                console.warn('⚠️ 郵便番号と住所の不一致を検出、住所を自動修正します:', {
                  postalCode: ocrData.postalCode,
                  ocrAddress,
                  correctFullAddress,
                  similarity
                })

                // 町名番地以下（数字等）が含まれる“それらしい全文住所”は保持し、都道府県/市区町村は会社フォーム側で補完する
                const looksLikeFullAddress =
                  (ocrAddress.includes(correctPrefecture) || ocrAddress.includes(correctCity)) && /\d/.test(ocrAddress)

                if (!looksLikeFullAddress) {
                  // 正しい住所（郵便番号由来）で上書き（町名番地以下が取れない場合のフォールバック）
                  correctedData.address = correctFullAddress
                  warnings.push(
                    `郵便番号（${ocrData.postalCode}）と読み取った住所が一致しなかったため、住所を自動修正しました。修正前: ${ocrAddress.substring(0, 50)}... → 修正後: ${correctFullAddress.substring(0, 50)}...`
                  )
                } else {
                  warnings.push(
                    `郵便番号（${ocrData.postalCode}）に対応する住所と一部異なる可能性があります（町名番地以下を優先して保持）。名刺画像と照合して確認してください。`
                  )
                }
                
                // 住所が間違っていた場合、電話番号も確認が必要な可能性があることを警告
                if (ocrData.phone) {
                  warnings.push(
                    `住所が間違っていたため、電話番号（${ocrData.phone}）も名刺画像と照合して確認してください。`
                  )
                }
              } else if (similarity < 1.0) {
                warnings.push(
                  `郵便番号（${ocrData.postalCode}）に対応する住所が一部異なります。確認してください。`
                )
              }
            } else {
              // 住所が読み取れていない場合、郵便番号から取得した住所を設定
              correctedData.address = correctFullAddress
              console.log('✅ 住所が読み取れていなかったため、郵便番号から住所を自動設定:', correctFullAddress)
            }
          } else {
            warnings.push(`郵便番号（${ocrData.postalCode}）から住所を取得できませんでした。`)
          }
        }
      } catch (error) {
        console.error('住所整合性チェックエラー:', error)
        warnings.push('郵便番号と住所の整合性チェック中にエラーが発生しました。')
      }
    }
    
    // 2. メールアドレスの形式チェック
    if (ocrData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(ocrData.email)) {
        errors.push(`メールアドレスの形式が正しくありません: ${ocrData.email}`)
      }
    }
    
    // 3. 電話番号の形式チェック・自動修正
    if (ocrData.phone) {
      // 電話番号をクリーンアップ（全角数字→半角、不要な文字を除去）
      let cleanedPhone = ocrData.phone
        .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角→半角
        .replace(/[ー−]/g, '-') // 全角ハイフン→半角
        .replace(/[\s　]+/g, '') // 空白除去
        .replace(/[TEL:tel:Tel:電話：電話:]/gi, '') // プレフィックス除去
        .trim()

      const phoneRegex = /^[\d-()（）]+$/
      if (!phoneRegex.test(cleanedPhone)) {
        warnings.push(`電話番号の形式を確認してください: ${ocrData.phone}`)
      } else if (cleanedPhone !== ocrData.phone) {
        correctedData.phone = cleanedPhone
        console.log('✅ 電話番号を自動修正:', ocrData.phone, '→', cleanedPhone)
      }
    }

    // 4. 携帯電話番号の形式チェック・自動修正
    if (ocrData.mobile) {
      // 携帯番号をクリーンアップ（全角数字→半角、不要な文字を除去）
      let cleanedMobile = ocrData.mobile
        .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角→半角
        .replace(/[ー−]/g, '-') // 全角ハイフン→半角
        .replace(/[\s　]+/g, '') // 空白除去
        .replace(/[携帯：携帯:Mobile:mobile:MOBILE:]/gi, '') // プレフィックス除去
        .trim()

      const mobileRegex = /^[\d-()（）]+$/
      if (!mobileRegex.test(cleanedMobile)) {
        warnings.push(`携帯電話番号の形式を確認してください: ${ocrData.mobile}`)
      } else {
        // 携帯番号として妥当か確認（日本の携帯は070/080/090で始まる）
        const digitsOnly = cleanedMobile.replace(/\D/g, '')
        const isValidMobile = /^0[789]0\d{8}$/.test(digitsOnly)

        if (!isValidMobile && digitsOnly.length >= 10) {
          warnings.push(`携帯電話番号の形式を確認してください（固定電話の可能性があります）: ${cleanedMobile}`)
        }

        if (cleanedMobile !== ocrData.mobile) {
          correctedData.mobile = cleanedMobile
          console.log('✅ 携帯電話番号を自動修正:', ocrData.mobile, '→', cleanedMobile)
        }
      }
    }

    // 5. URLの形式チェック
    if (ocrData.website) {
      try {
        new URL(ocrData.website.startsWith('http') ? ocrData.website : `https://${ocrData.website}`)
      } catch {
        warnings.push(`ウェブサイトのURL形式を確認してください: ${ocrData.website}`)
      }
    }

    // 6. 重要な情報の欠損チェック
    const hasName = !!ocrData.personName
    const hasCompany = !!ocrData.companyName
    const hasContact = !!(ocrData.email || ocrData.phone || ocrData.mobile)
    
    if (!hasName && !hasCompany) {
      errors.push('氏名または会社名が読み取れませんでした。')
    }
    
    if (!hasContact) {
      warnings.push('連絡先情報（メール、電話番号）が読み取れませんでした。')
    }
    
    const validationResult: OCRValidationResult = {
      isValid: errors.length === 0,
      warnings,
      errors,
      correctedData: Object.keys(correctedData).length > 0 ? correctedData : undefined
    }
    
    console.log('✅ OCR検証完了:', validationResult)
    console.log('📝 修正されたデータ:', correctedData)
    return validationResult
  }

  // 郵便番号から住所を取得
  const fetchAddressFromPostalCode = async (postalCode: string) => {
    // 〒マークとハイフンを除去
    const cleanPostalCode = postalCode.replace(/[〒ー-]/g, '')
    
    console.log('📍 郵便番号検索開始:', { postalCode, cleanPostalCode })
    
    // 7桁の数字でない場合は処理しない
    if (!/^\d{7}$/.test(cleanPostalCode)) {
      console.log('⚠️ 郵便番号が7桁の数字ではありません:', cleanPostalCode)
      return
    }
    
    try {
      // 郵便番号検索APIを使用（zipcloud）
      const apiUrl = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanPostalCode}`
      console.log('🔍 API呼び出し:', apiUrl)
      
      const response = await fetch(apiUrl)
      const data = await response.json()
      
      console.log('📥 APIレスポンス:', JSON.stringify(data, null, 2))
      
      if (data.status === 200 && data.results && data.results.length > 0) {
        const result = data.results[0]
        console.log('✅ 住所データ取得成功:', result)
        
        const prefecture = result.prefcode ? getPrefectureName(result.prefcode) : result.address1 || ''
        const city = result.address2 || ''
        const address = result.address3 || ''
        
        console.log('📝 設定する住所データ:', { prefecture, city, address })
        
        setCompanyData(prev => {
          const newData = {
            ...prev,
            prefecture: prefecture || prev.prefecture,
            city: city || prev.city,
            address: address || prev.address,
          }
          console.log('✅ 会社データを更新しました:', newData)
          return newData
        })
        
        // 成功メッセージを表示
        if (prefecture || city) {
          const addressText = `${prefecture} ${city} ${address}`.trim()
          console.log('✅ 住所を設定しました:', addressText)
          setPostalCodeStatus({
            message: `住所を設定しました: ${addressText}`,
            type: 'success'
          })
          // 5秒後にメッセージを消す
          setTimeout(() => setPostalCodeStatus(null), 5000)
        }
      } else {
        console.warn('⚠️ 住所が見つかりませんでした:', data)
        const errorMsg = data.message || '住所が見つかりませんでした'
        console.warn('エラーメッセージ:', errorMsg)
        setPostalCodeStatus({
          message: `郵便番号から住所を取得できませんでした: ${errorMsg}`,
          type: 'error'
        })
        setTimeout(() => setPostalCodeStatus(null), 5000)
      }
    } catch (error) {
      console.error('❌ 郵便番号検索エラー:', error)
      const errorMsg = error instanceof Error ? error.message : '郵便番号検索に失敗しました'
      console.error('エラー詳細:', errorMsg)
      setPostalCodeStatus({
        message: `郵便番号検索エラー: ${errorMsg}`,
        type: 'error'
      })
      setTimeout(() => setPostalCodeStatus(null), 5000)
      // エラーが発生しても続行
    }
  }

  // 都道府県コードから都道府県名を取得
  const getPrefectureName = (code: string): string => {
    const prefectureMap: Record<string, string> = {
      '01': '北海道', '02': '青森県', '03': '岩手県', '04': '宮城県', '05': '秋田県',
      '06': '山形県', '07': '福島県', '08': '茨城県', '09': '栃木県', '10': '群馬県',
      '11': '埼玉県', '12': '千葉県', '13': '東京都', '14': '神奈川県', '15': '新潟県',
      '16': '富山県', '17': '石川県', '18': '福井県', '19': '山梨県', '20': '長野県',
      '21': '岐阜県', '22': '静岡県', '23': '愛知県', '24': '三重県', '25': '滋賀県',
      '26': '京都府', '27': '大阪府', '28': '兵庫県', '29': '奈良県', '30': '和歌山県',
      '31': '鳥取県', '32': '島根県', '33': '岡山県', '34': '広島県', '35': '山口県',
      '36': '徳島県', '37': '香川県', '38': '愛媛県', '39': '高知県', '40': '福岡県',
      '41': '佐賀県', '42': '長崎県', '43': '熊本県', '44': '大分県', '45': '宮崎県',
      '46': '鹿児島県', '47': '沖縄県'
    }
    return prefectureMap[code] || code
  }

  const fetchCompanyIntel = async () => {
    if (!companyData.website) {
      setCompanyIntelStatus({
        message: 'WebサイトのURLを入力してください',
        type: 'error',
      })
      return
    }

    try {
      setIsFetchingCompanyIntel(true)
      setCompanyIntelStatus({
        message: 'Webサイトから情報を取得しています...',
        type: 'info',
      })

      const response = await fetch('/api/company-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: companyData.website,
          companyName: companyData.name, // 会社名を渡す
          // 住所情報（同名他社の排除に使用）
          companyAddress: companyData.address,
          companyPrefecture: companyData.prefecture,
          companyCity: companyData.city,
          forceExternalSearch: useExternalCompanySources,
          options: {
            industries,
            employeeRanges,
            revenueRanges,
          },
        }),
      })

      let result: any = null
      try {
        result = await response.json()
      } catch {
        // noop
      }
      if (!response.ok) {
        // エラーの詳細をログに出力（デバッグ用）
        console.error('❌ API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          result: result,
        })
        
        // 429エラー（クォータ超過）の場合は特別なメッセージを表示
        if (response.status === 429) {
          // 実際のエラーメッセージを確認
          const errorMessage = result?.error || result?.details || 'OpenAI APIの利用制限に達しました'
          console.error('❌ 429 Error Details:', {
            error: result?.error,
            details: result?.details,
            fullResult: result,
          })
          throw new Error(`${errorMessage}。しばらく時間をおいてから再度お試しください。`)
        }
        const base = result?.error || 'Web情報の取得に失敗しました'
        const details = result?.details ? `\n${String(result.details).slice(0, 300)}` : ''
        const meta = result?.meta ? `\n(${JSON.stringify(result.meta).slice(0, 300)})` : ''
        throw new Error(`${base}${details}${meta}`)
      }

      const intel = result?.data || {}
      setCompanyIntelMeta(result?.meta || null)
      setCompanyIntel(intel)
      setCompanyData(prev => ({
        ...prev,
        industry: intel.industry || prev.industry,
        employeeCount: intel.employeeCount || prev.employeeCount,
        annualRevenue: intel.annualRevenue || prev.annualRevenue,
        // 会社名（カナ）をセット（取得できた場合のみ）
        nameKana: intel.companyNameKana || prev.nameKana,
        // Web検索から取得した追加情報をセット
        establishedDate: intel.establishedDate || prev.establishedDate,
        representativeName: intel.representativeName || prev.representativeName,
        companyPhone: intel.phone || prev.companyPhone,
        fax: intel.fax || prev.fax,
        businessDescription: intel.businessDescription || prev.businessDescription,
        // 資本金を自動セット（取得できた場合のみ）
        capital: intel.capital || prev.capital,
        // 決算月を自動セット（取得できた場合のみ）
        fiscalYearEnd: intel.fiscalYearEnd || prev.fiscalYearEnd,
        // 入力項目以外で取得した情報は「取得情報」に箇条書きでセット
        retrievedInfo: (() => {
          const lines: string[] = []
          // 主要製品/サービスは取得情報のトップに
          if (Array.isArray(intel.products) && intel.products.length > 0) {
            lines.push(`- 主要製品: ${intel.products.slice(0, 5).join(' / ')}`)
          }
          if (Array.isArray(intel.services) && intel.services.length > 0) {
            lines.push(`- 主要サービス: ${intel.services.slice(0, 5).join(' / ')}`)
          }
          // 最新の売上/従業員数も見えるように表示（上場企業の一次情報優先）
          if (intel.latestRevenueText) {
            lines.push(`- 売上高(最新): ${intel.latestRevenueText}`)
          }
          if (intel.latestEmployeesText) {
            lines.push(`- 従業員数(最新): ${intel.latestEmployeesText}`)
          }
          if (Array.isArray(intel.extraBullets) && intel.extraBullets.length > 0) {
            lines.push(...intel.extraBullets.map((line: string) => `- ${line}`))
          }
          if (lines.length > 0) return lines.join('\n')
          return intel.summary || intel.rawNotes || prev.retrievedInfo
        })(),
      }))

      setCompanyIntelStatus({
        message: 'Web情報を取得し、フォームに反映しました',
        type: 'success',
      })
    } catch (error) {
      console.error('❌ Web情報取得エラー:', error)
      let message = error instanceof Error ? error.message : 'Web情報の取得に失敗しました'
      
      // 429エラー（クォータ超過）の場合はより分かりやすいメッセージに
      if (error instanceof Error && (
        error.message.includes('429') ||
        error.message.includes('quota') ||
        error.message.includes('exceeded') ||
        error.message.includes('利用制限')
      )) {
        message = 'OpenAI APIの利用制限に達しました。しばらく時間をおいてから再度お試しください。'
      }
      
      setCompanyIntelStatus({
        message,
        type: 'error',
      })
    } finally {
      setIsFetchingCompanyIntel(false)
      setTimeout(() => setCompanyIntelStatus(null), 6000)
    }
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
      
      // アバターをアップロード（ファイルが選択されている場合）
      let avatarUrl = profileData.avatarUrl
      if (avatarFile) {
        try {
          console.log('📤 アバターをアップロードします...')
          const uploadedUrl = await uploadAvatar(user.id)
          if (uploadedUrl) {
            avatarUrl = uploadedUrl
            // プレビューも更新
            setAvatarPreview(uploadedUrl)
            setProfileData(prev => ({ ...prev, avatarUrl: uploadedUrl }))
          }
        } catch (uploadError) {
          console.error('❌ アバターアップロードエラー:', uploadError)
          setErrors({ avatar: uploadError instanceof Error ? uploadError.message : 'アバターのアップロードに失敗しました' })
          setIsLoading(false)
          return
        }
      }
      
      // プロファイルを作成または更新（upsert）
      console.log('📝 プロフィールを保存します:', {
        user_id: user.id,
        email: user.email,
        name: profileData.name,
        avatar_url: avatarUrl,
      })
      
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          email: user.email, // NOT NULL制約があるためemailを追加
          name: profileData.name,
          name_kana: profileData.nameKana || null,
          department: profileData.department || null,
          phone: profileData.phone || null,
          mobile: profileData.mobile || null,
          avatar_url: avatarUrl || null,
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
      const retrievedInfoPayload = companyIntel
        ? companyIntel
        : (companyData.retrievedInfo ? { summary: companyData.retrievedInfo } : null)
      
      if (!companyId) {
        // 会社を作成
        console.log('📝 新しい会社を作成します:', companyData.name)
        
        // DB保存直前に住所を正規化（県・市・町名番地を適切に分割）
        const normalizedAddress = await normalizeAddressForSave(companyData)
        console.log('📍 正規化済み住所:', normalizedAddress)
        
        const insertData = {
          name: companyData.name,
          name_kana: companyData.nameKana || null,
          industry: companyData.industry || null,
          employee_count: companyData.employeeCount || null,
          annual_revenue: companyData.annualRevenue || null,
          website: companyData.website || null,
          email: companyData.email || null,
          postal_code: companyData.postalCode || null,
          prefecture: normalizedAddress.prefecture || null,
          city: normalizedAddress.city || null,
          address: normalizedAddress.address || null,
          // Web検索から取得した追加フィールド
          established_date: companyData.establishedDate || null,
          representative_name: companyData.representativeName || null,
          phone: companyData.companyPhone || null,
          fax: companyData.fax || null,
          business_description: companyData.businessDescription || null,
          capital: companyData.capital || null,
          fiscal_year_end: companyData.fiscalYearEnd ? parseInt(companyData.fiscalYearEnd) : null,
          ...(retrievedInfoPayload ? { retrieved_info: retrievedInfoPayload } : {}),
        }
        console.log('📝 会社データ挿入:', JSON.stringify(insertData, null, 2))

        // RLSポリシーの関係で、INSERT後すぐにSELECTすると失敗するため、
        // まずINSERTのみ実行し、その後会社名で検索してIDを取得する
        const { error: insertError } = await supabase
          .from('companies')
          .insert(insertData)

        if (insertError) {
          console.error('Company insert error:', insertError)
          console.error('Company insert error (JSON):', JSON.stringify(insertError, null, 2))
          throw new Error(`会社情報の作成に失敗しました: ${insertError.message || insertError.code || insertError.hint || '不明なエラー'}`)
        }

        // 挿入した会社のIDを取得（会社名とWebサイトで特定）
        // 注意: プロファイル更新後でないとRLSで取得できないため、一時的にservice roleが必要
        // または、挿入時に返されるIDを使用できるように、SupabaseでRLSポリシーを更新する必要がある
        // ここでは会社名で検索する（同名企業がある場合は最新のものを使用）
        const { data: insertedCompany, error: selectError } = await supabase
          .from('companies')
          .select('id')
          .eq('name', companyData.name)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (selectError) {
          console.error('Company select error:', selectError)
          // SELECTエラーでも続行を試みる（RLSの問題の可能性）
        }

        if (!insertedCompany?.id) {
          // RLSの問題でSELECTできない場合、別の方法で取得を試みる
          console.log('⚠️ 通常のSELECTでIDを取得できませんでした。RPC経由で取得を試みます...')

          // 最後に挿入された会社を取得（名前一致）
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_latest_company_by_name', {
            company_name: companyData.name
          })

          if (rpcError || !rpcData) {
            console.error('RPC error:', rpcError)
            throw new Error('会社情報の作成に失敗しました（IDが取得できませんでした）。Supabaseの管理画面でRLSポリシーを確認してください。')
          }
          companyId = rpcData
        } else {
          companyId = insertedCompany.id
        }

        if (!companyId) {
          throw new Error('会社情報の作成に失敗しました（IDが取得できませんでした）')
        }
        console.log('✅ 会社作成完了:', companyId)

        // 会社資料をアップロード（会社作成後）
        let documentPaths: string[] = []
        if (companyDocuments.length > 0) {
          try {
            documentPaths = await uploadCompanyDocuments(companyId)
            console.log('✅ 会社資料アップロード完了:', documentPaths.length, 'ファイル')
            
            // アップロードした資料パスを会社情報に更新
            if (documentPaths.length > 0) {
              const { error: updateDocsError } = await supabase
                .from('companies')
                .update({ documents_urls: documentPaths })
                .eq('id', companyId)
              
              if (updateDocsError) {
                console.error('会社資料パス更新エラー:', updateDocsError)
              }
            }
          } catch (docError) {
            console.error('会社資料アップロードエラー（続行）:', docError)
            // 資料アップロードが失敗しても続行
          }
        }
        
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
        // 会社資料をアップロード
        let documentPaths: string[] = []
        if (companyDocuments.length > 0) {
          try {
            documentPaths = await uploadCompanyDocuments(companyId)
            console.log('✅ 会社資料アップロード完了:', documentPaths.length, 'ファイル')
          } catch (docError) {
            console.error('会社資料アップロードエラー（続行）:', docError)
            // 資料アップロードが失敗しても続行
          }
        }

        // 既存の資料パスを取得
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('documents_urls')
          .eq('id', companyId)
          .single()

        const existingDocuments = existingCompany?.documents_urls || []
        const allDocuments = Array.isArray(existingDocuments) 
          ? [...existingDocuments, ...documentPaths]
          : documentPaths

        // DB保存直前に住所を正規化（県・市・町名番地を適切に分割）
        const normalizedAddress = await normalizeAddressForSave(companyData)
        console.log('📍 正規化済み住所（更新）:', normalizedAddress)

        const { error: updateError } = await supabase
          .from('companies')
          .update({
            name: companyData.name,
            name_kana: companyData.nameKana || null,
            industry: companyData.industry || null,
            employee_count: companyData.employeeCount || null,
            annual_revenue: companyData.annualRevenue || null,
            website: companyData.website || null,
            email: companyData.email || null,
            postal_code: companyData.postalCode || null,
            prefecture: normalizedAddress.prefecture || null,
            city: normalizedAddress.city || null,
            address: normalizedAddress.address || null,
            documents_urls: allDocuments.length > 0 ? allDocuments : null,
            // Web検索から取得した追加フィールド
            established_date: companyData.establishedDate || null,
            representative_name: companyData.representativeName || null,
            phone: companyData.companyPhone || null,
            fax: companyData.fax || null,
            business_description: companyData.businessDescription || null,
            capital: companyData.capital || null,
            fiscal_year_end: companyData.fiscalYearEnd ? parseInt(companyData.fiscalYearEnd) : null,
            ...(retrievedInfoPayload ? { retrieved_info: retrievedInfoPayload } : {}),
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 pt-24 pb-12 px-4">
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
                      名刺の画像（JPEG、PNG）またはPDFをアップロードすると、自動で情報を読み取ります
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
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
                  
                  {/* OCR検証結果の表示 */}
                  {ocrValidation && (
                    <div className="space-y-2">
                      {ocrValidation.correctedData && (
                        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                          <p className="text-sm font-bold text-blue-800 mb-2">
                            ✅ 自動修正が適用されました
                          </p>
                          <p className="text-sm text-blue-700 mb-2">
                            読み取った郵便番号と住所を照合し、正しい住所に自動修正しました。修正後の情報が下のフォームに反映されています。
                          </p>
                          {ocrValidation.warnings.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-blue-200">
                              <ul className="list-disc list-inside space-y-1">
                                {ocrValidation.warnings.map((warning, index) => (
                                  <li key={index} className="text-sm text-blue-600">{warning}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      {!ocrValidation.correctedData && ocrValidation.errors.length > 0 && (
                        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                          <p className="text-sm font-bold text-red-800 mb-2">
                            ⚠️ 重要な問題が検出されました
                          </p>
                          <ul className="list-disc list-inside space-y-1">
                            {ocrValidation.errors.map((error, index) => (
                              <li key={index} className="text-sm text-red-700">{error}</li>
                            ))}
                          </ul>
                          <p className="text-xs text-red-600 mt-2 font-medium">
                            📝 この情報を使用する前に、読み取り結果を確認・修正してください。
                          </p>
                        </div>
                      )}
                      {!ocrValidation.correctedData && ocrValidation.warnings.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm font-semibold text-yellow-800 mb-2">
                            ⚠️ 確認が必要な項目があります
                          </p>
                          <ul className="list-disc list-inside space-y-1">
                            {ocrValidation.warnings.map((warning, index) => (
                              <li key={index} className="text-sm text-yellow-700">{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {ocrValidation.errors.length === 0 && ocrValidation.warnings.length === 0 && !ocrValidation.correctedData && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm text-green-700 font-medium">
                            ✅ 読み取り結果に問題は見つかりませんでした。
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {errors.ocr && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-red-600">{errors.ocr}</p>
                    </div>
                  )}
                  
                  {/* アップロードした名刺画像の表示 */}
                  {uploadedFile?.dataUrl && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                      <h4 className="font-semibold mb-3">アップロードした名刺</h4>
                      <div className="flex justify-center">
                        {uploadedFile.mimeType.toLowerCase().includes('pdf') ? (
                          <div className="w-full max-w-xl border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center gap-3">
                              <FileText className="w-6 h-6 text-red-600" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{uploadedFile.name}</p>
                                <p className="text-xs text-gray-600">PDF（1ページ目を解析します）</p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={openPdfPreview}
                              >
                                PDFを開く
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={uploadedFile.dataUrl}
                            alt="アップロードした名刺"
                            className="max-w-full h-auto max-h-96 rounded-lg shadow-md object-contain"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* PDF表示（ポップアップがブロックされた場合のフォールバック） */}
                  <Dialog
                    open={pdfViewerOpen}
                    onOpenChange={(open) => {
                      if (!open && pdfViewerUrl) {
                        URL.revokeObjectURL(pdfViewerUrl)
                        setPdfViewerUrl(null)
                      }
                      setPdfViewerOpen(open)
                    }}
                  >
                    <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl h-[calc(100vh-2rem)] max-h-[90vh] p-0 overflow-hidden">
                      <div className="flex h-full flex-col">
                        <div className="border-b bg-white px-4 py-3">
                          <DialogHeader>
                            <DialogTitle>PDFプレビュー</DialogTitle>
                          </DialogHeader>
                        </div>

                        <div className="flex items-center justify-between gap-3 border-b bg-white px-4 py-3">
                          <p className="text-sm text-gray-600 truncate">{uploadedFile?.name}</p>
                          <Button type="button" variant="outline" onClick={openPdfInNewTab}>
                            別タブで開く
                          </Button>
                        </div>

                        <div className="flex-1 bg-gray-50 p-2">
                          {pdfViewerUrl ? (
                            <iframe
                              title="PDF Preview"
                              src={pdfViewerUrl}
                              className="h-full w-full rounded-md bg-white"
                            />
                          ) : (
                            <div className="text-sm text-gray-600">PDFを表示できませんでした。</div>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-3 text-lg">読み取り結果</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {ocrResult.personName && (
                        <div className="flex items-start">
                          <span className="font-semibold text-gray-700 w-24 flex-shrink-0">氏名:</span>
                          <span className="text-gray-900">{ocrResult.personName}</span>
                        </div>
                      )}
                      {ocrResult.personNameKana && (
                        <div className="flex items-start">
                          <span className="font-semibold text-gray-700 w-24 flex-shrink-0">氏名(カナ):</span>
                          <span className="text-gray-900">{ocrResult.personNameKana}</span>
                        </div>
                      )}
                      {ocrResult.department && (
                        <div className="flex items-start">
                          <span className="font-semibold text-gray-700 w-24 flex-shrink-0">部署:</span>
                          <span className="text-gray-900">{ocrResult.department}</span>
                        </div>
                      )}
                      {ocrResult.companyName && (
                        <div className="flex items-start md:col-span-2">
                          <span className="font-semibold text-gray-700 w-24 flex-shrink-0">会社名:</span>
                          <span className="text-gray-900">{ocrResult.companyName}</span>
                        </div>
                      )}
                      {ocrResult.email && (
                        <div className="flex items-start md:col-span-2">
                          <span className="font-semibold text-gray-700 w-24 flex-shrink-0">メール:</span>
                          <span className="text-gray-900 break-all">{ocrResult.email}</span>
                        </div>
                      )}
                      {ocrResult.phone && (
                        <div className="flex items-start">
                          <span className="font-semibold text-gray-700 w-24 flex-shrink-0">電話:</span>
                          <span className="text-gray-900">{ocrResult.phone}</span>
                        </div>
                      )}
                      {ocrResult.mobile && (
                        <div className="flex items-start">
                          <span className="font-semibold text-gray-700 w-24 flex-shrink-0">携帯:</span>
                          <span className="text-gray-900">{ocrResult.mobile}</span>
                        </div>
                      )}
                      {ocrResult.postalCode && (
                        <div className="flex items-start">
                          <span className="font-semibold text-gray-700 w-24 flex-shrink-0">郵便番号:</span>
                          <span className="text-gray-900">〒{ocrResult.postalCode}</span>
                        </div>
                      )}
                      {ocrResult.address && (
                        <div className="flex items-start md:col-span-2">
                          <span className="font-semibold text-gray-700 w-24 flex-shrink-0">住所:</span>
                          <span className="text-gray-900 break-words">{ocrResult.address}</span>
                        </div>
                      )}
                      {ocrResult.website && (
                        <div className="flex items-start md:col-span-2">
                          <span className="font-semibold text-gray-700 w-24 flex-shrink-0">ウェブサイト:</span>
                          <span className="text-blue-600 break-all">{ocrResult.website}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* 読み取れなかった項目の表示 */}
                    {!ocrResult.personName && !ocrResult.companyName && !ocrResult.email && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                        ⚠️ 一部の情報が読み取れませんでした。手動で入力してください。
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setScanStep(1)
                        setUploadedFile(null)
                        setOcrResult(null)
                        setOcrValidation(null)
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
                {/* アバターアップロード */}
                <div className="flex flex-col items-center gap-4 mb-6">
                  <Label>プロフィール写真（任意）</Label>
                  <div 
                    className={`
                      relative border-2 border-dashed rounded-lg p-4 transition-colors
                      ${isDraggingAvatar 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                      }
                    `}
                    onDragOver={handleAvatarDragOver}
                    onDragLeave={handleAvatarDragLeave}
                    onDrop={handleAvatarDrop}
                  >
                    {avatarPreview || profileData.avatarUrl ? (
                      <div className="relative">
                        <img
                          src={avatarPreview || profileData.avatarUrl || ''}
                          alt="アバタープレビュー"
                          className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarFile(null)
                            setAvatarPreview(null)
                            setProfileData(prev => ({ ...prev, avatarUrl: '' }))
                            if (avatarInputRef.current) {
                              avatarInputRef.current.value = ''
                            }
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                          <User size={32} className="text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500 text-center">ドラッグ＆ドロップ<br />またはクリック</p>
                      </div>
                    )}
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleAvatarSelect}
                      className="hidden"
                      id="avatar-upload"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="w-auto"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={16} />
                        アップロード中...
                      </>
                    ) : (
                      <>
                        <Camera size={16} className="mr-2" />
                        {avatarPreview || profileData.avatarUrl ? '写真を変更' : '写真を選択'}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500">JPEG、PNG形式（最大5MB）</p>
                  {errors.avatar && (
                    <p className="text-sm text-red-500">{errors.avatar}</p>
                  )}
                </div>
                
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
                {/* ウェブサイト入力とWeb検索ボタン（トップに配置） */}
                <div className="grid gap-2 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="website" className="font-semibold">ウェブサイト</Label>
                    <button
                      type="button"
                      onClick={() => setShowWebSearchHelp(true)}
                      className="w-5 h-5 rounded-full bg-gray-400 hover:bg-gray-500 text-white text-xs font-bold flex items-center justify-center transition-colors"
                      title="Web情報取得について"
                    >
                      ?
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="website"
                      value={companyData.website}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://example.com"
                      className="sm:flex-1 bg-white"
                    />
                    <Button
                      type="button"
                      onClick={fetchCompanyIntel}
                      disabled={isFetchingCompanyIntel}
                      className="sm:w-44 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
                    >
                      {isFetchingCompanyIntel ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          取得中...
                        </>
                      ) : (
                        <>
                          <Globe size={18} />
                          Web情報取得
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600">
                    会社のウェブサイトから業種・従業員数・売上などの情報を自動取得します
                  </p>
                  <label className="flex items-center gap-2 text-xs text-gray-600 select-none">
                    <input
                      type="checkbox"
                      checked={useExternalCompanySources}
                      onChange={(e) => setUseExternalCompanySources(e.target.checked)}
                      className="h-4 w-4"
                    />
                    外部企業情報サイトも検索する（従業員数/年商/拠点などの補完に有効）
                  </label>
                  {companyIntelStatus && (
                    <div className={`text-xs p-2 rounded ${
                      companyIntelStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                      companyIntelStatus.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                      'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {companyIntelStatus.message}
                    </div>
                  )}
                </div>

                {/* Web検索ヘルプポップアップ */}
                {showWebSearchHelp && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowWebSearchHelp(false)}>
                    <div className="bg-white rounded-lg shadow-xl max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Web情報取得について</h3>
                        <button
                          type="button"
                          onClick={() => setShowWebSearchHelp(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="space-y-3 text-sm text-gray-700">
                        <p>
                          <strong>Web情報取得機能</strong>は、入力されたウェブサイトから会社情報を自動的に取得し、フォームに入力する機能です。
                        </p>
                        <p className="font-semibold">取得できる情報:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          <li>業種</li>
                          <li>従業員数</li>
                          <li>年間売上</li>
                          <li>会社名（カナ）</li>
                          <li>主要製品・サービス</li>
                          <li>拠点情報</li>
                        </ul>
                        <p className="text-xs text-gray-500 mt-4">
                          ※ 「外部企業情報サイトも検索する」にチェックを入れると、求人サイトや企業データベースからも情報を補完します。
                        </p>
                      </div>
                      <div className="mt-6 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowWebSearchHelp(false)}
                          className="px-6"
                        >
                          閉じる
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

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

                {/* 住所情報（会社名カナの下に配置） */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="postalCode">郵便番号</Label>
                    <Input
                      id="postalCode"
                      value={companyData.postalCode}
                      onChange={(e) => {
                        const value = e.target.value
                        setCompanyData(prev => ({ ...prev, postalCode: value }))
                        setPostalCodeStatus(null) // 入力中はステータスをクリア
                        // 郵便番号が7桁になったら自動的に住所を取得
                        const cleanPostalCode = value.replace(/[ー-]/g, '')
                        if (cleanPostalCode.length === 7 && /^\d{7}$/.test(cleanPostalCode)) {
                          setPostalCodeStatus({
                            message: '住所を検索中...',
                            type: 'info'
                          })
                          fetchAddressFromPostalCode(value)
                        }
                      }}
                      onBlur={(e) => {
                        // フォーカスが外れた時にも住所を取得
                        const value = e.target.value
                        const cleanPostalCode = value.replace(/[ー-]/g, '')
                        if (cleanPostalCode.length === 7 && /^\d{7}$/.test(cleanPostalCode)) {
                          setPostalCodeStatus({
                            message: '住所を検索中...',
                            type: 'info'
                          })
                          fetchAddressFromPostalCode(value)
                        }
                      }}
                      placeholder="150-0001"
                    />
                    {postalCodeStatus && (
                      <div className={`text-xs p-2 rounded ${
                        postalCodeStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                        postalCodeStatus.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {postalCodeStatus.message}
                      </div>
                    )}
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
                  <Label htmlFor="address">町名番地以下</Label>
                  <Input
                    id="address"
                    value={companyData.address}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="名駅1-1-1 JPタワー名古屋25階"
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fiscalYearEnd">決算月</Label>
                    <select
                      id="fiscalYearEnd"
                      value={companyData.fiscalYearEnd}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, fiscalYearEnd: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="">選択してください</option>
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={String(i + 1)}>{i + 1}月</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="companyEmail">メールアドレス</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={companyData.email}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="info@example.com"
                    />
                  </div>
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="retrievedInfo">追加情報</Label>
                  <textarea
                    id="retrievedInfo"
                    value={companyData.retrievedInfo}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, retrievedInfo: e.target.value }))}
                    placeholder="Web情報取得で取得した内容（製品、工場、支店、店舗数など）が表示されます"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 min-h-[120px]"
                  />
                  <p className="text-xs text-gray-500">
                    取得結果やメモを保存できます。保存すると「追加情報」フィールドとして記録されます。
                  </p>
                  {companyIntelMeta && (
                    <details className="mt-2 rounded border border-gray-200 bg-gray-50 p-3">
                      <summary className="cursor-pointer text-xs font-medium text-gray-700">
                        デバッグ: 取得テキスト（プレビュー）
                      </summary>
                      <div className="mt-2 space-y-2">
                        <div className="text-[11px] text-gray-600">
                          method: {String(companyIntelMeta.method || '')}
                          {companyIntelMeta.firecrawlStatus ? ` / firecrawlStatus: ${companyIntelMeta.firecrawlStatus}` : ''}
                        </div>
                        {(companyIntelMeta.directDetails || companyIntelMeta.directException) && (
                          <div>
                            <div className="text-[11px] font-semibold text-gray-700 mb-1">公式HP取得エラー詳細</div>
                            <pre className="whitespace-pre-wrap break-words rounded border bg-white p-2 text-[11px] text-gray-800 max-h-48 overflow-auto">
{String(companyIntelMeta.directDetails || companyIntelMeta.directException || '(なし)')}
                            </pre>
                          </div>
                        )}
                        <div>
                          <div className="text-[11px] font-semibold text-gray-700 mb-1">公式HPプレビュー</div>
                          <pre className="whitespace-pre-wrap break-words rounded border bg-white p-2 text-[11px] text-gray-800 max-h-48 overflow-auto">
{String(companyIntelMeta.officialPreview || '(なし)')}
                          </pre>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold text-gray-700 mb-1">外部情報サイトプレビュー</div>
                          <pre className="whitespace-pre-wrap break-words rounded border bg-white p-2 text-[11px] text-gray-800 max-h-48 overflow-auto">
{String(companyIntelMeta.externalPreview || '(なし)')}
                          </pre>
                        </div>
                        {companyIntelMeta.externalMeta && (
                          <div>
                            <div className="text-[11px] font-semibold text-gray-700 mb-1">外部検索ログ（queries / results / fetchLogs）</div>
                            <pre className="whitespace-pre-wrap break-words rounded border bg-white p-2 text-[11px] text-gray-800 max-h-72 overflow-auto">
{JSON.stringify(companyIntelMeta.externalMeta, null, 2)}
                            </pre>
                          </div>
                        )}
                        {companyIntelMeta.directDetails && (
                          <div>
                            <div className="text-[11px] font-semibold text-gray-700 mb-1">通常fetchエラー詳細</div>
                            <pre className="whitespace-pre-wrap break-words rounded border bg-white p-2 text-[11px] text-gray-800 max-h-48 overflow-auto">
{String(companyIntelMeta.directDetails || '(なし)')}
                            </pre>
                          </div>
                        )}
                        {companyIntelMeta.directException && (
                          <div>
                            <div className="text-[11px] font-semibold text-gray-700 mb-1">通常fetch例外</div>
                            <pre className="whitespace-pre-wrap break-words rounded border bg-white p-2 text-[11px] text-gray-800 max-h-48 overflow-auto">
{String(companyIntelMeta.directException || '(なし)')}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
                
                {/* 会社資料アップロード */}
                <div className="grid gap-2">
                  <Label>会社資料（任意）</Label>
                  <FileUpload
                    files={companyDocuments}
                    onFilesChange={setCompanyDocuments}
                    acceptedTypes={['application/pdf', 'image/jpeg', 'image/png']}
                    maxSize={10 * 1024 * 1024}
                    multiple={true}
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

