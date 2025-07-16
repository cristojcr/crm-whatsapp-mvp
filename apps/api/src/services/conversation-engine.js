// apps/api/src/services/conversation-engine.js
const axios = require('axios');

class ConversationEngine {
    constructor() {
        this.deepseekConfig = {
            apiUrl: 'https://api.deepseek.com/chat/completions',
            apiKey: process.env.DEEPSEEK_API_KEY,
            model: 'deepseek-chat',
            temperature: 0.8, // Mais criativa para conversação
            maxTokens: 400
        };

        // Personalidade da assistente
        this.assistantPersonality = {
            name: "Sarah",
            role: "assistente de agendamentos",
            traits: ["empática", "calorosa", "eficiente", "brasileira"],
            communication_style: "informal mas respeitosa"
        };
    }

    // Função principal para gerar resposta natural
    async generateNaturalResponse(intention, context, customerData, situationData = {}) {
        try {
            console.log('🧠 Gerando resposta natural...');
            const prompt = this.buildConversationalPrompt(intention, context, customerData, situationData);
            const response = await this.callDeepSeek(prompt);
            
            // Quebrar resposta em múltiplas mensagens se necessário
            const messages = this.breakIntoNaturalMessages(response.content);
            
            return {
                success: true,
                messages: messages,
                tone: response.detected_tone || 'friendly',
                shouldShowTyping: messages.length > 1
            };
        } catch (error) {
            console.error('❌ Erro gerando resposta:', error);
            return this.getFallbackResponse(intention, customerData);
        }
    }

    // Construir prompt conversacional detalhado
    buildConversationalPrompt(intention, context, customerData, situationData) {
        const customerName = customerData.name || 'cliente';
        const timeOfDay = this.getTimeOfDay();
        
        let basePrompt = `Você é Sarah, uma assistente virtual calorosa que trabalha numa clínica médica brasileira.

PERSONALIDADE:
- Extremamente empática e acolhedora
- Fala como uma brasileira real (informal mas respeitosa)
- Usa emojis relevantes mas sem exagero
- Nunca robótica - sempre natural e humana
- Inteligente e eficiente

CLIENTE:
- Nome: ${customerName}
- Hora do dia: ${timeOfDay}
- Histórico: ${context.hasHistory ? 'cliente já conhecido' : 'primeira conversa'}

SITUAÇÃO ATUAL: ${intention}`;

        // Prompts específicos por intenção
        switch (intention) {
            case 'scheduling':
                basePrompt += `\n\nO cliente quer agendar algo. ${situationData.dateTimeRequested ? `Ele mencionou: ${situationData.dateTimeRequested}` : 'Não especificou quando.'}

INSTRUÇÕES:
1. Cumprimente calorosamente (se primeira interação do dia)
2. Confirme que vai ajudar com o agendamento
3. Se ele não disse quando, pergunte naturalmente
4. Mantenha tom positivo e prestativo
5. QUEBRE em 2-3 mensagens menores em vez de 1 grande

EXEMPLO DO TOM:
"Oi ${customerName}! 😊 Tudo bem? Claro, vou te ajudar com o agendamento!"
[pausa]
"Deixa eu ver os horários disponíveis para você..."`;
                break;

            case 'professionals_list':
                basePrompt += `\n\nVocê precisa mostrar a lista de profissionais disponíveis.
PROFISSIONAIS: ${JSON.stringify(situationData.professionals)}

INSTRUÇÕES:
1. Avise que encontrou profissionais disponíveis
2. Apresente de forma calorosa, não como lista fria
3. Destaque especialidades relevantes
4. Pergunte a preferência dele
5. QUEBRE em mensagens menores

EXEMPLO:
"Que ótimo! Tenho alguns profissionais disponíveis para você! 👨‍⚕️"
[pausa]
"Temos a Dra. Ana (cardiologista), Dr. João (clínico geral)..."
[pausa]
"Qual você prefere? Ou quer que eu recomende? 🤔"`;
                break;

            case 'appointment_confirmed':
                basePrompt += `\n\nAgendamento foi confirmado com sucesso!
DETALHES: ${JSON.stringify(situationData.appointmentDetails)}

INSTRUÇÕES:
1. Comemore o sucesso do agendamento
2. Confirme os detalhes principais
3. Informe sobre lembretes automáticos
4. Ofereça ajuda adicional
5. Termine de forma calorosa

EXEMPLO:
"Perfeito! ✅ Seu agendamento está confirmado!"
[pausa]
"Dr. João, terça-feira 16/07 às 14h30 🗓"
[pausa]
"Você vai receber lembretes automáticos! Alguma dúvida? 😊"`;
                break;

            case 'general_inquiry':
                basePrompt += `\n\nCliente fez uma pergunta geral ou cumprimento.

INSTRUÇÕES:
1. Responda de forma calorosa
2. Seja prestativa
3. Direcione para como pode ajudar
4. Mantenha tom brasileiro autêntico`;
                break;

            case 'invalid_selection':
                basePrompt += `\n\nCliente fez uma seleção inválida ou não entendemos.

INSTRUÇÕES:
1. Seja compreensiva, não crítica
2. Explique gentilmente o problema
3. Ofereça ajuda para corrigir
4. Mantenha tom positivo`;
                break;

            case 'professional_selected':
                basePrompt += `\n\nCliente selecionou um profissional.
PROFISSIONAL: ${JSON.stringify(situationData.professional)}

INSTRUÇÕES:
1. Confirme a seleção com entusiasmo
2. Elogie a escolha
3. Avise que vai verificar disponibilidade
4. Mantenha expectativa positiva`;
                break;

            case 'out_of_hours':
                basePrompt += `\n\nO horário solicitado está fora do funcionamento.
HORÁRIO SOLICITADO: ${situationData.requestedTime}
HORÁRIO DE FUNCIONAMENTO: ${situationData.businessHours}

INSTRUÇÕES:
1. Seja empática sobre a inconveniência
2. Explique gentilmente o horário de funcionamento
3. Ofereça alternativas próximas
4. Mantenha tom prestativo`;
                break;
        }

        basePrompt += `\n\nRESPONDA DE FORMA NATURAL E EMPÁTICA. Use português brasileiro coloquial mas respeitoso.`;
        
        return basePrompt;
    }

