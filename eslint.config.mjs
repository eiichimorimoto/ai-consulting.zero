// @ts-check
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Next.js推奨ルール
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // プロジェクト固有ルール
  {
    rules: {
      // --- TypeScript ---
      // 既存の any は許容（レビュー報告 #13 対応: 段階的に厳格化）
      "@typescript-eslint/no-explicit-any": "warn",
      // 未使用変数は警告（_ プレフィックスは除外）
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // --- React ---
      // React Hooks の依存配列チェック
      "react-hooks/exhaustive-deps": "warn",
      // img タグ → next/image を推奨
      "@next/next/no-img-element": "warn",

      // --- コード品質 ---
      // console.log は警告（本番コード混入防止）
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // 厳密等価演算子を強制
      eqeqeq: ["error", "always"],

      // --- インポート ---
      // Next.js が自動提供する React のインポートは不要
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
      ".next/",
      "node_modules/",
      "coverage/",
      "backups/",
      "public/pdf.worker.min.mjs",
      "scripts/",
    ],
  },
];

export default eslintConfig;
