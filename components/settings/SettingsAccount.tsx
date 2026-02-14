"use client"

import { useState, useRef } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Save, Loader2, Camera, X, Key, Upload, Globe } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import FileUpload from "@/components/FileUpload"
import DocumentItem from "@/components/DocumentItem"
import { PlanMeta } from "@/lib/plan-config"

interface SettingsAccountProps {
  user: { id: string; email?: string }
  profile: any
  company: any
  planMeta: PlanMeta
  setActiveTab: (tab: string) => void
}

export default function SettingsAccount({
  user,
  profile,
  company,
  planMeta,
  setActiveTab,
}: SettingsAccountProps) {
  const router = useRouter()
  const [accountSubTab, setAccountSubTab] = useState<"profile" | "company" | "password">("profile")
  const [isLoading, setIsLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [companyDocuments, setCompanyDocuments] = useState<File[]>([])
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false)
  const [existingDocumentPaths, setExistingDocumentPaths] = useState<string[]>(
    company?.documents_urls || []
  )
  const [postalCodeStatus, setPostalCodeStatus] = useState<{
    message: string
    type: "success" | "error" | "info"
  } | null>(null)
  const [refetchingCompany, setRefetchingCompany] = useState(false)

  // プロフィール情報の状態
  const [profileData, setProfileData] = useState({
    name: profile?.name || "",
    name_kana: profile?.name_kana || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    mobile: profile?.mobile || "",
    position: profile?.position || "",
    department: profile?.department || "",
  })

  // 会社情報の状態
  const [companyData, setCompanyData] = useState({
    name: company?.name || "",
    name_kana: company?.name_kana || "",
    corporate_number: company?.corporate_number || "",
    postal_code: company?.postal_code || "",
    prefecture: company?.prefecture || "",
    city: company?.city || "",
    address: company?.address || "",
    phone: company?.phone || "",
    fax: company?.fax || "",
    email: company?.email || "",
    website: company?.website || "",
    industry: company?.industry || "",
    employee_count: company?.employee_count || "",
    capital: company?.capital || "",
    annual_revenue: company?.annual_revenue || "",
    established_date: company?.established_date || "",
    representative_name: company?.representative_name || "",
    business_description: company?.business_description || "",
    fiscal_year_end:
      company?.fiscal_year_end !== null
        ? String(company.fiscal_year_end === 12 ? 1 : company.fiscal_year_end + 1)
        : "",
  })

  // パスワード変更の状態
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const industries = [
    "情報通信業",
    "製造業",
    "卸売業・小売業",
    "サービス業",
    "建設業",
    "不動産業",
    "金融業・保険業",
    "運輸業・郵便業",
    "医療・福祉",
    "教育・学習支援業",
    "その他",
  ]

  const departments = [
    "営業部",
    "マーケティング部",
    "開発部",
    "技術部",
    "人事部",
    "経理部",
    "総務部",
    "企画部",
    "その他",
  ]

  const employeeRanges = [
    "1-9名",
    "10-29名",
    "30-49名",
    "50-99名",
    "100-299名",
    "300-499名",
    "500-999名",
    "1000名以上",
  ]

  const revenueRanges = [
    "1億円未満",
    "1-5億円",
    "5-10億円",
    "10-50億円",
    "50-100億円",
    "100-500億円",
    "500億円以上",
  ]

  // アバターファイル選択
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    handleAvatarFile(file)
  }

  // アバターファイル処理
  const handleAvatarFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください（JPEG、PNGのみ）")
      return
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("JPEGまたはPNG形式の画像を選択してください")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("ファイルサイズは5MB以下にしてください")
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
        throw new Error("Supabaseが設定されていません")
      }

      const fileExt = avatarFile.name.split(".").pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { data, error } = await supabase.storage.from("avatars").upload(filePath, avatarFile, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) {
        console.error("❌ アバターアップロードエラー:", error)
        if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath)
          return urlData.publicUrl
        }
        throw new Error(`アバターのアップロードに失敗しました: ${error.message}`)
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (error) {
      console.error("❌ アバターアップロードエラー:", error)
      throw error
    }
  }

  // 郵便番号から住所を取得
  const fetchAddressFromPostalCode = async (postalCode: string) => {
    const cleanPostalCode = postalCode.replace(/[〒ー-]/g, "")

    if (!/^\d{7}$/.test(cleanPostalCode)) {
      return
    }

    try {
      const apiUrl = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanPostalCode}`
      const response = await fetch(apiUrl)
      const data = await response.json()

      if (data.status === 200 && data.results && data.results.length > 0) {
        const result = data.results[0]
        const prefecture = result.prefcode
          ? getPrefectureName(result.prefcode)
          : result.address1 || ""
        const city = result.address2 || ""
        const address = result.address3 || ""

        setCompanyData((prev) => ({
          ...prev,
          prefecture: prefecture || prev.prefecture,
          city: city || prev.city,
          address: address || prev.address,
        }))

        if (prefecture || city) {
          const addressText = `${prefecture} ${city} ${address}`.trim()
          setPostalCodeStatus({
            message: `住所を設定しました: ${addressText}`,
            type: "success",
          })
          setTimeout(() => setPostalCodeStatus(null), 5000)
        }
      } else {
        const errorMsg = data.message || "住所が見つかりませんでした"
        setPostalCodeStatus({
          message: `郵便番号から住所を取得できませんでした: ${errorMsg}`,
          type: "error",
        })
        setTimeout(() => setPostalCodeStatus(null), 5000)
      }
    } catch (error) {
      console.error("❌ 郵便番号検索エラー:", error)
      const errorMsg = error instanceof Error ? error.message : "郵便番号検索に失敗しました"
      setPostalCodeStatus({
        message: `郵便番号検索エラー: ${errorMsg}`,
        type: "error",
      })
      setTimeout(() => setPostalCodeStatus(null), 5000)
    }
  }

  // 都道府県コードから都道府県名を取得
  const getPrefectureName = (code: string): string => {
    const prefectureMap: Record<string, string> = {
      "01": "北海道",
      "02": "青森県",
      "03": "岩手県",
      "04": "宮城県",
      "05": "秋田県",
      "06": "山形県",
      "07": "福島県",
      "08": "茨城県",
      "09": "栃木県",
      "10": "群馬県",
      "11": "埼玉県",
      "12": "千葉県",
      "13": "東京都",
      "14": "神奈川県",
      "15": "新潟県",
      "16": "富山県",
      "17": "石川県",
      "18": "福井県",
      "19": "山梨県",
      "20": "長野県",
      "21": "岐阜県",
      "22": "静岡県",
      "23": "愛知県",
      "24": "三重県",
      "25": "滋賀県",
      "26": "京都府",
      "27": "大阪府",
      "28": "兵庫県",
      "29": "奈良県",
      "30": "和歌山県",
      "31": "鳥取県",
      "32": "島根県",
      "33": "岡山県",
      "34": "広島県",
      "35": "山口県",
      "36": "徳島県",
      "37": "香川県",
      "38": "愛媛県",
      "39": "高知県",
      "40": "福岡県",
      "41": "佐賀県",
      "42": "長崎県",
      "43": "熊本県",
      "44": "大分県",
      "45": "宮崎県",
      "46": "鹿児島県",
      "47": "沖縄県",
    }
    return prefectureMap[code] || code
  }

  // プロフィール情報を保存
  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      if (!supabase) {
        alert("Supabaseが設定されていません")
        return
      }

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      if (!currentUser) {
        alert("認証されていません")
        return
      }

      let avatarUrl = profile?.avatar_url
      if (avatarFile) {
        try {
          avatarUrl = (await uploadAvatar(currentUser.id)) || profile?.avatar_url
        } catch (avatarError) {
          console.error("アバターアップロードエラー（続行）:", avatarError)
          const shouldContinue = confirm(
            "アバターのアップロードに失敗しましたが、プロフィール情報の更新を続行しますか？"
          )
          if (!shouldContinue) {
            setIsLoading(false)
            return
          }
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          name: profileData.name,
          name_kana: profileData.name_kana || null,
          phone: profileData.phone || null,
          mobile: profileData.mobile || null,
          position: profileData.position || null,
          department: profileData.department || null,
          avatar_url: avatarUrl || null,
        })
        .eq("user_id", currentUser.id)

      if (error) {
        console.error("プロフィール更新エラー:", error)
        throw new Error(`プロフィール情報の更新に失敗しました: ${error.message}`)
      }

      toast.success("プロフィール情報を更新しました")
      router.refresh()
    } catch (error) {
      console.error("エラー:", error)
      const errorMessage =
        error instanceof Error ? error.message : "プロフィール情報の更新に失敗しました"
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
        throw new Error("Supabaseが設定されていません")
      }

      setIsUploadingDocuments(true)
      const uploadedPaths: string[] = []

      for (const file of companyDocuments) {
        const fileExt = file.name.split(".").pop()
        const fileName = `${companyId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = fileName

        const { error } = await supabase.storage.from("company-documents").upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

        if (error) {
          console.error("ファイルアップロードエラー:", error)
          continue
        }

        uploadedPaths.push(filePath)
      }

      return uploadedPaths
    } catch (error) {
      console.error("会社資料アップロードエラー:", error)
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
        alert("Supabaseが設定されていません")
        return
      }

      if (!company?.id) {
        alert("会社情報が見つかりません")
        return
      }

      let documentPaths: string[] = []
      if (companyDocuments.length > 0) {
        try {
          documentPaths = await uploadCompanyDocuments(company.id)
        } catch (docError) {
          console.error("会社資料アップロードエラー（続行）:", docError)
          const shouldContinue = confirm(
            "会社資料のアップロードに失敗しましたが、会社情報の更新を続行しますか？"
          )
          if (!shouldContinue) {
            setIsLoading(false)
            return
          }
        }
      }

      const allDocuments = [...existingDocumentPaths, ...documentPaths]

      const { error } = await supabase
        .from("companies")
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
          fiscal_year_end: companyData.fiscal_year_end
            ? parseInt(companyData.fiscal_year_end, 10) === 1
              ? 12
              : parseInt(companyData.fiscal_year_end, 10) - 1
            : null,
          documents_urls: allDocuments.length > 0 ? allDocuments : null,
        })
        .eq("id", company.id)

      if (error) throw error

      if (companyDocuments.length > 0) {
        setCompanyDocuments([])
      }

      toast.success("会社情報を更新しました")
      router.refresh()
    } catch (error) {
      console.error("エラー:", error)
      toast.error("会社情報の更新に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefetchCompany = async () => {
    if (!company?.id) return
    setRefetchingCompany(true)
    try {
      const res = await fetch("/api/settings/company-refetch", { method: "POST" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body?.error || "会社情報の再取得に失敗しました")
        return
      }
      toast.success("会社情報を再取得しました。次にダッシュボードを開くと分析が最新になります。")
      router.refresh()
    } catch (error) {
      console.error("Refetch error:", error)
      toast.error("会社情報の再取得に失敗しました")
    } finally {
      setRefetchingCompany(false)
    }
  }

  // パスワード変更
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("新しいパスワードが一致しません")
      return
    }

    if (passwordData.newPassword.length < 6) {
      alert("パスワードは6文字以上にしてください")
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      if (!supabase) {
        alert("Supabaseが設定されていません")
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      })

      if (error) throw error

      alert("パスワードを変更しました")
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      console.error("エラー:", error)
      alert("パスワードの変更に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Tabs
      value={accountSubTab}
      onValueChange={(v) => setAccountSubTab(v as typeof accountSubTab)}
      className="gap-0"
    >
      <TabsList className="mb-4 grid w-full grid-cols-3 rounded-lg border border-gray-200 bg-white p-0">
        <TabsTrigger
          value="profile"
          className="rounded-l-lg border-0 border-r border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 data-[state=active]:border-transparent data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
        >
          プロフィール
        </TabsTrigger>
        <TabsTrigger
          value="company"
          className="border-0 border-r border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 data-[state=active]:border-transparent data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
        >
          会社情報
        </TabsTrigger>
        <TabsTrigger
          value="password"
          className="rounded-r-lg border-0 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
        >
          パスワード変更
        </TabsTrigger>
      </TabsList>

      {/* プロフィール情報 */}
      <TabsContent value="profile" className="space-y-6">
        <Card
          id="profile-section"
          className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
        >
          <CardHeader className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <CardTitle className="text-lg font-semibold text-gray-900">プロフィール情報</CardTitle>
            <CardDescription className="mt-1 text-gray-600">個人情報を変更できます</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 bg-white pt-6">
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <h4 className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900">
                基本情報
              </h4>
              <div className="space-y-4 p-4">
                {/* プロフィール写真 */}
                <div className="grid gap-2">
                  <Label htmlFor="avatar">写真</Label>
                  <div className="flex items-center gap-6">
                    <div
                      className={`relative rounded-lg border-2 border-dashed p-4 transition-colors ${
                        isDraggingAvatar
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 bg-gray-50 hover:border-gray-400"
                      } `}
                      onDragOver={handleAvatarDragOver}
                      onDragLeave={handleAvatarDragLeave}
                      onDrop={handleAvatarDrop}
                    >
                      {avatarPreview ? (
                        <div className="relative">
                          <Avatar className="h-24 w-24">
                            <AvatarImage src={avatarPreview} alt={profileData.name} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-semibold text-white">
                              {profileData.name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <button
                            type="button"
                            onClick={() => {
                              setAvatarFile(null)
                              setAvatarPreview(profile?.avatar_url || null)
                            }}
                            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Avatar className="h-24 w-24">
                            <AvatarFallback className="bg-gray-200">
                              <User size={32} className="text-gray-400" />
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-center text-xs text-gray-500">
                            ドラッグ＆ドロップ
                            <br />
                            またはクリック
                          </p>
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
                        <Camera className="mr-2 h-4 w-4" />
                        写真を選択
                      </Button>
                      <p className="mt-2 text-xs text-gray-500">JPEG、PNG形式（最大5MB）</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">
                      氏名 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name_kana">氏名（カナ）</Label>
                    <Input
                      id="name_kana"
                      value={profileData.name_kana}
                      onChange={(e) =>
                        setProfileData((prev) => ({ ...prev, name_kana: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            </section>
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <h4 className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900">
                連絡先
              </h4>
              <div className="space-y-4 p-4">
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
                      onChange={(e) =>
                        setProfileData((prev) => ({ ...prev, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="mobile">携帯電話</Label>
                    <Input
                      id="mobile"
                      value={profileData.mobile}
                      onChange={(e) =>
                        setProfileData((prev) => ({ ...prev, mobile: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            </section>
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <h4 className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900">
                肩書き・部署
              </h4>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="position">肩書き</Label>
                    <Input
                      id="position"
                      value={profileData.position}
                      onChange={(e) =>
                        setProfileData((prev) => ({ ...prev, position: e.target.value }))
                      }
                      placeholder="例：部長、課長"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="department">部署</Label>
                    <select
                      id="department"
                      value={profileData.department}
                      onChange={(e) =>
                        setProfileData((prev) => ({ ...prev, department: e.target.value }))
                      }
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">選択してください（任意）</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </section>
            <section
              id="profile-account-info"
              className="overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              <h4 className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900">
                アカウント情報
              </h4>
              <div className="space-y-2 p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">現在のプラン:</span> {planMeta.label}（
                  {planMeta.priceLabel}）
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("plan")}
                  className="mt-2"
                >
                  プラン変更
                </Button>
              </div>
            </section>
            <div className="flex justify-end border-t border-gray-200 pt-4">
              <Button
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 font-bold text-white hover:from-blue-600 hover:to-indigo-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
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
        <Card
          id="company-section"
          className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
        >
          <CardHeader className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <CardTitle className="text-lg font-semibold text-gray-900">会社情報</CardTitle>
            <CardDescription className="mt-1 text-gray-600">
              会社の基本情報を変更できます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 bg-white pt-6">
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <h4 className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900">
                基本情報
              </h4>
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="company_name">
                      会社名 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="company_name"
                      value={companyData.name}
                      onChange={(e) =>
                        setCompanyData((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="company_name_kana">会社名（カナ）</Label>
                    <Input
                      id="company_name_kana"
                      value={companyData.name_kana}
                      onChange={(e) =>
                        setCompanyData((prev) => ({ ...prev, name_kana: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="corporate_number">法人番号</Label>
                  <Input
                    id="corporate_number"
                    value={companyData.corporate_number}
                    onChange={(e) =>
                      setCompanyData((prev) => ({ ...prev, corporate_number: e.target.value }))
                    }
                    placeholder="13桁の数字"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="representative_name">代表者名</Label>
                  <Input
                    id="representative_name"
                    value={companyData.representative_name}
                    onChange={(e) =>
                      setCompanyData((prev) => ({ ...prev, representative_name: e.target.value }))
                    }
                    placeholder="例：山田 太郎"
                  />
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <h4 className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900">
                所在地
              </h4>
              <div className="space-y-4 p-4">
                <div className="grid gap-2">
                  <Label htmlFor="postal_code">郵便番号</Label>
                  <div className="flex gap-2">
                    <Input
                      id="postal_code"
                      value={companyData.postal_code}
                      onChange={(e) => {
                        const value = e.target.value
                        setCompanyData((prev) => ({ ...prev, postal_code: value }))
                        if (value.replace(/[^0-9]/g, "").length === 7) {
                          fetchAddressFromPostalCode(value)
                        }
                      }}
                      placeholder="例：123-4567"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fetchAddressFromPostalCode(companyData.postal_code)}
                      disabled={companyData.postal_code.replace(/[^0-9]/g, "").length !== 7}
                    >
                      住所検索
                    </Button>
                  </div>
                  {postalCodeStatus && (
                    <p
                      className={`text-sm ${
                        postalCodeStatus.type === "success"
                          ? "text-green-600"
                          : postalCodeStatus.type === "error"
                            ? "text-red-600"
                            : "text-blue-600"
                      }`}
                    >
                      {postalCodeStatus.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="prefecture">都道府県</Label>
                    <Input
                      id="prefecture"
                      value={companyData.prefecture}
                      onChange={(e) =>
                        setCompanyData((prev) => ({ ...prev, prefecture: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="city">市区町村</Label>
                    <Input
                      id="city"
                      value={companyData.city}
                      onChange={(e) =>
                        setCompanyData((prev) => ({ ...prev, city: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">番地・建物名</Label>
                  <Input
                    id="address"
                    value={companyData.address}
                    onChange={(e) =>
                      setCompanyData((prev) => ({ ...prev, address: e.target.value }))
                    }
                  />
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <h4 className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900">
                連絡先
              </h4>
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="company_phone">電話番号</Label>
                    <Input
                      id="company_phone"
                      value={companyData.phone}
                      onChange={(e) =>
                        setCompanyData((prev) => ({ ...prev, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fax">FAX</Label>
                    <Input
                      id="fax"
                      value={companyData.fax}
                      onChange={(e) => setCompanyData((prev) => ({ ...prev, fax: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="company_email">メールアドレス</Label>
                  <Input
                    id="company_email"
                    type="email"
                    value={companyData.email}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="website">ウェブサイト</Label>
                  <div className="flex gap-2">
                    <Globe className="mt-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="website"
                      value={companyData.website}
                      onChange={(e) =>
                        setCompanyData((prev) => ({ ...prev, website: e.target.value }))
                      }
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <h4 className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900">
                詳細情報
              </h4>
              <div className="space-y-4 p-4">
                <div className="grid gap-2">
                  <Label htmlFor="industry">業種</Label>
                  <select
                    id="industry"
                    value={companyData.industry}
                    onChange={(e) =>
                      setCompanyData((prev) => ({ ...prev, industry: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">選択してください（任意）</option>
                    {industries.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="employee_count">従業員数</Label>
                    <select
                      id="employee_count"
                      value={companyData.employee_count}
                      onChange={(e) =>
                        setCompanyData((prev) => ({ ...prev, employee_count: e.target.value }))
                      }
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">選択してください（任意）</option>
                      {employeeRanges.map((range) => (
                        <option key={range} value={range}>
                          {range}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="capital">資本金</Label>
                    <Input
                      id="capital"
                      value={companyData.capital}
                      onChange={(e) =>
                        setCompanyData((prev) => ({ ...prev, capital: e.target.value }))
                      }
                      placeholder="例：1000万円"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="annual_revenue">年商</Label>
                    <select
                      id="annual_revenue"
                      value={companyData.annual_revenue}
                      onChange={(e) =>
                        setCompanyData((prev) => ({ ...prev, annual_revenue: e.target.value }))
                      }
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">選択してください（任意）</option>
                      {revenueRanges.map((range) => (
                        <option key={range} value={range}>
                          {range}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="established_date">設立年月日</Label>
                    <Input
                      id="established_date"
                      type="date"
                      value={companyData.established_date}
                      onChange={(e) =>
                        setCompanyData((prev) => ({ ...prev, established_date: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fiscal_year_end">決算期（開始月）</Label>
                  <select
                    id="fiscal_year_end"
                    value={companyData.fiscal_year_end}
                    onChange={(e) =>
                      setCompanyData((prev) => ({ ...prev, fiscal_year_end: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">選択してください（任意）</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={month}>
                        {month}月
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">
                    例：4月開始（3月決算）の場合は「4月」を選択
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="business_description">事業内容</Label>
                  <textarea
                    id="business_description"
                    value={companyData.business_description}
                    onChange={(e) =>
                      setCompanyData((prev) => ({ ...prev, business_description: e.target.value }))
                    }
                    className="min-h-[100px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="事業内容を記入してください"
                  />
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <h4 className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900">
                会社資料
              </h4>
              <div className="space-y-4 p-4">
                <div className="grid gap-2">
                  <Label>既存の資料</Label>
                  {existingDocumentPaths.length > 0 ? (
                    <div className="space-y-2">
                      {existingDocumentPaths.map((path, index) => (
                        <DocumentItem
                          key={index}
                          filePath={path}
                          onDelete={async () => {
                            if (confirm("この資料を削除しますか？")) {
                              const newPaths = existingDocumentPaths.filter((_, i) => i !== index)
                              setExistingDocumentPaths(newPaths)
                              toast.success(
                                "資料を削除しました（保存をクリックして確定してください）"
                              )
                            }
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">資料がアップロードされていません</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>新しい資料をアップロード</Label>
                  <FileUpload
                    files={companyDocuments}
                    onFilesChange={(files: File[]) => {
                      setCompanyDocuments(files)
                    }}
                    acceptedTypes={[
                      "application/pdf",
                      "application/msword",
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                      "application/vnd.ms-excel",
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                      "application/vnd.ms-powerpoint",
                      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                    ]}
                    maxSize={10 * 1024 * 1024}
                    multiple={true}
                    label="会社資料をドラッグ＆ドロップまたはクリックして選択"
                  />
                  <p className="text-xs text-gray-500">
                    PDF、Word、Excel、PowerPoint形式（各ファイル最大10MB）
                  </p>
                  {companyDocuments.length > 0 && (
                    <div className="mt-2">
                      <p className="mb-2 text-sm font-medium text-gray-700">選択中のファイル:</p>
                      <ul className="space-y-1">
                        {companyDocuments.map((file, index) => (
                          <li
                            key={index}
                            className="flex items-center justify-between rounded bg-gray-50 p-2 text-sm"
                          >
                            <span className="truncate">{file.name}</span>
                            <button
                              onClick={() => {
                                setCompanyDocuments((prev) => prev.filter((_, i) => i !== index))
                              }}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleRefetchCompany}
                    disabled={refetchingCompany || !company?.id}
                    className="w-full"
                  >
                    {refetchingCompany ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        再取得中...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        会社情報を再取得
                      </>
                    )}
                  </Button>
                  <p className="mt-2 text-xs text-gray-500">
                    登記情報などの最新の会社情報を取得し、ダッシュボードの分析を更新します
                  </p>
                </div>
              </div>
            </section>

            <div className="flex justify-end border-t border-gray-200 pt-4">
              <Button
                onClick={handleSaveCompany}
                disabled={isLoading || isUploadingDocuments}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 font-bold text-white hover:from-blue-600 hover:to-indigo-700"
              >
                {isLoading || isUploadingDocuments ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    会社情報を保存
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* パスワード変更 */}
      <TabsContent value="password" className="space-y-6">
        <Card className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <CardHeader className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <CardTitle className="text-lg font-semibold text-gray-900">パスワード変更</CardTitle>
            <CardDescription className="mt-1 text-gray-600">
              アカウントのパスワードを変更できます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 bg-white pt-6">
            <div className="grid gap-2">
              <Label htmlFor="new_password">
                新しいパスワード <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new_password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                }
                placeholder="6文字以上"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm_password">
                新しいパスワード（確認） <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                placeholder="確認のため再入力"
              />
            </div>
            <div className="flex justify-end border-t border-gray-200 pt-4">
              <Button
                onClick={handleChangePassword}
                disabled={isLoading || !passwordData.newPassword || !passwordData.confirmPassword}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 font-bold text-white hover:from-blue-600 hover:to-indigo-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    変更中...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    パスワードを変更
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
