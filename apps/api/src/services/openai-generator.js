// ===============================================
// OPENAI GENERATOR OTIMIZADO - VERSÃO 2.7
// GERAÇÃO DE RESPOSTAS PREMIUM COM OPENAI + ANÁLISE AVANÇADA
// ===============================================

// ===============================================
// IMPORTS DOS MÓDULOS AVANÇADOS (NOVOS)
// ===============================================
const { ADVANCED_PROMPTS, SCENARIO_PROMPTS, PERSONALIZATION_ENGINE } = require('./advanced-prompts');

// ===============================================
// CONFIGURAÇÃO OPENAI (MANTIDA)
// ===============================================
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// ===============================================
// TEMPLATES PREMIUM ORIGINAIS MANTIDOS + EXPANDIDOS
// ===============================================
const RESPONSE_TEMPLATES = {
  greeting: {
    system_prompt: "Você é um assistente premium de atendimento ao cliente brasileiro. Seja caloroso, profissional e demonstre excelência no atendimento.",
    user_context: "Responda à saudação com cordialidade excepcional e pergunte como pode proporcionar a melhor experiência."
  },
  scheduling: {
    system_prompt: "Você é um especialista premium em agendamentos. Seja extremamente organizado, oferecendo opções e facilitando o processo.",
    user_context: "Facilite o agendamento oferecendo múltiplas opções, confirme detalhes e garanta a melhor experiência."
  },
  sales: {
    system_prompt: "Você é um consultor de vendas especialista. Seja consultivo, focando em soluções e valor, demonstrando expertise.",
    user_context: "Apresente soluções personalizadas, demonstre valor agregado e conduza uma consultoria de vendas profissional."
  },
  support: {
    system_prompt: "Você é um especialista premium em suporte. Seja proativo, detalhado e ofereça soluções completas e inovadoras.",
    user_context: "Forneça suporte excepcional com soluções detalhadas, alternativas e acompanhamento proativo."
  },
  information: {
    system_prompt: "Você é um consultor de informações premium. Forneça respostas completas, estruturadas e com insights valiosos.",
    user_context: "Entregue informações abrangentes, organizadas e com insights que agreguem valor extra."
  },
  complaint: {
    system_prompt: "Você é um especialista premium em resolução de conflitos. Seja empático, solucionador e transforme problemas em oportunidades.",
    user_context: "Transforme a reclamação em oportunidade de demonstrar excelência, oferecendo soluções que superem expectativas."
  },
  pricing: {
    system_prompt: "Você é um consultor premium de investimentos. Demonstre valor, justifique preços e apresente ROI de forma convincente.",
    user_context: "Apresente investimentos como soluções de valor, demonstrando ROI e benefícios que justifiquem a escolha premium."
  },
  other: {
    system_prompt: "Você é um assistente premium versátil. Seja perspicaz para entender necessidades e oferecer soluções excepcionais.",
    user_context: "Identifique oportunidades de agregar valor e ofereça soluções que demonstrem o padrão premium de atendimento."
  }
};

// ===============================================
// CLASSE OPENAI GENERATOR OTIMIZADA (NOVA)
// ===============================================
class OptimizedOpenAIGenerator {
  
  constructor() {
    this.apiKey = OPENAI_API_KEY;
    this.baseURL = OPENAI_API_URL;
    
    // Métricas premium avançadas (NOVO)
    this.metrics = {
      totalCalls: 0,
      successRate: 0,
      avgResponseTime: 0,
      totalCost: 0,
      avgTokensUsed: 0,
      qualityScore: 0,
      conversionRate: 0,
      premiumEfficiency: 0
    };
    
    // Cache de configurações premium (NOVO)
    this.premiumCache = new Map();
    
    // Histórico de qualidade (NOVO)
    this.qualityHistory = [];
    
    // Análise de conversão (NOVO)
    this.conversionTracking = [];
  }

  // ===============================================
  // FUNÇÃO PRINCIPAL PREMIUM OTIMIZADA
  // ===============================================
  async generateResponse(messageContent, intention, context = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`🎯 [OpenAI PREMIUM] Gerando resposta para: ${intention}`);

      // Verificar API key
      if (!this.apiKey || this.apiKey.includes('exemplo')) {
        throw new Error('OpenAI API key não configurada');
      }

      // NOVO: Otimizar prompt para OpenAI Premium
      const optimizedPrompt = await this.optimizeForOpenAI(messageContent, intention, context);
      
      // NOVO: Configurar parâmetros premium baseado no contexto
      const config = this.buildPremiumConfig(context);
      
