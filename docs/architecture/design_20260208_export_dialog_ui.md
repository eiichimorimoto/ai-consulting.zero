# レポートエクスポート画面の修正案

## 要件

1. **表示順**: AIの回答を先頭に、会話・セクションをその下に（位置を逆にする）
2. **会話全体**: 初期状態でチェックを入れない
3. **AIの回答**: 作成時間を表示、新しいものから表示、デフォルトでチェックを入れる
4. **カウント**: 会話/セクションのレポートはカウントしない（バッジはAI回答件数のみ）

---

## 修正案

### 案A: 最小変更（推奨）

| 項目 | 内容 |
|------|------|
| ブロック順 | JSXで「AIの回答」ブロックを「会話・セクション」ブロックより上に移動するだけ。既存の `buildSectionsForExport` はすでに fromDify を先にしているので出力順は変更不要。 |
| 会話の初期チェック | `useEffect` 内の `setSelectedSections(new Set(['chat']))` を削除。初期は会話セクションは未選択。 |
| AIの回答 | (1) `getDifyContentItems` の結果を `createdAt` 降順でソートした配列を表示用に使用。(2) 各項目に作成時間を表示（`createdAt` を日時フォーマット）。(3) 初期状態で全AI回答を選択: `useEffect` で `difyItems` をセットしたあと `setSelectedDifyIds(new Set(items.map(i => i.id)))` を実行。※ state の更新タイミングのため、同一 `useEffect` 内で `getDifyContentItems(messages)` を変数に取り、`setDifyItems(items)` と `setSelectedDifyIds(new Set(items.map(i => i.id)))` の両方を実行。 |
| バッジのカウント | `app/consulting/start/page.tsx` の「レポートをエクスポート」横の件数は、現在 `session.currentSession.messages.length`。これを `getDifyContentItems(session.currentSession.messages).length` に変更し、AI回答件数のみ表示。0件のときはバッジを出さない（現状は messages.length > 0 で表示しているので、difyCount > 0 で表示に変更）。 |

**影響ファイル**: `components/consulting/ExportDialog.tsx`, `app/consulting/start/page.tsx`（2ファイル。ルールに従い1ファイルずつ実施）

---

### 案B: バッジを「レポート件数」として明確化

案Aに加え、バッジのラベルを「N件」のまま「AIの回答N件」とツールチップや aria-label で補足する。表示テキストは「N件」のままで、意味だけ「AI回答の件数」に統一（案Aと同じ）。  
→ 実装コストが増えるだけで要件は案Aで満たせるため、案Bの追加は任意。

---

## 採用: 案A

- 要件をすべて満たす
- 変更箇所が明確で、既存の出力順（AI主・会話付録）も維持される

---

## ファクトチェック

| チェック項目 | 結果 |
|--------------|------|
| ブロック順の入れ替えはJSXの並び順の変更のみでよいか | ✅ はい。出力順は `buildSectionsForExport` で既に fromDify が先。 |
| 会話の初期チェック削除で、他に selectedSections に依存する初期化はないか | ✅ なし。toggleAll は「全選択/全解除」で、初期状態の影響のみ。 |
| AIの回答の「新しい順」は createdAt の降順で正しいか | ✅ getDifyContentItems は messages 順で作成し、createdAt は m.timestamp。メッセージが時系列なら新しいほど createdAt が大きい。降順で正しい。 |
| createdAt が undefined の項目の並び | ✅ ソート時 undefined は末尾に回す（`(a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')` で、undefined 同士は等しく、他は文字列比較で問題なし）。 |
| 初期で「全AI回答を選択」すると、AIが0件のときは hasSelection が false になるか | ✅ selectedDifyIds が空、selectedSections も空なので hasSelection は false。プレビュー・ダウンロードは disabled のまま。 |
| バッジをAI回答件数にした場合、AI回答0で会話だけあるセッションではバッジ非表示でよいか | ✅ 要件「会話/セクションのレポートはカウントしない」により、バッジは「レポートとして数えるAI回答の数」のみでよい。0件なら非表示でよい。 |
| 変更は2ファイルのみで、段階的実行（ExportDialog → start/page）で進められるか | ✅ はい。 |

---

## 実装順序

1. **ExportDialog.tsx**  
   ブロック順入れ替え、会話の初期チェック削除、AIの回答を新着順・作成時間表示・デフォルト全選択。

2. **app/consulting/start/page.tsx**  
   バッジの件数を `getDifyContentItems(...).length` に変更、0件のときバッジ非表示。
