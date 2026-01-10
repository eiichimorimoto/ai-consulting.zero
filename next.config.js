/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // キャッシュを無効化して、常に最新のコンテンツを配信
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
  // Next.js 16ではTurbopackがデフォルトのため、webpackとturbopackの両方を設定
  webpack: (config, { isServer }) => {
    if (isServer) {
      // サーバーサイドでpdfjs-distのワーカーファイルの解決を無効化
      config.resolve.alias = {
        ...config.resolve.alias,
        // ワーカーファイルのインポートを空のモジュールに置き換え
        'pdfjs-dist/build/pdf.worker.mjs': require.resolve('./lib/ocr/pdf-worker-stub.js'),
        'pdfjs-dist/build/pdf.worker.min.mjs': require.resolve('./lib/ocr/pdf-worker-stub.js'),
      }
    }
    return config
  },
  // Turbopack設定（Next.js 16で必要）
  turbopack: {
    resolveAlias: {
      'pdfjs-dist/build/pdf.worker.mjs': './lib/ocr/pdf-worker-stub.js',
      'pdfjs-dist/build/pdf.worker.min.mjs': './lib/ocr/pdf-worker-stub.js',
    },
  },
}

module.exports = nextConfig
