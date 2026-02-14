/**
 * 解約フロー コンポーネント
 *
 * ステップ:
 *  1. 解約理由の選択
 *  2. リテンションオファー（too_expensive時）
 *  3. 解約タイプ選択（期間終了 or 即時）
 *  4. 確認→実行
 *
 * @see stripe-payment-spec-v2.2.md §5-1, §5-2
 */
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ChevronRight, Loader2 } from 'lucide-react'
import { RetentionOffer } from './RetentionOffer'

const CANCEL_REASONS = [
  { value: 'too_expensive', label: '料金が高い' },
  { value: 'not_enough_features', label: '機能が不足している' },
  { value: 'switching_to_competitor', label: '他サービスに切り替える' },
  { value: 'not_using_enough', label: 'あまり利用していない' },
  { value: 'temporary_pause', label: '一時的に利用を停止したい' },
  { value: 'other', label: 'その他' },
] as const

type CancelReason = typeof CANCEL_REASONS[number]['value']

interface CancelFlowProps {
  planType: string
  currentPeriodEnd: string | null
}

export function CancelFlow({ planType, currentPeriodEnd }: CancelFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [reason, setReason] = useState<CancelReason | ''>('')
  const [feedback, setFeedback] = useState('')
  const [cancelType, setCancelType] = useState<'end_of_period' | 'immediate'>('end_of_period')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const periodEndFormatted = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  function handleReasonNext() {
    if (!reason) return
    // too_expensive → リテンション提示
    if (reason === 'too_expensive') {
      setStep(2)
    } else {
      setStep(3)
    }
  }

  function handleRetentionDecline() {
    setStep(3)
  }

  async function handleConfirmCancel() {
    setProcessing(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancelType,
          reason,
          feedback: feedback || undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setStep(4)
      } else {
        setError(data.error || '解約処理に失敗しました。')
      }
    } catch {
      setError('エラーが発生しました。')
    } finally {
      setProcessing(false)
    }
  }

  // Step 4: 完了
  if (step === 4) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-4xl">✅</div>
        <h2 className="text-xl font-bold text-gray-900">解約手続きが完了しました</h2>
        {cancelType === 'end_of_period' && periodEndFormatted ? (
          <p className="text-gray-600">
            {periodEndFormatted}までサービスをご利用いただけます。
            <br />
            期間終了後、Freeプランに移行されます。
          </p>
        ) : (
          <p className="text-gray-600">
            Freeプランに移行されました。
            <br />
            データは30日間保持されます。
          </p>
        )}
        <button
          onClick={() => router.push('/account/billing')}
          className="mt-4 px-6 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
        >
          課金管理に戻る
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ステップインジケーター */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className={step >= 1 ? 'text-blue-600 font-medium' : ''}>理由選択</span>
        <ChevronRight size={14} />
        {reason === 'too_expensive' && (
          <>
            <span className={step >= 2 ? 'text-blue-600 font-medium' : ''}>特別オファー</span>
            <ChevronRight size={14} />
          </>
        )}
        <span className={step >= 3 ? 'text-blue-600 font-medium' : ''}>確認</span>
      </div>

      {/* Step 1: 理由選択 */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            解約の理由をお聞かせください
          </h2>
          <div className="space-y-2">
            {CANCEL_REASONS.map((r) => (
              <label
                key={r.value}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                  reason === r.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="accent-blue-600"
                />
                <span className="text-gray-700">{r.label}</span>
              </label>
            ))}
          </div>

          {(reason === 'other' || reason === 'switching_to_competitor') && (
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="詳細をお聞かせください（任意）"
              className="w-full p-3 rounded-xl border border-gray-200 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <button
            onClick={handleReasonNext}
            disabled={!reason}
            className="w-full py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      )}

      {/* Step 2: リテンションオファー */}
      {step === 2 && (
        <RetentionOffer
          planType={planType}
          onDecline={handleRetentionDecline}
          onAccept={() => router.push('/account/billing')}
        />
      )}

      {/* Step 3: 確認 */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-yellow-600 mt-0.5 shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">解約前にご確認ください</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>解約後30日間はデータが保持されます</li>
                <li>30日経過後、コンサルティングデータは削除されます</li>
                <li>いつでも再契約いただけます</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">解約タイミング</h3>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                cancelType === 'end_of_period'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="cancel-type"
                value="end_of_period"
                checked={cancelType === 'end_of_period'}
                onChange={() => setCancelType('end_of_period')}
                className="accent-blue-600 mt-1"
              />
              <div>
                <span className="text-gray-900 font-medium">期間終了時に解約（推奨）</span>
                {periodEndFormatted && (
                  <p className="text-sm text-gray-500 mt-1">
                    {periodEndFormatted}までサービスを利用できます
                  </p>
                )}
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                cancelType === 'immediate'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="cancel-type"
                value="immediate"
                checked={cancelType === 'immediate'}
                onChange={() => setCancelType('immediate')}
                className="accent-red-600 mt-1"
              />
              <div>
                <span className="text-gray-900 font-medium">今すぐ解約</span>
                <p className="text-sm text-gray-500 mt-1">
                  即座にFreeプランに移行されます（残り期間の返金はありません）
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              戻る
            </button>
            <button
              onClick={handleConfirmCancel}
              disabled={processing}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  処理中...
                </>
              ) : (
                '解約を確定する'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
