'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { clearConsultingState } from '@/lib/utils/session-storage'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function LogoutButton() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    try {
      // 1. sessionStorageをクリア（Supabaseログアウト前に実施）
      clearConsultingState()
      
      // 2. Supabaseログアウト
      const supabase = createClient()
      if (!supabase) {
        console.error('Supabaseが設定されていません')
        return
      }
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('ログアウトエラー:', error)
      }
      
      // 3. ログアウト後、ホームページにリダイレクト
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('ログアウトエラー:', error)
      // エラーが発生してもホームページにリダイレクト
      router.push('/')
      router.refresh()
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        ログアウト
      </Button>
      
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ログアウトの確認</AlertDialogTitle>
            <AlertDialogDescription>
              本当にログアウトしますか？ログアウトすると、再度ログインする必要があります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              ログアウト
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}


