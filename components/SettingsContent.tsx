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
  Upload
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import FileUpload from '@/components/FileUpload'
import DocumentItem from '@/components/DocumentItem'

interface SettingsContentProps {
  user: {
    id: string
    email?: string
  }
  profile: any
  company: any
  subscription: any
}

export default function SettingsContent({ user, profile, company, subscription, initialTab }: SettingsContentProps & { initialTab?: string }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(initialTab || 'account')
  const [isLoading, setIsLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [companyDocuments, setCompanyDocuments] = useState<File[]>([])
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false)
  const [existingDocumentPaths, setExistingDocumentPaths] = useState<string[]>(company?.documents_urls || [])
  const [postalCodeStatus, setPostalCodeStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // プロフィール情報の状態
  const [profileData, setProfileData] = useState({
    name: profile?.name || '',
    name_kana: profile?.name_kana || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    mobile: profile?.mobile || '',
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
          department: profileData.department || null,
          avatar_url: avatarUrl || null,
        })
        .eq('user_id', currentUser.id)

      if (error) {
        console.error('プロフィール更新エラー:', error)
        throw new Error(`プロフィール情報の更新に失敗しました: ${error.message}`)
      }

      alert('プロフィール情報を更新しました')
      router.refresh()
    } catch (error) {
      console.error('エラー:', error)
      const errorMessage = error instanceof Error ? error.message : 'プロフィール情報の更新に失敗しました'
      alert(errorMessage)
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
          documents_urls: allDocuments.length > 0 ? allDocuments : null,
        })
        .eq('id', company.id)

      if (error) throw error

      if (companyDocuments.length > 0) {
        setCompanyDocuments([]) // アップロード後、ファイルリストをクリア
      }

      alert('会社情報を更新しました')
      router.refresh()
    } catch (error) {
      console.error('エラー:', error)
      alert('会社情報の更新に失敗しました')
    } finally {
      setIsLoading(false)
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
      standard: 'Standard',
      enterprise: 'Enterprise',
    }
    return plans[planType] || planType
  }

  // プラン変更（実際の実装はStripe連携が必要）
  const handleChangePlan = async (newPlan: string) => {
    if (confirm(`${getPlanName(newPlan)}プランに変更しますか？`)) {
      alert('プラン変更機能は準備中です')
      // TODO: Stripe連携を実装
    }
  }

  // LPの料金プラン情報
  const plans = [
    {
      name: 'Free',
      subtitle: 'まずは体験してみたい方へ',
      price: '0',
      unit: '円',
      features: ['AIチャットで経営相談（月5回まで）', '基本レポート出力機能', '簡易データ分析'],
      planType: 'free',
    },
    {
      name: 'Standard',
      subtitle: '本格的な経営支援を受けたい方へ',
      price: '12,000',
      unit: '円/月',
      features: ['無制限AIコンサルティング', '詳細データベース連携・分析', 'カスタムレポート作成', 'メールサポート対応'],
      planType: 'standard',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      subtitle: '大規模組織向けカスタムプラン',
      price: 'お問い合わせ',
      unit: '',
      features: [
        'すべての機能＋独自カスタマイズ',
        '専任AIコンサルタント入稀入',
        'セキュリティ監査・オンプレ対応',
        '24時間優先サポート',
      ],
      planType: 'enterprise',
    },
  ]

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg">
        <TabsTrigger 
          value="account" 
          className={`data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm ${
            activeTab === 'account' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'
          }`}
        >
          <User className="w-4 h-4 mr-2" />
          アカウント
        </TabsTrigger>
        <TabsTrigger 
          value="plan"
          className={`data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm ${
            activeTab === 'plan' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'
          }`}
        >
          <Shield className="w-4 h-4 mr-2" />
          プラン
        </TabsTrigger>
        <TabsTrigger 
          value="billing"
          className={`data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm ${
            activeTab === 'billing' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'
          }`}
        >
          <FileText className="w-4 h-4 mr-2" />
          請求情報
        </TabsTrigger>
        <TabsTrigger 
          value="payment"
          className={`data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm ${
            activeTab === 'payment' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'
          }`}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          支払情報
        </TabsTrigger>
      </TabsList>

      {/* アカウント管理タブ */}
      <TabsContent value="account" className="mt-6 space-y-6">
        {/* プロフィール情報 */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="bg-blue-50 border-b border-blue-200 rounded-t-lg px-6 py-4">
            <CardTitle>プロフィール情報</CardTitle>
            <CardDescription>個人情報を変更できます</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
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
          </CardContent>
        </Card>

        {/* 会社情報 */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="bg-blue-50 border-b border-blue-200 rounded-t-lg px-6 py-4">
            <CardTitle>会社情報</CardTitle>
            <CardDescription>会社の基本情報を変更できます</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
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
              />
            </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="address">町名番地以下</Label>
                <Input
                  id="address"
                  value={companyData.address}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
            </div>
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
              <Label htmlFor="website">ウェブサイト</Label>
              <Input
                id="website"
                value={companyData.website}
                onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
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
                <Label htmlFor="employee_count">従業員数</Label>
                <select
                  id="employee_count"
                  value={companyData.employee_count}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, employee_count: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
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
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="">選択してください</option>
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
              <Label htmlFor="business_description">事業内容</Label>
              <textarea
                id="business_description"
                value={companyData.business_description}
                onChange={(e) => setCompanyData(prev => ({ ...prev, business_description: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 min-h-[100px]"
              />
            </div>
            
            {/* 会社資料アップロード */}
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

        {/* パスワード変更 */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="bg-blue-50 border-b border-blue-200 rounded-t-lg px-6 py-4">
            <CardTitle>パスワード変更</CardTitle>
            <CardDescription>アカウントのパスワードを変更できます</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
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

      {/* プラン変更タブ */}
      <TabsContent value="plan" className="mt-6">
        <Card className="bg-white border border-gray-200">
          <CardHeader className="bg-blue-50 border-b border-blue-200 rounded-t-lg px-6 py-4">
            <CardTitle>プラン管理</CardTitle>
            <CardDescription>現在のプランと使用状況を確認できます</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-8 p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{getPlanName(profile?.plan_type || 'free')}プラン</h3>
                  {subscription?.status && (
                    <p className="text-sm text-gray-600 mt-1">
                      ステータス: {subscription.status === 'active' ? '有効' : subscription.status}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {subscription?.current_period_end && (
                    <p className="text-sm text-gray-600">
                      次回更新日: {new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card
                  key={plan.planType}
                  className={`${
                    plan.highlighted
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-2 border-blue-500 shadow-xl'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <CardHeader>
                    {plan.highlighted && (
                      <div className="text-xs bg-white/20 rounded-full px-3 py-1 inline-block mb-3">おすすめ</div>
                    )}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <CardTitle className={`text-xl ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                          {plan.name}
                        </CardTitle>
                        <CardDescription className={plan.highlighted ? 'text-white/80' : 'text-gray-500'}>
                          {plan.subtitle}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                          {plan.price === 'お問い合わせ' ? plan.price : `¥${plan.price}`}
                        </div>
                        <div className={`text-sm ${plan.highlighted ? 'text-white/80' : 'text-gray-500'}`}>
                          {plan.unit}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Check className={`w-4 h-4 ${plan.highlighted ? 'text-white' : 'text-blue-500'}`} />
                          <span className={plan.highlighted ? 'text-white/90' : 'text-gray-600'}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full font-bold ${
                        plan.highlighted
                          ? 'bg-white text-blue-600 hover:bg-white/90'
                          : profile?.plan_type === plan.planType
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
                      }`}
                      onClick={() => handleChangePlan(plan.planType)}
                      disabled={profile?.plan_type === plan.planType}
                    >
                      {profile?.plan_type === plan.planType ? '現在のプラン' : 'プランを変更'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* 請求情報タブ */}
      <TabsContent value="billing" className="mt-6">
        <Card className="bg-white border border-gray-200">
          <CardHeader className="bg-blue-50 border-b border-blue-200 rounded-t-lg px-6 py-4">
            <CardTitle>請求履歴</CardTitle>
            <CardDescription>これまでの請求履歴を確認できます</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>請求履歴はまだありません</p>
              <p className="text-sm mt-2">プランを変更すると、ここに請求履歴が表示されます</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* 支払情報タブ */}
      <TabsContent value="payment" className="mt-6">
        <Card className="bg-white border border-gray-200">
          <CardHeader className="bg-blue-50 border-b border-blue-200 rounded-t-lg px-6 py-4">
            <CardTitle>支払い方法</CardTitle>
            <CardDescription>クレジットカードなどの支払い方法を管理できます</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>登録されている支払い方法はありません</p>
              <p className="text-sm mt-2">プランを変更すると、支払い方法の登録が必要になります</p>
              <Button className="mt-4 font-bold" variant="outline">
                支払い方法を追加
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}


