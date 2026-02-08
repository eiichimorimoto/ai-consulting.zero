/**
 * レポートビルダー
 * 会話データからレポートセクションを構築
 */

import type { Message } from '@/types/consulting';
import { isEchoReplyContent, isReportCreatedContent } from '@/lib/consulting/report-request';
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
 * レポート対象は「依頼された1件」に限定：「〇〇のレポートを作成しました。」の直後の本文のみを含める
 */
export function getDifyContentItems(messages: Message[]): DifyContentItem[] {
  const items: DifyContentItem[] = [];
  messages.forEach((m, index) => {
    if (!isAssistantMessage(m)) return;
    const content = m.content.trim();
    if (isEchoReplyContent(content)) return;
    if (isReportCreatedContent(content)) return;
    const prev = index > 0 ? messages[index - 1] : null;
    const prevIsReportCreated =
      prev && prev.type === 'ai' && prev.content && isReportCreatedContent(prev.content.trim());
    if (!prevIsReportCreated) return;
    const title = deriveTitle(content);
    const itemType = deriveContentType(content);
    const createdAt =
      m.timestamp instanceof Date
        ? m.timestamp.toISOString()
        : typeof m.timestamp === 'string'
          ? m.timestamp
          : m.timestamp
            ? new Date(m.timestamp as unknown as number | string).toISOString()
            : undefined;
    items.push({
      id: `dify-${index}`,
      type: itemType,
      title,
      body: content,
      sourceMessageIndex: index,
      createdAt,
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

/** 番号付きリストの1項目（本文とネストした箇条書き） */
type OrderedListItem = { text: string; nested: string[] };

/**
 * 簡易Markdownをレポート用HTMLに変換
 * 番号付き（1. 2. …）は <ol>、記号（- * •）は <ul>。Difyが全て「1.」で出す場合は同じ<ol>内で連番になるよう、
 * 「1.」の直下の「•」はその項目のネストとして扱う。
 */
export function markdownToReportHtml(text: string): string {
  const lines = text.split('\n');
  const blocks: string[] = [];
  let listItems: string[] = [];
  let orderedItems: OrderedListItem[] = [];
  let listOrdered: boolean | null = null;

  const flushList = () => {
    if (listOrdered === true && orderedItems.length > 0) {
      const html = orderedItems
        .map(
          (item) =>
            `<li>${inlineMarkdownToHtml(item.text)}` +
            (item.nested.length > 0
              ? `<ul class="report-list">${item.nested.map((n) => `<li>${inlineMarkdownToHtml(n)}</li>`).join('')}</ul>`
              : '') +
            '</li>'
        )
        .join('');
      blocks.push(`<ol class="report-list">${html}</ol>`);
      orderedItems = [];
    } else if (listOrdered === false && listItems.length > 0) {
      blocks.push(
        `<ul class="report-list">` + listItems.map((li) => `<li>${inlineMarkdownToHtml(li)}</li>`).join('') + `</ul>`
      );
      listItems = [];
    }
    listOrdered = null;
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
    if (/^\d+\.\s/.test(trimmed)) {
      if (listOrdered === false) flushList();
      listOrdered = true;
      orderedItems.push({ text: trimmed.replace(/^\d+\.\s*/, ''), nested: [] });
      continue;
    }
    if (/^[-*•]\s/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[-*•]\s*/, '');
      if (listOrdered === true && orderedItems.length > 0) {
        orderedItems[orderedItems.length - 1].nested.push(bulletText);
        continue;
      }
      if (listOrdered !== true) flushList();
      listOrdered = false;
      listItems.push(bulletText);
      continue;
    }
    flushList();
    blocks.push(`<p class="report-para">${inlineMarkdownToHtml(trimmed)}</p>`);
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
 * インラインMarkdown（**太字**）をHTMLに変換。内部はエスケープする。
 */
function inlineMarkdownToHtml(s: string): string {
  const re = /\*\*(.+?)\*\*/g;
  let result = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    result += escapeHtml(s.slice(last, m.index)) + '<strong>' + escapeHtml(m[1]) + '</strong>';
    last = re.lastIndex;
  }
  result += escapeHtml(s.slice(last));
  return result;
}

/**
 * 選択したDifyコンテンツからレポートセクションを構築（レポート形式HTML）
 */
export function buildReportSectionsFromDifyItems(items: DifyContentItem[]): ReportSection[] {
  return items.map(item => {
    const body = stripReportDisclaimer(item.body);
    const title = body ? deriveTitle(body) : item.title;
    let bodyForHtml = body || item.body;
    // セクションタイトルと重複する先頭の # 見出し行を除去（タイトル二重表示を防ぐ）
    const firstLine = bodyForHtml.split('\n')[0]?.trim() ?? '';
    if (/^#+\s+/.test(firstLine)) {
      const firstLineTitle = firstLine.replace(/^#+\s*/, '').trim();
      const titleNorm = title.trim().slice(0, 60);
      if (firstLineTitle === titleNorm || firstLineTitle.startsWith(titleNorm) || titleNorm.startsWith(firstLineTitle)) {
        const rest = bodyForHtml.slice(bodyForHtml.indexOf('\n') + 1).trim();
        if (rest) bodyForHtml = rest;
      }
    }
    return {
      id: item.id,
      type: 'html' as const,
      title,
      content: markdownToReportHtml(bodyForHtml),
      metadata: item.createdAt ? { createdAt: item.createdAt } : undefined,
    };
  });
}

/** レポート用メタデータ（Markdown出力ヘッダー） */
export interface ReportMarkdownMetadata {
  sessionName: string;
  companyName?: string;
  userName?: string;
  createdAt?: string;
}

/**
 * 1つのレポートセクションをMarkdown文字列に変換（chat/table/list/text 用。htmlは呼び出し元でDifyのbodyを使う）
 */
function sectionToMarkdown(section: ReportSection): string {
  const title = `## ${section.title}\n\n`;
  switch (section.type) {
    case 'chat': {
      const chat = section.content as ChatData;
      const lines = chat.messages.map(m =>
        `**${m.role === 'user' ? 'ユーザー' : 'AI'}**\n\n${m.content}`
      );
      return title + lines.join('\n\n---\n\n') + '\n\n';
    }
    case 'table': {
      const table = section.content as TableData;
      const header = '| ' + table.headers.join(' | ') + ' |\n';
      const sep = '| ' + table.headers.map(() => '---').join(' | ') + ' |\n';
      const rows = table.rows.map(r => '| ' + r.join(' | ') + ' |').join('\n');
      return title + header + sep + rows + '\n\n';
    }
    case 'list': {
      const list = section.content as ListData;
      const items = list.items.map(i => `- ${i}`).join('\n');
      return title + items + '\n\n';
    }
    case 'text':
      return title + (section.content as string) + '\n\n';
    case 'html':
      return title + '(HTMLセクションはMarkdownでは表示されません。PDF/PPTをご利用ください。)\n\n';
    default:
      return title;
  }
}

/**
 * レポート全体をMarkdown文字列で構築（Difyのbodyをそのまま利用し、付録セクションはMarkdown化）
 */
export function buildReportMarkdown(
  difyItems: DifyContentItem[],
  otherSections: ReportSection[],
  metadata: ReportMarkdownMetadata
): string {
  const lines: string[] = [];
  lines.push('# AI経営コンサルティングレポート\n');
  lines.push(`**${metadata.sessionName}**\n`);
  if (metadata.companyName) lines.push(`会社名: ${metadata.companyName}\n`);
  if (metadata.userName) lines.push(`担当: ${metadata.userName}\n`);
  if (metadata.createdAt) lines.push(`作成日: ${metadata.createdAt}\n`);
  lines.push('\n---\n\n');

  for (const item of difyItems) {
    const body = stripReportDisclaimer(item.body);
    const title = body ? deriveTitle(body) : item.title;
    const createdAt = item.createdAt
      ? new Date(item.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';
    lines.push(`## ${title}\n\n`);
    if (createdAt) lines.push(`作成日時: ${createdAt}\n\n`);
    lines.push(body || item.body);
    lines.push('\n\n');
  }

  for (const section of otherSections) {
    lines.push(sectionToMarkdown(section));
  }

  return lines.join('');
}
