// ===============================================
// DEEPSEEK GENERATOR OTIMIZADO - VERSÃO 2.7
// GERAÇÃO DE RESPOSTAS COM DEEPSEEK + PROMPTS AVANÇADOS
// ===============================================

// ===============================================
// IMPORTS DOS MÓDULOS AVANÇADOS (NOVOS)
// ===============================================
const { ADVANCED_PROMPTS, SCENARIO_PROMPTS, PERSONALIZATION_ENGINE } = require('./advanced-prompts');

// ===============================================
// CONFIGURAÇÃO DEEPSEEK (MANTIDA)
// ===============================================
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// ===============================================
// TEMPLATES ORIGINAIS MANTIDOS + EXPANDIDOS
// ===============================================
const RESPONSE_TEMPLATES = {
  greeting: {
    system_prompt: "Você é um assistente amigável de atendimento ao cliente brasileiro. Responda de forma calorosa e profissional.",
    user_context: "Responda à saudação do cliente de forma amigável e pergunte como pode ajudar."
  },
  scheduling: {
    system_prompt: "Você é um assistente especializado em agendamentos. Seja prestativo e organize as informações de forma clara.",
    user_context: "Ajude o cliente com agendamento, pergunte sobre preferências de data/horário e confirme disponibilidade."
  },
  sales: {
    system_prompt: "Você é um consultor de vendas experiente. Seja persuasivo mas não insistente, foque nos benefícios.",
    user_context: "Apresente os produtos/serviços de forma atrativa, destaque benefícios e tire dúvidas sobre vendas."
  },
  support: {
    system_prompt: "Você é um especialista em suporte técnico. Seja paciente, didático e resolva problemas passo a passo.",
    user_context: "Ajude o cliente com problemas técnicos de forma clara e ofereça soluções práticas."
  },
  information: {
    system_prompt: "Você é um assistente informativo. Forneça informações precisas e completas de forma organizada.",
    user_context: "Forneça as informações solicitadas de forma clara e organize os detalhes importantes."
  },
  complaint: {
    system_prompt: "Você é um especialista em atendimento para reclamações. Seja empático, compreensivo e solucionador.",
    user_context: "Ouça a reclamação com empatia, peça desculpas quando apropriado e ofereça soluções."
  },
  pricing: {
    system_prompt: "Você é um consultor de preços. Seja transparente, explique o valor e justifique os investimentos.",
    user_context: "Apresente os preços de forma clara, explique o que está incluído e justifique o valor."
  },
  other: {
    system_prompt: "Você é um assistente de atendimento geral. Seja prestativo e tente entender a necessidade do cliente.",
    user_context: "Tente entender melhor a necessidade do cliente e ofereça ajuda apropriada."
  }
};

// ===============================================
// CLASSE DEEPSEEK GENERATOR OTIMIZADA (NOVA)
// ===============================================
class OptimizedDeepSeekGenerator {
  
  constructor() {
    this.apiKey = DEEPSEEK_API_KEY;
    this.baseURL = DEEPSEEK_API_URL;
    
    // Métricas avançadas (NOVO)
    this.metrics = {
      totalCalls: 0,
      successRate: 0,
      avgResponseTime: 0,
      totalCost: 0,
      avgTokensUsed: 0,
      efficiency: 0
    };
    
    // Cache de configurações (NOVO)
    this.configCache = new Map();
    
    // Histórico de performance (NOVO)
    this.performanceHistory = [];
  }

  // ===============================================
  // FUNÇÃO PRINCIPAL OTIMIZADA
  // ===============================================
  async generateResponse(messageContent, intention, context = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`🤖 [DeepSeek OTIMIZADO] Gerando resposta para: ${intention}`);

      // Verificar API key
      if (!this.apiKey || this.apiKey.includes('exemplo')) {
        throw new Error('DeepSeek API key não configurada');
      }

      // NOVO: Otimizar prompt para DeepSeek
      const optimizedPrompt = await this.optimizeForDeepSeek(messageContent, intention, context);
      
      // NOVO: Configurar parâmetros baseado no contexto
      const config = this.buildOptimizedConfig(context);
      
      // NOVO: Escolher entre template original ou prompt avançado
      const useAdvancedPrompts = this.shouldUseAdvancedPrompts(context);
      
