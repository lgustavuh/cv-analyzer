import { JobAnalysis, CVAnalysis, MatchResult } from './types';

// Simulação das funcionalidades de NLP e análise
// Em produção, essas funções fariam chamadas para o backend

export const skillsNormalization: Record<string, string> = {
  'js': 'javascript',
  'node': 'javascript',
  'nodejs': 'javascript',
  'ecmascript': 'javascript',
  'ms office': 'excel',
  'microsoft office': 'excel',
  'postgre': 'postgresql',
  'postgres': 'postgresql',
  'power bi': 'power_bi',
  'powerbi': 'power_bi',
  'react.js': 'react',
  'reactjs': 'react',
  'vue.js': 'vue',
  'vuejs': 'vue',
  'angular.js': 'angular',
  'angularjs': 'angular',
  'c#': 'csharp',
  'c sharp': 'csharp',
  '.net': 'dotnet',
  'dot net': 'dotnet',
};

export const techSkills = [
  'javascript', 'python', 'java', 'csharp', 'php', 'ruby', 'go', 'rust',
  'react', 'vue', 'angular', 'svelte', 'nodejs', 'express', 'fastify',
  'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
  'git', 'github', 'gitlab', 'jenkins', 'circleci', 'github-actions',
  'linux', 'windows', 'macos', 'bash', 'powershell',
  'excel', 'power_bi', 'tableau', 'looker', 'qlik',
  'siem', 'edr', 'dlp', 'iso_27001', 'nist', 'gdpr',
  'agile', 'scrum', 'kanban', 'devops', 'ci_cd'
];

export function normalizeSkill(skill: string): string {
  const normalized = skill.toLowerCase().trim();
  return skillsNormalization[normalized] || normalized;
}

export function extractSkillsFromText(text: string): string[] {
  const words = text.toLowerCase().match(/\b\w+(?:\s+\w+)*\b/g) || [];
  const skills = new Set<string>();
  
  // Buscar skills conhecidas no texto
  techSkills.forEach(skill => {
    const regex = new RegExp(`\\b${skill.replace('_', '\\s*')}\\b`, 'i');
    if (regex.test(text)) {
      skills.add(skill);
    }
  });
  
  // Normalizar skills encontradas
  words.forEach(word => {
    const normalized = normalizeSkill(word);
    if (techSkills.includes(normalized)) {
      skills.add(normalized);
    }
  });
  
  return Array.from(skills);
}

