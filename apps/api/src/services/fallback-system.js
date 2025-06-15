// SISTEMA DE FALLBACK MULTI-NÍVEL
const FALLBACK_LEVELS = {
  level1: 'AI_PRIMARY',      // Provider principal
  level2: 'AI_SECONDARY',    // Provider secundário  
  level3: 'SMART_TEMPLATE',  // Templates inteligentes
  level4: 'BASIC_RESPONSE'   // Resposta básica
};

class FallbackSystem {
  
  async executeWithFallback(context, operation) {
    for (const [level, method] of Object.entries(FALLBACK_LEVELS)) {
      try {
        console.log(`🔄 Tentando ${level}: ${method}`);
        
        const result = await this.executeLevel(method, context);
        
        if (result.success) {
          console.log(`✅ Sucesso no ${level}`);
          return result;
        }
        
      } catch (error) {
        console.log(`❌ Falha no ${level}:`, error.message);
        continue;
      }
    }
    
    // Fallback final
    return this.getEmergencyResponse(context);
  }
  
  async executeLevel(method, context) {
    switch (method) {
      case 'AI_PRIMARY':
        return await this.callPrimaryAI(context);
      case 'AI_SECONDARY': 
        return await this.callSecondaryAI(context);
      case 'SMART_TEMPLATE':
        return this.useSmartTemplate(context);
      case 'BASIC_RESPONSE':
        return this.getBasicResponse(context);
      default:
        throw new Error('Método desconhecido');
    }
  }
  
  getEmergencyResponse(context) {
    return {
      success: true,
      response: "Obrigado pela sua mensagem! Nossa equipe retornará em breve.",
      method: 'emergency',
      timestamp: new Date()
    };
  }
}

// Adicionar ao fallback-system.js
class CreditBasedFallback {
  
  async selectProviderByCredits(userCredits, requiredCredits) {
    console.log(`💳 Verificando créditos: Disponível: ${userCredits}, Necessário: ${requiredCredits}`);
    
    if (userCredits >= requiredCredits.openai) {
      return {
        provider: 'openai',
        reason: 'Créditos suficientes para qualidade premium',
        costEstimate: requiredCredits.openai
      };
    } else if (userCredits >= requiredCredits.deepseek) {
      return {
        provider: 'deepseek', 
        reason: 'Otimização de custos - créditos limitados',
        costEstimate: requiredCredits.deepseek
      };
    } else {
      return {
        provider: 'template',
        reason: 'Créditos insuficientes - usando template',
        costEstimate: 0
      };
    }
  }
  
  calculateRequiredCredits(messageComplexity, userPlan) {
    const baseCredits = {
      simple: { openai: 3, deepseek: 1 },
      medium: { openai: 5, deepseek: 2 },
      complex: { openai: 8, deepseek: 3 }
    };
    
    const planMultiplier = {
      basic: 1.0,
      pro: 0.8,
      premium: 0.6
    };
    
    const credits = baseCredits[messageComplexity];
    const multiplier = planMultiplier[userPlan] || 1.0;
    
    return {
      openai: Math.ceil(credits.openai * multiplier),
      deepseek: Math.ceil(credits.deepseek * multiplier)
    };
  }
}

// Adicionar ao fallback-system.js
class RetrySystem {
  
  async executeWithRetry(operation, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentativa ${attempt}/${maxRetries}`);
        
        const result = await this.executeWithTimeout(operation, 30000);
        
        console.log(`✅ Sucesso na tentativa ${attempt}`);
        return result;
        
      } catch (error) {
        lastError = error;
        console.log(`❌ Tentativa ${attempt} falhou:`, error.message);
        
        if (attempt < maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          console.log(`⏱️ Aguardando ${delay}ms antes da próxima tentativa`);
          await this.sleep(delay);
        }
      }
    }
    
    throw new Error(`Falha após ${maxRetries} tentativas: ${lastError.message}`);
  }
  
  calculateBackoffDelay(attempt) {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.min(1000 * Math.pow(2, attempt - 1), 10000);
  }
  
  async executeWithTimeout(operation, timeoutMs) {
    return Promise.race([
      operation(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      )
    ]);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Adicionar ao fallback-system.js
class HealthMonitor {
  
  constructor() {
    this.apiHealth = {
      deepseek: { status: 'healthy', lastCheck: Date.now(), responseTime: 0 },
      openai: { status: 'healthy', lastCheck: Date.now(), responseTime: 0 }
    };
    
    // Verificar saúde a cada 5 minutos
    setInterval(() => this.checkAllAPIs(), 5 * 60 * 1000);
  }
  
  async checkAPIHealth(provider) {
    const startTime = Date.now();
    
    try {
      // Fazer uma requisição de teste
      const testResult = await this.sendTestRequest(provider);
      const responseTime = Date.now() - startTime;
      
      this.apiHealth[provider] = {
        status: testResult.success ? 'healthy' : 'degraded',
        lastCheck: Date.now(),
        responseTime,
        lastError: testResult.error
      };
      
      console.log(`🏥 ${provider} Health:`, this.apiHealth[provider]);
      
    } catch (error) {
      this.apiHealth[provider] = {
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        lastError: error.message
      };
      
      console.log(`🚨 ${provider} UNHEALTHY:`, error.message);
    }
  }
  
  async sendTestRequest(provider) {
    // Simular requisição de teste
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: Math.random() > 0.1 }); // 90% success rate
      }, Math.random() * 2000);
    });
  }
  
  async checkAllAPIs() {
    console.log('🔍 Verificando saúde de todas as APIs...');
    await Promise.all([
      this.checkAPIHealth('deepseek'),
      this.checkAPIHealth('openai')
    ]);
  }
  
  getHealthyProviders() {
    return Object.entries(this.apiHealth)
      .filter(([_, health]) => health.status === 'healthy')
      .map(([provider, _]) => provider);
  }
  
  getBestProvider() {
    const healthy = this.getHealthyProviders();
    
    if (healthy.length === 0) {
      return null;
    }
    
    // Retorna o provider com menor tempo de resposta
    return healthy.reduce((best, current) => {
      const bestTime = this.apiHealth[best].responseTime;
      const currentTime = this.apiHealth[current].responseTime;
      return currentTime < bestTime ? current : best;
    });
  }
}

module.exports = { FallbackSystem, CreditBasedFallback, RetrySystem, HealthMonitor };






