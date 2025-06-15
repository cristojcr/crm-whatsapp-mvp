// Criar src/services/metrics-dashboard.js
class MetricsDashboard {
  
  constructor() {
    this.realTimeMetrics = new Map();
    this.historicalData = [];
    this.alerts = [];
  }
  
  async generateDashboard() {
    const dashboard = {
      realTime: await this.getRealTimeMetrics(),
      performance: await this.getPerformanceMetrics(),
      costs: await this.getCostMetrics(),
      quality: await this.getQualityMetrics(),
      alerts: this.getActiveAlerts(),
      recommendations: await this.generateRecommendations(),
      timestamp: new Date()
    };
    
    console.log('📊 Dashboard gerado:', dashboard);
    return dashboard;
  }
  
  async getRealTimeMetrics() {
    return {
      activeConversations: this.realTimeMetrics.get('activeConversations') || 0,
      messagesPerMinute: this.realTimeMetrics.get('messagesPerMinute') || 0,
      avgResponseTime: this.realTimeMetrics.get('avgResponseTime') || 0,
      currentLoad: {
        deepseek: this.realTimeMetrics.get('deepseekLoad') || 0,
        openai: this.realTimeMetrics.get('openaiLoad') || 0
      },
      systemHealth: this.calculateSystemHealth()
    };
  }
  
  async getPerformanceMetrics() {
    return {
      providers: {
        deepseek: await this.getProviderMetrics('deepseek'),
        openai: await this.getProviderMetrics('openai')
      },
      overall: {
        totalMessages: this.getTotalMessages(),
        successRate: this.getOverallSuccessRate(),
        avgResponseTime: this.getOverallAvgResponseTime(),
        uptime: this.calculateUptime()
      }
    };
  }
  
  async getCostMetrics() {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    return {
      today: await this.getCostForPeriod('today'),
      thisWeek: await this.getCostForPeriod('week'),
      thisMonth: await this.getCostForPeriod('month'),
      projection: await this.projectMonthlyCost(),
      breakdown: {
        deepseek: await this.getProviderCost('deepseek'),
        openai: await this.getProviderCost('openai')
      },
      efficiency: await this.calculateCostEfficiency()
    };
  }
  
  async getQualityMetrics() {
    return {
      satisfaction: {
        average: await this.getAverageSatisfaction(),
        trend: await this.getSatisfactionTrend(),
        byProvider: {
          deepseek: await this.getProviderSatisfaction('deepseek'),
          openai: await this.getProviderSatisfaction('openai')
        }
      },
      accuracy: {
        intentionDetection: await this.getIntentionAccuracy(),
        responseRelevance: await this.getResponseRelevance(),
        errorRate: await this.getErrorRate()
      },
      engagement: {
        avgConversationLength: await this.getAvgConversationLength(),
        conversionRate: await this.getConversionRate(),
        retentionRate: await this.getRetentionRate()
      }
    };
  }
  
  getActiveAlerts() {
    return this.alerts.filter(alert => 
      alert.status === 'active' && 
      alert.severity !== 'info'
    );
  }
  
  async generateRecommendations() {
    const recommendations = [];
    
    // Análise de performance
    const metrics = await this.getPerformanceMetrics();
    if (metrics.providers.deepseek.successRate > metrics.providers.openai.successRate) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        title: 'Aumentar uso do DeepSeek',
        description: 'DeepSeek apresenta melhor taxa de sucesso',
        impact: 'Melhoria de 15% na confiabilidade'
      });
    }
    
    // Análise de custos
    const costs = await this.getCostMetrics();
    if (costs.projection.monthly > costs.budget * 0.9) {
      recommendations.push({
        type: 'cost',
        priority: 'high',
        title: 'Otimização de custos necessária',
        description: 'Projeção excede 90% do orçamento',
        impact: 'Economia de até 30%'
      });
    }
    
    // Análise de qualidade
    const quality = await this.getQualityMetrics();
    if (quality.satisfaction.average < 4.0) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        title: 'Melhorar satisfação do cliente',
        description: 'Satisfação abaixo do target (4.0)',
        impact: 'Aumento de 25% na retenção'
      });
    }
    
    return recommendations;
  }
  
  // Métodos auxiliares
  calculateSystemHealth() {
    const health = {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      network: Math.random() * 100
    };
    
    const overall = (health.cpu + health.memory + health.network) / 3;
    return {
      ...health,
      overall,
      status: overall > 80 ? 'healthy' : overall > 60 ? 'warning' : 'critical'
    };
  }
  
  async getProviderMetrics(provider) {
    // Implementar busca de métricas específicas do provider
    return {
      totalCalls: Math.floor(Math.random() * 1000),
      successRate: 0.9 + Math.random() * 0.1,
      avgResponseTime: 1000 + Math.random() * 1000,
      totalCost: Math.random() * 100
    };
  }
  
  // Implementar outros métodos auxiliares...
}