      // NOVO: Escolher entre template original ou prompt avançado
      const useAdvancedPrompts = this.shouldUseAdvancedPrompts(context);
      
      let response;
      if (useAdvancedPrompts) {
        response = await this.generateWithAdvancedPrompts(optimizedPrompt, intention, context, config);
      } else {
        response = await this.generateWithOriginalTemplate(messageContent, intention, context, config);
      }
      
      // NOVO: Avaliar qualidade da resposta
      const qualityScore = await this.assessQuality(response, context, intention);
      
      // NOVO: Calcular métricas premium
      const metrics = this.calculatePremiumMetrics(response, startTime, qualityScore);
      
      // NOVO: Atualizar estatísticas premium
      this.updatePremiumStatistics(metrics, true, qualityScore);
      
      console.log(`✅ [OpenAI PREMIUM] Resposta premium gerada com sucesso`);
      console.log(`📊 Métricas Premium: ${metrics.responseTime}ms, qualidade: ${qualityScore.toFixed(2)}, $${metrics.cost}`);
      
      return {
        success: true,
        response: response.content,
        provider: 'openai',
        model: response.model || 'gpt-4o-mini',
        tokensUsed: metrics.tokensUsed,
        costUSD: metrics.cost,
        processingTime: metrics.responseTime,
        quality: qualityScore,
        metadata: {
          optimization: 'quality_focused',
          premiumFeatures: this.analyzePremiumFeatures(response),
          reasoning: response.reasoning || 'Resposta premium com foco em conversão',
          contextualFactors: this.analyzeContextualFactors(context),
          conversionPotential: this.assessConversionPotential(response, intention)
        }
      };
      
    } catch (error) {
      console.error('❌ [OpenAI PREMIUM] Erro na geração:', error);
      
      const processingTime = Date.now() - startTime;
      this.updatePremiumStatistics({ responseTime: processingTime }, false, 0);
      
      // Fallback premium melhorado
      const premiumFallback = this.generatePremiumFallback(intention, messageContent, context);
      
      return {
        success: false,
        response: premiumFallback,
        provider: 'openai',
        model: 'premium-fallback',
        tokensUsed: 0,
        costUSD: 0,
        processingTime,
        quality: 0.7, // Fallback premium tem qualidade boa
        error: error.message,
        metadata: {
          optimization: 'premium_fallback',
          fallbackReason: error.message
        }
      };
    }
  }

  // ===============================================
  // OTIMIZAÇÃO PARA OPENAI PREMIUM (NOVO)
  // ===============================================
  async optimizeForOpenAI(messageContent, intention, context) {
    console.log('⚙️ [NOVO] Otimizando prompt para OpenAI Premium...');
    
    let optimized = messageContent;
    
    // Adicionar instruções específicas para OpenAI Premium
    const instructions = [
      "Forneça resposta detalhada e de alta qualidade.",
      "Use linguagem persuasiva e envolvente quando apropriado.",
      "Demonstre empatia e entendimento profundo do contexto.",
      "Agregue valor com insights e recomendações.",
      "Foque em resultados e benefícios mensuráveis."
    ];
    
    // Adaptar baseado no cenário premium
    if (context.scenario === 'cliente_vip') {
      optimized = `${SCENARIO_PROMPTS?.cliente_vip?.prefixo || 'ATENDIMENTO VIP'}: ${optimized}`;
      instructions.push("Resposta VIP premium com máxima personalização.");
    } else if (context.intention === 'vendas') {
      optimized = `FOCO EM CONVERSÃO PREMIUM: ${optimized}`;
      instructions.push("Use técnicas avançadas de persuasão e storytelling.");
    }
    
    // Adicionar contexto emocional avançado
    if (context.emotion === 'frustrated') {
      optimized += "\n\nContexto: Cliente frustrado - demonstre empatia excepcional e ofereça soluções que superem expectativas.";
      instructions.push("Transforme frustração em satisfação com soluções proativas.");
    } else if (context.emotion === 'excited') {
      optimized += "\n\nContexto: Cliente entusiasmado - amplifique o entusiasmo e direcione para ação.";
      instructions.push("Canalize entusiasmo para conversão efetiva.");
    }
    
    // Contexto de valor do cliente
    if (context.userValue > 1000) {
      instructions.push("Cliente de alto valor - atendimento premium personalizado.");
    }
    
    return {
      content: optimized,
      instructions: instructions,
      metadata: {
        originalLength: messageContent.length,
        optimizedLength: optimized.length,
        premiumFeatures: instructions.length,
        valueContext: context.userValue || 0
      }
    };
  }

  // ===============================================
  // CONFIGURAÇÃO PREMIUM (NOVO)
  // ===============================================
  buildPremiumConfig(context) {
    console.log('⚙️ [NOVO] Construindo configuração premium...');
    
    const baseConfig = {
      model: 'gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 400,
      top_p: 0.9,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    };

    // Otimizar para qualidade máxima baseado no contexto
    if (context.intention === 'vendas' || context.userValue > 1000) {
      baseConfig.model = 'gpt-4o'; // Usar modelo superior para vendas e VIPs
      baseConfig.max_tokens = 500;
      baseConfig.temperature = 0.9;
      console.log('👑 Configuração VIP - Modelo GPT-4o');
    }
    
    // Adaptar para contexto complexo
    if (context.complexity > 0.7) {
      baseConfig.max_tokens = 600;
      baseConfig.temperature = 0.7; // Mais focado para complexidade
      console.log('🧠 Configuração para alta complexidade');
    }
    
    // Configuração para diferentes tipos de negócio
    if (context.userProfile?.business_type === 'consulting') {
      baseConfig.temperature = 0.9; // Mais criativo para consultoria
      baseConfig.presence_penalty = 0.2; // Evitar repetições
      console.log('💼 Configuração para consultoria');
    } else if (context.userProfile?.business_type === 'healthcare') {
      baseConfig.temperature = 0.6; // Mais conservador para saúde
      baseConfig.max_tokens = 450;
      console.log('🏥 Configuração para área da saúde');
    }
    
    // Urgência alta = resposta mais direta
    if (context.urgency === 'Alta') {
      baseConfig.max_tokens = 300;
      baseConfig.temperature = 0.7;
      console.log('⚡ Configuração para urgência alta');
    }
    
    return baseConfig;
  }

  // ===============================================
  // GERAÇÃO COM PROMPTS AVANÇADOS (NOVO)
  // ===============================================
  async generateWithAdvancedPrompts(optimizedPrompt, intention, context, config) {
    console.log('🚀 [NOVO] Usando prompts avançados premium...');
    
    try {
      // Usar sistema de prompts avançados se disponível
      let systemPrompt, userPrompt;
      
      if (ADVANCED_PROMPTS && typeof ADVANCED_PROMPTS.buildContextualPrompt === 'function') {
        const userProfile = context.userProfile || {};
        const customerProfile = this.buildPremiumCustomerProfile(context);
        const conversationHistory = context.history || [];
        
        const contextualPrompt = ADVANCED_PROMPTS.buildContextualPrompt(
          userProfile,
          customerProfile,
          intention,
          conversationHistory
        );
        
        // Enriquecer com contexto premium
        systemPrompt = this.enhancePromptWithPremiumContext(contextualPrompt, context);
        userPrompt = `${optimizedPrompt.content}\n\nInstruções Premium: ${optimizedPrompt.instructions.join(' ')}`;
        
      } else {
        // Fallback para templates premium originais
        const template = RESPONSE_TEMPLATES[intention] || RESPONSE_TEMPLATES.other;
        systemPrompt = this.enhancePromptWithPremiumContext(template.system_prompt, context);
        userPrompt = this.buildResponsePrompt(optimizedPrompt.content, intention, context, template);
      }
      
      return await this.callOpenAIAPI(systemPrompt, userPrompt, config);
      
    } catch (error) {
      console.error('❌ Erro com prompts avançados, usando template premium:', error.message);
      return await this.generateWithOriginalTemplate(optimizedPrompt.content, intention, context, config);
    }
  }

  // ===============================================
  // GERAÇÃO COM TEMPLATE PREMIUM ORIGINAL (MANTIDA)
  // ===============================================
  async generateWithOriginalTemplate(messageContent, intention, context, config) {
    console.log('📝 [TEMPLATE] Usando template premium original...');
    
    // Obter template premium para a intenção
    const template = RESPONSE_TEMPLATES[intention] || RESPONSE_TEMPLATES.other;
    
    // Construir prompt premium contextualizado
    const prompt = this.buildResponsePrompt(messageContent, intention, context, template);
    
    // Enriquecer sistema prompt com contexto
    const enhancedSystemPrompt = this.enhancePromptWithPremiumContext(template.system_prompt, context);
    
    return await this.callOpenAIAPI(enhancedSystemPrompt, prompt, config);
  }

  // ===============================================
  // CHAMADA PARA API PREMIUM (MELHORADA)
  // ===============================================
  async callOpenAIAPI(systemPrompt, userPrompt, config) {
    console.log('🌐 [API] Fazendo chamada premium para OpenAI...');
    
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
      frequency_penalty: config.frequency_penalty,
      presence_penalty: config.presence_penalty
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
      throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const generatedResponse = data.choices[0]?.message?.content;

    if (!generatedResponse) {
      throw new Error('Resposta vazia da API OpenAI');
    }

    return {
      content: generatedResponse.trim(),
      model: data.model || config.model,
      usage: data.usage || { total_tokens: 0 },
      reasoning: "Resposta premium gerada com foco em qualidade e conversão",
      metadata: {
        requestBody: requestBody,
        responseStatus: response.status,
        premiumFeatures: this.detectPremiumFeatures(generatedResponse)
      }
    };
  }

  // ===============================================
  // AVALIAÇÃO DE QUALIDADE PREMIUM (NOVO)
  // ===============================================
  async assessQuality(response, context, intention) {
    console.log('📊 [NOVO] Avaliando qualidade premium...');
    
    let qualityScore = 0.8; // Base alta para OpenAI Premium
    
    // Fatores que aumentam qualidade
    if (response.content.length > 200) qualityScore += 0.1;
    if (response.content.length < 500) qualityScore += 0.05; // Não muito longo
    
    // Análise de conteúdo premium
    const premiumIndicators = [
      'benefício', 'solução', 'resultado', 'valor', 'investimento', 
      'oportunidade', 'estratégia', 'otimização', 'excelência'
    ];
    
    const contentLower = response.content.toLowerCase();
    premiumIndicators.forEach(indicator => {
      if (contentLower.includes(indicator)) qualityScore += 0.02;
    });
    
    // Bônus para diferentes tipos de intenção
    if (intention === 'vendas' && contentLower.includes('roi')) qualityScore += 0.05;
    if (intention === 'support' && contentLower.includes('solução')) qualityScore += 0.05;
    if (intention === 'scheduling' && contentLower.includes('disponibilidade')) qualityScore += 0.03;
    
    // Análise de estrutura
    const sentences = response.content.split(/[.!?]/).filter(s => s.trim().length > 0);
    if (sentences.length >= 2 && sentences.length <= 4) qualityScore += 0.05; // Bem estruturado
    
    // Análise de tom premium
    const premiumTone = ['profissional', 'especializado', 'consultivo', 'personalizado'];
    premiumTone.forEach(tone => {
      if (contentLower.includes(tone)) qualityScore += 0.01;
    });
    
    // Penalizações
    if (response.content.length < 100) qualityScore -= 0.1; // Muito curto
    if (contentLower.includes('erro') || contentLower.includes('problema')) qualityScore -= 0.05;
    
    return Math.min(qualityScore, 1.0);
  }

  // ===============================================
  // CÁLCULO DE MÉTRICAS PREMIUM (NOVO)
  // ===============================================
  calculatePremiumMetrics(response, startTime, qualityScore) {
    const responseTime = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens || 0;
    const cost = this.calculateCost(tokensUsed, response.model);
    
    return {
      responseTime,
      tokensUsed,
      cost,
      qualityScore,
      efficiency: tokensUsed / responseTime, // tokens per ms
      costPerToken: cost / tokensUsed || 0,
      qualityPerDollar: qualityScore / cost || 0,
      premiumIndex: (qualityScore * 1000) / responseTime, // qualidade por tempo
      contentRichness: response.content.length / tokensUsed || 0
    };
  }

  // ===============================================
  // ATUALIZAÇÃO DE ESTATÍSTICAS PREMIUM (NOVO)
  // ===============================================
  updatePremiumStatistics(metrics, success, qualityScore) {
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
      
      // Atualizar score de qualidade médio
      this.metrics.qualityScore = (
        (this.metrics.qualityScore * (this.metrics.totalCalls - 1)) + 
        qualityScore
      ) / this.metrics.totalCalls;
      
      // Calcular eficiência premium
      this.metrics.premiumEfficiency = this.metrics.qualityScore * this.metrics.successRate * (1000 / this.metrics.avgResponseTime);
      
      // Adicionar ao histórico de qualidade
      this.qualityHistory.push({
        timestamp: new Date(),
        quality: qualityScore,
        responseTime: metrics.responseTime,
        cost: metrics.cost,
        success: true
      });
      
      // Manter apenas últimos 50 registros de qualidade
      if (this.qualityHistory.length > 50) {
        this.qualityHistory.shift();
      }
      
    } else {
      const successCalls = this.metrics.totalCalls * this.metrics.successRate;
      this.metrics.successRate = successCalls / this.metrics.totalCalls;
    }
    
    console.log('📊 [OpenAI Premium] Métricas atualizadas:', {
      calls: this.metrics.totalCalls,
      successRate: (this.metrics.successRate * 100).toFixed(1) + '%',
      avgTime: this.metrics.avgResponseTime.toFixed(0) + 'ms',
      totalCost: '$' + this.metrics.totalCost.toFixed(4),
      qualityScore: this.metrics.qualityScore.toFixed(3),
      premiumEfficiency: this.metrics.premiumEfficiency.toFixed(2)
    });
  }

  // ===============================================
  // MÉTODOS AUXILIARES PREMIUM (NOVOS)
  // ===============================================

  shouldUseAdvancedPrompts(context) {
    // Usar prompts avançados para contextos premium
    return !!(
      context.userProfile?.business_type || 
      context.intention === 'vendas' ||
      context.userValue > 500 ||
      context.urgency === 'Alta' ||
      context.emotionalState !== 'neutral' ||
      context.complexity > 0.6 ||
      context.advanced
    );
  }

  enhancePromptWithPremiumContext(basePrompt, context) {
    let enhanced = basePrompt;
    
    // Adicionar contexto de valor do cliente
    if (context.userValue > 1000) {
      enhanced += " Trate como cliente VIP de alto valor.";
    } else if (context.userValue > 500) {
      enhanced += " Cliente valorizado - atendimento premium.";
    }
    
    // Contexto emocional
    if (context.emotionalState === 'frustrated') {
      enhanced += " IMPORTANTE: Cliente frustrado - seja excepcionalmente empático e solucionador.";
    } else if (context.emotionalState === 'excited') {
      enhanced += " Cliente entusiasmado - mantenha energia positiva e direcione para ação.";
    }
    
    // Contexto de urgência
    if (context.urgency === 'Alta') {
      enhanced += " URGENTE: Resposta rápida mas mantendo qualidade premium.";
    }
    
    return enhanced;
  }

  buildPremiumCustomerProfile(context) {
    return {
      name: context.contact?.name || 'Cliente Premium',
      phone: context.contact?.phone || '',
      value: context.userValue || 0,
      interactionCount: context.history?.length || 0,
      lastInteraction: context.history?.[0]?.created_at || null,
      communicationStyle: this.detectPremiumCommunicationStyle(context.history || []),
      lifecycle: context.contact?.lifecycle_stage || 'prospect',
      preferences: this.extractPreferences(context.history || [])
    };
  }

  detectPremiumCommunicationStyle(history) {
    if (history.length === 0) return 'unknown';
    
    const recentMessages = history.slice(0, 3);
    const avgLength = recentMessages.reduce((acc, msg) => acc + msg.content.length, 0) / recentMessages.length;
    const hasQuestions = recentMessages.some(msg => msg.content.includes('?'));
    
    if (avgLength > 150 && hasQuestions) return 'detailed_inquirer';
    if (avgLength > 100) return 'detailed';
    if (avgLength < 30) return 'brief';
    return 'standard';
  }

  extractPreferences(history) {
    const preferences = {
      timePreference: 'flexible',
      communicationTone: 'professional',
      detailLevel: 'medium'
    };
    
    // Análise simples de preferências baseada no histórico
    const allText = history.map(msg => msg.content.toLowerCase()).join(' ');
    
    if (allText.includes('manhã') || allText.includes('cedo')) {
      preferences.timePreference = 'morning';
    } else if (allText.includes('tarde') || allText.includes('depois')) {
      preferences.timePreference = 'afternoon';
    }
    
    if (allText.includes('rápido') || allText.includes('breve')) {
      preferences.detailLevel = 'brief';
    } else if (allText.includes('detalhes') || allText.includes('explicar')) {
      preferences.detailLevel = 'detailed';
    }
    
    return preferences;
  }

  analyzePremiumFeatures(response) {
    const features = [];
    const content = response.content.toLowerCase();
    
    if (content.includes('benefício')) features.push('benefits_focused');
    if (content.includes('solução')) features.push('solution_oriented');
    if (content.includes('personalizado')) features.push('personalized');
    if (content.includes('estratégia')) features.push('strategic');
    if (content.includes('resultado')) features.push('results_focused');
    if (content.includes('investimento')) features.push('investment_perspective');
    
    return features;
  }

  analyzeContextualFactors(context) {
    return {
      hasUserProfile: !!context.userProfile,
      hasHistory: !!(context.history && context.history.length > 0),
      hasProducts: !!(context.products && context.products.length > 0),
      userValue: context.userValue || 0,
      urgencyLevel: context.urgency || 'Normal',
      emotionalState: context.emotionalState || 'neutral',
      complexityScore: context.complexity || 0.5,
      businessType: context.userProfile?.business_type || 'geral',
      isVIP: (context.userValue || 0) > 1000
    };
  }

  assessConversionPotential(response, intention) {
    let potential = 0.5; // Base
    
    const content = response.content.toLowerCase();
    
    // Indicadores de alta conversão
    if (intention === 'vendas') {
      if (content.includes('benefício')) potential += 0.2;
      if (content.includes('resultado')) potential += 0.15;
      if (content.includes('roi')) potential += 0.1;
      if (content.includes('investimento')) potential += 0.1;
    }
    
    if (intention === 'scheduling') {
      if (content.includes('disponibilidade')) potential += 0.2;
      if (content.includes('confirmar')) potential += 0.15;
    }
    
    // Elementos persuasivos
    if (content.includes('oportunidade')) potential += 0.1;
    if (content.includes('exclusivo')) potential += 0.05;
    if (content.includes('personalizado')) potential += 0.05;
    
    return Math.min(potential, 1.0);
  }

  detectPremiumFeatures(content) {
    const features = [];
    const contentLower = content.toLowerCase();
    
    if (contentLower.length > 300) features.push('comprehensive');
    if (contentLower.includes('estratégia')) features.push('strategic');
    if (contentLower.includes('personalizado')) features.push('personalized');
    if (contentLower.includes('premium')) features.push('premium_language');
    if (contentLower.includes('excelência')) features.push('excellence_focused');
    
    return features;
  }

  generatePremiumFallback(intention, messageContent, context) {
    console.log('🔄 [FALLBACK] Gerando resposta premium inteligente...');
    
    const businessName = context.userProfile?.business_name || 'nossa empresa';
    const customerName = context.contact?.name || '';
    const isVIP = (context.userValue || 0) > 1000;
    
    const vipPrefix = isVIP ? "Como cliente VIP, " : "";
    const personalPrefix = customerName ? `${customerName}, ` : "";
    
    const premiumSmartResponses = {
      greeting: `${personalPrefix}é um prazer excepcional recebê-lo! ${vipPrefix}estou aqui para proporcionar uma experiência premium. Como posso transformar seu dia em algo extraordinário?`,
      scheduling: `${personalPrefix}${vipPrefix}vou priorizar seu agendamento. Nossa agenda premium será ajustada para oferecer as melhores opções que se alinhem perfeitamente com suas necessidades.`,
      sales: `${personalPrefix}obrigado por considerar ${businessName}! ${vipPrefix}vou preparar uma apresentação executiva personalizada que demonstre exatamente como nossas soluções premium podem revolucionar seus resultados.`,
      support: `${personalPrefix}${vipPrefix}nossa equipe especializada já está mobilizada para seu caso. Vamos não apenas resolver, mas implementar melhorias que otimizem sua experiência futura.`,
      information: `${personalPrefix}${vipPrefix}vou compilar um relatório abrangente com insights estratégicos que vão muito além da informação solicitada. Prepare-se para uma análise premium.`,
      complaint: `${personalPrefix}${vipPrefix}agradeço a oportunidade de demonstrar nossa excelência operacional. Esta situação será transformada em uma experiência memorável de superação de expectativas.`,
      pricing: `${personalPrefix}${vipPrefix}vou preparar uma proposta de investimento estratégica que demonstre claramente o ROI e valor agregado de nossas soluções premium personalizadas.`,
      other: `${personalPrefix}${vipPrefix}nossa equipe executiva está mobilizada para criar uma solução premium sob medida que não apenas atenda, mas supere significativamente suas expectativas.`
    };
    
    return premiumSmartResponses[intention] || premiumSmartResponses.other;
  }

  // ===============================================
  // MÉTODOS ORIGINAIS MANTIDOS PARA COMPATIBILIDADE
  // ===============================================

  // Função original mantida
  buildResponsePrompt(messageContent, intention, context, template) {
    let prompt = `MENSAGEM DO CLIENTE: "${messageContent}"\n\n`;
    
    prompt += `INTENÇÃO DETECTADA: ${intention}\n\n`;
    
    prompt += `CONTEXTO PREMIUM: ${template.user_context}\n\n`;

    // Adicionar contexto do usuário/empresa se disponível
    if (context.userProfile) {
      prompt += `EMPRESA/PROFISSIONAL: ${context.userProfile.business_name || 'Cliente Premium'}\n`;
      if (context.userProfile.industry) {
        prompt += `SETOR: ${context.userProfile.industry}\n`;
      }
      if (context.userProfile.description) {
        prompt += `DESCRIÇÃO: ${context.userProfile.description}\n`;
      }
    }

    // Adicionar produtos/serviços premium se disponível (expandido para 10)
    if (context.products && context.products.length > 0) {
      prompt += `\nSOLUÇÕES PREMIUM DISPONÍVEIS:\n`;
      context.products.slice(0, 10).forEach(product => {
        prompt += `- ${product.name}`;
        if (product.description) {
          prompt += `: ${product.description}`;
        }
        if (product.price) {
          prompt += ` (Investimento: R$ ${product.price})`;
        }
        if (product.benefits) {
          prompt += ` - Benefícios: ${product.benefits}`;
        }
        prompt += '\n';
      });
    }

    // Adicionar histórico premium da conversa se disponível (expandido para 7)
    if (context.history && context.history.length > 0) {
      prompt += `\nHISTÓRICO DA CONVERSA:\n`;
      context.history.slice(0, 7).forEach(msg => {
        const sender = msg.sender_type === 'contact' ? 'Cliente' : 'Consultor Premium';
        prompt += `${sender}: "${msg.content}"\n`;
      });
    }

    // Adicionar informações do contato se disponível (expandido)
    if (context.contact) {
      prompt += `\nPERFIL PREMIUM DO CLIENTE:\n`;
      if (context.contact.name && !context.contact.name.includes('Contato ')) {
        prompt += `Nome: ${context.contact.name}\n`;
      }
      if (context.contact.lifecycle_stage) {
        prompt += `Estágio: ${context.contact.lifecycle_stage}\n`;
      }
      if (context.contact.customer_value) {
        prompt += `Valor do Cliente: R$ ${context.contact.customer_value}\n`;
      }
      if (context.userValue > 1000) {
        prompt += `Status: Cliente VIP\n`;
      }
    }

    // Adicionar contexto avançado (NOVO)
    if (context.emotionalState && context.emotionalState !== 'neutral') {
      prompt += `\nESTADO EMOCIONAL: ${context.emotionalState}\n`;
    }
    
    if (context.urgency && context.urgency !== 'Normal') {
      prompt += `URGÊNCIA: ${context.urgency}\n`;
    }

    prompt += `\nRESPONDA EM PORTUGUÊS BRASILEIRO de forma premium: natural, consultiva, agregando valor máximo e demonstrando expertise excepcional. Máximo 3 parágrafos concisos, impactantes e orientados a resultados.`;

    return prompt;
  }

  // Função original mantida
  calculateCost(tokensUsed, model = 'gpt-4o-mini') {
    // OpenAI pricing atualizado
    const pricing = {
      'gpt-4o': { input: 0.005, output: 0.015 }, // $5/$15 per 1K tokens
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 } // $0.15/$0.6 per 1K tokens
    };
    
    const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
    
    // Estimativa: 30% input, 70% output
    const inputTokens = Math.floor(tokensUsed * 0.3);
    const outputTokens = Math.floor(tokensUsed * 0.7);
    
    const cost = (inputTokens / 1000 * modelPricing.input) + (outputTokens / 1000 * modelPricing.output);
    
    return parseFloat(cost.toFixed(6));
  }

  // ===============================================
  // MÉTODOS PÚBLICOS PARA MONITORAMENTO PREMIUM (NOVOS)
  // ===============================================

  getStatistics() {
    return {
      ...this.metrics,
      avgCostPerCall: this.metrics.totalCost / this.metrics.totalCalls || 0,
      qualityPerDollar: this.metrics.qualityScore / (this.metrics.totalCost / this.metrics.totalCalls) || 0,
      premiumROI: this.calculatePremiumROI(),
      lastUpdateTime: new Date(),
      qualityHistory: this.qualityHistory.slice(-10), // Últimos 10 registros
      conversionMetrics: this.calculateConversionMetrics()
    };
  }

  calculatePremiumROI() {
    if (this.metrics.totalCalls === 0) return 0;
    
    // ROI baseado em qualidade vs custo
    const qualityValue = this.metrics.qualityScore * 100; // Valor da qualidade
    const costValue = this.metrics.totalCost;
    
    return costValue > 0 ? ((qualityValue - costValue) / costValue * 100) : 0;
  }

  calculateConversionMetrics() {
    const recentQuality = this.qualityHistory.slice(-10);
    if (recentQuality.length === 0) return { trend: 'no_data', avgQuality: 0 };
    
    const avgQuality = recentQuality.reduce((acc, q) => acc + q.quality, 0) / recentQuality.length;
    
    // Tendência de qualidade
    const first5 = recentQuality.slice(0, 5);
    const last5 = recentQuality.slice(-5);
    
    const firstAvg = first5.reduce((acc, q) => acc + q.quality, 0) / first5.length;
    const lastAvg = last5.reduce((acc, q) => acc + q.quality, 0) / last5.length;
    
    let trend = 'stable';
    if (lastAvg > firstAvg + 0.05) trend = 'improving';
    if (lastAvg < firstAvg - 0.05) trend = 'declining';
    
    return { trend, avgQuality: avgQuality.toFixed(3) };
  }

  getQualityTrend() {
    return this.calculateConversionMetrics().trend;
  }

  resetStatistics() {
    this.metrics = {
      totalCalls: 0,
      successRate: 0,
      avgResponseTime: 0,
      totalCost: 0,
      avgTokensUsed: 0,
      qualityScore: 0,
      conversionRate: 0,
      premiumEfficiency: 0
    };
    this.qualityHistory = [];
    this.conversionTracking = [];
    console.log('📊 [OpenAI Premium] Estatísticas resetadas');
  }
}

