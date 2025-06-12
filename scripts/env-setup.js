#!/usr/bin/env node

/**
 * 🔧 Environment Setup Script
 * Helps validate and setup environment variables
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'JWT_SECRET'
];

function validateEnv(envFile = '.env.local') {
  console.log(`🔍 Validating ${envFile}...`);
  
  if (!fs.existsSync(envFile)) {
    console.error(`❌ ${envFile} not found!`);
    console.log(`💡 Copy .env.example to ${envFile} and configure it.`);
    return false;
  }

  const envContent = fs.readFileSync(envFile, 'utf8');
  const missing = [];

  REQUIRED_VARS.forEach(varName => {
    if (!envContent.includes(`${varName}=`) || 
        envContent.includes(`${varName}=your_`) ||
        envContent.includes(`${varName}=pendente`)) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    console.error(`❌ Missing or invalid variables:`);
    missing.forEach(varName => console.error(`   - ${varName}`));
    return false;
  }

  console.log(`✅ ${envFile} is properly configured!`);
  return true;
}

function generateJWTSecret() {
  return require('crypto').randomBytes(32).toString('hex');
}

function setupEnv() {
  console.log('🚀 Setting up environment...\n');

  if (!fs.existsSync('.env.local')) {
    console.log('📋 Creating .env.local from template...');
    fs.copyFileSync('.env.example', '.env.local');
    
    // Generate JWT secret
    const jwtSecret = generateJWTSecret();
    let content = fs.readFileSync('.env.local', 'utf8');
    content = content.replace('your_jwt_secret_minimum_32_characters', jwtSecret);
    fs.writeFileSync('.env.local', content);
    
    console.log('✅ .env.local created!');
    console.log('📝 Please edit .env.local with your real credentials.');
  } else {
    validateEnv();
  }
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'validate':
    validateEnv(process.argv[3] || '.env.local');
    break;
  case 'setup':
    setupEnv();
    break;
  case 'jwt':
    console.log('🔑 Generated JWT Secret:', generateJWTSecret());
    break;
  default:
    console.log(`
🔧 Environment Setup Tool

Usage:
  node scripts/env-setup.js setup     - Setup .env.local from template
  node scripts/env-setup.js validate  - Validate .env.local
  node scripts/env-setup.js jwt       - Generate JWT secret

Examples:
  node scripts/env-setup.js validate .env.staging
    `);
}