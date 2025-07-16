const DEEPSEEK_CONFIG = {
  API_URL: 'https://api.deepseek.com/chat/completions',
  API_KEY: process.env.DEEPSEEK_API_KEY,
  MODEL: 'deepseek-chat',
  TEMPERATURE: 0.1,
  MAX_TOKENS: 300
};

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

function buildAnalysisPrompt(messageContent, context = {}) {
  const agora = new Date();
  const hoje = new Date(agora.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  
  const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  
  const dataAtual = `${diasSemana[hoje.getDay()]}, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
  
  console.log('📅 Data para IA:', dataAtual);
  
  let prompt = `CONTEXTO TEMPORAL: HOJE É ${dataAtual.toUpperCase()}
TIMEZONE: BRASÍLIA (GMT-3) - TODOS OS HORÁRIOS SÃO NO FUSO HORÁRIO DO BRASIL!

Analise a intenção desta mensagem:
MENSAGEM: "${messageContent}"

IMPORTANTE PARA AGENDAMENTOS:
- Se disser "amanhã": calcule ${hoje.getDate() + 1}/${hoje.getMonth() + 1}/${hoje.getFullYear()}
- Se disser "próxima segunda/terça/quarta/quinta/sexta/sábado/domingo": calcule o PRÓXIMO dia da semana mencionado
- TODOS OS HORÁRIOS SÃO EM BRASÍLIA (GMT-3)

TIPOS DE INTENÇÃO:
- scheduling: quer agendar algo novo
- rescheduling: quer remarcar algo já agendado  
- cancellation: quer cancelar algo agendado
- inquiry: pergunta sobre agendamentos existentes
- general: conversa geral, saudações, outras`;

  if (context.previousMessages && context.previousMessages.length > 0) {
    prompt += `\n\nCONTEXTO ANTERIOR:\n`;
    context.previousMessages.forEach((msg, index) => {
      prompt += `${index + 1}. ${msg}\n`;
    });
  }

  prompt += `

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

  return prompt;
}

async function analyze(messageContent, context = {}) {
  try {
    if (!messageContent || typeof messageContent !== 'string') {
      return { intention: 'general', confidence: 0, provider: 'fallback' };
    }

    console.log('🧠 Analisando intenção com DeepSeek:', messageContent);
    const prompt = buildAnalysisPrompt(messageContent, context);

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

function analyzeFallback(messageContent) {
  try {
    console.log('🔄 Usando análise fallback...');
    const content = messageContent.toLowerCase();
    let bestMatch = { intention: 'general', confidence: 0 };

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

function extractDateTime(message) {
  try {
    console.log('🕐 Extraindo data/hora:', message);
    
    const now = new Date();
    const patterns = {
      tomorrow: /\b(amanhã|amanha)\b/gi,
      today: /\b(hoje)\b/gi,
      weekday: /\b(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)\b/gi,
      time: /\b(\d{1,2})[h:.]?(\d{0,2})\s?(h|hs|horas?)?\b/gi,
      specificDate: /\b(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?\b/gi
    };
    
    let suggestedDate = null;
    let suggestedTime = null;
    
    // Extrair data
    if (patterns.tomorrow.test(message)) {
      suggestedDate = new Date(now);
      suggestedDate.setDate(now.getDate() + 1);
    } else if (patterns.today.test(message)) {
      suggestedDate = new Date(now);
    } else {
      // Verificar dia da semana
      const weekdayMatch = message.match(patterns.weekday);
      if (weekdayMatch && weekdayMatch.length > 0) {
        const weekday = weekdayMatch[0].toLowerCase();
        const weekdayMap = {
          'domingo': 0, 'segunda': 1, 'terça': 2, 'terca': 2, 
          'quarta': 3, 'quinta': 4, 'sexta': 5, 
          'sábado': 6, 'sabado': 6
        };
        
        if (weekdayMap[weekday] !== undefined) {
          suggestedDate = new Date(now);
          const currentDay = suggestedDate.getDay();
          const targetDay = weekdayMap[weekday];
          const daysToAdd = (targetDay + 7 - currentDay) % 7;
          
          // Se hoje for o dia mencionado e ainda não passou, use hoje
          if (daysToAdd === 0 && now.getHours() < 18) {
            // Não adiciona dias
          } else if (daysToAdd === 0) {
            // Se hoje for o dia mencionado mas já passou, use próxima semana
            suggestedDate.setDate(suggestedDate.getDate() + 7);
          } else {
            // Caso contrário, avance para o próximo dia da semana correspondente
            suggestedDate.setDate(suggestedDate.getDate() + daysToAdd);
          }
        }
      } else {
        // Verificar data específica (DD/MM/YYYY ou DD/MM)
        const dateMatch = message.match(patterns.specificDate);
        if (dateMatch && dateMatch.length > 0) {
          const dateParts = dateMatch[0].split(/[\/\-\.]/);
          const day = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1; // Mês em JavaScript é 0-indexed
          const year = dateParts.length > 2 ? parseInt(dateParts[2]) : now.getFullYear();
          
          // Ajustar ano se for fornecido como 2 dígitos
          const adjustedYear = year < 100 ? 2000 + year : year;
          
          if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
            suggestedDate = new Date(adjustedYear, month, day);
          }
        }
      }
    }
    
    // Se não conseguiu extrair uma data, use a data atual
    if (!suggestedDate) {
      suggestedDate = new Date(now);
    }
    
    // Extrair hora
    const timeMatch = message.match(patterns.time);
    if (timeMatch && timeMatch.length > 0) {
      const timeStr = timeMatch[0];
      console.log('🕒 Horário encontrado na mensagem:', timeStr);
      
      // Extrair horas e minutos usando regex mais precisa
      const hourMinuteMatch = timeStr.match(/(\d{1,2})[h:.]?(\d{0,2})/);
      if (hourMinuteMatch) {
        const hour = parseInt(hourMinuteMatch[1]);
        // Se o segundo grupo capturou algo, use-o como minutos, caso contrário, use 0
        const minute = hourMinuteMatch[2] ? parseInt(hourMinuteMatch[2]) : 0;
        
        console.log(`🕒 Hora extraída: ${hour}:${minute}`);
        
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          suggestedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          console.log('🕒 Horário formatado:', suggestedTime);
        }
      }
    }
    
    // Construir um objeto Date no fuso horário de Brasília para garantir a consistência
    let finalDate = null;
    if (suggestedDate && suggestedTime) {
      const [year, month, day] = suggestedDate.toISOString().split('T')[0].split('-');
      const [hour, minute] = suggestedTime.split(':');
      console.log(`🗓️ Data construída: ${year}-${month}-${day} ${hour}:${minute}`);
      
      // Criar a data no fuso horário de Brasília
      finalDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
      // Ajustar para o offset de Brasília (GMT-3)
      finalDate.setUTCHours(finalDate.getUTCHours() - 3);
    } else if (suggestedDate) {
      finalDate = new Date(suggestedDate.toISOString().split('T')[0] + 'T00:00:00-03:00');
    } else if (suggestedTime) {
      const [hour, minute] = suggestedTime.split(':');
      finalDate = new Date();
      finalDate.setHours(parseInt(hour), parseInt(minute), 0, 0);
      // Ajustar para o offset de Brasília (GMT-3)
      finalDate.setHours(finalDate.getHours() - (finalDate.getTimezoneOffset() / 60) - 3);
    }

    const result = {
      suggestedDate: finalDate ? finalDate.toISOString().split('T')[0] : null,
      suggestedTime: finalDate ? finalDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
      hasDateReference: suggestedDate !== null,
      hasTimeReference: suggestedTime !== null
    };
    
    console.log('📅 Resultado da extração de data/hora:', result);
    return result;
    
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

function extractProfessionalPreference(message) {
  const lowerMessage = message.toLowerCase();
  
  const specificPatterns = [
    /(?:com|pelo|pela|dr|dra|doutor|doutora|profissional)\s+([a-záçãõéíóúêôâ\s]+)/i,
    /(?:quero|prefiro|gosto|sempre|só|somente)\s+(?:com|pelo|pela|dr|dra|doutor|doutora)\s+([a-záçãõéíóúêôâ\s]+)/i,
    /([a-záçãõéíóúêôâ\s]+)\s+(?:sempre|geralmente|normalmente|costuma|atende)/i
  ];

  const specialtyPatterns = [
    /(?:preciso|quero|busco)\s+(?:de|um|uma)?\s*(dentista|ortodontista|clínico|cardiologista|dermatologista|psicólogo|fisioterapeuta)/i,
    /(dentista|ortodontista|clínico|cardiologista|dermatologista|psicólogo|fisioterapeuta)/i
  ];

  const urgencyPatterns = [
    /(?:urgente|emergência|o mais rápido|hoje mesmo|amanhã)/i,
    /(?:qualquer|tanto faz|qualquer um|quem estiver|disponível)/i
  ];

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

async function analyzeWithProfessionalPreference(message, contactId, companyId) {
  try {
    console.log('🔍 Analisando com preferências profissionais...');
    
    const basicAnalysis = await analyze(message);
    
    if (basicAnalysis.intention !== 'scheduling') {
      return basicAnalysis;
    }
    
    let dateTime = basicAnalysis.dateTime;
    
    if (!dateTime || (!dateTime.suggestedDate && !dateTime.suggestedTime)) {
      console.log('⚠️ IA não retornou dateTime, extraindo localmente...');
      dateTime = extractDateTime(message);
    } else {
      console.log('✅ Usando dateTime da IA:', dateTime);
    }
    
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

async function analyzeWithProductsAndProfessionals(message, contactId, companyId) {
    try {
        console.log('🛍️ Analisando com lógica de produtos...');

        const matchingProducts = await findMatchingProducts(message, companyId);

        if (matchingProducts.length > 0) {
            console.log(`✅ Encontrados ${matchingProducts.length} produtos correspondentes.`);
            const basicAnalysis = await analyze(message);
            return {
                ...basicAnalysis,
                products: matchingProducts,
                provider: 'deepseek-product-search',
                contactId: contactId,
                companyId: companyId
            };
        }

        console.log('ℹ️ Nenhum produto encontrado. Usando análise de preferência de profissional...');
        return await analyzeWithProfessionalPreference(message, contactId, companyId);

    } catch (error) {
        console.error('❌ Erro na análise com produtos e profissionais:', error);
        return analyzeFallback(message);
    }
}

async function findMatchingProducts(text, companyId) {
    try {
        const { supabaseAdmin } = require('../config/supabase'); 
        
        const keywords = extractKeywords(text);
        if (keywords.length === 0) return [];

        const searchQuery = keywords.join(' & ');

        const { data: products, error } = await supabaseAdmin
            .from('products')
            .select(`
                *,
                professionals (
                    id,
                    name,
                    specialty,
                    calendar_connected
                )
            `)
            .eq('company_id', companyId)
            .eq('status', 'active')
            .not('professional_id', 'is', null)
            .textSearch('name', searchQuery, { type: 'websearch' });

        if (error) {
            console.error('❌ Erro ao buscar produtos por IA:', error);
            return [];
        }

        if (!products || products.length === 0) return [];

        const availableProducts = products.filter(
            p => p.professionals && p.professionals.calendar_connected === true
        );

        return availableProducts;

    } catch (error) {
        console.error('❌ Erro em findMatchingProducts:', error);
        return [];
    }
}

function extractKeywords(text) {
    const commonWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'quero', 'gostaria', 'preciso', 'fazer', 'marcar', 'agendar', 'consulta', 'atendimento'];
    
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !commonWords.includes(word));
}

function determineSuggestedApproach(messagePreference, clientHistory) {
  if (messagePreference.hasPreference && messagePreference.type === 'specific_professional') {
    return {
      approach: 'specific_professional',
      reason: 'Cliente especificou profissional na mensagem',
      action: 'find_professional_by_name',
      professional_name: messagePreference.professionalName
    };
  }

  if (messagePreference.hasPreference && messagePreference.type === 'specialty') {
    return {
      approach: 'specialty_based',
      reason: 'Cliente precisa de especialidade específica',
      action: 'find_specialist',
      specialty: messagePreference.specialty
    };
  }

  if (messagePreference.hasPreference && messagePreference.type === 'any_available') {
    return {
      approach: 'availability_based',
      reason: 'Cliente quer próximo disponível',
      action: 'suggest_fastest_available',
      urgency: messagePreference.urgency
    };
  }

  return {
    approach: 'default_suggestion',
    reason: 'Nenhuma preferência específica detectada',
    action: 'suggest_best_available'
  };
}

async function getClientHistoricalContext(contactId, userId) {
  try {
    const { supabase } = require('../config/supabase');
    
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
      .gte('scheduled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('scheduled_at', { ascending: false })
      .limit(5);

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

function formatContextForAI(historicalContext, currentMessage) {
  let contextText = `MENSAGEM ATUAL: "${currentMessage}"\n\n`;
  
  if (historicalContext.hasHistory) {
    contextText += "CONTEXTO HISTÓRICO:\n";
    
    if (historicalContext.appointments.length > 0) {
      contextText += "AGENDAMENTOS RECENTES:\n";
      historicalContext.appointments.forEach((apt, index) => {
        const date = new Date(apt.scheduled_at).toLocaleDateString('pt-BR');
        const professional = apt.professionals?.name || 'N/A';
        contextText += `${index + 1}. ${date} - ${professional} (${apt.status})\n`;
      });
    }
    
    if (historicalContext.messages.length > 0) {
      contextText += "\nMENSAGENS RECENTES:\n";
      historicalContext.messages.slice(0, 5).forEach((msg, index) => {
        contextText += `${index + 1}. ${msg.content} (${msg.intention || 'N/A'})\n`;
      });
    }
  }
  
  return contextText;
}

async function analyzeWithProfessionalPreferenceWithContext(message, contactId, userId) {
  try {
    console.log('🧠 Analisando com contexto histórico completo...');
    
    const historicalContext = await getClientHistoricalContext(contactId, userId);
    const contextualPrompt = formatContextForAI(historicalContext, message);
    const analysis = await analyze(contextualPrompt);

    return {
        ...analysis,
        provider: 'deepseek-contextual',
        timestamp: new Date().toISOString(),
        historical_context: historicalContext,
        context_used: true,
        isSchedulingIntent: ['scheduling', 'rescheduling', 'cancellation', 'availability', 'confirmation'].includes(analysis.intention),
        contactId: contactId,
        companyId: userId
    };

  } catch (error) {
    console.error('❌ Erro na análise com contexto:', error);
    return await analyzeWithProfessionalPreference(message, contactId, userId);
  }
}

// 🧠 FUNÇÃO PRINCIPAL: Buscar contexto histórico completo
async function getClientHistoricalContext(contactId, userId) {
    try {
        console.log('🧠 Buscando contexto histórico do cliente:', contactId);
        
        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 1. BUSCAR ÚLTIMAS 15 MENSAGENS DA CONVERSA
        const { data: recentMessages } = await supabaseAdmin
            .from('messages')
            .select('content, sender_type, created_at')
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false })
            .limit(15);

        // 2. BUSCAR AGENDAMENTOS FUTUROS
        const { data: upcomingAppointments } = await supabaseAdmin
            .from('appointments')
            .select('scheduled_at, professional_id, service_id, status')
            .eq('contact_id', contactId)
            .gte('scheduled_at', new Date().toISOString())
            .order('scheduled_at', { ascending: true });

        // 3. BUSCAR AGENDAMENTOS PASSADOS RECENTES (últimos 90 dias)
        const { data: recentAppointments } = await supabaseAdmin
            .from('appointments')
            .select('scheduled_at, professional_id, service_id, status')
            .eq('contact_id', contactId)
            .gte('scheduled_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
            .lt('scheduled_at', new Date().toISOString())
            .order('scheduled_at', { ascending: false })
            .limit(5);

        // 4. BUSCAR DADOS DO CONTATO
        const { data: contactInfo } = await supabaseAdmin
            .from('contacts')
            .select('name, phone, preferences')
            .eq('id', contactId)
            .single();

        return {
            contact: contactInfo,
            recentMessages: recentMessages || [],
            upcomingAppointments: upcomingAppointments || [],
            recentAppointments: recentAppointments || [],
            hasHistory: (recentMessages?.length || 0) > 1
        };

    } catch (error) {
        console.error('❌ Erro buscando contexto histórico:', error);
        return null;
    }
}

// 📝 FUNÇÃO: Formatar contexto para a IA entender
function formatContextForAI(historicalContext, currentMessage) {
    if (!historicalContext) return '';

    const { contact, recentMessages, upcomingAppointments, recentAppointments, hasHistory } = historicalContext;
    
    let contextPrompt = `\n🧠 CONTEXTO DO CLIENTE:\n`;
    
    // Informações básicas do cliente
    if (contact?.name) {
        contextPrompt += `- Nome: ${contact.name}\n`;
    }
    
    // Histórico de conversa
    if (hasHistory && recentMessages.length > 1) {
        contextPrompt += `- Cliente CONHECIDO (já conversou antes)\n`;
        contextPrompt += `- Últimas mensagens:\n`;
        recentMessages.slice(0, 5).forEach(msg => {
            const sender = msg.sender_type === 'user' ? 'Cliente' : 'Você';
            contextPrompt += `  ${sender}: "${msg.content}"\n`;
        });
    } else {
        contextPrompt += `- Cliente NOVO (primeira conversa)\n`;
    }
    
    // Agendamentos futuros
    if (upcomingAppointments.length > 0) {
        contextPrompt += `- AGENDAMENTOS FUTUROS:\n`;
        upcomingAppointments.forEach(apt => {
            const date = new Date(apt.scheduled_at).toLocaleDateString('pt-BR');
            const time = new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            contextPrompt += `  • ${date} às ${time} (Status: ${apt.status})\n`;
        });
    }
    
    // Agendamentos passados
    if (recentAppointments.length > 0) {
        contextPrompt += `- HISTÓRICO RECENTE:\n`;
        recentAppointments.slice(0, 3).forEach(apt => {
            const date = new Date(apt.scheduled_at).toLocaleDateString('pt-BR');
            contextPrompt += `  • Consulta em ${date} (${apt.status})\n`;
        });
    }
    
    contextPrompt += `\n📱 MENSAGEM ATUAL: "${currentMessage}"\n`;
    contextPrompt += `\n💡 INSTRUÇÕES: Seja natural, use o contexto acima para responder de forma personalizada e humana.`;
    
    return contextPrompt;
}

// 🔄 FUNÇÃO PRINCIPAL MODIFICADA: Análise COM contexto histórico
async function analyzeWithHistoricalContext(text, contactId, userId, customerContext = null) {
    try {
        console.log('🧠 Iniciando análise COM contexto histórico');
        
        // Buscar contexto histórico do cliente
        const historicalContext = await getClientHistoricalContext(contactId, userId);
        
        // Formatar contexto para a IA
        const contextualPrompt = formatContextForAI(historicalContext, text);
        
        // Prompts mais inteligentes baseados no contexto
        let aiPrompt = `Você é Sarah, assistente virtual de uma clínica médica brasileira.
        
PERSONALIDADE: Calorosa, empática, natural, brasileira, eficiente
OBJETIVO: Ajudar com agendamentos, informações e atendimento

${contextualPrompt}

REGRAS IMPORTANTES:
- Se cliente CONHECIDO: seja calorosa mas não repita cumprimentos básicos
- Se cliente NOVO: seja acolhedora e se apresente brevemente  
- Para agendamentos: seja específica sobre horários e profissionais
- Sempre mantenha tom humano e natural
- Use emojis moderadamente

Analise a mensagem e responda adequadamente:`;

        console.log('🎯 Enviando prompt com contexto para IA...');
        
        // Chamar IA com contexto histórico
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: aiPrompt
                    },
                    {
                        role: 'user', 
                        content: text
                    }
                ],
                temperature: 0.8,
                max_tokens: 500
            })
        });

        const aiResult = await response.json();
        const aiResponse = aiResult.choices?.[0]?.message?.content || 'Desculpe, não entendi. Pode repetir?';

        console.log('✅ IA respondeu com contexto histórico');

        return {
            intention: 'conversational', // Sempre conversacional com contexto
            confidence: 0.9,
            response: aiResponse,
            hasHistoricalContext: historicalContext?.hasHistory || false,
            customerName: historicalContext?.contact?.name || null,
            upcomingAppointments: historicalContext?.upcomingAppointments?.length || 0
        };

    } catch (error) {
        console.error('❌ Erro na análise com contexto histórico:', error);
        
        // Fallback para método atual
        return await analyzeWithProductsAndProfessionals(text, contactId, userId, customerContext);
    }
}

// ⚡ FALLBACK: Análise SEM contexto (método atual mantido como backup)
async function analyzeWithoutContext(text, contactId, userId, customerContext = null) {
    // Esta é a função atual analyzeWithProductsAndProfessionals
    // Mantida como fallback caso a análise com contexto falhe
    console.log('⚠️ Usando fallback sem contexto histórico');
    
    // TODO: Aqui vai o código da função atual analyzeWithProductsAndProfessionals
    // Por ora, retorna resposta genérica
    return {
        intention: 'general_inquiry',
        confidence: 0.5,
        response: 'Olá! Como posso ajudar você hoje?',
        hasHistoricalContext: false
    };
}


module.exports = {
    analyzeWithHistoricalContext,        // 🆕 NOVA FUNÇÃO PRINCIPAL
    analyzeWithProductsAndProfessionals, // Manter compatibilidade
    analyzeWithoutContext,               // Fallback
    getClientHistoricalContext,          // Para uso externo
    formatContextForAI                   // Para uso externo
};