// ===============================================
// AI ROUTER - ROTEAMENTO INTELIGENTE ENTRE PROVIDERS
// ===============================================

// ===============================================
// CONFIGURAÇÕES DE ROTEAMENTO
// ===============================================
const ROUTING_RULES = {
  // Intenções que devem usar OpenAI (alta qualidade)
  openai_intentions: ['sales', 'complaint', 'pricing'],
  
  // Intenções que podem usar DeepSeek (economia)
  deepseek_intentions: ['greeting', 'scheduling', 'support', 'information', 'other'],
  
  // Custos em créditos por provider
  costs: {
    deepseek: 1,    // 1 crédito por mensagem
    openai: 3       // 3 créditos por mensagem (mais caro, maior qualidade)
  }
};

// ===============================================
// FUNÇÃO PRINCIPAL: ROTEAMENTO DE IA
// ===============================================
function routeToProvider(intention, userProfile = null) {
  try {
    console.log(`🔀 Roteando intenção: ${intention}`);

    // 1. VERIFICAR PREFERÊNCIA DO USUÁRIO
    if (userProfile && userProfile.ai_preference) {
      const preference = userProfile.ai_preference;
      
      if (preference === 'premium' || preference === 'openai') {
        console.log('🎯 Usuário prefere OpenAI (premium)');
        return {
          provider: 'openai',
          model: 'gpt-4o-mini',
          credits: ROUTING_RULES.costs.openai,
          reasoning: 'Preferência do usuário: premium'
        };
      }
      
      if (preference === 'economy' || preference === 'deepseek') {
        console.log('💰 Usuário prefere DeepSeek (economia)');
        return {
          provider: 'deepseek',
          model: 'deepseek-chat',
          credits: ROUTING_RULES.costs.deepseek,
          reasoning: 'Preferência do usuário: economia'
        };
      }
    }

    // 2. ROTEAMENTO BASEADO NA INTENÇÃO
    if (ROUTING_RULES.openai_intentions.includes(intention)) {
      console.log(`🎯 OpenAI selecionado para intenção: ${intention}`);
      return {
        provider: 'openai',
        model: 'gpt-4o-mini',
        credits: ROUTING_RULES.costs.openai,
        reasoning: `Intenção ${intention} requer alta qualidade`
      };
    }

    if (ROUTING_RULES.deepseek_intentions.includes(intention)) {
      console.log(`💰 DeepSeek selecionado para intenção: ${intention}`);
      return {
        provider: 'deepseek',
        model: 'deepseek-chat',
        credits: ROUTING_RULES.costs.deepseek,
        reasoning: `Intenção ${intention} permite economia`
      };
    }

    // 3. FALLBACK PARA DEEPSEEK (ECONOMIA)
    console.log(`💰 Fallback: DeepSeek para intenção desconhecida: ${intention}`);
    return {
      provider: 'deepseek',
      model: 'deepseek-chat',
      credits: ROUTING_RULES.costs.deepseek,
      reasoning: 'Fallback para provider econômico'
    };

  } catch (error) {
    console.error('❌ Erro no roteamento:', error.message);
    
    // Fallback de segurança
    return {
      provider: 'deepseek',
      model: 'deepseek-chat',
      credits: ROUTING_RULES.costs.deepseek,
      reasoning: 'Erro no roteamento - fallback econômico'
    };
  }
}

// ===============================================
// FUNÇÃO: ROTEAMENTO BASEADO EM CRÉDITOS
// ===============================================
function routeBasedOnCredits(intention, availableCredits) {
  try {
    console.log(`💳 Roteando com ${availableCredits} créditos disponíveis`);

    // Se não tem créditos suficientes para OpenAI, usar DeepSeek
    if (availableCredits < ROUTING_RULES.costs.openai) {
      console.log('💰 Créditos insuficientes para OpenAI, usando DeepSeek');
      return {
        provider: 'deepseek',
        model: 'deepseek-chat',
        credits: ROUTING_RULES.costs.deepseek,
        reasoning: 'Créditos insuficientes para OpenAI'
      };
    }

    // Se tem créditos suficientes, usar roteamento normal
    return routeToProvider(intention);

  } catch (error) {
    console.error('❌ Erro no roteamento por créditos:', error.message);
    return routeToProvider(intention);
  }
}

// ===============================================
// FUNÇÃO: ROTEAMENTO HÍBRIDO (INTENÇÃO + CRÉDITOS)
// ===============================================
function routeHybrid(intention, userProfile = null, availableCredits = null) {
  try {
    // Se créditos informados, considerar na decisão
    if (availableCredits !== null && availableCredits < ROUTING_RULES.costs.openai) {
      return routeBasedOnCredits(intention, availableCredits);
    }

    // Senão, usar roteamento normal por intenção
    return routeToProvider(intention, userProfile);

  } catch (error) {
    console.error('❌ Erro no roteamento híbrido:', error.message);
    return routeToProvider(intention, userProfile);
  }
}

// ===============================================
// FUNÇÃO: OBTER INFORMAÇÕES DE PROVIDER
// ===============================================
function getProviderInfo(providerName) {
  const providers = {
    openai: {
      name: 'OpenAI',
      model: 'gpt-4o-mini',
      description: 'Alta qualidade, melhor para vendas e suporte crítico',
      cost_credits: ROUTING_RULES.costs.openai,
      use_cases: ['sales', 'complaint', 'pricing', 'complex_support']
    },
    deepseek: {
      name: 'DeepSeek',
      model: 'deepseek-chat',
      description: 'Econômico, boa qualidade para tarefas gerais',
      cost_credits: ROUTING_RULES.costs.deepseek,
      use_cases: ['greeting', 'scheduling', 'support', 'information', 'other']
    }
  };

  return providers[providerName] || null;
}

// ===============================================
// FUNÇÃO: LISTAR PROVIDERS DISPONÍVEIS
// ===============================================
function listAvailableProviders() {
  return {
    openai: getProviderInfo('openai'),
    deepseek: getProviderInfo('deepseek')
  };
}

// ===============================================
// FUNÇÃO: CALCULAR ECONOMIA ESTIMADA
// ===============================================
function calculateSavings(intention, totalMessages = 100) {
  const openaiRoute = routeToProvider(intention, { ai_preference: 'openai' });
  const deepseekRoute = routeToProvider(intention, { ai_preference: 'deepseek' });
  
  const openaiCost = totalMessages * openaiRoute.credits;
  const deepseekCost = totalMessages * deepseekRoute.credits;
  const savings = openaiCost - deepseekCost;
  const percentSavings = ((savings / openaiCost) * 100).toFixed(1);

  return {
    openai_cost: openaiCost,
    deepseek_cost: deepseekCost,
    savings_credits: savings,
    savings_percent: percentSavings,
    recommendation: savings > 0 ? 'deepseek' : 'openai'
  };
}

// ===============================================
// EXPORTAR FUNÇÕES
// ===============================================
module.exports = {
  routeToProvider,
  routeBasedOnCredits,
  routeHybrid,
  getProviderInfo,
  listAvailableProviders,
  calculateSavings,
  ROUTING_RULES
};