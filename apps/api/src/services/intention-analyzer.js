// ===============================================
// INTENTION ANALYZER - ANÁLISE DE INTENÇÃO COM IA
// ===============================================

const fetch = require('node-fetch');

// ===============================================
// CONFIGURAÇÃO DEEPSEEK PARA ANÁLISE DE INTENÇÃO
// ===============================================
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'example_key';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// ===============================================
// TIPOS DE INTENÇÃO SUPORTADOS
// ===============================================
const INTENTION_TYPES = {
  greeting: 'Saudação ou cumprimento inicial',
  scheduling: 'Solicitação de agendamento de consulta ou serviço',
  sales: 'Interesse em comprar produto ou serviço',
  support: 'Pedido de ajuda ou suporte técnico',
  information: 'Solicitação de informações gerais',
  complaint: 'Reclamação ou feedback negativo',
  pricing: 'Pergunta sobre preços ou valores',
  reschedule: 'Solicitação para remarcar agendamento existente',
  cancellation: 'Solicitação para cancelar agendamento',
  availability: 'Consulta sobre disponibilidade de horários',
  confirmation: 'Confirmação de agendamento ou informação',
  other: 'Outras intenções não categorizadas'
};

// ===============================================
// PALAVRAS-CHAVE PARA ANÁLISE FALLBACK
// ===============================================
const KEYWORDS = {
  greeting: ['oi', 'olá', 'boa tarde', 'bom dia', 'boa noite', 'e aí', 'oi tudo bem', 'como vai'],
  scheduling: ['agendar', 'marcar consulta', 'consulta', 'agendamento', 'horário', 'marcar', 'disponível', 'vaga', 'atendimento'],
  sales: ['comprar', 'preço', 'valor', 'quanto custa', 'orçamento', 'proposta', 'venda', 'produto'],
  support: ['ajuda', 'problema', 'erro', 'não funciona', 'suporte', 'dúvida', 'como fazer'],
  information: ['informação', 'saber mais', 'detalhes', 'explicar', 'como funciona', 'que é'],
  complaint: ['reclamação', 'problema', 'insatisfeito', 'ruim', 'péssimo', 'reclamar'],
  pricing: ['preço', 'valor', 'quanto custa', 'tabela', 'valores', 'custo'],
  reschedule: ['remarcar', 'mudar horário', 'trocar data', 'reagendar', 'alterar'],
  cancellation: ['cancelar', 'desmarcar', 'não vou', 'não posso', 'cancelamento'],
  availability: ['disponível', 'horários', 'quando tem', 'que horas', 'agenda', 'livre', 'vago'],
  confirmation: ['confirmar', 'ok', 'sim', 'perfeito', 'tá bom', 'aceito', 'concordo'],
  other: []
};

// ===============================================
// FUNÇÃO: LIMPAR RESPOSTA JSON DA IA
// ===============================================
function cleanJsonResponse(response) {
  if (!response) return response;
  
  // Remove backticks markdown se existirem
  let cleaned = response.trim();
  
  // Remove ```json do início
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  }
  
  // Remove ``` do início se existir
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  
  // Remove ``` do final se existir
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  // Remove espaços extras
  cleaned = cleaned.trim();
  
  return cleaned;
}

// ===============================================
// FUNÇÃO: ANÁLISE COM IA (DEEPSEEK)
// ===============================================
async function analyze(messageContent, context = {}) {
  try {
    console.log('🧠 Analisando intenção com DeepSeek:', messageContent);

    // Verificar se API key está disponível
    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY.includes('exemplo') || DEEPSEEK_API_KEY.includes('example')) {
      console.log('⚠️ API DeepSeek não configurada, usando análise fallback');
      return await analyzeFallback(messageContent, context);
    }

    // Construir prompt contextualizado
    const prompt = buildAnalysisPrompt(messageContent, context);
    
    // Chamar API do DeepSeek
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de intenções para CRM. Analise a mensagem e retorne APENAS um JSON válido sem markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content;

    if (!result) {
      throw new Error('Resposta vazia da API');
    }

    // 🔧 CORREÇÃO: Limpar backticks antes do JSON.parse
    const cleanedResult = cleanJsonResponse(result);
    console.log('🧹 Resposta limpa:', cleanedResult);

    const parsed = JSON.parse(cleanedResult);
    
    console.log('✅ Intenção analisada:', parsed.intention, `(${parsed.confidence})`);
    
    return {
      ...parsed,
      provider: 'deepseek',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Erro na análise de intenção:', error.message);
    console.log('🔄 Tentando análise fallback...');
    return await analyzeFallback(messageContent, context);
  }
}

