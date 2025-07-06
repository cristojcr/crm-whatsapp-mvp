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
  
  return cleaned.trim();
}

// ===============================================
// FUNÇÃO PRINCIPAL: ANÁLISE DE INTENÇÃO COM IA
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

    // Parse do resultado JSON
    const parsed = JSON.parse(cleanedResult);
    
    // Validar estrutura
    if (!parsed.intention || !parsed.confidence) {
      throw new Error('Estrutura de resposta inválida');
    }

    console.log(`✅ Intenção analisada: ${parsed.intention} (${parsed.confidence})`);
    
    return {
      intention: parsed.intention,
      confidence: parseFloat(parsed.confidence),
      reasoning: parsed.reasoning || '',
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
  // 📅 ADICIONAR DATA ATUAL
  const hoje = new Date();
  const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  
  const dataAtual = `${diasSemana[hoje.getDay()]}, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
  
  let prompt = `CONTEXTO TEMPORAL: HOJE É ${dataAtual.toUpperCase()}

Analise a intenção desta mensagem de WhatsApp:

MENSAGEM: "${messageContent}"

IMPORTANTE PARA AGENDAMENTOS:
- Se disser "amanhã": calcule ${hoje.getDate() + 1}/${hoje.getMonth() + 1}/${hoje.getFullYear()}
- Se disser "próxima segunda/terça/quarta/quinta/sexta/sábado/domingo": calcule o PRÓXIMO dia da semana mencionado
- Se disser "semana que vem": adicione 7 dias à data atual
- Para "próxima segunda-feira": se hoje é domingo (06/07), próxima segunda é 08/07

TIPOS DE INTENÇÃO DISPONÍVEIS:
`;

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
    
    // Extrair informações de data/hora
    const dateTime = extractDateTime(message);
    
    // Retornar análise enriquecida
    return {
      ...basicAnalysis,
      dateTime: dateTime,
      professionalPreference: null, // Implementar busca de preferências depois
      contactId: contactId,
      companyId: companyId
    };
    
  } catch (error) {
    console.error('❌ Erro na análise com preferências:', error.message);
  }
}

// ===============================================
// EXPORTAR FUNÇÕES
// ===============================================
module.exports = {
  analyze,
  analyzeFallback,
  analyzeHybrid,
  analyzeWithProfessionalPreference,
  extractDateTime,
  INTENTION_TYPES,
  KEYWORDS
};