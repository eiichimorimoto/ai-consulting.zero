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
import { Badge } from "@/components/ui/badge";
import { Settings, Sparkles, BookOpen } from "lucide-react";
import { CONSULTING_DICTIONARY, getCategories } from "@/lib/shared/voiceDictionary";

interface VoiceSettingsDialogProps {
  enableAICorrection: boolean;
  onToggleAICorrection: (enabled: boolean) => void;
}

export function VoiceSettingsDialog({
  enableAICorrection,
  onToggleAICorrection,
}: VoiceSettingsDialogProps) {
  const categories = getCategories();
  const categoryLabels: Record<string, string> = {
    metrics: "ビジネス指標",
    consulting: "コンサルティング",
    technology: "テクノロジー",
    finance: "財務",
    strategy: "戦略",
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            音声認識設定
          </DialogTitle>
          <DialogDescription>
            音声入力の精度を向上させるための設定
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* AI Correction Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
            <div className="flex items-start gap-3 flex-1">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="ai-correction" className="text-base font-semibold cursor-pointer">
                  AI自動補正
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
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

          {/* Dictionary Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-600" />
              <h3 className="font-semibold">カスタム辞書</h3>
              <Badge variant="secondary" className="text-xs">
                {CONSULTING_DICTIONARY.length}語
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              コンサルティング業界でよく使われる専門用語を登録済みです。
              これらの用語は自動的に認識精度が向上します。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {categories.map((category) => {
                const entries = CONSULTING_DICTIONARY.filter(
                  (e) => e.category === category
                );
                const label = categoryLabels[category] || category;

                return (
                  <div
                    key={category}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{label}</h4>
                      <Badge variant="outline" className="text-xs">
                        {entries.length}語
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {entries.slice(0, 6).map((entry) => (
                        <Badge
                          key={entry.term}
                          variant="secondary"
                          className="text-xs"
                        >
                          {entry.term}
                        </Badge>
                      ))}
                      {entries.length > 6 && (
                        <Badge variant="secondary" className="text-xs">
                          +{entries.length - 6}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tips Section */}
          <div className="p-4 rounded-lg bg-muted">
            <h4 className="font-semibold text-sm mb-2">音声入力のコツ</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
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
