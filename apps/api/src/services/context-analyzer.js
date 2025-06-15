// MOTOR DE ANÁLISE CONTEXTUAL AVANÇADA
class ContextAnalyzer {
  
  async analyzeAdvancedContext(messageId, conversationId, userId) {
    const context = await this.gatherContextualData(messageId, conversationId, userId);
    
    const analysis = {
      conversationFlow: this.analyzeConversationFlow(context.history),
      emotionalState: this.detectEmotionalState(context.currentMessage),
      intentionEvolution: this.trackIntentionEvolution(context.history),
      urgencyLevel: this.calculateUrgencyLevel(context),
      customerJourney: this.determineCustomerJourneyStage(context),
      businessContext: this.analyzeBusinessContext(context.userProfile)
    };
    
    return analysis;
  }
  
  async gatherContextualData(messageId, conversationId, userId) {
    // Buscar dados contextuais do banco
    return {
      currentMessage: await this.getCurrentMessage(messageId),
      history: await this.getConversationHistory(conversationId, 10),
      userProfile: await this.getUserProfile(userId),
      customerProfile: await this.getCustomerProfile(conversationId)
    };
  }
  
  analyzeConversationFlow(history) {
    if (!history || history.length === 0) {
      return { stage: 'inicial', confidence: 1.0 };
    }
    
    const patterns = {
      descoberta: ['quero saber', 'como funciona', 'me explica'],
      interesse: ['interessante', 'gostei', 'me chama atenção'],
      consideracao: ['preço', 'valor', 'custo', 'comparar'],
      objecao: ['mas', 'porém', 'não sei', 'caro'],
      decisao: ['quero contratar', 'vamos fechar', 'aceito']
    };
    
    const messageTexts = history.map(msg => msg.content.toLowerCase()).join(' ');
    
    let maxScore = 0;
    let detectedStage = 'inicial';
    
    for (const [stage, keywords] of Object.entries(patterns)) {
      const score = keywords.reduce((acc, keyword) => {
        return acc + (messageTexts.includes(keyword) ? 1 : 0);
      }, 0);
      
      if (score > maxScore) {
        maxScore = score;
        detectedStage = stage;
      }
    }
    
    return {
      stage: detectedStage,
      confidence: Math.min(maxScore / 3, 1.0),
      transitions: this.detectStageTransitions(history)
    };
  }
  
  detectEmotionalState(message) {
    const emotionWords = {
      positive: ['ótimo', 'excelente', 'maravilhoso', 'perfeito', 'adorei'],
      negative: ['ruim', 'terrível', 'péssimo', 'odeio', 'problema'],
      neutral: ['ok', 'normal', 'regular', 'talvez'],
      excited: ['incrível', 'fantástico', 'uau', 'nossa'],
      frustrated: ['não funciona', 'difícil', 'complicado', 'chato']
    };
    
    const text = message.content.toLowerCase();
    let scores = {};
    
    for (const [emotion, words] of Object.entries(emotionWords)) {
      scores[emotion] = words.reduce((acc, word) => {
        return acc + (text.includes(word) ? 1 : 0);
      }, 0);
    }
    
    const dominantEmotion = Object.keys(scores).reduce((a, b) => 
      scores[a] > scores[b] ? a : b
    );
    
    return {
      primary: dominantEmotion,
      intensity: scores[dominantEmotion],
      confidence: Math.min(scores[dominantEmotion] / 2, 1.0)
    };
  }
  
  trackIntentionEvolution(history) {
    const intentions = history.map(msg => msg.intention).filter(Boolean);
    
    if (intentions.length < 2) {
      return { evolution: 'estável', pattern: 'insuficiente' };
    }
    
    const changes = [];
    for (let i = 1; i < intentions.length; i++) {
      if (intentions[i] !== intentions[i-1]) {
        changes.push({
          from: intentions[i-1],
          to: intentions[i],
          timestamp: history[i].created_at
        });
      }
    }
    
    return {
      evolution: changes.length > 0 ? 'evolutiva' : 'estável',
      changes,
      currentTrend: this.identifyTrend(changes)
    };
  }
  
  calculateUrgencyLevel(context) {
    const urgentIndicators = [
      'urgente', 'emergência', 'rápido', 'hoje', 'agora',
      'preciso', 'importante', 'imediato'
    ];
    
    const timeIndicators = [
      'hoje', 'agora', 'já', 'imediatamente'
    ];
    
    const businessIndicators = [
      'prazo', 'deadline', 'entrega', 'compromisso'
    ];
    
    let urgencyScore = 0;
    const text = context.currentMessage.content.toLowerCase();
    
    urgentIndicators.forEach(indicator => {
      if (text.includes(indicator)) urgencyScore += 1;
    });
    
    timeIndicators.forEach(indicator => {
      if (text.includes(indicator)) urgencyScore += 2;
    });
    
    businessIndicators.forEach(indicator => {
      if (text.includes(indicator)) urgencyScore += 1.5;
    });
    
    // Considerar horário da mensagem
    const hour = new Date(context.currentMessage.created_at).getHours();
    if (hour < 8 || hour > 18) urgencyScore += 0.5;
    
    return {
      level: urgencyScore > 3 ? 'Alta' : urgencyScore > 1 ? 'Média' : 'Baixa',
      score: urgencyScore,
      indicators: this.extractUrgencyIndicators(text, urgentIndicators)
    };
  }
  