module.exports = { MetricsDashboard };

// Adicionar ao metrics-dashboard.js
class QualityMetricsAnalyzer {
  
  constructor() {
    this.qualityStandards = {
      responseRelevance: { min: 0.7, target: 0.85, excellent: 0.95 },
      contentRichness: { min: 100, target: 200, excellent: 350 },
      userEngagement: { min: 0.6, target: 0.8, excellent: 0.9 },
      accuracyScore: { min: 0.75, target: 0.9, excellent: 0.98 }
    };
  }
  
  async analyzeResponseQuality(timeframe = '24hours') {
    console.log('📊 Analisando qualidade das respostas...');
    
    const responses = await this.getResponsesFromTimeframe(timeframe);
    
    const qualityMetrics = {
      overall: await this.calculateOverallQuality(responses),
      byProvider: {
        deepseek: await this.analyzeProviderQuality(responses, 'deepseek'),
        openai: await this.analyzeProviderQuality(responses, 'openai')
      },
      byIntention: await this.analyzeQualityByIntention(responses),
      trends: await this.calculateQualityTrends(responses),
      improvements: await this.identifyImprovementOpportunities(responses)
    };
    
    return qualityMetrics;
  }
  
  async calculateOverallQuality(responses) {
    if (responses.length === 0) return { score: 0, grade: 'N/A' };
    
    let totalScore = 0;
    let validResponses = 0;
    
    for (const response of responses) {
      const quality = await this.assessSingleResponse(response);
      if (quality.score > 0) {
        totalScore += quality.score;
        validResponses++;
      }
    }
    
    const averageScore = validResponses > 0 ? totalScore / validResponses : 0;
    
    return {
      score: averageScore,
      grade: this.calculateQualityGrade(averageScore),
      totalResponses: responses.length,
      validResponses: validResponses,
      distribution: this.calculateScoreDistribution(responses)
    };
  }
  
  async assessSingleResponse(response) {
    let qualityScore = 0.5; // Base score
    
    // 1. Relevância da resposta
    const relevance = this.assessRelevance(response);
    qualityScore += relevance * 0.3;
    
    // 2. Riqueza do conteúdo
    const richness = this.assessContentRichness(response);
    qualityScore += richness * 0.25;
    
    // 3. Estrutura e clareza
    const structure = this.assessStructure(response);
    qualityScore += structure * 0.2;
    
    // 4. Adequação ao contexto
    const contextFit = this.assessContextFit(response);
    qualityScore += contextFit * 0.15;
    
    // 5. Potencial de engajamento
    const engagement = this.assessEngagement(response);
    qualityScore += engagement * 0.1;
    
    return {
      score: Math.min(qualityScore, 1.0),
      breakdown: {
        relevance: relevance,
        richness: richness,
        structure: structure,
        contextFit: contextFit,
        engagement: engagement
      }
    };
  }
  
  assessRelevance(response) {
    const content = response.content.toLowerCase();
    const intention = response.intention || 'other';
    
    // Palavras-chave por intenção
    const relevantKeywords = {
      sales: ['produto', 'serviço', 'benefício', 'valor', 'investimento', 'solução'],
      scheduling: ['agendar', 'horário', 'data', 'disponível', 'confirmar'],
      support: ['problema', 'solução', 'ajuda', 'resolver', 'suporte'],
      information: ['informação', 'detalhes', 'explicar', 'esclarecer'],
      greeting: ['olá', 'bem-vindo', 'prazer', 'ajudar'],
      complaint: ['entendo', 'lamento', 'resolver', 'melhorar'],
      pricing: ['preço', 'valor', 'custo', 'investimento', 'proposta']
    };
    
    const keywords = relevantKeywords[intention] || [];
    const keywordCount = keywords.filter(keyword => content.includes(keyword)).length;
    
    return Math.min(keywordCount / keywords.length, 1.0);
  }
  
