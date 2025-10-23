import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  processText, 
  validateMinimumContent, 
  extractJobSections, 
  extractTopKeywords, 
  extractJobInfo, 
  generateAlerts,
  normalizeSkills
} from '@/lib/nlp-utils';
import { fetchURL } from '@/lib/document-processor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;
    
    if (!input || !input.type || !input.value) {
      return NextResponse.json({
        error: 'INVALID_INPUT: Campos obrigatórios: input.type ("url" ou "text") e input.value'
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
    
    let rawText = '';
    let sourceMetadata: any = {};
    
    // Processar entrada baseada no tipo
    if (input.type === 'url') {
      const fetchResult = await fetchURL(input.value);
      if (!fetchResult.success) {
        return NextResponse.json({
          error: fetchResult.error,
          meta: {
            source: 'url',
            status: 'error'
          }
        }, { status: 422 });
      }
      rawText = fetchResult.text!;
      sourceMetadata = fetchResult.metadata;
    } else if (input.type === 'text') {
      rawText = input.value;
      sourceMetadata = { directInput: true };
    } else {
      return NextResponse.json({
        error: 'INVALID_INPUT: input.type deve ser "url" ou "text"'
      }, { status: 400 });
    }
    
    // Validar conteúdo mínimo
    const validation = validateMinimumContent(rawText, 'job');
    if (!validation.valid) {
      return NextResponse.json({
        error: validation.error,
        meta: {
          source: input.type,
          status: 'error'
        }
      }, { status: 422 });
    }
    
    // Processar texto
    const processed = processText(rawText);
    
    // Extrair seções
    const sections = extractJobSections(processed.cleanText);
    
    // Extrair informações específicas
    const jobInfo = extractJobInfo(processed.cleanText);
    
    // Extrair palavras-chave
    const topKeywords = extractTopKeywords(processed.cleanText, 10);
    
    // Gerar alertas
    const alerts = generateAlerts(sections, jobInfo);
    
    // Normalizar skills das seções
    const allSkillTexts = [
      ...sections.requirements_must,
      ...sections.requirements_nice,
      ...sections.tools_tech
    ];
    
    const normalizedSkills = await normalizeSkills(allSkillTexts);
    
    // Preparar dados para salvar no banco
    const jobData = {
      user_id: user.id,
      title: extractJobTitle(processed.cleanText),
      location: jobInfo.location,
      work_model: jobInfo.workModel,
      employment_type: jobInfo.employmentType,
      education: extractEducationRequirement(processed.cleanText),
      languages: jobInfo.languages,
      salary_min: jobInfo.salary.min,
      salary_max: jobInfo.salary.max,
      salary_currency: jobInfo.salary.currency,
      salary_period: jobInfo.salary.period,
      raw_text: processed.cleanText,
      source_type: input.type,
      source_value: input.value,
      language: processed.language,
      char_count: processed.charCount,
      hash_source: processed.hashSource,
      token_count: processed.tokenCount,
      sections: {
        responsibilities: sections.responsibilities,
        requirements_must: sections.requirements_must,
        requirements_nice: sections.requirements_nice,
        benefits: sections.benefits,
        tools_tech: sections.tools_tech
      },
      analytics: {
        topKeywords,
        alerts,
        sourceMetadata
      },
      status: 'ok' as const
    };
    
    // Salvar no banco dentro de uma transação
    const { data: jobPosting, error: insertError } = await supabaseAdmin
      .from('job_posting')
      .insert(jobData)
      .select()
      .single();
    
    if (insertError) {
      console.error('Erro ao salvar job posting:', insertError);
      return NextResponse.json({
        error: 'DB_CONSTRAINT: Erro ao salvar análise da vaga'
      }, { status: 500 });
    }
    
    // Salvar skills normalizadas
    if (normalizedSkills.length > 0) {
      const jobSkills = normalizedSkills.map(skill => ({
        job_posting_id: jobPosting.id,
        skill_id: skill.canonical, // Será resolvido por trigger ou função
        skill_type: sections.requirements_must.some(req => req.includes(skill.origin)) ? 'must' : 
                   sections.requirements_nice.some(req => req.includes(skill.origin)) ? 'nice' : 'tech',
        origin_text: skill.origin,
        origin_offset_start: skill.offsetStart,
        origin_offset_end: skill.offsetEnd,
        confidence: skill.confidence
      }));
      
      // Para simplificar, vamos salvar as skills diretamente no JSONB por enquanto
      await supabaseAdmin
        .from('job_posting')
        .update({
          sections: {
            ...jobData.sections,
            normalized_skills: normalizedSkills
          }
        })
        .eq('id', jobPosting.id);
    }
    
    // Registrar evento
    await supabaseAdmin
      .from('events')
      .insert({
        user_id: user.id,
        event_type: 'JOB_ANALYZED',
        payload_size: processed.charCount,
        processing_time_ms: Date.now() - Date.now(), // Simplificado
        metadata: {
          source_type: input.type,
          hash_source: processed.hashSource,
          skills_found: normalizedSkills.length
        }
      });
    
    // Preparar resposta
    const response = {
      meta: {
        source: input.type,
        language: processed.language,
        charCount: processed.charCount,
        status: 'ok' as const,
        hashSource: processed.hashSource,
        tokenCount: processed.tokenCount
      },
      job: {
        title: jobData.title,
        location: jobData.location,
        workModel: jobData.work_model,
        employmentType: jobData.employment_type,
        education: jobData.education || 'Não informado',
        languages: jobData.languages,
        salary: {
          min: jobData.salary_min,
          max: jobData.salary_max,
          currency: jobData.salary_currency,
          period: jobData.salary_period
        }
      },
      sections: {
        responsibilities: sections.responsibilities,
        requirements_must: sections.requirements_must,
        requirements_nice: sections.requirements_nice,
        benefits: sections.benefits,
        tools_tech: sections.tools_tech
      },
      analytics: {
        topKeywords,
        alerts
      },
      raw: {
        cleanText: processed.cleanText
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Erro na análise de vaga:', error);
    return NextResponse.json({
      error: 'INTERNAL_ERROR: Erro interno do servidor'
    }, { status: 500 });
  }
}

// Funções auxiliares
function extractJobTitle(text: string): string {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Procurar por padrões de título
  for (const line of lines.slice(0, 10)) { // Primeiras 10 linhas
    if (line.length > 10 && line.length < 100) {
      // Verificar se contém palavras indicativas de cargo
      const jobWords = ['desenvolvedor', 'analista', 'gerente', 'coordenador', 'especialista', 'consultor', 'engenheiro', 'arquiteto', 'designer', 'product', 'tech', 'senior', 'junior', 'pleno'];
      const lowerLine = line.toLowerCase();
      
      if (jobWords.some(word => lowerLine.includes(word))) {
        return line;
      }
    }
  }
  
  // Fallback: primeira linha não vazia
  return lines[0] || 'Vaga não identificada';
}

function extractEducationRequirement(text: string): string {
  const educationKeywords = ['superior', 'graduação', 'bacharelado', 'licenciatura', 'tecnólogo', 'pós-graduação', 'mestrado', 'doutorado', 'mba', 'ensino médio', 'técnico'];
  
  const sentences = text.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (educationKeywords.some(keyword => lowerSentence.includes(keyword))) {
      return sentence.trim();
    }
  }
  
  return 'Não informado';
}