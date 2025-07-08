// ===============================================
// INTENTION ANALYZER - VERSÃO LIMPA PARA DEPLOY
// ===============================================

// ===============================================
// CONFIGURAÇÃO DEEPSEEK
// ===============================================
const DEEPSEEK_CONFIG = {
  API_URL: 'https://api.deepseek.com/chat/completions',
  API_KEY: process.env.DEEPSEEK_API_KEY,
  MODEL: 'deepseek-chat',
  TEMPERATURE: 0.1,
  MAX_TOKENS: 200
};

// ===============================================
// TIPOS DE INTENÇÃO
// ===============================================
const INTENTION_TYPES = {
  SCHEDULING: 'scheduling',
  RESCHEDULING: 'rescheduling', 
  CANCELLATION: 'cancellation',
  INQUIRY: 'inquiry',
  GENERAL: 'general'
};

const INTENTION_KEYWORDS = {
  scheduling: ['agendar', 'marcar', 'consulta', 'horário', 'appointment'],
  rescheduling: ['remarcar', 'mudar', 'alterar', 'transferir', 'adiar'],
  cancellation: ['cancelar', 'desmarcar', 'cancel', 'não vou mais'],
  inquiry: ['quando', 'que horas', 'confirmação', 'tenho consulta']
};

// ===============================================
// FUNÇÃO: CONSTRUIR PROMPT COM CONTEXTO TEMPORAL
// ===============================================
function buildAnalysisPrompt(messageContent) {
  // 📅 DATA ATUAL EM BRASÍLIA
  const agora = new Date();
  const hoje = new Date(agora.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  
  const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  
  const dataAtual = `${diasSemana[hoje.getDay()]}, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
  
  console.log('📅 Data para IA:', dataAtual);
  
  return `CONTEXTO TEMPORAL: HOJE É ${dataAtual.toUpperCase()}
TIMEZONE: BRASÍLIA (GMT-3)

Analise a intenção desta mensagem:
MENSAGEM: "${messageContent}"

IMPORTANTE PARA AGENDAMENTOS:
- Se disser "amanhã": calcule ${hoje.getDate() + 1}/${hoje.getMonth() + 1}/${hoje.getFullYear()}
- Se disser "próxima sexta": calcule o PRÓXIMO dia da semana
- TODOS OS HORÁRIOS SÃO EM BRASÍLIA (GMT-3)

TIPOS DE INTENÇÃO:
- scheduling: quer agendar algo novo
- rescheduling: quer remarcar algo já agendado  
- cancellation: quer cancelar algo agendado
- inquiry: pergunta sobre agendamentos existentes
- general: conversa geral

RETORNE APENAS UM JSON (sem markdown, sem backticks):
{
  "intention": "tipo_de_intencao",
  "confidence": 0.95,
  "reasoning": "explicacao_breve",
  "dateTime": {
    "suggestedDate": "YYYY-MM-DD",
    "suggestedTime": "HH:MM",
    "hasDateReference": true,
    "hasTimeReference": true
  }
}

CALCULE AS DATAS CORRETAMENTE baseado em hoje ser ${dataAtual}!`;
}

// ===============================================
// FUNÇÃO PRINCIPAL: ANÁLISE DE INTENÇÃO
// ===============================================
async function analyze(messageContent, context = {}) {
  try {
    if (!messageContent || typeof messageContent !== 'string') {
      return { intention: 'general', confidence: 0, provider: 'fallback' };
    }

    console.log('🧠 Analisando intenção com DeepSeek:', messageContent);

    const prompt = buildAnalysisPrompt(messageContent);

    // ✅ USAR fetch NATIVO (disponível no Node.js 18+)
    const response = await fetch(DEEPSEEK_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_CONFIG.MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: DEEPSEEK_CONFIG.TEMPERATURE,
        max_tokens: DEEPSEEK_CONFIG.MAX_TOKENS
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // 🧹 LIMPAR MARKDOWN DA RESPOSTA
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log('🤖 Resposta da IA:', cleanContent);
    
    const result = JSON.parse(cleanContent);
    
    return {
      intention: result.intention || 'general',
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || 'Análise automática',
      dateTime: result.dateTime || null,
      provider: 'deepseek',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Erro na análise DeepSeek:', error);
    return analyzeFallback(messageContent);
  }
}

// ===============================================
// FUNÇÃO: ANÁLISE FALLBACK (SEM IA)
// ===============================================
function analyzeFallback(messageContent) {
  try {
    console.log('🔄 Usando análise fallback...');
    const content = messageContent.toLowerCase();
    let bestMatch = { intention: 'general', confidence: 0 };

    // Verificar cada tipo de intenção
    Object.keys(INTENTION_KEYWORDS).forEach(intention => {
      const keywords = INTENTION_KEYWORDS[intention];
      let matches = 0;
      
      keywords.forEach(keyword => {
        if (content.includes(keyword.toLowerCase())) {
          matches++;
        }
      });
      
      const confidence = matches / keywords.length;
      if (confidence > bestMatch.confidence) {
        bestMatch = { intention, confidence };
      }
    });

    // Se detectou agendamento, tentar extrair data/hora básica
    let dateTime = null;
    if (bestMatch.intention === 'scheduling') {
      dateTime = extractDateTime(messageContent);
    }

    return {
      ...bestMatch,
      dateTime: dateTime,
      provider: 'fallback',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Erro no fallback:', error);
    return {
      intention: 'general',
      confidence: 0,
      dateTime: null,
      provider: 'fallback',
      timestamp: new Date().toISOString()
    };
  }
}

// ===============================================
// FUNÇÃO: EXTRAIR DATA/HORA (SIMPLES)
// ===============================================
function extractDateTime(message) {
  try {
    console.log('🕐 Extraindo data/hora:', message);
    
    const now = new Date();
    const patterns = {
      tomorrow: /\b(amanhã|amanha)\b/gi,
      today: /\b(hoje)\b/gi,
      time: /\b(\d{1,2}):?(\d{0,2})\s?(h|hs|horas?)?\b/gi
    };
    
    let suggestedDate = null;
    let suggestedTime = null;
    
    // Detectar data
    if (patterns.tomorrow.test(message)) {
      suggestedDate = new Date(now);
      suggestedDate.setDate(now.getDate() + 1);
    } else if (patterns.today.test(message)) {
      suggestedDate = new Date(now);
    }
    
    // Detectar horário
    const timeMatch = message.match(patterns.time);
    if (timeMatch && timeMatch.length > 0) {
      const timeStr = timeMatch[0];
      const timeDigits = timeStr.match(/\d+/g);
      if (timeDigits && timeDigits.length > 0) {
        const hour = parseInt(timeDigits[0]);
        const minute = timeDigits.length > 1 ? parseInt(timeDigits[1]) : 0;
        
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          suggestedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }
      }
    }
    
    return {
      suggestedDate: suggestedDate ? suggestedDate.toISOString().split('T')[0] : null,
      suggestedTime: suggestedTime,
      hasDateReference: suggestedDate !== null,
      hasTimeReference: suggestedTime !== null
    };
    
  } catch (error) {
    console.error('❌ Erro ao extrair data/hora:', error);
    return {
      suggestedDate: null,
      suggestedTime: null,
      hasDateReference: false,
      hasTimeReference: false
    };
  }
}

// ===============================================
// FUNÇÃO: DETECTAR MENÇÃO A SERVIÇOS
// ===============================================
function detectServiceMention(message, availableServices = []) {
  try {
    const messageLower = message.toLowerCase();
    
    if (!Array.isArray(availableServices)) return null;
    
    for (const service of availableServices) {
      const serviceName = service.name.toLowerCase();
      const words = serviceName.split(' ');
      
      const allWordsFound = words.every(word => 
        messageLower.includes(word) || 
        messageLower.includes(word.substring(0, word.length - 1))
      );
      
      if (allWordsFound) {
        return {
          service: service,
          confidence: 0.9
        };
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Erro ao detectar serviço:', error);
    return null;
  }
}

// ===============================================
// FUNÇÃO: ANÁLISE COM PREFERÊNCIAS PROFISSIONAIS
// ===============================================
async function analyzeWithProfessionalPreference(message, contactId, companyId) {
  try {
    console.log('🔍 Analisando com preferências profissionais...');
    
    // Usar a função analyze que já tem contexto temporal correto
    const basicAnalysis = await analyze(message);
    
    // Se não é agendamento, retornar análise básica
    if (basicAnalysis.intention !== 'scheduling') {
      return basicAnalysis;
    }
    
    // ✅ PRESERVAR dateTime da IA
    let dateTime = basicAnalysis.dateTime;
    
    if (!dateTime || (!dateTime.suggestedDate && !dateTime.suggestedTime)) {
      console.log('⚠️ IA não retornou dateTime, extraindo localmente...');
      dateTime = extractDateTime(message);
    } else {
      console.log('✅ Usando dateTime da IA:', dateTime);
    }
    
    // Retornar análise enriquecida
    return {
      ...basicAnalysis,
      dateTime: dateTime,
      professionalPreference: null,
      contactId: contactId,
      companyId: companyId,
      isSchedulingIntent: true
    };
    
  } catch (error) {
    console.error('❌ Erro na análise com preferências:', error.message);
    return analyzeFallback(message);
  }
}

// ===============================================
// FUNÇÃO: ANÁLISE HÍBRIDA
// ===============================================
async function analyzeHybrid(messageContent, context = {}) {
  try {
    const aiResult = await analyze(messageContent, context);
    
    if (aiResult.confidence < 0.3) {
      const fallbackResult = analyzeFallback(messageContent);
      
      if (fallbackResult.confidence > aiResult.confidence) {
        return {
          ...fallbackResult,
          provider: 'hybrid-fallback',
          ai_result: aiResult
        };
      }
    }
    
    return {
      ...aiResult,
      provider: 'hybrid-ai'
    };
    
  } catch (error) {
    console.error('❌ Erro na análise híbrida:', error);
    return analyzeFallback(messageContent);
  }
}

// ===============================================
// EXPORTAR FUNÇÕES ESSENCIAIS
// ===============================================
module.exports = {
  analyze,
  analyzeFallback,
  analyzeHybrid,
  detectServiceMention,
  extractDateTime,
  analyzeWithProfessionalPreference,
  buildAnalysisPrompt,
  INTENTION_TYPES,
  INTENTION_KEYWORDS
};