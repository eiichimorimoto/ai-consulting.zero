/**
 * 会話収集モジュール（議論まとめ・提案まとめで共通利用）
 *
 * セッションの consulting_messages から、テーマに関連する発言を収集する。
 * 将来的に「提案を纏めるときに会話全件をなめて課題の対策を提示」する際も、
 * 全会話取得や別フィルタをこのモジュールに追加して再利用する想定。
 */

export interface CollectedMessage {
  role: string;
  content: string;
  created_at: string;
  message_order: number;
}

export interface CollectByThemeOptions {
  /** 収集する最大件数（時系列のうち新しい方から。デフォルト 50） */
  maxMessages?: number;
  /** テーマに一致しない発言も含めるか（false = キーワード一致のみ。デフォルト false） */
  includeUnrelated?: boolean;
}

/**
 * セッション内のメッセージのうち、テーマ（キーワード）を内容に含むものを収集する。
 * 時系列（message_order 昇順）で返す。
 *
 * @param supabase - Supabase クライアント（createClient() の戻り値）
 * @param sessionId - セッションID
 * @param theme - テーマ（例: 「単価」「売上」「コスト削減」）。部分一致で検索
 * @param options - オプション
 */
export async function collectMessagesByTheme(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  sessionId: string,
  theme: string,
  options: CollectByThemeOptions = {}
): Promise<CollectedMessage[]> {
  const { maxMessages = 50, includeUnrelated = false } = options;

  const { data: messages, error } = await supabase
    .from('consulting_messages')
    .select('role, content, created_at, message_order')
    .eq('session_id', sessionId)
    .order('message_order', { ascending: true });

  if (error) {
    console.error('conversation-collector: fetch error', error);
    throw error;
  }

  const list = (messages || []) as CollectedMessage[];
  const themeLower = theme.trim().toLowerCase();
  const themeLen = themeLower.length;

  if (themeLen === 0) {
    return includeUnrelated ? list.slice(-maxMessages) : [];
  }

  const related = list.filter((m) => {
    const content = (m.content || '').trim();
    if (!content) return false;
    return content.toLowerCase().includes(themeLower);
  });

  const result = includeUnrelated ? list : related;
  // 新しい方から maxMessages 件に制限してから、時系列で返す（先頭が古い）
  const limited = result.slice(-maxMessages);
  return limited;
}

/**
 * 収集したメッセージ配列を、Dify に渡す用の1本のテキストに整形する。
 * フォーマット: "【ユーザー】...\n【AI】...\n..."
 */
export function formatCollectedConversation(messages: CollectedMessage[]): string {
  return messages
    .map((m) => {
      const label = m.role === 'user' ? 'ユーザー' : 'AI';
      return `【${label}】\n${(m.content || '').trim()}`;
    })
    .join('\n\n');
}

/**
 * セッションの全会話を取得する（提案まとめなどで会話全件をなめる場合に利用）
 */
export async function getAllSessionMessages(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  sessionId: string,
  maxMessages = 200
): Promise<CollectedMessage[]> {
  const { data: messages, error } = await supabase
    .from('consulting_messages')
    .select('role, content, created_at, message_order')
    .eq('session_id', sessionId)
    .order('message_order', { ascending: true });

  if (error) {
    console.error('conversation-collector: getAllSessionMessages error', error);
    throw error;
  }

  const list = (messages || []) as CollectedMessage[];
  return list.slice(-maxMessages);
}

/**
 * 指定した step_round のメッセージのみ取得する（ステップ終了時レポート用）
 */
export async function getMessagesByStepRound(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  sessionId: string,
  stepRound: number
): Promise<CollectedMessage[]> {
  const { data: messages, error } = await supabase
    .from('consulting_messages')
    .select('role, content, created_at, message_order')
    .eq('session_id', sessionId)
    .eq('step_round', stepRound)
    .order('message_order', { ascending: true });

  if (error) {
    console.error('conversation-collector: getMessagesByStepRound error', error);
    throw error;
  }

  return (messages || []) as CollectedMessage[];
}
