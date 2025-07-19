// ===============================================
// 🎯 ANALISADOR DE INTENÇÃO (VERSÃO COM DATA/HORA)
// ===============================================
const axios = require('axios');

function buildAnalysisPrompt(messageContent) {
    // ... (esta função continua exatamente a mesma) ...
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

// ✅ FUNÇÃO DE EXTRAÇÃO DE DATA/HORA REATIVADA
function extractDateTime(message) {
    try {
        console.log('🕐 Extraindo data/hora da mensagem:', message);
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        
        // Padrões de Regex
        const patterns = {
            tomorrow: /\b(amanhã|amanha)\b/i,
            today: /\b(hoje)\b/i,
            nextWeek: /semana que vem|próxima semana/i,
            weekday: /\b(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)\b/i,
            time: /\b(\d{1,2})h(?:(\d{2}))?|\b(\d{1,2}):(\d{2})\b/i,
            period: /\b(manhã|manha|tarde|noite)\b/i
        };

        let suggestedDate = null;
        let suggestedTime = null;

        // Extração de Data
        if (patterns.nextWeek.test(message)) {
            suggestedDate = new Date(now.setDate(now.getDate() + 7));
        } else if (patterns.tomorrow.test(message)) {
            suggestedDate = new Date(now.setDate(now.getDate() + 1));
        } else if (patterns.today.test(message)) {
            suggestedDate = now;
        } else {
            const weekdayMatch = message.match(patterns.weekday);
            if (weekdayMatch) {
                const weekdays = { 'domingo': 0, 'segunda': 1, 'terça': 2, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6, 'sabado': 6 };
                const targetDay = weekdays[weekdayMatch[0].toLowerCase()];
                suggestedDate = new Date(now);
                suggestedDate.setDate(now.getDate() + (targetDay + 7 - now.getDay()) % 7);
            }
        }

        // Extração de Hora
        const timeMatch = message.match(patterns.time);
        if (timeMatch) {
            const hour = parseInt(timeMatch[1] || timeMatch[3]);
            const minute = parseInt(timeMatch[2] || timeMatch[4] || '0');
            if (!isNaN(hour) && !isNaN(minute)) {
                suggestedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            }
        } else {
            const periodMatch = message.match(patterns.period);
            if (periodMatch) {
                const period = periodMatch[0].toLowerCase();
                if (period.includes('manhã') || period.includes('manha')) suggestedTime = '10:00';
                else if (period.includes('tarde')) suggestedTime = '15:00';
                else if (period.includes('noite')) suggestedTime = '19:00';
            }
        }

        const result = {
            suggestedDate: suggestedDate ? suggestedDate.toISOString().split('T')[0] : null,
            suggestedTime: suggestedTime
        };
        console.log('📅 Data/Hora Extraída:', result);
        return result;
    } catch (error) {
        console.error('❌ Erro ao extrair data/hora:', error);
        return { suggestedDate: null, suggestedTime: null };
    }
}

// ✅ FUNÇÃO DE ANÁLISE PRINCIPAL ATUALIZADA
async function analyze(messageContent, context = {}) {
    try {
        const prompt = buildAnalysisPrompt(messageContent);
        const response = await axios.post(
            `${process.env.DEEPSEEK_BASE_URL}/chat/completions`,
            { model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0.2 },
            { headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' } }
        );

        const rawContent = (response.data.choices?.[0]?.message?.content || '').trim().replace(/"/g, '');
        console.log(`🤖 Resposta crua da IA: "${rawContent}"`);

        let intention = 'general';
        if (rawContent.toLowerCase().includes('scheduling')) {
            intention = 'scheduling';
        }

        let dateTimeInfo = null;
        if (intention === 'scheduling') {
            dateTimeInfo = extractDateTime(messageContent);
        }

        return {
            intention: intention,
            confidence: 0.9,
            provider: 'deepseek-text-axios',
            timestamp: new Date().toISOString(),
            dateTime: dateTimeInfo
        };
    } catch (error) {
        console.error('❌ Erro fatal na função analyze:', error.response ? error.response.data : error.message);
        return { intention: 'general', confidence: 0, provider: 'error-fallback' };
    }
}

module.exports = { analyze };
