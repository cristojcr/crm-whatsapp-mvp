// SISTEMA DE ROTEAMENTO INTELIGENTE MULTI-DIMENSIONAL
const { ADVANCED_PROMPTS } = require('./advanced-prompts');

// FATORES PARA DECISÃO DE IA
const ROUTING_FACTORS = {
  intention: { weight: 0.3 },        // Intenção da mensagem
  userValue: { weight: 0.2 },        // Valor do cliente (LTV)
  urgency: { weight: 0.15 },         // Urgência da solicitação
  complexity: { weight: 0.15 },      // Complexidade da query
  history: { weight: 0.1 },          // Histórico de interações
  timeOfDay: { weight: 0.05 },       // Horário da mensagem
  creditBalance: { weight: 0.05 }    // Saldo de créditos
};

class IntelligentRouter {
  
  constructor() {
    this.performanceMetrics = {
      deepseek: {
        avgResponseTime: 2.1,
        successRate: 0.92,
        userSatisfaction: 4.2,
        costEfficiency: 9.5
      },
      openai: {
        avgResponseTime: 1.8,
        successRate: 0.97,
        userSatisfaction: 4.7,
        qualityScore: 9.2
      }
    };
  }
  
  async calculateOptimalRouting(context) {
    const scores = {
      deepseek: await this.calculateDeepSeekScore(context),
      openai: await this.calculateOpenAIScore(context)
    };
    
    const selection = this.selectOptimalProvider(scores);
    
    // Log da decisão para análise
    console.log(`🧠 Roteamento Inteligente:`, {
      scores,
      selected: selection.provider,
      confidence: selection.confidence,
      factors: selection.factors
    });
    
    return selection;
  }
  
  async calculateDeepSeekScore(context) {
    let score = 0;
    const factors = {};
    
    // Fator 1: Intenção (favorece DeepSeek para casos simples)
    if (['geral', 'informacao', 'suporte'].includes(context.intention)) {
      score += ROUTING_FACTORS.intention.weight * 0.8;
      factors.intention = 'Alto (casos simples)';
    } else {
      score += ROUTING_FACTORS.intention.weight * 0.3;
      factors.intention = 'Baixo (casos complexos)';
    }
    
    // Fator 2: Eficiência de custo
    if (context.creditBalance < 100) {
      score += ROUTING_FACTORS.creditBalance.weight * 1.0;
      factors.cost = 'Alto (economia necessária)';
    } else {
      score += ROUTING_FACTORS.creditBalance.weight * 0.6;
      factors.cost = 'Médio (saldo ok)';
    }
    
    // Fator 3: Horário (DeepSeek para baixa demanda)
    const hour = new Date().getHours();
    if (hour < 8 || hour > 18) {
      score += ROUTING_FACTORS.timeOfDay.weight * 0.9;
      factors.timing = 'Alto (fora horário comercial)';
    } else {
      score += ROUTING_FACTORS.timeOfDay.weight * 0.4;
      factors.timing = 'Baixo (horário comercial)';
    }
    
    // Fator 4: Complexidade (favorece OpenAI para alta complexidade)
    if (context.complexity < 0.5) {
      score += ROUTING_FACTORS.complexity.weight * 0.8;
      factors.complexity = 'Alto (baixa complexidade)';
    } else {
      score += ROUTING_FACTORS.complexity.weight * 0.2;
      factors.complexity = 'Baixo (alta complexidade)';
    }
    
    return { score, factors };
  }
  
  async calculateOpenAIScore(context) {
    let score = 0;
    const factors = {};
    
    // Fator 1: Intenção (favorece OpenAI para vendas e casos críticos)
    if (['vendas', 'agendamento', 'conversao'].includes(context.intention)) {
      score += ROUTING_FACTORS.intention.weight * 0.9;
      factors.intention = 'Alto (casos críticos)';
    } else {
      score += ROUTING_FACTORS.intention.weight * 0.4;
      factors.intention = 'Médio (casos padrão)';
    }
    
    // Fator 2: Valor do cliente
    if (context.userValue > 1000) {
      score += ROUTING_FACTORS.userValue.weight * 1.0;
      factors.userValue = 'Alto (cliente VIP)';
    } else if (context.userValue > 500) {
      score += ROUTING_FACTORS.userValue.weight * 0.7;
      factors.userValue = 'Médio (cliente regular)';
    } else {
      score += ROUTING_FACTORS.userValue.weight * 0.3;
      factors.userValue = 'Baixo (cliente básico)';
    }
    
    // Fator 3: Urgência
    if (context.urgency === 'Alta') {
      score += ROUTING_FACTORS.urgency.weight * 1.0;
      factors.urgency = 'Alto (urgente)';
    } else {
      score += ROUTING_FACTORS.urgency.weight * 0.5;
      factors.urgency = 'Médio (normal)';
    }
    
    // Fator 4: Complexidade
    if (context.complexity > 0.7) {
      score += ROUTING_FACTORS.complexity.weight * 1.0;
      factors.complexity = 'Alto (muito complexo)';
    } else if (context.complexity > 0.4) {
      score += ROUTING_FACTORS.complexity.weight * 0.6;
      factors.complexity = 'Médio (moderado)';
    } else {
      score += ROUTING_FACTORS.complexity.weight * 0.3;
      factors.complexity = 'Baixo (simples)';
    }
    
    return { score, factors };
  }
  
