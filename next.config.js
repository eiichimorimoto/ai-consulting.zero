/** @type {import('next').NextConfig} */
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
}

module.exports = nextConfig
