// Criar arquivo src/services/cost-optimizer.js
class CostOptimizer {
  
  constructor() {
    this.dailyBudgets = new Map();
    this.usageTracking = new Map();
    this.costThresholds = {
      warning: 0.8,  // 80% do budget
      critical: 0.95 // 95% do budget
    };
  }
  
  async optimizeCostByLoad(currentLoad, userBudget) {
    const costPrediction = this.predictCosts(currentLoad);
    
    console.log('💰 Otimização de Custos:', {
      currentLoad,
      userBudget,
      costPrediction
    });
    
    if (costPrediction.total > userBudget * this.costThresholds.critical) {
      return {
        recommendation: 'use_deepseek_only',
        reason: 'Budget crítico - máxima economia',
        savingsEstimate: costPrediction.total * 0.6
      };
    } else if (costPrediction.total > userBudget * this.costThresholds.warning) {
      return {
        recommendation: 'balanced_priority_deepseek',
        reason: 'Budget próximo do limite',
        savingsEstimate: costPrediction.total * 0.3
      };
    } else {
      return {
        recommendation: 'quality_priority',
        reason: 'Budget confortável',
        savingsEstimate: 0
      };
    }
  }
  
  predictCosts(load) {
    const hourlyRates = {
      deepseek: 0.002, // por mensagem
      openai: 0.008    // por mensagem
    };
    
    return {
      deepseek: load.deepseek * hourlyRates.deepseek,
      openai: load.openai * hourlyRates.openai,
      total: (load.deepseek * hourlyRates.deepseek) + (load.openai * hourlyRates.openai)
    };
  }
  
  async balanceLoad(targetDistribution, currentLoad) {
    const rebalanced = {
      deepseek: Math.floor(currentLoad.total * targetDistribution.deepseek),
      openai: Math.floor(currentLoad.total * targetDistribution.openai)
    };
    
    console.log('⚖️ Load Balancing:', {
      target: targetDistribution,
      current: currentLoad,
      rebalanced
    });
    
    return rebalanced;
  }
}

// Adicionar ao cost-optimizer.js
class BudgetOptimizer {
  
  async optimizeByUserBudget(userId, remainingBudget, estimatedUsage) {
    const userPlan = await this.getUserPlan(userId);
    const budgetStatus = this.analyzeBudgetStatus(remainingBudget, estimatedUsage);
    
    console.log(`💳 Budget Optimization para User ${userId}:`, {
      remainingBudget,
      estimatedUsage,
      budgetStatus
    });
    
    switch (budgetStatus.level) {
      case 'abundant':
        return this.getAbundantStrategy();
      case 'comfortable':
        return this.getComfortableStrategy();
      case 'tight':
        return this.getTightStrategy();
      case 'critical':
        return this.getCriticalStrategy();
      default:
        return this.getDefaultStrategy();
    }
  }
  
  analyzeBudgetStatus(remaining, estimated) {
    const ratio = remaining / estimated;
    
    if (ratio > 3) {
      return { level: 'abundant', ratio, daysLeft: Math.floor(ratio) };
    } else if (ratio > 1.5) {
      return { level: 'comfortable', ratio, daysLeft: Math.floor(ratio) };
    } else if (ratio > 0.5) {
      return { level: 'tight', ratio, daysLeft: Math.floor(ratio) };
    } else {
      return { level: 'critical', ratio, daysLeft: Math.floor(ratio) };
    }
  }
  
  getAbundantStrategy() {
    return {
      primaryProvider: 'openai',
      fallbackProvider: 'deepseek',
      qualityMode: 'premium',
      costSaving: false,
      message: 'Budget abundante - foco em qualidade máxima'
    };
  }
  
  getComfortableStrategy() {
    return {
      primaryProvider: 'balanced',
      fallbackProvider: 'deepseek',
      qualityMode: 'high',
      costSaving: false,
      message: 'Budget confortável - balanceamento qualidade/custo'
    };
  }
  
