"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard } from "lucide-react"
import { toast } from "sonner"

export default function SettingsPayment() {
  const handleOpenPortal = async () => {
    try {
      const res = await fetch("/api/stripe/create-portal", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
      }
      toast.error("ポータルの生成に失敗しました")
    } catch {
      toast.error("エラーが発生しました")
    }
  }

  return (
    <Card className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <CardHeader className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <CardTitle className="text-lg font-semibold text-gray-900">支払い方法</CardTitle>
        <CardDescription className="mt-1 text-gray-600">
          クレジットカードなどの支払い方法を管理できます
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4 py-8 text-center">
          <p className="text-gray-600">支払い方法の変更はStripeの安全な管理画面で行います。</p>
          <Button className="font-bold" variant="outline" onClick={handleOpenPortal}>
            <CreditCard className="mr-2 h-4 w-4" />
            Stripe管理画面を開く
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
