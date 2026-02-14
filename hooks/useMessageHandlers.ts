/**
 * メッセージ処理のカスタムhook
 *
 * Start画面のメッセージ送信・クイック返信ロジックを管理
 *
 * @module hooks/useMessageHandlers
 */

import { useState } from "react"
import { toast } from "sonner"
import type { SessionData, Message } from "@/types/consulting"
import { SUBCATEGORY_MAP } from "@/lib/consulting/constants"
import { CONSULTING_CATEGORIES } from "@/lib/consulting/category-data"
import {
  loadConversationId,
  saveConversationId,
  loadConsultingState,
  saveConsultingState,
} from "@/lib/utils/session-storage"

type UseMessageHandlersProps = {
  currentSession: SessionData | undefined
  activeSessionId: string
  allSessions: SessionData[]
  setAllSessions: React.Dispatch<React.SetStateAction<SessionData[]>>
  setActiveSessionId: React.Dispatch<React.SetStateAction<string>>
  attachedFiles: File[]
  clearFiles: () => void
  resetTranscript: () => void
  /** プラン上限に達したときの通知（モーダル表示などに使用） */
  onPlanLimitReached?: (message: string) => void
}

/**
 * メッセージ送信・クイック返信のロジックを管理
 *
 * @param props - 依存する状態とハンドラー
 * @returns メッセージ処理の状態とハンドラー
 *
 * @example
 * ```typescript
 * const { inputValue, setInputValue, handleSendMessage, handleQuickReply } = useMessageHandlers({
 *   currentSession,
 *   activeSessionId,
 *   allSessions,
 *   setAllSessions,
 *   attachedFiles,
 *   clearFiles,
 *   resetTranscript,
 * });
 * ```
 */
