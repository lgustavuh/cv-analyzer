import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { job, cv, format } = body;
    
    if (!job || !cv || !format) {
      return NextResponse.json({
        error: 'INVALID_INPUT: Campos obrigatórios: job, cv, format ("docx" ou "pdf")'
      }, { status: 400 });
    }
    
    if (!['docx', 'pdf'].includes(format)) {
      return NextResponse.json({
        error: 'INVALID_INPUT: format deve ser "docx" ou "pdf"'
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
    
    // Gerar currículo otimizado
    const optimizedContent = generateOptimizedResume(job, cv);
    
    // Registrar evento de download
    await supabaseAdmin
      .from('events')
      .insert({
        user_id: user.id,
        event_type: format === 'docx' ? 'DOWNLOAD_DOCX' : 'DOWNLOAD_PDF',
        payload_size: optimizedContent.length,
        processing_time_ms: Date.now() - Date.now(), // Simplificado
        metadata: {
          format,
          job_title: job.job?.title || 'Vaga não identificada',
          candidate_name: cv.candidate?.name || 'Candidato'
        }
      });
    
    // Para este exemplo, retornaremos o conteúdo como texto
    // Em produção, você geraria um arquivo DOCX/PDF real
    const fileName = `curriculo_otimizado_${cv.candidate?.name?.replace(/\s+/g, '_') || 'candidato'}.${format}`;
    
    return new NextResponse(optimizedContent, {
      headers: {
        'Content-Type': format === 'docx' 
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': optimizedContent.length.toString()
      }
    });
    
  } catch (error) {
    console.error('Erro na otimização de CV:', error);
    return NextResponse.json({
      error: 'INTERNAL_ERROR: Erro interno do servidor'
    }, { status: 500 });
  }
}

function generateOptimizedResume(job: any, cv: any): string {
  const candidate = cv.candidate || {};
  const jobInfo = job.job || {};
  const jobSections = job.sections || {};
  const cvSections = cv.sections || {};
  
  // Extrair skills relevantes da vaga
  const relevantSkills = [
    ...(jobSections.requirements_must || []),
    ...(jobSections.requirements_nice || []),
    ...(jobSections.tools_tech || [])
  ].join(' ').toLowerCase();
  
  // Filtrar skills do CV que são relevantes para a vaga
  const candidateSkills = (cvSections.skills || []).filter((skill: string) => {
    return relevantSkills.includes(skill.toLowerCase()) || 
           skill.toLowerCase().split(' ').some((word: string) => relevantSkills.includes(word));
  });
  
  // Gerar resumo profissional orientado à vaga
  const professionalSummary = generateProfessionalSummary(jobInfo, candidate, candidateSkills);
  
  // Template de currículo otimizado para ATS
  const resumeContent = `
${candidate.name || 'Nome do Candidato'}

CONTATO
${candidate.email || 'email@exemplo.com'}
${candidate.phone || 'Telefone não informado'}

RESUMO PROFISSIONAL
${professionalSummary}

HABILIDADES TÉCNICAS
${candidateSkills.length > 0 ? candidateSkills.join(' • ') : 'Habilidades não especificadas'}

EXPERIÊNCIA PROFISSIONAL
${(cvSections.experience || ['Experiência não detalhada']).map((exp: string, index: number) => 
  `${index + 1}. ${exp}`
).join('\n')}

FORMAÇÃO ACADÊMICA
${candidate.education || 'Formação não informada'}

CERTIFICAÇÕES E CURSOS
${(cvSections.certifications || ['Certificações não informadas']).map((cert: string, index: number) => 
  `${index + 1}. ${cert}`
).join('\n')}

ATIVIDADES COMPLEMENTARES
${candidate.extraActivities || 'Atividades não informadas'}

---
Currículo otimizado para: ${jobInfo.title || 'Vaga específica'}
Gerado em: ${new Date().toLocaleDateString('pt-BR')}
  `.trim();
  
  return resumeContent;
}

function generateProfessionalSummary(jobInfo: any, candidate: any, skills: string[]): string {
  const jobTitle = jobInfo.title || 'profissional';
  const topSkills = skills.slice(0, 5).join(', ');
  
  const templates = [
    `Profissional com experiência em ${topSkills}, buscando oportunidade como ${jobTitle}. Comprometido com resultados e desenvolvimento contínuo.`,
    `Especialista em ${topSkills} com foco em ${jobTitle}. Experiência comprovada em projetos desafiadores e trabalho em equipe.`,
    `Profissional qualificado em ${topSkills}, interessado na posição de ${jobTitle}. Orientado a resultados e inovação.`
  ];
  
  // Selecionar template baseado no hash do nome (para consistência)
  const templateIndex = (candidate.name || '').length % templates.length;
  return templates[templateIndex];
}