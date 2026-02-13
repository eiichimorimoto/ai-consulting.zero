'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsBilling() {
  const router = useRouter()

  return (
    <Card className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <CardHeader className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <CardTitle className="text-lg font-semibold text-gray-900">請求履歴</CardTitle>
        <CardDescription className="text-gray-600 mt-1">これまでの請求履歴を確認できます</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="text-center py-8 space-y-4">
          <p className="text-gray-600">
            請求書の確認や詳細管理は課金管理ページで行えます。
          </p>
          <Button
            variant="outline"
            className="font-bold"
            onClick={() => router.push('/account/billing/invoices')}
          >
            <FileText className="w-4 h-4 mr-2" />
            請求書一覧を見る
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
