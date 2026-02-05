/**
 * sessionStorage操作ユーティリティ
 * 
 * Start画面の状態を安全にsessionStorageに保存・復元する
 * 
 * セキュリティ考慮事項:
 * - 機密情報（メッセージ内容、個人情報）は保存しない
 * - IDのみを保存（conversation_id, sessionId等）
 * - XSSリスクはあるが、Supabase RLSで保護されているため実害は限定的
 * 
 * @module lib/utils/session-storage
 */

/**
 * Start画面の状態を保存する型
 */
export type ConsultingState = {
  userChoice: 'new' | 'existing' | null;
  activeSessionId: string;
  openSessionIds: string[];
  lastActivity: number; // タイムスタンプ（24時間以上古い状態は破棄）
};

const STATE_KEY = 'consulting_state';
const CONVERSATION_PREFIX = 'conversation_';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * sessionStorageに状態を保存
 * 
 * @param state - 保存する状態
 * @example
 * saveConsultingState({
 *   userChoice: 'existing',
 *   activeSessionId: 'session-123',
 *   openSessionIds: ['session-123', 'session-456'],
 *   lastActivity: Date.now()
 * });
 */
export function saveConsultingState(state: ConsultingState): void {
  try {
    // ブラウザ環境チェック
    if (typeof window === 'undefined' || !window.sessionStorage) {
      console.warn('sessionStorage is not available');
      return;
    }

    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save consulting state:', error);
    
    // QuotaExceededErrorの場合は古いデータを削除
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('sessionStorage quota exceeded. Clearing old data...');
      clearConsultingState();
    }
  }
}

/**
 * sessionStorageから状態を復元
 * 
 * @returns 保存された状態（存在しない or 24時間以上古い場合はnull）
 * @example
 * const saved = loadConsultingState();
 * if (saved) {
 *   setUserChoice(saved.userChoice);
 *   setActiveSessionId(saved.activeSessionId);
 * }
 */
export function loadConsultingState(): ConsultingState | null {
  try {
    // ブラウザ環境チェック
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }

    const saved = sessionStorage.getItem(STATE_KEY);
    if (!saved) return null;
    
    const state = JSON.parse(saved) as ConsultingState;
    
    // 24時間以上古い状態は破棄
    if (Date.now() - state.lastActivity > ONE_DAY_MS) {
      console.info('Consulting state is too old. Clearing...');
      clearConsultingState();
      return null;
    }
    
    return state;
  } catch (error) {
    console.error('Failed to load consulting state:', error);
    return null;
  }
}

/**
 * sessionStorageの状態をクリア
 * 
 * @example
 * // ログアウト時
 * clearConsultingState();
 */
export function clearConsultingState(): void {
  try {
    // ブラウザ環境チェック
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }

    sessionStorage.removeItem(STATE_KEY);
    
    // conversation_idもクリア
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(CONVERSATION_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Failed to clear consulting state:', error);
  }
}

/**
 * セッションのconversation_idを保存
 * 
 * @param sessionId - セッションID
 * @param conversationId - Dify会話ID
 * @example
 * saveConversationId('session-123', 'dify-conv-abc');
 */
export function saveConversationId(sessionId: string, conversationId: string): void {
  try {
    // ブラウザ環境チェック
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }

    sessionStorage.setItem(`${CONVERSATION_PREFIX}${sessionId}`, conversationId);
  } catch (error) {
    console.error('Failed to save conversation_id:', error);
  }
}

/**
 * セッションのconversation_idを取得
 * 
 * @param sessionId - セッションID
 * @returns conversation_id（存在しない場合はnull）
 * @example
 * const conversationId = loadConversationId('session-123');
 * if (conversationId) {
 *   // Difyに会話IDを渡す
 * }
 */
export function loadConversationId(sessionId: string): string | null {
  try {
    // ブラウザ環境チェック
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }

    return sessionStorage.getItem(`${CONVERSATION_PREFIX}${sessionId}`);
  } catch (error) {
    console.error('Failed to load conversation_id:', error);
    return null;
  }
}

/**
 * sessionStorageの使用容量を取得（デバッグ用）
 * 
 * @returns 使用容量（バイト数）
 * @example
 * const size = getSessionStorageSize();
 * console.log(`sessionStorage使用量: ${(size / 1024).toFixed(2)} KB`);
 */
export function getSessionStorageSize(): number {
  try {
    // ブラウザ環境チェック
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return 0;
    }

    let size = 0;
    for (const key in sessionStorage) {
      if (sessionStorage.hasOwnProperty(key)) {
        size += sessionStorage[key].length + key.length;
      }
    }
    return size;
  } catch (error) {
    console.error('Failed to get sessionStorage size:', error);
    return 0;
  }
}
