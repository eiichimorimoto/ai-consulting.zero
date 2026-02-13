import { AlertTriangle, Shield, Smartphone, TrendingUp, Zap } from 'lucide-react'

/**
 * 診断エラーメッセージをユーザーフレンドリーなメッセージにマッピング
 */
export function mapDiagnosisError(rawMessage: string): string {
  const message = rawMessage || ''

  if (message.includes('PageSpeed APIキー')) {
    return '分析に必要な設定（PageSpeed APIキー）が未設定です。管理者にお問い合わせください。'
  }
  if (message.includes('400 Bad Request') || message.includes('無効なURL') || message.includes('Invalid URL')) {
    return 'URLの形式が不正です。例: https://example.com の形式で入力してください。'
  }
  if (
    message.includes('FAILED_DOCUMENT_REQUEST') ||
    message.includes('ERR_CONNECTION_FAILED')
  ) {
    return 'サイトに接続できませんでした。URLが公開されているか、http/httpsが正しいか確認してください。'
  }
  if (message.includes('ENOTFOUND') || message.includes('DNS')) {
    return 'URLのドメインが見つかりませんでした。スペルやドメインの有効性を確認してください。'
  }
  if (message.includes('SSL') || message.includes('CERT') || message.includes('HTTPS')) {
    return 'SSL証明書の問題で接続できませんでした。httpsでアクセス可能か確認してください。'
  }
  if (message.includes('401') || message.includes('403') || message.includes('Forbidden')) {
    return 'アクセスが拒否されました。認証やIP制限、WAF設定をご確認ください。'
  }
  if (message.includes('429')) {
    return '混雑しています。少し時間をおいてから再度お試しください。'
  }
  if (message.includes('500') || message.includes('PageSpeed API error')) {
    return '分析に失敗しました。しばらく待ってから再度お試しください。'
  }

  return message || '分析中に不明なエラーが発生しました。'
}

/**
 * スコアに基づいて色を返す（テキスト）
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500'
  if (score >= 60) return 'text-yellow-500'
  if (score >= 40) return 'text-orange-500'
  return 'text-red-500'
}

/**
 * スコアに基づいて色を返す（背景）
 */
export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-yellow-500'
  if (score >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

/**
 * 重要度に基づいてスタイルを返す
 */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

/**
 * 重要度ラベルを返す
 */
export function getSeverityLabel(severity: string): string {
  switch (severity) {
    case 'high': return '優先度高'
    case 'medium': return '優先度中'
    case 'low': return '優先度低'
    default: return '-'
  }
}

/**
 * カテゴリアイコンを返す
 */
export function getCategoryIcon(category: string): JSX.Element {
  switch (category) {
    case 'performance': return <Zap className="w-5 h-5" />
    case 'security': return <Shield className="w-5 h-5" />
    case 'mobile': return <Smartphone className="w-5 h-5" />
    case 'seo': return <TrendingUp className="w-5 h-5" />
    default: return <AlertTriangle className="w-5 h-5" />
  }
}

/**
 * カテゴリラベルを返す
 */
export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'performance': return 'パフォーマンス'
    case 'security': return 'セキュリティ'
    case 'mobile': return 'モバイル'
    case 'seo': return 'SEO'
    default: return category
  }
}