  getTightStrategy() {
    return {
      primaryProvider: 'deepseek',
      fallbackProvider: 'template',
      qualityMode: 'standard',
      costSaving: true,
      message: 'Budget apertado - otimização de custos'
    };
  }
  
  getCriticalStrategy() {
    return {
      primaryProvider: 'template',
      fallbackProvider: 'basic',
      qualityMode: 'economy',
      costSaving: true,
      message: 'Budget crítico - máxima economia'
    };
  }
  
  async getUserPlan(userId) {
    // Implementar busca do plano no banco
    return 'pro'; // Placeholder
  }
}

// Adicionar ao cost-optimizer.js
class CostAlertSystem {
  
  async checkCostThresholds(userId, currentUsage, budget) {
    const percentage = (currentUsage / budget) * 100;
    const alerts = [];
    
    if (percentage >= 95) {
      alerts.push(await this.createCriticalAlert(userId, percentage, currentUsage, budget));
    } else if (percentage >= 80) {
      alerts.push(await this.createWarningAlert(userId, percentage, currentUsage, budget));
    } else if (percentage >= 50) {
      alerts.push(await this.createInfoAlert(userId, percentage, currentUsage, budget));
    }
    
    // Enviar alertas
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
    
    return alerts;
  }
  
  async createCriticalAlert(userId, percentage, usage, budget) {
    return {
      level: 'critical',
      userId,
      title: '🚨 ORÇAMENTO CRÍTICO',
      message: `Você usou ${percentage.toFixed(1)}% do seu orçamento mensal (R$ ${usage.toFixed(2)} de R$ ${budget.toFixed(2)})`,
      recommendations: [
        'Considere fazer upgrade do plano',
        'Ative modo economia nas configurações',
        'Use templates automáticos para mensagens simples'
      ],
      actions: ['upgrade_plan', 'enable_economy_mode', 'purchase_credits']
    };
  }
  
  async createWarningAlert(userId, percentage, usage, budget) {
    return {
      level: 'warning',
      userId,
      title: '⚠️ Alerta de Orçamento',
      message: `Você usou ${percentage.toFixed(1)}% do seu orçamento mensal`,
      recommendations: [
        'Monitore uso mais de perto',
        'Considere otimizar configurações de IA'
      ],
      actions: ['view_usage_details', 'optimize_settings']
    };
  }
  
  async createInfoAlert(userId, percentage, usage, budget) {
    return {
      level: 'info',
      userId,
      title: '📊 Relatório de Uso',
      message: `Uso atual: ${percentage.toFixed(1)}% do orçamento mensal`,
      recommendations: ['Continue monitorando seu uso'],
      actions: ['view_detailed_report']
    };
  }
  
  async sendAlert(alert) {
    console.log(`📧 Enviando alerta ${alert.level}:`, alert);
    
    // Implementar envio por email/webhook/push notification
    try {
      await this.saveAlertToDatabase(alert);
      await this.sendEmailAlert(alert);
      await this.sendPushNotification(alert);
    } catch (error) {
      console.error('Erro ao enviar alerta:', error);
    }
  }
  
  async saveAlertToDatabase(alert) {
    // Implementar salvamento no Supabase
    console.log('💾 Salvando alerta no banco:', alert.title);
  }
  
  async sendEmailAlert(alert) {
    // Implementar envio de email
    console.log('📧 Email enviado:', alert.title);
  }
  
  async sendPushNotification(alert) {
    // Implementar push notification
    console.log('📱 Push notification enviado:', alert.title);
  }
}

// Adicionar ao cost-optimizer.js
class ROIAnalyzer {
  
