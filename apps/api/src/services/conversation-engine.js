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
        this.axios = require("axios");

    

        // Personalidade da assistente
        this.assistantPersonality = {
            name: "Sarah",
            role: "assistente de agendamentos",
            traits: ["empática", "calorosa", "eficiente", "brasileira"],
            communication_style: "informal mas respeitosa"
        };
    }

    buildConversationalPrompt(intention, context, customerData, situationData) {
        const customerName = customerData?.name || 'cliente';
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
                        // ✅ USAR DADOS REAIS SE DISPONÍVEIS
                        if (situationData.realData && situationData.realData.hasRealData) {
                            const professionals = situationData.realData.professionals;
                            
                            if (professionals.length === 0) {
                                basePrompt += `\n\nO cliente quer agendar, mas NÃO TEMOS profissionais disponíveis para a data/horário solicitado.
                                
                    INSTRUÇÕES:
                    1. Seja empática sobre a indisponibilidade
                    2. Ofereça outras opções de datas/horários
                    3. Pergunte se quer ver outras alternativas
                    4. NUNCA invente profissionais ou horários que não existem`;
                            } else {
                                basePrompt += `\n\nO cliente quer agendar. PROFISSIONAIS REAIS DISPONÍVEIS:
                    ${professionals.map(p => `- ${p.name}${p.specialty ? ` (${p.specialty})` : ''}`).join('\n')}

                    INSTRUÇÕES:
                    1. Mostre APENAS estes profissionais reais
                    2. NUNCA invente nomes ou horários
                    3. Use os dados exatos fornecidos
                    4. Seja natural e prestativa`;
                            }
                        } else {
                            basePrompt += `\n\nO cliente quer agendar algo, mas ainda não temos informações específicas de data/hora.

                    INSTRUÇÕES:
                    1. Pergunte quando quer agendar
                    2. NÃO invente profissionais ou horários
                    3. Colete as informações primeiro`;
                        }
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

    // Enviar mensagem individual...
    async sendMessage(chatId, text, botToken, options = {}) {
        try {
            const response = await this.axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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

    // Função principal para gerar resposta natural
    async generateNaturalResponse(intention, context, customerData, situationData = {}) {
        try {
            console.log('🧠 Gerando resposta natural...');
            const prompt = this.buildConversationalPrompt(intention, context, customerData, situationData);
            const deepSeekResponse = await this.callDeepSeek(prompt); // Renomeado para clareza
            
            // ✅ CORREÇÃO: Garantir que deepSeekResponse.content existe
            const contentToProcess = deepSeekResponse?.content || ''; // Use string vazia se for undefined
            const messages = this.breakIntoNaturalMessages(contentToProcess);
            
            return {
                data: {
                    messages: messages,
                    tone: deepSeekResponse?.detected_tone || 'friendly',
                    shouldShowTyping: messages.length > 1
                },
                success: true,
            };
        } catch (error) {
            console.error('❌ Erro gerando resposta:', error);
            return this.getFallbackResponse(intention, customerData);
        }
    }

    // Construir prompt conversacional detalhado
    



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
        // Cria uma data considerando o fuso horário de Brasília
        const agora = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const hour = agora.getHours();
        
        console.log(`🕐 DEBUG: Hora em Brasília para saudação: ${hour}`);

        if (hour >= 5 && hour < 12) return 'manhã';
        if (hour >= 12 && hour < 18) return 'tarde';
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

    generateFallbackResponse() {
        console.log('⚠️ Gerando resposta de fallback...');
        return {
            success: false,
            data: {
                messages: ["Ops! 😅 Encontrei um probleminha técnico. Você pode tentar de novo, por favor?"],
                tone: 'concerned',
                shouldShowTyping: true
            }
        };
    }


}

module.exports = ConversationEngine;