export function calculateTFIDF(text: string): Array<{ term: string; weight: number }> {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const wordCount: Record<string, number> = {};
  
  // Stopwords em português
  const stopwords = new Set([
    'a', 'o', 'e', 'de', 'do', 'da', 'em', 'um', 'uma', 'com', 'para', 'por',
    'que', 'se', 'na', 'no', 'ou', 'ser', 'ter', 'como', 'mais', 'mas', 'já',
    'seu', 'sua', 'seus', 'suas', 'este', 'esta', 'estes', 'estas', 'esse',
    'essa', 'esses', 'essas', 'aquele', 'aquela', 'aqueles', 'aquelas'
  ]);
  
  words.forEach(word => {
    if (word.length > 2 && !stopwords.has(word)) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  const totalWords = words.length;
  const keywords = Object.entries(wordCount)
    .map(([term, count]) => ({
      term,
      weight: Math.round((count / totalWords) * 100) / 100
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);
  
  return keywords;
}

export async function analyzeJobFromURL(url: string): Promise<JobAnalysis> {
  // Simulação de análise de vaga via URL
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    meta: {
      source: 'url',
      language: 'pt-BR',
      charCount: 1500,
      status: 'ok'
    },
    job: {
      title: 'Desenvolvedor Full Stack Sênior',
      location: 'São Paulo, SP',
      workModel: 'Híbrido',
      employmentType: 'CLT',
      education: 'Superior completo em Tecnologia',
      languages: ['pt-BR', 'en'],
      salary: {
        min: 8000,
        max: 12000,
        currency: 'BRL',
        period: 'mensal'
      }
    },
    sections: {
      responsibilities: [
        'Desenvolver aplicações web modernas',
        'Colaborar com equipes multidisciplinares',
        'Implementar testes automatizados',
        'Participar de code reviews'
      ],
      requirements_must: [
        'javascript', 'react', 'nodejs', 'sql', 'git'
      ],
      requirements_nice: [
        'typescript', 'aws', 'docker', 'python'
      ],
      benefits: [
        'Vale refeição',
        'Plano de saúde',
        'Home office flexível',
        'Auxílio educação'
      ],
      tools_tech: [
        'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'
      ]
    },
    analytics: {
      topKeywords: [
        { term: 'javascript', weight: 0.15 },
        { term: 'react', weight: 0.12 },
        { term: 'desenvolvimento', weight: 0.10 },
        { term: 'experiência', weight: 0.08 },
        { term: 'tecnologia', weight: 0.06 }
      ],
      alerts: []
    },
    raw: {
      cleanText: 'Desenvolvedor Full Stack Sênior - Vaga para profissional experiente...'
    }
  };
}

export async function analyzeJobFromText(text: string): Promise<JobAnalysis> {
  // Simulação de análise de vaga via texto
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const skills = extractSkillsFromText(text);
  const keywords = calculateTFIDF(text);
  const alerts: string[] = [];
  
  if (!text.includes('salário') && !text.includes('remuneração')) {
    alerts.push('Salário não informado');
  }
  
  if (text.length > 10000) {
    alerts.push('Texto muito longo');
  }
  
  return {
    meta: {
      source: 'text',
      language: 'pt-BR',
      charCount: text.length,
      status: 'ok'
    },
    job: {
      title: 'Vaga Analisada',
      location: 'Não informado',
      workModel: text.includes('remoto') ? 'Remoto' : 
                 text.includes('híbrido') ? 'Híbrido' : 
                 text.includes('presencial') ? 'Presencial' : 'Não informado',
      employmentType: text.includes('CLT') ? 'CLT' :
                     text.includes('PJ') ? 'PJ' :
                     text.includes('estágio') ? 'Estágio' : 'Não informado',
      education: 'Não informado',
      languages: ['pt-BR'],
      salary: {
        min: null,
        max: null,
        currency: 'BRL',
        period: 'mensal'
      }
    },
    sections: {
      responsibilities: ['Responsabilidades extraídas do texto'],
      requirements_must: skills.slice(0, 5),
      requirements_nice: skills.slice(5, 10),
      benefits: ['Benefícios mencionados no texto'],
      tools_tech: skills
    },
    analytics: {
      topKeywords: keywords,
      alerts
    },
    raw: {
      cleanText: text
    }
  };
}

export async function analyzeCVFile(file: File): Promise<CVAnalysis> {
  // Simulação de análise de currículo
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    candidate: {
      name: 'João Silva',
      email: 'joao.silva@email.com',
      phone: '(11) 99999-9999',
      education: 'Bacharelado em Ciência da Computação',
      extraActivities: 'Cursos online, projetos pessoais'
    },
    sections: {
      skills: ['javascript', 'react', 'nodejs', 'python', 'sql', 'git'],
      experience: [
        'Desenvolvedor Full Stack - 3 anos',
        'Desenvolvedor Frontend - 2 anos'
      ],
      certifications: [
        'AWS Cloud Practitioner',
        'Scrum Master'
      ]
    },
    analytics: {
      topKeywords: [
        { term: 'javascript', weight: 0.18 },
        { term: 'react', weight: 0.15 },
        { term: 'desenvolvimento', weight: 0.12 }
      ],
      alerts: []
    }
  };
}

export function calculateCompatibility(job: JobAnalysis, cv: CVAnalysis): MatchResult {
  const jobMustSkills = new Set(job.sections.requirements_must);
  const jobNiceSkills = new Set(job.sections.requirements_nice);
  const cvSkills = new Set(cv.sections.skills);
  
  // Cálculo da compatibilidade
  const wM = 0.6, wN = 0.3, wX = 0.1;
  
  const matchedMust = Array.from(jobMustSkills).filter(skill => cvSkills.has(skill));
  const matchedNice = Array.from(jobNiceSkills).filter(skill => cvSkills.has(skill));
  
  const scoreM = jobMustSkills.size > 0 ? matchedMust.length / jobMustSkills.size : 0;
  const scoreN = jobNiceSkills.size > 0 ? matchedNice.length / jobNiceSkills.size : 0;
  
  const extraSkills = Array.from(cvSkills).filter(skill => 
    !jobMustSkills.has(skill) && !jobNiceSkills.has(skill)
  );
  const scoreX = Math.min(extraSkills.length, 10) / 10;
  
  const compatibility = Math.round(100 * (wM * scoreM + wN * scoreN + wX * scoreX));
  
  // Determinar probabilidade ATS
  let atsProbability: 'Baixa' | 'Média' | 'Alta' = 'Baixa';
  let rationale = '';
  
  if (compatibility >= 80) {
    atsProbability = 'Alta';
    rationale = `Excelente compatibilidade (${compatibility}%). Atende a maioria dos requisitos obrigatórios.`;
  } else if (compatibility >= 60) {
    atsProbability = 'Média';
    rationale = `Boa compatibilidade (${compatibility}%). Atende parte dos requisitos obrigatórios.`;
  } else {
    atsProbability = 'Baixa';
    rationale = `Compatibilidade limitada (${compatibility}%). Poucos requisitos obrigatórios atendidos.`;
  }
  
  return {
    compatibility,
    matched: {
      must: matchedMust,
      nice: matchedNice
    },
    missing: {
      must: Array.from(jobMustSkills).filter(skill => !cvSkills.has(skill)),
      nice: Array.from(jobNiceSkills).filter(skill => !cvSkills.has(skill))
    },
    atsProbability,
    rationale
  };
}

export function generateOptimizedCV(job: JobAnalysis, cv: CVAnalysis, format: 'docx' | 'pdf'): Blob {
  // Simulação de geração de currículo otimizado
  const content = `
CURRÍCULO OTIMIZADO PARA ATS

${cv.candidate.name}
${cv.candidate.email} | ${cv.candidate.phone}

RESUMO PROFISSIONAL
Profissional experiente em desenvolvimento de software com foco em ${job.job.title.toLowerCase()}.
Especialista em ${job.sections.requirements_must.slice(0, 3).join(', ')}.
Experiência comprovada em projetos de grande escala e metodologias ágeis.

EXPERIÊNCIA PROFISSIONAL
${cv.sections.experience.join('\n')}

EDUCAÇÃO
${cv.candidate.education}

HABILIDADES TÉCNICAS
${job.sections.requirements_must.concat(job.sections.requirements_nice).join(' • ')}

CERTIFICAÇÕES
${cv.sections.certifications.join('\n')}

ATIVIDADES COMPLEMENTARES
${cv.candidate.extraActivities}
  `;
  
  return new Blob([content], { 
    type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
}