  assessContentRichness(response) {
    const content = response.content;
    let richness = 0;
    
    // Tamanho adequado
    if (content.length >= 100 && content.length <= 400) richness += 0.3;
    else if (content.length >= 50) richness += 0.15;
    
    // Estrutura em parágrafos
    const paragraphs = content.split('\n').filter(p => p.trim().length > 0);
    if (paragraphs.length >= 2 && paragraphs.length <= 4) richness += 0.2;
    
    // Presença de perguntas
    if (content.includes('?')) richness += 0.15;
    
    // Elementos de ação
    const actionWords = ['agendar', 'confirmar', 'verificar', 'analisar', 'preparar'];
    if (actionWords.some(word => content.toLowerCase().includes(word))) richness += 0.2;
    
    // Personalização
    if (content.includes('você') || content.includes('sua') || content.includes('seu')) richness += 0.15;
    
    return Math.min(richness, 1.0);
  }
  
  assessStructure(response) {
    const content = response.content;
    let structure = 0.3; // Base
    
    // Pontuação adequada
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 0);
    if (sentences.length >= 2 && sentences.length <= 5) structure += 0.3;
    
    // Início adequado
    const greetings = ['olá', 'oi', 'bom dia', 'boa tarde', 'obrigado'];
    if (greetings.some(greeting => content.toLowerCase().startsWith(greeting))) structure += 0.2;
    
    // Fechamento adequado
    const closings = ['retorno', 'contato', 'ajudar', 'disponível', 'atendimento'];
    if (closings.some(closing => content.toLowerCase().includes(closing))) structure += 0.2;
    
    return Math.min(structure, 1.0);
  }
  
  assessContextFit(response) {
    // Avaliar se a resposta se adequa ao contexto do usuário/empresa
    let contextFit = 0.5; // Base
    
    if (response.user_profile?.business_type) {
      const businessTerms = {
        healthcare: ['consulta', 'paciente', 'saúde', 'tratamento'],
        consulting: ['estratégia', 'análise', 'consultoria', 'resultado'],
        retail: ['produto', 'compra', 'desconto', 'promoção']
      };
      
      const terms = businessTerms[response.user_profile.business_type] || [];
      const termCount = terms.filter(term => 
        response.content.toLowerCase().includes(term)
      ).length;
      
      if (termCount > 0) contextFit += 0.3;
    }
    
    return Math.min(contextFit, 1.0);
  }
  
  assessEngagement(response) {
    const content = response.content.toLowerCase();
    let engagement = 0.3; // Base
    
    // Perguntas engajadoras
    if (content.includes('como posso') || content.includes('o que você')) engagement += 0.2;
    
    // Call-to-action
    const ctas = ['agende', 'confirme', 'entre em contato', 'vamos conversar'];
    if (ctas.some(cta => content.includes(cta))) engagement += 0.25;
    
    // Tom positivo
    const positiveWords = ['ótimo', 'perfeito', 'excelente', 'prazer'];
    if (positiveWords.some(word => content.includes(word))) engagement += 0.15;
    
    // Oferece próximos passos
    if (content.includes('próximo') || content.includes('seguir')) engagement += 0.1;
    
    return Math.min(engagement, 1.0);
  }
  
  calculateQualityGrade(score) {
    if (score >= 0.9) return 'A+';
    if (score >= 0.8) return 'A';
    if (score >= 0.7) return 'B';
    if (score >= 0.6) return 'C';
    if (score >= 0.5) return 'D';
    return 'F';
  }
  
  calculateScoreDistribution(responses) {
    const distribution = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    
    responses.forEach(response => {
      const quality = this.assessSingleResponse(response);
      const grade = this.calculateQualityGrade(quality.score);
      distribution[grade]++;
    });
    
    return distribution;
  }
  
  async getResponsesFromTimeframe(timeframe) {
    // Implementar busca no banco de dados
    // Por agora, retornar dados simulados
    return [
      {
        id: 1,
        content: "Olá! Obrigado por entrar em contato. Vou verificar nossa disponibilidade e retorno com as melhores opções para você.",
        intention: 'scheduling',
        user_profile: { business_type: 'healthcare' },
        created_at: new Date()
      },
      {
        id: 2,
        content: "Nossos produtos são excelentes e podem resolver seu problema. Entre em contato para mais informações.",
        intention: 'sales',
        user_profile: { business_type: 'retail' },
        created_at: new Date()
      }
    ];
  }
}

