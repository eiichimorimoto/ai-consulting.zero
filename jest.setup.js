// Jest setup for API route testing (Node environment)

// Mock環境変数（テスト用）
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.DIFY_API_KEY = 'test-dify-api-key'
process.env.DIFY_WORKFLOW_API_KEY = 'test-workflow-api-key'
process.env.DIFY_API_BASE_URL = 'http://localhost/v1'
process.env.DIFY_WORKFLOW_ID = 'test-workflow-id'
