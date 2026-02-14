"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { SimpleSidebar } from "../components/SimpleSidebar"
import { ConsultingHeader } from "../components/ConsultingHeader"
import { ContextPanel } from "../components/ContextPanel"
import { MessageInput } from "../components/MessageInput"
import { ChatView } from "../components/ChatView"
import { MobileNav } from "../components/MobileNav"
import { InitialIssueModal } from "../components/InitialIssueModal"
import type {
  ConsultingSession,
  Message as ConsultingMessage,
  ContextData,
} from "../types/consulting"

// Webサイト分析結果の型定義
interface WebsiteAnalysisResult {
  url: string
  overallScore: number
  analyzedAt: string
  metrics?: {
    mobileScore: number
    desktopScore: number
    seoScore: number
    accessibilityScore: number
    fcp: number
    lcp: number
    cls: number
    ttfb: number
    tbt: number
    hasSSL: boolean
    isMobileFriendly: boolean
  }
  topIssues?: Array<{
    issue: string
    category: string
    severity: string
    impact: string
  }>
}

// Webサイト分析結果をマークダウン形式に変換
const generateAnalysisMarkdown = (data: WebsiteAnalysisResult): string => {
  const { url, overallScore, topIssues, metrics, analyzedAt } = data

  let markdown = `# Webサイト分析レポート\n\n`
  markdown += `**分析日時**: ${new Date(analyzedAt).toLocaleString("ja-JP")}\n\n`
  markdown += `**分析URL**: ${url}\n\n`
  markdown += `---\n\n`

  // 総合スコア
  markdown += `## 📊 総合スコア\n\n`
  markdown += `**${overallScore}** / 100\n\n`

  // メトリクス
  if (metrics) {
    markdown += `## 📈 詳細メトリクス\n\n`
    markdown += `- **モバイルスコア**: ${metrics.mobileScore}\n`
    markdown += `- **デスクトップスコア**: ${metrics.desktopScore}\n`
    markdown += `- **SEOスコア**: ${metrics.seoScore}\n`
    markdown += `- **アクセシビリティスコア**: ${metrics.accessibilityScore}\n\n`

    markdown += `### Core Web Vitals\n\n`
    markdown += `- **FCP (初回描画)**: ${(metrics.fcp / 1000).toFixed(2)}秒\n`
    markdown += `- **LCP (最大描画)**: ${(metrics.lcp / 1000).toFixed(2)}秒\n`
    markdown += `- **CLS (レイアウトシフト)**: ${metrics.cls}\n`
    markdown += `- **TTFB (応答時間)**: ${(metrics.ttfb / 1000).toFixed(2)}秒\n`
    markdown += `- **TBT (ブロック時間)**: ${metrics.tbt}ms\n\n`

    markdown += `### セキュリティ\n\n`
    markdown += `- **SSL対応**: ${metrics.hasSSL ? "✅ 対応済み" : "❌ 未対応"}\n`
    markdown += `- **モバイル対応**: ${metrics.isMobileFriendly ? "✅ 良好" : "❌ 要改善"}\n\n`
  }

  // 課題
  if (topIssues && topIssues.length > 0) {
    markdown += `## ⚠️ 検出された課題\n\n`
    topIssues.forEach((issue, index) => {
      markdown += `### ${index + 1}. ${issue.issue}\n\n`
      markdown += `- **カテゴリ**: ${issue.category}\n`
      markdown += `- **優先度**: ${issue.severity}\n`
      markdown += `- **影響**: ${issue.impact}\n\n`
    })
  }

  markdown += `---\n\n`
  markdown += `このレポートはAI Consulting Zeroで生成されました。\n`

  return markdown
}

