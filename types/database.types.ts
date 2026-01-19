/**
 * Supabase Database Types
 * 
 * Generated from schema verification: 2026-01-17
 * Project: ai-consulting-zero (fwruumlkxzfihlmygrww)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone_number: string | null
          company_id: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone_number?: string | null
          company_id?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone_number?: string | null
          company_id?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          industry: string | null
          size: string | null
          annual_revenue: number | null
          postal_code: string | null
          prefecture: string | null
          city: string | null
          address: string | null
          building: string | null
          website_url: string | null
          description: string | null
          founded_year: number | null
          employee_count: number | null
          listing_status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          industry?: string | null
          size?: string | null
          annual_revenue?: number | null
          postal_code?: string | null
          prefecture?: string | null
          city?: string | null
          address?: string | null
          building?: string | null
          website_url?: string | null
          description?: string | null
          founded_year?: number | null
          employee_count?: number | null
          listing_status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          industry?: string | null
          size?: string | null
          annual_revenue?: number | null
          postal_code?: string | null
          prefecture?: string | null
          city?: string | null
          address?: string | null
          building?: string | null
          website_url?: string | null
          description?: string | null
          founded_year?: number | null
          employee_count?: number | null
          listing_status?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      consulting_sessions: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          title: string
          session_type: string | null
          status: string | null
          analysis_summary: string | null
          key_insights: Json | null
          recommendations: Json | null
          risk_assessment: Json | null
          message_count: number | null
          created_at: string | null
          updated_at: string | null
          category: string | null
          max_rounds: number | null
          current_round: number | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          company_id?: string | null
          title: string
          session_type?: string | null
          status?: string | null
          analysis_summary?: string | null
          key_insights?: Json | null
          recommendations?: Json | null
          risk_assessment?: Json | null
          message_count?: number | null
          created_at?: string | null
          updated_at?: string | null
          category?: string | null
          max_rounds?: number | null
          current_round?: number | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string | null
          title?: string
          session_type?: string | null
          status?: string | null
          analysis_summary?: string | null
          key_insights?: Json | null
          recommendations?: Json | null
          risk_assessment?: Json | null
          message_count?: number | null
          created_at?: string | null
          updated_at?: string | null
          category?: string | null
          max_rounds?: number | null
          current_round?: number | null
          completed_at?: string | null
        }
      }
      consulting_messages: {
        Row: {
          id: string
          session_id: string
          role: string
          content: string
          message_order: number
          tokens_used: number | null
          processing_time_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: string
          content: string
          message_order: number
          tokens_used?: number | null
          processing_time_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: string
          content?: string
          message_order?: number
          tokens_used?: number | null
          processing_time_ms?: number | null
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          session_id: string | null
          profile_id: string
          company_id: string
          title: string
          content: string
          content_markdown: string | null
          category: string
          framework_used: string | null
          status: string
          version: number
          parent_report_id: string | null
          views_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id?: string | null
          profile_id: string
          company_id: string
          title: string
          content: string
          content_markdown?: string | null
          category: string
          framework_used?: string | null
          status?: string
          version?: number
          parent_report_id?: string | null
          views_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string | null
          profile_id?: string
          company_id?: string
          title?: string
          content?: string
          content_markdown?: string | null
          category?: string
          framework_used?: string | null
          status?: string
          version?: number
          parent_report_id?: string | null
          views_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      shared_proposals: {
        Row: {
          id: string
          report_id: string
          share_token: string
          expires_at: string | null
          view_count: number
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          share_token: string
          expires_at?: string | null
          view_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          share_token?: string
          expires_at?: string | null
          view_count?: number
          created_at?: string
        }
      }
      business_cards: {
        Row: {
          id: string
          profile_id: string
          company_id: string | null
          original_filename: string
          storage_path: string
          file_size: number | null
          ocr_status: string
          ocr_result: Json | null
          extracted_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          company_id?: string | null
          original_filename: string
          storage_path: string
          file_size?: number | null
          ocr_status?: string
          ocr_result?: Json | null
          extracted_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          company_id?: string | null
          original_filename?: string
          storage_path?: string
          file_size?: number | null
          ocr_status?: string
          ocr_result?: Json | null
          extracted_data?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          profile_id: string
          plan_name: string
          status: string
          current_period_start: string | null
          current_period_end: string | null
          cancel_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          plan_name: string
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          plan_name?: string
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          profile_id: string
          action: string
          resource_type: string | null
          resource_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          action: string
          resource_type?: string | null
          resource_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          action?: string
          resource_type?: string | null
          resource_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      dashboard_data: {
        Row: {
          id: string
          profile_id: string
          company_id: string
          data_type: string
          data: Json
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          company_id: string
          data_type: string
          data: Json
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          company_id?: string
          data_type?: string
          data?: Json
          expires_at?: string
          created_at?: string
        }
      }
      diagnosis_previews: {
        Row: {
          id: string
          preview_token: string
          url: string
          diagnosis_data: Json | null
          status: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          preview_token: string
          url: string
          diagnosis_data?: Json | null
          status?: string
          created_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          preview_token?: string
          url?: string
          diagnosis_data?: Json | null
          status?: string
          created_at?: string
          expires_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          email: string
          name: string | null
          company_name: string | null
          phone: string | null
          source: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          company_name?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          company_name?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      diagnostic_reports: {
        Row: {
          id: string
          company_id: string
          report_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          report_data: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          report_data?: Json
          created_at?: string
          updated_at?: string
        }
      }
      digital_scores: {
        Row: {
          id: string
          company_id: string
          url: string
          performance_score: number | null
          accessibility_score: number | null
          best_practices_score: number | null
          seo_score: number | null
          collected_at: string
        }
        Insert: {
          id?: string
          company_id: string
          url: string
          performance_score?: number | null
          accessibility_score?: number | null
          best_practices_score?: number | null
          seo_score?: number | null
          collected_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          url?: string
          performance_score?: number | null
          accessibility_score?: number | null
          best_practices_score?: number | null
          seo_score?: number | null
          collected_at?: string
        }
      }
      data_collection_logs: {
        Row: {
          id: string
          company_id: string
          data_type: string
          status: string
          error_message: string | null
          collected_at: string
        }
        Insert: {
          id?: string
          company_id: string
          data_type: string
          status: string
          error_message?: string | null
          collected_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          data_type?: string
          status?: string
          error_message?: string | null
          collected_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// ========================================
// Helper Types for Dify Integration
// ========================================

/**
 * Consulting session categories
 */
