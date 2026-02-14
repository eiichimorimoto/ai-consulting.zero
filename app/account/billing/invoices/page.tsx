/**
 * 請求書一覧ページ
 *
 * Stripe APIから取得した請求書を一覧表示する。
 *
 * @see stripe-payment-spec-v2.2.md §8-1
 */
"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { LazyMotion, domAnimation, m } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import AppHeader from "@/components/AppHeader"
import { InvoiceList } from "@/components/billing/InvoiceList"

interface Invoice {
  id: string
  number: string | null
  status: string | null
  amount_due: number
  amount_paid: number
  currency: string
  period_start: string | null
  period_end: string | null
  hosted_invoice_url: string | null
  invoice_pdf: string | null
  created: string | null
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const res = await fetch("/api/stripe/invoices")
        if (res.ok) {
          const data = await res.json()
          setInvoices(data.invoices || [])
        } else if (res.status === 404) {
          // Stripe未連携
          setInvoices([])
        } else {
          setError("請求書の取得に失敗しました。")
        }
      } catch {
        setError("エラーが発生しました。")
      } finally {
        setLoading(false)
      }
    }
    fetchInvoices()
  }, [])

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <AppHeader />

        <main className="pt-20">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            <Link
              href="/account/billing"
              className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={16} />
              課金管理に戻る
            </Link>

            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <h1 className="text-2xl font-bold text-gray-900">請求書一覧</h1>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
                  ))}
                </div>
              ) : error ? (
                <div className="py-12 text-center text-gray-500">{error}</div>
              ) : (
                <InvoiceList invoices={invoices} />
              )}
            </m.div>
          </div>
        </main>
      </div>
    </LazyMotion>
  )
}
