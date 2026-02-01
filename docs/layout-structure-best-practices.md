# レイアウト構造のベストプラクティス

## 相談画面のレイアウト構造（確定版）

### 重要原則
**Git履歴の最終確定版（GOになった実装）を必ず確認してから修正する**

### 確定したレイアウト構造

#### page.tsx（メインコンテナ）
```tsx
<div className={`flex flex-1 flex-col overflow-hidden ...`}>
  <ChatView messages={messages} isTyping={isTyping} />
  <MessageInput ... />
</div>
```

**ポイント**:
- `flex flex-col`: 縦方向に配置
- `overflow-hidden`: 子要素のスクロールを制御
- ChatViewとMessageInputが縦に並ぶ

#### ChatView.tsx（チャット表示エリア）
```tsx
<div className="relative flex h-full flex-col overflow-hidden">
  {/* 背景 */}
  <div className="pointer-events-none absolute inset-0 opacity-35 z-0">
    {/* グラデーション、ドットパターン等 */}
  </div>
  
  {/* チャットコンテンツ */}
  <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto scroll-smooth">
    {messages.length === 0 ? (
      <div className="flex h-full items-center justify-center pointer-events-auto">
        {/* ウェルカムメッセージ */}
      </div>
    ) : (
      <div className="space-y-1 py-4 pointer-events-auto">
        {messages.map((message) => (
          <ChatMessage ... />
        ))}
        {isTyping && <TypingIndicator />}
      </div>
    )}
  </div>
</div>
```

**ポイント**:
- **外側のdiv**: `h-full` で親の高さを100%使用
- **内側のスクロールdiv**: `flex-1` で残りのスペースを占有、`overflow-y-auto` でスクロール可能
- 背景は `absolute` で配置し、コンテンツの上に重ならないように `z-0`

#### MessageInput.tsx（入力エリア）
```tsx
<div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-6 pb-24 px-4">
  {/* 入力フォーム */}
</div>
```

**ポイント**:
- 固定高さ（`pt-6 pb-24`）
- 画面下部に固定される
- ChatViewが`flex-1`なので、残りのスペースを自動的に占有

---

## なぜこの構造なのか

### 1. Flexboxの役割
```
親コンテナ（flex flex-col）
├── ChatView（flex-1で伸縮）← 残りの高さ全てを使用
└── MessageInput（固定高さ）← 常に下部に配置
```

### 2. スクロールの制御
- **親（page.tsx）**: `overflow-hidden` でスクロールを子に委譲
- **ChatView**: 内部の `overflow-y-auto` でスクロール可能に
- **MessageInput**: スクロールせず固定

### 3. 背景の配置
- `absolute` で配置し、フローから除外
- `pointer-events-none` でクリックイベントを透過
- コンテンツは `relative z-10` で前面に配置

---

## よくある間違い

### ❌ 間違い1: ChatView自体を`flex-1`にする
```tsx
// 間違い
<div className="relative flex flex-1 flex-col overflow-hidden">
```
**問題**: MessageInputが見えなくなる

### ❌ 間違い2: 親に`overflow-hidden`を付けない
```tsx
// 間違い
<div className={`flex flex-1 flex-col ...`}>
```
**問題**: スクロールが親全体に適用され、MessageInputも一緒にスクロールしてしまう

### ❌ 間違い3: stickyを使う
```tsx
// 間違い
<div className="sticky top-0 z-20 ...">
```
**問題**: スクロール構造が複雑化し、意図しない動作になる

---

## 修正時の確認手順

### Step 1: Git履歴で最終確定版を確認
```bash
git log --oneline -20 | grep -E "chat|input|layout|fix.*UI"
git show [コミットハッシュ]:app/consulting/components/ChatView.tsx
```

### Step 2: 構造が正しいか確認
- [ ] ChatView: `h-full flex-col overflow-hidden`
- [ ] 内部スクロールdiv: `flex-1 overflow-y-auto`
- [ ] MessageInput: 固定高さ（`pt-6 pb-24`等）

### Step 3: 動作確認
- [ ] チャット入力エリアが画面下部に固定
- [ ] チャット表示エリアがスクロール可能
- [ ] 背景が正しく表示

---

## 参考コミット

- `161915c`: チャットスクロール修正（最終確定版）
- `db2bfbf`: 相談画面UI改善

**重要**: 修正前に必ずこれらのコミットを確認すること