// Adicionar ao metrics-dashboard.js
class UserSatisfactionAnalyzer {
  
  constructor() {
    this.satisfactionMetrics = {
      responseTime: { excellent: 2000, good: 5000, poor: 10000 },
      resolutionRate: { excellent: 0.9, good: 0.75, poor: 0.5 },
      followUpNeeded: { excellent: 0.1, good: 0.25, poor: 0.5 }
    };
  }
  
  async analyzeSatisfaction(timeframe = '7days') {
    console.log('😊 Analisando satisfação do usuário...');
    
    const interactions = await this.getInteractionData(timeframe);
    
    const satisfactionAnalysis = {
      overall: await this.calculateOverallSatisfaction(interactions),
      byChannel: await this.analyzeSatisfactionByChannel(interactions),
      byAgent: await this.analyzeSatisfactionByAgent(interactions),
      byTimeOfDay: await this.analyzeSatisfactionByTime(interactions),
      trends: await this.calculateSatisfactionTrends(interactions),
      actionItems: await this.generateActionItems(interactions)
    };
    
    return satisfactionAnalysis;
  }
  
  async calculateOverallSatisfaction(interactions) {
    if (interactions.length === 0) return { score: 0, rating: 'N/A' };
    
    let totalSatisfaction = 0;
    let satisfactionCount = 0;
    
    for (const interaction of interactions) {
      const satisfaction = await this.calculateInteractionSatisfaction(interaction);
      if (satisfaction.score > 0) {
        totalSatisfaction += satisfaction.score;
        satisfactionCount++;
      }
    }
    
    const averageScore = satisfactionCount > 0 ? totalSatisfaction / satisfactionCount : 0;
    
    return {
      score: averageScore,
      rating: this.getSatisfactionRating(averageScore),
      totalInteractions: interactions.length,
      ratedInteractions: satisfactionCount,
      nps: this.calculateNPS(interactions),
      csat: this.calculateCSAT(interactions)
    };
  }
  
  async calculateInteractionSatisfaction(interaction) {
    let score = 0.5; // Neutral base
    
    // 1. Tempo de resposta (30% do peso)
    const responseTimeScore = this.evaluateResponseTime(interaction.response_time);
    score += responseTimeScore * 0.3;
    
    // 2. Resolução na primeira interação (25% do peso)
    const resolutionScore = this.evaluateResolution(interaction);
    score += resolutionScore * 0.25;
    
    // 3. Qualidade da resposta (25% do peso)
    const qualityScore = this.evaluateResponseQuality(interaction);
    score += qualityScore * 0.25;
    
    // 4. Continuidade da conversa (20% do peso)
    const continuityScore = this.evaluateContinuity(interaction);
    score += continuityScore * 0.2;
    
    return {
      score: Math.min(score, 1.0),
      factors: {
        responseTime: responseTimeScore,
        resolution: resolutionScore,
        quality: qualityScore,
        continuity: continuityScore
      }
    };
  }
  
  evaluateResponseTime(responseTime) {
    if (responseTime <= this.satisfactionMetrics.responseTime.excellent) return 0.5;
    if (responseTime <= this.satisfactionMetrics.responseTime.good) return 0.3;
    if (responseTime <= this.satisfactionMetrics.responseTime.poor) return 0.1;
    return 0; // Muito lento
  }
  
  evaluateResolution(interaction) {
    // Avaliar se a questão foi resolvida baseado em indicadores
    const content = interaction.response?.toLowerCase() || '';
    
    // Indicadores de resolução positiva
    const resolutionIndicators = [
      'resolvido', 'solucionado', 'esclarecido', 'confirmado',
      'agendado', 'enviado', 'processado', 'concluído'
    ];
    
    // Indicadores de problemas
    const problemIndicators = [
      'problema', 'erro', 'não consegui', 'dificuldade',
      'não entendi', 'confuso', 'incorreto'
    ];
    
    let score = 0.25; // Base neutro
    
    if (resolutionIndicators.some(indicator => content.includes(indicator))) {
      score = 0.5; // Resolução positiva
    }
    
    if (problemIndicators.some(indicator => content.includes(indicator))) {
      score = 0; // Problemas identificados
    }
    
    // Verificar se houve follow-up necessário
    if (interaction.follow_up_needed) {
      score *= 0.7; // Reduzir score se precisou de follow-up
    }
    
    return score;
  }
  
