import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Home } from "lucide-react"
import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <Card className="border border-gray-200 bg-white shadow-2xl">
            <CardHeader className="text-center">
              <div className="mb-4 flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl font-bold">登録ありがとうございます！</CardTitle>
              <CardDescription>確認メールを送信しました</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-6 text-sm text-gray-600">
                ご登録いただいたメールアドレスに確認メールを送信しました。
                メール内のリンクをクリックして、アカウントを有効化してください。
              </p>

              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left">
                <p className="mb-2 text-sm font-medium text-amber-800">📧 メールが届かない場合</p>
                <ul className="list-inside list-disc space-y-1 text-xs text-amber-700">
                  <li>スパムフォルダを確認してください</li>
                  <li>Gmailの場合、「すべてのメール」フォルダも確認してください</li>
                  <li>数分待ってから再度確認してください</li>
                  <li>メールアドレスが正しいか確認してください</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
