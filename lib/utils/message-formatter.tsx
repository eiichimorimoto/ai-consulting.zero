/**
 * メッセージフォーマッター
 *
 * AIメッセージを視覚的に読みやすくフォーマットする
 *
 * @module lib/utils/message-formatter
 */

import React from "react"

/**
 * AIメッセージを視覚的に読みやすくフォーマット
 *
 * 対応フォーマット:
 * - 見出し: ## テキスト → <h3>テキスト</h3>
 * - 太字: **テキスト** → <strong>テキスト</strong>
 * - リスト: - 項目 → <ul><li>項目</li></ul>
 * - 番号付きリスト: 1. 項目 → <ol><li>項目</li></ol>
 * - 改行: \n\n → <br />
 *
 * @param text - フォーマット対象のテキスト
 * @returns フォーマット済みのReact要素
 */
export function formatAIMessage(text: string): React.ReactNode {
  if (!text) return null

  // 行に分割
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let listItems: string[] = []
  let listType: "ul" | "ol" | null = null
  let key = 0

  // 番号付きリストは { num, text } を保持（2.1 等のサブ番号をそのまま表示するため）
  let orderedListData: { num: string; text: string }[] = []

  const flushList = () => {
    if (listType === "ul" && listItems.length > 0) {
      elements.push(
        <ul key={`list-${key++}`} className="my-2 ml-4 list-inside list-disc space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-sm">
              {formatInlineText(item)}
            </li>
          ))}
        </ul>
      )
      listItems = []
    } else if (listType === "ol" && orderedListData.length > 0) {
      elements.push(
        <ol key={`list-${key++}`} className="my-2 ml-4 list-none space-y-1 pl-0">
          {orderedListData.map((item, idx) => (
            <li key={idx} className="flex gap-2 text-sm">
              <span className="flex-shrink-0 font-medium text-teal-800">{item.num}.</span>
              <span>{formatInlineText(item.text)}</span>
            </li>
          ))}
        </ol>
      )
      orderedListData = []
    }
    listType = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // 空行
    if (line === "") {
      flushList()
      continue
    }

    // 見出し: ## テキスト または ### テキスト
    if (line.startsWith("###")) {
      flushList()
      const heading = line.replace(/^###\s*/, "")
      elements.push(
        <h4 key={`h4-${key++}`} className="mb-2 mt-4 text-base font-bold text-teal-700">
          {formatInlineText(heading)}
        </h4>
      )
      continue
    }
    if (line.startsWith("##")) {
      flushList()
      const heading = line.replace(/^##\s*/, "")
      elements.push(
        <h3 key={`h3-${key++}`} className="mb-2 mt-4 text-lg font-bold text-teal-800">
          {formatInlineText(heading)}
        </h3>
      )
      continue
    }

    // 箇条書きリスト: - 項目 または * 項目
    if (line.match(/^[-*]\s+/)) {
      if (listType !== "ul") {
        flushList()
        listType = "ul"
      }
      listItems.push(line.replace(/^[-*]\s+/, ""))
      continue
    }

    // 番号付きリスト: 1. 項目 / 2.1 項目 / 1) 項目（番号を保持して表示し、全て1になる問題を回避）
    const orderedMatch = line.match(/^(\d+(?:\.\d+)?)[.)]\s+(.*)$/)
    if (orderedMatch) {
      if (listType !== "ol") {
        flushList()
        listType = "ol"
      }
      orderedListData.push({ num: orderedMatch[1], text: orderedMatch[2] })
      continue
    }

    // 通常のテキスト
    flushList()
    elements.push(
      <p key={`p-${key++}`} className="mb-2 text-sm leading-relaxed">
        {formatInlineText(line)}
      </p>
    )
  }

  // 最後のリストをフラッシュ
  flushList()

  return <div className="space-y-1">{elements}</div>
}

/**
 * インライン要素（太字、イタリック等）をフォーマット
 *
 * @param text - フォーマット対象のテキスト
 * @returns フォーマット済みのReact要素
 */
function formatInlineText(text: string): React.ReactNode {
  // 太字: **テキスト**
  const boldPattern = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  const elements: React.ReactNode[] = []
  let match
  let key = 0

  while ((match = boldPattern.exec(text)) !== null) {
    // マッチ前のテキスト
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index))
    }

    // 太字部分
    elements.push(
      <strong key={`bold-${key++}`} className="font-bold text-teal-900">
        {match[1]}
      </strong>
    )

    lastIndex = match.index + match[0].length
  }

  // 残りのテキスト
  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex))
  }

  return elements.length > 0 ? <>{elements}</> : text
}