  evaluateResponseQuality(interaction) {
    const response = interaction.response || '';
    let quality = 0.2; // Base
    
    // Tamanho adequado
    if (response.length >= 50 && response.length <= 300) quality += 0.1;
    
    // Personalização
    if (response.includes('você') || response.includes('sua')) quality += 0.05;
    
    // Profissionalismo
    const professionalTerms = ['obrigado', 'prazer', 'atendimento', 'ajudar'];
    if (professionalTerms.some(term => response.toLowerCase().includes(term))) {
      quality += 0.1;
    }
    
    // Clareza
    const sentences = response.split(/[.!?]/).filter(s => s.trim().length > 0);
    if (sentences.length >= 1 && sentences.length <= 3) quality += 0.05;
    
    return quality;
  }
  
  evaluateContinuity(interaction) {
    // Avaliar se a conversa fluiu naturalmente
    let continuity = 0.3; // Base
    
    // Se não houve confusão ou pedidos de esclarecimento
    const content = interaction.response?.toLowerCase() || '';
    
    const confusionIndicators = [
      'não entendi', 'pode repetir', 'confuso', 'não compreendi'
    ];
    
    if (!confusionIndicators.some(indicator => content.includes(indicator))) {
      continuity += 0.2;
    }
    
    // Se houve encerramento natural
    const closingIndicators = [
      'obrigado', 'resolvido', 'esclarecido', 'atendimento'
    ];
    
    if (closingIndicators.some(indicator => content.includes(indicator))) {
      continuity += 0.1;
    }
    
    return continuity;
  }
  
  getSatisfactionRating(score) {
    if (score >= 0.9) return 'Excelente';
    if (score >= 0.8) return 'Muito Bom';
    if (score >= 0.7) return 'Bom';
    if (score >= 0.6) return 'Regular';
    if (score >= 0.5) return 'Ruim';
    return 'Péssimo';
  }
  
  calculateNPS(interactions) {
    // Net Promoter Score simulado baseado na qualidade das interações
    const promoters = interactions.filter(i => 
      this.calculateInteractionSatisfaction(i).score >= 0.8
    ).length;
    
    const detractors = interactions.filter(i => 
      this.calculateInteractionSatisfaction(i).score <= 0.6
    ).length;
    
    const total = interactions.length;
    
    if (total === 0) return 0;
    
    return Math.round(((promoters - detractors) / total) * 100);
  }
  
  calculateCSAT(interactions) {
    // Customer Satisfaction Score
    const satisfied = interactions.filter(i => 
      this.calculateInteractionSatisfaction(i).score >= 0.7
    ).length;
    
    const total = interactions.length;
    
    return total > 0 ? Math.round((satisfied / total) * 100) : 0;
  }
  
  async generateActionItems(interactions) {
    const actionItems = [];
    
    // Analisar problemas comuns
    const lowSatisfaction = interactions.filter(i => 
      this.calculateInteractionSatisfaction(i).score < 0.6
    );
    
    if (lowSatisfaction.length > interactions.length * 0.2) {
      actionItems.push({
        priority: 'high',
        category: 'quality',
        title: 'Melhorar qualidade das respostas',
        description: `${lowSatisfaction.length} interações com baixa satisfação`,
        action: 'Revisar prompts e treinamento dos modelos de IA'
      });
    }
    
    // Analisar tempo de resposta
    const slowResponses = interactions.filter(i => 
      i.response_time > this.satisfactionMetrics.responseTime.good
    );
    
    if (slowResponses.length > interactions.length * 0.15) {
      actionItems.push({
        priority: 'medium',
        category: 'performance',
        title: 'Otimizar tempo de resposta',
        description: `${slowResponses.length} respostas lentas detectadas`,
        action: 'Implementar otimizações de cache e processamento'
      });
    }
    
    return actionItems;
  }
  
  async getInteractionData(timeframe) {
    // Implementar busca no banco - dados simulados por agora
    return [
      {
        id: 1,
        response_time: 1500,
        response: 'Olá! Vou verificar sua solicitação e retorno em breve.',
        follow_up_needed: false,
        created_at: new Date()
      },
      {
        id: 2,
        response_time: 8000,
        response: 'Não consegui processar sua solicitação no momento.',
        follow_up_needed: true,
        created_at: new Date()
      }
    ];
  }
}

