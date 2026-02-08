/**
 * レポート依頼判定・復唱・復唱除外のユニットテスト
 */
import {
  isReportRequest,
  isConfirmation,
  buildEchoReply,
    buildReportCreatedReply,
    isReportCreatedContent,
  deriveReportTitle,
  extractReportTargetReference,
  findAssistantMessageByReference,
  isEchoReplyContent,
  isReportCreatedContent,
  isDiscussionSummaryReportRequest,
  buildDiscussionSummaryEchoReply,
  isPendingDiscussionSummary,
  PENDING_DISCUSSION_SUMMARY_PREFIX,
  unwrapPendingDiscussionSummaryQuery,
} from './report-request';

describe('report-request', () => {
  describe('isReportRequest', () => {
    it('「今の回答に関してレポートに」をレポート依頼と判定する', () => {
      expect(isReportRequest('もう一度今の回答に関してレポートにして')).toBe(true);
      expect(isReportRequest('この内容をレポートにして下さい')).toBe(true);
    });
    it('通常の質問はレポート依頼と判定しない', () => {
      expect(isReportRequest('単価低下の原因を教えて')).toBe(false);
    });
  });

  describe('isConfirmation', () => {
    it('「はい」「お願いします」を確認と判定する', () => {
      expect(isConfirmation('はい')).toBe(true);
      expect(isConfirmation('お願いします')).toBe(true);
    });
    it('長文は確認と判定しない', () => {
      expect(isConfirmation('いいえ、レポートは結構です')).toBe(false);
    });
  });

  describe('buildEchoReply', () => {
    it('previousAiContent なしのときユーザー発言を「」で囲んだ復唱文を返す', () => {
      const msg = 'もう一度今の回答に関してレポートにして';
      const out = buildEchoReply(msg);
      expect(out).toContain('「もう一度今の回答に関してレポートにして」');
      expect(out).toContain('のレポート（資料）をお作りしますね。');
      expect(out).toContain('よろしければ「はい」や「お願いします」と送信してください。');
    });
    it('reportTargetContent があるときはその見出しをレポート対象として復唱する', () => {
      const aiContent = '現状の生産工程や生産性の詳細分析について\n\n1. 生産工程のマッピング\n2. データ収集';
      const out = buildEchoReply('これをレポートにして下さい', aiContent);
      expect(out).toContain('「現状の生産工程や生産性の詳細分析について」');
      expect(out).toContain('のレポート（資料）をお作りしますね。');
    });
    it('explicitSubject があるときはそれを表題に使い「について」を付与する', () => {
      const out = buildEchoReply('長期的視点での投資判断について、これをレポートにして', null, '長期的視点での投資判断');
      expect(out).toContain('「長期的視点での投資判断について」');
      expect(out).toContain('のレポート（資料）をお作りしますね。');
    });
    it('explicitSubject 末尾の読点は除去し「について」は一重だけ', () => {
      const out = buildEchoReply('', null, '長期的視点での投資判断について、');
      expect(out).toContain('「長期的視点での投資判断について」');
      expect(out).not.toMatch(/について、について/);
    });
  });

  describe('extractReportTargetReference', () => {
    it('「これ」「この内容」「今の回答」は null（直前のAI回答を対象）', () => {
      expect(extractReportTargetReference('これをレポートにして下さい')).toBe(null);
      expect(extractReportTargetReference('この内容をレポートに')).toBe(null);
      expect(extractReportTargetReference('今の回答をレポートに')).toBe(null);
    });
    it('「〇〇の内容をレポートに」から 〇〇 を抽出', () => {
      expect(extractReportTargetReference('生産性向上の提案の内容をレポートにして下さい')).toBe('生産性向上の提案');
    });
    it('「先ほどの〇〇を」から 〇〇 を抽出', () => {
      expect(extractReportTargetReference('先ほどのSWOT分析をレポートに')).toBe('SWOT分析');
    });
    it('「〇〇についてのレポート」から 〇〇 を抽出', () => {
      expect(extractReportTargetReference('現状分析についてのレポートをお願いします')).toBe('現状分析');
    });
    it('「〇〇について、これをレポートに」は 〇〇 を返し直前のAI回答にしない', () => {
      expect(extractReportTargetReference('長期的視点での投資判断について、これをレポートにして')).toBe('長期的視点での投資判断');
    });
  });

  describe('findAssistantMessageByReference', () => {
    it('見出しに参照が含まれるAI回答を返す（直近優先）', () => {
      const messages = [
        { content: '別のトピック\n\n内容' },
        { content: '生産性向上の提案\n\n1. 施策A\n2. 施策B' },
      ];
      const found = findAssistantMessageByReference(messages, '生産性向上の提案');
      expect(found).not.toBeNull();
      expect(found!.content).toContain('生産性向上の提案');
    });
    it('該当がなければ null', () => {
      const messages = [{ content: '売上分析\n\n内容' }];
      expect(findAssistantMessageByReference(messages, 'SWOT分析')).toBe(null);
    });
    it('復唱・レポート作成しましたは対象外。実内容のメッセージを返す', () => {
      const echo =
        '「長期的視点での投資判断について」のレポート（資料）をお作りしますね。よろしければ「はい」や「お願いします」と送信してください。';
      const realContent = '長期的視点での投資判断について\n\n1. 成長戦略との整合性\n2. ROIの確認';
      const messages = [
        { content: realContent },
        { content: echo },
      ];
      const found = findAssistantMessageByReference(messages, '長期的視点での投資判断');
      expect(found).not.toBeNull();
      expect(found!.content).toBe(realContent);
      expect(found!.content).not.toContain('のレポート（資料）をお作りしますね');
    });
    it('titleOnly: true のとき見出しに無いメッセージは返さない（別トピックのレポートを防ぐ）', () => {
      const wrongTopic =
        '設備維持費の削減に向けた提案\n\n本稿では長期的視点での投資判断についても触れます。\n1. 施策';
      const messages = [{ content: wrongTopic }];
      const found = findAssistantMessageByReference(messages, '長期的視点での投資判断', { titleOnly: true });
      expect(found).toBeNull();
    });
  });

  describe('isEchoReplyContent', () => {
    it('復唱メッセージをエクスポート対象から除外するため true を返す', () => {
      const echo =
        '「もう一度今の回答に関してレポートにして」のレポート（資料）をお作りしますね。よろしければ「はい」や「お願いします」と送信してください。';
      expect(isEchoReplyContent(echo)).toBe(true);
    });
    it('通常のAI回答は false', () => {
      expect(isEchoReplyContent('# 単価交渉についてのレポート\n\n1. 導入')).toBe(false);
    });
  });

  describe('isDiscussionSummaryReportRequest', () => {
    it('「〇〇の議論をまとめてレポートに」を議論まとめと判定する', () => {
      expect(isDiscussionSummaryReportRequest('単価の話だけまとめてレポートに')).toBe(true);
    });
    it('「今の回答をレポートに」は議論まとめではない', () => {
      expect(isDiscussionSummaryReportRequest('今の回答に関してレポートにして')).toBe(false);
    });
  });

  describe('buildDiscussionSummaryEchoReply', () => {
    it('テーマが取れるときは「〇〇に関する…」を返す', () => {
      const out = buildDiscussionSummaryEchoReply('単価の話だけまとめてレポートに');
      expect(out).toContain('単価に関する議論をまとめてレポートにする、という事ですね。');
    });
  });

  describe('pending discussion summary', () => {
    it('プレフィックス付き保留を判定・unwrap できる', () => {
      const raw = '単価の話だけまとめてレポートに';
      const stored = PENDING_DISCUSSION_SUMMARY_PREFIX + raw;
      expect(isPendingDiscussionSummary(stored)).toBe(true);
      expect(unwrapPendingDiscussionSummaryQuery(stored)).toBe(raw);
      expect(isPendingDiscussionSummary(raw)).toBe(false);
      expect(unwrapPendingDiscussionSummaryQuery(raw)).toBe(raw);
    });
  });

  describe('deriveReportTitle', () => {
    it('先頭行から見出しを抽出する（# は除去、60字超は省略）', () => {
      expect(deriveReportTitle('現状の生産工程や生産性の詳細分析について')).toBe('現状の生産工程や生産性の詳細分析について');
      expect(deriveReportTitle('# 提案レポート\n\n本文')).toBe('提案レポート');
      expect(deriveReportTitle('あ'.repeat(80))).toBe('あ'.repeat(57) + '...');
    });
  });

  describe('buildReportCreatedReply', () => {
    it('「〇〇のレポートを作成しました。」の文を返す', () => {
      const out = buildReportCreatedReply('この提案をレポートにして下さい');
      expect(out).toBe('「この提案をレポートにして下さい」のレポートを作成しました。');
    });
    it('長文（先頭行が60字超）は見出しを省略して「…」で返す', () => {
      const long = 'あ'.repeat(80);
      const out = buildReportCreatedReply(long);
      expect(out).toMatch(/^「.{60}」のレポートを作成しました。$/);
      expect(out).toContain('...');
    });
    it('実内容の見出しのみを表題に使い、括弧は一重になる', () => {
      const realContent =
        '長期的視点での投資判断について\n\n1. 成長戦略との整合性\n2. ROIの確認\n3. リスク評価';
      const out = buildReportCreatedReply(realContent);
      expect(out).toBe('「長期的視点での投資判断について」のレポートを作成しました。');
      expect(out.match(/「/g)).toHaveLength(1);
      expect(out.match(/」/g)).toHaveLength(1);
    });
  });

  describe('isReportCreatedContent', () => {
    it('「〇〇のレポートを作成しました。」を true とする', () => {
      expect(isReportCreatedContent('「この提案をレポートにして下さい」のレポートを作成しました。')).toBe(true);
    });
    it('通常のAI回答は false', () => {
      expect(isReportCreatedContent('# レポート\n\n本文')).toBe(false);
      expect(isReportCreatedContent('よろしければ「はい」と送信してください。')).toBe(false);
    });
  });
});
