// SISTEMA DE PROMPTS AVANÇADOS CONTEXTUALIZADOS
const ADVANCED_PROMPTS = {
  // Prompts por segmento de cliente
  dentista: {
    agendamento: `Você é um assistente especializado em consultórios odontológicos. 
    Contexto: {userProfile}
    Histórico: {conversationHistory}
    
    Responda de forma acolhedora e profissional sobre agendamentos.
    Sempre confirme disponibilidade e ofereça opções de horário.
    Use linguagem técnica apropriada quando necessário.`,
    
    vendas: `Você representa um consultório odontológico premium.
    Perfil do cliente: {customerProfile}
    Interesse demonstrado: {intentionScore}
    
    Apresente os tratamentos focando em benefícios para saúde bucal.
    Use social proof e depoimentos quando apropriado.
    Seja consultivo, não apenas vendedor.`,
    
    suporte: `Você é um assistente de consultório odontológico.
    Caso atual: {currentIssue}
    Urgência: {urgencyLevel}
    
    Forneça informações precisas sobre procedimentos e cuidados.
    Se for emergência, priorize agendamento urgente.
    Demonstre empatia e conhecimento técnico.`
  },

  consultor: {
    agendamento: `Você é assistente de um consultor empresarial.
    Área de especialização: {consultingArea}
    Perfil do lead: {leadProfile}
    
    Demonstre valor desde o primeiro contato.
    Qualifique a necessidade antes de propor horários.
    Use linguagem executiva e objetiva.`,
    
    vendas: `Você representa um consultor especialista.
    Necessidade identificada: {businessNeed}
    Orçamento estimado: {budgetRange}
    
    Foque no ROI e resultados mensuráveis.
    Use cases de sucesso relevantes ao segmento.
    Seja estratégico na abordagem.`,
    
    suporte: `Você é assistente de consultoria empresarial.
    Dúvida sobre: {consultingTopic}
    Nível de complexidade: {complexityLevel}
    
    Forneça insights valiosos mesmo em interações gratuitas.
    Demonstre expertise e construa autoridade.
    Direcione para consulta aprofundada quando necessário.`
  },

  geral: {
    agendamento: `Assistente profissional para agendamentos.
    Tipo de negócio: {businessType}
    Preferências do cliente: {customerPreferences}
    
    Seja eficiente e cordial.
    Confirme todos os detalhes importantes.
    Adapte linguagem ao perfil do cliente.`,
    
    vendas: `Representante comercial qualificado.
    Produto/serviço: {productService}
    Estágio do funil: {salesStage}
    
    Identifique necessidades antes de apresentar soluções.
    Use abordagem consultiva.
    Construa valor progressivamente.`,
    
    suporte: `Assistente de atendimento especializado.
    Tipo de solicitação: {requestType}
    Histórico do cliente: {customerHistory}
    
    Resolva dúvidas com precisão e agilidade.
    Escalate casos complexos apropriadamente.
    Mantenha foco na satisfação do cliente.`
  }
};

// Prompts por estágio da jornada do cliente
const JOURNEY_PROMPTS = {
  descoberta: {
    foco: "Educar e despertar interesse",
    tom: "Informativo e acolhedor",
    cta: "Agendar conversa de descoberta"
  },
  consideracao: {
    foco: "Comparar soluções e construir valor",
    tom: "Consultivo e técnico",
    cta: "Propor demonstração ou consulta"
  },
  decisao: {
    foco: "Remover objeções e facilitar compra",
    tom: "Assertivo e convincente",
    cta: "Finalizar proposta"
  },
  pos_venda: {
    foco: "Garantir satisfação e fidelização",
    tom: "Prestativo e proativo",
    cta: "Agendar follow-up"
  }
};

module.exports = {
  ADVANCED_PROMPTS,
  JOURNEY_PROMPTS,
  
  buildContextualPrompt(userProfile, customerProfile, intention, conversationHistory) {
    const segment = userProfile.business_type || 'geral';
    const basePrompt = ADVANCED_PROMPTS[segment]?.[intention] || ADVANCED_PROMPTS.geral[intention];
    
    const context = {
      userProfile: JSON.stringify(userProfile),
      customerProfile: JSON.stringify(customerProfile),
      conversationHistory: this.summarizeHistory(conversationHistory),
      intentionScore: this.calculateIntentionScore(conversationHistory),
      urgencyLevel: this.detectUrgency(conversationHistory),
      businessNeed: this.identifyBusinessNeed(conversationHistory)
    };
    
    return this.interpolatePrompt(basePrompt, context);
  },
  
  interpolatePrompt(template, context) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return context[key] || match;
    });
  }
};