// Adicionar ao metrics-dashboard.js
class OptimizationReportGenerator {
  
  constructor() {
    this.qualityAnalyzer = new QualityMetricsAnalyzer();
    this.satisfactionAnalyzer = new UserSatisfactionAnalyzer();
  }
  
  async generateOptimizationReport(timeframe = '30days') {
    console.log('📋 Gerando relatório de otimização...');
    
    const report = {
      summary: await this.generateExecutiveSummary(timeframe),
      performance: await this.analyzePerformanceMetrics(timeframe),
      opportunities: await this.identifyOptimizationOpportunities(timeframe),
      recommendations: await this.generateRecommendations(timeframe),
      roadmap: await this.createOptimizationRoadmap(timeframe),
      roi: await this.calculateOptimizationROI(timeframe)
    };
    
    return report;
  }
  
  async generateExecutiveSummary(timeframe) {
    const [quality, satisfaction, performance] = await Promise.all([
      this.qualityAnalyzer.analyzeResponseQuality(timeframe),
      this.satisfactionAnalyzer.analyzeSatisfaction(timeframe),
      this.getPerformanceData(timeframe)
    ]);
    
    return {
      period: timeframe,
      kpis: {
        qualityScore: quality.overall.score,
        satisfactionScore: satisfaction.overall.score,
        responseTime: performance.avgResponseTime,
        successRate: performance.successRate,
        costEfficiency: performance.costPerSuccess
      },
      highlights: [
        this.generateHighlight('quality', quality.overall.score),
        this.generateHighlight('satisfaction', satisfaction.overall.score),
        this.generateHighlight('performance', performance.successRate)
      ],
      alerts: await this.generateAlerts(quality, satisfaction, performance)
    };
  }
  
  async analyzePerformanceMetrics(timeframe) {
    const metrics = await this.getDetailedMetrics(timeframe);
    
    return {
      efficiency: {
        current: metrics.efficiency,
        target: 0.85,
        trend: this.calculateTrend(metrics.efficiencyHistory),
        improvement: this.calculateImprovement(metrics.efficiencyHistory)
      },
      costs: {
        total: metrics.totalCost,
        perInteraction: metrics.costPerInteraction,
        trend: this.calculateTrend(metrics.costHistory),
        breakdown: metrics.costBreakdown
      },
      quality: {
        average: metrics.averageQuality,
        consistency: metrics.qualityConsistency,
        byProvider: metrics.qualityByProvider,
        improvement: this.calculateImprovement(metrics.qualityHistory)
      },
      bottlenecks: await this.identifyBottlenecks(metrics)
    };
  }
  
  async identifyOptimizationOpportunities(timeframe) {
    const opportunities = [];
    
    // 1. Oportunidades de qualidade
    const qualityOps = await this.findQualityOpportunities(timeframe);
    opportunities.push(...qualityOps);
    
    // 2. Oportunidades de custo
    const costOps = await this.findCostOptimizations(timeframe);
    opportunities.push(...costOps);
    
    // 3. Oportunidades de performance
    const performanceOps = await this.findPerformanceOptimizations(timeframe);
    opportunities.push(...performanceOps);
    
    // 4. Oportunidades de satisfação
    const satisfactionOps = await this.findSatisfactionImprovements(timeframe);
    opportunities.push(...satisfactionOps);
    
    return this.prioritizeOpportunities(opportunities);
  }
  
  async findQualityOpportunities(timeframe) {
    const opportunities = [];
    
    const quality = await this.qualityAnalyzer.analyzeResponseQuality(timeframe);
    
    if (quality.overall.score < 0.8) {
      opportunities.push({
        category: 'quality',
        priority: 'high',
        title: 'Melhorar qualidade geral das respostas',
        currentValue: quality.overall.score,
        targetValue: 0.85,
        potentialImpact: 'Alto',
        effort: 'Médio',
        timeline: '2-4 semanas',
        actions: [
          'Revisar e otimizar prompts contextualizados',
          'Implementar feedback loop de qualidade',
          'Treinar modelos com exemplos de alta qualidade'
        ],
        expectedROI: '25% melhoria na satisfação do cliente'
      });
    }
    
    // Analisar qualidade por provider
    if (quality.byProvider.deepseek.score < quality.byProvider.openai.score - 0.15) {
      opportunities.push({
        category: 'quality',
        priority: 'medium',
        title: 'Otimizar prompts do DeepSeek',
        currentValue: quality.byProvider.deepseek.score,
        targetValue: quality.byProvider.openai.score - 0.05,
        potentialImpact: 'Médio',
        effort: 'Baixo',
        timeline: '1-2 semanas',
        actions: [
          'Adaptar prompts específicos para DeepSeek',
          'Ajustar parâmetros de temperatura e tokens',
          'Implementar pós-processamento de respostas'
        ],
        expectedROI: '15% redução de custos mantendo qualidade'
      });
    }
    
    return opportunities;
  }
  
