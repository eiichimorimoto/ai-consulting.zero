'use client'

import { useState, useRef, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  User, 
  CreditCard, 
  FileText, 
  Shield, 
  Save,
  Loader2,
  Camera,
  X,
  Check,
  Key,
  Upload,
  Globe
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import FileUpload from '@/components/FileUpload'
import DocumentItem from '@/components/DocumentItem'
import { getPlanMeta, getPlanLimits } from '@/lib/plan-config'
import SettingsPlan from '@/components/settings/SettingsPlan'
import SettingsBilling from '@/components/settings/SettingsBilling'
import SettingsPayment from '@/components/settings/SettingsPayment'

interface SettingsContentProps {
  user: {
    id: string
    email?: string
  }
  profile: any
  company: any
  subscription: any
   /** 今月の相談セッション数（課題数） */
  monthlySessionCount: number
}

export default function SettingsContent({ user, profile, company, subscription, monthlySessionCount, initialTab }: SettingsContentProps & { initialTab?: string }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(initialTab || 'account')
  const [accountSubTab, setAccountSubTab] = useState<'profile' | 'company' | 'password'>('profile')
  const [isLoading, setIsLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [companyDocuments, setCompanyDocuments] = useState<File[]>([])
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false)
  const [existingDocumentPaths, setExistingDocumentPaths] = useState<string[]>(company?.documents_urls || [])
  const [postalCodeStatus, setPostalCodeStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [refetchingCompany, setRefetchingCompany] = useState(false)

  const planMeta = getPlanMeta(profile?.plan_type || 'free')
  const planLimits = getPlanLimits(profile?.plan_type || 'free')
  const sessionsThisMonth = Number(monthlySessionCount ?? 0)
  const usedChats = Number(profile?.monthly_chat_count ?? 0)
  const maxTurnsTotal = planLimits.maxTurnsTotal
  const remainingChats = planLimits.isUnlimited || maxTurnsTotal == null
    ? null
    : Math.max(0, maxTurnsTotal - usedChats)

  // URL の tab と同期（階層メニューから遷移した場合など）
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) setActiveTab(initialTab)
  }, [initialTab])

  // アカウント設定画面を開いたときは常に画面先頭にスクロールさせる
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  // プロフィール情報の状態
  const [profileData, setProfileData] = useState({
    name: profile?.name || '',
    name_kana: profile?.name_kana || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    mobile: profile?.mobile || '',
    position: profile?.position || '',
    department: profile?.department || '',
  })

  // 会社情報の状態
  const [companyData, setCompanyData] = useState({
    name: company?.name || '',
    name_kana: company?.name_kana || '',
    corporate_number: company?.corporate_number || '',
    postal_code: company?.postal_code || '',
    prefecture: company?.prefecture || '',
    city: company?.city || '',
    address: company?.address || '',
    phone: company?.phone || '',
    fax: company?.fax || '',
    email: company?.email || '',
    website: company?.website || '',
    industry: company?.industry || '',
    employee_count: company?.employee_count || '',
    capital: company?.capital || '',
    annual_revenue: company?.annual_revenue || '',
    established_date: company?.established_date || '',
    representative_name: company?.representative_name || '',
    business_description: company?.business_description || '',
    // DBは期末（1-12）。表示は決算開始月（期末の翌月）で保持
    fiscal_year_end: company?.fiscal_year_end != null
      ? String(company.fiscal_year_end === 12 ? 1 : company.fiscal_year_end + 1)
      : '',
  })

  // パスワード変更の状態
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

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

  // アバターファイル選択（通常のファイル選択）
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    handleAvatarFile(file)
  }

  // アバターファイル処理（共通処理）
  const handleAvatarFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください（JPEG、PNGのみ）')
      return
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('JPEGまたはPNG形式の画像を選択してください')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください')
      return
    }

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)
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

  // アバターアップロード
  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null

    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabaseが設定されていません')
      }

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
        // 既にファイルが存在する場合はエラーを無視して続行
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          // 既存ファイルのURLを取得
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)
          return urlData.publicUrl
        }
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
    }
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

  // プロフィール情報を保存
  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      if (!supabase) {
        alert('Supabaseが設定されていません')
        return
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        alert('認証されていません')
        return
      }

      // アバターをアップロード（失敗しても続行）
      let avatarUrl = profile?.avatar_url
      if (avatarFile) {
        try {
          avatarUrl = await uploadAvatar(currentUser.id) || profile?.avatar_url
        } catch (avatarError) {
          console.error('アバターアップロードエラー（続行）:', avatarError)
          // アバターアップロードが失敗しても、プロフィール情報の更新は続行
          const shouldContinue = confirm('アバターのアップロードに失敗しましたが、プロフィール情報の更新を続行しますか？')
          if (!shouldContinue) {
            setIsLoading(false)
            return
          }
        }
      }

      // プロフィールを更新
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profileData.name,
          name_kana: profileData.name_kana || null,
          phone: profileData.phone || null,
          mobile: profileData.mobile || null,
          position: profileData.position || null,
          department: profileData.department || null,
          avatar_url: avatarUrl || null,
        })
        .eq('user_id', currentUser.id)

      if (error) {
        console.error('プロフィール更新エラー:', error)
        throw new Error(`プロフィール情報の更新に失敗しました: ${error.message}`)
      }

      toast.success('プロフィール情報を更新しました')
      router.refresh()
    } catch (error) {
      console.error('エラー:', error)
      const errorMessage = error instanceof Error ? error.message : 'プロフィール情報の更新に失敗しました'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
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

      setIsUploadingDocuments(true)
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
    } finally {
      setIsUploadingDocuments(false)
    }
  }

  // 会社情報を保存
  const handleSaveCompany = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      if (!supabase) {
        alert('Supabaseが設定されていません')
        return
      }

      if (!company?.id) {
        alert('会社情報が見つかりません')
        return
      }

      // 会社資料をアップロード（失敗しても続行）
      let documentPaths: string[] = []
      if (companyDocuments.length > 0) {
        try {
          documentPaths = await uploadCompanyDocuments(company.id)
        } catch (docError) {
          console.error('会社資料アップロードエラー（続行）:', docError)
          const shouldContinue = confirm('会社資料のアップロードに失敗しましたが、会社情報の更新を続行しますか？')
          if (!shouldContinue) {
            setIsLoading(false)
            return
          }
        }
      }

      // 既存の資料パスと新規アップロード分を結合
      const allDocuments = [...existingDocumentPaths, ...documentPaths]

      // 会社情報を更新
      const { error } = await supabase
        .from('companies')
        .update({
          name: companyData.name,
          name_kana: companyData.name_kana || null,
          corporate_number: companyData.corporate_number || null,
          postal_code: companyData.postal_code || null,
          prefecture: companyData.prefecture || null,
          city: companyData.city || null,
          address: companyData.address || null,
          phone: companyData.phone || null,
          fax: companyData.fax || null,
          email: companyData.email || null,
          website: companyData.website || null,
          industry: companyData.industry || null,
          employee_count: companyData.employee_count || null,
          capital: companyData.capital || null,
          annual_revenue: companyData.annual_revenue || null,
          established_date: companyData.established_date || null,
          representative_name: companyData.representative_name || null,
          business_description: companyData.business_description || null,
          // 画面上は決算開始月（1-12）。DBには期末で保存（開始月1→12月、それ以外→開始月-1）
          fiscal_year_end: companyData.fiscal_year_end
            ? (parseInt(companyData.fiscal_year_end, 10) === 1 ? 12 : parseInt(companyData.fiscal_year_end, 10) - 1)
            : null,
          documents_urls: allDocuments.length > 0 ? allDocuments : null,
        })
        .eq('id', company.id)

      if (error) throw error

      if (companyDocuments.length > 0) {
        setCompanyDocuments([]) // アップロード後、ファイルリストをクリア
      }

      toast.success('会社情報を更新しました')
      router.refresh()
    } catch (error) {
      console.error('エラー:', error)
      toast.error('会社情報の更新に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefetchCompany = async () => {
    if (!company?.id) return
    setRefetchingCompany(true)
    try {
      const res = await fetch('/api/settings/company-refetch', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body?.error || '会社情報の再取得に失敗しました')
        return
      }
      toast.success('会社情報を再取得しました。次にダッシュボードを開くと分析が最新になります。')
      router.refresh()
    } catch (error) {
      console.error('Refetch error:', error)
      toast.error('会社情報の再取得に失敗しました')
    } finally {
      setRefetchingCompany(false)
    }
  }

  // パスワード変更
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('新しいパスワードが一致しません')
      return
    }

    if (passwordData.newPassword.length < 6) {
      alert('パスワードは6文字以上にしてください')
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      if (!supabase) {
        alert('Supabaseが設定されていません')
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      alert('パスワードを変更しました')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error) {
      console.error('エラー:', error)
      alert('パスワードの変更に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // プラン名を日本語に変換
  const getPlanName = (planType: string) => {
    const plans: Record<string, string> = {
      free: 'Free',
      pro: 'Pro',
      enterprise: 'Enterprise',
    }
    return plans[planType] || planType
  }

  // プラン変更（Stripe連携）
  const [isChangingPlan, setIsChangingPlan] = useState(false)
  const handleChangePlan = async (newPlan: string) => {
    const currentPlan = profile?.plan_type || 'free'

    // Enterpriseは問い合わせフロー
    if (newPlan === 'enterprise') {
      router.push('/contact')
      return
    }

    // Free→有料: Checkoutへリダイレクト
    if (currentPlan === 'free' && newPlan !== 'free') {
      setIsChangingPlan(true)
      try {
        const res = await fetch('/api/stripe/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planType: newPlan, interval: 'monthly' }),
        })
        const data = await res.json().catch(() => ({}))
        if (data.url) {
          window.location.href = data.url
          return
        }
        toast.error(data?.error || 'Checkout の生成に失敗しました')
      } catch (e) {
        console.error('create-checkout error', e)
        toast.error('プラン変更の処理中にエラーが発生しました')
      } finally {
        setIsChangingPlan(false)
      }
      return
    }

    // 有料→有料: Stripe APIでプラン変更
    if (!confirm(`${getPlanName(newPlan)}プランに変更しますか？`)) return
    setIsChangingPlan(true)
    try {
      const res = await fetch('/api/stripe/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: newPlan, interval: 'monthly' }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.redirect) {
        // Free→有料のフォールバック
        window.location.href = data.redirect
        return
      }
      if (!res.ok) {
        toast.error(data?.error || 'プラン変更に失敗しました')
        return
      }
      toast.success(`${getPlanName(newPlan)}プランに変更しました`)
      router.refresh()
    } catch (e) {
      console.error('change-plan error', e)
      toast.error('プラン変更の処理中にエラーが発生しました')
    } finally {
      setIsChangingPlan(false)
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full gap-0">
      <div className="sticky top-16 z-10 mb-4 -mt-1 pt-1 bg-white rounded-b-lg shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
        <TabsList className="grid w-full grid-cols-4 bg-white border border-gray-200 rounded-lg p-0">
        <TabsTrigger 
          value="account" 
          className={`border-0 px-4 py-2.5 text-sm font-medium border-r border-gray-200 rounded-l-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-transparent ${
            activeTab === 'account' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <User className="w-4 h-4 mr-2" />
          アカウント
        </TabsTrigger>
        <TabsTrigger 
          value="plan"
          className={`border-0 px-4 py-2.5 text-sm font-medium border-r border-gray-200 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-transparent ${
            activeTab === 'plan' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Shield className="w-4 h-4 mr-2" />
          プラン
        </TabsTrigger>
        <TabsTrigger 
          value="billing"
          className={`border-0 px-4 py-2.5 text-sm font-medium border-r border-gray-200 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-transparent ${
            activeTab === 'billing' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <FileText className="w-4 h-4 mr-2" />
          請求情報
        </TabsTrigger>
        <TabsTrigger 
          value="payment"
          className={`border-0 px-4 py-2.5 text-sm font-medium rounded-r-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white ${
            activeTab === 'payment' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          支払情報
        </TabsTrigger>
        </TabsList>
      </div>

      {/* アカウント管理タブ */}
      <TabsContent value="account" className="mt-4 space-y-6">
        {/* アカウント内サブタブ（プロフィール / 会社情報 / パスワード変更） */}
        <Tabs value={accountSubTab} onValueChange={(v) => setAccountSubTab(v as typeof accountSubTab)} className="gap-0">
          <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200 rounded-lg p-0 mb-4">
            <TabsTrigger
              value="profile"
              className="border-0 px-4 py-2.5 text-sm font-medium border-r border-gray-200 rounded-l-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-transparent text-gray-600 hover:bg-gray-50"
            >
              プロフィール
            </TabsTrigger>
            <TabsTrigger
              value="company"
              className="border-0 px-4 py-2.5 text-sm font-medium border-r border-gray-200 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-transparent text-gray-600 hover:bg-gray-50"
            >
              会社情報
            </TabsTrigger>
            <TabsTrigger
              value="password"
              className="border-0 px-4 py-2.5 text-sm font-medium rounded-r-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-600 hover:bg-gray-50"
            >
              パスワード変更
            </TabsTrigger>
          </TabsList>

          {/* プロフィール情報 */}
          <TabsContent value="profile" className="space-y-6">
        <Card id="profile-section" className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <CardTitle className="text-lg font-semibold text-gray-900">プロフィール情報</CardTitle>
            <CardDescription className="text-gray-600 mt-1">個人情報を変更できます</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 bg-white">
            <section className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <h4 className="text-sm font-semibold text-gray-900 bg-gray-50 border-b border-gray-200 px-4 py-2.5">基本情報</h4>
              <div className="p-4 space-y-4">
            {/* プロフィール写真 */}
            <div className="grid gap-2">
              <Label htmlFor="avatar">写真</Label>
              <div className="flex items-center gap-6">
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
                  {avatarPreview ? (
                    <div className="relative">
                      <Avatar className="w-24 h-24">
                        <AvatarImage src={avatarPreview} alt={profileData.name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl font-semibold">
                          {profileData.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null)
                          setAvatarPreview(profile?.avatar_url || null)
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Avatar className="w-24 h-24">
                        <AvatarFallback className="bg-gray-200">
                          <User size={32} className="text-gray-400" />
                        </AvatarFallback>
                      </Avatar>
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
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    写真を選択
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">JPEG、PNG形式（最大5MB）</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">氏名 <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name_kana">氏名（カナ）</Label>
                <Input
                  id="name_kana"
                  value={profileData.name_kana}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name_kana: e.target.value }))}
                />
              </div>
            </div>
              </div>
            </section>
            <section className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <h4 className="text-sm font-semibold text-gray-900 bg-gray-50 border-b border-gray-200 px-4 py-2.5">連絡先</h4>
              <div className="p-4 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-sm text-gray-500">メールアドレスは変更できません</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">電話番号</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mobile">携帯電話</Label>
                <Input
                  id="mobile"
                  value={profileData.mobile}
                  onChange={(e) => setProfileData(prev => ({ ...prev, mobile: e.target.value }))}
                />
              </div>
            </div>
              </div>
            </section>
            <section className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <h4 className="text-sm font-semibold text-gray-900 bg-gray-50 border-b border-gray-200 px-4 py-2.5">肩書き・部署</h4>
              <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="position">肩書き</Label>
                <Input
                  id="position"
                  value={profileData.position}
                  onChange={(e) => setProfileData(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="例：部長、課長"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="department">部署</Label>
                <select
                  id="department"
                  value={profileData.department}
                  onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">選択してください（任意）</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
              </div>
            </section>
            <section id="profile-account-info" className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <h4 className="text-sm font-semibold text-gray-900 bg-gray-50 border-b border-gray-200 px-4 py-2.5">アカウント情報</h4>
              <div className="p-4 space-y-2">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">現在のプラン:</span>{' '}
                  {planMeta.label}（{planMeta.priceLabel}）
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('plan')}
                  className="mt-2"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  プラン詳細・利用状況を見る
                </Button>
              </div>
            </section>
            <div className="pt-2">
            <Button onClick={handleSaveProfile} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  プロフィールを保存
                </>
              )}
            </Button>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* 会社情報 */}
          <TabsContent value="company" className="space-y-6">
        <Card id="company-section" className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <CardTitle className="text-lg font-semibold text-gray-900">会社情報</CardTitle>
            <CardDescription className="text-gray-600 mt-1">会社の基本情報を変更できます</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 bg-white">
            <section className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <h4 className="text-sm font-semibold text-gray-900 bg-gray-50 border-b border-gray-200 px-4 py-2.5">基本情報</h4>
              <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="company_name">会社名 <span className="text-red-500">*</span></Label>
                <Input
                  id="company_name"
                  value={companyData.name}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company_name_kana">会社名（カナ）</Label>
                <Input
                  id="company_name_kana"
                  value={companyData.name_kana}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, name_kana: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="corporate_number">法人番号</Label>
              <Input
                id="corporate_number"
                value={companyData.corporate_number}
                onChange={(e) => setCompanyData(prev => ({ ...prev, corporate_number: e.target.value }))}
                placeholder="13桁の数字"
              />
            </div>
              </div>
            </section>
            <section className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <h4 className="text-sm font-semibold text-gray-900 bg-gray-50 border-b border-gray-200 px-4 py-2.5">住所</h4>
              <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="postal_code">郵便番号</Label>
                <Input
                  id="postal_code"
                  value={companyData.postal_code}
                  onChange={(e) => {
                    const value = e.target.value
                    setCompanyData(prev => ({ ...prev, postal_code: value }))
                    setPostalCodeStatus(null) // 入力中はステータスをクリア
                    // 郵便番号が7桁になったら自動的に住所を取得
                    const cleanPostalCode = value.replace(/[〒ー-]/g, '')
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
                    const cleanPostalCode = value.replace(/[〒ー-]/g, '')
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
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">市区町村</Label>
                <Input
                  id="city"
                  value={companyData.city}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">町名番地以下</Label>
              <Input
                id="address"
                value={companyData.address}
                onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
              </div>
            </section>
            <section className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <h4 className="text-sm font-semibold text-gray-900 bg-gray-50 border-b border-gray-200 px-4 py-2.5">連絡先</h4>
              <div className="p-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="company_phone">電話番号</Label>
                <Input
                  id="company_phone"
                  value={companyData.phone}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fax">FAX</Label>
                <Input
                  id="fax"
                  value={companyData.fax}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, fax: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company_email">メールアドレス</Label>
                <Input
                  id="company_email"
                  type="email"
                  value={companyData.email}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="website">会社ホームページ</Label>
              <Input
                id="website"
                value={companyData.website}
                onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https:// から入力"
              />
            </div>
              </div>
            </section>
            <section className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <h4 className="text-sm font-semibold text-gray-900 bg-gray-50 border-b border-gray-200 px-4 py-2.5">経営指標</h4>
              <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="industry">業種</Label>
                <select
                  id="industry"
                  value={companyData.industry}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">選択してください</option>
                  {industries.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="employee_count">従業員数</Label>
                <select
                  id="employee_count"
                  value={companyData.employee_count}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, employee_count: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">選択してください</option>
                  {employeeRanges.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="capital">資本金</Label>
                <Input
                  id="capital"
                  value={companyData.capital}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, capital: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="annual_revenue">年間売上</Label>
                <select
                  id="annual_revenue"
                  value={companyData.annual_revenue}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, annual_revenue: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">選択してください（任意）</option>
                  {revenueRanges.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="established_date">設立日</Label>
                <Input
                  id="established_date"
                  type="date"
                  value={companyData.established_date || ''}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, established_date: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="representative_name">代表者名</Label>
                <Input
                  id="representative_name"
                  value={companyData.representative_name}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, representative_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fiscal_year_end">決算開始月</Label>
              <select
                id="fiscal_year_end"
                value={companyData.fiscal_year_end}
                onChange={(e) => setCompanyData(prev => ({ ...prev, fiscal_year_end: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">選択してください（任意）</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={String(i + 1)}>{i + 1}月</option>
                ))}
              </select>
            </div>
              </div>
            </section>
            <section className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <h4 className="text-sm font-semibold text-gray-900 bg-gray-50 border-b border-gray-200 px-4 py-2.5">事業内容</h4>
              <div className="p-4">
            <div className="grid gap-2">
              <Label htmlFor="business_description">事業内容</Label>
              <textarea
                id="business_description"
                value={companyData.business_description}
                onChange={(e) => setCompanyData(prev => ({ ...prev, business_description: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[100px] w-full"
              />
            </div>
              </div>
            </section>

            {/* 追加情報（外部情報検索結果）・デバッグ・再取得 */}
            <section className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <h4 className="text-sm font-semibold text-gray-900 bg-gray-50 border-b border-gray-200 px-4 py-2.5">追加情報（外部情報検索結果）</h4>
              <div className="p-4 space-y-4">
              {company?.retrieved_info && typeof company.retrieved_info === 'object' ? (
                <>
                  <div className="grid gap-2">
                    <Label>取得済みの要約・メモ</Label>
                    <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 min-h-[80px] text-sm text-gray-800 whitespace-pre-wrap">
                      {(company.retrieved_info as Record<string, unknown>).summary != null
                        ? String((company.retrieved_info as Record<string, unknown>).summary)
                        : (company.retrieved_info as Record<string, unknown>).rawNotes != null
                          ? String((company.retrieved_info as Record<string, unknown>).rawNotes)
                          : '（要約・メモはありません）'}
                    </div>
                  </div>
                  <details className="rounded border border-gray-200 bg-gray-50 p-3">
                    <summary className="cursor-pointer text-xs font-medium text-gray-700">保存されている取得情報</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words rounded border bg-white p-2 text-[11px] text-gray-800 max-h-72 overflow-auto">
                      {JSON.stringify(company.retrieved_info, null, 2)}
                    </pre>
                  </details>
                </>
              ) : (
                <p className="text-sm text-gray-500">まだ外部情報の取得がありません。下の「会社情報を再取得」でWebから取得できます。</p>
              )}
              <div className="space-y-2">
                {companyData.website?.trim() ? (
                  <p className="text-sm text-gray-700">
                    会社ホームページのアドレスが登録されています。このURLで再取得します。<br />
                    <span className="font-mono text-xs text-gray-600 break-all">{companyData.website.trim()}</span>
                  </p>
                ) : (
                  <p className="text-sm text-amber-600">会社ホームページのアドレスを上記「連絡先」の下にある「会社ホームページ」欄に入力してから再取得できます。</p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRefetchCompany}
                    disabled={refetchingCompany || !companyData.website?.trim()}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    {refetchingCompany ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Globe className="w-4 h-4 mr-2" />
                    )}
                    会社情報を再取得
                  </Button>
                </div>
              </div>
              </div>
            </section>

            <section className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <h4 className="text-sm font-semibold text-gray-900 bg-gray-50 border-b border-gray-200 px-4 py-2.5">会社資料</h4>
              <div className="p-4">
            <div className="grid gap-2">
              <Label>会社資料</Label>
              <FileUpload
                files={companyDocuments}
                onFilesChange={setCompanyDocuments}
                acceptedTypes={['application/pdf', 'image/jpeg', 'image/png']}
                maxSize={10 * 1024 * 1024}
                multiple={true}
              />
              
              {/* 既存の資料を表示 */}
              {existingDocumentPaths.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">アップロード済み資料:</p>
                  <div className="space-y-2">
                    {existingDocumentPaths.map((path, index) => (
                      <DocumentItem 
                        key={index} 
                        filePath={path} 
                        onDelete={async () => {
                          try {
                            const supabase = createClient()
                            if (!supabase || !company?.id) return

                            // ストレージからファイルを削除
                            const { error: deleteError } = await supabase.storage
                              .from('company-documents')
                              .remove([path])

                            if (deleteError) {
                              console.error('ファイル削除エラー:', deleteError)
                              alert('ファイルの削除に失敗しました')
                              return
                            }

                            // ローカル状態から削除
                            const newPaths = existingDocumentPaths.filter((_, i) => i !== index)
                            setExistingDocumentPaths(newPaths)

                            // データベースからも削除
                            const { error: updateError } = await supabase
                              .from('companies')
                              .update({ documents_urls: newPaths.length > 0 ? newPaths : null })
                              .eq('id', company.id)

                            if (updateError) {
                              console.error('データベース更新エラー:', updateError)
                            }
                          } catch (error) {
                            console.error('削除エラー:', error)
                            alert('ファイルの削除に失敗しました')
                          }
                        }} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
              </div>
            </section>

            <Button onClick={handleSaveCompany} disabled={isLoading || isUploadingDocuments} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  会社情報を保存
                </>
              )}
            </Button>
          </CardContent>
        </Card>
          </TabsContent>

          {/* パスワード変更 */}
          <TabsContent value="password" className="space-y-6">
        <Card id="password-section" className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <CardTitle className="text-lg font-semibold text-gray-900">パスワード変更</CardTitle>
            <CardDescription className="text-gray-600 mt-1">アカウントのパスワードを変更できます</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4 bg-white">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">現在のパスワード</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">新しいパスワード</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>
            <Button onClick={handleChangePassword} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  変更中...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  パスワードを変更
                </>
              )}
            </Button>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </TabsContent>

      {/* プラン変更タブ */}
      <TabsContent value="plan" className="mt-4">
        <SettingsPlan
          profile={profile}
          subscription={subscription}
          planMeta={planMeta}
          planLimits={planLimits}
          sessionsThisMonth={sessionsThisMonth}
          usedChats={usedChats}
          maxTurnsTotal={maxTurnsTotal}
          remainingChats={remainingChats}
          isChangingPlan={isChangingPlan}
          handleChangePlan={handleChangePlan}
        />
      </TabsContent>

      {/* 請求情報タブ */}
      <TabsContent value="billing" className="mt-4">
        <SettingsBilling />
      </TabsContent>

      {/* 支払情報タブ */}
      <TabsContent value="payment" className="mt-4">
        <SettingsPayment />
      </TabsContent>
    </Tabs>
  )
}


