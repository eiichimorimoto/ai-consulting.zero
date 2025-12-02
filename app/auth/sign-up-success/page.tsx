import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, ArrowLeft } from "lucide-react"
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
              <Link
                href="/auth/login"
                className="text-blue-600 hover:text-blue-800 font-medium underline underline-offset-4"
              >
                ログインページへ
              </Link>
            </CardContent>
          </Card>
          <div className="text-center">
            <Link 
              href="/" 
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span>トップページに戻る</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
