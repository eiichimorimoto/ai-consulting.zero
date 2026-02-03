# フォント・サイズ指定と現状の差分

## 1. フォント（Google Fonts）

| 用途 | 指定 | 現状 | 差分 |
|------|------|------|------|
| **本文（チャットなど）** | Inter | ✅ Inter を layout で読み込み、body で使用。globals.css は `Noto Sans JP`, `Inter` の順。 | 指定どおり。 |
| **見出し（セッション名など）** | IBM Plex Sans | ❌ 未読み込み・未使用。見出しも body 継承（Noto Sans JP / Inter）。 | **IBM Plex Sans が未導入。** |
| **データ・ステップ番号など** | JetBrains Mono | △ `font-mono` を使用している箇所あり。Tailwind の font-mono はシステム等幅フォントで、JetBrains Mono は未読み込み。 | **JetBrains Mono が未導入。** |

**現状の layout.tsx で読み込んでいるフォント:** Inter, Orbitron, Montserrat, Noto_Sans_JP, Bebas_Neue（IBM Plex Sans / JetBrains Mono はなし）

---

## 2. サイズ・行の高さ

| 要素 | 指定 | 現状 | 差分 |
|------|------|------|------|
| **チャットメッセージ本文** | text-sm (14px), leading-relaxed (1.625) | `text-sm leading-relaxed`（start/page.tsx メッセージ本文） | ✅ 一致 |
| **タイムスタンプ** | text-xs (12px) | `text-xs text-muted-foreground`（同 1291–1292 行付近） | ✅ 一致 |
| **セッション名（左サイドバー）** | text-xl (20px) | `text-xl font-bold`（同 1017 行・currentSession.name） | ✅ 一致 |
| **ステップタイトル** | text-sm (14px) | `font-semibold text-sm`（同 1059 行・step.title） | ✅ 一致 |
| **ステップ番号** | text-xs (12px) | `text-xs font-mono`（同 1051 行・STEP N） | ✅ サイズは一致。フォントは JetBrains Mono 未使用 |

---

## 3. まとめ

- **サイズ・行間**: チャット本文・タイムスタンプ・セッション名・ステップタイトル・ステップ番号はいずれも指定どおり（text-sm / text-xs / text-xl / leading-relaxed など）。
- **フォントの差分**:
  1. **IBM Plex Sans** … 読み込んでおらず、見出し（セッション名など）に使われていない。
  2. **JetBrains Mono** … 読み込んでおらず、ステップ番号などは `font-mono`（システム等幅）のまま。

指定に完全に合わせるには、layout で IBM Plex Sans と JetBrains Mono を追加し、見出しに IBM Plex Sans、データ・ステップ番号に JetBrains Mono を適用する必要があります。
