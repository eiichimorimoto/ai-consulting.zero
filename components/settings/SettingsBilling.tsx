"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"
import { useRouter } from "next/navigation"

export default function SettingsBilling() {
  const router = useRouter()

  return (
    <Card className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <CardHeader className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <CardTitle className="text-lg font-semibold text-gray-900">請求履歴</CardTitle>
        <CardDescription className="mt-1 text-gray-600">
          これまでの請求履歴を確認できます
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4 py-8 text-center">
          <p className="text-gray-600">請求書の確認や詳細管理は課金管理ページで行えます。</p>
          <Button
            variant="outline"
            className="font-bold"
            onClick={() => router.push("/account/billing/invoices")}
          >
            <FileText className="mr-2 h-4 w-4" />
            請求書一覧を見る
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