// ===============================================
// FUNÇÃO: ANÁLISE FALLBACK (SEM IA)
// ===============================================
async function analyzeFallback(messageContent, context = {}) {
  try {
    console.log('🔍 Usando análise fallback por palavras-chave');
    
    const message = messageContent.toLowerCase();
    let bestMatch = 'other';
    let confidence = 0.1;
    
    // Buscar a melhor correspondência nas palavras-chave
    for (const [intention, keywords] of Object.entries(KEYWORDS)) {
      for (const keyword of keywords) {
        if (message.includes(keyword.toLowerCase())) {
          bestMatch = intention;
          confidence = 0.8;
          break;
        }
      }
      if (confidence > 0.1) break;
    }
    
    console.log(`✅ Intenção detectada (fallback): ${bestMatch} (${confidence})`);
    
    return {
      intention: bestMatch,
      confidence: confidence,
      reasoning: 'Análise por palavras-chave (fallback)',
      provider: 'fallback',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Erro na análise fallback:', error.message);
    
    // Retorno padrão em caso de erro total
    return {
      intention: 'other',
      confidence: 0.1,
      reasoning: 'Erro na análise, retornando padrão',
      provider: 'default',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

// ===============================================
// FUNÇÃO: ANÁLISE HÍBRIDA
// ===============================================
async function analyzeHybrid(messageContent, context = {}) {
  try {
    // Tentar análise com IA primeiro
    const aiResult = await analyze(messageContent, context);
    
    // Se confiança baixa, usar fallback como backup
    if (aiResult.confidence < 0.5) {
      const fallbackResult = await analyzeFallback(messageContent, context);
      
      // Retornar o melhor resultado
      return aiResult.confidence > fallbackResult.confidence ? aiResult : fallbackResult;
    }
    
    return aiResult;
    
  } catch (error) {
    console.error('❌ Erro na análise híbrida:', error.message);
    return await analyzeFallback(messageContent, context);
  }
}

// ===============================================
// FUNÇÃO: EXTRAIR DATA E HORA DA MENSAGEM
// ===============================================
function extractDateTime(messageContent) {
  const message = messageContent.toLowerCase();
  const now = new Date();
  
  // Padrões para detectar datas
  const patterns = {
    tomorrow: /amanh[ãa]|tomorrow/i,
    today: /hoje|today/i,
    time: /(\d{1,2})[h:]?(\d{0,2})/g
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
}

// ===============================================
// FUNÇÃO: CONSTRUIR PROMPT DE ANÁLISE
// ===============================================
function buildAnalysisPrompt(messageContent, context) {
  // 📅 CRIAR DATA ATUAL EM BRASÍLIA
  const agora = new Date();
  const hoje = new Date(agora.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));

  // 🔍 LOGS DE DEBUG
  console.log('🕐 Railway (UTC):', agora.toISOString());
  console.log('🇧🇷 Convertido (Brasília):', hoje.toISOString());
  console.log('🌎 Timezone detectado:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  
  const dataAtual = `${diasSemana[hoje.getDay()]}, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

  console.log('📅 Data enviada para IA:', dataAtual);
  
  let prompt = `CONTEXTO TEMPORAL: HOJE É ${dataAtual.toUpperCase()}
  TIMEZONE: BRASÍLIA (GMT-3) - TODOS OS HORÁRIOS SÃO NO FUSO HORÁRIO DO BRASIL!
  IMPORTANTE: Quando o usuário diz "9:15", é 9:15 da manhã NO BRASIL (GMT-3).

Analise a intenção desta mensagem de WhatsApp:

MENSAGEM: "${messageContent}"

IMPORTANTE PARA AGENDAMENTOS:
- Se disser "amanhã": calcule ${hoje.getDate() + 1}/${hoje.getMonth() + 1}/${hoje.getFullYear()}
- Se disser "próxima segunda/terça/quarta/quinta/sexta/sábado/domingo": calcule o PRÓXIMO dia da semana mencionado
- TODOS OS HORÁRIOS SÃO EM BRASÍLIA (GMT-3)
- Para "próxima segunda-feira": se hoje é domingo (06/07), próxima segunda é 08/07

TIPOS DE INTENÇÃO DISPONÍVEIS:`;

  // Adicionar tipos de intenção
  Object.entries(INTENTION_TYPES).forEach(([key, description]) => {
    prompt += `- ${key}: ${description}\n`;
  });

  // Adicionar contexto se disponível
  if (context.previousMessages && context.previousMessages.length > 0) {
    prompt += `\nCONTEXTO ANTERIOR:\n`;
    context.previousMessages.forEach((msg, index) => {
      prompt += `${index + 1}. ${msg}\n`;
    });
  }

  prompt += `
RETORNE APENAS UM JSON NO SEGUINTE FORMATO (sem markdown, sem backticks):
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

CALCULE AS DATAS CORRETAMENTE baseado em hoje ser ${dataAtual}!

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional, sem markdown, sem \`\`\`json.`;

  return prompt;
}

// ===============================================
// FUNÇÃO: ANÁLISE COM PREFERÊNCIAS PROFISSIONAIS
// ===============================================
async function analyzeWithProfessionalPreference(message, contactId, companyId) {
  try {
    console.log('🔍 Analisando com preferências profissionais...');
    
    // Fazer análise básica primeiro
    const basicAnalysis = await analyze(message);
    
    // Se não é agendamento, retornar análise básica
    if (basicAnalysis.intention !== 'scheduling') {
      return basicAnalysis;
    }
    
    // 🔧 CORREÇÃO: USAR dateTime da IA, NÃO sobrescrever!
    // Se a IA já retornou dateTime, usar ele. Senão, extrair localmente.
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
      dateTime: dateTime, // Agora preserva o dateTime da IA
      professionalPreference: null, // Implementar busca de preferências depois
      contactId: contactId,
      companyId: companyId
    };
    
  } catch (error) {
    console.error('❌ Erro na análise com preferências:', error.message);
    return await analyzeFallback(message);
  }
}

// 🆕 FUNÇÃO: Buscar contexto histórico completo
async function getClientHistoricalContext(contactId, userId) {
    try {
        console.log('🧠 Buscando contexto histórico do cliente...');
        
        // Importar supabaseAdmin (ajustar path conforme sua estrutura)
        const { supabase: supabaseAdmin } = require('../config/supabaseAdmin');

        // 1. 📱 HISTÓRICO DE MENSAGENS (últimas 10 mensagens)
        const { data: recentMessages, error: messagesError } = await supabaseAdmin
            .from('messages')
            .select(`
                content, 
                sender_type, 
                created_at,
                metadata
            `)
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false })
            .limit(10);

        // 2. 📅 AGENDAMENTOS FUTUROS (próximos 30 dias)
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);

        const { data: upcomingAppointments, error: upcomingError } = await supabaseAdmin
            .from('appointments')
            .select(`
                scheduled_at,
                status,
                title,
                professionals(name, specialty)
            `)
            .eq('contact_id', contactId)
            .gte('scheduled_at', new Date().toISOString())
            .lte('scheduled_at', futureDate.toISOString())
            .order('scheduled_at', { ascending: true });

        // 3. 📋 HISTÓRICO DE AGENDAMENTOS (últimos 90 dias)
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 90);

        const { data: pastAppointments, error: pastError } = await supabaseAdmin
            .from('appointments')
            .select(`
                scheduled_at,
                status,
                title,
                professionals(name, specialty)
            `)
            .eq('contact_id', contactId)
            .lt('scheduled_at', new Date().toISOString())
            .gte('scheduled_at', pastDate.toISOString())
            .order('scheduled_at', { ascending: false })
            .limit(5);

        // 4. 👤 PERFIL DO CLIENTE
        const { data: clientProfile, error: profileError } = await supabaseAdmin
            .from('contacts')
            .select('name, phone, created_at')
            .eq('id', contactId)
            .single();

        // 5. 🔄 FORMATIZAR CONTEXTO PARA IA
        return formatContextForAI({
            clientProfile: clientProfile || {},
            recentMessages: recentMessages || [],
            upcomingAppointments: upcomingAppointments || [],
            pastAppointments: pastAppointments || []
        });

    } catch (error) {
        console.error('❌ Erro buscando contexto histórico:', error);
        return null;
    }
}