  async findCostOptimizations(timeframe) {
    const opportunities = [];
    
    const costs = await this.getCostAnalysis(timeframe);
    
    if (costs.openaiPercentage > 60) {
      opportunities.push({
        category: 'cost',
        priority: 'high',
        title: 'Rebalancear uso de providers',
        currentValue: costs.openaiPercentage,
        targetValue: 45,
        potentialImpact: 'Alto',
        effort: 'Médio',
        timeline: '2-3 semanas',
        actions: [
          'Implementar roteamento mais agressivo para DeepSeek',
          'Otimizar critérios de seleção de provider',
          'Usar OpenAI apenas para casos críticos'
        ],
        expectedROI: `Economia de ${(costs.totalCost * 0.3).toFixed(2)} por mês`
      });
    }
    
    if (costs.averageTokensPerResponse > 400) {
      opportunities.push({
        category: 'cost',
        priority: 'medium',
        title: 'Otimizar consumo de tokens',
        currentValue: costs.averageTokensPerResponse,
        targetValue: 300,
        potentialImpact: 'Médio',
        effort: 'Baixo',
        timeline: '1 semana',
        actions: [
          'Ajustar max_tokens baseado na intenção',
          'Implementar prompts mais concisos',
          'Usar temperature menor para respostas mais diretas'
        ],
        expectedROI: `Economia de ${(costs.tokenCost * 0.25).toFixed(3)} por resposta`
      });
    }
    
    return opportunities;
  }
  
  async findPerformanceOptimizations(timeframe) {
    const opportunities = [];
    
    const performance = await this.getPerformanceData(timeframe);
    
    if (performance.avgResponseTime > 3000) {
      opportunities.push({
        category: 'performance',
        priority: 'high',
        title: 'Acelerar tempo de resposta',
        currentValue: performance.avgResponseTime,
        targetValue: 2000,
        potentialImpact: 'Alto',
        effort: 'Alto',
        timeline: '3-4 semanas',
        actions: [
          'Implementar cache de respostas frequentes',
          'Otimizar calls de API com paralelização',
          'Usar modelos mais rápidos para casos simples',
          'Implementar CDN para recursos estáticos'
        ],
        expectedROI: '30% melhoria na satisfação do usuário'
      });
    }
    
    if (performance.errorRate > 0.05) {
      opportunities.push({
        category: 'performance',
        priority: 'medium',
        title: 'Reduzir taxa de erro',
        currentValue: performance.errorRate,
        targetValue: 0.02,
        potentialImpact: 'Médio',
        effort: 'Médio',
        timeline: '2 semanas',
        actions: [
          'Implementar retry automático com backoff',
          'Melhorar handling de timeouts',
          'Adicionar fallbacks mais robustos'
        ],
        expectedROI: '95% de reliability target'
      });
    }
    
    return opportunities;
  }
  
  async generateRecommendations(timeframe) {
    const opportunities = await this.identifyOptimizationOpportunities(timeframe);
    
    const recommendations = {
      immediate: opportunities.filter(o => o.priority === 'high' && o.effort === 'Baixo'),
      shortTerm: opportunities.filter(o => o.priority === 'high' || (o.priority === 'medium' && o.effort !== 'Alto')),
      longTerm: opportunities.filter(o => o.effort === 'Alto'),
      quickWins: opportunities.filter(o => o.effort === 'Baixo' && o.potentialImpact !== 'Baixo')
    };
    
    return {
      ...recommendations,
      priorityMatrix: this.createPriorityMatrix(opportunities),
      implementation: this.createImplementationPlan(opportunities)
    };
  }
  
