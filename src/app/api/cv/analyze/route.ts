import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  processText, 
  validateMinimumContent, 
  extractCVSections, 
  extractTopKeywords, 
  generateAlerts,
  normalizeSkills
} from '@/lib/nlp-utils';
import { processDocument, validateFile } from '@/lib/document-processor';

export async function POST(request: NextRequest) {
  try {
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
    
    // Processar multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({
        error: 'INVALID_INPUT: Arquivo obrigatório'
      }, { status: 400 });
    }
    
    // Converter para buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Validar arquivo
    const validation = validateFile(buffer, file.name);
    if (!validation.valid) {
      return NextResponse.json({
        error: validation.error
      }, { status: 422 });
    }
    
    // Processar documento
    const processingResult = await processDocument(buffer, validation.mimeType!);
    if (!processingResult.success) {
      return NextResponse.json({
        error: processingResult.error,
        meta: {
          fileName: file.name,
          fileSize: file.size,
          status: 'error'
        }
      }, { status: 422 });
    }
    
    const rawText = processingResult.text!;
    
    // Processar texto
    const processed = processText(rawText);
    
    // Extrair seções do CV
    const sections = extractCVSections(processed.cleanText);
    
    // Extrair palavras-chave
    const topKeywords = extractTopKeywords(processed.cleanText, 10);
    
    // Gerar alertas
    const alerts = generateAlerts(sections);
    
    // Normalizar skills
    const allSkillTexts = [
      ...sections.skills,
      ...sections.experience,
      ...sections.certifications
    ];
    
    const normalizedSkills = await normalizeSkills(allSkillTexts);
    
    // Salvar arquivo no Supabase Storage (opcional)
    let filePath: string | null = null;
    try {
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('uploads')
        .upload(fileName, buffer, {
          contentType: validation.mimeType,
          upsert: false
        });
      
      if (!uploadError) {
        filePath = uploadData.path;
      }
    } catch (uploadError) {
      console.warn('Erro ao fazer upload do arquivo:', uploadError);
      // Continuar sem salvar o arquivo
    }
    
    // Preparar dados para salvar no banco
    const resumeData = {
      user_id: user.id,
      file_name: file.name,
      file_size: file.size,
      mime_type: validation.mimeType!,
      file_path: filePath,
      raw_text: processed.cleanText,
      char_count: processed.charCount,
      hash_source: processed.hashSource,
      token_count: processed.tokenCount,
      sections: {
        skills: sections.skills,
        experience: sections.experience,
        certifications: sections.certifications,
        education: sections.education,
        personal_info: sections.personal_info,
        normalized_skills: normalizedSkills
      },
      analytics: {
        topKeywords,
        alerts,
        processing_metadata: processingResult.metadata
      },
      status: 'ok' as const
    };
    
    // Salvar no banco
    const { data: resumeDoc, error: insertError } = await supabaseAdmin
      .from('resume_doc')
      .insert(resumeData)
      .select()
      .single();
    
    if (insertError) {
      console.error('Erro ao salvar resume doc:', insertError);
      return NextResponse.json({
        error: 'DB_CONSTRAINT: Erro ao salvar análise do currículo'
      }, { status: 500 });
    }
    
    // Atualizar perfil do usuário automaticamente
    const profileUpdate = {
      name: sections.personal_info.name || user.user_metadata?.name || '',
      email: sections.personal_info.email || user.email || '',
      phone: sections.personal_info.phone || '',
      education: sections.education.join('; ') || '',
      extra_activities: sections.certifications.join('; ') || ''
    };
    
    await supabaseAdmin
      .from('user_profile')
      .upsert({
        id: user.id,
        ...profileUpdate
      });
    
    // Registrar evento
    await supabaseAdmin
      .from('events')
      .insert({
        user_id: user.id,
        event_type: 'CV_ANALYZED',
        payload_size: processed.charCount,
        processing_time_ms: Date.now() - Date.now(), // Simplificado
        metadata: {
          file_name: file.name,
          file_size: file.size,
          mime_type: validation.mimeType,
          hash_source: processed.hashSource,
          skills_found: normalizedSkills.length
        }
      });
    
    // Preparar resposta
    const response = {
      meta: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: validation.mimeType,
        language: processed.language,
        charCount: processed.charCount,
        status: 'ok' as const,
        hashSource: processed.hashSource,
        tokenCount: processed.tokenCount
      },
      candidate: {
        name: sections.personal_info.name,
        email: sections.personal_info.email,
        phone: sections.personal_info.phone,
        education: sections.education.join('; '),
        extraActivities: sections.certifications.join('; ')
      },
      sections: {
        skills: sections.skills,
        experience: sections.experience,
        certifications: sections.certifications
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
    console.error('Erro na análise de CV:', error);
    return NextResponse.json({
      error: 'INTERNAL_ERROR: Erro interno do servidor'
    }, { status: 500 });
  }
}