// 🆕 FUNÇÃO: Formatar contexto para IA
function formatContextForAI(context) {
    const { clientProfile, recentMessages, upcomingAppointments, pastAppointments } = context;
    
    let formattedContext = `=== CONTEXTO HISTÓRICO DO CLIENTE ===

👤 PERFIL:
• Nome: ${clientProfile.name || 'Não informado'}
• Cliente desde: ${clientProfile.created_at ? new Date(clientProfile.created_at).toLocaleDateString('pt-BR') : 'Novo cliente'}

`;

    // 📅 AGENDAMENTOS FUTUROS
    if (upcomingAppointments && upcomingAppointments.length > 0) {
        formattedContext += `📅 PRÓXIMOS AGENDAMENTOS:
`;
        upcomingAppointments.forEach(apt => {
            const date = new Date(apt.scheduled_at).toLocaleDateString('pt-BR');
            const time = new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const professional = apt.professionals?.name || 'Profissional não especificado';
            formattedContext += `• ${date} às ${time} - ${professional} (${apt.status})\n`;
        });
        formattedContext += '\n';
    }

    // 📋 HISTÓRICO DE CONSULTAS
    if (pastAppointments && pastAppointments.length > 0) {
        formattedContext += `📋 HISTÓRICO DE CONSULTAS:
`;
        pastAppointments.slice(0, 3).forEach(apt => {
            const date = new Date(apt.scheduled_at).toLocaleDateString('pt-BR');
            const professional = apt.professionals?.name || 'Profissional não especificado';
            formattedContext += `• ${date} - ${professional} (${apt.status})\n`;
        });
        formattedContext += '\n';
    }

    // 💬 ÚLTIMAS CONVERSAS
    if (recentMessages && recentMessages.length > 0) {
        formattedContext += `💬 ÚLTIMAS CONVERSAS:
`;
        recentMessages.reverse().slice(-5).forEach(msg => {
            const date = new Date(msg.created_at).toLocaleDateString('pt-BR');
            const sender = msg.sender_type === 'user' ? 'Cliente' : 'Assistente';
            const content = msg.content.length > 80 ? msg.content.substring(0, 80) + '...' : msg.content;
            formattedContext += `• ${date} - ${sender}: ${content}\n`;
        });
        formattedContext += '\n';
    }

    formattedContext += `=== FIM DO CONTEXTO ===

🎯 INSTRUÇÕES PARA IA:
Use este contexto para:
1. Reconhecer o cliente como pessoa conhecida
2. Referenciar agendamentos quando relevante ("sua consulta com Dr. João")
3. Ser mais eficiente em reagendamentos
4. Detectar padrões de preferência por profissionais

`;

    return formattedContext;
}

