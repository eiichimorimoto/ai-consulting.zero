"use client"

import { useState, useRef, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Globe,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import FileUpload from "@/components/FileUpload"
import DocumentItem from "@/components/DocumentItem"
import { getPlanMeta, getPlanLimits } from "@/lib/plan-config"
import SettingsPlan from "@/components/settings/SettingsPlan"
import SettingsBilling from "@/components/settings/SettingsBilling"
import SettingsPayment from "@/components/settings/SettingsPayment"
import SettingsAccount from "@/components/settings/SettingsAccount"

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

export default function SettingsContent({
  user,
  profile,
  company,
  subscription,
  monthlySessionCount,
  initialTab,
}: SettingsContentProps & { initialTab?: string }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(initialTab || "account")
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

  const planMeta = getPlanMeta(profile?.plan_type || "free")
  const planLimits = getPlanLimits(profile?.plan_type || "free")
  const sessionsThisMonth = Number(monthlySessionCount ?? 0)
  const usedChats = Number(profile?.monthly_chat_count ?? 0)
  const maxTurnsTotal = planLimits.maxTurnsTotal
  const remainingChats =
    planLimits.isUnlimited || maxTurnsTotal == null ? null : Math.max(0, maxTurnsTotal - usedChats)

  // URL の tab と同期（階層メニューから遷移した場合など）
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) setActiveTab(initialTab)
  }, [initialTab])

  // アカウント設定画面を開いたときは常に画面先頭にスクロールさせる
  useEffect(() => {
    if (typeof window === "undefined") return
    window.scrollTo({ top: 0, behavior: "auto" })
  }, [])

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
    // DBは期末（1-12）。表示は決算開始月（期末の翌月）で保持
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

  // アバターファイル選択（通常のファイル選択）
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    handleAvatarFile(file)
  }

  // アバターファイル処理（共通処理）
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

      // Supabaseストレージにアップロード
      const { data, error } = await supabase.storage.from("avatars").upload(filePath, avatarFile, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) {
        console.error("❌ アバターアップロードエラー:", error)
        // 既にファイルが存在する場合はエラーを無視して続行
        if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
          // 既存ファイルのURLを取得
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath)
          return urlData.publicUrl
        }
        throw new Error(`アバターのアップロードに失敗しました: ${error.message}`)
      }

      // 公開URLを取得
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath)

      console.log("✅ アバターアップロード成功:", urlData.publicUrl)
      return urlData.publicUrl
    } catch (error) {
      console.error("❌ アバターアップロードエラー:", error)
      throw error
    }
  }

  // 郵便番号から住所を取得
  const fetchAddressFromPostalCode = async (postalCode: string) => {
    // 〒マークとハイフンを除去
    const cleanPostalCode = postalCode.replace(/[〒ー-]/g, "")

    console.log("📍 郵便番号検索開始:", { postalCode, cleanPostalCode })

    // 7桁の数字でない場合は処理しない
    if (!/^\d{7}$/.test(cleanPostalCode)) {
      console.log("⚠️ 郵便番号が7桁の数字ではありません:", cleanPostalCode)
      return
    }

    try {
      // 郵便番号検索APIを使用（zipcloud）
      const apiUrl = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanPostalCode}`
      console.log("🔍 API呼び出し:", apiUrl)

      const response = await fetch(apiUrl)
      const data = await response.json()

      console.log("📥 APIレスポンス:", JSON.stringify(data, null, 2))

      if (data.status === 200 && data.results && data.results.length > 0) {
        const result = data.results[0]
        console.log("✅ 住所データ取得成功:", result)

        const prefecture = result.prefcode
          ? getPrefectureName(result.prefcode)
          : result.address1 || ""
        const city = result.address2 || ""
        const address = result.address3 || ""

        console.log("📝 設定する住所データ:", { prefecture, city, address })

        setCompanyData((prev) => {
          const newData = {
            ...prev,
            prefecture: prefecture || prev.prefecture,
            city: city || prev.city,
            address: address || prev.address,
          }
          console.log("✅ 会社データを更新しました:", newData)
          return newData
        })

        // 成功メッセージを表示
        if (prefecture || city) {
          const addressText = `${prefecture} ${city} ${address}`.trim()
          console.log("✅ 住所を設定しました:", addressText)
          setPostalCodeStatus({
            message: `住所を設定しました: ${addressText}`,
            type: "success",
          })
          // 5秒後にメッセージを消す
          setTimeout(() => setPostalCodeStatus(null), 5000)
        }
      } else {
        console.warn("⚠️ 住所が見つかりませんでした:", data)
        const errorMsg = data.message || "住所が見つかりませんでした"
        console.warn("エラーメッセージ:", errorMsg)
        setPostalCodeStatus({
          message: `郵便番号から住所を取得できませんでした: ${errorMsg}`,
          type: "error",
        })
        setTimeout(() => setPostalCodeStatus(null), 5000)
      }
    } catch (error) {
      console.error("❌ 郵便番号検索エラー:", error)
      const errorMsg = error instanceof Error ? error.message : "郵便番号検索に失敗しました"
      console.error("エラー詳細:", errorMsg)
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

      // アバターをアップロード（失敗しても続行）
      let avatarUrl = profile?.avatar_url
      if (avatarFile) {
        try {
          avatarUrl = (await uploadAvatar(currentUser.id)) || profile?.avatar_url
        } catch (avatarError) {
          console.error("アバターアップロードエラー（続行）:", avatarError)
          // アバターアップロードが失敗しても、プロフィール情報の更新は続行
          const shouldContinue = confirm(
            "アバターのアップロードに失敗しましたが、プロフィール情報の更新を続行しますか？"
          )
          if (!shouldContinue) {
            setIsLoading(false)
            return
          }
        }
      }

      // プロフィールを更新
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
      const uploadedPaths: string[] = [] // URLではなくパスを保存

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

        // パスのみを保存（Privateバケットのため）
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

      // 会社資料をアップロード（失敗しても続行）
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

      // 既存の資料パスと新規アップロード分を結合
      const allDocuments = [...existingDocumentPaths, ...documentPaths]

      // 会社情報を更新
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
          // 画面上は決算開始月（1-12）。DBには期末で保存（開始月1→12月、それ以外→開始月-1）
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
        setCompanyDocuments([]) // アップロード後、ファイルリストをクリア
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

  // プラン名を日本語に変換
  const getPlanName = (planType: string) => {
    const plans: Record<string, string> = {
      free: "Free",
      pro: "Pro",
      enterprise: "Enterprise",
    }
    return plans[planType] || planType
  }

  // プラン変更（Stripe連携）
  const [isChangingPlan, setIsChangingPlan] = useState(false)
  const handleChangePlan = async (newPlan: string) => {
    const currentPlan = profile?.plan_type || "free"

    // Enterpriseは問い合わせフロー
    if (newPlan === "enterprise") {
      router.push("/contact")
      return
    }

    // 有料→無料: 解約ページへリダイレクト
    if (currentPlan !== "free" && newPlan === "free") {
      if (confirm("Freeプランへの変更は解約手続きが必要です。解約ページに移動しますか？")) {
        router.push("/account/cancel")
      }
      return
    }

    // Free→有料: Checkoutへリダイレクト
    if (currentPlan === "free" && newPlan !== "free") {
      setIsChangingPlan(true)
      try {
        const res = await fetch("/api/stripe/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planType: newPlan,
            interval: "monthly",
            returnUrl: "/dashboard/settings?tab=plan", // 設定画面に戻る
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (data.url) {
          window.location.href = data.url
          return
        }
        toast.error(data?.error || "Checkout の生成に失敗しました")
      } catch (e) {
        console.error("create-checkout error", e)
        toast.error("プラン変更の処理中にエラーが発生しました")
      } finally {
        setIsChangingPlan(false)
      }
      return
    }

    // 有料→有料: Stripe APIでプラン変更
    if (!confirm(`${getPlanName(newPlan)}プランに変更しますか？`)) return
    setIsChangingPlan(true)
    try {
      const res = await fetch("/api/stripe/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: newPlan, interval: "monthly" }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.redirect) {
        // Free→有料のフォールバック
        window.location.href = data.redirect
        return
      }
      if (!res.ok) {
        toast.error(data?.error || "プラン変更に失敗しました")
        return
      }
      toast.success(`${getPlanName(newPlan)}プランに変更しました`)
      router.refresh()
    } catch (e) {
      console.error("change-plan error", e)
      toast.error("プラン変更の処理中にエラーが発生しました")
    } finally {
      setIsChangingPlan(false)
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full gap-0">
      <div className="sticky top-16 z-10 -mt-1 mb-4 rounded-b-lg bg-white pt-1 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
        <TabsList className="grid w-full grid-cols-4 rounded-lg border border-gray-200 bg-white p-0">
          <TabsTrigger
            value="account"
            className={`rounded-l-lg border-0 border-r border-gray-200 px-4 py-2.5 text-sm font-medium data-[state=active]:border-transparent data-[state=active]:bg-purple-600 data-[state=active]:text-white ${
              activeTab === "account"
                ? "bg-purple-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <User className="mr-2 h-4 w-4" />
            アカウント
          </TabsTrigger>
          <TabsTrigger
            value="plan"
            className={`border-0 border-r border-gray-200 px-4 py-2.5 text-sm font-medium data-[state=active]:border-transparent data-[state=active]:bg-purple-600 data-[state=active]:text-white ${
              activeTab === "plan" ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Shield className="mr-2 h-4 w-4" />
            プラン
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            className={`border-0 border-r border-gray-200 px-4 py-2.5 text-sm font-medium data-[state=active]:border-transparent data-[state=active]:bg-purple-600 data-[state=active]:text-white ${
              activeTab === "billing"
                ? "bg-purple-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FileText className="mr-2 h-4 w-4" />
            請求情報
          </TabsTrigger>
          <TabsTrigger
            value="payment"
            className={`rounded-r-lg border-0 px-4 py-2.5 text-sm font-medium data-[state=active]:bg-purple-600 data-[state=active]:text-white ${
              activeTab === "payment"
                ? "bg-purple-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            支払情報
          </TabsTrigger>
        </TabsList>
      </div>

      {/* アカウント管理タブ */}
      <TabsContent value="account" className="mt-4 space-y-6">
        <SettingsAccount
          user={user}
          profile={profile}
          company={company}
          planMeta={planMeta}
          setActiveTab={setActiveTab}
        />
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
