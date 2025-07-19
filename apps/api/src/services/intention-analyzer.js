// ===============================================
// 🎯 ANALISADOR DE INTENÇÃO COM IA (VERSÃO FINAL)
// ===============================================
const fetch = require('node-fetch');

// FUNÇÃO AUXILIAR QUE MONTA O PROMPT
function buildAnalysisPrompt(messageContent) {
    const agora = new Date();
    const hoje = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const dataAtual = hoje.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return `
CONTEXTO TEMPORAL E REGRAS:
- HOJE É: ${dataAtual.toUpperCase()} (Fuso Horário de Brasília, GMT-3).
- REGRA DE OURO: NUNCA sugira ou confirme agendamentos para datas ou horários que já passaram. Sempre ofereça opções para o FUTURO.
- REGRA DE SEGURANÇA: NUNCA invente nomes de profissionais ou horários. Se você não tem a informação real, diga que precisa verificar no sistema.

TAREFA PRIMÁRIA: Analise a MENSAGEM abaixo e classifique a intenção do usuário.
MENSAGEM: "${messageContent}"

Responda APENAS com uma das seguintes categorias de intenção:
- "scheduling": Se o usuário quer agendar, marcar, ver horários, ou perguntar sobre profissionais disponíveis.
- "rescheduling": Se o usuário quer REMARCAR.
- "cancellation": Se o usuário quer CANCELAR.
- "inquiry": Se o usuário está perguntando sobre um agendamento que já existe.
- "general": Para qualquer outra coisa (saudações, etc.).

Qual é a intenção?`;
}

function extractDateTime(message) {
  try {
    console.log('🕐 Extraindo data/hora localmente (fallback):', message);
    
    const now = new Date();
    const patterns = {
      tomorrow: /\b(amanhã|amanha)\b/gi,
      today: /\b(hoje)\b/gi,
      time: /\b(\d{1,2}):?(\d{0,2})\s?(h|hs|horas?)?\b/gi
    };
    
    let suggestedDate = null;
    let suggestedTime = null;
    
    // Detectar data
    if (patterns.tomorrow.test(message)) {
      suggestedDate = new Date(now);
      suggestedDate.setDate(now.getDate() + 1);
    } else if (patterns.today.test(message)) {
      suggestedDate = new Date(now);
    }
    
    // Detectar horário
    const timeMatch = message.match(patterns.time);
    if (timeMatch && timeMatch.length > 0) {
      const timeStr = timeMatch[0];
      const timeDigits = timeStr.match(/\d+/g);
      if (timeDigits && timeDigits.length > 0) {
        const hour = parseInt(timeDigits[0]);
        const minute = timeDigits.length > 1 ? parseInt(timeDigits[1]) : 0;
        
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          suggestedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }
      }
    }
    
    return {
      suggestedDate: suggestedDate ? suggestedDate.toISOString().split('T')[0] : null,
      suggestedTime: suggestedTime,
      hasDateReference: suggestedDate !== null,
      hasTimeReference: suggestedTime !== null
    };
    
  } catch (error) {
    console.error('❌ Erro ao extrair data/hora:', error);
    return {
      suggestedDate: null,
      suggestedTime: null,
      hasDateReference: false,
      hasTimeReference: false
    };
  }
}

// FUNÇÃO PRINCIPAL DE ANÁLISE (A ÚNICA QUE PRECISAMOS)
async function analyze(messageContent, context = {}) {
    try {
        const prompt = buildAnalysisPrompt(messageContent);

        const response = await axios.post(/* ... sua chamada axios ... */);
        
        const aiResult = response.data;
        const rawContent = (aiResult.choices?.[0]?.message?.content || '').trim().replace(/"/g, '');
        console.log(`🤖 Resposta crua da IA: "${rawContent}"`);

        let intention = 'general';
        if (rawContent.toLowerCase().includes('scheduling')) {
            intention = 'scheduling';
        }

        // ✅ NOVA PARTE: Se a intenção for agendamento, extraia a data/hora
        let dateTimeInfo = null;
        if (intention === 'scheduling') {
            dateTimeInfo = extractDateTime(messageContent);
        }

        return {
            intention: intention,
            confidence: 0.9,
            provider: 'deepseek-text-axios',
            timestamp: new Date().toISOString(),
            dateTime: dateTimeInfo // ✅ RETORNANDO A DATA/HORA
        };

    } catch (error) {
        // ...
    }
}

// ✅ EXPORTE A FUNÇÃO analyze
module.exports = {
    analyze
};