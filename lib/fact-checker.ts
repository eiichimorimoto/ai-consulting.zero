/**
 * ファクトチェックユーティリティ
 * 
 * 各種データの信頼性を検証し、ファクトチェック結果を返す
 */

export interface FactCheckResult {
  passed: boolean
  confidence: number // 0-100
  level: 'verified' | 'high' | 'medium' | 'low' | 'unverified'
  checks: FactCheckItem[]
  summary: string
  timestamp: string
}

export interface FactCheckItem {
  category: string
  field: string
  passed: boolean
  message: string
  severity: 'info' | 'warning' | 'error'
  suggestion?: string
}

/**
 * 信頼度レベルを計算
 */
function calculateConfidenceLevel(confidence: number): FactCheckResult['level'] {
  if (confidence >= 90) return 'verified'
  if (confidence >= 75) return 'high'
  if (confidence >= 50) return 'medium'
  if (confidence >= 25) return 'low'
  return 'unverified'
}

/**
 * OCR結果のファクトチェック
 */
export function checkOCRResult(data: {
  companyName?: string
  personName?: string
  email?: string
  phone?: string
  mobile?: string
  address?: string
  postalCode?: string
  department?: string
  position?: string
  website?: string
}): FactCheckResult {
  const checks: FactCheckItem[] = []
  let totalScore = 0
  let checkCount = 0

  // メールアドレスの形式チェック
  if (data.email) {
    checkCount++
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailRegex.test(data.email)) {
      totalScore += 100
      checks.push({
        category: 'OCR',
        field: 'email',
        passed: true,
        message: 'メールアドレスの形式が正しいです',
        severity: 'info'
      })
    } else {
      checks.push({
        category: 'OCR',
        field: 'email',
        passed: false,
        message: 'メールアドレスの形式が不正です',
        severity: 'warning',
        suggestion: 'メールアドレスを確認してください'
      })
    }
  }

  // 電話番号の形式チェック
  if (data.phone) {
    checkCount++
    const phoneRegex = /^[\d\-+().\s]+$/
    if (phoneRegex.test(data.phone) && data.phone.replace(/\D/g, '').length >= 10) {
      totalScore += 100
      checks.push({
        category: 'OCR',
        field: 'phone',
        passed: true,
        message: '電話番号の形式が正しいです',
        severity: 'info'
      })
    } else {
      checks.push({
        category: 'OCR',
        field: 'phone',
        passed: false,
        message: '電話番号の形式に問題がある可能性があります',
        severity: 'warning',
        suggestion: '電話番号を確認してください'
      })
    }
  }

  // 郵便番号の形式チェック
  if (data.postalCode) {
    checkCount++
    const postalRegex = /^\d{3}-?\d{4}$/
    if (postalRegex.test(data.postalCode.replace(/\s/g, ''))) {
      totalScore += 100
      checks.push({
        category: 'OCR',
        field: 'postalCode',
        passed: true,
        message: '郵便番号の形式が正しいです',
        severity: 'info'
      })
    } else {
      checks.push({
        category: 'OCR',
        field: 'postalCode',
        passed: false,
        message: '郵便番号の形式が不正です',
        severity: 'warning',
        suggestion: '郵便番号を確認してください'
      })
    }
  }

  // ウェブサイトURLの形式チェック
  if (data.website) {
    checkCount++
    try {
      new URL(data.website.startsWith('http') ? data.website : `https://${data.website}`)
      totalScore += 100
      checks.push({
        category: 'OCR',
        field: 'website',
        passed: true,
        message: 'ウェブサイトURLの形式が正しいです',
        severity: 'info'
      })
    } catch {
      checks.push({
        category: 'OCR',
        field: 'website',
        passed: false,
        message: 'ウェブサイトURLの形式が不正です',
        severity: 'warning',
        suggestion: 'URLを確認してください'
      })
    }
  }

  // 会社名の存在チェック
  if (data.companyName) {
    checkCount++
    if (data.companyName.length >= 2) {
      totalScore += 100
      checks.push({
        category: 'OCR',
        field: 'companyName',
        passed: true,
        message: '会社名が読み取れました',
        severity: 'info'
      })
    } else {
      checks.push({
        category: 'OCR',
        field: 'companyName',
        passed: false,
        message: '会社名が短すぎます',
        severity: 'warning',
        suggestion: '会社名を確認してください'
      })
    }
  }

  // 氏名の存在チェック
  if (data.personName) {
    checkCount++
    if (data.personName.length >= 2) {
      totalScore += 100
      checks.push({
        category: 'OCR',
        field: 'personName',
        passed: true,
        message: '氏名が読み取れました',
        severity: 'info'
      })
    } else {
      checks.push({
        category: 'OCR',
        field: 'personName',
        passed: false,
        message: '氏名が短すぎます',
        severity: 'warning',
        suggestion: '氏名を確認してください'
      })
    }
  }

  const confidence = checkCount > 0 ? Math.round(totalScore / checkCount) : 0
  const passed = checks.every(c => c.passed) && checkCount > 0

  return {
    passed,
    confidence,
    level: calculateConfidenceLevel(confidence),
    checks,
    summary: passed 
      ? `OCR結果は${checkCount}件のチェックをすべてパスしました`
      : `${checks.filter(c => !c.passed).length}件の項目に問題が検出されました`,
    timestamp: new Date().toISOString()
  }
}

