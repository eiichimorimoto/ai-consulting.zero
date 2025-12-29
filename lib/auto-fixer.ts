import { existsSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

export interface FixResult {
  success: boolean
  message: string
  action: string
  details?: any
}

/**
 * Next.js設定ファイルを作成
 */
export async function createNextConfig(): Promise<FixResult> {
  try {
    const projectRoot = process.cwd()
    const configPath = join(projectRoot, 'next.config.js')
    
    if (existsSync(configPath)) {
      return {
        success: false,
        message: 'next.config.jsは既に存在します',
        action: 'create_next_config'
      }
    }

    const configContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
`

    writeFileSync(configPath, configContent, 'utf-8')
    
    return {
      success: true,
      message: 'next.config.jsを作成しました',
      action: 'create_next_config'
    }
  } catch (error: any) {
    return {
      success: false,
      message: `next.config.jsの作成に失敗しました: ${error.message}`,
      action: 'create_next_config',
      details: error.message
    }
  }
}

/**
 * キャッシュをクリーンアップ
 */
export async function cleanCache(): Promise<FixResult> {
  try {
    const projectRoot = process.cwd()
    const nextDir = join(projectRoot, '.next')
    
    if (existsSync(nextDir)) {
      rmSync(nextDir, { recursive: true, force: true })
      return {
        success: true,
        message: '.nextディレクトリを削除しました',
        action: 'clean_cache'
      }
    } else {
      return {
        success: true,
        message: '.nextディレクトリは存在しませんでした',
        action: 'clean_cache'
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: `キャッシュのクリーンアップに失敗しました: ${error.message}`,
      action: 'clean_cache',
      details: error.message
    }
  }
}

/**
 * Turbopackキャッシュをクリーンアップ
 */
export async function cleanTurboCache(): Promise<FixResult> {
  try {
    const projectRoot = process.cwd()
    const turboDir = join(projectRoot, '.turbo')
    
    if (existsSync(turboDir)) {
      rmSync(turboDir, { recursive: true, force: true })
      return {
        success: true,
        message: '.turboディレクトリを削除しました',
        action: 'clean_turbo_cache'
      }
    } else {
      return {
        success: true,
        message: '.turboディレクトリは存在しませんでした',
        action: 'clean_turbo_cache'
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Turbopackキャッシュのクリーンアップに失敗しました: ${error.message}`,
      action: 'clean_turbo_cache',
      details: error.message
    }
  }
}

/**
 * globals.cssを作成
 */
export async function createGlobalsCSS(): Promise<FixResult> {
  try {
    const projectRoot = process.cwd()
    const appDir = join(projectRoot, 'app')
    const cssPath = join(appDir, 'globals.css')
    
    if (existsSync(cssPath)) {
      return {
        success: false,
        message: 'globals.cssは既に存在します',
        action: 'create_globals_css'
      }
    }

    // appディレクトリが存在しない場合は作成
    if (!existsSync(appDir)) {
      mkdirSync(appDir, { recursive: true })
    }

    const cssContent = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}
`

    writeFileSync(cssPath, cssContent, 'utf-8')
    
    return {
      success: true,
      message: 'globals.cssを作成しました',
      action: 'create_globals_css'
    }
  } catch (error: any) {
    return {
      success: false,
      message: `globals.cssの作成に失敗しました: ${error.message}`,
      action: 'create_globals_css',
      details: error.message
    }
  }
}

/**
 * tailwind.config.jsを作成または修正
 */
export async function createTailwindConfig(): Promise<FixResult> {
  try {
    const projectRoot = process.cwd()
    const configPath = join(projectRoot, 'tailwind.config.js')
    
    const configContent = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`

    writeFileSync(configPath, configContent, 'utf-8')
    
    return {
      success: true,
      message: 'tailwind.config.jsを作成しました',
      action: 'create_tailwind_config'
    }
  } catch (error: any) {
    return {
      success: false,
      message: `tailwind.config.jsの作成に失敗しました: ${error.message}`,
      action: 'create_tailwind_config',
      details: error.message
    }
  }
}

/**
 * tailwind.config.jsを修正（content設定を追加）
 */
export async function fixTailwindConfig(): Promise<FixResult> {
  try {
    const projectRoot = process.cwd()
    const configPath = join(projectRoot, 'tailwind.config.js')
    
    if (!existsSync(configPath)) {
      return createTailwindConfig()
    }

    let configContent = readFileSync(configPath, 'utf-8')
    
    // content設定がない場合は追加
    if (!configContent.includes('content:')) {
      const contentConfig = `  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],`
      
      // module.exportsの後に追加
      configContent = configContent.replace(
        /module\.exports\s*=\s*\{/,
        `module.exports = {\n${contentConfig}`
      )
      
      writeFileSync(configPath, configContent, 'utf-8')
      
      return {
        success: true,
        message: 'tailwind.config.jsにcontent設定を追加しました',
        action: 'fix_tailwind_config'
      }
    } else {
      return {
        success: false,
        message: 'tailwind.config.jsには既にcontent設定があります',
        action: 'fix_tailwind_config'
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: `tailwind.config.jsの修正に失敗しました: ${error.message}`,
      action: 'fix_tailwind_config',
      details: error.message
    }
  }
}

/**
 * postcss.config.jsを作成
 */
export async function createPostCSSConfig(): Promise<FixResult> {
  try {
    const projectRoot = process.cwd()
    const configPath = join(projectRoot, 'postcss.config.js')
    
    if (existsSync(configPath)) {
      return {
        success: false,
        message: 'postcss.config.jsは既に存在します',
        action: 'create_postcss_config'
      }
    }

    const configContent = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`

    writeFileSync(configPath, configContent, 'utf-8')
    
    return {
      success: true,
      message: 'postcss.config.jsを作成しました',
      action: 'create_postcss_config'
    }
  } catch (error: any) {
    return {
      success: false,
      message: `postcss.config.jsの作成に失敗しました: ${error.message}`,
      action: 'create_postcss_config',
      details: error.message
    }
  }
}

/**
 * 依存関係をインストール
 */
export async function installDependencies(): Promise<FixResult> {
  try {
    const projectRoot = process.cwd()
    
    // npm installを実行
    execSync('npm install', {
      cwd: projectRoot,
      stdio: 'pipe'
    })
    
    return {
      success: true,
      message: '依存関係のインストールが完了しました',
      action: 'install_dependencies'
    }
  } catch (error: any) {
    return {
      success: false,
      message: `依存関係のインストールに失敗しました: ${error.message}`,
      action: 'install_dependencies',
      details: error.message
    }
  }
}

/**
 * 指定されたアクションを実行
 */
export async function executeFix(action: string): Promise<FixResult> {
  switch (action) {
    case 'create_next_config':
      return createNextConfig()
    case 'clean_cache':
      return cleanCache()
    case 'clean_turbo_cache':
      return cleanTurboCache()
    case 'create_globals_css':
      return createGlobalsCSS()
    case 'create_tailwind_config':
      return createTailwindConfig()
    case 'fix_tailwind_config':
      return fixTailwindConfig()
    case 'create_postcss_config':
      return createPostCSSConfig()
    case 'install_dependencies':
      return installDependencies()
    default:
      return {
        success: false,
        message: `不明な修復アクション: ${action}`,
        action
      }
  }
}

/**
 * 複数の修復アクションを順次実行
 */
export async function executeFixes(actions: string[]): Promise<FixResult[]> {
  const results: FixResult[] = []
  
  for (const action of actions) {
    const result = await executeFix(action)
    results.push(result)
    
    // エラーが発生した場合は停止（オプション）
    // if (!result.success) break
  }
  
  return results
}

