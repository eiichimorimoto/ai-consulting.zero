'use client'

import { useState, useEffect } from 'react'
import { File, Image as ImageIcon, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface DocumentItemProps {
  filePath: string
  onDelete: () => void
}

export default function DocumentItem({ filePath, onDelete }: DocumentItemProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        const supabase = createClient()
        if (!supabase) return

        // 署名付きURLを生成（有効期限: 1時間）
        const { data, error } = await supabase.storage
          .from('company-documents')
          .createSignedUrl(filePath, 3600)

        if (error) {
          console.error('署名付きURL生成エラー:', error)
          return
        }

        setSignedUrl(data.signedUrl)
      } catch (error) {
        console.error('署名付きURL生成エラー:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getSignedUrl()
  }, [filePath])

  const getFileIcon = () => {
    const extension = filePath.split('.').pop()?.toLowerCase()
    if (extension === 'pdf') {
      return <File className="w-5 h-5 text-red-500" />
    }
    return <ImageIcon className="w-5 h-5 text-blue-500" />
  }

  const getFileName = () => {
    // パスからファイル名を抽出（companyId-timestamp-random.ext形式）
    const parts = filePath.split('-')
    if (parts.length >= 3) {
      const extension = filePath.split('.').pop()
      return `資料.${extension}`
    }
    return filePath
  }

  const handleDownload = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank')
    }
  }

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3">
        {getFileIcon()}
        <div>
          <p className="text-sm font-medium text-gray-900">{getFileName()}</p>
          {isLoading ? (
            <p className="text-xs text-gray-500">読み込み中...</p>
          ) : signedUrl ? (
            <p className="text-xs text-gray-500">準備完了</p>
          ) : (
            <p className="text-xs text-red-500">読み込み失敗</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {signedUrl && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="h-8 w-8"
          >
            <Download className="w-4 h-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}


