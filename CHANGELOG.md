# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-01-28

### Security
- **APIキーローテーション実施**
  - ANTHROPIC_API_KEY: 新規キー発行・置換完了
  - BRAVE_SEARCH_API_KEY: 新規キー発行・置換完了
  - 未使用APIキー削除（3件）
    - FIRECRAWL_API_KEY
    - GOOGLE_AI_API_KEY
    - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  - ローカル環境（.env.local）更新完了
  - Vercel本番環境変数更新完了
  - 動作確認済み（diagnose-preview, company-intel）
  - Git履歴クリーン確認（APIキー漏洩なし）

### Note
- .env.localは.gitignoreで保護されており、Git履歴には含まれていません
- 古いAPIキーは他プロジェクトで使用している可能性があるため無効化せず
- このプロジェクトは新規発行キーを使用中
