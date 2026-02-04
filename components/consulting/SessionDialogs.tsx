'use client';

import type { SessionStatus } from "@/types/consulting";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface SessionDialogsProps {
  // Step Navigation Dialog
  stepToNavigate: number | null;
  onCancelStepNavigation: () => void;
  onConfirmStepNavigation: () => void;
  
  // End Session Dialog
  isEndingSession: boolean;
  endSessionStatus: SessionStatus;
  onSetIsEndingSession: (value: boolean) => void;
  onSetEndSessionStatus: (status: SessionStatus) => void;
  onConfirmEndSession: () => void;
}

export default function SessionDialogs({
  stepToNavigate,
  onCancelStepNavigation,
  onConfirmStepNavigation,
  isEndingSession,
  endSessionStatus,
  onSetIsEndingSession,
  onSetEndSessionStatus,
  onConfirmEndSession,
}: SessionDialogsProps) {
  return (
    <>
      {/* Step Navigation Confirmation Dialog（背景・文字・ボタンを明示して見やすく） */}
      <AlertDialog open={stepToNavigate !== null} onOpenChange={onCancelStepNavigation}>
        <AlertDialogContent className="max-w-md bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 border border-gray-200 dark:border-slate-700 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-slate-100 text-lg font-semibold">
              ステップに戻りますか？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">
              STEP {stepToNavigate} に戻ると、現在の進捗が変更されます。よろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="border-gray-300 text-gray-700 hover:bg-gray-50">
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmStepNavigation}
              className="bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
            >
              戻る
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Session Confirmation Dialog（背景・文字を明示して透明化を防止） */}
      <AlertDialog open={isEndingSession} onOpenChange={onSetIsEndingSession}>
        <AlertDialogContent className="max-w-md bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 border border-gray-200 dark:border-slate-700 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-slate-100">会話を終了しますか？</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-slate-300">
              この会話をどのように終了しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-gray-200 dark:border-slate-600 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 bg-gray-50/50 dark:bg-slate-800/50" htmlFor="status-paused">
              <input
                type="radio"
                id="status-paused"
                name="session-status"
                value="paused"
                checked={endSessionStatus === "paused"}
                onChange={(e) => onSetEndSessionStatus(e.target.value as SessionStatus)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900 dark:text-slate-100">一時中断</div>
                <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">後で続きをやる予定です</div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-gray-200 dark:border-slate-600 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 bg-gray-50/50 dark:bg-slate-800/50" htmlFor="status-completed">
              <input
                type="radio"
                id="status-completed"
                name="session-status"
                value="completed"
                checked={endSessionStatus === "completed"}
                onChange={(e) => onSetEndSessionStatus(e.target.value as SessionStatus)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900 dark:text-slate-100">完了</div>
                <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">課題が解決しました</div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-gray-200 dark:border-slate-600 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 bg-gray-50/50 dark:bg-slate-800/50" htmlFor="status-cancelled">
              <input
                type="radio"
                id="status-cancelled"
                name="session-status"
                value="cancelled"
                checked={endSessionStatus === "cancelled"}
                onChange={(e) => onSetEndSessionStatus(e.target.value as SessionStatus)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900 dark:text-slate-100">中止</div>
                <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">この課題は不要になりました</div>
              </div>
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-gray-700 dark:text-slate-300">キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmEndSession} className="bg-red-600 hover:bg-red-700 text-white">
              終了する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
