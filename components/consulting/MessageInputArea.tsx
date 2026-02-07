'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VoiceSettingsDialog } from "@/components/consulting/VoiceSettingsDialog";
import { Paperclip, Mic, MicOff, Send, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { BUTTON } from "@/lib/consulting-ui-tokens";

export interface MessageInputAreaProps {
  // 入力値
  inputValue: string;
  setInputValue: (value: string) => void;
  
  // ファイル添付
  attachedFiles: File[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileAttach: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  
  // 音声入力
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  enableAICorrection: boolean;
  setEnableAICorrection: (value: boolean) => void;
  
  // メッセージ送信
  onSendMessage: () => void;
}

export default function MessageInputArea({
  inputValue,
  setInputValue,
  attachedFiles,
  fileInputRef,
  onFileAttach,
  onRemoveFile,
  isListening,
  transcript,
  startListening,
  stopListening,
  resetTranscript,
  enableAICorrection,
  setEnableAICorrection,
  onSendMessage,
}: MessageInputAreaProps) {
  // IME入力中かどうかの状態管理
  const [isComposing, setIsComposing] = useState(false);

  // Enterキーで送信（IME確定時は送信しない）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      onSendMessage();
    }
    // Shift+Enterは改行（デフォルト動作）
  };

  return (
    <footer className="relative z-10 flex-shrink-0 border-t border-gray-200 bg-white p-4">
      <div className="max-w-3xl mx-auto">
        {attachedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-accent text-accent-foreground px-3 py-1.5 rounded-md text-sm"
              >
                <FileText className="w-3 h-3" />
                <span className="text-xs truncate max-w-[150px]">{file.name}</span>
                <button
                  onClick={() => onRemoveFile(index)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {isListening && (
          <div className="mb-2 flex items-center gap-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">録音中...</span>
            </div>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-500 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 16 + 8}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
            <Button
              onClick={() => {
                stopListening();
                if (transcript) {
                  toast.success('音声入力を停止しました');
                }
              }}
              size="sm"
              variant="destructive"
            >
              停止
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={onFileAttach}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="icon"
            variant="outline"
            type="button"
            disabled={isListening}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}  // IME入力開始
            onCompositionEnd={() => setIsComposing(false)}   // IME入力終了
            onKeyDown={handleKeyDown}                        // Enterキーハンドラー
            placeholder={isListening ? "音声入力中..." : "メッセージを入力... (Enter: 送信, Shift+Enter: 改行)"}
            className="flex-1 min-h-[80px] max-h-[200px] py-3 px-3 text-base resize-y !bg-slate-50 dark:!bg-slate-100 border-gray-200"
            rows={3}
            disabled={isListening}
          />
          <VoiceSettingsDialog
            enableAICorrection={enableAICorrection}
            onToggleAICorrection={setEnableAICorrection}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => {
                  if (isListening) {
                    stopListening();
                    if (transcript) {
                      toast.success('音声入力を停止しました');
                    }
                  } else {
                    resetTranscript();
                    setInputValue('');
                    startListening();
                    toast.info('音声入力開始', { description: '音声入力を開始しました。' });
                  }
                }}
                size="icon"
                variant={isListening ? "destructive" : "outline"}
                type="button"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isListening ? '音声入力を停止' : '音声入力を開始'}</p>
            </TooltipContent>
          </Tooltip>
          <Button onClick={onSendMessage} size="icon" disabled={isListening} className={BUTTON.primary}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </footer>
  );
}