  determineCustomerJourneyStage(context) {
    const stages = {
      awareness: ['conhecer', 'saber', 'informação', 'o que é'],
      interest: ['interessado', 'gostaria', 'quero saber mais'],
      consideration: ['comparar', 'avaliar', 'opções', 'alternativas'],
      intent: ['comprar', 'contratar', 'adquirir', 'fechar'],
      purchase: ['vamos fechar', 'aceito', 'quero contratar'],
      retention: ['renovar', 'continuar', 'satisfeito']
    };
    
    const conversationText = context.history
      .map(msg => msg.content.toLowerCase())
      .join(' ');
    
    let stageScores = {};
    
    for (const [stage, keywords] of Object.entries(stages)) {
      stageScores[stage] = keywords.reduce((acc, keyword) => {
        return acc + (conversationText.includes(keyword) ? 1 : 0);
      }, 0);
    }
    
    const primaryStage = Object.keys(stageScores).reduce((a, b) => 
      stageScores[a] > stageScores[b] ? a : b
    );
    
    return {
      current: primaryStage,
      confidence: stageScores[primaryStage] / 3,
      progression: this.calculateJourneyProgression(stageScores)
    };
  }
  
  analyzeBusinessContext(userProfile) {
    const businessTypes = {
      healthcare: ['dentista', 'médico', 'clínica', 'saúde'],
      consulting: ['consultor', 'consultoria', 'advisory'],
      retail: ['loja', 'vendas', 'varejo', 'comércio'],
      services: ['serviços', 'atendimento', 'prestador']
    };
    
    const businessType = userProfile.business_type || 'geral';
    const industry = userProfile.industry || 'indefinido';
    
    return {
      type: businessType,
      industry,
      characteristics: this.getBusinessCharacteristics(businessType),
      recommendedApproach: this.getRecommendedApproach(businessType)
    };
  }
  
  // Métodos auxiliares
  detectStageTransitions(history) {
    // Implementar detecção de transições entre estágios
    return [];
  }
  
  identifyTrend(changes) {
    if (changes.length === 0) return 'estável';
    
    const lastChange = changes[changes.length - 1];
    return `evoluindo para ${lastChange.to}`;
  }
  
  extractUrgencyIndicators(text, indicators) {
    return indicators.filter(indicator => text.includes(indicator));
  }
  
  calculateJourneyProgression(scores) {
    const orderedStages = ['awareness', 'interest', 'consideration', 'intent', 'purchase'];
    let progression = 0;
    
    for (const stage of orderedStages) {
      if (scores[stage] > 0) progression++;
    }
    
    return progression / orderedStages.length;
  }
  
  getBusinessCharacteristics(businessType) {
    const characteristics = {
      healthcare: {
        urgency: 'alta',
        compliance: 'rigorosa',
        trust: 'fundamental',
        communication: 'técnica e empática'
      },
      consulting: {
        urgency: 'média',
        expertise: 'alta',
        roi: 'fundamental',
        communication: 'executiva'
      },
      retail: {
        urgency: 'alta',
        price: 'sensível',
        volume: 'alto',
        communication: 'persuasiva'
      }
    };
    
    return characteristics[businessType] || characteristics.retail;
  }
  
  getRecommendedApproach(businessType) {
    const approaches = {
      healthcare: 'empático e técnico',
      consulting: 'consultivo e estratégico',
      retail: 'persuasivo e dinâmico',
      services: 'prestativo e solucionador'
    };
    
    return approaches[businessType] || 'adaptativo';
  }
  
  // Métodos para buscar dados do banco
  async getCurrentMessage(messageId) {
    // Implementar busca no Supabase
    return { id: messageId, content: '', created_at: new Date() };
  }
  
  async getConversationHistory(conversationId, limit = 10) {
    // Implementar busca no Supabase
    return [];
  }
  
  async getUserProfile(userId) {
    // Implementar busca no Supabase
    return { business_type: 'geral', industry: 'indefinido' };
  }
  
  async getCustomerProfile(conversationId) {
    // Implementar busca no Supabase
    return {};
  }
}

module.exports = { ContextAnalyzer };