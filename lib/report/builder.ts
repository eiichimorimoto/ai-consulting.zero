/**
 * レポートビルダー
 * 会話データからレポートセクションを構築
 */

import type { Message } from '@/types/consulting';
import type {
  ReportSection,
  SectionId,
  ChatData,
  TableData,
  ListData,
  AvailableSection,
  DifyContentItem,
} from './types';

/** Message が AI（Dify）発言かどうか */
function isAssistantMessage(m: Message): boolean {
  return m.type === 'ai' && !!m.content?.trim();
}

/**
 * Difyが提示したコンテンツ一覧を取得（個別エクスポート用）
 */
export function getDifyContentItems(messages: Message[]): DifyContentItem[] {
  const items: DifyContentItem[] = [];
  messages.forEach((m, index) => {
    if (!isAssistantMessage(m)) return;
    const content = m.content.trim();
    const title = deriveTitle(content);
    const itemType = deriveContentType(content);
    items.push({
      id: `dify-${index}`,
      type: itemType,
      title,
      body: content,
      sourceMessageIndex: index,
      createdAt: m.timestamp instanceof Date ? m.timestamp.toISOString() : undefined,
    });
  });
  return items;
}

/** 本文の先頭からタイトルを生成（# があればそれ、なければ先頭1行） */
function deriveTitle(content: string): string {
  const firstLine = content.split('\n')[0]?.trim() || '';
  const h1 = firstLine.replace(/^#+\s*/, '');
  if (h1.length <= 60) return h1 || 'AIレポート';
  return h1.slice(0, 57) + '...';
}

/** キーワードから内容種別を判定 */
function deriveContentType(content: string): DifyContentItem['type'] {
  if (/SWOT|強み|弱み|機会|脅威/i.test(content)) return 'analysis';
  if (/提言|推奨|施策|アドバイス/i.test(content)) return 'recommendation';
  if (/まとめ|サマリー|要約|結論/i.test(content)) return 'summary';
  return 'other';
}

/**
 * 会話データから利用可能なセクションを取得
 */
export function getAvailableSections(messages: Message[]): AvailableSection[] {
  const chatMessages = messages.filter(m => (m.type === 'ai' || m.type === 'user') && m.content.trim());
  
  const sections: AvailableSection[] = [
    {
      id: 'chat',
      label: '会話全体',
      description: 'AIとの会話履歴をすべて含めます',
      available: chatMessages.length > 0,
      messageCount: chatMessages.length,
    },
    {
      id: 'swot',
      label: 'SWOT分析',
      description: '強み・弱み・機会・脅威の分析結果',
      available: hasSwotAnalysis(messages),
    },
    {
      id: 'trends',
      label: '業界動向',
      description: '業界のトレンドと動向分析',
      available: hasTrendsAnalysis(messages),
    },
    {
      id: 'market',
      label: '市場データ',
      description: '市場規模と成長予測',
      available: hasMarketData(messages),
    },
    {
      id: 'recommendation',
      label: '経営提言',
      description: '短期・中長期の経営施策提案',
      available: hasRecommendation(messages),
    },
  ];

  return sections;
}

/**
 * 選択されたセクションからレポートを構築
 */
export function buildReportSections(
  messages: Message[],
  sectionIds: SectionId[]
): ReportSection[] {
  const sections: ReportSection[] = [];

  for (const id of sectionIds) {
    let section: ReportSection | null = null;

    switch (id) {
      case 'chat':
        section = extractChatHistory(messages);
        break;
      case 'swot':
        section = extractSwotSection(messages);
        break;
      case 'trends':
        section = extractTrendsSection(messages);
        break;
      case 'market':
        section = extractMarketSection(messages);
        break;
      case 'recommendation':
        section = extractRecommendationSection(messages);
        break;
    }

    if (section) {
      sections.push(section);
    }
  }

  return sections;
}

/**
 * 会話履歴を抽出
 */
function extractChatHistory(messages: Message[]): ReportSection | null {
  const chatMessages = messages
    .filter(m => (m.type === 'ai' || m.type === 'user') && m.content.trim())
    .slice(-100); // 最大100メッセージ

  if (chatMessages.length === 0) return null;

  const chatData: ChatData = {
    messages: chatMessages.map(m => ({
      role: (m.type === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
      timestamp: m.timestamp,
    })),
  };

  return {
    id: 'chat',
    type: 'chat',
    title: '会話履歴',
    content: chatData,
  };
}

/**
 * SWOT分析を抽出
 */
function extractSwotSection(messages: Message[]): ReportSection | null {
  const swotMessage = messages.find(m => 
    isAssistantMessage(m) && 
    (m.content.includes('SWOT') || m.content.includes('強み') || m.content.includes('弱み'))
  );

  if (!swotMessage) return null;

  // 簡易的なSWOT抽出（キーワードベース）
  const content = swotMessage.content;
  const strengths = extractBulletPoints(content, ['強み', 'Strengths']);
  const weaknesses = extractBulletPoints(content, ['弱み', 'Weaknesses']);
  const opportunities = extractBulletPoints(content, ['機会', 'Opportunities']);
  const threats = extractBulletPoints(content, ['脅威', 'Threats']);

  const tableData: TableData = {
    headers: ['強み (Strengths)', '弱み (Weaknesses)'],
    rows: [
      [strengths.join('\n'), weaknesses.join('\n')],
      ['機会 (Opportunities)', '脅威 (Threats)'],
      [opportunities.join('\n'), threats.join('\n')],
    ],
  };

  return {
    id: 'swot',
    type: 'table',
    title: 'SWOT分析',
    content: tableData,
  };
}

/**
 * 業界動向を抽出
 */
function extractTrendsSection(messages: Message[]): ReportSection | null {
  const trendsMessage = messages.find(m =>
    isAssistantMessage(m) &&
    (m.content.includes('業界動向') || m.content.includes('トレンド') || m.content.includes('業界'))
  );

  if (!trendsMessage) return null;

  const items = extractBulletPoints(trendsMessage.content, ['業界動向', 'トレンド']);

  const listData: ListData = {
    items: items.length > 0 ? items : [trendsMessage.content.slice(0, 500)],
  };

  return {
    id: 'trends',
    type: 'list',
    title: '業界動向',
    content: listData,
  };
}

/**
 * 市場データを抽出
 */
function extractMarketSection(messages: Message[]): ReportSection | null {
  const marketMessage = messages.find(m =>
    isAssistantMessage(m) &&
    (m.content.includes('市場') || m.content.includes('マーケット'))
  );

  if (!marketMessage) return null;

  const items = extractBulletPoints(marketMessage.content, ['市場', 'マーケット']);

  const listData: ListData = {
    items: items.length > 0 ? items : [marketMessage.content.slice(0, 500)],
  };

  return {
    id: 'market',
    type: 'list',
    title: '市場データ',
    content: listData,
  };
}

/**
 * 経営提言を抽出
 */
function extractRecommendationSection(messages: Message[]): ReportSection | null {
  const recMessage = messages.find(m =>
    isAssistantMessage(m) &&
    (m.content.includes('提言') || m.content.includes('推奨') || m.content.includes('施策'))
  );

  if (!recMessage) return null;

  const items = extractBulletPoints(recMessage.content, ['提言', '推奨', '施策']);

  const listData: ListData = {
    items: items.length > 0 ? items : [recMessage.content.slice(0, 500)],
  };

  return {
    id: 'recommendation',
    type: 'list',
    title: '経営提言',
    content: listData,
  };
}

/**
 * テキストから箇条書きを抽出
 */
function extractBulletPoints(text: string, keywords: string[]): string[] {
  const items: string[] = [];
  
  // キーワードを含むセクションを探す
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}[：:](.*?)(?=\\n\\n|$)`, 's');
    const match = text.match(regex);
    
    if (match && match[1]) {
      const section = match[1];
      
      // 箇条書きを抽出（•, -, *, 番号付き）
      const lines = section.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (
          trimmed.startsWith('•') ||
          trimmed.startsWith('-') ||
          trimmed.startsWith('*') ||
          /^\d+\./.test(trimmed)
        ) {
          // 記号を削除
          const cleaned = trimmed.replace(/^[•\-*]\s*/, '').replace(/^\d+\.\s*/, '');
          if (cleaned) {
            items.push(cleaned);
          }
        }
      }
    }
  }

  return items;
}

/**
 * SWOT分析が含まれているかチェック
 */
function hasSwotAnalysis(messages: Message[]): boolean {
  return messages.some(m =>
    isAssistantMessage(m) &&
    (m.content.includes('SWOT') || 
     (m.content.includes('強み') && m.content.includes('弱み')))
  );
}

/**
 * 業界動向が含まれているかチェック
 */
function hasTrendsAnalysis(messages: Message[]): boolean {
  return messages.some(m =>
    isAssistantMessage(m) &&
    (m.content.includes('業界動向') || m.content.includes('トレンド'))
  );
}

/**
 * 市場データが含まれているかチェック
 */
function hasMarketData(messages: Message[]): boolean {
  return messages.some(m =>
    isAssistantMessage(m) &&
    (m.content.includes('市場') || m.content.includes('マーケット'))
  );
}

/**
 * 経営提言が含まれているかチェック
 */
function hasRecommendation(messages: Message[]): boolean {
  return messages.some(m =>
    isAssistantMessage(m) &&
    (m.content.includes('提言') || m.content.includes('推奨') || m.content.includes('施策'))
  );
}

/**
 * レポート本文から「申し訳ありませんが…」「Wordで作成をお勧めします」等の
 * 前置き・末尾の案内を除去し、レポートとして使う本文だけを返す
 */
export function stripReportDisclaimer(body: string): string {
  let text = body.trim();
  if (!text) return text;

  // 前置き除去: 「---」の直後から、または「タイトル:」から開始
  const dashMatch = text.match(/\n---\s*\n([\s\S]*)/);
  if (dashMatch) {
    text = dashMatch[1].trim();
  } else if (text.includes('タイトル:')) {
    const idx = text.indexOf('タイトル:');
    text = text.slice(idx).trim();
  } else if (/申し訳ありませんが|このプラットフォームでは/.test(text)) {
    // 「申し訳ありません」から始まっているが区切りがない場合は、最初の見出しらしき行（数字. や ##）までスキップ
    const firstHeading = text.match(/\n(\d+\.\s+.+|\s*#+\s+.+)/);
    if (firstHeading && firstHeading.index != null) {
      text = text.slice(firstHeading.index).trim();
    }
  }

  // 「タイトル: XXX」を「# XXX」に変換（Markdown見出しにする）
  text = text.replace(/^タイトル:\s*/m, '# ');

  // 末尾の案内文除去（Word/Googleドキュメントで…お勧めします）
  const trailingPatterns = [
    /この構成を基に[\s\S]*$/i,
    /WordやGoogleドキュメント[\s\S]*$/i,
    /文書編集ソフト[\s\S]*お勧めします[\s\S]*$/i,
  ];
  for (const re of trailingPatterns) {
    text = text.replace(re, '').trim();
  }

  return text.trim();
}

/**
 * 簡易Markdownをレポート用HTMLに変換
 */
export function markdownToReportHtml(text: string): string {
  const lines = text.split('\n');
  const blocks: string[] = [];
  let inList = false;
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push('<ul class="report-list">' + listItems.map(li => `<li>${escapeHtml(li)}</li>`).join('') + '</ul>');
      listItems = [];
    }
    inList = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    if (/^#{1,3}\s/.test(trimmed)) {
      flushList();
      const level = trimmed.match(/^(#+)/)?.[1].length ?? 1;
      const title = trimmed.replace(/^#+\s*/, '');
      const tag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
      blocks.push(`<${tag} class="report-heading">${escapeHtml(title)}</${tag}>`);
      continue;
    }
    if (/^[-*•]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      inList = true;
      const item = trimmed.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');
      listItems.push(item);
      continue;
    }
    flushList();
    const safe = escapeHtml(trimmed).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    blocks.push(`<p class="report-para">${safe}</p>`);
  }
  flushList();
  return blocks.join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 選択したDifyコンテンツからレポートセクションを構築（レポート形式HTML）
 */
export function buildReportSectionsFromDifyItems(items: DifyContentItem[]): ReportSection[] {
  return items.map(item => {
    const body = stripReportDisclaimer(item.body);
    const title = body ? deriveTitle(body) : item.title;
    return {
      id: item.id,
      type: 'html' as const,
      title,
      content: markdownToReportHtml(body || item.body),
      metadata: item.createdAt ? { createdAt: item.createdAt } : undefined,
    };
  });
}