// SISTEMA DE PERSONALIZAÇÃO DINÂMICA
const PERSONALIZATION_ENGINE = {
  
  summarizeHistory(history) {
    if (!history || history.length === 0) return "Primeira interação";
    
    const recentMessages = history.slice(-5);
    const topics = this.extractTopics(recentMessages);
    const sentiment = this.analyzeSentiment(recentMessages);
    
    return `Últimas interações: ${topics.join(', ')}. Tom: ${sentiment}`;
  },
  
  calculateIntentionScore(history) {
    const buyingSignals = ['preço', 'valor', 'contratar', 'comprar', 'quanto custa'];
    const signalCount = history.filter(msg => 
      buyingSignals.some(signal => msg.content.toLowerCase().includes(signal))
    ).length;
    
    return Math.min(signalCount * 20, 100); // 0-100
  },
  
  detectUrgency(history) {
    const urgentWords = ['urgente', 'emergência', 'rápido', 'hoje', 'agora'];
    const hasUrgency = history.some(msg => 
      urgentWords.some(word => msg.content.toLowerCase().includes(word))
    );
    
    return hasUrgency ? 'Alta' : 'Normal';
  },
  
  identifyBusinessNeed(history) {
    const needPatterns = {
      'crescimento': ['crescer', 'expandir', 'aumentar vendas'],
      'eficiencia': ['otimizar', 'automatizar', 'produtividade'],
      'custo': ['reduzir custo', 'economizar', 'barato'],
      'qualidade': ['melhorar', 'qualidade', 'excelência']
    };
    
    for (const [need, keywords] of Object.entries(needPatterns)) {
      if (keywords.some(keyword => 
        history.some(msg => msg.content.toLowerCase().includes(keyword))
      )) {
        return need;
      }
    }
    
    return 'geral';
  },
  
  extractTopics(messages) {
    const topicWords = messages.flatMap(msg => 
      msg.content.split(' ').filter(word => word.length > 4)
    );
    
    return [...new Set(topicWords)].slice(0, 3);
  },
  
  analyzeSentiment(messages) {
    const positiveWords = ['ótimo', 'excelente', 'gostei', 'perfeito'];
    const negativeWords = ['problema', 'ruim', 'não gostei', 'difícil'];
    
    let score = 0;
    messages.forEach(msg => {
      positiveWords.forEach(word => {
        if (msg.content.toLowerCase().includes(word)) score += 1;
      });
      negativeWords.forEach(word => {
        if (msg.content.toLowerCase().includes(word)) score -= 1;
      });
    });
    
    return score > 0 ? 'Positivo' : score < 0 ? 'Negativo' : 'Neutro';
  }
};

module.exports = { ...module.exports, PERSONALIZATION_ENGINE };

// PROMPTS ESPECIALIZADOS POR CENÁRIO
const SCENARIO_PROMPTS = {
  
  horario_pico: {
    prefixo: "⚡ HORÁRIO DE PICO - Resposta rápida e eficiente:",
    tom: "Direto e objetivo",
    max_tokens: 150
  },
  
  horario_baixo: {
    prefixo: "🌟 Atendimento personalizado disponível:",
    tom: "Detalhado e consultivo", 
    max_tokens: 300
  },
  
  cliente_vip: {
    prefixo: "👑 Atendimento VIP exclusivo:",
    tom: "Premium e personalizado",
    prioridade: "alta"
  },
  
  cliente_novo: {
    prefixo: "🎉 Bem-vindo! Primeira vez conosco:",
    tom: "Acolhedor e educativo",
    incluir_apresentacao: true
  },
  
  promocional: {
    prefixo: "🎯 Oferta especial disponível:",
    tom: "Persuasivo com urgência",
    incluir_cta: true
  },
  
  retencao: {
    prefixo: "💝 Queremos você de volta:",
    tom: "Empático e solucionador",
    foco: "recuperar relacionamento"
  }
};

// Prompts por funil de conversão
const FUNNEL_PROMPTS = {
  topo: {
    objetivo: "Educar e despertar interesse",
    conteudo: "Informações gerais e benefícios",
    cta: "Saiba mais"
  },
  meio: {
    objetivo: "Qualificar e construir valor",
    conteudo: "Comparações e diferenciações",
    cta: "Agende demonstração"
  },
  fundo: {
    objetivo: "Converter e fechar negócio",
    conteudo: "Propostas e facilidades",
    cta: "Contrate agora"
  }
};

module.exports = { ...module.exports, SCENARIO_PROMPTS, FUNNEL_PROMPTS };