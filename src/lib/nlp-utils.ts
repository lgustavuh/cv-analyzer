import * as crypto from 'crypto';
import { removeStopwords, por as stopwordsPt } from 'stopword';
import { supabaseAdmin } from './supabase';

// Interfaces para o sistema NLP
export interface ExtractedSkill {
  canonical: string;
  origin: string;
  offsetStart: number;
  offsetEnd: number;
  confidence: number;
}

export interface ProcessedText {
  cleanText: string;
  charCount: number;
  tokenCount: number;
  hashSource: string;
  language: string;
  sentences: string[];
}

export interface JobSections {
  responsibilities: string[];
  requirements_must: string[];
  requirements_nice: string[];
  benefits: string[];
  tools_tech: string[];
}

export interface CVSections {
  skills: string[];
  experience: string[];
  certifications: string[];
  education: string[];
  personal_info: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface TopKeyword {
  term: string;
  weight: number;
}

// Validação de conteúdo mínimo
export function validateMinimumContent(text: string, type: 'job' | 'cv'): { valid: boolean; error?: string } {
  const minChars = type === 'job' ? 800 : 600;
  const minSentences = type === 'job' ? 8 : 6;
  
  if (text.length < minChars) {
    return {
      valid: false,
      error: `EMPTY_CONTENT: Conteúdo muito curto (${text.length} caracteres). ${type === 'job' ? 'Cole a descrição completa da vaga' : 'Envie um PDF com mais conteúdo textual'}.`
    };
  }
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length < minSentences) {
    return {
      valid: false,
      error: `EMPTY_CONTENT: Conteúdo insuficiente (${sentences.length} sentenças). ${type === 'job' ? 'Verifique se a descrição está completa' : 'Verifique se o arquivo contém texto legível'}.`
    };
  }
  
  return { valid: true };
}

// Processamento básico de texto
export function processText(rawText: string): ProcessedText {
  // Limpeza básica
  let cleanText = rawText
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, '\n')
    .trim();
  
  // Remover elementos HTML se houver
  cleanText = cleanText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  
  const charCount = cleanText.length;
  const tokenCount = cleanText.split(/\s+/).length;
  const hashSource = crypto.createHash('sha256').update(cleanText.substring(0, 5000)).digest('hex');
  
  // Detecção simples de idioma (português)
  const ptWords = ['de', 'da', 'do', 'para', 'com', 'em', 'na', 'no', 'por', 'que', 'uma', 'um', 'os', 'as'];
  const words = cleanText.toLowerCase().split(/\s+/).slice(0, 100);
  const ptCount = words.filter(word => ptWords.includes(word)).length;
  const language = ptCount > 5 ? 'pt-BR' : 'pt-BR'; // Forçar pt-BR sempre
  
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  return {
    cleanText,
    charCount,
    tokenCount,
    hashSource,
    language,
    sentences
  };
}

// Extração de seções de vaga
export function extractJobSections(text: string): JobSections {
  const sections: JobSections = {
    responsibilities: [],
    requirements_must: [],
    requirements_nice: [],
    benefits: [],
    tools_tech: []
  };
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  let currentSection = '';
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Identificar seções
    if (lowerLine.includes('responsabilidade') || lowerLine.includes('atividade') || lowerLine.includes('função')) {
      currentSection = 'responsibilities';
      continue;
    } else if (lowerLine.includes('requisito') || lowerLine.includes('qualificação') || lowerLine.includes('exigência')) {
      if (lowerLine.includes('desejável') || lowerLine.includes('diferencial') || lowerLine.includes('plus')) {
        currentSection = 'requirements_nice';
      } else {
        currentSection = 'requirements_must';
      }
      continue;
    } else if (lowerLine.includes('benefício') || lowerLine.includes('oferecemos')) {
      currentSection = 'benefits';
      continue;
    } else if (lowerLine.includes('tecnologia') || lowerLine.includes('ferramenta') || lowerLine.includes('stack')) {
      currentSection = 'tools_tech';
      continue;
    }
    
    // Adicionar conteúdo à seção atual
    if (currentSection && line.length > 10) {
      // Limpar bullets e numeração
      const cleanLine = line.replace(/^[-•*\d+.)\s]+/, '').trim();
      if (cleanLine.length > 5) {
        sections[currentSection as keyof JobSections].push(cleanLine);
      }
    }
  }
  
  // Se não encontrou seções estruturadas, tentar extrair do texto corrido
  if (Object.values(sections).every(arr => arr.length === 0)) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      
      if (lowerSentence.includes('responsável') || lowerSentence.includes('desenvolver') || lowerSentence.includes('gerenciar')) {
        sections.responsibilities.push(sentence.trim());
      } else if (lowerSentence.includes('experiência') || lowerSentence.includes('conhecimento') || lowerSentence.includes('domínio')) {
        if (lowerSentence.includes('desejável') || lowerSentence.includes('diferencial')) {
          sections.requirements_nice.push(sentence.trim());
        } else {
          sections.requirements_must.push(sentence.trim());
        }
      } else if (lowerSentence.includes('benefício') || lowerSentence.includes('vale') || lowerSentence.includes('plano')) {
        sections.benefits.push(sentence.trim());
      }
    }
  }
  
  return sections;
}