export type SessionCategory = 
  | 'swot_analysis'
  | 'business_model'
  | 'market_analysis'
  | 'financial_planning'
  | 'digital_transformation'
  | 'hr_strategy'
  | 'general_consulting'

/**
 * Session status types
 */
export type SessionStatus = 
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'

/**
 * Message roles
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * Report categories
 */
export type ReportCategory = 
  | 'swot_analysis'
  | 'business_strategy'
  | 'market_research'
  | 'financial_report'
  | 'technical_audit'
  | 'general_report'

/**
 * Report status
 */
export type ReportStatus = 'draft' | 'final' | 'archived'

// ========================================
// Utility Types
// ========================================

/**
 * Extract Row type from a table
 */
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row']

/**
 * Extract Insert type from a table
 */
export type TablesInsert<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert']

/**
 * Extract Update type from a table
 */
export type TablesUpdate<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update']

// ========================================
// Commonly Used Types (Aliases)
// ========================================

export type Profile = Tables<'profiles'>
export type Company = Tables<'companies'>
export type ConsultingSession = Tables<'consulting_sessions'>
export type ConsultingMessage = Tables<'consulting_messages'>
export type Report = Tables<'reports'>
export type SharedProposal = Tables<'shared_proposals'>
export type BusinessCard = Tables<'business_cards'>
export type Subscription = Tables<'subscriptions'>
export type ActivityLog = Tables<'activity_logs'>
export type DashboardData = Tables<'dashboard_data'>

// Insert types
export type ProfileInsert = TablesInsert<'profiles'>
export type CompanyInsert = TablesInsert<'companies'>
export type ConsultingSessionInsert = TablesInsert<'consulting_sessions'>
export type ConsultingMessageInsert = TablesInsert<'consulting_messages'>
export type ReportInsert = TablesInsert<'reports'>
export type SharedProposalInsert = TablesInsert<'shared_proposals'>

// Update types
export type ProfileUpdate = TablesUpdate<'profiles'>
export type CompanyUpdate = TablesUpdate<'companies'>
export type ConsultingSessionUpdate = TablesUpdate<'consulting_sessions'>
export type ConsultingMessageUpdate = TablesUpdate<'consulting_messages'>
export type ReportUpdate = TablesUpdate<'reports'>
export type SharedProposalUpdate = TablesUpdate<'shared_proposals'>
