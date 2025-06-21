// ===============================================
// INTENTION ANALYZER - ANÁLISE DE INTENÇÃO COM IA
// ===============================================

// ===============================================
// CONFIGURAÇÃO DEEPSEEK PARA ANÁLISE DE INTENÇÃO
// ===============================================
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// ===============================================
// TIPOS DE INTENÇÃO SUPORTADOS
// ===============================================
const INTENTION_TYPES = {
  greeting: 'Saudação ou cumprimento inicial',
  scheduling: 'Agendamento de consultas, horários, marcação',
  sales: 'Interesse em compras, produtos, serviços, vendas',
  support: 'Suporte técnico, problemas, dúvidas',
  information: 'Pedido de informações gerais',
  complaint: 'Reclamações, problemas, insatisfação',
  pricing: 'Perguntas sobre preços, valores, custos',
  other: 'Outras intenções não categorizadas',
  reschedule: 'Reagendamento de consultas existentes',
  cancellation: 'Cancelamento de agendamentos',
  availability: 'Consulta de disponibilidade de horários',
  confirmation: 'Confirmação de agendamentos propostos'
};

// ===============================================
// PALAVRAS-CHAVE POR INTENÇÃO (FALLBACK)
// ===============================================
const INTENTION_KEYWORDS = {
  greeting: ['oi', 'olá', 'hello', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'eae'],
  scheduling: ['agendar', 'agendamento', 'marcar', 'consulta', 'horário', 'disponível', 'agenda', 'data', 'quando'],
  sales: ['comprar', 'vender', 'produto', 'serviço', 'interessado', 'quero', 'preciso', 'venda'],
  support: ['ajuda', 'problema', 'suporte', 'erro', 'bug', 'não funciona', 'dúvida', 'como'],
  information: ['informação', 'info', 'saber', 'conhecer', 'detalhes', 'explicar', 'o que é'],
  complaint: ['reclamação', 'insatisfeito', 'ruim', 'péssimo', 'problema', 'cancelar', 'reembolso'],
  pricing: ['preço', 'valor', 'custa', 'quanto', 'custo', 'tabela', 'orçamento', 'investimento'],
  reschedule: ['reagendar', 'remarcar', 'mudar horário', 'trocar data', 'transferir', 'mudar agendamento', 'alterar horário', 'preciso mudar', 'quero remarcar', 'posso mudar', 'trocar horário', 'alterar consulta'],
  cancellation: ['cancelar', 'desmarcar', 'não posso ir', 'não vou conseguir', 'quero cancelar', 'preciso cancelar', 'desmarcar consulta', 'não posso mais', 'cancelar agendamento', 'não vai dar'],
  availability: ['horários disponíveis', 'que horas tem', 'horários livres', 'disponibilidade', 'quando tem vaga', 'horários vagos', 'agenda livre'],
  confirmation: ['confirmar', 'ok pode ser', 'aceito', 'tá bom', 'perfeito', 'confirmo', 'pode marcar', 'fecha então', 'vou sim'],
  other: []
};

// ===============================================
// FUNÇÃO PRINCIPAL: ANÁLISE DE INTENÇÃO COM IA
// ===============================================
async function analyze(messageContent, context = {}) {
  try {
    console.log('🧠 Analisando intenção com DeepSeek:', messageContent);

    // Verificar se API key está disponível
    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY.includes('exemplo')) {
      throw new Error('API key não configurada');
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
            content: 'Você é um especialista em análise de intenções para CRM. Analise a mensagem e retorne APENAS um JSON válido.'
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

    // Parse do resultado JSON
    const parsed = JSON.parse(result.trim());
    
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
    throw error;
  }
}

