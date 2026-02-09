'use client';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Sparkles } from "lucide-react";

interface VoiceSettingsDialogProps {
  enableAICorrection: boolean;
  onToggleAICorrection: (enabled: boolean) => void;
}

export function VoiceSettingsDialog({
  enableAICorrection,
  onToggleAICorrection,
}: VoiceSettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-slate-100">
            <Settings className="w-5 h-5" />
            音声認識設定
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-slate-300">
            音声入力の精度を向上させるための設定
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* AI Correction Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-slate-600 bg-purple-50/80 dark:bg-purple-950/40">
            <div className="flex items-start gap-3 flex-1">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Label htmlFor="ai-correction" className="text-base font-semibold cursor-pointer text-gray-900 dark:text-slate-100">
                  AI自動補正
                </Label>
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
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
          <div className="p-4 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-600">
            <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-slate-100">音声入力のコツ</h4>
            <ul className="text-sm text-gray-600 dark:text-slate-300 space-y-1">
              <li>- 静かな環境で話すと認識精度が向上します</li>
              <li>- 専門用語はゆっくりはっきりと発音してください</li>
              <li>- 数字は「いちまん」ではなく「1万」と認識されます</li>
              <li>- AI補正をONにすると、文脈に応じた修正が行われます</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
