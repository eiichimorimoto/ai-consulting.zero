import { existsSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'error'
  category: string
  message: string
  details?: any
  fixable: boolean
  fixAction?: string
}

export interface HealthReport {
  overall: 'healthy' | 'warning' | 'error'
  checks: HealthCheckResult[]
  timestamp: string
}

/**
 * Next.js関連のヘルスチェック
 */
export async function checkNextJS(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = []
  const projectRoot = process.cwd()

  // 1. next.config.jsの存在確認
  const nextConfigPath = join(projectRoot, 'next.config.js')
  if (!existsSync(nextConfigPath)) {
    results.push({
      status: 'error',
      category: 'Next.js',
      message: 'next.config.jsが見つかりません',
      fixable: true,
      fixAction: 'create_next_config'
    })
  } else {
    results.push({
      status: 'healthy',
      category: 'Next.js',
      message: 'next.config.jsが存在します',
      fixable: false
    })
  }

  // 2. .nextディレクトリの確認
  const nextDir = join(projectRoot, '.next')
  if (existsSync(nextDir)) {
    try {
      const stats = statSync(nextDir)
      if (!stats.isDirectory()) {
        results.push({
          status: 'error',
          category: 'Next.js',
          message: '.nextがディレクトリではありません',
          fixable: true,
          fixAction: 'clean_cache'
        })
      } else {
        results.push({
          status: 'healthy',
          category: 'Next.js',
          message: '.nextディレクトリが存在します',
          fixable: false
        })
      }
    } catch (error: unknown) {
      results.push({
        status: 'warning',
        category: 'Next.js',
        message: '.nextディレクトリの確認中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error),
        fixable: true,
        fixAction: 'clean_cache'
      })
    }
  } else {
    results.push({
      status: 'warning',
      category: 'Next.js',
      message: '.nextディレクトリが存在しません（初回ビルド前は正常）',
      fixable: false
    })
  }

  // 3. appディレクトリの確認
  const appDir = join(projectRoot, 'app')
  if (!existsSync(appDir)) {
    results.push({
      status: 'error',
      category: 'Next.js',
      message: 'appディレクトリが見つかりません',
      fixable: false
    })
  } else {
    results.push({
      status: 'healthy',
      category: 'Next.js',
      message: 'appディレクトリが存在します',
      fixable: false
    })
  }

  // 4. middleware.tsの確認
  const middlewarePath = join(projectRoot, 'middleware.ts')
  if (!existsSync(middlewarePath)) {
    results.push({
      status: 'warning',
      category: 'Next.js',
      message: 'middleware.tsが見つかりません（認証機能に影響する可能性があります）',
      fixable: false
    })
  } else {
    results.push({
      status: 'healthy',
      category: 'Next.js',
      message: 'middleware.tsが存在します',
      fixable: false
    })
  }

  return results
}

/**
 * CSS関連のヘルスチェック
 */
export async function checkCSS(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = []
  const projectRoot = process.cwd()

  // 1. globals.cssの確認
  const globalsCssPath = join(projectRoot, 'app', 'globals.css')
  if (!existsSync(globalsCssPath)) {
    results.push({
      status: 'error',
      category: 'CSS',
      message: 'app/globals.cssが見つかりません',
      fixable: true,
      fixAction: 'create_globals_css'
    })
  } else {
    results.push({
      status: 'healthy',
      category: 'CSS',
      message: 'globals.cssが存在します',
      fixable: false
    })
  }

  // 2. tailwind.config.jsの確認
  const tailwindConfigPath = join(projectRoot, 'tailwind.config.js')
  if (!existsSync(tailwindConfigPath)) {
    results.push({
      status: 'error',
      category: 'CSS',
      message: 'tailwind.config.jsが見つかりません',
      fixable: true,
      fixAction: 'create_tailwind_config'
    })
  } else {
    try {
      const configContent = readFileSync(tailwindConfigPath, 'utf-8')
      if (!configContent.includes('content')) {
        results.push({
          status: 'warning',
          category: 'CSS',
          message: 'tailwind.config.jsにcontent設定がありません',
          fixable: true,
          fixAction: 'fix_tailwind_config'
        })
      } else {
        results.push({
          status: 'healthy',
          category: 'CSS',
          message: 'tailwind.config.jsが正しく設定されています',
          fixable: false
        })
      }
    } catch (error: unknown) {
      results.push({
        status: 'error',
        category: 'CSS',
        message: 'tailwind.config.jsの読み込みに失敗しました',
        details: error instanceof Error ? error.message : String(error),
        fixable: true,
        fixAction: 'fix_tailwind_config'
      })
    }
  }

  // 3. postcss.config.jsの確認
  const postcssConfigPath = join(projectRoot, 'postcss.config.js')
  if (!existsSync(postcssConfigPath)) {
    results.push({
      status: 'warning',
      category: 'CSS',
      message: 'postcss.config.jsが見つかりません',
      fixable: true,
      fixAction: 'create_postcss_config'
    })
  } else {
    results.push({
      status: 'healthy',
      category: 'CSS',
      message: 'postcss.config.jsが存在します',
      fixable: false
    })
  }

  return results
}

/**
 * キャッシュ関連のヘルスチェック
 */
