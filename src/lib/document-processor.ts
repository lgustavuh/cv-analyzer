import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { processText, validateMinimumContent } from './nlp-utils';

// Interfaces para processamento
export interface DocumentProcessingResult {
  success: boolean;
  text?: string;
  error?: string;
  metadata?: {
    pages?: number;
    fileSize?: number;
    mimeType?: string;
  };
}

export interface URLFetchResult {
  success: boolean;
  text?: string;
  error?: string;
  metadata?: {
    url: string;
    statusCode?: number;
    contentType?: string;
    finalUrl?: string;
  };
}

// Configurações para fetch resiliente
const FETCH_CONFIG = {
  timeout: 10000,
  maxRetries: 1,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// Fetch resiliente com retry e timeout
export async function fetchURL(url: string): Promise<URLFetchResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= FETCH_CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_CONFIG.timeout);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': FETCH_CONFIG.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: controller.signal,
        redirect: 'follow',
        follow: 5
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      const extractedText = extractContentFromHTML(html);
      
      // Validar conteúdo mínimo
      const validation = validateMinimumContent(extractedText, 'job');
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          metadata: {
            url,
            statusCode: response.status,
            contentType: response.headers.get('content-type') || undefined,
            finalUrl: response.url
          }
        };
      }
      
      return {
        success: true,
        text: extractedText,
        metadata: {
          url,
          statusCode: response.status,
          contentType: response.headers.get('content-type') || undefined,
          finalUrl: response.url
        }
      };
      
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < FETCH_CONFIG.maxRetries) {
        // Backoff exponencial
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  return {
    success: false,
    error: `FETCH_FAILED: ${lastError?.message || 'Erro desconhecido'}. Verifique a URL ou cole a descrição completa da vaga.`,
    metadata: { url }
  };
}

// Extração de conteúdo de HTML usando heurísticas
function extractContentFromHTML(html: string): string {
  const $ = cheerio.load(html);
  
  // Remover elementos desnecessários
  $('script, style, nav, header, footer, aside, .menu, .navigation, .sidebar, .ads, .advertisement, .cookie, .popup').remove();
  
  // Tentar encontrar conteúdo principal
  let mainContent = '';
  
  // Prioridade 1: elementos semânticos
  const mainSelectors = ['main', 'article', '[role="main"]', '.main-content', '.content', '.job-description', '.vacancy'];
  
  for (const selector of mainSelectors) {
    const element = $(selector).first();
    if (element.length && element.text().trim().length > 500) {
      mainContent = element.text();
      break;
    }
  }
  
  // Prioridade 2: maior bloco de texto
  if (!mainContent) {
    let maxLength = 0;
    $('div, section, p').each((_, element) => {
      const text = $(element).text().trim();
      if (text.length > maxLength && text.length > 200) {
        maxLength = text.length;
        mainContent = text;
      }
    });
  }
  
  // Fallback: todo o body
  if (!mainContent) {
    mainContent = $('body').text();
  }
  
  // Limpeza final
  return mainContent
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

// Processamento de PDF
export async function processPDF(buffer: Buffer): Promise<DocumentProcessingResult> {
  try {
    const data = await pdfParse(buffer);
    
    if (!data.text || data.text.trim().length === 0) {
      return {
        success: false,
        error: 'PARSE_FAILED: PDF não contém texto legível. Envie um PDF com texto selecionável ou ative OCR.'
      };
    }
    
    // Validar conteúdo mínimo
    const validation = validateMinimumContent(data.text, 'cv');
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }
    
    return {
      success: true,
      text: data.text,
      metadata: {
        pages: data.numpages,
        fileSize: buffer.length,
        mimeType: 'application/pdf'
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: `PARSE_FAILED: Erro ao processar PDF - ${(error as Error).message}. Verifique se o arquivo não está corrompido.`
    };
  }
}

// Processamento de DOCX
export async function processDOCX(buffer: Buffer): Promise<DocumentProcessingResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    
    if (!result.value || result.value.trim().length === 0) {
      return {
        success: false,
        error: 'PARSE_FAILED: DOCX não contém texto legível. Verifique se o arquivo não está corrompido.'
      };
    }
    
    // Validar conteúdo mínimo
    const validation = validateMinimumContent(result.value, 'cv');
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }
    
    return {
      success: true,
      text: result.value,
      metadata: {
        fileSize: buffer.length,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: `PARSE_FAILED: Erro ao processar DOCX - ${(error as Error).message}. Verifique se o arquivo não está corrompido.`
    };
  }
}