      let response;
      if (useAdvancedPrompts) {
        response = await this.generateWithAdvancedPrompts(optimizedPrompt, intention, context, config);
      } else {
        response = await this.generateWithOriginalTemplate(messageContent, intention, context, config);
      }
      
      // NOVO: Calcular métricas detalhadas
      const metrics = this.calculateDetailedMetrics(response, startTime);
      
      // NOVO: Atualizar estatísticas
      this.updateStatistics(metrics, true);
      
      console.log(`✅ [DeepSeek OTIMIZADO] Resposta gerada com sucesso`);
      console.log(`📊 Métricas: ${metrics.responseTime}ms, ${metrics.tokensUsed} tokens, $${metrics.cost}`);
      
      return {
        success: true,
        response: response.content,
        provider: 'deepseek',
        model: response.model || 'deepseek-chat',
        tokensUsed: metrics.tokensUsed,
        costUSD: metrics.cost,
        processingTime: metrics.responseTime,
        metadata: {
          optimization: 'cost_efficient',
          efficiency: metrics.efficiency,
          promptType: useAdvancedPrompts ? 'advanced' : 'template',
          contextFactors: this.analyzeContextFactors(context)
        }
      };
      
    } catch (error) {
      console.error('❌ [DeepSeek OTIMIZADO] Erro na geração:', error);
      
      const processingTime = Date.now() - startTime;
      this.updateStatistics({ responseTime: processingTime }, false);
      
      // Fallback melhorado
      const fallbackResponse = this.generateSmartFallback(intention, messageContent, context);
      
      return {
        success: false,
        response: fallbackResponse,
        provider: 'deepseek',
        model: 'fallback',
        tokensUsed: 0,
        costUSD: 0,
        processingTime,
        error: error.message,
        metadata: {
          optimization: 'fallback',
          fallbackReason: error.message
        }
      };
    }
  }

  // ===============================================
  // OTIMIZAÇÃO PARA DEEPSEEK (NOVO)
  // ===============================================
  async optimizeForDeepSeek(messageContent, intention, context) {
    console.log('⚙️ [NOVO] Otimizando prompt para DeepSeek...');
    
    let optimized = messageContent;
    
    // Adicionar instruções específicas para DeepSeek
    const instructions = [
      "Seja direto e eficiente na resposta.",
      "Foque nos pontos principais sem perder qualidade.",
      "Use linguagem clara e objetiva.",
      "Mantenha tom profissional mas acessível."
    ];
    
    // Adaptar baseado no cenário
    if (context.scenario === 'horario_pico') {
      optimized = `${SCENARIO_PROMPTS?.horario_pico?.prefixo || 'RESPOSTA RÁPIDA'}: ${optimized}`;
      instructions.push("Resposta máximo 100 palavras.");
    } else if (context.urgency === 'Alta') {
      optimized = `URGENTE: ${optimized}`;
      instructions.push("Responda de forma direta e eficiente.");
    }
    
    // Adicionar contexto de economia
    if (context.costOptimization) {
      instructions.push("Otimize para máxima eficiência sem perder qualidade essencial.");
    }
    
    // Adicionar contexto emocional
    if (context.emotionalState) {
      switch (context.emotionalState) {
        case 'frustrated':
          instructions.push("Cliente frustrado - seja empático e solucionador.");
          break;
        case 'excited':
          instructions.push("Cliente entusiasmado - mantenha o entusiasmo.");
          break;
        case 'neutral':
          instructions.push("Abordagem profissional padrão.");
          break;
      }
    }
    
    return {
      content: optimized,
      instructions: instructions,
      metadata: {
        originalLength: messageContent.length,
        optimizedLength: optimized.length,
        instructionsCount: instructions.length
      }
    };
  }

  // ===============================================
  // CONFIGURAÇÃO OTIMIZADA (NOVO)
  // ===============================================
  buildOptimizedConfig(context) {
    console.log('⚙️ [NOVO] Construindo configuração otimizada...');
    
    const baseConfig = {
      model: 'deepseek-chat',
      temperature: 0.7,
      max_tokens: 300,
      top_p: 0.9,
      presence_penalty: 0.0,
      frequency_penalty: 0.0
    };

    // Otimizar baseado no contexto
    if (context.urgency === 'Alta') {
      baseConfig.max_tokens = 150;
      baseConfig.temperature = 0.5;
      console.log('📱 Configuração para urgência alta');
    } else if (context.complexity > 0.7) {
      baseConfig.max_tokens = 500;
      baseConfig.temperature = 0.8;
      console.log('🧠 Configuração para alta complexidade');
    }
    
    // Otimizar para custo
    if (context.costOptimization) {
      baseConfig.max_tokens = Math.min(baseConfig.max_tokens, 200);
      baseConfig.temperature = 0.6; // Mais determinístico = menos tokens
      console.log('💰 Configuração para economia de custos');
    }
    
    // Adaptar para tipo de negócio
    if (context.userProfile?.business_type === 'healthcare') {
      baseConfig.temperature = 0.6; // Mais conservador para saúde
      console.log('🏥 Configuração para área da saúde');
    }
    
    return baseConfig;
  }

  // ===============================================
  // GERAÇÃO COM PROMPTS AVANÇADOS (NOVO)
  // ===============================================
  async generateWithAdvancedPrompts(optimizedPrompt, intention, context, config) {
    console.log('🚀 [NOVO] Usando prompts avançados contextualizados...');
    
    try {
      // Usar sistema de prompts avançados se disponível
      let systemPrompt, userPrompt;
      
      if (ADVANCED_PROMPTS && typeof ADVANCED_PROMPTS.buildContextualPrompt === 'function') {
        const userProfile = context.userProfile || {};
        const customerProfile = this.buildCustomerProfile(context);
        const conversationHistory = context.history || [];
        
        const contextualPrompt = ADVANCED_PROMPTS.buildContextualPrompt(
          userProfile,
          customerProfile,
          intention,
          conversationHistory
        );
        
        systemPrompt = contextualPrompt;
        userPrompt = `${optimizedPrompt.content}\n\nInstruções: ${optimizedPrompt.instructions.join(' ')}`;
        
      } else {
        // Fallback para templates originais
        const template = RESPONSE_TEMPLATES[intention] || RESPONSE_TEMPLATES.other;
        systemPrompt = template.system_prompt;
        userPrompt = this.buildResponsePrompt(optimizedPrompt.content, intention, context, template);
      }
      
      return await this.callDeepSeekAPI(systemPrompt, userPrompt, config);
      
    } catch (error) {
      console.error('❌ Erro com prompts avançados, usando template:', error.message);
      return await this.generateWithOriginalTemplate(optimizedPrompt.content, intention, context, config);
    }
  }

  // ===============================================
  // GERAÇÃO COM TEMPLATE ORIGINAL (MANTIDA)
  // ===============================================
  async generateWithOriginalTemplate(messageContent, intention, context, config) {
    console.log('📝 [TEMPLATE] Usando template original...');
    
    // Obter template para a intenção
    const template = RESPONSE_TEMPLATES[intention] || RESPONSE_TEMPLATES.other;
    
    // Construir prompt contextualizado
    const prompt = this.buildResponsePrompt(messageContent, intention, context, template);
    
    return await this.callDeepSeekAPI(template.system_prompt, prompt, config);
  }

  // ===============================================
  // CHAMADA PARA API (MELHORADA)
  // ===============================================
  async callDeepSeekAPI(systemPrompt, userPrompt, config) {
    console.log('🌐 [API] Fazendo chamada para DeepSeek...');
    
    const requestBody = {
      model: config.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      top_p: config.top_p,
      presence_penalty: config.presence_penalty,
      frequency_penalty: config.frequency_penalty
    };

    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const generatedResponse = data.choices[0]?.message?.content;

    if (!generatedResponse) {
      throw new Error('Resposta vazia da API DeepSeek');
    }

    return {
      content: generatedResponse.trim(),
      model: data.model || config.model,
      usage: data.usage || { total_tokens: 0 },
      metadata: {
        requestBody: requestBody,
        responseStatus: response.status
      }
    };
  }

  // ===============================================
  // CÁLCULO DE MÉTRICAS DETALHADAS (NOVO)
  // ===============================================
  calculateDetailedMetrics(response, startTime) {
    const responseTime = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens || 0;
    const cost = this.calculateCost(tokensUsed);
    
    return {
      responseTime,
      tokensUsed,
      cost,
      efficiency: tokensUsed / responseTime, // tokens per ms
      costPerToken: cost / tokensUsed || 0,
      qualityScore: this.estimateQualityScore(response),
      contentLength: response.content.length
    };
  }

  // ===============================================
  // ESTIMATIVA DE QUALIDADE (NOVO)
  // ===============================================
  estimateQualityScore(response) {
    let score = 0.5; // Base
    
    // Fatores que aumentam qualidade
    if (response.content.length > 50) score += 0.2;
    if (response.content.length < 300) score += 0.1; // Não muito longo
    if (response.content.includes('?')) score += 0.05; // Faz perguntas
    if (response.content.match(/[.!?]/g)?.length > 1) score += 0.1; // Bem estruturado
    if (!response.content.includes('erro')) score += 0.05;
    
    return Math.min(score, 1.0);
  }

  // ===============================================
  // ATUALIZAÇÃO DE ESTATÍSTICAS (NOVO)
  // ===============================================
  updateStatistics(metrics, success) {
    this.metrics.totalCalls++;
    
    if (success) {
      const successCalls = this.metrics.totalCalls * this.metrics.successRate;
      this.metrics.successRate = (successCalls + 1) / this.metrics.totalCalls;
      
      // Atualizar tempo médio de resposta
      this.metrics.avgResponseTime = (
        (this.metrics.avgResponseTime * (this.metrics.totalCalls - 1)) + 
        metrics.responseTime
      ) / this.metrics.totalCalls;
      
      // Atualizar custo total
      this.metrics.totalCost += metrics.cost || 0;
      
      // Atualizar tokens médios
      this.metrics.avgTokensUsed = (
        (this.metrics.avgTokensUsed * (this.metrics.totalCalls - 1)) + 
        (metrics.tokensUsed || 0)
      ) / this.metrics.totalCalls;
      
      // Calcular eficiência
      this.metrics.efficiency = this.metrics.successRate * (1000 / this.metrics.avgResponseTime);
      
      // Adicionar ao histórico
      this.performanceHistory.push({
        timestamp: new Date(),
        ...metrics,
        success: true
      });
      
      // Manter apenas últimos 100 registros
      if (this.performanceHistory.length > 100) {
        this.performanceHistory.shift();
      }
      
    } else {
      const successCalls = this.metrics.totalCalls * this.metrics.successRate;
      this.metrics.successRate = successCalls / this.metrics.totalCalls;
    }
    
    console.log('📊 [DeepSeek] Métricas atualizadas:', {
      calls: this.metrics.totalCalls,
      successRate: (this.metrics.successRate * 100).toFixed(1) + '%',
      avgTime: this.metrics.avgResponseTime.toFixed(0) + 'ms',
      totalCost: '$' + this.metrics.totalCost.toFixed(4),
      efficiency: this.metrics.efficiency.toFixed(2)
    });
  }

  // ===============================================
  // MÉTODOS AUXILIARES (NOVOS E MELHORADOS)
  // ===============================================

  shouldUseAdvancedPrompts(context) {
    // Usar prompts avançados se há contexto rico ou situações específicas
    return !!(
      context.userProfile?.business_type || 
      context.urgency === 'Alta' ||
      context.emotionalState !== 'neutral' ||
      context.complexity > 0.7 ||
      context.advanced
    );
  }

  analyzeContextFactors(context) {
    return {
      hasUserProfile: !!context.userProfile,
      hasHistory: !!(context.history && context.history.length > 0),
      hasProducts: !!(context.products && context.products.length > 0),
      urgencyLevel: context.urgency || 'Normal',
      emotionalState: context.emotionalState || 'neutral',
      complexityScore: context.complexity || 0.5,
      businessType: context.userProfile?.business_type || 'geral'
    };
  }

  buildCustomerProfile(context) {
    return {
      name: context.contact?.name || 'Cliente',
      phone: context.contact?.phone || '',
      interactionCount: context.history?.length || 0,
      lastInteraction: context.history?.[0]?.created_at || null,
      preferredStyle: this.detectCommunicationStyle(context.history || [])
    };
  }

  detectCommunicationStyle(history) {
    if (history.length === 0) return 'unknown';
    
    const recentMessages = history.slice(0, 3);
    const avgLength = recentMessages.reduce((acc, msg) => acc + msg.content.length, 0) / recentMessages.length;
    
    if (avgLength > 100) return 'detailed';
    if (avgLength < 30) return 'brief';
    return 'standard';
  }

  generateSmartFallback(intention, messageContent, context) {
    console.log('🔄 [FALLBACK] Gerando resposta inteligente...');
    
    const businessName = context.userProfile?.business_name || 'nossa empresa';
    const customerName = context.contact?.name || '';
    
    const smartResponses = {
      greeting: `Olá${customerName ? ' ' + customerName : ''}! Obrigado por entrar em contato com ${businessName}. Como posso ajudá-lo hoje?`,
      scheduling: `Olá! Entendi que você gostaria de agendar algo conosco. Vou verificar nossa disponibilidade e retorno com as melhores opções para você.`,
      sales: `Obrigado pelo interesse em nossos ${context.products?.length > 0 ? 'produtos/serviços' : 'serviços'}! Vou preparar informações personalizadas e retorno rapidamente.`,
      support: `Recebi sua solicitação de suporte. Nossa equipe especializada irá analisar e responder com a solução mais adequada.`,
      information: `Obrigado pela sua pergunta. Vou buscar as informações mais atualizadas e detalhadas para você.`,
      complaint: `${customerName ? customerName + ', ' : ''}entendo sua preocupação e lamento qualquer inconveniente. Vamos resolver isso rapidamente.`,
      pricing: `Vou verificar nossos valores mais recentes e enviar uma proposta personalizada com todas as informações.`,
      other: `Recebi sua mensagem e nossa equipe irá analisá-la cuidadosamente. Retornaremos em breve com uma resposta completa.`
    };
    
    return smartResponses[intention] || smartResponses.other;
  }

  // ===============================================
  // MÉTODOS ORIGINAIS MANTIDOS
  // ===============================================

  // Função original mantida para compatibilidade
  buildResponsePrompt(messageContent, intention, context, template) {
    let prompt = `MENSAGEM DO CLIENTE: "${messageContent}"\n\n`;
    
    prompt += `INTENÇÃO DETECTADA: ${intention}\n\n`;
    
    prompt += `CONTEXTO: ${template.user_context}\n\n`;

    // Adicionar contexto do usuário/empresa se disponível
    if (context.userProfile) {
      prompt += `EMPRESA: ${context.userProfile.business_name || 'Não informado'}\n`;
      if (context.userProfile.industry) {
        prompt += `SETOR: ${context.userProfile.industry}\n`;
      }
    }

    // Adicionar produtos/serviços se disponível
    if (context.products && context.products.length > 0) {
      prompt += `\nPRODUTOS/SERVIÇOS DISPONÍVEIS:\n`;
      context.products.slice(0, 5).forEach(product => {
        prompt += `- ${product.name}`;
        if (product.description) {
          prompt += `: ${product.description}`;
        }
        if (product.price) {
          prompt += ` (R$ ${product.price})`;
        }
        prompt += '\n';
      });
    }

    // Adicionar histórico da conversa se disponível (expandido para 5 mensagens)
    if (context.history && context.history.length > 0) {
      prompt += `\nHISTÓRICO DA CONVERSA:\n`;
      context.history.slice(0, 5).forEach(msg => {
        const sender = msg.sender_type === 'contact' ? 'Cliente' : 'Atendente';
        prompt += `${sender}: "${msg.content}"\n`;
      });
    }

    // Adicionar contexto emocional se disponível (NOVO)
    if (context.emotionalState && context.emotionalState !== 'neutral') {
      prompt += `\nESTADO EMOCIONAL DO CLIENTE: ${context.emotionalState}\n`;
    }

    // Adicionar urgência se disponível (NOVO)
    if (context.urgency && context.urgency !== 'Normal') {
      prompt += `\nNÍVEL DE URGÊNCIA: ${context.urgency}\n`;
    }

    prompt += `\nRESPONDA EM PORTUGUÊS BRASILEIRO de forma natural, profissional e prestativa. Máximo 2 parágrafos.`;

    return prompt;
  }

  // Função original mantida
  calculateCost(tokensUsed) {
    // DeepSeek pricing: aproximadamente $0.00014 per 1K tokens
    const pricePerToken = 0.00014 / 1000;
    return parseFloat((tokensUsed * pricePerToken).toFixed(6));
  }

  // ===============================================
  // MÉTODOS PÚBLICOS PARA MONITORAMENTO (NOVOS)
  // ===============================================

  getStatistics() {
    return {
      ...this.metrics,
      avgCostPerCall: this.metrics.totalCost / this.metrics.totalCalls || 0,
      avgCostPerToken: this.metrics.totalCost / (this.metrics.avgTokensUsed * this.metrics.totalCalls) || 0,
      costEfficiency: this.metrics.efficiency / (this.metrics.totalCost || 1),
      lastUpdateTime: new Date(),
      performanceHistory: this.performanceHistory.slice(-10) // Últimos 10 registros
    };
  }

  getPerformanceTrend() {
    if (this.performanceHistory.length < 2) return 'insufficient_data';
    
    const recent = this.performanceHistory.slice(-5);
    const older = this.performanceHistory.slice(-10, -5);
    
    const recentAvg = recent.reduce((acc, r) => acc + r.responseTime, 0) / recent.length;
    const olderAvg = older.reduce((acc, r) => acc + r.responseTime, 0) / older.length || recentAvg;
    
    const improvement = ((olderAvg - recentAvg) / olderAvg) * 100;
    
    if (improvement > 10) return 'improving';
    if (improvement < -10) return 'degrading';
    return 'stable';
  }

  resetStatistics() {
    this.metrics = {
      totalCalls: 0,
      successRate: 0,
      avgResponseTime: 0,
      totalCost: 0,
      avgTokensUsed: 0,
      efficiency: 0
    };
    this.performanceHistory = [];
    console.log('📊 [DeepSeek] Estatísticas resetadas');
  }
}

