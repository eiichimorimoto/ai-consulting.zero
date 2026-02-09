# Brainstorm: 埋め込み型・高精度音声認識（STT）

> 作成: 2026-02-14  
> 背景: 現行の Web Speech API で「売売上売上の売上…」「伸び悩み」の繰り返しなど認識が不安定なため、精度の高いSTTをアプリに埋め込みたい。

---

## 現状の課題

- **入力**: `useVoiceInput.ts` で **Web Speech API（ブラウザ標準）** を使用
- **症状**: 日本語で同じ語が繰り返される・噛む（例: 売上の伸び悩み → 売売上売上の…）
- **要望**: ユーザーに別アプリ（Wispr等）のインストールは求めず、**当アプリ内に高精度な音声認識を埋め込みたい**

---

## 埋め込み可能な選択肢（概要）

| 方式 | 精度 | コスト | 実装イメージ | 備考 |
|------|------|--------|--------------|------|
| **A. バックエンド + OpenAI Whisper API** | 高 | 従量課金（$0.006/分など） | マイク→録音→POST /api/stt→Whisper→テキスト返却 | APIキーはサーバー側のみ。日本語指定可。 |
| **B. バックエンド + Google Cloud Speech-to-Text** | 高 | 従量課金 | 同上、Google APIを呼ぶ | 日本語・Chirp モデルで高精度。 |
| **C. ブラウザ内 Whisper（Wasm/Transformers.js）** | 中〜高 | 無料 | モデルをDLしてブラウザで推論 | サーバー不要・プライバシー良いが、初回DL・メモリ負荷あり。 |

**運用・実装のしやすさ**では **A（Whisper API）** がおすすめです。既に OpenAI を使っている場合はキー管理もまとめやすいです。

---

## 推奨フロー: バックエンド + Whisper API（案）

1. **フロント**
   - マイクボタン押下 → `getUserMedia` + `MediaRecorder` で録音開始
   - 再度押下（または「停止」）で録音停止 → 音声 Blob を取得
   - `POST /api/stt` に FormData（`file` に音声）で送信
2. **バックエンド（/api/stt）**
   - 認証チェック（セッション等）
   - 受け取った音声を OpenAI Whisper API に送信（`language: "ja"` 推奨）
   - 返却テキストを JSON で返す（例: `{ "text": "売上の伸び悩みについて…" }`)
3. **フロント**
   - レスポンスの `text` を入力欄にセット（または追記）

**フォーマット**: Whisper は mp3, mp4, webm, wav 等に対応。ブラウザの `MediaRecorder` は多くの環境で webm が使えるので、そのまま送る形で可。

---

## 運用イメージ

- **現行のマイクボタン**を「録音→送信→認識結果を入力欄に反映」に変更するだけでも、**同じUIのまま**精度だけ上げられる。
- オプションで「従来の Web Speech API（リアルタイム表示）」「Whisper 録音送信」を切り替え可能にすることもできる。

---

## 実装済み（2026-02-14）

1. **POST /api/stt**  
   認証（Supabase）、FormData の `audio` 受け取り、OpenAI Whisper API（`language: 'ja'`）、`{ text }` 返却。25MB 以下に制限。
2. **useVoiceInput**  
   Web Speech API を廃止し、**MediaRecorder で録音 → 停止で /api/stt に POST → 返却テキストを transcript にセット**する形に変更。既存の戻り値（isListening, transcript, startListening, stopListening, resetTranscript, error, enableAICorrection, setEnableAICorrection）はそのまま。
3. **読み上げ**  
   従来どおり Web Speech API（`speechSynthesis`）のまま変更なし。