// Extração de seções de CV
export function extractCVSections(text: string): CVSections {
  const sections: CVSections = {
    skills: [],
    experience: [],
    certifications: [],
    education: [],
    personal_info: {
      name: '',
      email: '',
      phone: ''
    }
  };
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Extrair informações pessoais
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /\(?\d{2}\)?\s?\d{4,5}-?\d{4}/;
  
  for (const line of lines) {
    const emailMatch = line.match(emailRegex);
    if (emailMatch && !sections.personal_info.email) {
      sections.personal_info.email = emailMatch[0];
    }
    
    const phoneMatch = line.match(phoneRegex);
    if (phoneMatch && !sections.personal_info.phone) {
      sections.personal_info.phone = phoneMatch[0];
    }
    
    // Nome (primeira linha não vazia que não seja email/telefone)
    if (!sections.personal_info.name && line.length > 5 && line.length < 50 && 
        !emailMatch && !phoneMatch && !/\d/.test(line)) {
      sections.personal_info.name = line;
    }
  }
  
  let currentSection = '';
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Identificar seções
    if (lowerLine.includes('experiência') || lowerLine.includes('profissional') || lowerLine.includes('trabalho')) {
      currentSection = 'experience';
      continue;
    } else if (lowerLine.includes('habilidade') || lowerLine.includes('competência') || lowerLine.includes('skill')) {
      currentSection = 'skills';
      continue;
    } else if (lowerLine.includes('certificação') || lowerLine.includes('certificado') || lowerLine.includes('curso')) {
      currentSection = 'certifications';
      continue;
    } else if (lowerLine.includes('formação') || lowerLine.includes('educação') || lowerLine.includes('acadêmic')) {
      currentSection = 'education';
      continue;
    }
    
    // Adicionar conteúdo à seção atual
    if (currentSection && line.length > 10) {
      const cleanLine = line.replace(/^[-•*\d+.)\s]+/, '').trim();
      if (cleanLine.length > 5) {
        sections[currentSection as keyof Omit<CVSections, 'personal_info'>].push(cleanLine);
      }
    }
  }
  
  return sections;
}

// Normalização de skills usando banco de dados
export async function normalizeSkills(rawSkills: string[]): Promise<ExtractedSkill[]> {
  const extractedSkills: ExtractedSkill[] = [];
  
  // Buscar todas as skills e aliases do banco
  const { data: skillsData } = await supabaseAdmin
    .from('skill')
    .select(`
      id,
      canonical,
      skill_alias (alias)
    `);
  
  if (!skillsData) return extractedSkills;
  
  // Criar mapa de normalização
  const normalizationMap = new Map<string, string>();
  
  for (const skill of skillsData) {
    // Adicionar canonical
    normalizationMap.set(skill.canonical.toLowerCase(), skill.canonical);
    
    // Adicionar aliases
    if (skill.skill_alias) {
      for (const alias of skill.skill_alias) {
        normalizationMap.set(alias.alias.toLowerCase(), skill.canonical);
      }
    }
  }
  
  // Processar cada skill raw
  for (const rawSkill of rawSkills) {
    const words = rawSkill.toLowerCase().split(/[\s,/]+/);
    
    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '').trim();
      if (cleanWord.length < 2) continue;
      
      const canonical = normalizationMap.get(cleanWord);
      if (canonical) {
        const existingSkill = extractedSkills.find(s => s.canonical === canonical);
        if (!existingSkill) {
          extractedSkills.push({
            canonical,
            origin: rawSkill,
            offsetStart: 0, // Simplificado para este exemplo
            offsetEnd: rawSkill.length,
            confidence: 1.0
          });
        }
      }
    }
  }
  
  return extractedSkills;
}

