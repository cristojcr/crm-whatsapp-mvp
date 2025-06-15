const { OpenAI } = require('openai');
const axios = require('axios');

// ===============================================
// CONFIGURAÇÃO OPENAI (COM FALLBACK)
// ===============================================
let openai = null;
try {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-exemplo-openai-key') {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI configurado com chave real');
  } else {
    // Criar instância mock para desenvolvimento
    openai = {
      chat: {
        completions: {
          create: async () => {
            throw new Error('OpenAI API key não configurada - usando modo desenvolvimento');
          }
        }
      }
    };
    console.log('⚠️ OpenAI em modo desenvolvimento (sem chave real)');
  }
} catch (error) {
  console.error('❌ Erro ao configurar OpenAI:', error.message);
  openai = null;
}

// ===============================================
// CONFIGURAÇÃO DEEPSEEK (COM FALLBACK)
// ===============================================
let deepseekClient = null;
try {
  if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'sk-exemplo-deepseek-key') {
    deepseekClient = axios.create({
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: parseInt(process.env.IA_TIMEOUT_MS) || 30000
    });
    console.log('✅ DeepSeek configurado com chave real');
  } else {
    // Criar instância mock para desenvolvimento
    deepseekClient = {
      post: async () => {
        throw new Error('DeepSeek API key não configurada - usando modo desenvolvimento');
      }
    };
    console.log('⚠️ DeepSeek em modo desenvolvimento (sem chave real)');
  }
} catch (error) {
  console.error('❌ Erro ao configurar DeepSeek:', error.message);
  deepseekClient = null;
}

// ===============================================
// CONFIGURAÇÃO DE CUSTOS
// ===============================================
const COSTS = {
  DEEPSEEK: {
    PER_1K_TOKENS: parseFloat(process.env.DEEPSEEK_COST_PER_1K_TOKENS) || 0.8,
    PROVIDER: 'deepseek'
  },
  OPENAI: {
    PER_1K_TOKENS: parseFloat(process.env.OPENAI_COST_PER_1K_TOKENS) || 60.0,
    PROVIDER: 'openai'
  }
};

// ===============================================
// CONFIGURAÇÃO DE CRÉDITOS
// ===============================================
const CREDITS = {
  INTENTION_ANALYSIS: parseInt(process.env.CREDITS_INTENTION_ANALYSIS) || 1,
  GENERAL_RESPONSE: parseInt(process.env.CREDITS_GENERAL_RESPONSE) || 1,
  SALES_RESPONSE: parseInt(process.env.CREDITS_SALES_RESPONSE) || 2,
  SCHEDULING: parseInt(process.env.CREDITS_SCHEDULING) || 2,
  EMOTION_ANALYSIS: parseInt(process.env.CREDITS_EMOTION_ANALYSIS) || 0.5
};

// ===============================================
// EXPORTAR CONFIGURAÇÕES
// ===============================================
module.exports = {
  openai,
  deepseekClient,
  COSTS,
  CREDITS,
  DEBUG: process.env.IA_DEBUG_MODE === 'true'
};