export default function ConsultingPage() {
  const router = useRouter()
  const { toast } = useToast()

  // 状態管理
  const [currentSession, setCurrentSession] = useState<ConsultingSession | null>(null)
  const [messages, setMessages] = useState<ConsultingMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [category, setCategory] = useState("general")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [sessions, setSessions] = useState<ConsultingSession[]>([])
  const [mobileTab, setMobileTab] = useState<"chat" | "context" | "proposal">("chat")
  const [showInitialModal, setShowInitialModal] = useState(false)
  const [pendingCategory, setPendingCategory] = useState<string | null>(null)
  const [industryForecast, setIndustryForecast] = useState<
    | {
        shortTerm?: {
          period?: string
          outlook?: "positive" | "neutral" | "negative"
          prediction?: string
        }
      }
    | null
    | undefined
  >(undefined) // undefined: 取得中, null: 取得失敗, object: 取得成功

  // 添付ファイル（Fileオブジェクト）を保持
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])

  // コンテキストデータ
  const [contextData, setContextData] = useState<ContextData>({
    digitalScore: 45, // デモ用
    issueCount: 3, // デモ用
    attachments: [],
    proposal: {
      status: "none",
      id: null,
    },
  })

  // Dify Chatflow の conversation_id を管理
  const [conversationId, setConversationId] = useState<string | null>(() => {
    // 初期値: sessionStorageから復元
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("dify_conversation_id")
    }
    return null
  })

  // conversationId が変更されたら sessionStorage に保存
  useEffect(() => {
    if (conversationId) {
      sessionStorage.setItem("dify_conversation_id", conversationId)
      console.log("💾 Saved conversationId to sessionStorage:", conversationId)
    }
  }, [conversationId])

  // メモリリーク対策: Blob URLのクリーンアップ
  useEffect(() => {
    return () => {
      contextData.attachments.forEach((att) => {
        if (att.url.startsWith("blob:")) {
          URL.revokeObjectURL(att.url)
        }
      })
    }
  }, [contextData.attachments])

  // セッション一覧の取得
  useEffect(() => {
    // 初回ロード時の処理
    const initializePage = async () => {
      // 1. セッション一覧取得
      await fetchSessions()

      // 2. 最新のactiveセッションを復元
      await loadLatestActiveSession()
    }

    initializePage()

    // ダッシュボードのセッションストレージから業界見通しデータを取得（表示のみ、検索不要）
    const loadIndustryForecastFromCache = () => {
      try {
        // セッションストレージのキーを検索（dashboard_data_v9_で始まるキー）
        const keys = Object.keys(sessionStorage)
        const dashboardKey = keys.find((key) => key.startsWith("dashboard_data_v9_"))

        if (dashboardKey) {
          const cached = sessionStorage.getItem(dashboardKey)
          if (cached) {
            const data = JSON.parse(cached)
            if (data.industryForecast) {
              // ダッシュボードと同じデータ構造から shortTerm を取得（グラフ表示用）
              const forecast = data.industryForecast
              setIndustryForecast({
                shortTerm: {
                  period: forecast.shortTerm?.period,
                  outlook: forecast.shortTerm?.outlook,
                  prediction: forecast.shortTerm?.prediction,
                },
              })
              return
            }
          }
        }
        // キャッシュにデータがない場合は null に設定（取得失敗として扱う）
        setIndustryForecast(null)
      } catch (error) {
        console.error("Failed to load industry forecast from cache:", error)
        setIndustryForecast(null)
      }
    }

    loadIndustryForecastFromCache()

    // Webサイト分析結果の読み込み
    const loadWebsiteAnalysisResult = () => {
      try {
        const stored = sessionStorage.getItem("website_analysis_result")
        if (stored) {
          const data = JSON.parse(stored)

          // マークダウン生成
          const mdContent = generateAnalysisMarkdown(data)
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)
          const filename = `website-analysis-report-${timestamp}.md`

          // Blobからファイル作成
          const blob = new Blob([mdContent], { type: "text/markdown" })
          const file = new File([blob], filename, {
            type: "text/markdown",
            lastModified: Date.now(),
          })

          // BlobからURLを生成
          const fileUrl = URL.createObjectURL(file)

          // 添付ファイルに追加
          setAttachmentFiles([file])
          setContextData((prev) => ({
            ...prev,
            attachments: [
              {
                id: `analysis-${Date.now()}`,
                name: filename,
                type: "text/markdown",
                url: fileUrl,
              },
            ],
          }))

          // sessionStorageクリア
          sessionStorage.removeItem("website_analysis_result")

          console.log("Website analysis report attached:", filename)
        }
      } catch (error) {
        console.error("Failed to load website analysis result:", error)
      }
    }

    loadWebsiteAnalysisResult()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/consulting/sessions")
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
        return data.sessions || []
      }
      return []
    } catch (error) {
      console.error("Failed to fetch sessions:", error)
      return []
    }
  }

  // 最新のactiveセッションとメッセージを復元
  const loadLatestActiveSession = async () => {
    try {
      const res = await fetch("/api/consulting/sessions")
      if (!res.ok) return

      const data = await res.json()
      const sessions = data.sessions || []

      // activeステータスの最新セッションを取得
      const activeSession = sessions.find((s: ConsultingSession) => s.status === "active")

      if (activeSession) {
        // セッション情報を設定
        setCurrentSession(activeSession)

        // メッセージ履歴を取得
        const messagesRes = await fetch(`/api/consulting/sessions/${activeSession.id}/messages`)
        if (messagesRes.ok) {
          const messagesData = await messagesRes.json()
          setMessages(messagesData.messages || [])
        }
      }
    } catch (error) {
      console.error("Failed to load latest active session:", error)
    }
  }

  // 添付ファイルアップロード
  const handleFileUpload = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files)

    // Fileオブジェクトを保存（FormData送信用）
    setAttachmentFiles((prev) => [...prev, ...fileArray])

    // UI表示用のメタデータを作成
    const newAttachments = fileArray.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file), // プレビュー用URL
    }))

    setContextData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments],
    }))
  }, [])

  // 添付ファイル削除
  const handleRemoveAttachment = useCallback((id: string) => {
    // UI表示用のメタデータから削除
    setContextData((prev) => {
      const index = prev.attachments.findIndex((att) => att.id === id)

      // Fileオブジェクトも削除
      if (index !== -1) {
        setAttachmentFiles((prevFiles) => prevFiles.filter((_, i) => i !== index))
      }

      return {
        ...prev,
        attachments: prev.attachments.filter((att) => att.id !== id),
      }
    })
  }, [])

  // カテゴリー変更時の処理（モーダルを開く）
  const handleCategoryChange = (selectedCategory: string) => {
    setCategory(selectedCategory)
    setPendingCategory(selectedCategory)
    setShowInitialModal(true)
  }

  // 初期課題送信処理（モーダルから）
  const handleInitialIssueSubmit = async (issue: string) => {
    if (!pendingCategory) return

    try {
      setIsLoading(true)

      // 新規セッション開始時は conversationId をクリア
      setConversationId(null)
      sessionStorage.removeItem("dify_conversation_id")
      console.log("🆕 Starting new session - cleared conversationId")

      // 1. セッション作成（FormDataで添付ファイルも送信）
      const formData = new FormData()
      formData.append("category", pendingCategory)
      formData.append("initial_message", issue)

      // 添付ファイルをFormDataに追加
      attachmentFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file)
      })

      const sessionRes = await fetch("/api/consulting/sessions", {
        method: "POST",
        // Content-Typeはブラウザが自動設定（multipart/form-data）
        body: formData,
      })

      if (!sessionRes.ok) {
        throw new Error("Failed to create session")
      }

      const sessionData = await sessionRes.json()
      const newSession = sessionData.session

      // 2. メッセージAPI経由でDifyに送信（コンテキスト含む、AI応答も取得）
      // このAPIは内部でDifyを呼び出し、AI応答を取得して保存する
      const messageRes = await fetch(`/api/consulting/sessions/${newSession.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: issue,
          conversationId: null, // 新規セッションなので null
        }),
      })

      if (!messageRes.ok) {
        throw new Error("Failed to get AI response")
      }

      const messageData = await messageRes.json()

      // 3. 状態更新（セッションとメッセージ履歴）
      setCurrentSession(messageData.session || newSession)
      setMessages(messageData.messages || [])
      setShowInitialModal(false)
      setPendingCategory(null)

      // Difyから返ってきた conversation_id を保存
      console.log("Received conversation_id from new session:", messageData.conversation_id)
      if (messageData.conversation_id) {
        console.log("Saving conversation_id from new session:", messageData.conversation_id)
        setConversationId(messageData.conversation_id)
      } else {
        console.log("No conversation_id in response from new session")
      }

      // 添付ファイルは保持（相談継続中）

      await fetchSessions()
    } catch (error) {
      console.error("Failed to start consultation:", error)
      toast({
        variant: "destructive",
        title: "エラーが発生しました",
        description: "相談の開始に失敗しました。もう一度お試しください。",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // メッセージ送信
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentSession) return

    const userMessage = inputMessage.trim()
    setInputMessage("")
    setIsTyping(true)

    console.log("📤 Sending message with conversationId:", conversationId || "null")

    // ユーザーメッセージを即座に表示
    const tempUserMessage: ConsultingMessage = {
      id: `temp-${Date.now()}`,
      session_id: currentSession.id,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMessage])

    try {
      const res = await fetch(`/api/consulting/sessions/${currentSession.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationId: conversationId, // Dify会話履歴用
        }),
      })

      if (res.ok) {
        const data = await res.json()
        console.log("📥 API Response:", {
          has_conversation_id: !!data.conversation_id,
          conversation_id: data.conversation_id || "null",
        })

        // メッセージ履歴を更新
        setMessages(data.messages || [])
        setCurrentSession(data.session)

        // Difyから返ってきた conversation_id を保存
        if (data.conversation_id) {
          console.log("💾 Saving conversation_id:", data.conversation_id)
          setConversationId(data.conversation_id)
        } else {
          console.warn("⚠️ No conversation_id in response - Dify may not be maintaining history")
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      toast({
        variant: "destructive",
        title: "メッセージ送信に失敗しました",
        description: "もう一度お試しください。",
      })
      // エラー時は一時表示メッセージを削除
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")))
    } finally {
      setIsTyping(false)
    }
  }

  // セッション終了（課題継続 or 課題完了）
  const handleEndSession = async (status: "active" | "completed") => {
    if (!currentSession) return

    try {
      // ステータスを更新
      const res = await fetch(`/api/consulting/sessions/${currentSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) {
        throw new Error(`Failed to update session: ${res.statusText}`)
      }

      // API呼び出し成功後に状態をクリア
      setCurrentSession(null)
      setMessages([])
      setInputMessage("")
      setCategory("general")
      setConversationId(null) // Dify会話履歴もリセット

      // sessionStorage から conversationId を削除
      sessionStorage.removeItem("dify_conversation_id")
      console.log("🗑️ Cleared conversationId from sessionStorage")

      // 添付ファイルをクリア（相談終了のため）
      setAttachmentFiles([])
      setContextData((prev) => ({ ...prev, attachments: [] }))

      await fetchSessions()

      // ステータスに応じたトースト通知
      toast({
        title: status === "active" ? "相談を一時中断しました" : "相談を完了しました",
        description:
          status === "active"
            ? "左メニューから再開できます。"
            : "お疲れ様でした。また次回もご利用ください。",
      })
    } catch (error) {
      console.error("Failed to update session:", error)
      toast({
        variant: "destructive",
        title: "ステータス更新に失敗しました",
        description: "もう一度お試しいただくか、ページをリロードしてください。",
      })
    }
  }

  // カテゴリーラベル取得
  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      general: "一般相談",
      sales: "売上改善",
      cost: "コスト削減",
      digital: "DX推進",
      hr: "人事・組織",
      strategy: "経営戦略",
    }
    return labels[cat] || "一般相談"
  }

  return (
    <div className="relative h-screen overflow-hidden">
      {/* 初期課題入力モーダル */}
      <InitialIssueModal
        open={showInitialModal}
        category={pendingCategory || category}
        categoryLabel={getCategoryLabel(pendingCategory || category)}
        onClose={() => {
          setShowInitialModal(false)
          setPendingCategory(null)
        }}
        onSubmit={handleInitialIssueSubmit}
        isLoading={isLoading}
        onFileUpload={handleFileUpload}
        attachments={contextData.attachments}
        onRemoveFile={handleRemoveAttachment}
      />

      <div className="flex h-full w-full overflow-hidden">
        {/* 左サイドバー */}
        <SimpleSidebar
          sessions={sessions.map((s) => ({
            id: s.id,
            title: s.title,
            category: s.category,
            current_round: s.current_round,
            max_rounds: s.max_rounds,
            created_at: s.created_at,
            status: s.status,
          }))}
          selectedCategory={category}
          onCategoryChange={handleCategoryChange}
          currentSessionStatus={currentSession?.status}
        />

        {/* メインコンテンツエリア */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* ヘッダー */}
          {currentSession && (
            <ConsultingHeader
              sessionTitle={currentSession.title}
              currentRound={currentSession.current_round}
              maxRounds={currentSession.max_rounds}
              sessionStatus={currentSession.status}
              onEndSession={handleEndSession}
            />
          )}

          {/* モバイルタブナビゲーション */}
          {currentSession && <MobileNav activeTab={mobileTab} onTabChange={setMobileTab} />}

          {/* メインコンテンツ */}
          <div className="flex flex-1 overflow-hidden">
            {/* PC: チャットエリア / モバイル: タブ切替 */}
            <div
              className={`flex flex-1 flex-col overflow-hidden ${mobileTab !== "chat" ? "hidden lg:flex" : "flex"}`}
            >
              <ChatView messages={messages} isTyping={isTyping} />
              <MessageInput
                value={inputMessage}
                onChange={setInputMessage}
                onSend={handleSendMessage}
                category={category}
                onCategoryChange={setCategory}
                isLoading={isLoading || isTyping}
                showCategorySelect={false}
                placeholder="新規の場合は、左メニューからカテゴリーを選択の上相談内容を入力してください。また既存の相談の続きは相談履歴から選択してください。"
                onFileUpload={handleFileUpload}
                disabled={!currentSession}
                hasSession={!!currentSession}
              />
            </div>

            {/* 右サイドパネル（PC: 常時表示 / モバイル: タブで表示） */}
            <div
              className={`bg-muted/30 w-full border-l lg:w-80 ${mobileTab !== "context" ? "hidden lg:block" : "block"}`}
            >
              <ContextPanel
                digitalScore={contextData.digitalScore}
                issueCount={contextData.issueCount}
                attachments={contextData.attachments}
                proposalStatus={contextData.proposal.status}
                proposalId={contextData.proposal.id}
                industryForecast={industryForecast}
                onFileUpload={handleFileUpload}
                onViewProposal={() => {
                  if (contextData.proposal.id) {
                    router.push(`/consulting/reports/${contextData.proposal.id}`)
                  }
                }}
                onDownloadProposal={() => {
                  if (contextData.proposal.id) {
                    window.open(`/api/consulting/reports/${contextData.proposal.id}/pdf`, "_blank")
                  }
                }}
                onRemoveAttachment={handleRemoveAttachment}
                disabled={!currentSession}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