// Extração de palavras-chave usando TF-IDF simplificado
export function extractTopKeywords(text: string, topN: number = 10): TopKeyword[] {
  // Tokenização
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  // Remover stopwords
  const filteredWords = removeStopwords(words, stopwordsPt);
  
  // Contar frequências
  const wordFreq = new Map<string, number>();
  for (const word of filteredWords) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  }
  
  // Calcular TF-IDF simplificado (apenas TF normalizado)
  const totalWords = filteredWords.length;
  const keywords: TopKeyword[] = [];
  
  for (const [term, freq] of wordFreq.entries()) {
    const tf = freq / totalWords;
    keywords.push({ term, weight: tf });
  }
  
  // Ordenar por peso e retornar top N
  return keywords
    .sort((a, b) => b.weight - a.weight)
    .slice(0, topN);
}

// Detectar informações específicas da vaga
export function extractJobInfo(text: string) {
  const info = {
    workModel: 'Não informado' as const,
    employmentType: 'Não informado' as const,
    salary: {
      min: null as number | null,
      max: null as number | null,
      currency: 'BRL',
      period: 'mensal' as const
    },
    location: 'Não informado',
    languages: ['pt-BR']
  };
  
  const lowerText = text.toLowerCase();
  
  // Modelo de trabalho
  if (/\b(remoto|home\s?office|trabalho\s?remoto)\b/i.test(text)) {
    info.workModel = 'Remoto';
  } else if (/\b(presencial|escritório|on-?site)\b/i.test(text)) {
    info.workModel = 'Presencial';
  } else if (/\b(híbrido|flexível|misto)\b/i.test(text)) {
    info.workModel = 'Híbrido';
  }
  
  // Regime de contratação
  if (/\bclt\b/i.test(text)) {
    info.employmentType = 'CLT';
  } else if (/\b(pj|pessoa\s?jurídica|freelancer)\b/i.test(text)) {
    info.employmentType = 'PJ';
  } else if (/\b(estágio|estagiário)\b/i.test(text)) {
    info.employmentType = 'Estágio';
  } else if (/\b(temporário|contrato\s?temporário)\b/i.test(text)) {
    info.employmentType = 'Temporário';
  }
  
  // Salário
  const salaryRegex = /r\$\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s?(?:a|até)?\s?r?\$?\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)?/gi;
  const salaryMatch = salaryRegex.exec(text);
  
  if (salaryMatch) {
    const parseValue = (str: string) => {
      return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    };
    
    info.salary.min = parseValue(salaryMatch[1]);
    if (salaryMatch[2]) {
      info.salary.max = parseValue(salaryMatch[2]);
    }
    
    // Detectar período
    if (/\b(anual|ano)\b/i.test(text)) {
      info.salary.period = 'anual';
    } else if (/\b(hora|horário)\b/i.test(text)) {
      info.salary.period = 'hora';
    }
  }
  
  // Localização
  const locationRegex = /(?:localização|local|cidade|região):\s*([^.\n]+)/i;
  const locationMatch = locationRegex.exec(text);
  if (locationMatch) {
    info.location = locationMatch[1].trim();
  } else {
    // Tentar detectar cidades conhecidas
    const cities = ['são paulo', 'rio de janeiro', 'belo horizonte', 'brasília', 'salvador', 'fortaleza', 'curitiba', 'recife', 'porto alegre'];
    for (const city of cities) {
      if (lowerText.includes(city)) {
        info.location = city.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        break;
      }
    }
  }
  
  // Idiomas
  if (/\b(inglês|english)\b/i.test(text)) {
    info.languages.push('en');
  }
  if (/\b(espanhol|spanish)\b/i.test(text)) {
    info.languages.push('es');
  }
  
  return info;
}

