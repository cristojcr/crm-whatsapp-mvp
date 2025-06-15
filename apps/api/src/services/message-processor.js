// ===============================================
// MESSAGE PROCESSOR OTIMIZADO - VERSÃO 2.7
// SISTEMA DUAL IA COM ANÁLISE CONTEXTUAL AVANÇADA
// ===============================================
const { createClient } = require('@supabase/supabase-js');

// ===============================================
// IMPORTS DOS MÓDULOS BÁSICOS (EXISTENTES)
// ===============================================
const intentionAnalyzer = require('./intention-analyzer');
const aiRouter = require('./ai-router');
const deepseekGenerator = require('./deepseek-generator');
const openaiGenerator = require('./openai-generator');

// ===============================================
// IMPORTS DOS MÓDULOS AVANÇADOS (ATIVIDADE 2.7)
// ===============================================
const { ADVANCED_PROMPTS, PERSONALIZATION_ENGINE } = require('./advanced-prompts');
const { IntelligentRouter } = require('./intelligent-router');
const { ContextAnalyzer, ConversationMemory } = require('./context-analyzer');
const { FallbackSystem, CreditBasedFallback, RetrySystem, HealthMonitor } = require('./fallback-system');
const { CostOptimizer, BudgetOptimizer, CostAlertSystem } = require('./cost-optimizer');

// ===============================================
// CONFIGURAÇÃO DO SUPABASE
// ===============================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===============================================
// CLASSE PROCESSADOR OTIMIZADO
// ===============================================
class OptimizedMessageProcessor {
  
  constructor() {
    // Módulos básicos mantidos
    this.supabase = supabase;
    
    // Novos módulos avançados
    this.intelligentRouter = new IntelligentRouter();
    this.contextAnalyzer = new ContextAnalyzer();
    this.conversationMemory = new ConversationMemory();
    this.fallbackSystem = new FallbackSystem();
    this.creditBasedFallback = new CreditBasedFallback();
    this.retrySystem = new RetrySystem();
    this.healthMonitor = new HealthMonitor();
    this.costOptimizer = new CostOptimizer();
    this.budgetOptimizer = new BudgetOptimizer();
    this.costAlertSystem = new CostAlertSystem();
    
    // Cache para otimização
    this.contextCache = new Map();
    this.processingMetrics = {
      totalProcessed: 0,
      successRate: 0,
      avgProcessingTime: 0,
      totalCost: 0
    };
  }