// ===============================================
// INSTÂNCIA GLOBAL E COMPATIBILIDADE
// ===============================================
const optimizedGenerator = new OptimizedDeepSeekGenerator();

// ===============================================
// FUNÇÕES DE COMPATIBILIDADE (MANTIDAS)
// ===============================================

// Função original mantida para compatibilidade total
async function generateResponse(messageContent, intention, context = {}) {
  return await optimizedGenerator.generateResponse(messageContent, intention, context);
}

// Função original mantida
function getFallbackResponse(intention, messageContent) {
  const fallbackResponses = {
    greeting: "Olá! Muito obrigado por entrar em contato. Como posso ajudá-lo hoje?",
    scheduling: "Entendi que você gostaria de agendar algo. Vou verificar nossa disponibilidade e retorno com as opções em breve.",
    sales: "Obrigado pelo interesse em nossos produtos/serviços! Vou preparar as informações sobre nossas soluções e retorno rapidamente.",
    support: "Recebi sua solicitação de suporte. Nossa equipe técnica irá analisar e responder com a solução adequada.",
    information: "Obrigado pela sua pergunta. Vou buscar as informações detalhadas que você precisa e retorno logo.",
    complaint: "Entendo sua preocupação e lamento qualquer inconveniente. Vamos analisar a situação e trabalhar para resolver rapidamente.",
    pricing: "Vou verificar nossos valores atualizados e enviar uma proposta detalhada com todas as informações de preços.",
    other: "Recebi sua mensagem e nossa equipe irá analisá-la cuidadosamente. Retornaremos em breve com uma resposta adequada."
  };
  
  return fallbackResponses[intention] || fallbackResponses.other;
}

