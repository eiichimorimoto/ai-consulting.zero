/**
 * AI相談機能の型定義
 */

export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface ConsultingSession {
  id: string
  user_id: string
  company_id: string | null
  title: string
  category: string
  status: 'active' | 'completed' | 'archived'
  current_round: number
  max_rounds: number
  analysis_summary: string | null
  key_insights: any
  recommendations: any
  risk_assessment: any
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface ContextData {
  digitalScore: number | null
  issueCount: number
  attachments: Array<{
    id: string
    name: string
    type: string
    url: string
  }>
  proposal: {
    status: 'none' | 'generating' | 'ready'
    id: string | null
  }
}

export type ViewMode = 'start' | 'chat' | 'proposal'

export interface ConsultingState {
  viewMode: ViewMode
  session: ConsultingSession | null
  messages: Message[]
  contextData: ContextData
  isLoading: boolean
}