// ===============================================
// FUNÇÃO: CONSTRUIR PROMPT DE ANÁLISE
// ===============================================
function buildAnalysisPrompt(messageContent, context) {
  let prompt = `Analise a intenção desta mensagem de WhatsApp:

MENSAGEM: "${messageContent}"

TIPOS DE INTENÇÃO DISPONÍVEIS:
`;

  // Adicionar tipos de intenção
  Object.entries(INTENTION_TYPES).forEach(([key, description]) => {
    prompt += `- ${key}: ${description}\n`;
  });

  // Adicionar contexto se disponível
  if (context.userProfile) {
    prompt += `\nCONTEXTO DO USUÁRIO: ${context.userProfile.business_name || 'Negócio'}\n`;
  }

  if (context.history && context.history.length > 0) {
    prompt += `\nHISTÓRICO RECENTE:\n`;
    context.history.slice(0, 3).forEach(msg => {
      prompt += `- ${msg.sender_type}: "${msg.content}"\n`;
    });
  }

  if (context.products && context.products.length > 0) {
    prompt += `\nPRODUTOS/SERVIÇOS DISPONÍVEIS:\n`;
    context.products.slice(0, 5).forEach(product => {
      prompt += `- ${product.name}: ${product.description || 'N/A'}\n`;
    });
  }

  prompt += `
RESPONDA APENAS COM UM JSON VÁLIDO no formato:
{
  "intention": "tipo_da_intenção",
  "confidence": 0.95,
  "reasoning": "breve explicação"
}

IMPORTANTE: Use APENAS os tipos de intenção listados acima.`;

  return prompt;
}

// ===============================================
// FUNÇÃO FALLBACK: ANÁLISE POR PALAVRAS-CHAVE
// ===============================================
function analyzeFallback(messageContent) {
  try {
    console.log('🔍 Análise por palavras-chave:', messageContent);
    
    const content = messageContent.toLowerCase();
    let bestMatch = { intention: 'other', score: 0 };

    // Verificar cada tipo de intenção
    Object.entries(INTENTION_KEYWORDS).forEach(([intention, keywords]) => {
      let score = 0;
      
      keywords.forEach(keyword => {
        if (content.includes(keyword.toLowerCase())) {
          score += 1;
        }
      });

      if (score > bestMatch.score) {
        bestMatch = { intention, score };
      }
    });

    // Calcular confiança baseada no score
    const confidence = Math.min(0.8, 0.3 + (bestMatch.score * 0.1));

    console.log(`✅ Fallback: ${bestMatch.intention} (confiança: ${confidence.toFixed(2)})`);

    return {
      intention: bestMatch.intention,
      confidence: parseFloat(confidence.toFixed(2)),
      reasoning: `Análise por palavras-chave: ${bestMatch.score} matches`,
      provider: 'fallback',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Erro no fallback:', error.message);
    
    // Retorno de segurança
    return {
      intention: 'other',
      confidence: 0.5,
      reasoning: 'Erro na análise - classificação padrão',
      provider: 'error',
      timestamp: new Date().toISOString()
    };
  }
}

// ===============================================
// FUNÇÃO: ANÁLISE HÍBRIDA (IA + FALLBACK)
// ===============================================
async function analyzeHybrid(messageContent, context = {}) {
  try {
    // Tentar análise com IA primeiro
    const aiResult = await analyze(messageContent, context);
    
    // Se confiança for muito baixa, complementar com fallback
    if (aiResult.confidence < 0.7) {
      const fallbackResult = analyzeFallback(messageContent);
      
      // Se fallback tem maior confiança, usar fallback
      if (fallbackResult.confidence > aiResult.confidence) {
        return {
          ...fallbackResult,
          reasoning: `Híbrido: Fallback (${fallbackResult.confidence}) > IA (${aiResult.confidence})`
        };
      }
    }
    
    return aiResult;

  } catch (error) {
    console.log('⚠️ IA falhou, usando fallback:', error.message);
    return analyzeFallback(messageContent);
  }
}

// ===============================================
// FUNÇÃO: DETECTAR MENÇÃO A SERVIÇOS
// ===============================================
function detectServiceMention(message, availableServices = []) {
  try {
    const messageLower = message.toLowerCase();
    
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
// EXPORTAR FUNÇÕES
// ===============================================
module.exports = {
  analyze,
  analyzeFallback,
  analyzeHybrid,
  detectServiceMention,
  extractDateTime,
  INTENTION_TYPES,
  INTENTION_KEYWORDS
};