/**
 * メッセージ処理のカスタムhook
 * 
 * Start画面のメッセージ送信・クイック返信ロジックを管理
 * 
 * @module hooks/useMessageHandlers
 */

import { useState } from "react";
import type { SessionData, Message } from "@/types/consulting";
import { SUBCATEGORY_MAP } from "@/lib/consulting/constants";

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
   * ユーザーメッセージを送信し、AI応答をシミュレート
   */
  const handleSendMessage = async () => {
    if (!currentSession) return;
    if (!inputValue.trim() && attachedFiles.length === 0) return;

    let messageContent = inputValue;

    if (attachedFiles.length > 0) {
      const fileNames = attachedFiles.map(f => f.name).join(", ");
      messageContent += attachedFiles.length > 0 ? `\n\n添付ファイル: ${fileNames}` : "";
    }

    const msgLen = currentSession?.messages?.length ?? 0;
    const newMessage: Message = {
      id: msgLen + 1,
      type: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    setAllSessions(allSessions.map(s =>
      s.id === activeSessionId
        ? { ...s, messages: [...(s.messages ?? []), newMessage], lastUpdated: new Date() }
        : s
    ));
    setInputValue("");
    clearFiles();
    resetTranscript();

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: msgLen + 2,
        type: "ai",
        content: "ご入力ありがとうございます。内容を分析しています。詳しい情報があれば、より具体的な提案が可能です。",
        timestamp: new Date(),
      };

      setAllSessions(prevSessions => prevSessions.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: [...(s.messages ?? []), aiResponse], lastUpdated: new Date() }
          : s
      ));
    }, 1000);
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
