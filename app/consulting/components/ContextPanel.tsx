'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FileText, Paperclip, Download, Eye, X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  onViewProposal?: () => void
  onDownloadProposal?: () => void
  onRemoveAttachment?: (id: string) => void
}

export function ContextPanel({
  digitalScore,
  issueCount = 0,
  attachments = [],
  proposalStatus = 'none',
  proposalId,
  onViewProposal,
  onDownloadProposal,
  onRemoveAttachment
}: ContextPanelProps) {
  const getScoreLevel = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 'unknown'
    if (score < 40) return 'low'
    if (score < 70) return 'medium'
    return 'high'
  }

  const scoreLevel = getScoreLevel(digitalScore)

  return (
    <div className="h-full w-full space-y-4 overflow-y-auto p-4">
      {/* デジタル診断スコア - グラデーションカード */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              📊
            </div>
            <span>デジタル診断</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {digitalScore !== null && digitalScore !== undefined ? (
            <>
              {/* スコア表示 */}
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">{digitalScore}</span>
                <span className="mb-1 text-lg text-muted-foreground">/ 100</span>
              </div>
              
              {/* プログレスバー */}
              <div className="space-y-2">
                <Progress 
                  value={digitalScore} 
                  className={cn(
                    "h-2",
                    scoreLevel === 'low' && "[&>div]:bg-red-500",
                    scoreLevel === 'medium' && "[&>div]:bg-yellow-500",
                    scoreLevel === 'high' && "[&>div]:bg-green-500"
                  )}
                />
                <div className="flex items-center justify-between text-xs">
                  <span className={cn(
                    "font-medium",
                    scoreLevel === 'low' && "text-red-500",
                    scoreLevel === 'medium' && "text-yellow-500",
                    scoreLevel === 'high' && "text-green-500"
                  )}>
                    {scoreLevel === 'low' && '要改善'}
                    {scoreLevel === 'medium' && '標準的'}
                    {scoreLevel === 'high' && '優良'}
                  </span>
                  {scoreLevel === 'low' && <TrendingDown className="h-3 w-3 text-red-500" />}
                  {scoreLevel === 'medium' && <Minus className="h-3 w-3 text-yellow-500" />}
                  {scoreLevel === 'high' && <TrendingUp className="h-3 w-3 text-green-500" />}
                </div>
              </div>
            </>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              デジタル診断を実施すると<br />スコアが表示されます
            </div>
          )}
          
          {/* 課題数 */}
          <div className="flex items-center justify-between rounded-lg bg-background/50 p-3">
            <span className="text-sm text-muted-foreground">検出された課題</span>
            <Badge variant={issueCount > 5 ? 'destructive' : issueCount > 0 ? 'secondary' : 'default'}>
              {issueCount}件
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 添付ファイル - ドラッグ可能エリア */}
      <Card>
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
        <CardContent className="space-y-2">
          {attachments.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-6 text-center">
              <Paperclip className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                クリップアイコンから<br />ファイルを添付できます
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {attachments.map((file) => (
                <div 
                  key={file.id}
                  className="group flex items-center gap-2 rounded-lg border bg-card p-3 transition-all hover:border-primary hover:shadow-sm"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                    </p>
                  </div>
                  {onRemoveAttachment && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => onRemoveAttachment(file.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 提案書 - アクションカード */}
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