  async createOptimizationRoadmap(timeframe) {
    const opportunities = await this.identifyOptimizationOpportunities(timeframe);
    
    const roadmap = {
      week1: opportunities.filter(o => o.timeline.includes('1 semana')),
      weeks2_4: opportunities.filter(o => o.timeline.includes('2-4 semanas')),
      month2_3: opportunities.filter(o => o.timeline.includes('2-3 meses')),
      ongoing: [
        {
          title: 'Monitoramento contínuo de qualidade',
          description: 'Reviews semanais de métricas e ajustes incrementais'
        },
        {
          title: 'Otimização de prompts baseada em feedback',
          description: 'Atualizações mensais baseadas em dados de performance'
        }
      ]
    };
    
    return roadmap;
  }
  
  async calculateOptimizationROI(timeframe) {
    const currentMetrics = await this.getDetailedMetrics(timeframe);
    const opportunities = await this.identifyOptimizationOpportunities(timeframe);
    
    let totalInvestment = 0;
    let totalReturn = 0;
    
    opportunities.forEach(opp => {
      // Calcular investimento baseado no esforço
      const investmentMap = { 'Baixo': 1000, 'Médio': 5000, 'Alto': 15000 };
      totalInvestment += investmentMap[opp.effort] || 0;
      
      // Calcular retorno baseado no impacto
      const returnMap = { 'Baixo': 2000, 'Médio': 8000, 'Alto': 25000 };
      totalReturn += returnMap[opp.potentialImpact] || 0;
    });
    
    return {
      totalInvestment,
      totalReturn,
      roi: totalInvestment > 0 ? ((totalReturn - totalInvestment) / totalInvestment) * 100 : 0,
      paybackPeriod: totalReturn > 0 ? Math.ceil(totalInvestment / (totalReturn / 12)) : null,
      breakeven: {
        qualityImprovement: 0.15,
        costReduction: 0.25,
        satisfactionIncrease: 0.20
      }
    };
  }
  
  // Métodos auxiliares
  generateHighlight(type, value) {
    const templates = {
      quality: { threshold: 0.8, good: 'Qualidade excelente', poor: 'Qualidade precisa melhorar' },
      satisfaction: { threshold: 0.75, good: 'Satisfação alta', poor: 'Satisfação baixa' },
      performance: { threshold: 0.9, good: 'Performance ótima', poor: 'Performance instável' }
    };
    
    const template = templates[type];
    return {
      type,
      value,
      status: value >= template.threshold ? 'good' : 'poor',
      message: value >= template.threshold ? template.good : template.poor
    };
  }
  
  prioritizeOpportunities(opportunities) {
    return opportunities.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const impactWeight = { Alto: 3, Médio: 2, Baixo: 1 };
      
      const scoreA = priorityWeight[a.priority] + impactWeight[a.potentialImpact];
      const scoreB = priorityWeight[b.priority] + impactWeight[b.potentialImpact];
      
      return scoreB - scoreA;
    });
  }
  
  calculateTrend(history) {
    if (history.length < 2) return 'stable';
    
    const recent = history.slice(-3);
    const older = history.slice(-6, -3);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }
  
  calculateImprovement(history) {
    if (history.length < 2) return 0;
    
    const first = history[0];
    const last = history[history.length - 1];
    
    return ((last - first) / first) * 100;
  }
  
  // Métodos para buscar dados (implementar com banco real)
  async getPerformanceData(timeframe) {
    return {
      avgResponseTime: 2500,
      successRate: 0.92,
      costPerSuccess: 0.05,
      errorRate: 0.03,
      efficiency: 0.88
    };
  }
  
  async getDetailedMetrics(timeframe) {
    return {
      efficiency: 0.85,
      totalCost: 150.00,
      costPerInteraction: 0.08,
      averageQuality: 0.82,
      qualityConsistency: 0.78,
      efficiencyHistory: [0.8, 0.82, 0.85, 0.87, 0.85],
      costHistory: [160, 155, 150, 148, 150],
      qualityHistory: [0.78, 0.80, 0.82, 0.84, 0.82],
      qualityByProvider: {
        deepseek: { score: 0.78 },
        openai: { score: 0.87 }
      },
      costBreakdown: {
        deepseek: 45.00,
        openai: 105.00
      }
    };
  }
  
  async getCostAnalysis(timeframe) {
    return {
      totalCost: 150.00,
      openaiPercentage: 70,
      averageTokensPerResponse: 450,
      tokenCost: 0.002
    };
  }
}

module.exports = { 
  MetricsDashboard, 
  QualityMetricsAnalyzer, 
  UserSatisfactionAnalyzer, 
  OptimizationReportGenerator 
};