// Processamento de DOC (Word 97-2003)
export async function processDOC(buffer: Buffer): Promise<DocumentProcessingResult> {
  try {
    // Para arquivos DOC antigos, mammoth também funciona
    const result = await mammoth.extractRawText({ buffer });
    
    if (!result.value || result.value.trim().length === 0) {
      return {
        success: false,
        error: 'PARSE_FAILED: DOC não contém texto legível. Tente converter para PDF ou DOCX.'
      };
    }
    
    // Validar conteúdo mínimo
    const validation = validateMinimumContent(result.value, 'cv');
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }
    
    return {
      success: true,
      text: result.value,
      metadata: {
        fileSize: buffer.length,
        mimeType: 'application/msword'
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: `PARSE_FAILED: Erro ao processar DOC - ${(error as Error).message}. Tente converter para PDF ou DOCX.`
    };
  }
}

// Processamento genérico de arquivo baseado no MIME type
export async function processDocument(buffer: Buffer, mimeType: string): Promise<DocumentProcessingResult> {
  switch (mimeType) {
    case 'application/pdf':
      return processPDF(buffer);
      
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return processDOCX(buffer);
      
    case 'application/msword':
      return processDOC(buffer);
      
    default:
      return {
        success: false,
        error: `PARSE_FAILED: Tipo de arquivo não suportado (${mimeType}). Envie PDF, DOC ou DOCX.`
      };
  }
}

// Validação de arquivo
export function validateFile(buffer: Buffer, filename: string): { valid: boolean; error?: string; mimeType?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (buffer.length > maxSize) {
    return {
      valid: false,
      error: `Arquivo muito grande (${Math.round(buffer.length / 1024 / 1024)}MB). Limite: 10MB.`
    };
  }
  
  // Detectar MIME type por assinatura de arquivo
  const signature = buffer.toString('hex', 0, 8).toUpperCase();
  let mimeType = '';
  
  if (signature.startsWith('25504446')) { // %PDF
    mimeType = 'application/pdf';
  } else if (signature.startsWith('504B0304')) { // PK.. (ZIP-based, inclui DOCX)
    // Verificar se é DOCX
    const zipContent = buffer.toString('utf8', 0, 1000);
    if (zipContent.includes('word/')) {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      return {
        valid: false,
        error: 'Arquivo ZIP detectado, mas não é um DOCX válido. Envie PDF, DOC ou DOCX.'
      };
    }
  } else if (signature.startsWith('D0CF11E0')) { // DOC
    mimeType = 'application/msword';
  } else {
    // Tentar por extensão como fallback
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.pdf':
        mimeType = 'application/pdf';
        break;
      case '.docx':
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case '.doc':
        mimeType = 'application/msword';
        break;
      default:
        return {
          valid: false,
          error: `Tipo de arquivo não suportado (${ext}). Envie PDF, DOC ou DOCX.`
        };
    }
  }
  
  return {
    valid: true,
    mimeType
  };
}

// Limpeza de texto para análise
export function cleanTextForAnalysis(text: string): string {
  return text
    // Normalizar espaços
    .replace(/\s+/g, ' ')
    // Remover caracteres especiais desnecessários
    .replace(/[^\w\s\-.,!?()]/g, ' ')
    // Normalizar quebras de linha
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

// Extração de metadados de texto
export function extractTextMetadata(text: string) {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    avgWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
    avgSentencesPerParagraph: paragraphs.length > 0 ? Math.round(sentences.length / paragraphs.length) : 0
  };
}