  // ===============================================
  // PROCESSAMENTO PRINCIPAL OTIMIZADO
  // ===============================================
  async processMessage(messageId, userId = null) {
    const startTime = Date.now();
    console.log(`🚀 [OTIMIZADO] Iniciando processamento: ${messageId}`);

    try {
      // ETAPA 1: Buscar contexto básico (mantido do original)
      const basicContext = await this.getMessageContext(messageId, userId);
      if (!basicContext) {
        throw new Error('Mensagem não encontrada');
      }

      // ETAPA 2: Análise de contexto avançada (NOVO)
      const advancedContext = await this.analyzeAdvancedContext(basicContext);
      
      // ETAPA 3: Otimização de custos (NOVO)
      const costStrategy = await this.optimizeCosts(basicContext.user.id, advancedContext);
      
      // ETAPA 4: Análise de intenção melhorada
      const intentionResult = await this.analyzeIntentionAdvanced(basicContext, advancedContext);
      console.log(`🧠 [OTIMIZADO] Intenção: ${intentionResult.intention} (confiança: ${intentionResult.confidence})`);

      // ETAPA 5: Roteamento inteligente multi-dimensional (NOVO)
      const routing = await this.intelligentRouting(intentionResult, basicContext, advancedContext, costStrategy);
      console.log(`🔀 [OTIMIZADO] Roteamento: ${routing.provider} (reasoning: ${routing.reasoning})`);

      // ETAPA 6: Verificação de créditos melhorada
      const creditCheck = await this.checkUserCreditsAdvanced(basicContext.user.id, routing);
      if (!creditCheck.hasCredits) {
        console.log('❌ [OTIMIZADO] Créditos insuficientes');
        return { success: false, error: 'insufficient_credits', suggestion: creditCheck.suggestion };
      }

      // ETAPA 7: Geração de prompt contextualizado (NOVO)
      const contextualPrompt = await this.buildContextualPrompt(basicContext, advancedContext, intentionResult, routing);
      
      // ETAPA 8: Geração de resposta com fallback avançado (NOVO)
      const responseResult = await this.generateResponseWithAdvancedFallback(
        routing, 
        contextualPrompt, 
        basicContext, 
        advancedContext, 
        intentionResult
      );
      console.log(`💬 [OTIMIZADO] Resposta: ${responseResult.success ? 'sucesso' : 'fallback'} (${responseResult.provider})`);

      // ETAPA 9: Salvar contexto na memória conversacional (NOVO)
      await this.saveContextToMemory(basicContext.conversation.id, advancedContext, responseResult);

      // ETAPA 10: Salvar interação melhorada
      await this.saveAdvancedInteraction(basicContext, advancedContext, intentionResult, responseResult, routing);

      // ETAPA 11: Atualizar créditos e métricas
      await this.updateCreditsAndMetrics(basicContext.user.id, routing.credits, responseResult);

      // ETAPA 12: Verificar alertas de custo (NOVO)
      await this.checkCostAlerts(basicContext.user.id, routing.credits);

      const processingTime = Date.now() - startTime;
      console.log(`✅ [OTIMIZADO] Processamento concluído em ${processingTime}ms`);

      // Atualizar métricas globais
      this.updateGlobalMetrics(processingTime, responseResult.success);

      return {
        success: true,
        intention: intentionResult.intention,
        confidence: intentionResult.confidence,
        response: responseResult.response,
        provider: responseResult.provider,
        processingTime,
        optimization: {
          contextAnalysis: advancedContext.advanced.summary,
          costStrategy: costStrategy.recommendation,
          qualityScore: responseResult.quality || 0.8
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ [OTIMIZADO] Erro no processamento:', error.message);
      
      // Atualizar métricas de erro
      this.updateGlobalMetrics(processingTime, false);
      
      return {
        success: false,
        error: error.message,
        processingTime,
        fallbackUsed: true
      };
    }
  }

  // ===============================================
  // ANÁLISE DE CONTEXTO AVANÇADA (NOVO)
  // ===============================================
  async analyzeAdvancedContext(basicContext) {
    console.log('🧠 [NOVO] Analisando contexto avançado...');
    
    try {
      // Verificar cache primeiro
      const cacheKey = `context_${basicContext.conversation.id}_${basicContext.message.id}`;
      if (this.contextCache.has(cacheKey)) {
        console.log('📦 Cache hit - contexto recuperado');
        return this.contextCache.get(cacheKey);
      }

      // Análise avançada completa
      const [
        advancedAnalysis,
        conversationContext,
        emotionalAnalysis
      ] = await Promise.all([
        this.contextAnalyzer.analyzeAdvancedContext(
          basicContext.message.id,
          basicContext.conversation.id,
          basicContext.user.id
        ),
        this.conversationMemory.getContext(basicContext.conversation.id),
        this.analyzeEmotionalContext(basicContext)
      ]);

      const fullContext = {
        ...basicContext,
        advanced: {
          analysis: advancedAnalysis,
          conversation: conversationContext,
          emotional: emotionalAnalysis,
          summary: this.generateContextSummary(advancedAnalysis, emotionalAnalysis)
        },
        timestamp: new Date()
      };

      // Salvar no cache (TTL 30 minutos)
      this.contextCache.set(cacheKey, fullContext);
      setTimeout(() => this.contextCache.delete(cacheKey), 30 * 60 * 1000);

      return fullContext;

    } catch (error) {
      console.error('❌ Erro na análise avançada:', error);
      
      // Fallback: contexto básico
      return {
        ...basicContext,
        advanced: {
          analysis: null,
          conversation: {},
          emotional: { state: 'neutral', confidence: 0.5 },
          summary: 'Análise básica - erro na análise avançada'
        }
      };
    }
  }

  // ===============================================
  // OTIMIZAÇÃO DE CUSTOS (NOVO)
  // ===============================================
  async optimizeCosts(userId, context) {
    console.log('💰 [NOVO] Otimizando custos...');
    
    try {
      const [
        userBudget,
        currentUsage,
        loadMetrics
      ] = await Promise.all([
        this.getUserBudgetInfo(userId),
        this.getCurrentUsage(userId),
        this.getCurrentLoadMetrics()
      ]);

      const optimization = await this.costOptimizer.optimizeCostByLoad(loadMetrics, userBudget.remaining);
      const budgetStrategy = await this.budgetOptimizer.optimizeByUserBudget(userId, userBudget.remaining, currentUsage.projected);

      return {
        recommendation: optimization.recommendation,
        budgetStrategy: budgetStrategy,
        reasoning: optimization.reason,
        savingsEstimate: optimization.savingsEstimate,
        riskLevel: userBudget.remaining < userBudget.monthly * 0.2 ? 'high' : 'low'
      };

    } catch (error) {
      console.error('❌ Erro na otimização de custos:', error);
      
      return {
        recommendation: 'balanced',
        reasoning: 'Erro na análise - usando estratégia balanceada',
        riskLevel: 'medium'
      };
    }
  }

  // ===============================================
  // ANÁLISE DE INTENÇÃO MELHORADA
  // ===============================================
  async analyzeIntentionAdvanced(basicContext, advancedContext) {
    try {
      console.log(`🧠 [MELHORADO] Analisando intenção: ${basicContext.message.content}`);
      
      // Usar análise básica existente como base
      const basicResult = await intentionAnalyzer.analyze(
        basicContext.message.content,
        {
          history: basicContext.history,
          userProfile: basicContext.user,
          products: basicContext.products
        }
      );

      // Melhorar com contexto avançado
      if (advancedContext.advanced?.analysis) {
        const enhancement = this.enhanceIntentionWithContext(basicResult, advancedContext.advanced);
        
        return {
          ...basicResult,
          confidence: Math.min(basicResult.confidence + enhancement.confidenceBoost, 1.0),
          context: enhancement.contextFactors,
          urgency: advancedContext.advanced.analysis.urgencyLevel || 'Normal',
          emotionalState: advancedContext.advanced.emotional.state || 'neutral'
        };
      }

      return basicResult;

    } catch (error) {
      console.error('❌ Erro na análise de intenção melhorada:', error.message);
      
      // Fallback para análise por palavras-chave
      const fallbackResult = intentionAnalyzer.analyzeFallback(basicContext.message.content);
      console.log(`🔍 [FALLBACK] Análise por palavras-chave: ${fallbackResult.intention}`);
      
      return fallbackResult;
    }
  }

  // ===============================================
  // ROTEAMENTO INTELIGENTE MULTI-DIMENSIONAL (NOVO)
  // ===============================================
  async intelligentRouting(intentionResult, basicContext, advancedContext, costStrategy) {
    console.log('🧭 [NOVO] Roteamento inteligente multi-dimensional...');
    
    try {
      const routingContext = {
        intention: intentionResult.intention,
        userValue: this.calculateUserValue(basicContext.user),
        urgency: intentionResult.urgency || 'Normal',
        complexity: this.calculateComplexity(basicContext, advancedContext),
        history: advancedContext.advanced?.conversation?.patterns || {},
        timeOfDay: new Date().getHours(),
        creditBalance: basicContext.user.credits_balance || 0,
        costStrategy: costStrategy,
        emotionalState: intentionResult.emotionalState || 'neutral',
        businessType: basicContext.user.business_type || 'geral'
      };

      const routing = await this.intelligentRouter.calculateOptimalRouting(routingContext);
      
      // Adicionar informações de créditos necessários
      const requiredCredits = this.calculateRequiredCredits(routing.provider, routingContext.complexity);
      
      return {
        ...routing,
        credits: requiredCredits,
        context: routingContext
      };

    } catch (error) {
      console.error('❌ Erro no roteamento inteligente:', error);
      
      // Fallback para roteamento básico
      const basicRouting = aiRouter.routeToProvider(intentionResult.intention, basicContext.user);
      
      return {
        provider: basicRouting.provider,
        credits: basicRouting.credits,
        confidence: 0.5,
        reasoning: 'Fallback - roteamento básico por erro',
        context: {}
      };
    }
  }

  // ===============================================
  // CONSTRUÇÃO DE PROMPT CONTEXTUALIZADO (NOVO)
  // ===============================================
  async buildContextualPrompt(basicContext, advancedContext, intentionResult, routing) {
    console.log('📝 [NOVO] Construindo prompt contextualizado...');
    
    try {
      const userProfile = basicContext.user || {};
      const customerProfile = this.buildCustomerProfile(basicContext.contact, basicContext.history);
      const conversationHistory = basicContext.history || [];

      // Usar sistema de prompts avançados
      const basePrompt = ADVANCED_PROMPTS.buildContextualPrompt(
        userProfile,
        customerProfile,
        intentionResult.intention,
        conversationHistory
      );

      // Personalizar com mecanismo de personalização
      const personalizedPrompt = PERSONALIZATION_ENGINE.interpolatePrompt(basePrompt, {
        userProfile: JSON.stringify(userProfile),
        customerProfile: JSON.stringify(customerProfile),
        conversationHistory: PERSONALIZATION_ENGINE.summarizeHistory(conversationHistory),
        intentionScore: PERSONALIZATION_ENGINE.calculateIntentionScore(conversationHistory),
        urgencyLevel: PERSONALIZATION_ENGINE.detectUrgency(conversationHistory),
        businessNeed: PERSONALIZATION_ENGINE.identifyBusinessNeed(conversationHistory),
        emotionalContext: advancedContext.advanced?.emotional?.state || 'neutral'
      });

      // Otimizar para o provider selecionado
      const optimizedPrompt = this.optimizePromptForProvider(personalizedPrompt, routing.provider, routing.context);

      return {
        content: optimizedPrompt,
        provider: routing.provider,
        context: routing.context,
        metadata: {
          confidence: routing.confidence,
          reasoning: routing.reasoning,
          optimization: routing.context.costStrategy?.recommendation || 'balanced'
        }
      };

    } catch (error) {
      console.error('❌ Erro na construção do prompt:', error);
      
      // Fallback: prompt básico
      return {
        content: `Responda de forma útil sobre: ${intentionResult.intention}. Mensagem: ${basicContext.message.content}`,
        provider: routing.provider,
        context: {},
        metadata: {
          confidence: 0.5,
          reasoning: 'Prompt básico por erro'
        }
      };
    }
  }

  // ===============================================
  // GERAÇÃO DE RESPOSTA COM FALLBACK AVANÇADO (NOVO)
  // ===============================================
  async generateResponseWithAdvancedFallback(routing, prompt, basicContext, advancedContext, intentionResult) {
    console.log(`🚀 [NOVO] Gerando resposta com fallback avançado: ${routing.provider}`);
    
    const operation = async () => {
      return await this.executeProviderGeneration(routing.provider, prompt, basicContext, advancedContext, intentionResult);
    };

    try {
      // Usar sistema de retry inteligente
      const result = await this.retrySystem.executeWithRetry(operation, 3);
      
      return {
        ...result,
        optimization: 'primary_provider',
        quality: await this.assessResponseQuality(result, intentionResult)
      };

    } catch (error) {
      console.error('❌ Erro na geração principal, usando fallback:', error.message);
      
      // Fallback avançado
      return await this.executeAdvancedFallback(routing, prompt, basicContext, intentionResult);
    }
  }

  // ===============================================
  // EXECUÇÃO DE PROVIDER ESPECÍFICO
  // ===============================================
  async executeProviderGeneration(provider, prompt, basicContext, advancedContext, intentionResult) {
    const startTime = Date.now();
    
    const contextForProvider = {
      userProfile: basicContext.user,
      products: basicContext.products,
      history: basicContext.history,
      contact: basicContext.contact,
      advanced: advancedContext.advanced,
      urgency: intentionResult.urgency,
      emotionalState: intentionResult.emotionalState
    };

    if (provider === 'deepseek') {
      console.log('🤖 [OTIMIZADO] DeepSeek gerando resposta...');
      
      const result = await deepseekGenerator.generateResponse(
        prompt.content,
        intentionResult.intention,
        contextForProvider
      );
      
      return {
        ...result,
        provider: 'deepseek',
        processingTime: Date.now() - startTime
      };
      
    } else if (provider === 'openai') {
      console.log('🤖 [OTIMIZADO] OpenAI gerando resposta...');
      
      const result = await openaiGenerator.generateResponse(
        prompt.content,
        intentionResult.intention,
        contextForProvider
      );
      
      return {
        ...result,
        provider: 'openai',
        processingTime: Date.now() - startTime
      };
      
    } else {
      throw new Error(`Provider desconhecido: ${provider}`);
    }
  }

  // ===============================================
  // FALLBACK AVANÇADO
  // ===============================================
  async executeAdvancedFallback(routing, prompt, basicContext, intentionResult) {
    console.log('🔄 [NOVO] Executando fallback avançado...');
    
    // Tentar provider alternativo
    const alternativeProvider = routing.provider === 'openai' ? 'deepseek' : 'openai';
    
    try {
      console.log(`🔄 Tentando provider alternativo: ${alternativeProvider}`);
      
      const result = await this.executeProviderGeneration(alternativeProvider, prompt, basicContext, {}, intentionResult);
      
      return {
        ...result,
        provider: alternativeProvider,
        optimization: 'alternative_provider'
      };
      
    } catch (error) {
      console.log('🔄 Usando resposta template inteligente...');
      
      // Fallback final: resposta inteligente baseada no contexto
      const smartResponse = this.generateSmartFallbackResponse(intentionResult, basicContext);
      
      return {
        success: true,
        response: smartResponse,
        provider: 'smart_fallback',
        model: 'contextual-template',
        tokensUsed: 0,
        costUSD: 0,
        processingTime: 100,
        optimization: 'smart_template'
      };
    }
  }

  // ===============================================
  // MÉTODOS AUXILIARES ORIGINAIS MANTIDOS
  // ===============================================

  // Método original mantido com pequenas melhorias
  async getMessageContext(messageId, userId) {
    try {
      // Buscar mensagem
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (messageError || !message) {
        console.error('❌ Erro ao buscar mensagem:', messageError);
        return null;
      }

      // Buscar conversa
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', message.conversation_id)
        .single();

      if (convError || !conversation) {
        console.error('❌ Erro ao buscar conversa:', convError);
        return null;
      }

      // Buscar usuário (com validação de UUID)
      let user = null;
      if (conversation.user_id && conversation.user_id !== 'null' && conversation.user_id.length === 36) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', conversation.user_id)
          .single();

        if (userError) {
          console.error('❌ Erro ao buscar usuário:', userError);
          console.log('🔍 user_id da conversa:', conversation.user_id);
          return null;
        }
        
        user = userData;
      } else {
        console.log('⚠️ Conversa sem user_id válido:', conversation.user_id);
        return null;
      }

      // Buscar contato
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', conversation.contact_id)
        .single();

      // Buscar histórico da conversa (últimas 10 mensagens - aumentado)
      const { data: history, error: historyError } = await supabase
        .from('messages')
        .select('content, sender_type, created_at, intention, emotion')
        .eq('conversation_id', message.conversation_id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Buscar produtos do usuário
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', conversation.user_id)
        .eq('is_active', true);

      return {
        message,
        conversation,
        user,
        contact: contact || null,
        history: history || [],
        products: products || []
      };

    } catch (error) {
      console.error('❌ Erro ao buscar contexto:', error);
      return null;
    }
  }

  // Método original mantido
  async checkUserCredits(userId, creditsNeeded) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('credits_balance')
        .eq('id', userId)
        .single();

      if (error || !user) {
        console.error('❌ Erro ao verificar créditos:', error);
        return false;
      }

      return user.credits_balance >= creditsNeeded;

    } catch (error) {
      console.error('❌ Erro ao verificar créditos:', error);
      return false;
    }
  }

