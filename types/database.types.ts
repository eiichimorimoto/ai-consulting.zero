export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      business_cards: {
        Row: {
          address: string | null
          company_id: string | null
          company_name: string | null
          created_at: string | null
          department: string | null
          email: string | null
          fax: string | null
          id: string
          image_url: string | null
          is_favorite: boolean | null
          mobile: string | null
          notes: string | null
          ocr_confidence: number | null
          ocr_raw_text: string | null
          person_name: string
          person_name_kana: string | null
          phone: string | null
          postal_code: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          fax?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          mobile?: string | null
          notes?: string | null
          ocr_confidence?: number | null
          ocr_raw_text?: string | null
          person_name: string
          person_name_kana?: string | null
          phone?: string | null
          postal_code?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          fax?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          mobile?: string | null
          notes?: string | null
          ocr_confidence?: number | null
          ocr_raw_text?: string | null
          person_name?: string
          person_name_kana?: string | null
          phone?: string | null
          postal_code?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_cards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_reasons: {
        Row: {
          cancel_type: string | null
          created_at: string | null
          id: string
          months_subscribed: number | null
          plan_at_cancel: string | null
          reason_category: string
          reason_detail: string | null
          retention_accepted: boolean | null
          retention_offered: boolean | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          cancel_type?: string | null
          created_at?: string | null
          id?: string
          months_subscribed?: number | null
          plan_at_cancel?: string | null
          reason_category: string
          reason_detail?: string | null
          retention_accepted?: boolean | null
          retention_offered?: boolean | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          cancel_type?: string | null
          created_at?: string | null
          id?: string
          months_subscribed?: number | null
          plan_at_cancel?: string | null
          reason_category?: string
          reason_detail?: string | null
          retention_accepted?: boolean | null
          retention_offered?: boolean | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_reasons_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          annual_revenue: string | null
          building: string | null
          business_description: string | null
          capital: string | null
          city: string | null
          corporate_number: string | null
          created_at: string | null
          current_challenges: string[] | null
          documents_urls: string[] | null
          email: string | null
          employee_count: string | null
          established_date: string | null
          fax: string | null
          fiscal_year_end: number | null
          growth_stage: string | null
          id: string
          industry: string | null
          is_verified: boolean | null
          it_maturity_level: string | null
          main_banks: string[] | null
          main_clients: string[] | null
          main_products: string[] | null
          name: string
          name_kana: string | null
          phone: string | null
          postal_code: string | null
          prefecture: string | null
          representative_name: string | null
          retrieved_info: Json | null
          source: string | null
          source_url: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          annual_revenue?: string | null
          building?: string | null
          business_description?: string | null
          capital?: string | null
          city?: string | null
          corporate_number?: string | null
          created_at?: string | null
          current_challenges?: string[] | null
          documents_urls?: string[] | null
          email?: string | null
          employee_count?: string | null
          established_date?: string | null
          fax?: string | null
          fiscal_year_end?: number | null
          growth_stage?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean | null
          it_maturity_level?: string | null
          main_banks?: string[] | null
          main_clients?: string[] | null
          main_products?: string[] | null
          name: string
          name_kana?: string | null
          phone?: string | null
          postal_code?: string | null
          prefecture?: string | null
          representative_name?: string | null
          retrieved_info?: Json | null
          source?: string | null
          source_url?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          annual_revenue?: string | null
          building?: string | null
          business_description?: string | null
          capital?: string | null
          city?: string | null
          corporate_number?: string | null
          created_at?: string | null
          current_challenges?: string[] | null
          documents_urls?: string[] | null
          email?: string | null
          employee_count?: string | null
          established_date?: string | null
          fax?: string | null
          fiscal_year_end?: number | null
          growth_stage?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean | null
          it_maturity_level?: string | null
          main_banks?: string[] | null
          main_clients?: string[] | null
          main_products?: string[] | null
          name?: string
          name_kana?: string | null
          phone?: string | null
          postal_code?: string | null
          prefecture?: string | null
          representative_name?: string | null
          retrieved_info?: Json | null
          source?: string | null
          source_url?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_web_resources: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_primary: boolean | null
          relevance_score: number | null
          resource_type: string | null
          scraped_content: string | null
          title: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_primary?: boolean | null
          relevance_score?: number | null
          resource_type?: string | null
          scraped_content?: string | null
          title?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_primary?: boolean | null
          relevance_score?: number | null
          resource_type?: string | null
          scraped_content?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_web_resources_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      consulting_messages: {
        Row: {
          analysis_type: string | null
          attachments: Json | null
          confidence_score: number | null
          content: string
          created_at: string | null
          id: string
          message_order: number | null
          processing_time_ms: number | null
          role: string
          session_id: string
          step_round: number
          tokens_used: number | null
        }
        Insert: {
          analysis_type?: string | null
          attachments?: Json | null
          confidence_score?: number | null
          content: string
          created_at?: string | null
          id?: string
          message_order?: number | null
          processing_time_ms?: number | null
          role: string
          session_id: string
          step_round?: number
          tokens_used?: number | null
        }
        Update: {
          analysis_type?: string | null
          attachments?: Json | null
          confidence_score?: number | null
          content?: string
          created_at?: string | null
          id?: string
          message_order?: number | null
          processing_time_ms?: number | null
          role?: string
          session_id?: string
          step_round?: number
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consulting_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "consulting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      consulting_sessions: {
        Row: {
          analysis_summary: string | null
          category: string | null
          company_id: string | null
          completed_at: string | null
          conversation_id: string | null
          created_at: string | null
          current_round: number | null
          id: string
          key_insights: Json | null
          max_rounds: number | null
          message_count: number | null
          recommendations: Json | null
          risk_assessment: Json | null
          session_type: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_summary?: string | null
          category?: string | null
          company_id?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          current_round?: number | null
          id?: string
          key_insights?: Json | null
          max_rounds?: number | null
          message_count?: number | null
          recommendations?: Json | null
          risk_assessment?: Json | null
          session_type?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_summary?: string | null
          category?: string | null
          company_id?: string | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          current_round?: number | null
          id?: string
          key_insights?: Json | null
          max_rounds?: number | null
          message_count?: number | null
          recommendations?: Json | null
          risk_assessment?: Json | null
          session_type?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consulting_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      consulting_step_reports: {
        Row: {
          content: string
          content_markdown: string | null
          created_at: string | null
          id: string
          session_id: string
          step_round: number
          title: string
        }
        Insert: {
          content: string
          content_markdown?: string | null
          created_at?: string | null
          id?: string
          session_id: string
          step_round: number
          title: string
        }
        Update: {
          content?: string
          content_markdown?: string | null
          created_at?: string | null
          id?: string
          session_id?: string
          step_round?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "consulting_step_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "consulting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_reviews: {
        Row: {
          collected_at: string | null
          company_id: string
          helpful_count: number | null
          id: string
          rating: number | null
          review_date: string | null
          review_text: string | null
          review_title: string | null
          reviewer_avatar_url: string | null
          reviewer_name: string | null
          source: string | null
          source_id: string | null
        }
        Insert: {
          collected_at?: string | null
          company_id: string
          helpful_count?: number | null
          id?: string
          rating?: number | null
          review_date?: string | null
          review_text?: string | null
          review_title?: string | null
          reviewer_avatar_url?: string | null
          reviewer_name?: string | null
          source?: string | null
          source_id?: string | null
        }
        Update: {
          collected_at?: string | null
          company_id?: string
          helpful_count?: number | null
          id?: string
          rating?: number | null
          review_date?: string | null
          review_text?: string | null
          review_title?: string | null
          reviewer_avatar_url?: string | null
          reviewer_name?: string | null
          source?: string | null
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      data_collection_logs: {
        Row: {
          collection_type: string
          company_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          items_collected: number | null
          status: string
        }
        Insert: {
          collection_type: string
          company_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          items_collected?: number | null
          status: string
        }
        Update: {
          collection_type?: string
          company_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          items_collected?: number | null
          status?: string
        }
        Relationships: []
      }
      diagnosis_previews: {
        Row: {
          company_name: string
          created_at: string | null
          email: string
          id: string
          lead_id: string | null
          metrics: Json | null
          overall_score: number | null
          top_issues: Json | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          company_name: string
          created_at?: string | null
          email: string
          id?: string
          lead_id?: string | null
          metrics?: Json | null
          overall_score?: number | null
          top_issues?: Json | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string | null
          email?: string
          id?: string
          lead_id?: string | null
          metrics?: Json | null
          overall_score?: number | null
          top_issues?: Json | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_previews_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_reports: {
        Row: {
          company_id: string
          created_at: string | null
          diagnosis_type: string | null
          generated_at: string | null
          generated_by: string | null
          generation_model: string | null
          id: string
          impact_score: number | null
          is_sent: boolean | null
          matched_issues: Json | null
          notes: string | null
          overall_score: number | null
          priority_score: number | null
          report_json: Json | null
          report_markdown: string | null
          report_pdf_url: string | null
          report_summary: string | null
          report_title: string | null
          sent_at: string | null
          status: string | null
          updated_at: string | null
          urgency_score: number | null
          viewed_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          diagnosis_type?: string | null
          generated_at?: string | null
          generated_by?: string | null
          generation_model?: string | null
          id?: string
          impact_score?: number | null
          is_sent?: boolean | null
          matched_issues?: Json | null
          notes?: string | null
          overall_score?: number | null
          priority_score?: number | null
          report_json?: Json | null
          report_markdown?: string | null
          report_pdf_url?: string | null
          report_summary?: string | null
          report_title?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
          urgency_score?: number | null
          viewed_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          diagnosis_type?: string | null
          generated_at?: string | null
          generated_by?: string | null
          generation_model?: string | null
          id?: string
          impact_score?: number | null
          is_sent?: boolean | null
          matched_issues?: Json | null
          notes?: string | null
          overall_score?: number | null
          priority_score?: number | null
          report_json?: Json | null
          report_markdown?: string | null
          report_pdf_url?: string | null
          report_summary?: string | null
          report_title?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
          urgency_score?: number | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_scores: {
        Row: {
          accessibility_desktop: number | null
          accessibility_mobile: number | null
          best_practices_desktop: number | null
          best_practices_mobile: number | null
          cls_desktop: number | null
          cls_mobile: number | null
          company_id: string
          created_at: string | null
          desktop_score: number | null
          fcp_desktop: number | null
          fcp_mobile: number | null
          has_ssl: boolean | null
          id: string
          is_mobile_friendly: boolean | null
          lcp_desktop: number | null
          lcp_mobile: number | null
          mobile_score: number | null
          performance_desktop: number | null
          performance_mobile: number | null
          seo_desktop: number | null
          seo_mobile: number | null
          tbt_desktop: number | null
          tbt_mobile: number | null
          tti_desktop: number | null
          tti_mobile: number | null
          updated_at: string | null
        }
        Insert: {
          accessibility_desktop?: number | null
          accessibility_mobile?: number | null
          best_practices_desktop?: number | null
          best_practices_mobile?: number | null
          cls_desktop?: number | null
          cls_mobile?: number | null
          company_id: string
          created_at?: string | null
          desktop_score?: number | null
          fcp_desktop?: number | null
          fcp_mobile?: number | null
          has_ssl?: boolean | null
          id?: string
          is_mobile_friendly?: boolean | null
          lcp_desktop?: number | null
          lcp_mobile?: number | null
          mobile_score?: number | null
          performance_desktop?: number | null
          performance_mobile?: number | null
          seo_desktop?: number | null
          seo_mobile?: number | null
          tbt_desktop?: number | null
          tbt_mobile?: number | null
          tti_desktop?: number | null
          tti_mobile?: number | null
          updated_at?: string | null
        }
        Update: {
          accessibility_desktop?: number | null
          accessibility_mobile?: number | null
          best_practices_desktop?: number | null
          best_practices_mobile?: number | null
          cls_desktop?: number | null
          cls_mobile?: number | null
          company_id?: string
          created_at?: string | null
          desktop_score?: number | null
          fcp_desktop?: number | null
          fcp_mobile?: number | null
          has_ssl?: boolean | null
          id?: string
          is_mobile_friendly?: boolean | null
          lcp_desktop?: number | null
          lcp_mobile?: number | null
          mobile_score?: number | null
          performance_desktop?: number | null
          performance_mobile?: number | null
          seo_desktop?: number | null
          seo_mobile?: number | null
          tbt_desktop?: number | null
          tbt_mobile?: number | null
          tti_desktop?: number | null
          tti_mobile?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      employee_reviews: {
        Row: {
          advice_to_management: string | null
          collected_at: string | null
          company_id: string
          compensation_rating: number | null
          culture_rating: number | null
          growth_rating: number | null
          id: string
          is_verified: boolean | null
          management_rating: number | null
          negative_points: string | null
          overall_rating: number | null
          positive_points: string | null
          review_date: string | null
          review_text: string | null
          reviewer_employment_status: string | null
          reviewer_position: string | null
          reviewer_tenure_years: number | null
          source: string | null
          source_id: string | null
          work_life_balance_rating: number | null
        }
        Insert: {
          advice_to_management?: string | null
          collected_at?: string | null
          company_id: string
          compensation_rating?: number | null
          culture_rating?: number | null
          growth_rating?: number | null
          id?: string
          is_verified?: boolean | null
          management_rating?: number | null
          negative_points?: string | null
          overall_rating?: number | null
          positive_points?: string | null
          review_date?: string | null
          review_text?: string | null
          reviewer_employment_status?: string | null
          reviewer_position?: string | null
          reviewer_tenure_years?: number | null
          source?: string | null
          source_id?: string | null
          work_life_balance_rating?: number | null
        }
        Update: {
          advice_to_management?: string | null
          collected_at?: string | null
          company_id?: string
          compensation_rating?: number | null
          culture_rating?: number | null
          growth_rating?: number | null
          id?: string
          is_verified?: boolean | null
          management_rating?: number | null
          negative_points?: string | null
          overall_rating?: number | null
          positive_points?: string | null
          review_date?: string | null
          review_text?: string | null
          reviewer_employment_status?: string | null
          reviewer_position?: string | null
          reviewer_tenure_years?: number | null
          source?: string | null
          source_id?: string | null
          work_life_balance_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          collected_at: string | null
          company_id: string
          employment_status: string | null
          id: string
          is_active: boolean | null
          is_urgent: boolean | null
          job_category: string | null
          job_description: string | null
          job_description_short: string | null
          job_title: string | null
          job_type: string | null
          posting_date: string | null
          preferred_skills: string[] | null
          required_skills: string[] | null
          salary_max: number | null
          salary_min: number | null
          salary_type: string | null
          source: string | null
          source_url: string | null
          updated_at: string | null
          urgency_level: number | null
          work_location: string | null
          working_hours: string | null
        }
        Insert: {
          collected_at?: string | null
          company_id: string
          employment_status?: string | null
          id?: string
          is_active?: boolean | null
          is_urgent?: boolean | null
          job_category?: string | null
          job_description?: string | null
          job_description_short?: string | null
          job_title?: string | null
          job_type?: string | null
          posting_date?: string | null
          preferred_skills?: string[] | null
          required_skills?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          salary_type?: string | null
          source?: string | null
          source_url?: string | null
          updated_at?: string | null
          urgency_level?: number | null
          work_location?: string | null
          working_hours?: string | null
        }
        Update: {
          collected_at?: string | null
          company_id?: string
          employment_status?: string | null
          id?: string
          is_active?: boolean | null
          is_urgent?: boolean | null
          job_category?: string | null
          job_description?: string | null
          job_description_short?: string | null
          job_title?: string | null
          job_type?: string | null
          posting_date?: string | null
          preferred_skills?: string[] | null
          required_skills?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          salary_type?: string | null
          source?: string | null
          source_url?: string | null
          updated_at?: string | null
          urgency_level?: number | null
          work_location?: string | null
          working_hours?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_analysis: {
        Row: {
          company_id: string
          extracted_at: string | null
          extraction_method: string | null
          frequency: number | null
          id: string
          importance_weight: number | null
          keyword: string
          keyword_category: string | null
          sentiment: string | null
          sentiment_score: number | null
          source: string | null
          source_record_id: string | null
        }
        Insert: {
          company_id: string
          extracted_at?: string | null
          extraction_method?: string | null
          frequency?: number | null
          id?: string
          importance_weight?: number | null
          keyword: string
          keyword_category?: string | null
          sentiment?: string | null
          sentiment_score?: number | null
          source?: string | null
          source_record_id?: string | null
        }
        Update: {
          company_id?: string
          extracted_at?: string | null
          extraction_method?: string | null
          frequency?: number | null
          id?: string
          importance_weight?: number | null
          keyword?: string
          keyword_category?: string | null
          sentiment?: string | null
          sentiment_score?: number | null
          source?: string | null
          source_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keyword_analysis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string
          id: string
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email: string
          id?: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string
          id?: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pagespeed_cache: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          result: Json
          strategy: string
          url: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          result: Json
          strategy: string
          url: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          result?: Json
          strategy?: string
          url?: string
        }
        Relationships: []
      }
      payment_failures: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          dunning_status: string | null
          email_sent_count: number | null
          id: string
          last_attempt_at: string | null
          next_attempt_at: string | null
          resolved_at: string | null
          service_suspended_at: string | null
          stripe_invoice_id: string | null
          user_id: string
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          dunning_status?: string | null
          email_sent_count?: number | null
          id?: string
          last_attempt_at?: string | null
          next_attempt_at?: string | null
          resolved_at?: string | null
          service_suspended_at?: string | null
          stripe_invoice_id?: string | null
          user_id: string
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          dunning_status?: string | null
          email_sent_count?: number | null
          id?: string
          last_attempt_at?: string | null
          next_attempt_at?: string | null
          resolved_at?: string | null
          service_suspended_at?: string | null
          stripe_invoice_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          department: string | null
          email: string
          id: string
          mobile: string | null
          monthly_chat_count: number | null
          monthly_ocr_count: number | null
          name: string
          name_kana: string | null
          phone: string | null
          plan_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          id?: string
          mobile?: string | null
          monthly_chat_count?: number | null
          monthly_ocr_count?: number | null
          name: string
          name_kana?: string | null
          phone?: string | null
          plan_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          id?: string
          mobile?: string | null
          monthly_chat_count?: number | null
          monthly_ocr_count?: number | null
          name?: string
          name_kana?: string | null
          phone?: string | null
          plan_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          charts_data: Json | null
          company_id: string | null
          content: Json | null
          content_markdown: string | null
          created_at: string | null
          executive_summary: string | null
          framework_used: string | null
          id: string
          metrics: Json | null
          parent_report_id: string | null
          pdf_url: string | null
          report_type: string
          score: number | null
          session_id: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          charts_data?: Json | null
          company_id?: string | null
          content?: Json | null
          content_markdown?: string | null
          created_at?: string | null
          executive_summary?: string | null
          framework_used?: string | null
          id?: string
          metrics?: Json | null
          parent_report_id?: string | null
          pdf_url?: string | null
          report_type: string
          score?: number | null
          session_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          charts_data?: Json | null
          company_id?: string | null
          content?: Json | null
          content_markdown?: string | null
          created_at?: string | null
          executive_summary?: string | null
          framework_used?: string | null
          id?: string
          metrics?: Json | null
          parent_report_id?: string | null
          pdf_url?: string | null
          report_type?: string
          score?: number | null
          session_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_parent_report"
            columns: ["parent_report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "consulting_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_proposals: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string
          id: string
          last_viewed_at: string | null
          report_id: string
          token: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at: string
          id?: string
          last_viewed_at?: string | null
          report_id: string
          token: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string
          id?: string
          last_viewed_at?: string | null
          report_id?: string
          token?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_proposals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          app_status: string | null
          billing_interval: string | null
          cancel_at: string | null
          canceled_at: string | null
          chat_count: number | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          ocr_count: number | null
          plan_type: string
          status: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_status?: string | null
          billing_interval?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          chat_count?: number | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          ocr_count?: number | null
          plan_type?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_status?: string | null
          billing_interval?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          chat_count?: number | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          ocr_count?: number | null
          plan_type?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_pagespeed_cache: { Args: never; Returns: undefined }
    }
    Enums: {
      consultation_category:
        | "sales_revenue"
        | "cost_efficiency"
        | "hr_organization"
        | "digital_dx"
        | "strategy"
        | "other"
      session_status: "active" | "draft" | "paused" | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      consultation_category: [
        "sales_revenue",
        "cost_efficiency",
        "hr_organization",
        "digital_dx",
        "strategy",
        "other",
      ],
      session_status: ["active", "draft", "paused", "completed"],
    },
  },
} as const