export async function checkCache(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = []
  const projectRoot = process.cwd()

  // 1. .nextディレクトリの整合性確認
  const nextDir = join(projectRoot, '.next')
  if (existsSync(nextDir)) {
    try {
      // .next/cacheの確認
      const cacheDir = join(nextDir, 'cache')
      if (existsSync(cacheDir)) {
        const cacheStats = statSync(cacheDir)
        const cacheAge = Date.now() - cacheStats.mtimeMs
        const daysOld = cacheAge / (1000 * 60 * 60 * 24)

        if (daysOld > 7) {
          results.push({
            status: 'warning',
            category: 'キャッシュ',
            message: `キャッシュが${Math.floor(daysOld)}日間更新されていません`,
            details: { daysOld },
            fixable: true,
            fixAction: 'clean_cache'
          })
        } else {
          results.push({
            status: 'healthy',
            category: 'キャッシュ',
            message: 'キャッシュは正常です',
            fixable: false
          })
        }
      } else {
        results.push({
          status: 'warning',
          category: 'キャッシュ',
          message: '.next/cacheディレクトリが存在しません',
          fixable: true,
          fixAction: 'clean_cache'
        })
      }
    } catch (error: unknown) {
      results.push({
        status: 'warning',
        category: 'キャッシュ',
        message: 'キャッシュディレクトリの確認中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error),
        fixable: true,
        fixAction: 'clean_cache'
      })
    }
  }

  // 2. .turboディレクトリの確認（Turbopack使用時）
  const turboDir = join(projectRoot, '.turbo')
  if (existsSync(turboDir)) {
    try {
      const turboStats = statSync(turboDir)
      const turboAge = Date.now() - turboStats.mtimeMs
      const daysOld = turboAge / (1000 * 60 * 60 * 24)

      if (daysOld > 7) {
        results.push({
          status: 'warning',
          category: 'キャッシュ',
          message: `Turbopackキャッシュが${Math.floor(daysOld)}日間更新されていません`,
          details: { daysOld },
          fixable: true,
          fixAction: 'clean_turbo_cache'
        })
      }
    } catch {
      // エラーは無視（Turbopack未使用の可能性）
    }
  }

  return results
}

/**
 * サーバー関連のヘルスチェック
 */
export async function checkServer(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = []

  // 1. 環境変数の確認
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]

  const missingEnvVars: string[] = []
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingEnvVars.push(envVar)
    }
  }

  if (missingEnvVars.length > 0) {
    results.push({
      status: 'error',
      category: 'サーバー',
      message: `必須環境変数が設定されていません: ${missingEnvVars.join(', ')}`,
      details: { missing: missingEnvVars },
      fixable: false
    })
  } else {
    results.push({
      status: 'healthy',
      category: 'サーバー',
      message: '必須環境変数が設定されています',
      fixable: false
    })
  }

  // 2. package.jsonの確認
  const projectRoot = process.cwd()
  const packageJsonPath = join(projectRoot, 'package.json')
  if (!existsSync(packageJsonPath)) {
    results.push({
      status: 'error',
      category: 'サーバー',
      message: 'package.jsonが見つかりません',
      fixable: false
    })
  } else {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
      if (!packageJson.dependencies || !packageJson.dependencies.next) {
        results.push({
          status: 'error',
          category: 'サーバー',
          message: 'package.jsonにNext.jsの依存関係がありません',
          fixable: true,
          fixAction: 'install_dependencies'
        })
      } else {
        results.push({
          status: 'healthy',
          category: 'サーバー',
          message: 'package.jsonが正常です',
          fixable: false
        })
      }
    } catch (error: unknown) {
      results.push({
        status: 'error',
        category: 'サーバー',
        message: 'package.jsonの読み込みに失敗しました',
        details: error instanceof Error ? error.message : String(error),
        fixable: false
      })
    }
  }

  // 3. node_modulesの確認
  const nodeModulesPath = join(projectRoot, 'node_modules')
  if (!existsSync(nodeModulesPath)) {
    results.push({
      status: 'error',
      category: 'サーバー',
      message: 'node_modulesが見つかりません（npm installが必要です）',
      fixable: true,
      fixAction: 'install_dependencies'
    })
  } else {
    // nextモジュールの確認
    const nextModulePath = join(nodeModulesPath, 'next')
    if (!existsSync(nextModulePath)) {
      results.push({
        status: 'error',
        category: 'サーバー',
        message: 'Next.jsモジュールが見つかりません',
        fixable: true,
        fixAction: 'install_dependencies'
      })
    } else {
      results.push({
        status: 'healthy',
        category: 'サーバー',
        message: 'node_modulesが正常です',
        fixable: false
      })
    }
  }

  return results
}

/**
 * すべてのヘルスチェックを実行
 */
export async function runHealthChecks(): Promise<HealthReport> {
  const checks: HealthCheckResult[] = []

  // 各カテゴリのチェックを並列実行
  const [nextJSChecks, cssChecks, cacheChecks, serverChecks] = await Promise.all([
    checkNextJS(),
    checkCSS(),
    checkCache(),
    checkServer()
  ])

  checks.push(...nextJSChecks, ...cssChecks, ...cacheChecks, ...serverChecks)

  // 全体のステータスを決定
  const hasError = checks.some(c => c.status === 'error')
  const hasWarning = checks.some(c => c.status === 'warning')
  const overall: 'healthy' | 'warning' | 'error' = hasError ? 'error' : hasWarning ? 'warning' : 'healthy'

  return {
    overall,
    checks,
    timestamp: new Date().toISOString()
  }
}

