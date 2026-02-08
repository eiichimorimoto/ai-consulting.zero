-- マイグレーション実施確認用（2026-02-11 の 2 本）
-- 単一クエリなので Supabase SQL Editor でそのまま Run できる（Explain も可）。

SELECT * FROM (
  SELECT 1 AS check_no, 'consulting_messages.step_round カラム' AS check_name,
    (SELECT COUNT(*)::text FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'consulting_messages' AND column_name = 'step_round') AS result,
    '1' AS expected,
    CASE WHEN (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'consulting_messages' AND column_name = 'step_round') = 1
         THEN 'OK' ELSE 'NG' END AS status
  UNION ALL
  SELECT 2, 'インデックス idx_consulting_messages_session_step',
    (SELECT COUNT(*)::text FROM pg_indexes WHERE tablename = 'consulting_messages' AND indexname = 'idx_consulting_messages_session_step'),
    '1', CASE WHEN (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'consulting_messages' AND indexname = 'idx_consulting_messages_session_step') = 1 THEN 'OK' ELSE 'NG' END
  UNION ALL
  SELECT 3, 'consulting_step_reports テーブル存在',
    (SELECT COUNT(*)::text FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consulting_step_reports'),
    '1', CASE WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consulting_step_reports') = 1 THEN 'OK' ELSE 'NG' END
  UNION ALL
  SELECT 4, 'consulting_step_reports カラム数',
    (SELECT COUNT(*)::text FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'consulting_step_reports'),
    '7', CASE WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'consulting_step_reports') = 7 THEN 'OK' ELSE 'NG' END
  UNION ALL
  SELECT 5, 'consulting_step_reports RLS 有効',
    (SELECT CASE WHEN relrowsecurity THEN 'true' ELSE 'false' END FROM pg_class WHERE relname = 'consulting_step_reports'),
    'true', CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'consulting_step_reports') = true THEN 'OK' ELSE 'NG' END
  UNION ALL
  SELECT 6, 'consulting_step_reports ポリシー数',
    (SELECT COUNT(*)::text FROM pg_policies WHERE tablename = 'consulting_step_reports'),
    '3', CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'consulting_step_reports') = 3 THEN 'OK' ELSE 'NG' END
) t
ORDER BY check_no;