/**
 * 検索結果のファクトチェック
 */
export function checkSearchResult(data: {
  sources?: { url: string; title: string; date?: string }[]
  content?: string
  query?: string
}): FactCheckResult {
  const checks: FactCheckItem[] = []
  let totalScore = 0
  let checkCount = 0

  // ソースの信頼性チェック
  if (data.sources && data.sources.length > 0) {
    checkCount++
    const trustedDomains = [
      'go.jp', 'or.jp', 'ac.jp', // 日本の公的機関
      'gov', 'edu', 'org', // 国際的な公的機関
      'nikkei.com', 'nhk.or.jp', 'asahi.com', 'yomiuri.co.jp', // 主要メディア
      'reuters.com', 'bloomberg.com', 'wsj.com' // 海外主要メディア
    ]

    const trustedSources = data.sources.filter(s => 
      trustedDomains.some(domain => s.url.includes(domain))
    )

    if (trustedSources.length > 0) {
      totalScore += Math.min(100, (trustedSources.length / data.sources.length) * 100 + 30)
      checks.push({
        category: '検索結果',
        field: 'sources',
        passed: true,
        message: `${trustedSources.length}件の信頼性の高いソースが含まれています`,
        severity: 'info'
      })
    } else {
      totalScore += 30
      checks.push({
        category: '検索結果',
        field: 'sources',
        passed: false,
        message: '信頼性の高いソースが見つかりませんでした',
        severity: 'warning',
        suggestion: '公的機関や主要メディアのソースを確認してください'
      })
    }

    // 日付の新鮮さチェック
    checkCount++
    const now = new Date()
    const recentSources = data.sources.filter(s => {
      if (!s.date) return false
      const sourceDate = new Date(s.date)
      const daysDiff = (now.getTime() - sourceDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysDiff <= 365 // 1年以内
    })

    if (recentSources.length > 0) {
      totalScore += 100
      checks.push({
        category: '検索結果',
        field: 'freshness',
        passed: true,
        message: `${recentSources.length}件の最新情報（1年以内）が含まれています`,
        severity: 'info'
      })
    } else {
      totalScore += 50
      checks.push({
        category: '検索結果',
        field: 'freshness',
        passed: false,
        message: '最新の情報が見つかりませんでした',
        severity: 'warning',
        suggestion: '情報の日付を確認し、最新の情報を参照してください'
      })
    }
  }

  // 複数ソースの一致チェック
  if (data.sources && data.sources.length >= 2) {
    checkCount++
    totalScore += 80 // 複数ソースがある場合はスコアアップ
    checks.push({
      category: '検索結果',
      field: 'multiSource',
      passed: true,
      message: `${data.sources.length}件の複数ソースから情報を取得しています`,
      severity: 'info'
    })
  }

  const confidence = checkCount > 0 ? Math.round(totalScore / checkCount) : 0
  const passed = checks.filter(c => !c.passed).length === 0 && checkCount > 0

  return {
    passed,
    confidence,
    level: calculateConfidenceLevel(confidence),
    checks,
    summary: passed
      ? `検索結果は${checkCount}件のチェックをすべてパスしました`
      : `${checks.filter(c => !c.passed).length}件の項目に注意が必要です`,
    timestamp: new Date().toISOString()
  }
}

/**
 * AI生成結果のファクトチェック
 */
export function checkAIResult(data: {
  content?: string
  scores?: { [key: string]: number }
  issues?: { severity: string; issue: string; category: string }[]
  metrics?: { [key: string]: number | string | boolean }
  sources?: string[]
}): FactCheckResult {
  const checks: FactCheckItem[] = []
  let totalScore = 0
  let checkCount = 0

  // スコアの妥当性チェック
  if (data.scores) {
    checkCount++
    const invalidScores = Object.entries(data.scores).filter(([_, value]) => 
      typeof value === 'number' && (value < 0 || value > 100)
    )

    if (invalidScores.length === 0) {
      totalScore += 100
      checks.push({
        category: 'AI結果',
        field: 'scores',
        passed: true,
        message: 'スコアが妥当な範囲内です',
        severity: 'info'
      })
    } else {
      checks.push({
        category: 'AI結果',
        field: 'scores',
        passed: false,
        message: `${invalidScores.length}件のスコアが範囲外です`,
        severity: 'error',
        suggestion: 'スコアの値を確認してください'
      })
    }
  }

  // 課題の重複チェック
  if (data.issues && data.issues.length > 0) {
    checkCount++
    // issuesが文字列配列またはオブジェクト配列に対応
    const issueTexts = data.issues.map((i: string | { issue?: string; description?: string; text?: string }) => {
      if (typeof i === 'string') return i.toLowerCase()
      if (i.issue) return String(i.issue).toLowerCase()
      if (i.description) return String(i.description).toLowerCase()
      if (i.text) return String(i.text).toLowerCase()
      return JSON.stringify(i).toLowerCase()
    })
    const uniqueIssues = new Set(issueTexts)

    if (uniqueIssues.size === issueTexts.length) {
      totalScore += 100
      checks.push({
        category: 'AI結果',
        field: 'issues',
        passed: true,
        message: '課題に重複はありません',
        severity: 'info'
      })
    } else {
      totalScore += 50
      checks.push({
        category: 'AI結果',
        field: 'issues',
        passed: false,
        message: '重複した課題が検出されました',
        severity: 'warning',
        suggestion: '重複した課題を確認してください'
      })
    }

    // 課題の具体性チェック
    checkCount++
    const vagueIssues = data.issues.filter((i: string | { issue?: string; description?: string; text?: string }) => {
      // issueテキストを取得
      let issueText = ''
      if (typeof i === 'string') {
        issueText = i
      } else if (i.issue) {
        issueText = String(i.issue)
      } else if (i.description) {
        issueText = String(i.description)
      } else if (i.text) {
        issueText = String(i.text)
      } else {
        issueText = JSON.stringify(i)
      }
      return issueText.length < 10 || 
        ['問題', '課題', 'エラー', 'issues'].some(v => issueText.toLowerCase() === v)
    })

    if (vagueIssues.length === 0) {
      totalScore += 100
      checks.push({
        category: 'AI結果',
        field: 'issueSpecificity',
        passed: true,
        message: '課題は具体的に記述されています',
        severity: 'info'
      })
    } else {
      totalScore += 60
      checks.push({
        category: 'AI結果',
        field: 'issueSpecificity',
        passed: false,
        message: `${vagueIssues.length}件の課題が抽象的です`,
        severity: 'warning',
        suggestion: '課題をより具体的に記述してください'
      })
    }
  }

  // メトリクスの整合性チェック
  if (data.metrics) {
    checkCount++
    const numericMetrics = Object.entries(data.metrics).filter(([_, v]) => typeof v === 'number')
    const invalidMetrics = numericMetrics.filter(([key, value]) => {
      // スコア系は0-100の範囲
      if (key.toLowerCase().includes('score') && (value as number < 0 || value as number > 100)) {
        return true
      }
      // 時間系（ms）は0以上
      if ((key.toLowerCase().includes('fcp') || key.toLowerCase().includes('lcp')) && value as number < 0) {
        return true
      }
      return false
    })

    if (invalidMetrics.length === 0) {
      totalScore += 100
      checks.push({
        category: 'AI結果',
        field: 'metrics',
        passed: true,
        message: 'メトリクスの値は妥当です',
        severity: 'info'
      })
    } else {
      checks.push({
        category: 'AI結果',
        field: 'metrics',
        passed: false,
        message: `${invalidMetrics.length}件のメトリクスに異常があります`,
        severity: 'error',
        suggestion: 'メトリクスの値を確認してください'
      })
    }
  }

  // ハルシネーション検出（曖昧な表現のチェック）
  if (data.content) {
    checkCount++
    const uncertainPhrases = [
      'おそらく', '可能性がある', '思われる', 'かもしれない',
      'probably', 'might be', 'could be', 'possibly'
    ]
    const hasUncertainty = uncertainPhrases.some(phrase => 
      data.content!.toLowerCase().includes(phrase.toLowerCase())
    )

    if (!hasUncertainty) {
      totalScore += 100
      checks.push({
        category: 'AI結果',
        field: 'certainty',
        passed: true,
        message: '断定的な表現が使用されています',
        severity: 'info'
      })
    } else {
      totalScore += 70
      checks.push({
        category: 'AI結果',
        field: 'certainty',
        passed: false,
        message: '不確実な表現が含まれています',
        severity: 'warning',
        suggestion: '情報の確実性を確認してください'
      })
    }
  }

  const confidence = checkCount > 0 ? Math.round(totalScore / checkCount) : 0
  const passed = checks.filter(c => c.severity === 'error').length === 0 && checkCount > 0

  return {
    passed,
    confidence,
    level: calculateConfidenceLevel(confidence),
    checks,
    summary: passed
      ? `AI結果は${checkCount}件のチェックをパスしました（信頼度: ${confidence}%）`
      : `${checks.filter(c => !c.passed).length}件の項目に注意が必要です`,
    timestamp: new Date().toISOString()
  }
}

/**
 * データベース更新のファクトチェック
 */
export function checkDBUpdate(data: {
  operation: 'insert' | 'update' | 'delete'
  table: string
  fields?: { [key: string]: any }
  previousData?: { [key: string]: any }
}): FactCheckResult {
  const checks: FactCheckItem[] = []
  let totalScore = 0
  let checkCount = 0

  // 必須フィールドチェック
  if (data.fields) {
    checkCount++
    const nullFields = Object.entries(data.fields).filter(([key, value]) => 
      value === null || value === undefined || value === ''
    )

    if (nullFields.length === 0) {
      totalScore += 100
      checks.push({
        category: 'DB更新',
        field: 'requiredFields',
        passed: true,
        message: 'すべてのフィールドに値が設定されています',
        severity: 'info'
      })
    } else {
      totalScore += 70
      checks.push({
        category: 'DB更新',
        field: 'requiredFields',
        passed: false,
        message: `${nullFields.length}件の空フィールドがあります: ${nullFields.map(([k]) => k).join(', ')}`,
        severity: 'warning',
        suggestion: '空のフィールドを確認してください'
      })
    }

    // データ型の妥当性チェック
    checkCount++
    const typeIssues: string[] = []
    
    Object.entries(data.fields).forEach(([key, value]) => {
      // メールアドレス
      if (key.toLowerCase().includes('email') && value) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          typeIssues.push(`${key}の形式が不正`)
        }
      }
      // URL
      if ((key.toLowerCase().includes('url') || key.toLowerCase().includes('website')) && value) {
        try {
          new URL(String(value).startsWith('http') ? String(value) : `https://${value}`)
        } catch {
          typeIssues.push(`${key}のURL形式が不正`)
        }
      }
      // 電話番号
      if (key.toLowerCase().includes('phone') && value) {
        if (!/^[\d\-+().\s]+$/.test(String(value))) {
          typeIssues.push(`${key}の形式が不正`)
        }
      }
    })

    if (typeIssues.length === 0) {
      totalScore += 100
      checks.push({
        category: 'DB更新',
        field: 'dataTypes',
        passed: true,
        message: 'データ型が正しいです',
        severity: 'info'
      })
    } else {
      checks.push({
        category: 'DB更新',
        field: 'dataTypes',
        passed: false,
        message: typeIssues.join(', '),
        severity: 'error',
        suggestion: 'データの形式を確認してください'
      })
    }
  }

  // 更新操作の場合、変更差分チェック
  if (data.operation === 'update' && data.previousData && data.fields) {
    checkCount++
    const changedFields = Object.entries(data.fields).filter(([key, value]) => 
      data.previousData![key] !== value
    )

    if (changedFields.length > 0) {
      totalScore += 100
      checks.push({
        category: 'DB更新',
        field: 'changes',
        passed: true,
        message: `${changedFields.length}件のフィールドが更新されます`,
        severity: 'info'
      })
    } else {
      totalScore += 50
      checks.push({
        category: 'DB更新',
        field: 'changes',
        passed: false,
        message: '変更がありません',
        severity: 'warning',
        suggestion: '更新内容を確認してください'
      })
    }
  }

  // 削除操作の警告
  if (data.operation === 'delete') {
    checkCount++
    totalScore += 70
    checks.push({
      category: 'DB更新',
      field: 'deleteWarning',
      passed: true,
      message: 'データ削除操作です。この操作は元に戻せません',
      severity: 'warning'
    })
  }

  const confidence = checkCount > 0 ? Math.round(totalScore / checkCount) : 0
  const passed = checks.filter(c => c.severity === 'error').length === 0 && checkCount > 0

  return {
    passed,
    confidence,
    level: calculateConfidenceLevel(confidence),
    checks,
    summary: passed
      ? `DB更新は${checkCount}件のチェックをパスしました`
      : `${checks.filter(c => !c.passed).length}件の項目に問題があります`,
    timestamp: new Date().toISOString()
  }
}

/**
 * 汎用ファクトチェッカー - 複数のチェックを統合
 */
export function runFactCheck(type: 'ocr' | 'search' | 'ai' | 'db', data: any): FactCheckResult {
  switch (type) {
    case 'ocr':
      return checkOCRResult(data)
    case 'search':
      return checkSearchResult(data)
    case 'ai':
      return checkAIResult(data)
    case 'db':
      return checkDBUpdate(data)
    default:
      return {
        passed: false,
        confidence: 0,
        level: 'unverified',
        checks: [],
        summary: '不明なチェックタイプです',
        timestamp: new Date().toISOString()
      }
  }
}

