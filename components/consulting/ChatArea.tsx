'use client';

import type { SessionData, CategoryData, Message } from "@/types/consulting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Send, TrendingDown, DollarSign, Edit3, Cpu, Zap, Loader2, User, Volume2, VolumeX, Pin, Download, UserPlus, Briefcase, Scale } from "lucide-react";
import { CHAT, BUTTON } from "@/lib/consulting-ui-tokens";
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { formatAIMessage } from '@/lib/utils/message-formatter';

export interface ChatAreaProps {
  currentSession: SessionData | null;
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
  onQuickReply: (reply: string, isCategory?: boolean) => void;
  isLoading?: boolean;
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  totalMessages?: number;
  /** ピン留めしたメッセージID（親で管理し、右パネル一覧と同期） */
  pinnedMessageIds?: Set<number>;
  onTogglePin?: (messageId: number) => void;
  /** 右パネル「チャットで見る」で指定されたメッセージにスクロール */
  scrollToMessageId?: number | null;
  onScrollToMessageDone?: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  TrendingDown,
  DollarSign,
  UserPlus,
  Briefcase,
  Zap,
  Cpu,
  Scale,
  Edit3,
};

export default function ChatArea({ 
  currentSession, 
  chatScrollRef, 
  onQuickReply,
  isLoading = false,
  hasMoreMessages = false,
  isLoadingMore = false,
  onLoadMore,
  totalMessages = 0,
  pinnedMessageIds = new Set<number>(),
  onTogglePin,
  scrollToMessageId = null,
  onScrollToMessageDone,
}: ChatAreaProps) {
  const [profile, setProfile] = useState<{ name: string; avatar_url: string | null } | null>(null);
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [prevScrollHeight, setPrevScrollHeight] = useState(0);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // AI回答の音声読み上げ（Web Speech API）
  const handleSpeak = (messageId: string, content: string) => {
    if (speakingMessageId === messageId) {
      window.speechSynthesis?.cancel();
      setSpeakingMessageId(null);
      return;
    }
    if (!window.speechSynthesis || !content?.trim()) return;
    window.speechSynthesis.cancel();
    const text = content.replace(/#+\s*/g, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\n/g, ' ').trim();
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.onstart = () => setSpeakingMessageId(messageId);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  // ピン留めのトグル（親から渡されていれば使用）
  const handleTogglePin = (messageId: number) => {
    onTogglePin?.(messageId);
  };

  // 右パネル「チャットで見る」で指定されたメッセージにスクロール
  useEffect(() => {
    if (scrollToMessageId == null || !containerRef.current || !onScrollToMessageDone) return;
    const el = containerRef.current.querySelector(`[data-message-id="${scrollToMessageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    onScrollToMessageDone();
  }, [scrollToMessageId, onScrollToMessageDone]);

  // AI回答をテキストファイルでダウンロード
  const handleDownloadMessage = (message: Message) => {
    const plain = message.content.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/#+\s*/g, "").trim();
    const blob = new Blob([plain], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-answer-${message.id}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // プロフィール情報を取得
  useEffect(() => {
    const fetchProfile = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('user_id', user.id)
          .single();
        if (data) {
          setProfile(data);
        }
      }
    };
    fetchProfile();
  }, []);

  // ユーザーイニシャルを取得（AppHeaderと同じロジック）
  const getUserInitials = () => {
    if (!profile?.name) return 'U';
    const cleanName = profile.name.replace(/\s+/g, '');
    return cleanName.length >= 2 ? cleanName.slice(0, 2) : cleanName.slice(0, 1);
  };

  // メッセージ追加時のスクロール位置保持
  useEffect(() => {
    if (containerRef.current && prevScrollHeight > 0) {
      const newScrollHeight = containerRef.current.scrollHeight;
      const heightDiff = newScrollHeight - prevScrollHeight;
      containerRef.current.scrollTop += heightDiff;
      setPrevScrollHeight(0); // リセット
    }
  }, [currentSession?.messages.length, prevScrollHeight]);

  // 「過去のメッセージを読み込む」ボタンをクリックしたとき
  const handleLoadMore = () => {
    if (containerRef.current) {
      setPrevScrollHeight(containerRef.current.scrollHeight);
    }
    onLoadMore?.();
  };

  return (
    <>
      <header className="relative z-10 border-b border-gray-200 bg-white px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {currentSession?.steps?.find(s => s.status === "active")?.title || "課題のヒアリング"}
            </h2>
            <p className="text-sm text-gray-500">貴社の現状を詳しく分析しています</p>
          </div>
          {isLoading && (
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 opacity-20 blur-xl animate-pulse rounded-full" />
              <Badge 
                variant="secondary" 
                className="relative text-base flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 border-2 border-blue-400 text-white shadow-lg px-4 py-2 animate-pulse"
              >
                <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                <span className="font-bold">🤖 AIが考えています...</span>
              </Badge>
            </div>
          )}
        </div>
      </header>

      <div 
        ref={containerRef}
        className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.9) 0%, rgba(224, 231, 255, 0.9) 50%, rgba(239, 246, 255, 0.9) 100%)'
        }}
      >
        {/* 背景画像（固定） */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <Image
            src="/AI相談画像01.png"
            alt="Background"
            fill
            className="object-cover opacity-[0.08]"
            priority
          />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          {/* 過去のメッセージを読み込むボタン */}
          {hasMoreMessages && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="shadow-sm hover:shadow-md transition-shadow"
              >
                {isLoadingMore ? (
                  <>
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-2" />
                    読み込み中...
                  </>
                ) : (
                  <>
                    📜 過去のメッセージを読み込む
                    {totalMessages > 0 && (
                      <span className="ml-2 text-xs text-gray-500">
                        （残り{totalMessages - (currentSession?.messages.length || 0)}件）
                      </span>
                    )}
                  </>
                )}
              </Button>
            </div>
          )}

          {(currentSession?.messages ?? []).map((message) => (
            <div
              key={message.id}
              data-message-id={message.id}
              className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* AIアイコン */}
              {message.type === "ai" && (
                <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden border border-slate-200 bg-slate-100">
                  <Image
                    src="/humanoid-ai-robot-with-blue-glowing-elements-havin.jpg"
                    alt="AI"
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className={`max-w-[80%] ${message.type === "user" ? "order-1" : "order-1"}`}>
                <div
                  className={`rounded-lg p-4 ${message.type === "user"
                      ? CHAT.userBubble
                      : CHAT.aiBubble
                    } ${message.type === "ai" ? "relative" : ""}`}
                >
                  {message.type === "ai" && (
                    <div className="absolute top-2 right-2 flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleTogglePin(message.id)}
                        title={pinnedMessageIds.has(message.id) ? "ピン留めを外す" : "ピン留め"}
                      >
                        <Pin className={`h-3.5 w-3.5 ${pinnedMessageIds.has(message.id) ? "fill-amber-500 text-amber-500" : ""}`} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleDownloadMessage(message)}
                        title="テキストでダウンロード"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleSpeak(String(message.id), message.content)}
                        title={speakingMessageId === String(message.id) ? "読み上げを停止" : "音声で読み上げる"}
                      >
                        {speakingMessageId === String(message.id) ? (
                          <VolumeX className="h-3.5 w-3.5 animate-pulse" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  )}
                  {message.type === "ai" ? (
                    <div className="space-y-2 pr-24">
                      <div className="text-sm leading-relaxed">
                        {formatAIMessage(message.content)}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  )}

                  {message.interactive?.type === "category-buttons" && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {(message.interactive.data as CategoryData[]).map((category, idx) => {
                        const IconComponent = iconMap[category.icon];

                        return (
                          <button
                            key={idx}
                            onClick={() => onQuickReply(category.label, true)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all group ${category.bgLight ?? "bg-card border-border hover:bg-accent"} hover:opacity-90`}
                          >
                            <div className={`${category.color} text-white p-2 rounded-full group-hover:scale-110 transition-transform`}>
                              {IconComponent && <IconComponent className="w-4 h-4" />}
                            </div>
                            <span className="text-xs font-medium text-center leading-tight text-gray-900">{category.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {message.interactive?.type === "subcategory-buttons" && (
                    <div className="mt-4 space-y-2">
                      {(message.interactive.data as string[]).map((subcategory, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          onClick={() => onQuickReply(subcategory)}
                          className="w-full justify-start text-xs"
                        >
                          <ArrowRight className="w-3 h-3 mr-2" />
                          {subcategory}
                        </Button>
                      ))}
                    </div>
                  )}

                  {message.interactive?.type === "custom-input" && (
                    <div className="mt-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="課題を入力してください..."
                          className="flex-1 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && e.currentTarget.value.trim()) {
                              onQuickReply(e.currentTarget.value);
                              e.currentTarget.value = "";
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            if (input?.value.trim()) {
                              onQuickReply(input.value);
                              input.value = "";
                            }
                          }}
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {message.interactive?.type === "buttons" && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(message.interactive.data as string[]).map((option, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          onClick={() => onQuickReply(option)}
                          className="text-xs"
                        >
                          {option}
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      ))}
                    </div>
                  )}

                  {message.interactive?.type === "form" && (
                    <Card className="mt-4 border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">売上情報の入力</CardTitle>
                        <CardDescription className="text-xs">現状と目標を教えてください</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">現在の月間売上</label>
                          <Input placeholder="例: 12,500,000" className="text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">目標月間売上</label>
                          <Input placeholder="例: 18,000,000" className="text-sm" />
                        </div>
                        <Button size="sm" className={`w-full mt-2 ${BUTTON.primary}`}>
                          送信
                          <Send className="w-3 h-3 ml-2" />
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 px-2">
                  {message.timestamp instanceof Date 
                    ? message.timestamp.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
                    : new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
                  }
                </p>
              </div>

              {message.type === "user" && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.name || 'User'}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-sm">
                      {getUserInitials()}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* AIが考えている時の表示（チャット内） */}
          {isLoading && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden border border-slate-200 bg-slate-100">
                <Image
                  src="/humanoid-ai-robot-with-blue-glowing-elements-havin.jpg"
                  alt="AI"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="max-w-[80%]">
                <div className="rounded-lg p-6 bg-gradient-to-br from-teal-50 to-blue-50 border-2 border-teal-300 shadow-lg">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600 flex-shrink-0" />
                    <div>
                      <p className="text-base font-bold text-teal-700 animate-pulse">
                        🤖 AIが考えています...
                      </p>
                      <p className="text-xs text-teal-600 mt-1">
                        貴社の情報を分析中
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-1">
                    <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatScrollRef} />
        </div>
      </div>
    </>
  );
}
