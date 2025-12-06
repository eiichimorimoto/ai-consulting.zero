import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

// ブラウザクライアント（クライアントコンポーネント用）
export function createClient(): SupabaseClient {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// サーバークライアント（サーバーコンポーネント用）
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Types
export interface User {
  id: string
  email: string
  created_at: string
}

export interface Profile {
  id: string
  user_id: string
  name: string
  name_kana?: string
  email: string
  phone?: string
  mobile?: string
  position?: string
  department?: string
  company_id?: string
  avatar_url?: string
  plan_type: 'free' | 'standard' | 'enterprise'
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  name_kana?: string
  corporate_number?: string
  postal_code?: string
  prefecture?: string
  city?: string
  address?: string
  building?: string
  phone?: string
  fax?: string
  email?: string
  website?: string
  industry?: string
  employee_count?: string
  capital?: string
  annual_revenue?: string
  established_date?: string
  representative_name?: string
  business_description?: string
  main_products?: string[]
  current_challenges?: string[]
  source?: string
  source_url?: string
  created_at: string
  updated_at: string
}

export interface BusinessCard {
  id: string
  user_id: string
  company_id?: string
  person_name: string
  person_name_kana?: string
  position?: string
  department?: string
  email?: string
  phone?: string
  mobile?: string
  fax?: string
  postal_code?: string
  address?: string
  website?: string
  company_name?: string
  image_url?: string
  ocr_raw_text?: string
  ocr_confidence?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface ConsultingSession {
  id: string
  user_id: string
  company_id?: string
  title: string
  status: 'active' | 'completed' | 'archived'
  message_count: number
  analysis_summary?: string
  created_at: string
  updated_at: string
}

export interface ConsultingMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}
