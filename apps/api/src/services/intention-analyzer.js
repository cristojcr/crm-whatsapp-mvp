// ===============================================
// INTENTION ANALYZER - ANÁLISE DE INTENÇÃO COM IA
// ===============================================

const fetch = require('node-fetch');
const { supabase } = require('../config/supabase');

// ===============================================
// CONFIGURAÇÃO DEEPSEEK PARA ANÁLISE DE INTENÇÃO
// ===============================================
const DEEPSEEK_CONFIG = {
  API_URL: 'https://api.deepseek.com/chat/completions',
  API_KEY: process.env.DEEPSEEK_API_KEY,
  MODEL: 'deepseek-chat',
  TEMPERATURE: 0.1,
  MAX_TOKENS: 150
};

// ===============================================
// TIPOS DE INTENÇÃO SUPORTADOS
// ===============================================
const INTENTION_TYPES = {
  SCHEDULING: 'scheduling',
  RESCHEDULING: 'rescheduling',
  CANCELLATION: 'cancellation',
  INQUIRY: 'inquiry',
  GENERAL: 'general',
  COMPLAINT: 'complaint',
  GRATITUDE: 'gratitude',
  EMERGENCY: 'emergency'
};

const INTENTION_KEYWORDS = {
  scheduling: [
    'agendar', 'marcar', 'consulta', 'horário', 'appointment', 'schedule',
    'quero marcar', 'preciso agendar', 'disponibilidade', 'vaga',
    'atendimento', 'sessão', 'encontro', 'reunião'
  ],
  rescheduling: [
    'remarcar', 'mudar', 'alterar', 'transferir', 'adiar', 'trocar horário',
    'reschedule', 'change appointment', 'outro dia', 'outro horário',
    'não posso mais', 'impedimento', 'mudança de planos'
  ],
  cancellation: [
    'cancelar', 'desmarcar', 'cancel', 'não vou mais', 'não posso ir',
    'inviabilizou', 'problemas pessoais', 'não preciso mais',
    'mudou de ideia', 'desistir', 'anular'
  ],
  inquiry: [
    'quando', 'que horas', 'que dia', 'confirmação', 'lembrete',
    'tenho consulta', 'está marcado', 'meu agendamento',
    'próxima consulta', 'agenda', 'horário marcado'
  ]
};

