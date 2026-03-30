#!/usr/bin/env node

/**
 * 🧪 TESTE COMPLETO DO FLUXO DE LOGIN E CADASTRO
 * 
 * Uso:
 *   node server/test_auth_flow_debug.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const http = require('http');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(type, msg) {
  const timestamp = new Date().toLocaleTimeString();
  switch(type) {
    case 'success': console.log(`${colors.green}✅ [${timestamp}]${colors.reset} ${msg}`); break;
    case 'error': console.log(`${colors.red}❌ [${timestamp}]${colors.reset} ${msg}`); break;
    case 'warn': console.log(`${colors.yellow}⚠️  [${timestamp}]${colors.reset} ${msg}`); break;
    case 'info': console.log(`${colors.blue}ℹ️  [${timestamp}]${colors.reset} ${msg}`); break;
    case 'test': console.log(`${colors.cyan}🧪 [${timestamp}]${colors.reset} ${msg}`); break;
  }
}

let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0
};

async function testDatabaseConnection() {
  log('test', 'Testando conexão com Database...');
  
  try {
    const { db } = require('./src/config/db');
    const result = await db.execute('SELECT NOW()');
    log('success', 'Conexão com Database OK');
    testResults.passed++;
    return true;
  } catch (err) {
    log('error', `Falha na conexão com Database: ${err.message}`);
    if (err.message.includes('connect ECONNREFUSED')) {
      log('warn', 'Database não está acessível. Verificar DATABASE_URL.');
    }
    testResults.failed++;
    return false;
  }
}

async function testJWTSecret() {
  log('test', 'Verificando JWT_SECRET...');
  
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    log('error', 'JWT_SECRET não definido em .env');
    testResults.failed++;
    return false;
  }
  
  if (secret.length < 32) {
    log('warn', `JWT_SECRET é muito curto (${secret.length} chars, mínimo 32)`);
  }
  
  log('success', `JWT_SECRET definido (${secret.length} chars)`);
  testResults.passed++;
  return true;
}

async function testEnvironmentVariables() {
  log('test', 'Verificando variáveis de ambiente críticas...');
  
  const required = {
    'JWT_SECRET': process.env.JWT_SECRET,
    'DATABASE_URL': process.env.DATABASE_URL,
    'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID
  };
  
  let allPresent = true;
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      log('warn', `${key} não definido`);
      allPresent = false;
    } else {
      log('success', `${key} ✓`);
    }
  }
  
  if (allPresent) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  
  return allPresent;
}

async function testAPIEndpoint(method, endpoint, body = null) {
  return new Promise((resolve) => {
    const apiUrl = new URL(`http://localhost:3001/api${endpoint}`);
    
    const options = {
      hostname: apiUrl.hostname,
      port: apiUrl.port,
      path: apiUrl.pathname + apiUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json, error: null });
        } catch {
          resolve({ status: res.statusCode, body: data, error: 'Invalid JSON' });
        }
      });
    });
    
    req.on('error', (err) => {
      resolve({ status: 0, body: null, error: err.message });
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testAuthFlowMinimal() {
  log('test', 'Testando fluxo básico de autenticação...');
  
  const testEmail = `test_${Date.now()}@mwanga.test`;
  const testPassword = 'TestPassword123';
  
  // 1. Registar
  log('info', `Tentando registar com email: ${testEmail}`);
  const registerRes = await testAPIEndpoint('POST', '/auth/register', {
    name: 'Test User',
    email: testEmail,
    password: testPassword,
    householdName: 'Test Household'
  });
  
  if (registerRes.error) {
    log('error', `Falha ao registar: ${registerRes.error}`);
    testResults.failed++;
    return;
  }
  
  if (registerRes.status !== 201) {
    log('error', `Status inesperado no registro (esperado 201, recebido ${registerRes.status}): ${registerRes.body.error || 'Unknown error'}`);
    testResults.failed++;
    return;
  }
  
  log('success', 'Registro bem-sucedido');
  const registerToken = registerRes.body.token;
  
  // 2. Login
  log('info', 'Tentando fazer login...');
  const loginRes = await testAPIEndpoint('POST', '/auth/login', {
    email: testEmail,
    password: testPassword
  });
  
  if (loginRes.error) {
    log('error', `Falha ao fazer login: ${loginRes.error}`);
    testResults.failed++;
    return;
  }
  
  if (loginRes.status !== 200) {
    log('error', `Status inesperado no login (esperado 200, recebido ${loginRes.status}): ${loginRes.body.error || 'Unknown error'}`);
    testResults.failed++;
    return;
  }
  
  log('success', 'Login bem-sucedido');
  const loginToken = loginRes.body.token;
  
  // 3. Verificar /auth/me
  log('info', 'Verificando endpoint /auth/me...');
  
  const meRes = await new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginToken}`
      },
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), error: null });
        } catch {
          resolve({ status: res.statusCode, body: data, error: 'Invalid JSON' });
        }
      });
    });
    
    req.on('error', (err) => {
      resolve({ status: 0, body: null, error: err.message });
    });
    
    req.end();
  });
  
  if (meRes.error) {
    log('error', `Falha ao verificar /auth/me: ${meRes.error}`);
    testResults.failed++;
    return;
  }
  
  if (meRes.status !== 200) {
    log('error', `Status inesperado em /auth/me (esperado 200, recebido ${meRes.status})`);
    testResults.failed++;
    return;
  }
  
  log('success', 'Endpoint /auth/me funcionando');
  testResults.passed += 3;
}

async function runAllTests() {
  console.log('\n' + colors.cyan + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.cyan + '🧪 TESTE DO SISTEMA DE AUTENTICAÇÃO' + colors.reset);
  console.log(colors.cyan + '═══════════════════════════════════════' + colors.reset + '\n');
  
  // Verificações rápidas
  await testEnvironmentVariables();
  await testJWTSecret();
  await testDatabaseConnection();
  
  // Se BD está conectada, testar fluxo
  if (testResults.failed === 0) {
    log('info', 'Aguardando servidor em http://localhost:3001...');
    setTimeout(async () => {
      await testAuthFlowMinimal();
    }, 1000);
    
    setTimeout(() => {
      printSummary();
    }, 8000);
  } else {
    printSummary();
  }
}

function printSummary() {
  console.log('\n' + colors.cyan + '═══════════════════════════════════════' + colors.reset);
  console.log(colors.cyan + '📊 RESUMO' + colors.reset);
  console.log(colors.cyan + '═══════════════════════════════════════' + colors.reset);
  console.log(`${colors.green}✅ Testes passados: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Testes falhados: ${testResults.failed}${colors.reset}`);
  console.log(`${colors.yellow}⊘ Testes pulados: ${testResults.skipped}${colors.reset}\n`);
  
  if (testResults.failed === 0) {
    console.log(colors.green + '🎉 Tudo OK! Sistema pronto para usar.' + colors.reset + '\n');
  } else {
    console.log(colors.red + '⚠️  Corrigir erros acima antes de continuar.' + colors.reset + '\n');
  }
}

runAllTests().catch(err => {
  log('error', `Erro fatal: ${err.message}`);
  process.exit(1);
});