// Função original mantida
function calculateCost(tokensUsed) {
  return optimizedGenerator.calculateCost(tokensUsed);
}

// Função original mantida com melhorias
async function testConnection() {
  try {
    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY.includes('exemplo')) {
      return { success: false, error: 'API key não configurada' };
    }

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'teste de conectividade' }],
        max_tokens: 10
      })
    });

    const result = { 
      success: response.ok, 
      status: response.status,
      error: response.ok ? null : await response.text(),
      timestamp: new Date(),
      responseTime: Date.now()
    };

    console.log('🔍 [DeepSeek] Teste de conexão:', result.success ? 'SUCESSO' : 'FALHA');
    return result;

  } catch (error) {
    console.error('🔍 [DeepSeek] Erro no teste de conexão:', error.message);
    return { success: false, error: error.message, timestamp: new Date() };
  }
}

// ===============================================
// EXPORTAÇÃO COMPLETA
// ===============================================
module.exports = {
  // Funções originais para compatibilidade
  generateResponse,
  testConnection,
  calculateCost,
  getFallbackResponse,
  RESPONSE_TEMPLATES,
  
  // Novas funcionalidades
  OptimizedDeepSeekGenerator,
  
  // Instância otimizada para acesso direto
  generator: optimizedGenerator,
  
  // Métodos de monitoramento
  getStatistics: () => optimizedGenerator.getStatistics(),
  getPerformanceTrend: () => optimizedGenerator.getPerformanceTrend(),
  resetStatistics: () => optimizedGenerator.resetStatistics()
};