// ===============================================
// FUNÇÃO PRINCIPAL: ANÁLISE DE INTENÇÃO
// ===============================================
async function analyze(messageContent) {
  try {
    if (!messageContent || typeof messageContent !== 'string') {
      return { intention: 'general', confidence: 0, provider: 'fallback' };
    }

    const prompt = `Analise esta mensagem e determine a intenção principal:

MENSAGEM: "${messageContent}"

INTENÇÕES POSSÍVEIS:
- scheduling: quer agendar algo
- rescheduling: quer remarcar algo já agendado  
- cancellation: quer cancelar algo agendado
- inquiry: pergunta sobre agendamentos existentes
- general: conversa geral, saudações, outras

RESPONDA EM JSON:
{
  "intention": "uma das opções acima",
  "confidence": 0.0-1.0,
  "reasoning": "breve explicação"
}`;

    const response = await fetch(DEEPSEEK_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_CONFIG.MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: DEEPSEEK_CONFIG.TEMPERATURE,
        max_tokens: DEEPSEEK_CONFIG.MAX_TOKENS
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Limpar possíveis markdown da resposta
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const result = JSON.parse(cleanContent);
    
    return {
      intention: result.intention || 'general',
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || 'Análise automática',
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

    return {
      ...bestMatch,
      provider: 'fallback',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Erro no fallback:', error);
    return {
      intention: 'general',
      confidence: 0,
      provider: 'fallback',
      timestamp: new Date().toISOString()
    };
  }
}

// ===============================================
// FUNÇÃO: ANÁLISE HÍBRIDA (IA + FALLBACK)
// ===============================================
async function analyzeHybrid(messageContent) {
  try {
    // Tentar primeiro com IA
    const aiResult = await analyze(messageContent);
    
    // Se confiança baixa, tentar fallback
    if (aiResult.confidence < 0.3) {
      const fallbackResult = analyzeFallback(messageContent);
      
      // Usar o resultado com maior confiança
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
// FUNÇÃO: DETECTAR MENÇÃO A SERVIÇOS
// ===============================================
function detectServiceMention(message, availableServices = []) {
  try {
    const messageLower = message.toLowerCase();
    
    if (!Array.isArray(availableServices)) return null;
    
    for (const service of availableServices) {
      const serviceName = service.name.toLowerCase();
      const words = serviceName.split(' ');
      
      // Verificar se todas as palavras do serviço estão na mensagem
      const allWordsFound = words.every(word => 
        messageLower.includes(word) || 
        messageLower.includes(word.substring(0, word.length - 1)) // plural/singular
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
// FUNÇÃO: EXTRAIR INFORMAÇÕES DE DATA/HORA
// ===============================================
function extractDateTime(message) {
  try {
    const patterns = {
      // Dias da semana
      weekdays: /\b(segunda|terça|quarta|quinta|sexta|sábado|domingo|seg|ter|qua|qui|sex|sáb|dom)\b/gi,
      // Períodos do dia  
      periods: /\b(manhã|tarde|noite|manha|de manhã|de tarde|a tarde|a noite)\b/gi,
      // Horários específicos
      times: /\b(\d{1,2}):?(\d{0,2})\s?(h|hs|horas?)?\b/gi,
      // Datas relativas
      relative: /\b(hoje|amanhã|depois de amanha|na proxima|próxima|semana que vem)\b/gi
    };

    const extracted = {};

    // Extrair padrões
    Object.keys(patterns).forEach(pattern => {
      const matches = message.match(patterns[pattern]);
      if (matches) {
        extracted[pattern] = matches;
      }
    });

    return extracted;
    
  } catch (error) {
    console.error('❌ Erro ao extrair data/hora:', error);
    return {};
  }
}

// ===============================================
// FUNÇÕES MULTI-PROFISSIONAL
// ===============================================

function extractProfessionalPreference(message) {
  const lowerMessage = message.toLowerCase();
  
  // Padrões para preferência específica
  const specificPatterns = [
    /(?:com|pelo|pela|dr|dra|doutor|doutora|profissional)\s+([a-záçãõéíóúêôâ\s]+)/i,
    /(?:quero|prefiro|gosto|sempre|só|somente)\s+(?:com|pelo|pela|dr|dra|doutor|doutora)\s+([a-záçãõéíóúêôâ\s]+)/i,
    /([a-záçãõéíóúêôâ\s]+)\s+(?:sempre|geralmente|normalmente|costuma|atende)/i
  ];

  // Padrões para especialidade
  const specialtyPatterns = [
    /(?:preciso|quero|busco)\s+(?:de|um|uma)?\s*(dentista|ortodontista|clínico|cardiologista|dermatologista|psicólogo|fisioterapeuta)/i,
    /(dentista|ortodontista|clínico|cardiologista|dermatologista|psicólogo|fisioterapeuta)/i
  ];

  // Padrões para urgência
  const urgencyPatterns = [
    /(?:urgente|emergência|o mais rápido|hoje mesmo|amanhã)/i,
    /(?:qualquer|tanto faz|qualquer um|quem estiver|disponível)/i
  ];

  // Verificar padrões específicos
  for (const pattern of specificPatterns) {
    const match = lowerMessage.match(pattern);
    if (match) {
      return {
        hasPreference: true,
        type: 'specific_professional',
        professionalName: cleanProfessionalName(match[1]),
        confidence: 0.8
      };
    }
  }

  // Verificar especialidade
  for (const pattern of specialtyPatterns) {
    const match = lowerMessage.match(pattern);
    if (match) {
      return {
        hasPreference: true,
        type: 'specialty',
        specialty: mapSpecialty(match[1]),
        confidence: 0.7
      };
    }
  }

  // Verificar urgência
  for (const pattern of urgencyPatterns) {
    const match = lowerMessage.match(pattern);
    if (match) {
      return {
        hasPreference: true,
        type: 'any_available',
        urgency: match[0].includes('urgente') || match[0].includes('emergência') ? 'high' : 'normal',
        confidence: 0.6
      };
    }
  }

  return {
    hasPreference: false,
    type: 'none',
    confidence: 0
  };
}

function cleanProfessionalName(name) {
  if (!name) return '';
  
  return name
    .trim()
    .replace(/\b(dr|dra|doutor|doutora|prof|professora|professor)\b\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapSpecialty(specialty) {
  const specialtyMap = {
    'dentista': 'odontologia',
    'ortodontista': 'ortodontia',
    'clínico': 'clínica geral',
    'cardiologista': 'cardiologia',
    'dermatologista': 'dermatologia',
    'psicólogo': 'psicologia',
    'fisioterapeuta': 'fisioterapia'
  };
  
  return specialtyMap[specialty.toLowerCase()] || specialty;
}

async function analyzeWithProfessionalPreference(message, contactId, userId) {
  try {
    console.log('🔍 Analisando com preferências profissionais...');
    
    // Análise básica da intenção
    const basicAnalysis = await analyze(message);
    
    // Verificar se é intenção de agendamento
    const isSchedulingIntent = ['scheduling', 'rescheduling', 'cancellation', 'inquiry', 'availability', 'confirmation'].includes(basicAnalysis.intention);
    
    if (!isSchedulingIntent) {
      return {
        ...basicAnalysis,
        isSchedulingIntent: false
      };
    }

    // Extrair preferências da mensagem
    const professionalPreference = extractProfessionalPreference(message);

    // Combinar análise com preferências
    const enrichedAnalysis = {
      ...basicAnalysis,
      isSchedulingIntent: true,
      professional_preference: {
        from_message: professionalPreference,
        from_history: null // Seria implementado com banco de dados
      },
      suggested_approach: determineSuggestedApproach(professionalPreference, null)
    };

    return enrichedAnalysis;

  } catch (error) {
    console.error('❌ Erro na análise com preferências:', error);
    return {
      isSchedulingIntent: false,
      error: error.message
    };
  }
}

function determineSuggestedApproach(messagePreference, clientHistory) {
  // Se cliente especificou um profissional na mensagem
  if (messagePreference.hasPreference && messagePreference.type === 'specific_professional') {
    return {
      approach: 'specific_professional',
      reason: 'Cliente especificou profissional na mensagem',
      action: 'find_professional_by_name',
      professional_name: messagePreference.professionalName
    };
  }

  // Se cliente pediu especialidade específica
  if (messagePreference.hasPreference && messagePreference.type === 'specialty') {
    return {
      approach: 'specialty_based',
      reason: 'Cliente precisa de especialidade específica',
      action: 'find_specialist',
      specialty: messagePreference.specialty
    };
  }

  // Se cliente quer qualquer um disponível
  if (messagePreference.hasPreference && messagePreference.type === 'any_available') {
    return {
      approach: 'availability_based',
      reason: 'Cliente quer próximo disponível',
      action: 'suggest_fastest_available',
      urgency: messagePreference.urgency
    };
  }

  // Padrão: sugerir baseado em disponibilidade
  return {
    approach: 'default_suggestion',
    reason: 'Nenhuma preferência específica detectada',
    action: 'suggest_best_available'
  };
}

// ===============================================
// NOVAS FUNÇÕES: REMARCAÇÃO AUTOMÁTICA
// ===============================================

// 🆕 FUNÇÃO: Buscar contexto histórico completo
async function getClientHistoricalContext(contactId, userId) {
  try {
    // Buscar agendamentos recentes
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_at,
        status,
        title,
        professionals(name, specialty)
      `)
      .eq('contact_id', contactId)
      .eq('user_id', userId)
      .gte('scheduled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // últimos 30 dias
      .order('scheduled_at', { ascending: false })
      .limit(5);

    // Buscar mensagens recentes
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('content, intention, created_at')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      appointments: appointments || [],
      messages: messages || [],
      hasHistory: (appointments?.length > 0) || (messages?.length > 0)
    };

  } catch (error) {
    console.error('❌ Erro buscando contexto histórico:', error);
    return { appointments: [], messages: [], hasHistory: false };
  }
}

// 🆕 FUNÇÃO: Formatar contexto para IA
function formatContextForAI(historicalContext, currentMessage) {
  let contextText = `MENSAGEM ATUAL: "${currentMessage}"\n\n`;
  
  if (historicalContext.hasHistory) {
    contextText += "CONTEXTO HISTÓRICO:\n";
    
    // Agendamentos recentes
    if (historicalContext.appointments.length > 0) {
      contextText += "AGENDAMENTOS RECENTES:\n";
      historicalContext.appointments.forEach((apt, index) => {
        const date = new Date(apt.scheduled_at).toLocaleDateString('pt-BR');
        const professional = apt.professionals?.name || 'N/A';
        contextText += `${index + 1}. ${date} - ${professional} (${apt.status})\n`;
      });
    }
    
    // Mensagens recentes
    if (historicalContext.messages.length > 0) {
      contextText += "\nMENSAGENS RECENTES:\n";
      historicalContext.messages.slice(0, 5).forEach((msg, index) => {
        contextText += `${index + 1}. ${msg.content} (${msg.intention || 'N/A'})\n`;
      });
    }
  }
  
  return contextText;
}

// 🆕 FUNÇÃO: Análise com contexto histórico
async function analyzeWithProfessionalPreferenceWithContext(message, contactId, userId) {
  try {
    console.log('🧠 Analisando com contexto histórico completo...');
    
    // Buscar contexto histórico
    const historicalContext = await getClientHistoricalContext(contactId, userId);
    
    // Formatar para IA
    const contextualPrompt = formatContextForAI(historicalContext, message);
    
    // Fazer análise com contexto
    const prompt = `${contextualPrompt}

Com base no contexto histórico e mensagem atual, analise a intenção:

INTENÇÕES POSSÍVEIS:
- scheduling: quer agendar algo novo
- rescheduling: quer remarcar agendamento existente  
- cancellation: quer cancelar agendamento existente
- inquiry: pergunta sobre agendamentos existentes
- general: conversa geral

RESPONDA EM JSON:
{
  "intention": "uma das opções acima",
  "confidence": 0.0-1.0,
  "reasoning": "explicação considerando histórico",
  "referenced_appointment": "se mencionou agendamento específico",
  "suggested_action": "ação recomendada"
}`;

    const response = await fetch(DEEPSEEK_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_CONFIG.MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleanContent);

    return {
        ...analysis,
        provider: 'deepseek-contextual',
        timestamp: new Date().toISOString(),
        historical_context: historicalContext,
        context_used: true
    };

    // Manter compatibilidade com código existente
    analysis.isSchedulingIntent = ['scheduling', 'rescheduling', 'cancellation', 'availability', 'confirmation'].includes(analysis.intention);
    analysis.contactId = contactId;
    analysis.companyId = userId;
    analysis.provider = 'deepseek';
    analysis.timestamp = new Date().toISOString();

    return analysis;

  } catch (error) {
    console.error('❌ Erro na análise com contexto:', error);
    
    // 🔄 FALLBACK: Usar função original se der erro
    return await analyzeWithProfessionalPreference(message, contactId, userId);
  }
}

// ===============================================
// EXPORTAR FUNÇÕES
// ===============================================
module.exports = {
  analyze,
  analyzeFallback,
  analyzeHybrid,
  detectServiceMention,                            // ✅ FUNÇÃO QUE ESTAVA FALTANDO
  extractDateTime,
  extractProfessionalPreference,
  cleanProfessionalName,
  mapSpecialty,
  analyzeWithProfessionalPreference,
  determineSuggestedApproach,
  getClientHistoricalContext,                      // 🆕 NOVA FUNÇÃO
  formatContextForAI,                              // 🆕 NOVA FUNÇÃO  
  analyzeWithProfessionalPreferenceWithContext,    // 🆕 NOVA FUNÇÃO
  INTENTION_TYPES,
  INTENTION_KEYWORDS
};