// 🔄 FUNÇÃO MODIFICADA: analyzeWithProfessionalPreference COM CONTEXTO HISTÓRICO
async function analyzeWithProfessionalPreferenceWithContext(message, contactId, userId) {
  try {
    console.log('🔍 Analisando com preferências profissionais E CONTEXTO HISTÓRICO...');

    // 🆕 BUSCAR CONTEXTO HISTÓRICO
    const historicalContext = await getClientHistoricalContext(contactId, userId);
    
    // 📝 PROMPT EXPANDIDO COM CONTEXTO
    const contextualPrompt = `${historicalContext || ''}

=== MENSAGEM ATUAL ===
CLIENTE: "${message}"

Analise considerando:
1. O histórico do cliente (se disponível)
2. Agendamentos futuros existentes  
3. Padrões de comportamento anteriores
4. Preferências por profissionais específicos

Retorne JSON com:
{
    "intention": "scheduling|cancellation|rescheduling|inquiry|availability|confirmation|general",
    "confidence": 0.0-1.0,
    "extracted_info": {
        "date": "YYYY-MM-DD ou null",
        "time": "HH:MM ou null",
        "professional_preference": "nome ou null",
        "reference_to_existing": true/false,
        "appointment_to_modify": "descrição ou null"
    },
    "dateTime": {
        "suggestedDate": "YYYY-MM-DD ou null", 
        "suggestedTime": "HH:MM ou null",
        "hasDateReference": true/false,
        "hasTimeReference": true/false
    },
    "response_context": {
        "should_reference_history": true/false,
        "personalized_greeting": true/false
    }
}`;

    console.log('📡 Enviando para DeepSeek com contexto histórico...');
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um assistente especializado em agendamentos com acesso ao histórico completo do cliente. Use o contexto para respostas personalizadas e eficientes.'
                },
                {
                    role: 'user',
                    content: contextualPrompt
                }
            ],
            max_tokens: 400,
            temperature: 0.3
        })
    });

    const data = await response.json();
    let result = data.choices[0]?.message?.content;

    // 🔧 LIMPAR BACKTICKS (se houver)
    if (result.includes('```')) {
        result = result.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }

    const analysis = JSON.parse(result.trim());

    console.log('✅ Análise COM CONTEXTO concluída:', analysis.intention, `(${analysis.confidence})`);
    
    // 🆕 ADICIONAR CONTEXTO NO RESULTADO
    analysis.historical_context = {
        context_available: !!historicalContext,
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
  detectServiceMention,
  extractDateTime,
  extractProfessionalPreference,
  cleanProfessionalName,
  mapSpecialty,
  analyzeWithProfessionalPreference,
  determineSuggestedApproach,
  INTENTION_TYPES,
  INTENTION_KEYWORDS
};