-- Migration: Create consulting_step_reports table
-- Date: 2026-02-11
-- Purpose: ステップ終了時に生成するコンセンサスレポートを保存。設計: implementation_plan_20260211_report_milestone_only.md Phase 4
-- Rollback: DROP TABLE IF EXISTS consulting_step_reports;

CREATE TABLE IF NOT EXISTS consulting_step_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES consulting_sessions(id) ON DELETE CASCADE,
  step_round INTEGER NOT NULL CHECK (step_round >= 1 AND step_round <= 5),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_markdown TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consulting_step_reports_session_id
ON consulting_step_reports (session_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_consulting_step_reports_session_step
ON consulting_step_reports (session_id, step_round);

COMMENT ON TABLE consulting_step_reports IS 'コンサルティングセッションのステップ終了時に作成するコンセンサスレポート。1セッション・1ステップあたり1件。';

ALTER TABLE consulting_step_reports ENABLE ROW LEVEL SECURITY;

-- RLS: セッションの所有者のみ参照・挿入可能
CREATE POLICY "Users can view own session step reports"
  ON consulting_step_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM consulting_sessions cs
      WHERE cs.id = consulting_step_reports.session_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own session step reports"
  ON consulting_step_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consulting_sessions cs
      WHERE cs.id = consulting_step_reports.session_id AND cs.user_id = auth.uid()
    )
  );

-- upsert で既存行を更新するために UPDATE ポリシーが必要
CREATE POLICY "Users can update own session step reports"
  ON consulting_step_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM consulting_sessions cs
      WHERE cs.id = consulting_step_reports.session_id AND cs.user_id = auth.uid()
    )
  );
