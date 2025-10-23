// Tipos para o sistema de análise de vagas e currículos

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt: Date;
}

export interface JobAnalysis {
  meta: {
    source: 'url' | 'text';
    language: string;
    charCount: number;
    status: 'ok' | 'error';
  };
  job: {
    title: string;
    location: string;
    workModel: 'Presencial' | 'Remoto' | 'Híbrido' | 'Não informado';
    employmentType: 'CLT' | 'PJ' | 'Estágio' | 'Temporário' | 'Não informado';
    education: string;
    languages: string[];
    salary: {
      min: number | null;
      max: number | null;
      currency: string;
      period: 'mensal' | 'anual' | 'hora' | 'na';
    };
  };
  sections: {
    responsibilities: string[];
    requirements_must: string[];
    requirements_nice: string[];
    benefits: string[];
    tools_tech: string[];
  };
  analytics: {
    topKeywords: Array<{ term: string; weight: number }>;
    alerts: string[];
  };
  raw: {
    cleanText: string;
  };
}

export interface CVAnalysis {
  candidate: {
    name: string;
    email: string;
    phone: string;
    education: string;
    extraActivities: string;
  };
  sections: {
    skills: string[];
    experience: string[];
    certifications: string[];
  };
  analytics: {
    topKeywords: Array<{ term: string; weight: number }>;
    alerts: string[];
  };
}

export interface MatchResult {
  compatibility: number;
  matched: {
    must: string[];
    nice: string[];
  };
  missing: {
    must: string[];
    nice: string[];
  };
  atsProbability: 'Baixa' | 'Média' | 'Alta';
  rationale: string;
}

export interface AppState {
  currentTab: TabType;
  user: User | null;
  isAuthenticated: boolean;
  jobAnalysis: JobAnalysis | null;
  cvAnalysis: CVAnalysis | null;
  matchResult: MatchResult | null;
  userProfile: {
    name: string;
    email: string;
    phone: string;
    education: string;
    extraActivities: string;
  };
}

export type TabType = 
  | 'welcome' 
  | 'profile' 
  | 'job' 
  | 'cv' 
  | 'analysis' 
  | 'result' 
  | 'download';

export interface JobInput {
  type: 'url' | 'text';
  value: string;
}

export interface AuthFormData {
  name?: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}