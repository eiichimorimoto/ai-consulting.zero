/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // キャッシュを無効化して、常に最新のコンテンツを配信
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
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
        "pdfjs-dist/build/pdf.worker.mjs": require.resolve("./lib/ocr/pdf-worker-stub.js"),
        "pdfjs-dist/build/pdf.worker.min.mjs": require.resolve("./lib/ocr/pdf-worker-stub.js"),
      }
    }
    return config
  },
  // Turbopack設定（Next.js 16で必要）
  turbopack: {
    // Turbopackでも同様の設定が必要な場合はここに追加
    // 現時点では空の設定でエラーを回避
  },
  // pdfjs-distのワーカーファイルをパブリックにコピー
  async rewrites() {
    return []
  },
}

module.exports = nextConfig
