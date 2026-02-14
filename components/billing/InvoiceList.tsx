/**
 * 請求書一覧テーブルコンポーネント
 */
"use client"

import React from "react"
import { FileText, Download, ExternalLink } from "lucide-react"

interface Invoice {
  id: string
  number: string | null
  status: string | null
  amount_due: number
  amount_paid: number
  currency: string
  period_start: string | null
  period_end: string | null
  created: string | null
  hosted_invoice_url: string | null
  invoice_pdf: string | null
}

interface InvoiceListProps {
  invoices: Invoice[]
  loading?: boolean
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  paid: { label: "支払済", color: "text-green-700 bg-green-50" },
  open: { label: "未払い", color: "text-yellow-700 bg-yellow-50" },
  void: { label: "無効", color: "text-gray-700 bg-gray-50" },
  draft: { label: "下書き", color: "text-gray-500 bg-gray-50" },
  uncollectible: { label: "回収不能", color: "text-red-700 bg-red-50" },
}

export function InvoiceList({ invoices, loading }: InvoiceListProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
        <FileText className="mx-auto mb-2 h-10 w-10 text-gray-300" />
        <p>請求書はまだありません。</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">請求書番号</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">日付</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">金額</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">ステータス</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const statusInfo = STATUS_LABELS[inv.status || ""] || STATUS_LABELS.draft
              return (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{inv.number || inv.id.slice(0, 12)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(inv.created)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatAmount(inv.amount_due, inv.currency)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {inv.hosted_invoice_url && (
                        <a
                          href={inv.hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                          title="請求書を表示"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                      {inv.invoice_pdf && (
                        <a
                          href={inv.invoice_pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-700"
                          title="PDFをダウンロード"
                        >
                          <Download size={16} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
