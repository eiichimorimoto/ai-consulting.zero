'use client';

import type { SessionData, CategoryData } from "@/types/consulting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Send, TrendingDown, DollarSign, Rocket, Users, Edit3, Cpu, Shield, Cloud, Zap } from "lucide-react";
import { CHAT, BUTTON } from "@/lib/consulting-ui-tokens";

export interface ChatAreaProps {
  currentSession: SessionData | null;
  chatScrollRef: React.RefObject<HTMLDivElement>;
  onQuickReply: (reply: string, isCategory?: boolean) => void;
}

const iconMap: Record<string, React.ElementType> = {
  TrendingDown,
  DollarSign,
  Rocket,
  Users,
  Edit3,
  Cpu,
  Shield,
  Cloud,
  Zap
};

export default function ChatArea({ 
  currentSession, 
  chatScrollRef, 
  onQuickReply 
}: ChatAreaProps) {
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
          <Badge variant="secondary" className="text-xs flex items-center gap-2 bg-white border border-gray-200 text-gray-700">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" aria-hidden />
            AI応答中
          </Badge>
        </div>
      </header>

      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">
        <div ref={chatScrollRef} className="max-w-3xl mx-auto space-y-6">
          {(currentSession?.messages ?? []).map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.type === "ai" && (
                <div className="w-10 h-10 rounded-full bg-teal-500 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  <span className="text-white font-bold">AI</span>
                </div>
              )}

              <div className={`max-w-[80%] ${message.type === "user" ? "order-2" : "order-1"}`}>
                <div
                  className={`rounded-lg p-4 ${message.type === "user"
                      ? CHAT.userBubble
                      : CHAT.aiBubble
                    }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>

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
                  {message.timestamp.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              {message.type === "user" && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm">
                  U
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
