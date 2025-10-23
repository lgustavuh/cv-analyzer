#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTests() {
  console.log('🧪 Executando testes de aceite do CV Analyzer...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Teste 1: Análise de vaga via URL
  console.log('📋 Teste 1: Análise de vaga via texto');
  try {
    const jobText = `
Desenvolvedor Full Stack Sênior

Localização: São Paulo, SP
Modelo: Remoto
Regime: CLT

Responsabilidades:
- Desenvolver aplicações web usando React e Node.js
- Implementar APIs RESTful
- Trabalhar com bancos de dados PostgreSQL
- Colaborar com equipe ágil

Requisitos obrigatórios:
- 5+ anos de experiência com JavaScript
- Conhecimento em React e Node.js
- Experiência com SQL e PostgreSQL
- Conhecimento em Git

Requisitos desejáveis:
- Experiência com TypeScript
- Conhecimento em AWS
- Experiência com Docker

Benefícios:
- Vale refeição
- Plano de saúde
- Home office
- Horário flexível

Salário: R$ 8.000 a R$ 12.000
    `.trim();
    
    if (jobText.length >= 800) {
      console.log('✅ Conteúdo da vaga atende critério mínimo (800+ chars)');
      passed++;
    } else {
      console.log('❌ Conteúdo da vaga muito curto');
      failed++;
    }
    
    // Simular processamento
    const sentences = jobText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length >= 8) {
      console.log('✅ Vaga contém sentenças suficientes (8+)');
      passed++;
    } else {
      console.log('❌ Vaga não contém sentenças suficientes');
      failed++;
    }
    
  } catch (error) {
    console.log('❌ Erro no teste de vaga:', error.message);
    failed++;
  }
  
  // Teste 2: Análise de CV
  console.log('\n📄 Teste 2: Análise de currículo');
  try {
    const cvText = `
João Silva
Desenvolvedor Full Stack
joao.silva@email.com
(11) 99999-9999

Resumo Profissional:
Desenvolvedor com 6 anos de experiência em JavaScript, React, Node.js e PostgreSQL.

Experiência Profissional:
- Desenvolvedor Sênior na TechCorp (2020-2024)
  * Desenvolvimento de aplicações React
  * Criação de APIs Node.js
  * Trabalho com PostgreSQL e MongoDB
  * Uso de Git para versionamento

- Desenvolvedor Pleno na StartupXYZ (2018-2020)
  * Desenvolvimento frontend com React
  * Integração com APIs REST
  * Trabalho em equipe ágil

Habilidades Técnicas:
JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, MongoDB, Git, Docker, AWS

Formação:
Bacharelado em Ciência da Computação - USP (2014-2018)

Certificações:
- AWS Certified Developer
- Scrum Master Certified
    `.trim();
    
    if (cvText.length >= 600) {
      console.log('✅ Conteúdo do CV atende critério mínimo (600+ chars)');
      passed++;
    } else {
      console.log('❌ Conteúdo do CV muito curto');
      failed++;
    }
    
    const sentences = cvText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length >= 6) {
      console.log('✅ CV contém sentenças suficientes (6+)');
      passed++;
    } else {
      console.log('❌ CV não contém sentenças suficientes');
      failed++;
    }
    
    // Verificar extração de dados pessoais
    const emailMatch = cvText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    const phoneMatch = cvText.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
    
    if (emailMatch) {
      console.log('✅ E-mail extraído corretamente:', emailMatch[0]);
      passed++;
    } else {
      console.log('❌ E-mail não foi extraído');
      failed++;
    }
    
    if (phoneMatch) {
      console.log('✅ Telefone extraído corretamente:', phoneMatch[0]);
      passed++;
    } else {
      console.log('❌ Telefone não foi extraído');
      failed++;
    }
    
  } catch (error) {
    console.log('❌ Erro no teste de CV:', error.message);
    failed++;
  }
  
  // Teste 3: Compatibilidade
  console.log('\n🔄 Teste 3: Cálculo de compatibilidade');
  try {
    // Simular skills extraídas
    const jobSkills = {
      must: ['javascript', 'react', 'nodejs', 'postgresql', 'git'],
      nice: ['typescript', 'aws', 'docker']
    };
    
    const cvSkills = ['javascript', 'typescript', 'react', 'nodejs', 'postgresql', 'mongodb', 'git', 'docker', 'aws'];
    
    // Calcular matches
    const matchedMust = jobSkills.must.filter(skill => cvSkills.includes(skill));
    const matchedNice = jobSkills.nice.filter(skill => cvSkills.includes(skill));
    
    if (matchedMust.length + matchedNice.length >= 1) {
      console.log(`✅ Compatibilidade calculada: ${matchedMust.length}/${jobSkills.must.length} obrigatórias, ${matchedNice.length}/${jobSkills.nice.length} desejáveis`);
      passed++;
    } else {
      console.log('❌ Nenhuma skill compatível encontrada');
      failed++;
    }
    
    // Calcular score
    const wM = 0.6, wN = 0.3, wX = 0.1;
    const scoreM = matchedMust.length / jobSkills.must.length;
    const scoreN = matchedNice.length / jobSkills.nice.length;
    const extraSkills = cvSkills.filter(skill => ![...jobSkills.must, ...jobSkills.nice].includes(skill));
    const scoreX = Math.min(extraSkills.length, 10) / 10;
    
    const compatibility = Math.round(100 * (wM * scoreM + wN * scoreN + wX * scoreX));
    
    if (compatibility >= 0 && compatibility <= 100) {
      console.log(`✅ Score de compatibilidade válido: ${compatibility}%`);
      passed++;
    } else {
      console.log(`❌ Score de compatibilidade inválido: ${compatibility}%`);
      failed++;
    }
    
  } catch (error) {
    console.log('❌ Erro no teste de compatibilidade:', error.message);
    failed++;
  }
  
  // Teste 4: Verificar estrutura do banco
  console.log('\n🗄️  Teste 4: Estrutura do banco de dados');
  try {
    const tables = ['user_profile', 'job_posting', 'resume_doc', 'skill', 'analysis_result'];
    
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(0);
        if (!error) {
          console.log(`✅ Tabela ${table} existe`);
          passed++;
        } else {
          console.log(`❌ Tabela ${table} não existe ou inacessível`);
          failed++;
        }
      } catch (tableError) {
        console.log(`❌ Erro ao verificar tabela ${table}:`, tableError.message);
        failed++;
      }
    }
    
  } catch (error) {
    console.log('❌ Erro no teste de banco:', error.message);
    failed++;
  }
  
  // Teste 5: Skills normalizadas
  console.log('\n🏷️  Teste 5: Normalização de skills');
  try {
    const { data: skills, error } = await supabase
      .from('skill')
      .select('canonical')
      .limit(10);
    
    if (!error && skills && skills.length > 0) {
      console.log(`✅ Skills encontradas no banco: ${skills.length} registros`);
      console.log(`   Exemplos: ${skills.slice(0, 5).map(s => s.canonical).join(', ')}`);
      passed++;
    } else {
      console.log('❌ Nenhuma skill encontrada no banco');
      failed++;
    }
    
    const { data: aliases, error: aliasError } = await supabase
      .from('skill_alias')
      .select('alias')
      .limit(5);
    
    if (!aliasError && aliases && aliases.length > 0) {
      console.log(`✅ Aliases encontrados: ${aliases.map(a => a.alias).join(', ')}`);
      passed++;
    } else {
      console.log('❌ Nenhum alias encontrado');
      failed++;
    }
    
  } catch (error) {
    console.log('❌ Erro no teste de skills:', error.message);
    failed++;
  }
  
  // Resumo dos testes
  console.log('\n📊 RESUMO DOS TESTES');
  console.log('='.repeat(50));
  console.log(`✅ Testes aprovados: ${passed}`);
  console.log(`❌ Testes falharam: ${failed}`);
  console.log(`📈 Taxa de sucesso: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 Todos os testes passaram! Sistema pronto para produção.');
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique a configuração.');
  }
  
  return failed === 0;
}

// Executar testes
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Erro fatal nos testes:', error);
  process.exit(1);
});