    // Chamar API do DeepSeek
    async callDeepSeek(prompt) {
        try {
            const response = await axios.post(this.deepseekConfig.apiUrl, {
                model: this.deepseekConfig.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: this.deepseekConfig.temperature,
                max_tokens: this.deepseekConfig.maxTokens
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.deepseekConfig.apiKey}`
                }
            });

            const content = response.data.choices[0].message.content;
            return {
                content: content,
                detected_tone: this.detectTone(content)
            };
        } catch (error) {
            console.error('❌ Erro na API DeepSeek:', error);
            throw error;
        }
    }

    // Quebrar resposta em mensagens menores
    breakIntoNaturalMessages(content) {
        // Quebrar por frases, máximo 150 caracteres por mensagem
        const sentences = content.split(/[.!?]+/).filter(s => s.trim());
        const messages = [];
        let currentMessage = '';

        for (const sentence of sentences) {
            if (currentMessage.length + sentence.length > 150) {
                if (currentMessage) messages.push(currentMessage.trim());
                currentMessage = sentence;
            } else {
                currentMessage += (currentMessage ? '. ' : '') + sentence;
            }
        }

        if (currentMessage.trim()) messages.push(currentMessage.trim());

        // Se ainda muito longo, quebrar por palavras
        return messages.length > 0 ? messages : [content];
    }

    // Detectar tom da resposta
    detectTone(content) {
        if (content.includes('😊') || content.includes('✅') || content.includes('perfeito')) return 'happy';
        if (content.includes('❌') || content.includes('problema') || content.includes('erro')) return 'concerned';
        if (content.includes('🤔') || content.includes('?')) return 'questioning';
        return 'friendly';
    }

    // Obter período do dia
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 12) return 'manhã';
        if (hour < 18) return 'tarde';
        return 'noite';
    }

    // Resposta de fallback em caso de erro
    getFallbackResponse(intention, customerData) {
        const customerName = customerData.name || 'cliente';
        
        const fallbacks = {
            scheduling: [`Oi ${customerName}! 😊`, `Vou te ajudar com o agendamento!`],
            professionals_list: [`Aqui estão nossos profissionais disponíveis:`, `Qual você prefere?`],
            appointment_confirmed: [`Agendamento confirmado! ✅`, `Você receberá lembretes automáticos.`],
            general_inquiry: [`Oi! Como posso te ajudar hoje? 😊`],
            default: [`Oi ${customerName}!`, `Como posso te ajudar? 😊`]
        };

        return {
            success: false,
            messages: fallbacks[intention] || fallbacks.default,
            tone: 'friendly',
            shouldShowTyping: true
        };
    }

    // Enviar mensagens conversacionais com timing natural
    async sendConversationalMessages(messages, botToken, chatId, options = {}) {
        try {
            console.log('💬 Enviando mensagens conversacionais:', messages.length);
            
            for (let i = 0; i < messages.length; i++) {
                const message = messages[i];
                
                // Mostrar "digitando" antes de cada mensagem (exceto a primeira)
                if (i > 0 || options.showTypingFirst) {
                    await this.showTypingIndicator(botToken, chatId);
                    await this.naturalDelay(message.length);
                }

                // Enviar mensagem
                await this.sendMessage(botToken, chatId, message, {
                    parse_mode: 'Markdown',
                    ...options
                });

                // Pausa natural entre mensagens
                if (i < messages.length - 1) {
                    await this.naturalDelay(50); // Pausa curta entre mensagens
                }
            }
        } catch (error) {
            console.error('❌ Erro enviando mensagens conversacionais:', error);
        }
    }

    // Mostrar indicador de "digitando"
    async showTypingIndicator(botToken, chatId) {
        try {
            await axios.post(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
                chat_id: chatId,
                action: 'typing'
            });
        } catch (error) {
            console.error('❌ Erro mostrando typing:', error);
        }
    }

    // Delay natural baseado no tamanho da mensagem
    async naturalDelay(messageLength) {
        // Simular tempo de digitação: ~50ms por caractere + base de 500ms
        const baseDelay = 500;
        const typingDelay = Math.min(messageLength * 50, 3000); // Máximo 3 segundos
        const totalDelay = baseDelay + typingDelay;
        
        await new Promise(resolve => setTimeout(resolve, totalDelay));
    }

    // Enviar mensagem individual
    async sendMessage(botToken, chatId, text, options = {}) {
        try {
            const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: text,
                ...options
            });
            return response.data;
        } catch (error) {
            console.error('❌ Erro enviando mensagem:', error);
            throw error;
        }
    }
}

module.exports = ConversationEngine;

