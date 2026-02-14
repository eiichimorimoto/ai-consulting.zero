// @ts-check
import nextConfig from "eslint-config-next"
import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const eslintConfig = [
  // Next.js推奨ルール（flat config ネイティブ）
  ...nextConfig,
  ...nextCoreWebVitals,
  ...nextTypescript,

  // プロジェクト固有ルール
  {
    rules: {
      // --- TypeScript ---
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // --- React ---
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "warn",

      // --- コード品質 ---
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],

      // --- インポート ---
      "react/react-in-jsx-scope": "off",
    },
  },

  // テストファイルの例外ルール
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },

  // 除外パターン
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "backups/**",
      "public/pdf.worker.min.mjs",
      "scripts/**",
      "slides/**",
    ],
  },
]

export default eslintConfig