  // ===============================================
  // NOVOS MÉTODOS AUXILIARES
  // ===============================================

  // Verificação de créditos melhorada
  async checkUserCreditsAdvanced(userId, routing) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('credits_balance, plan, credits_used_month')
        .eq('id', userId)
        .single();

      if (error || !user) {
        console.error('❌ Erro ao verificar créditos:', error);
        return { hasCredits: false, suggestion: 'Erro ao verificar créditos' };
      }

      const hasCredits = user.credits_balance >= routing.credits;
      
      if (!hasCredits) {
        const suggestion = await this.creditBasedFallback.selectProviderByCredits(
          user.credits_balance,
          { openai: routing.credits * 2, deepseek: routing.credits }
        );
        
        return {
          hasCredits: false,
          currentBalance: user.credits_balance,
          needed: routing.credits,
          suggestion: suggestion.reason
        };
      }

      return { hasCredits: true };

    } catch (error) {
      console.error('❌ Erro ao verificar créditos:', error);
      return { hasCredits: false, suggestion: 'Erro na verificação' };
    }
  }

  // Salvar contexto na memória
  async saveContextToMemory(conversationId, context, response) {
    try {
      await this.conversationMemory.storeContext(conversationId, {
        recentMessages: context.history || [],
        advanced: context.advanced,
        response: response,
        timestamp: new Date()
      });
      
      console.log('🧠 Contexto salvo na memória conversacional');
      
    } catch (error) {
      console.error('❌ Erro ao salvar contexto na memória:', error);
    }
  }

  // Interação avançada
  async saveAdvancedInteraction(basicContext, advancedContext, intentionResult, responseResult, routing) {
    try {
      const { error } = await supabase
        .from('ai_interactions')
        .insert({
          conversation_id: basicContext.conversation.id,
          message_id: basicContext.message.id,
          user_id: basicContext.user.id,
          interaction_type: 'response_generation_v2',
          ai_provider: responseResult.provider,
          ai_model: responseResult.model || 'unknown',
          ai_tokens_used: responseResult.tokensUsed || 0,
          ai_cost_usd: responseResult.costUSD || 0,
          processing_time_ms: responseResult.processingTime || 0,
          input_data: {
            intention: intentionResult.intention,
            confidence: intentionResult.confidence,
            urgency: intentionResult.urgency,
            emotionalState: intentionResult.emotionalState,
            message_content: basicContext.message.content,
            contextAnalysis: advancedContext.advanced?.summary,
            routingReasoning: routing.reasoning
          },
          output_data: {
            response: responseResult.response,
            credits_used: routing.credits,
            success: responseResult.success,
            optimization: responseResult.optimization,
            quality: responseResult.quality
          },
          success: responseResult.success,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Erro ao salvar interação avançada:', error);
      } else {
        console.log('✅ Interação avançada salva no histórico');
      }

    } catch (error) {
      console.error('❌ Erro ao salvar interação avançada:', error);
    }
  }

  // Atualizar créditos e métricas
  async updateCreditsAndMetrics(userId, creditsUsed, responseResult) {
    try {
      // Atualizar créditos (método original)
      await this.updateUserCredits(userId, creditsUsed);
      
      // Atualizar métricas de provider
      await this.updateProviderMetrics(responseResult.provider, {
        success: responseResult.success,
        responseTime: responseResult.processingTime,
        cost: responseResult.costUSD || 0,
        quality: responseResult.quality || 0.8
      });
      
    } catch (error) {
      console.error('❌ Erro ao atualizar créditos e métricas:', error);
    }
  }

  // Método original mantido
  async updateUserCredits(userId, creditsUsed) {
    try {
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('credits_balance, credits_used_month')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('❌ Erro ao buscar créditos atuais:', fetchError);
        return;
      }

      const newBalance = (currentUser.credits_balance || 0) - creditsUsed;
      const newUsedMonth = (currentUser.credits_used_month || 0) + creditsUsed;

      const { error } = await supabase
        .from('users')
        .update({
          credits_balance: newBalance,
          credits_used_month: newUsedMonth,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Erro ao atualizar créditos:', error);
      } else {
        console.log(`💳 [OTIMIZADO] Créditos atualizados: -${creditsUsed} (saldo: ${newBalance})`);
      }

    } catch (error) {
      console.error('❌ Erro ao atualizar créditos:', error);
    }
  }

  // Verificar alertas de custo
  async checkCostAlerts(userId, creditsUsed) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('credits_balance, credits_used_month, plan')
        .eq('id', userId)
        .single();

      if (error || !user) return;

      // Calcular orçamento baseado no plano
      const planLimits = {
        basic: 2000,
        pro: 8000,
        premium: 25000
      };

      const monthlyBudget = planLimits[user.plan] || planLimits.basic;
      const currentUsage = user.credits_used_month + creditsUsed;

      await this.costAlertSystem.checkCostThresholds(userId, currentUsage, monthlyBudget);

    } catch (error) {
      console.error('❌ Erro ao verificar alertas de custo:', error);
    }
  }

  // ===============================================
  // MÉTODOS AUXILIARES PARA CÁLCULOS
  // ===============================================

  calculateUserValue(user) {
    const planValues = { basic: 100, pro: 500, premium: 1000 };
    const baseValue = planValues[user.plan] || 100;
    const usageBonus = (user.credits_used_month || 0) / 100;
    return baseValue + usageBonus;
  }

  calculateComplexity(basicContext, advancedContext) {
    let complexity = 0.5; // Base
    
    if (basicContext.message.content.length > 200) complexity += 0.1;
    if (basicContext.history.length > 5) complexity += 0.1;
    if (advancedContext.advanced?.emotional?.state === 'frustrated') complexity += 0.2;
    if (basicContext.products.length > 10) complexity += 0.1;
    
    return Math.min(complexity, 1.0);
  }

  calculateRequiredCredits(provider, complexity) {
    const baseCredits = provider === 'openai' ? 3 : 1;
    const complexityMultiplier = 1 + complexity;
    return Math.ceil(baseCredits * complexityMultiplier);
  }

  optimizePromptForProvider(basePrompt, provider, context) {
    if (provider === 'openai') {
      return `${basePrompt}\n\nForneça resposta detalhada e de alta qualidade com foco em conversão.`;
    } else {
      return `${basePrompt}\n\nResposta concisa e eficiente, mantendo qualidade.`;
    }
  }

  generateSmartFallbackResponse(intentionResult, basicContext) {
    const responses = {
      greeting: `Olá! Sou ${basicContext.user.business_name || 'nossa empresa'}, como posso ajudá-lo hoje?`,
      scheduling: `Entendi que você gostaria de agendar. Temos horários disponíveis esta semana. Qual seria o melhor período para você?`,
      sales: `Obrigado pelo interesse em nossos ${basicContext.products.length > 0 ? 'produtos/serviços' : 'serviços'}! Vou verificar as melhores opções para você.`,
      support: `Recebi sua solicitação e vou analisar com atenção. Nossa equipe retornará em breve com uma solução.`,
      information: `Vou buscar essas informações para você. Em breve teremos tudo organizado.`,
      complaint: `Entendemos sua preocupação e vamos resolver isso. Sua satisfação é nossa prioridade.`,
      pricing: `Vou verificar os valores atualizados e enviar as informações completas sobre preços.`,
      other: `Recebi sua mensagem e nossa equipe especializada irá analisá-la. Retornaremos em breve.`
    };
    
    return responses[intentionResult.intention] || responses.other;
  }

  // ===============================================
  // MÉTODOS DE ANÁLISE E MÉTRICAS
  // ===============================================

  async analyzeEmotionalContext(basicContext) {
    // Análise básica de emoção baseada em palavras-chave
    const text = basicContext.message.content.toLowerCase();
    
    const emotionKeywords = {
      frustrated: ['problema', 'não funciona', 'ruim', 'péssimo', 'irritado'],
      excited: ['ótimo', 'excelente', 'perfeito', 'incrível', 'adorei'],
      neutral: ['ok', 'normal', 'talvez', 'não sei'],
      positive: ['bom', 'gostei', 'interessante', 'legal']
    };

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return { state: emotion, confidence: 0.7 };
      }
    }

    return { state: 'neutral', confidence: 0.5 };
  }

  generateContextSummary(analysis, emotional) {
    return `Contexto: ${emotional.state} | Análise: ${analysis ? 'completa' : 'básica'}`;
  }

  enhanceIntentionWithContext(basicResult, advancedContext) {
    return {
      confidenceBoost: advancedContext.analysis ? 0.1 : 0,
      contextFactors: {
        hasAdvancedAnalysis: !!advancedContext.analysis,
        emotionalState: advancedContext.emotional?.state,
        conversationStage: advancedContext.conversation?.stage || 'unknown'
      }
    };
  }

  buildCustomerProfile(contact, history) {
    return {
      name: contact?.name || 'Cliente',
      phone: contact?.phone || '',
      interactionCount: history.length,
      lastInteraction: history[0]?.created_at,
      averageResponseTime: this.calculateAverageResponseTime(history)
    };
  }

  calculateAverageResponseTime(history) {
    if (history.length < 2) return 0;
    
    let totalTime = 0;
    let pairs = 0;
    
    for (let i = 0; i < history.length - 1; i++) {
      if (history[i].sender_type !== history[i + 1].sender_type) {
        const time1 = new Date(history[i].created_at);
        const time2 = new Date(history[i + 1].created_at);
        totalTime += Math.abs(time1 - time2);
        pairs++;
      }
    }
    
    return pairs > 0 ? totalTime / pairs / 1000 / 60 : 0; // minutos
  }

  async assessResponseQuality(result, intentionResult) {
    // Algoritmo simples de avaliação de qualidade
    let quality = 0.5;
    
    if (result.success) quality += 0.3;
    if (result.response.length > 50) quality += 0.1;
    if (result.response.length < 500) quality += 0.05; // Não muito longo
    if (result.provider === 'openai') quality += 0.05;
    
    return Math.min(quality, 1.0);
  }

  updateGlobalMetrics(processingTime, success) {
    this.processingMetrics.totalProcessed++;
    
    if (success) {
      const successCount = this.processingMetrics.totalProcessed * this.processingMetrics.successRate;
      this.processingMetrics.successRate = (successCount + 1) / this.processingMetrics.totalProcessed;
    } else {
      this.processingMetrics.successRate = (this.processingMetrics.totalProcessed * this.processingMetrics.successRate) / this.processingMetrics.totalProcessed;
    }
    
    this.processingMetrics.avgProcessingTime = (
      (this.processingMetrics.avgProcessingTime * (this.processingMetrics.totalProcessed - 1)) + 
      processingTime
    ) / this.processingMetrics.totalProcessed;
  }

  async updateProviderMetrics(provider, metrics) {
    // Implementar atualização de métricas por provider
    console.log(`📊 Métricas ${provider}:`, metrics);
  }

  async getUserBudgetInfo(userId) {
    // Implementar busca de informações de orçamento
    return { monthly: 100, remaining: 50 };
  }

  async getCurrentUsage(userId) {
    // Implementar busca de uso atual
    return { current: 30, projected: 60 };
  }

  async getCurrentLoadMetrics() {
    // Implementar busca de métricas de carga
    return { total: 50, deepseek: 30, openai: 20 };
  }
}

// ===============================================
// INSTÂNCIA GLOBAL E FUNÇÃO DE COMPATIBILIDADE
// ===============================================
const optimizedProcessor = new OptimizedMessageProcessor();

// Função de compatibilidade com a versão anterior
async function processMessage(messageId, userId = null) {
  return await optimizedProcessor.processMessage(messageId, userId);
}

// ===============================================
// EXPORTAÇÃO
// ===============================================
module.exports = {
  processMessage,
  OptimizedMessageProcessor,
  // Exportar instância para acesso direto aos métodos avançados
  processor: optimizedProcessor
};