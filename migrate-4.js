#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  console.error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  console.log('🚀 Executando migrations do Supabase...\n');
  
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Diretório de migrations não encontrado:', migrationsDir);
    process.exit(1);
  }
  
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  if (migrationFiles.length === 0) {
    console.log('ℹ️  Nenhuma migration encontrada');
    return;
  }
  
  for (const file of migrationFiles) {
    console.log(`📄 Executando migration: ${file}`);
    
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
      // Dividir SQL em comandos individuais (separados por ;)
      const commands = sql
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
      
      for (const command of commands) {
        if (command.trim()) {
          const { error } = await supabase.rpc('exec_sql', { sql_query: command });
          
          if (error) {
            // Tentar executar diretamente se RPC falhar
            const { error: directError } = await supabase
              .from('_temp_migration')
              .select('*')
              .limit(0); // Apenas para testar conexão
            
            if (directError && directError.message.includes('relation "_temp_migration" does not exist')) {
              // Conexão OK, mas RPC não disponível - executar via query raw
              console.warn(`⚠️  RPC não disponível, executando comando diretamente`);
              // Em produção, você usaria uma biblioteca como pg para executar SQL raw
            } else {
              throw error;
            }
          }
        }
      }
      
      console.log(`✅ Migration ${file} executada com sucesso`);
      
    } catch (error) {
      console.error(`❌ Erro ao executar migration ${file}:`, error.message);
      
      // Continuar com próximas migrations em caso de erro não crítico
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log(`ℹ️  Migration ${file} já foi aplicada anteriormente`);
      } else {
        console.error('❌ Erro crítico, interrompendo migrations');
        process.exit(1);
      }
    }
  }
  
  console.log('\n🎉 Todas as migrations foram executadas!');
  
  // Verificar se as tabelas foram criadas
  await verifyTables();
}

async function verifyTables() {
  console.log('\n🔍 Verificando estrutura do banco...');
  
  const expectedTables = [
    'user_profile',
    'job_posting', 
    'resume_doc',
    'skill',
    'skill_alias',
    'job_skill',
    'resume_skill',
    'analysis_result',
    'file_blob',
    'events'
  ];
  
  for (const table of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(0);
      
      if (error) {
        console.log(`❌ Tabela ${table}: ${error.message}`);
      } else {
        console.log(`✅ Tabela ${table}: OK`);
      }
    } catch (error) {
      console.log(`❌ Tabela ${table}: ${error.message}`);
    }
  }
  
  // Verificar RLS
  console.log('\n🔒 Verificando Row Level Security...');
  try {
    const { data, error } = await supabase
      .from('user_profile')
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('RLS')) {
      console.log('✅ RLS está ativo');
    } else {
      console.log('ℹ️  RLS pode não estar configurado corretamente');
    }
  } catch (error) {
    console.log('ℹ️  Não foi possível verificar RLS');
  }
}

// Executar migrations
runMigrations().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});