export function useMessageHandlers({
  currentSession,
  activeSessionId,
  allSessions,
  setAllSessions,
  setActiveSessionId,
  attachedFiles,
  clearFiles,
  resetTranscript,
  onPlanLimitReached,
}: UseMessageHandlersProps) {
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  /**
   * メッセージ送信ハンドラー
   * ユーザーメッセージを送信し、Dify経由でAI応答を取得
   */
  const handleSendMessage = async () => {
    if (!currentSession) return
    if (!inputValue.trim() && attachedFiles.length === 0) return

    // 一時IDの場合はエラー表示（カテゴリ選択が必要）
    if (currentSession.id.startsWith("temp-session-")) {
      toast.error("カテゴリを選択してください", {
        description: "先にカテゴリボタンから課題を選択してください。",
      })
      return
    }

    let messageContent = inputValue

    // 添付ファイルがあればファイル名を追記
    if (attachedFiles.length > 0) {
      const fileNames = attachedFiles.map((f) => f.name).join(", ")
      messageContent += `\n\n添付ファイル: ${fileNames}`
    }

    const msgLen = currentSession?.messages?.length ?? 0
    const tempUserMessage: Message = {
      id: msgLen + 1,
      type: "user",
      content: messageContent,
      timestamp: new Date(),
    }

    // 楽観的UI更新（即座に表示）
    setAllSessions(
      allSessions.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: [...(s.messages ?? []), tempUserMessage], lastUpdated: new Date() }
          : s
      )
    )

    const originalInput = inputValue
    setInputValue("")
    clearFiles()
    resetTranscript()

    // ローディング開始
    setIsLoading(true)

    try {
      // sessionStorageからconversation_id取得（高速）
      let conversationId = loadConversationId(currentSession.id)

      // なければReact Stateから
      if (!conversationId && currentSession.conversationId) {
        conversationId = currentSession.conversationId
      }

      // sessionStorageからカテゴリ情報取得
      const currentState = loadConsultingState()
      const categoryInfo = currentState
        ? {
            selectedCategory: currentState.selectedCategory,
            selectedSubcategory: currentState.selectedSubcategory,
          }
        : undefined

      console.log("📤 Sending message with context:", {
        sessionId: currentSession.id,
        conversationId,
        categoryInfo,
      })

      // API呼び出し
      const res = await fetch(`/api/consulting/sessions/${currentSession.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageContent,
          conversationId, // Difyに渡す
          categoryInfo, // カテゴリ情報を追加
        }),
      })

      if (!res.ok) {
        // エラーメッセージを解釈し、上限超過ならコールバックを優先
        let serverMessage = `メッセージ送信に失敗しました（${res.status}）`
        try {
          const errBody = await res.json()
          serverMessage = (errBody.message || errBody.error || serverMessage) as string
        } catch {
          // レスポンスがJSONでない場合はそのまま
        }
        const isLimitExceeded =
          serverMessage.includes("上限") || serverMessage.includes("limit exceeded")

        if (isLimitExceeded && onPlanLimitReached) {
          onPlanLimitReached(serverMessage)
        } else {
          toast.error("メッセージ送信に失敗しました", {
            description: serverMessage,
          })
        }

        // 楽観的更新をロールバック
        setAllSessions(
          allSessions.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: s.messages.filter((m) => m.id !== tempUserMessage.id) }
              : s
          )
        )
        setInputValue(originalInput)
        return
      }

      const data = await res.json()

      // conversation_idをsessionStorageにキャッシュ
      if (data.conversation_id) {
        saveConversationId(currentSession.id, data.conversation_id)
      }

      // React State更新（サーバーの応答で上書き）
      setAllSessions(
        allSessions.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: data.messages || s.messages,
                conversationId: data.conversation_id,
                lastUpdated: new Date(),
              }
            : s
        )
      )
    } catch (error) {
      console.error("Failed to send message:", error)

      // エラー時は楽観的更新をロールバック
      setAllSessions(
        allSessions.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: s.messages.filter((m) => m.id !== tempUserMessage.id) }
            : s
        )
      )

      // 入力内容を復元
      setInputValue(originalInput)

      // エラー通知
      toast.error("メッセージ送信に失敗しました", {
        description: "もう一度お試しください。",
      })
    } finally {
      // ローディング終了
      setIsLoading(false)
    }
  }

  /**
   * クイック返信ハンドラー
   * カテゴリボタン・サブカテゴリボタンからの選択を処理
   *
   * @param reply - 選択された返信内容
   * @param isCategory - カテゴリ選択かどうか（サブカテゴリ表示トリガー）
   */
  const handleQuickReply = async (reply: string, isCategory: boolean = false) => {
    if (!currentSession) return

    // カテゴリかサブカテゴリかを判定
    const isMainCategory = CONSULTING_CATEGORIES.some((cat) => cat.label === reply)

    // sessionStorageに保存
    const currentState = loadConsultingState()

    if (isMainCategory) {
      // カテゴリ選択時
      console.log("📌 Saving selected category:", reply)
      if (currentState) {
        saveConsultingState({
          ...currentState,
          selectedCategory: reply,
          selectedSubcategory: undefined, // サブカテゴリをリセット
          lastActivity: Date.now(),
        })
      }
    } else if (isCategory) {
      // サブカテゴリ選択時
      console.log("📌 Saving selected subcategory:", reply)
      if (currentState) {
        saveConsultingState({
          ...currentState,
          selectedSubcategory: reply,
          lastActivity: Date.now(),
        })
      }
    }

    const msgLen = currentSession?.messages?.length ?? 0
    const newMessage: Message = {
      id: msgLen + 1,
      type: "user",
      content: reply,
      timestamp: new Date(),
    }

    setAllSessions(
      allSessions.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              name: s.name === "新規相談" ? reply : s.name,
              messages: [...(s.messages ?? []), newMessage],
              lastUpdated: new Date(),
            }
          : s
      )
    )

    // カテゴリ選択時、一時IDの場合はSupabaseセッション作成
    if (isMainCategory && currentSession.id.startsWith("temp-session-")) {
      try {
        const formData = new FormData()
        const categoryValue = typeof reply === "string" ? reply : ""
        const initialMessage = categoryValue.trim() || "新規相談"
        formData.append("category", categoryValue)
        formData.append("initial_message", initialMessage)
        formData.append("title", categoryValue || "新規相談")

        const res = await fetch("/api/consulting/sessions", {
          method: "POST",
          body: formData,
        })

        let data: any = null

        if (!res.ok) {
          // 失敗時: API のエラーメッセージを解釈し、上限超過ならコールバックを優先
          let serverMessage = `セッション作成に失敗しました（${res.status}）`
          try {
            const errBody = await res.json()
            serverMessage = (errBody.message || errBody.error || serverMessage) as string
          } catch {
            // レスポンスがJSONでない場合はそのまま
          }
          const isLimitExceeded =
            serverMessage.includes("上限") || serverMessage.includes("Session limit exceeded")

          if (isLimitExceeded && onPlanLimitReached) {
            // プラン上限到達時はポップアップなどで明示的に案内したいので、
            // 呼び出し元のハンドラーに委譲する（トーストは出さない）
            onPlanLimitReached(serverMessage)
          } else {
            // その他のエラーは従来どおりトーストで通知
            toast.error("セッション作成に失敗しました", {
              description: serverMessage || "一時的に保存されています。もう一度お試しください。",
            })
          }
        } else {
          // 成功時のみレスポンスボディをパース
          data = await res.json()
        }

        if (data?.session?.id) {
          const tempId = currentSession.id
          const realId = data.session.id

          // React State更新: 一時ID → 実ID
          setAllSessions((prevSessions) =>
            prevSessions.map((s) =>
              s.id === tempId
                ? {
                    ...s,
                    id: realId,
                    conversationId: data.session.conversation_id || undefined,
                  }
                : s
            )
          )
          setActiveSessionId(realId)

          // sessionStorage更新
          saveConversationId(realId, data.session.conversation_id || "")
          const currentState = loadConsultingState()
          if (currentState) {
            saveConsultingState({
              ...currentState,
              userChoice: "existing", // 'new' → 'existing' に変更
              activeSessionId: realId,
              openSessionIds: currentState.openSessionIds.map((id) =>
                id === tempId ? realId : id
              ),
              lastActivity: Date.now(),
            })
          }
        }
      } catch (error) {
        console.error("Failed to create session:", error)
        toast.error("セッション作成に失敗しました", {
          description: "一時的に保存されています。もう一度お試しください。",
        })
        // エラー時は一時IDのまま継続（サブカテゴリは表示）
      }
    }

    if (isCategory && reply !== "その他") {
      // カテゴリ選択時のメッセージをSupabaseに保存
      setTimeout(async () => {
        const subcategories = SUBCATEGORY_MAP[reply] || []
        const aiResponseContent = `「${reply}」についてですね。さらに詳しくお聞かせください。具体的にはどのような課題でしょうか？`

        // 楽観的UI更新（即座に表示）
        const aiResponse: Message = {
          id: msgLen + 2,
          type: "ai",
          content: aiResponseContent,
          timestamp: new Date(),
          interactive: {
            type: "subcategory-buttons",
            data: subcategories,
            selectedCategory: reply,
          },
        }

        // 一時ID → 実ID置き換えを考慮して、セッション名でマッチング
        setAllSessions((prevSessions) =>
          prevSessions.map((s) => {
            const isTargetSession = s.name === reply || s.id === activeSessionId
            return isTargetSession
              ? { ...s, messages: [...(s.messages ?? []), aiResponse], lastUpdated: new Date() }
              : s
          })
        )

        // Supabaseに保存（一時IDではない場合のみ）
        if (activeSessionId && !activeSessionId.startsWith("temp-session-")) {
          try {
            await fetch(`/api/consulting/sessions/${activeSessionId}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: reply,
                skipDify: true,
                aiResponse: aiResponseContent,
                categoryInfo: {
                  // カテゴリ情報を送信
                  selectedCategory: reply,
                  subcategories: subcategories,
                },
              }),
            })
            console.log("✅ Category selection messages saved to Supabase")

            // sessionStorageにカテゴリ情報を保存
            const currentState = loadConsultingState()
            if (currentState) {
              saveConsultingState({
                ...currentState,
                selectedCategory: reply,
                lastActivity: Date.now(),
              })
              console.log("✅ Category saved to sessionStorage:", reply)
            }
          } catch (error) {
            console.error("Failed to save category selection messages:", error)
            // エラー時も楽観的更新は維持（UIには表示されている）
          }
        }
      }, 800)
    } else if (reply === "その他") {
      // 「その他」選択時のメッセージをSupabaseに保存
      setTimeout(async () => {
        const aiResponseContent = "承知しました。どのような課題でしょうか？自由に入力してください。"

        // 楽観的UI更新（即座に表示）
        const aiResponse: Message = {
          id: msgLen + 2,
          type: "ai",
          content: aiResponseContent,
          timestamp: new Date(),
          interactive: {
            type: "custom-input",
          },
        }

        setAllSessions((prevSessions) =>
          prevSessions.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: [...(s.messages ?? []), aiResponse], lastUpdated: new Date() }
              : s
          )
        )

        // Supabaseに保存（一時IDではない場合のみ）
        if (activeSessionId && !activeSessionId.startsWith("temp-session-")) {
          try {
            await fetch(`/api/consulting/sessions/${activeSessionId}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: reply,
                skipDify: true,
                aiResponse: aiResponseContent,
              }),
            })
            console.log('✅ "その他" selection messages saved to Supabase')
          } catch (error) {
            console.error('Failed to save "その他" selection messages:', error)
            // エラー時も楽観的更新は維持（UIには表示されている）
          }
        }
      }, 800)
    } else {
      // サブカテゴリ選択時: sessionStorageに保存し、Difyに送ってAI応答を取得
      const currentState = loadConsultingState()
      if (currentState && currentState.selectedCategory) {
        saveConsultingState({
          ...currentState,
          selectedSubcategory: reply,
          lastActivity: Date.now(),
        })
        console.log("✅ Subcategory saved to sessionStorage:", reply)
      }

      // 一時IDの場合はDifyを呼べない（先にカテゴリでセッション作成される想定）
      if (!currentSession || currentSession.id.startsWith("temp-session-")) {
        return
      }

      setIsLoading(true)
      try {
        let conversationId = loadConversationId(currentSession.id)
        if (!conversationId && currentSession.conversationId) {
          conversationId = currentSession.conversationId
        }
        const categoryInfo = currentState
          ? {
              selectedCategory: currentState.selectedCategory,
              selectedSubcategory: reply,
            }
          : undefined

        const res = await fetch(`/api/consulting/sessions/${currentSession.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: reply,
            conversationId,
            categoryInfo,
          }),
        })

        if (!res.ok) {
          throw new Error(`API error: ${res.status} ${res.statusText}`)
        }

        const data = await res.json()
        if (data.conversation_id) {
          saveConversationId(currentSession.id, data.conversation_id)
        }
        setAllSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  messages: data.messages ?? s.messages,
                  conversationId: data.conversation_id,
                  lastUpdated: new Date(),
                }
              : s
          )
        )
      } catch (error) {
        console.error("Subcategory message send failed:", error)
        setAllSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  messages: (s.messages ?? []).filter(
                    (m) => !(m.type === "user" && m.content === reply)
                  ),
                }
              : s
          )
        )
        toast.error("AI応答の取得に失敗しました", { description: "もう一度お試しください。" })
      } finally {
        setIsLoading(false)
      }
    }
  }

  return {
    inputValue,
    setInputValue,
    handleSendMessage,
    handleQuickReply,
    isLoading,
  }
}
