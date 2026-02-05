/**
 * メッセージ処理のカスタムhook
 * 
 * Start画面のメッセージ送信・クイック返信ロジックを管理
 * 
 * @module hooks/useMessageHandlers
 */

import { useState } from "react";
import { toast } from "sonner";
import type { SessionData, Message } from "@/types/consulting";
import { SUBCATEGORY_MAP } from "@/lib/consulting/constants";
import { loadConversationId, saveConversationId } from "@/lib/utils/session-storage";

type UseMessageHandlersProps = {
  currentSession: SessionData | undefined;
  activeSessionId: string;
  allSessions: SessionData[];
  setAllSessions: React.Dispatch<React.SetStateAction<SessionData[]>>;
  attachedFiles: File[];
  clearFiles: () => void;
  resetTranscript: () => void;
};

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
  attachedFiles,
  clearFiles,
  resetTranscript,
}: UseMessageHandlersProps) {
  const [inputValue, setInputValue] = useState("");

  /**
   * メッセージ送信ハンドラー
   * ユーザーメッセージを送信し、Dify経由でAI応答を取得
   */
  const handleSendMessage = async () => {
    if (!currentSession) return;
    if (!inputValue.trim() && attachedFiles.length === 0) return;

    let messageContent = inputValue;

    // 添付ファイルがあればファイル名を追記
    if (attachedFiles.length > 0) {
      const fileNames = attachedFiles.map(f => f.name).join(", ");
      messageContent += `\n\n添付ファイル: ${fileNames}`;
    }

    const msgLen = currentSession?.messages?.length ?? 0;
    const tempUserMessage: Message = {
      id: msgLen + 1,
      type: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    // 楽観的UI更新（即座に表示）
    setAllSessions(allSessions.map(s =>
      s.id === activeSessionId
        ? { ...s, messages: [...(s.messages ?? []), tempUserMessage], lastUpdated: new Date() }
        : s
    ));
    
    const originalInput = inputValue;
    setInputValue("");
    clearFiles();
    resetTranscript();

    try {
      // sessionStorageからconversation_id取得（高速）
      let conversationId = loadConversationId(currentSession.id);
      
      // なければReact Stateから
      if (!conversationId && currentSession.conversationId) {
        conversationId = currentSession.conversationId;
      }

      // API呼び出し
      const res = await fetch(`/api/consulting/sessions/${currentSession.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageContent,
          conversationId  // Difyに渡す
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      
      // conversation_idをsessionStorageにキャッシュ
      if (data.conversation_id) {
        saveConversationId(currentSession.id, data.conversation_id);
      }
      
      // React State更新（サーバーの応答で上書き）
      setAllSessions(allSessions.map(s =>
        s.id === activeSessionId
          ? { 
              ...s, 
              messages: data.messages || s.messages,
              conversationId: data.conversation_id,
              lastUpdated: new Date()
            }
          : s
      ));

    } catch (error) {
      console.error('Failed to send message:', error);
      
      // エラー時は楽観的更新をロールバック
      setAllSessions(allSessions.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: s.messages.filter(m => m.id !== tempUserMessage.id) }
          : s
      ));
      
      // 入力内容を復元
      setInputValue(originalInput);
      
      // エラー通知
      toast.error('メッセージ送信に失敗しました', {
        description: 'もう一度お試しください。'
      });
    }
  };

  /**
   * クイック返信ハンドラー
   * カテゴリボタン・サブカテゴリボタンからの選択を処理
   * 
   * @param reply - 選択された返信内容
   * @param isCategory - カテゴリ選択かどうか（サブカテゴリ表示トリガー）
   */
  const handleQuickReply = (reply: string, isCategory: boolean = false) => {
    if (!currentSession) return;
    const msgLen = currentSession?.messages?.length ?? 0;
    const newMessage: Message = {
      id: msgLen + 1,
      type: "user",
      content: reply,
      timestamp: new Date(),
    };

    setAllSessions(allSessions.map(s =>
      s.id === activeSessionId
        ? {
          ...s,
          name: s.name === "新規相談" ? reply : s.name,
          messages: [...(s.messages ?? []), newMessage],
          lastUpdated: new Date()
        }
        : s
    ));

    if (isCategory && reply !== "その他") {
      setTimeout(() => {
        const subcategories = SUBCATEGORY_MAP[reply] || [];
        const aiResponse: Message = {
          id: msgLen + 2,
          type: "ai",
          content: `「${reply}」についてですね。さらに詳しくお聞かせください。具体的にはどのような課題でしょうか？`,
          timestamp: new Date(),
          interactive: {
            type: "subcategory-buttons",
            data: subcategories,
            selectedCategory: reply
          }
        };

        setAllSessions(prevSessions => prevSessions.map(s =>
          s.id === activeSessionId
            ? { ...s, messages: [...(s.messages ?? []), aiResponse], lastUpdated: new Date() }
            : s
        ));
      }, 800);
    } else if (reply === "その他") {
      setTimeout(() => {
        const aiResponse: Message = {
          id: msgLen + 2,
          type: "ai",
          content: "承知しました。どのような課題でしょうか？自由に入力してください。",
          timestamp: new Date(),
          interactive: {
            type: "custom-input"
          }
        };

        setAllSessions(prevSessions => prevSessions.map(s =>
          s.id === activeSessionId
            ? { ...s, messages: [...(s.messages ?? []), aiResponse], lastUpdated: new Date() }
            : s
        ));
      }, 800);
    }
  };

  return {
    inputValue,
    setInputValue,
    handleSendMessage,
    handleQuickReply,
  };
}
