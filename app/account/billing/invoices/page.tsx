/**
 * 請求書一覧ページ
 *
 * Stripe APIから取得した請求書を一覧表示する。
 *
 * @see stripe-payment-spec-v2.2.md §8-1
 */
'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Header } from '@/components/Header'
import { InvoiceList } from '@/components/billing/InvoiceList'

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
        const res = await fetch('/api/stripe/invoices')
        if (res.ok) {
          const data = await res.json()
          setInvoices(data.invoices || [])
        } else if (res.status === 404) {
          // Stripe未連携
          setInvoices([])
        } else {
          setError('請求書の取得に失敗しました。')
        }
      } catch {
        setError('エラーが発生しました。')
      } finally {
        setLoading(false)
      }
    }
    fetchInvoices()
  }, [])

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Header />

        <main className="pt-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link
              href="/account/billing"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
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
                    <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-12 text-gray-500">{error}</div>
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
