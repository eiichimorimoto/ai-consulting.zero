'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FileText, Download, Eye, X, Upload, AlertCircle } from 'lucide-react'

interface ContextPanelProps {
  digitalScore?: number | null
  issueCount?: number
  attachments?: Array<{
    id: string
    name: string
    type: string
  }>
  proposalStatus?: 'none' | 'generating' | 'ready'
  proposalId?: string | null
  industryForecast?: {
    shortTerm?: {
      period?: string
      outlook?: 'positive' | 'neutral' | 'negative'
      prediction?: string
    }
  } | null | undefined
  onViewProposal?: () => void
  onDownloadProposal?: () => void
  onRemoveAttachment?: (id: string) => void
  onFileUpload?: (files: FileList) => void
}

export function ContextPanel({
  digitalScore,
  issueCount = 0,
  attachments = [],
  proposalStatus = 'none',
  proposalId,
  industryForecast,
  onViewProposal,
  onDownloadProposal,
  onRemoveAttachment,
  onFileUpload
}: ContextPanelProps) {
  // State追加
  const [isDragging, setIsDragging] = useState(false)
  const [errorMessages, setErrorMessages] = useState<Array<{
    id: string
    type: 'error' | 'warning' | 'info'
    message: string
  }>>([])
  
  // Ref追加
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // ファイル検証関数
  const validateFiles = useCallback((files: File[]): { valid: File[], errors: string[] } => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = [
      'text/plain', 'text/csv', 'application/csv', 'text/markdown',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ]
    const allowedExtensions = ['.txt', '.csv', '.md', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']
    
    const validFiles: File[] = []
    const errors: string[] = []
    
    files.forEach(file => {
      // サイズチェック
      if (file.size > maxSize) {
        errors.push(`${file.name}: ファイルサイズが大きすぎます（最大10MB）`)
        return
      }
      
      // タイプチェック
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      const hasValidMimeType = allowedTypes.includes(file.type)
      const hasValidExtension = allowedExtensions.includes(ext)
      
      if (!hasValidMimeType && !hasValidExtension) {
        errors.push(`${file.name}: 対応していない形式です`)
        return
      }
      
      validFiles.push(file)
    })
    
    return { valid: validFiles, errors }
  }, [])
  
  // イベントハンドラ
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 子要素のイベントを無視
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    
    const { valid, errors } = validateFiles(files)
    
    // エラーメッセージ表示
    if (errors.length > 0) {
      const newErrors = errors.map((msg, i) => ({
        id: `error-${Date.now()}-${i}`,
        type: 'error' as const,
        message: msg
      }))
      setErrorMessages(prev => [...prev, ...newErrors])
    }
    
    // 有効なファイルがあればアップロード
    if (valid.length > 0 && onFileUpload) {
      const dataTransfer = new DataTransfer()
      valid.forEach(file => dataTransfer.items.add(file))
      onFileUpload(dataTransfer.files)
    }
  }, [validateFiles, onFileUpload])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const files = Array.from(e.target.files)
    const { valid, errors } = validateFiles(files)
    
    // エラーメッセージ表示
    if (errors.length > 0) {
      const newErrors = errors.map((msg, i) => ({
        id: `error-${Date.now()}-${i}`,
        type: 'error' as const,
        message: msg
      }))
      setErrorMessages(prev => [...prev, ...newErrors])
    }
    
    // 有効なファイルがあればアップロード
    if (valid.length > 0 && onFileUpload) {
      onFileUpload(e.target.files)
    }
    
    // リセット
    e.target.value = ''
  }, [validateFiles, onFileUpload])
  
  // エラーメッセージ自動削除
  useEffect(() => {
    if (errorMessages.length === 0) return
    
    const timers = errorMessages.map(err => 
      setTimeout(() => {
        setErrorMessages(prev => prev.filter(e => e.id !== err.id))
      }, 5000)
    )
    
    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [errorMessages])

  return (
    <div className="h-full w-full space-y-4 overflow-y-auto p-4">
      {/* 業界見通し - 1番目 */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-indigo-500/10 via-blue-500/10 to-purple-500/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
              📊
            </div>
            <span>業界見通し</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {industryForecast?.shortTerm ? (
            <div className="space-y-3">
              {/* 業界見通しゲージ（ダッシュボードと同じ） */}
              <div className="flex items-center gap-3">
                {/* 円形ゲージ */}
                <div className="relative flex-shrink-0" style={{ width: '60px', height: '60px' }}>
                  <svg viewBox="0 0 36 36" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                    <circle 
                      cx="18" 
                      cy="18" 
                      r="15" 
                      fill="none" 
                      stroke="rgba(99, 102, 241, 0.12)" 
                      strokeWidth="3" 
                    />
                    <circle 
                      cx="18" 
                      cy="18" 
                      r="15" 
                      fill="none" 
                      stroke={
                        industryForecast.shortTerm.outlook === 'positive' ? '#10b981' : 
                        industryForecast.shortTerm.outlook === 'negative' ? '#ef4444' : 
                        '#f59e0b'
                      }
                      strokeWidth="3" 
                      strokeDasharray={
                        industryForecast.shortTerm.outlook === 'positive' ? '75 100' : 
                        industryForecast.shortTerm.outlook === 'negative' ? '30 100' : 
                        '50 100'
                      }
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-base">
                    {industryForecast.shortTerm.outlook === 'positive' ? '📈' : 
                     industryForecast.shortTerm.outlook === 'negative' ? '📉' : 
                     '➡️'}
                  </div>
                </div>
                <div className="flex-1">
                  <div 
                    className="text-sm font-bold"
                    style={{
                      color: industryForecast.shortTerm.outlook === 'positive' ? '#10b981' : 
                             industryForecast.shortTerm.outlook === 'negative' ? '#ef4444' : 
                             '#f59e0b'
                    }}
                  >
                    {industryForecast.shortTerm.outlook === 'positive' ? 'ポジティブ' : 
                     industryForecast.shortTerm.outlook === 'negative' ? 'ネガティブ' : 
                     '中立'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    短期（{industryForecast.shortTerm.period || '3ヶ月'}）
                  </div>
                </div>
              </div>
              {/* 説明文 */}
              <div className="text-[10px] text-muted-foreground leading-relaxed">
                業界全体の短期見通しを示すゲージです。<br/>
                市場動向・需要予測・競合状況を総合評価。<br/>
                緑:好調 / 黄:横ばい / 赤:低調
              </div>
            </div>
          ) : industryForecast === null ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              業界見通しデータを取得中...
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-muted-foreground">
              業界見通しデータが取得できませんでした
              <br />
              <span className="text-[10px]">ダッシュボードで業界見通しを確認してください</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添付ファイル - 2番目 */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
              📎
            </div>
            <span>添付ファイル</span>
            <Badge variant="outline" className="ml-auto">
              {attachments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".txt,.csv,.md,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            multiple
            onChange={handleFileChange}
          />
          
          {/* エラーメッセージ */}
          {errorMessages.map(err => (
            <div
              key={err.id}
              className="mb-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="flex-1">{err.message}</span>
            </div>
          ))}
          
          {/* ドロップゾーン */}
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            className={`
              relative rounded-lg border-2 border-dashed transition-all cursor-pointer
              ${isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted hover:border-primary/50 hover:bg-muted/30'
              }
              ${attachments.length === 0 ? 'py-8' : 'py-4'}
            `}
          >
            {attachments.length === 0 ? (
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-xs font-medium text-foreground mb-1">
                  ファイルをドロップまたはクリック
                </p>
                <p className="text-[10px] text-muted-foreground">
                  .txt, .csv, .md, .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx
                </p>
                <p className="text-[10px] text-muted-foreground">
                  最大サイズ: 10MB
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {attachments.map((file) => (
                  <div 
                    key={file.id}
                    className="group flex items-center gap-2 rounded-md border bg-white px-2 py-1.5 text-xs hover:bg-muted/50"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-foreground">{file.name}</span>
                    {onRemoveAttachment && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveAttachment(file.id)
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground text-center pt-2">
                  追加でドロップまたはクリック
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI提案書 - 3番目（そのまま） */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
              📄
            </div>
            <span>AI提案書</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {proposalStatus === 'none' && (
            <div className="space-y-2 text-sm">
              <div className="rounded-lg bg-background/50 p-4 text-center text-muted-foreground">
                <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-xs">
                  相談完了後に<br />AI提案書が生成されます
                </p>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1">
                  ✓ 課題分析レポート
                </p>
                <p className="flex items-center gap-1">
                  ✓ 改善提案書
                </p>
                <p className="flex items-center gap-1">
                  ✓ アクションプラン
                </p>
              </div>
            </div>
          )}
          
          {proposalStatus === 'generating' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <div className="flex-1">
                  <p className="text-sm font-medium">生成中...</p>
                  <p className="text-xs text-muted-foreground">AIが提案書を作成しています</p>
                </div>
              </div>
              <Progress value={66} className="h-1" />
            </div>
          )}
          
          {proposalStatus === 'ready' && proposalId && (
            <div className="space-y-2">
              <div className="rounded-lg bg-primary/10 p-3 text-center">
                <div className="mb-2 text-2xl">✨</div>
                <p className="text-sm font-medium text-primary">提案書が完成しました</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={onViewProposal}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  確認
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onDownloadProposal}
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => {
                  // 検討開始機能（TODO）
                  console.log('検討開始')
                }}
              >
                🚀 この提案で検討開始
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