  async analyzeROIByProvider(timeRange = '30days') {
    const data = await this.getUsageData(timeRange);
    const roi = this.calculateROI(data);
    
    console.log('📈 Análise de ROI por Provider:', roi);
    
    return {
      period: timeRange,
      providers: {
        deepseek: this.analyzeProviderROI(data.deepseek),
        openai: this.analyzeProviderROI(data.openai)
      },
      recommendations: this.generateROIRecommendations(roi),
      summary: this.generateROISummary(roi)
    };
  }
  
  analyzeProviderROI(providerData) {
    const totalCost = providerData.totalCost;
    const totalRevenue = providerData.conversions * providerData.avgConversionValue;
    const roi = ((totalRevenue - totalCost) / totalCost) * 100;
    
    return {
      totalMessages: providerData.totalMessages,
      totalCost: totalCost,
      conversions: providerData.conversions,
      conversionRate: (providerData.conversions / providerData.totalMessages) * 100,
      avgConversionValue: providerData.avgConversionValue,
      totalRevenue: totalRevenue,
      roi: roi,
      costPerConversion: totalCost / providerData.conversions,
      quality: {
        avgSatisfaction: providerData.avgSatisfaction,
        avgResponseTime: providerData.avgResponseTime,
        errorRate: providerData.errorRate
      }
    };
  }
  
  calculateROI(data) {
    const total = {
      cost: data.deepseek.totalCost + data.openai.totalCost,
      revenue: (data.deepseek.conversions * data.deepseek.avgConversionValue) +
               (data.openai.conversions * data.openai.avgConversionValue),
      messages: data.deepseek.totalMessages + data.openai.totalMessages,
      conversions: data.deepseek.conversions + data.openai.conversions
    };
    
    return {
      overall: ((total.revenue - total.cost) / total.cost) * 100,
      costEfficiency: total.cost / total.messages,
      revenueEfficiency: total.revenue / total.messages,
      conversionEfficiency: total.conversions / total.messages
    };
  }
  
  generateROIRecommendations(roi) {
    const recommendations = [];
    
    if (roi.providers.deepseek.roi > roi.providers.openai.roi) {
      recommendations.push({
        type: 'cost_optimization',
        message: 'DeepSeek apresenta melhor ROI - considere aumentar seu uso',
        impact: 'Economia estimada de 25%'
      });
    } else {
      recommendations.push({
        type: 'quality_optimization', 
        message: 'OpenAI apresenta melhor ROI - qualidade compensa o custo',
        impact: 'Aumento de conversão estimado em 15%'
      });
    }
    
    if (roi.overall < 100) {
      recommendations.push({
        type: 'general_optimization',
        message: 'ROI geral abaixo de 100% - revisar estratégia',
        impact: 'Otimização necessária'
      });
    }
    
    return recommendations;
  }
  
  generateROISummary(roi) {
    return {
      bestProvider: roi.providers.deepseek.roi > roi.providers.openai.roi ? 'deepseek' : 'openai',
      overallHealth: roi.overall > 200 ? 'excelente' : roi.overall > 100 ? 'bom' : 'necessita otimização',
      keyMetrics: {
        totalROI: roi.overall.toFixed(2) + '%',
        bestProviderROI: Math.max(roi.providers.deepseek.roi, roi.providers.openai.roi).toFixed(2) + '%',
        costPerMessage: roi.costEfficiency.toFixed(4)
      }
    };
  }
  
  async getUsageData(timeRange) {
    // Implementar busca de dados no Supabase
    return {
      deepseek: {
        totalMessages: 1000,
        totalCost: 50.00,
        conversions: 80,
        avgConversionValue: 150.00,
        avgSatisfaction: 4.2,
        avgResponseTime: 2.1,
        errorRate: 0.03
      },
      openai: {
        totalMessages: 500,
        totalCost: 75.00,
        conversions: 60,
        avgConversionValue: 200.00,
        avgSatisfaction: 4.7,
        avgResponseTime: 1.8,
        errorRate: 0.01
      }
    };
  }
}

module.exports = { CostOptimizer, BudgetOptimizer, CostAlertSystem, ROIAnalyzer };