// ===============================================
// INSTÂNCIA GLOBAL E COMPATIBILIDADE
// ===============================================
const optimizedGenerator = new OptimizedOpenAIGenerator();

// ===============================================
// FUNÇÕES DE COMPATIBILIDADE (MANTIDAS)
// ===============================================

// Função original mantida para compatibilidade total
async function generateResponse(messageContent, intention, context = {}) {
  return await optimizedGenerator.generateResponse(messageContent, intention, context);
}

// Função original mantida
function getPremiumFallbackResponse(intention, messageContent) {
  const premiumFallbackResponses = {
    greeting: "Olá! É um prazer recebê-lo. Estou aqui para proporcionar a melhor experiência possível. Como posso transformar seu dia em algo excepcional?",
    scheduling: "Entendi seu interesse em agendamento. Vou verificar nossas melhores opções de horários e retornar com alternativas que se adaptem perfeitamente à sua agenda.",
    sales: "Obrigado por considerar nossas soluções premium! Vou preparar uma apresentação personalizada que demonstre exatamente como podemos agregar valor ao seu negócio.",
    support: "Recebi sua solicitação e nossa equipe especializada já está mobilizada. Vamos não apenas resolver, mas otimizar sua experiência com soluções proativas.",
    information: "Excelente pergunta! Vou compilar informações abrangentes e insights valiosos que vão além do que você esperava. Prepare-se para uma resposta completa.",
    complaint: "Entendo completamente sua preocupação e agradeço a oportunidade de demonstrar nossa excelência. Vamos transformar esta situação em uma experiência memorável.",
    pricing: "Vou preparar uma proposta de investimento detalhada que demonstre claramente o retorno e valor agregado de nossas soluções premium.",
    other: "Recebi sua mensagem e nossa equipe especializada está mobilizada para criar uma solução personalizada que supere suas expectativas."
  };
  
  return premiumFallbackResponses[intention] || premiumFallbackResponses.other;
}