  selectOptimalProvider(scores) {
    const deepseekTotal = scores.deepseek.score;
    const openaiTotal = scores.openai.score;
    
    if (deepseekTotal > openaiTotal) {
      return {
        provider: 'deepseek',
        confidence: deepseekTotal,
        factors: scores.deepseek.factors,
        reasoning: 'Otimizado para custo-benefício'
      };
    } else {
      return {
        provider: 'openai', 
        confidence: openaiTotal,
        factors: scores.openai.factors,
        reasoning: 'Otimizado para qualidade'
      };
    }
  }
}

module.exports = { IntelligentRouter, ROUTING_FACTORS };

// TRACKING DE PERFORMANCE POR PROVIDER
const PERFORMANCE_METRICS = {
  deepseek: {
    avgResponseTime: 2.1,
    successRate: 0.92,
    userSatisfaction: 4.2,
    costEfficiency: 9.5
  },
  openai: {
    avgResponseTime: 1.8,
    successRate: 0.97,
    userSatisfaction: 4.7,
    qualityScore: 9.2
  }
};

class PerformanceTracker {
  
  async updateProviderMetrics(provider, interaction) {
    const metrics = PERFORMANCE_METRICS[provider];
    
    // Atualizar tempo de resposta
    metrics.avgResponseTime = (metrics.avgResponseTime + interaction.responseTime) / 2;
    
    // Atualizar taxa de sucesso
    if (interaction.success) {
      metrics.successRate = (metrics.successRate + 1) / 2;
    } else {
      metrics.successRate = metrics.successRate * 0.95;
    }
    
    // Salvar métricas no banco
    await this.saveMetricsToDatabase(provider, metrics);
  }
  
  getProviderPerformance(provider) {
    return PERFORMANCE_METRICS[provider];
  }
  
  async saveMetricsToDatabase(provider, metrics) {
    // Implementar salvamento no Supabase
    console.log(`📊 Métricas atualizadas para ${provider}:`, metrics);
  }
}

module.exports = { 
  ...module.exports, 
  PERFORMANCE_METRICS, 
  PerformanceTracker 
};

// ROTEAMENTO POR CONTEXTO TEMPORAL
class TemporalRouter {
  
  getTimeBasedRouting() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();
    
    let preference = 'balanced';
    
    // Horários de pico (9-12h, 14-17h) = OpenAI
    if ((hour >= 9 && hour <= 12) || (hour >= 14 && hour <= 17)) {
      preference = 'openai';
    }
    
    // Madrugada e noite = DeepSeek
    if (hour < 8 || hour > 20) {
      preference = 'deepseek';
    }
    
    // Fim de semana = DeepSeek (menor demanda)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      preference = 'deepseek';
    }
    
    // Fim de mês = Otimização de custos
    if (dayOfMonth > 25) {
      preference = 'deepseek';
    }
    
    return {
      preference,
      hour,
      dayOfWeek,
      dayOfMonth,
      reasoning: this.getTemporalReasoning(preference, hour, dayOfWeek, dayOfMonth)
    };
  }
  
  getTemporalReasoning(preference, hour, dayOfWeek, dayOfMonth) {
    if (preference === 'openai') {
      return 'Horário de pico - priorizar qualidade';
    } else if (preference === 'deepseek') {
      if (hour < 8 || hour > 20) return 'Horário baixa demanda';
      if (dayOfWeek === 0 || dayOfWeek === 6) return 'Fim de semana';
      if (dayOfMonth > 25) return 'Otimização custos fim do mês';
    }
    return 'Balanceamento padrão';
  }
  
  calculateLoadBalancing() {
    // Implementar load balancing inteligente baseado em métricas
    const currentLoad = {
      deepseek: Math.random() * 100,
      openai: Math.random() * 100
    };
    
    return currentLoad;
  }
}

module.exports = { ...module.exports, TemporalRouter };