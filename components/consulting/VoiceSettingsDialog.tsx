"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Settings, Sparkles } from "lucide-react"

interface VoiceSettingsDialogProps {
  enableAICorrection: boolean
  onToggleAICorrection: (enabled: boolean) => void
}

export function VoiceSettingsDialog({
  enableAICorrection,
  onToggleAICorrection,
}: VoiceSettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto border-gray-200 bg-white text-gray-900 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-slate-100">
            <Settings className="h-5 w-5" />
            音声認識設定
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-slate-300">
            音声入力の精度を向上させるための設定
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* AI Correction Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-purple-50/80 p-4 dark:border-slate-600 dark:bg-purple-950/40">
            <div className="flex flex-1 items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-600 dark:text-purple-400" />
              <div className="min-w-0 flex-1">
                <Label
                  htmlFor="ai-correction"
                  className="cursor-pointer text-base font-semibold text-gray-900 dark:text-slate-100"
                >
                  AI自動補正
                </Label>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  音声認識後にAIが文脈を理解して誤認識を自動修正します。
                  専門用語や数字の認識精度が向上します。
                </p>
              </div>
            </div>
            <Switch
              id="ai-correction"
              checked={enableAICorrection}
              onCheckedChange={onToggleAICorrection}
            />
          </div>

          {/* Tips Section */}
          <div className="rounded-lg border border-gray-200 bg-gray-100 p-4 dark:border-slate-600 dark:bg-slate-800">
            <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
              音声入力のコツ
            </h4>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-slate-300">
              <li>- 静かな環境で話すと認識精度が向上します</li>
              <li>- 専門用語はゆっくりはっきりと発音してください</li>
              <li>- 数字は「いちまん」ではなく「1万」と認識されます</li>
              <li>- AI補正をONにすると、文脈に応じた修正が行われます</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
