import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Home } from "lucide-react"
import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <Card className="shadow-2xl border border-gray-200 bg-white">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl font-bold">登録ありがとうございます！</CardTitle>
              <CardDescription>確認メールを送信しました</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 mb-6">
                ご登録いただいたメールアドレスに確認メールを送信しました。
                メール内のリンクをクリックして、アカウントを有効化してください。
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-medium text-amber-800 mb-2">📧 メールが届かない場合</p>
                <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                  <li>スパムフォルダを確認してください</li>
                  <li>Gmailの場合、「すべてのメール」フォルダも確認してください</li>
                  <li>数分待ってから再度確認してください</li>
                  <li>メールアドレスが正しいか確認してください</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/auth/login"
                  className="inline-block text-blue-600 hover:text-blue-800 font-medium underline underline-offset-4"
                >
                  ログインページへ
                </Link>
                <p className="text-xs text-gray-500">
                  メール確認後、ログインできます
                </p>
              </div>
            </CardContent>
          </Card>
          <div className="text-center">
            <Link 
              href="/" 
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Home size={18} />
              <span>トップページに戻る</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
