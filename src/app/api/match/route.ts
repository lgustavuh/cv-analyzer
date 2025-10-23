import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  calculateCompatibility, 
  estimateATSProbability,
  ExtractedSkill
} from '@/lib/nlp-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { job, cv } = body;
    
    if (!job || !cv) {
      return NextResponse.json({
        error: 'INVALID_INPUT: Campos obrigatórios: job e cv'
      }, { status: 400 });
    }
    
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'UNAUTHORIZED: Token de acesso necessário'
      }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({
        error: 'UNAUTHORIZED: Token inválido'
      }, { status: 401 });
    }
    
    // Extrair skills normalizadas dos dados
    const jobSkills = extractSkillsFromJob(job);
    const cvSkills = extractSkillsFromCV(cv);
    
    // Verificar se há skills suficientes para análise
    if (jobSkills.must.length === 0 && jobSkills.nice.length === 0) {
      return NextResponse.json({
        error: 'EMPTY_CONTENT: Vaga não contém requisitos técnicos identificáveis'
      }, { status: 422 });
    }
    
    if (cvSkills.length === 0) {
      return NextResponse.json({
        error: 'EMPTY_CONTENT: Currículo não contém habilidades técnicas identificáveis'
      }, { status: 422 });
    }
    
    // Calcular compatibilidade
    const compatibility = calculateCompatibility(jobSkills, cvSkills);
    
    // Estimar probabilidade ATS
    const cvSections = {
      skills: cv.sections?.skills || [],
      experience: cv.sections?.experience || [],
      certifications: cv.sections?.certifications || [],
      education: cv.sections?.education || [],
      personal_info: cv.candidate || { name: '', email: '', phone: '' }
    };
    
    const alerts = cv.analytics?.alerts || [];
    const atsProbability = estimateATSProbability(compatibility.compatibility, cvSections, alerts);
    
    // Gerar justificativa
    const rationale = generateRationale(compatibility, jobSkills, cvSkills, atsProbability);
    
    // Preparar resultado
    const matchResult = {
      compatibility: compatibility.compatibility,
      matched: compatibility.matched,
      missing: compatibility.missing,
      atsProbability,
      rationale,
      extra_skills: compatibility.extra
    };
    
    // Salvar resultado da análise no banco
    try {
      // Buscar IDs dos documentos mais recentes do usuário
      const { data: latestJob } = await supabaseAdmin
        .from('job_posting')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const { data: latestResume } = await supabaseAdmin
        .from('resume_doc')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (latestJob && latestResume) {
        await supabaseAdmin
          .from('analysis_result')
          .insert({
            user_id: user.id,
            job_posting_id: latestJob.id,
            resume_doc_id: latestResume.id,
            compatibility_score: compatibility.compatibility,
            ats_probability: atsProbability,
            rationale,
            matched_skills: {
              must: compatibility.matched.must,
              nice: compatibility.matched.nice
            },
            missing_skills: {
              must: compatibility.missing.must,
              nice: compatibility.missing.nice
            },
            extra_skills: compatibility.extra
          });
      }
    } catch (dbError) {
      console.warn('Erro ao salvar resultado da análise:', dbError);
      // Continuar sem salvar no banco
    }
    
    // Registrar evento
    await supabaseAdmin
      .from('events')
      .insert({
        user_id: user.id,
        event_type: 'MATCH_DONE',
        payload_size: JSON.stringify({ job, cv }).length,
        processing_time_ms: Date.now() - Date.now(), // Simplificado
        metadata: {
          compatibility_score: compatibility.compatibility,
          ats_probability: atsProbability,
          matched_must: compatibility.matched.must.length,
          matched_nice: compatibility.matched.nice.length,
          missing_must: compatibility.missing.must.length
        }
      });
    
    return NextResponse.json(matchResult);
    
  } catch (error) {
    console.error('Erro na comparação:', error);
    return NextResponse.json({
      error: 'INTERNAL_ERROR: Erro interno do servidor'
    }, { status: 500 });
  }
}

