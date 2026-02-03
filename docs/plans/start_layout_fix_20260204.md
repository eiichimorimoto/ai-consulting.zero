# スタート画面レイアウト修正（2026-02-04）

## 要件
- チャット入力エリアを**常にブラウザ最下段に表示**
- 中央チャット表示エリアの**一番上のタイトルを固定**（スクロールしない）
- **ヘッダー下のタブ（Session Tabs）を固定**（ブラウザスクロールに影響されない）
- ブラウザは可変でも、上記仕様を満たす
- 他コードに影響を与えない

## 現状構造（問題）
- 最上位: `h-screen overflow-hidden` 済み
- Main: `flex flex-col min-h-0 overflow-hidden`
- **ScrollArea**（Radix）が `flex-1 min-h-0` だが、Flex子として高さが正しく制約されず、フッターが画面外に押し出されている可能性

## 対策案の検討

### 対策1: ScrollArea を plain div + overflow-y-auto に置き換え ★採用
- **内容**: Radix ScrollArea の代わりに `<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">` を使用
- **根拠**: 旧 start（確定版）では ChatView 内で `flex-1 overflow-y-auto` の div でスクロールしており、同パターンで確実に高さが制約される
- **影響**: `app/consulting/start/page.tsx` のみ。ScrollArea の import 削除。
- **scrollIntoView**: 既存の chatScrollRef（内側の div）はそのまま。スクロール可能な祖先が新しい div になり、正しく下端へスクロールする

### 対策2: ScrollArea を高さ固定のラッパーで囲む
- ラッパーに `flex-1 min-h-0 overflow-hidden`、ScrollArea に `h-full`
- Radix の Viewport が内部で min-height を持つ可能性があり、確実性で劣る → 不採用

### 対策3: main を CSS Grid に変更（grid-template-rows: auto 1fr auto）
- レイアウト変更が大きい。他コードへの影響リスク → 今回は不採用（対策1で不足なら検討）

### 対策4: 全 Flex チェーンに min-h-0 を付与
- 既に main / メインコンテナには付与済み。対策1の補完として有効。対策1実施で十分と判断。

## 採用方針
- **対策1** を実施する。
- 変更ファイルは **app/consulting/start/page.tsx** のみ。
- タブ・ヘッダー・タイトルは既に `flex-shrink-0` で固定扱い。スクロールするのは「チャットメッセージ領域」のみとする。

## 実装内容（事実確認）
1. ScrollArea を `<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">` に置き換え
2. 内側の `<div ref={chatScrollRef} className="max-w-3xl mx-auto space-y-6">` は変更なし
3. ScrollArea の import を削除
4. 最上位の `overflow-hidden` は既に適用済みのため変更なし

## 追記: 変更が反映されない原因（2026-02-04）

**原因**: AppHeader が root layout の body 直下にあり `h-16`（4rem）。start ページの最上位 div が `h-screen`（100vh）のため、**合計高さ = 4rem + 100vh > 100vh** となりブラウザが縦スクロールし、入力エリアがビューポート外に隠れていた。

**対策**: start ページの最上位 div を `h-[calc(100vh-4rem)]` に変更。ヘッダー分を差し引いた高さにすることで、入力エリアが常にビューポート内に収まる。
