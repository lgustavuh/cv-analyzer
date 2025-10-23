import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser/client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database types
export interface Database {
  public: {
    Tables: {
      user_profile: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          address: string | null;
          education: string | null;
          extra_activities: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          phone?: string | null;
          address?: string | null;
          education?: string | null;
          extra_activities?: string | null;
        };
        Update: {
          name?: string;
          email?: string;
          phone?: string | null;
          address?: string | null;
          education?: string | null;
          extra_activities?: string | null;
        };
      };
      job_posting: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          location: string | null;
          work_model: 'Presencial' | 'Remoto' | 'Híbrido' | 'Não informado';
          employment_type: 'CLT' | 'PJ' | 'Estágio' | 'Temporário' | 'Não informado';
          education: string | null;
          languages: string[] | null;
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string;
          salary_period: 'mensal' | 'anual' | 'hora' | 'na';
          raw_text: string;
          source_type: 'url' | 'text';
          source_value: string;
          language: string;
          char_count: number;
          hash_source: string;
          token_count: number | null;
          sections: any;
          analytics: any;
          status: 'ok' | 'error' | 'processing';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          location?: string | null;
          work_model?: 'Presencial' | 'Remoto' | 'Híbrido' | 'Não informado';
          employment_type?: 'CLT' | 'PJ' | 'Estágio' | 'Temporário' | 'Não informado';
          education?: string | null;
          languages?: string[] | null;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string;
          salary_period?: 'mensal' | 'anual' | 'hora' | 'na';
          raw_text: string;
          source_type: 'url' | 'text';
          source_value: string;
          language?: string;
          char_count: number;
          hash_source: string;
          token_count?: number | null;
          sections?: any;
          analytics?: any;
          status?: 'ok' | 'error' | 'processing';
        };
        Update: {
          title?: string;
          location?: string | null;
          work_model?: 'Presencial' | 'Remoto' | 'Híbrido' | 'Não informado';
          employment_type?: 'CLT' | 'PJ' | 'Estágio' | 'Temporário' | 'Não informado';
          education?: string | null;
          languages?: string[] | null;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string;
          salary_period?: 'mensal' | 'anual' | 'hora' | 'na';
          sections?: any;
          analytics?: any;
          status?: 'ok' | 'error' | 'processing';
        };
      };
      resume_doc: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          file_path: string | null;
          raw_text: string;
          char_count: number;
          hash_source: string;
          token_count: number | null;
          sections: any;
          analytics: any;
          status: 'ok' | 'error' | 'processing';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          file_path?: string | null;
          raw_text: string;
          char_count: number;
          hash_source: string;
          token_count?: number | null;
          sections?: any;
          analytics?: any;
          status?: 'ok' | 'error' | 'processing';
        };
        Update: {
          sections?: any;
          analytics?: any;
          status?: 'ok' | 'error' | 'processing';
        };
      };
      skill: {
        Row: {
          id: string;
          canonical: string;
          category: string | null;
          created_at: string;
        };
        Insert: {
          canonical: string;
          category?: string | null;
        };
        Update: {
          canonical?: string;
          category?: string | null;
        };
      };
      skill_alias: {
        Row: {
          id: string;
          skill_id: string;
          alias: string;
          created_at: string;
        };
        Insert: {
          skill_id: string;
          alias: string;
        };
        Update: {
          skill_id?: string;
          alias?: string;
        };
      };
      analysis_result: {
        Row: {
          id: string;
          user_id: string;
          job_posting_id: string;
          resume_doc_id: string;
          compatibility_score: number;
          ats_probability: 'Baixa' | 'Média' | 'Alta';
          rationale: string;
          matched_skills: any;
          missing_skills: any;
          extra_skills: any;
          created_at: string;
        };
        Insert: {
          user_id: string;
          job_posting_id: string;
          resume_doc_id: string;
          compatibility_score: number;
          ats_probability: 'Baixa' | 'Média' | 'Alta';
          rationale: string;
          matched_skills?: any;
          missing_skills?: any;
          extra_skills?: any;
        };
        Update: {
          compatibility_score?: number;
          ats_probability?: 'Baixa' | 'Média' | 'Alta';
          rationale?: string;
          matched_skills?: any;
          missing_skills?: any;
          extra_skills?: any;
        };
      };
    };
  };
}