// Funções auxiliares
function extractSkillsFromJob(job: any): { must: ExtractedSkill[]; nice: ExtractedSkill[] } {
  const mustSkills: ExtractedSkill[] = [];
  const niceSkills: ExtractedSkill[] = [];
  
  // Extrair de sections.normalized_skills se disponível
  if (job.sections?.normalized_skills) {
    for (const skill of job.sections.normalized_skills) {
      const skillObj: ExtractedSkill = {
        canonical: skill.canonical,
        origin: skill.origin,
        offsetStart: skill.offsetStart || 0,
        offsetEnd: skill.offsetEnd || 0,
        confidence: skill.confidence || 1.0
      };
      
      // Determinar se é must ou nice baseado na origem
      const origin = skill.origin.toLowerCase();
      if (job.sections?.requirements_must?.some((req: string) => req.toLowerCase().includes(origin))) {
        mustSkills.push(skillObj);
      } else {
        niceSkills.push(skillObj);
      }
    }
  } else {
    // Fallback: extrair skills básicas dos textos
    const mustTexts = job.sections?.requirements_must || [];
    const niceTexts = job.sections?.requirements_nice || [];
    
    mustSkills.push(...extractBasicSkills(mustTexts));
    niceSkills.push(...extractBasicSkills(niceTexts));
  }
  
  return { must: mustSkills, nice: niceSkills };
}

function extractSkillsFromCV(cv: any): ExtractedSkill[] {
  const skills: ExtractedSkill[] = [];
  
  // Extrair de sections.normalized_skills se disponível
  if (cv.sections?.normalized_skills) {
    for (const skill of cv.sections.normalized_skills) {
      skills.push({
        canonical: skill.canonical,
        origin: skill.origin,
        offsetStart: skill.offsetStart || 0,
        offsetEnd: skill.offsetEnd || 0,
        confidence: skill.confidence || 1.0
      });
    }
  } else {
    // Fallback: extrair skills básicas dos textos
    const skillTexts = [
      ...(cv.sections?.skills || []),
      ...(cv.sections?.experience || []),
      ...(cv.sections?.certifications || [])
    ];
    
    skills.push(...extractBasicSkills(skillTexts));
  }
  
  return skills;
}

function extractBasicSkills(texts: string[]): ExtractedSkill[] {
  const skills: ExtractedSkill[] = [];
  const commonSkills = [
    'javascript', 'python', 'java', 'react', 'nodejs', 'sql', 'html', 'css',
    'aws', 'docker', 'kubernetes', 'git', 'linux', 'windows', 'excel', 'powerbi'
  ];
  
  for (const text of texts) {
    const lowerText = text.toLowerCase();
    for (const skill of commonSkills) {
      if (lowerText.includes(skill)) {
        skills.push({
          canonical: skill,
          origin: text,
          offsetStart: lowerText.indexOf(skill),
          offsetEnd: lowerText.indexOf(skill) + skill.length,
          confidence: 0.8
        });
      }
    }
  }
  
  return skills;
}

function generateRationale(
  compatibility: any,
  jobSkills: { must: ExtractedSkill[]; nice: ExtractedSkill[] },
  cvSkills: ExtractedSkill[],
  atsProbability: string
): string {
  const parts: string[] = [];
  
  // Análise de must-have
  if (jobSkills.must.length > 0) {
    const matchedMustCount = compatibility.matched.must.length;
    const totalMustCount = jobSkills.must.length;
    const mustPercentage = Math.round((matchedMustCount / totalMustCount) * 100);
    
    parts.push(`Atende ${matchedMustCount}/${totalMustCount} requisitos obrigatórios (${mustPercentage}%)`);
    
    if (compatibility.missing.must.length > 0) {
      const missingMust = compatibility.missing.must.slice(0, 3).join(', ');
      parts.push(`Principais gaps: ${missingMust}`);
    }
  }
  
  // Análise de nice-to-have
  if (jobSkills.nice.length > 0 && compatibility.matched.nice.length > 0) {
    parts.push(`${compatibility.matched.nice.length} diferenciais atendidos`);
  }
  
  // Skills extras
  if (compatibility.extra.length > 0) {
    const extraCount = Math.min(compatibility.extra.length, 5);
    parts.push(`${extraCount} habilidades adicionais relevantes`);
  }
  
  // Avaliação ATS
  const atsReasons = {
    'Alta': 'Perfil bem estruturado e alinhado',
    'Média': 'Perfil adequado com algumas melhorias possíveis',
    'Baixa': 'Perfil precisa de otimização para ATS'
  };
  
  parts.push(`Probabilidade ATS: ${atsReasons[atsProbability as keyof typeof atsReasons]}`);
  
  return parts.join('. ') + '.';
}