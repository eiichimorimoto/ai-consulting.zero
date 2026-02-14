/**
 * Unit tests for /api/dify/context
 *
 * Next.js公式推奨の方法でテスト:
 * - testEnvironment: 'node'
 * - 関数を直接呼び出し
 * - Supabaseをモック
 *
 * Tests:
 * 1. 認証チェック (x-api-key validation)
 * 2. バリデーション (userId required)
 * 3. 新規案件 (基本情報のみ)
 * 4. 初回課題内容
 */

import { NextRequest } from "next/server"
import { POST } from "./route"

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() =>
          Promise.resolve({
            data: {
              name: "テストユーザー",
              email: "test@example.com",
              phone: "090-1234-5678",
              company_id: "test-company-id",
              companies: [
                {
                  name: "テスト株式会社",
                  industry: "IT",
                  employee_count: 50,
                  annual_revenue: 100000000,
                  business_description: "テスト事業",
                  current_challenges: "テスト課題",
                  growth_stage: "growth",
                  it_maturity_level: "intermediate",
                },
              ],
            },
            error: null,
          })
        ),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  })),
}

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => mockSupabaseClient),
  SupabaseClient: jest.fn(),
}))

describe("/api/dify/context", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 環境変数をセット
    process.env.DIFY_API_KEY = "test-api-key"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
  })

  describe("認証チェック", () => {
    it("x-api-key が正しい場合、処理が進む", async () => {
      const request = new NextRequest("http://localhost:3000/api/dify/context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "test-api-key",
        },
        body: JSON.stringify({
          userId: "test-user-id",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).not.toBe(401)
      expect(data.error).not.toBe("Unauthorized")
    })

    it("x-api-key が誤っている場合、401エラー", async () => {
      const request = new NextRequest("http://localhost:3000/api/dify/context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "wrong-api-key",
        },
        body: JSON.stringify({
          userId: "test-user-id",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(data.success).toBe(false)
    })

    it("x-api-key がない場合、401エラー", async () => {
      const request = new NextRequest("http://localhost:3000/api/dify/context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "test-user-id",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(data.success).toBe(false)
    })
  })

  describe("バリデーション", () => {
    it("userId がない場合、400エラー", async () => {
      const request = new NextRequest("http://localhost:3000/api/dify/context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "test-api-key",
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("userId is required")
      expect(data.success).toBe(false)
    })
  })

  describe("新規案件", () => {
    it("基本情報のみ返却、conversationHistory は null", async () => {
      const request = new NextRequest("http://localhost:3000/api/dify/context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "test-api-key",
        },
        body: JSON.stringify({
          userId: "test-user-id",
          isNewCase: true,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.profile).toBeDefined()
      expect(data.data.company).toBeDefined()
      expect(data.data.conversationHistory).toBeNull()
    })
  })

  describe("初回課題内容", () => {
    it("initialIssue が正しく構造化される", async () => {
      const request = new NextRequest("http://localhost:3000/api/dify/context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "test-api-key",
        },
        body: JSON.stringify({
          userId: "test-user-id",
          initialIssue: {
            content: "ホームページのアクセス数を増やしたい",
            category: "marketing",
            categoryLabel: "マーケティング",
          },
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.initialIssue).toBeDefined()
      expect(data.data.initialIssue.content).toBe("ホームページのアクセス数を増やしたい")
      expect(data.data.initialIssue.category).toBe("marketing")
      expect(data.data.initialIssue.categoryLabel).toBe("マーケティング")
      expect(data.data.initialIssue.createdAt).toBeDefined()
    })
  })
})