// Gerar alertas baseados na análise
export function generateAlerts(sections: JobSections | CVSections, info?: any): string[] {
  const alerts: string[] = [];
  
  if ('requirements_must' in sections) {
    // Alertas para vaga
    const jobSections = sections as JobSections;
    
    if (jobSections.responsibilities.length === 0) {
      alerts.push('Responsabilidades não identificadas claramente');
    }
    
    if (jobSections.requirements_must.length === 0) {
      alerts.push('Requisitos obrigatórios não especificados');
    }
    
    if (jobSections.benefits.length === 0) {
      alerts.push('Benefícios não informados');
    }
    
    if (info && info.salary.min === null) {
      alerts.push('Salário não informado');
    }
    
    if (info && info.workModel === 'Não informado') {
      alerts.push('Modelo de trabalho não especificado');
    }
  } else {
    // Alertas para CV
    const cvSections = sections as CVSections;
    
    if (cvSections.experience.length === 0) {
      alerts.push('Experiência profissional não identificada');
    }
    
    if (cvSections.skills.length === 0) {
      alerts.push('Habilidades técnicas não listadas claramente');
    }
    
    if (!cvSections.personal_info.email) {
      alerts.push('E-mail não encontrado');
    }
    
    if (!cvSections.personal_info.phone) {
      alerts.push('Telefone não encontrado');
    }
  }
  
  return alerts;
}

// Calcular compatibilidade entre vaga e CV
export function calculateCompatibility(
  jobSkills: { must: ExtractedSkill[]; nice: ExtractedSkill[] },
  cvSkills: ExtractedSkill[]
): {
  compatibility: number;
  matched: { must: string[]; nice: string[] };
  missing: { must: string[]; nice: string[] };
  extra: string[];
} {
  const cvSkillSet = new Set(cvSkills.map(s => s.canonical));
  const mustSkillSet = new Set(jobSkills.must.map(s => s.canonical));
  const niceSkillSet = new Set(jobSkills.nice.map(s => s.canonical));
  
  // Skills que batem
  const matchedMust = jobSkills.must.filter(s => cvSkillSet.has(s.canonical)).map(s => s.canonical);
  const matchedNice = jobSkills.nice.filter(s => cvSkillSet.has(s.canonical)).map(s => s.canonical);
  
  // Skills que faltam
  const missingMust = jobSkills.must.filter(s => !cvSkillSet.has(s.canonical)).map(s => s.canonical);
  const missingNice = jobSkills.nice.filter(s => !cvSkillSet.has(s.canonical)).map(s => s.canonical);
  
  // Skills extras do CV
  const allJobSkills = new Set([...mustSkillSet, ...niceSkillSet]);
  const extraSkills = cvSkills.filter(s => !allJobSkills.has(s.canonical)).map(s => s.canonical);
  
  // Cálculo de compatibilidade
  const wM = 0.6, wN = 0.3, wX = 0.1;
  
  const scoreM = mustSkillSet.size > 0 ? matchedMust.length / mustSkillSet.size : 0;
  const scoreN = niceSkillSet.size > 0 ? matchedNice.length / niceSkillSet.size : 0;
  const scoreX = Math.min(extraSkills.length, 10) / 10;
  
  const compatibility = Math.round(100 * (wM * scoreM + wN * scoreN + wX * scoreX));
  
  return {
    compatibility,
    matched: { must: matchedMust, nice: matchedNice },
    missing: { must: missingMust, nice: missingNice },
    extra: extraSkills.slice(0, 10) // Limitar extras
  };
}

// Estimar probabilidade ATS
export function estimateATSProbability(
  compatibility: number,
  cvSections: CVSections,
  alerts: string[]
): 'Baixa' | 'Média' | 'Alta' {
  let score = 0;
  
  // Compatibilidade base
  if (compatibility >= 80) score += 40;
  else if (compatibility >= 60) score += 25;
  else if (compatibility >= 40) score += 10;
  
  // Presença de seções importantes
  if (cvSections.experience.length > 0) score += 15;
  if (cvSections.skills.length > 0) score += 15;
  if (cvSections.education.length > 0) score += 10;
  if (cvSections.personal_info.email) score += 5;
  if (cvSections.personal_info.phone) score += 5;
  
  // Penalizar por alertas
  score -= alerts.length * 3;
  
  // Classificar
  if (score >= 70) return 'Alta';
  if (score >= 40) return 'Média';
  return 'Baixa';
}