// Função original mantida
function calculateCost(tokensUsed) {
  return optimizedGenerator.calculateCost(tokensUsed);
}

// Função original mantida com melhorias
async function testConnection() {
  try {
    if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('exemplo')) {
      return { success: false, error: 'API key não configurada' };
    }

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'teste de conectividade premium' }],
        max_tokens: 10
      })
    });

    const result = { 
      success: response.ok, 
      status: response.status,
      error: response.ok ? null : await response.text(),
      timestamp: new Date(),
      model: 'gpt-4o-mini'
    };

    console.log('🔍 [OpenAI Premium] Teste de conexão:', result.success ? 'SUCESSO' : 'FALHA');
    return result;

  } catch (error) {
    console.error('🔍 [OpenAI Premium] Erro no teste de conexão:', error.message);
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
  getPremiumFallbackResponse,
  RESPONSE_TEMPLATES,
  
  // Novas funcionalidades
  OptimizedOpenAIGenerator,
  
  // Instância otimizada para acesso direto
  generator: optimizedGenerator,
  
  // Métodos de monitoramento premium
  getStatistics: () => optimizedGenerator.getStatistics(),
  getQualityTrend: () => optimizedGenerator.getQualityTrend(),
  resetStatistics: () => optimizedGenerator.resetStatistics()
};