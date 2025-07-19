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

// FUNÇÃO PRINCIPAL DE ANÁLISE (A ÚNICA QUE PRECISAMOS)
async function analyze(messageContent, context = {}) {
    try {
        const prompt = buildAnalysisPrompt(messageContent);

        const response = await fetch(`${process.env.DEEPSEEK_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
            })
        });

        if (!response.ok) {
            console.error('❌ Erro na API DeepSeek:', response.statusText);
            return { intention: 'general', provider: 'fallback' };
        }

        const aiResult = await response.json();
        const rawContent = (aiResult.choices?.[0]?.message?.content || '').trim().replace(/"/g, ''); // Limpa aspas
        console.log(`🤖 Resposta crua da IA: "${rawContent}"`);

        // A IA está respondendo com texto simples, então vamos tratar como texto.
        let intention = 'general'; // Padrão
        if (rawContent.toLowerCase().includes('scheduling')) {
            intention = 'scheduling';
        } else if (rawContent.toLowerCase().includes('cancellation')) {
            intention = 'cancellation';
        } // Adicione outros 'else if' se necessário

        const analysis = {
            intention: intention,
            confidence: 0.9,
            provider: 'deepseek-text',
            timestamp: new Date().toISOString()
        };
        
        return analysis;

    } catch (error) {
        console.error('❌ Erro fatal na função analyze:', error);
        return {
            intention: 'general',
            confidence: 0,
            reasoning: 'Erro na execução da análise',
            provider: 'error-fallback'
        };
    }
}

// EXPORTAÇÃO CORRETA
module.exports = {
    analyze // ✅ EXPORTANDO A FUNÇÃO 'analyze'
};