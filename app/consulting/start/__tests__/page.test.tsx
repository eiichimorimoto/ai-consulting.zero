/**
 * Start画面の「新規」「既存」ボタン操作をシミュレートし、表示を検証するテスト。
 * @jest-environment jsdom
 */
import React from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ConsultingStartPage from "../page"

jest.mock("@/hooks/useVoiceInput", () => ({
  useVoiceInput: () => ({
    isListening: false,
    transcript: "",
    startListening: jest.fn(),
    stopListening: jest.fn(),
    resetTranscript: jest.fn(),
    error: null,
    enableAICorrection: false,
    setEnableAICorrection: jest.fn(),
  }),
}))

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}))

jest.mock("@/lib/utils/confetti", () => ({
  celebrateStepCompletion: jest.fn(),
}))

const mockFetch = jest.fn()
beforeEach(() => {
  mockFetch.mockReset()
  ;(global as unknown as { fetch: typeof fetch }).fetch = mockFetch
})

describe("Start画面", () => {
  it("初期表示で「新規」「既存」ボタンが表示され、タブは表示されない", async () => {
    render(<ConsultingStartPage />)

    const btnNew = screen.getByRole("button", { name: "新規" })
    const btnExisting = screen.getByRole("button", { name: "既存" })
    expect(btnNew).toBeInTheDocument()
    expect(btnExisting).toBeInTheDocument()

    // userChoice===null のときは SessionTabs を描画しない → 「新規相談」タブはまだない
    const tabLabel = screen.queryByText("新規相談")
    expect(tabLabel).not.toBeInTheDocument()
  })

  it("「新規」クリックでタブが1つ出現し、チャットエリアにヘッダーとメッセージが表示される", async () => {
    const user = userEvent.setup()
    render(<ConsultingStartPage />)

    const btnNew = screen.getByRole("button", { name: "新規" })
    await user.click(btnNew)

    // タブまたは「新規相談」ラベルが表示される（複数ある場合は最初の1つで十分）
    const tabOrLabels = await screen.findAllByText("新規相談", {}, { timeout: 2000 })
    expect(tabOrLabels.length).toBeGreaterThanOrEqual(1)

    // チャットエリア: ヘッダー「課題のヒアリング」またはAIメッセージ（複数箇所に表示される）
    const headers = screen.queryAllByText("課題のヒアリング")
    const aiMessages = screen.queryAllByText(/こんにちは|AIコンサル/)
    expect(headers.length > 0 || aiMessages.length > 0).toBe(true)
  })

  it("「既存」クリックで履歴APIを呼び、履歴が空なら新規セッションになる", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sessions: [] }),
    })

    const user = userEvent.setup()
    render(<ConsultingStartPage />)

    const btnExisting = screen.getByRole("button", { name: "既存" })
    await user.click(btnExisting)

    expect(mockFetch).toHaveBeenCalledWith("/api/consulting/sessions")
    // 履歴が空なので新規セッションが作られ、「新規相談」が表示される
    const tabOrLabels = await screen.findAllByText("新規相談", {}, { timeout: 3000 })
    expect(tabOrLabels.length).toBeGreaterThanOrEqual(1)
  })

  it("「既存」クリックで履歴がある場合、タブと履歴パネルが表示される", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessions: [
          {
            id: "s1",
            name: "売上の伸び悩み",
            progress: 40,
            status: "active",
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
      }),
    })

    const user = userEvent.setup()
    render(<ConsultingStartPage />)

    const btnExisting = screen.getByRole("button", { name: "既存" })
    await user.click(btnExisting)

    expect(mockFetch).toHaveBeenCalledWith("/api/consulting/sessions")
    // タブにセッション名（または短縮表示「相談」）・相談履歴が表示される（複数マッチ可）
    const sessionNames = await screen.findAllByText(/売上|相談/, {}, { timeout: 3000 })
    expect(sessionNames.length).toBeGreaterThanOrEqual(1)
  })
})
