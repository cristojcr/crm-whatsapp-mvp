// ===============================================
// ⏱️ CORREÇÃO 3: TIMING NATURAL E "DIGITANDO..."
// ===============================================
// 📍 ARQUIVO: apps/api/src/services/natural-timing.js
// 🎯 OBJETIVO: Tornar conversas naturais com pausas e typing

const fetch = require('node-fetch');

class NaturalTiming {
    constructor() {
        this.baseUrl = 'https://api.telegram.org/bot';
    }

    // ✅ ENVIAR MÚLTIPLAS MENSAGENS COM TIMING NATURAL
    async sendConversationalMessages(messages, botToken, chatId, options = {}) {
        try {
            console.log('💬 Enviando conversa natural:', messages.length, 'mensagens');

            if (!Array.isArray(messages)) {
                messages = [messages];
            }

            for (let i = 0; i < messages.length; i++) {
                const message = messages[i];
                
                // 1. Mostrar "digitando..." antes de cada mensagem
                await this.sendTypingAction(botToken, chatId);
                
                // 2. Pausa natural baseada no tamanho da mensagem
                const typingDuration = this.calculateTypingDuration(message);
                await this.sleep(typingDuration);
                
                // 3. Enviar a mensagem
                await this.sendMessage(botToken, chatId, message, options);
                
                // 4. Pausa entre mensagens (se não for a última)
                if (i < messages.length - 1) {
                    const pauseBetween = this.calculatePauseBetweenMessages();
                    await this.sleep(pauseBetween);
                }
            }

            console.log('✅ Conversa natural enviada com sucesso');
            return true;

        } catch (error) {
            console.error('❌ Erro enviando conversa natural:', error);
            return false;
        }
    }

    // ✅ MOSTRAR "DIGITANDO..."
    async sendTypingAction(botToken, chatId) {
        try {
            const response = await fetch(`${this.baseUrl}${botToken}/sendChatAction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    action: 'typing'
                })
            });

            if (!response.ok) {
                console.warn('⚠️ Falha ao enviar typing action');
            }

        } catch (error) {
            console.warn('⚠️ Erro enviando typing action:', error.message);
        }
    }

    // ✅ CALCULAR DURAÇÃO DO "DIGITANDO" BASEADO NO TEXTO
    calculateTypingDuration(message) {
        const words = message.split(' ').length;
        const characters = message.length;
        
        // Simular velocidade de digitação humana (150-200 CPM)
        const baseTime = Math.max(characters * 50, 1000); // Mínimo 1 segundo
        const wordBonus = words * 200; // 200ms por palavra
        
        // Adicionar aleatoriedade para parecer mais humano
        const randomFactor = 0.5 + Math.random() * 0.5; // 50% - 100%
        
        const finalDuration = Math.min(
            (baseTime + wordBonus) * randomFactor,
            4000 // Máximo 4 segundos
        );

        console.log(`⏱️ Typing duration: ${Math.round(finalDuration)}ms para "${message.substring(0, 30)}..."`);
        return finalDuration;
    }

    // ✅ CALCULAR PAUSA ENTRE MENSAGENS
    calculatePauseBetweenMessages() {
        // Pausa natural entre 800ms e 2000ms
        return 800 + Math.random() * 1200;
    }

    // ✅ QUEBRAR MENSAGEM LONGA EM MÚLTIPLAS MENSAGENS
    breakIntoNaturalMessages(longMessage, maxLength = 150) {
        if (longMessage.length <= maxLength) {
            return [longMessage];
        }

        const sentences = longMessage.split(/[.!?]\s+/);
        const messages = [];
        let currentMessage = '';

        for (const sentence of sentences) {
            const sentenceWithPunc = sentence + (sentence.match(/[.!?]$/) ? '' : '.');
            
            if ((currentMessage + sentenceWithPunc).length <= maxLength) {
                currentMessage += (currentMessage ? ' ' : '') + sentenceWithPunc;
            } else {
                if (currentMessage) {
                    messages.push(currentMessage.trim());
                }
                currentMessage = sentenceWithPunc;
            }
        }

        if (currentMessage) {
            messages.push(currentMessage.trim());
        }

        return messages.length > 0 ? messages : [longMessage];
    }

    // ✅ ADICIONAR NATURALIDADE À RESPOSTA
    addNaturalVariations(response) {
        // Adicionar conectores naturais
        const connectors = ['Então', 'Bem', 'Certo', 'Ok', 'Perfeito'];
        const emoji = ['😊', '🤗', '👍', '✨', '💙'];
        
        if (Math.random() > 0.7) { // 30% chance
            const connector = connectors[Math.floor(Math.random() * connectors.length)];
            response = connector + ', ' + response.toLowerCase();
        }

        if (Math.random() > 0.8) { // 20% chance
            const emoticon = emoji[Math.floor(Math.random() * emoji.length)];
            response += ' ' + emoticon;
        }

        return response;
    }

    // ✅ ENVIAR MENSAGEM ÚNICA
    async sendMessage(botToken, chatId, text, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text,
                    parse_mode: options.parse_mode || 'HTML',
                    reply_markup: options.reply_markup || undefined
                })
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('❌ Erro enviando mensagem:', result);
                return false;
            }

            return result;

        } catch (error) {
            console.error('❌ Erro na requisição de mensagem:', error);
            return false;
        }
    }

    // ✅ PAUSA (SLEEP)
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ✅ TIMING ADAPTATIVO BASEADO NO TIPO DE RESPOSTA
    getTimingForResponseType(responseType) {
        const timings = {
            greeting: { typing: 1000, pause: 500 },
            scheduling: { typing: 2000, pause: 800 },
            confirmation: { typing: 1500, pause: 600 },
            error: { typing: 800, pause: 400 },
            help: { typing: 2500, pause: 1000 },
            default: { typing: 1200, pause: 600 }
        };

        return timings[responseType] || timings.default;
    }

    // ✅ CRIAR RESPOSTA CONVERSACIONAL COMPLETA
    async createConversationalResponse(analysis, context, responseType = 'default') {
        const timing = this.getTimingForResponseType(responseType);
        
        // Quebrar resposta em mensagens naturais se for muito longa
        let messages = [];
        
        if (analysis.response && analysis.response.length > 120) {
            messages = this.breakIntoNaturalMessages(analysis.response);
        } else {
            messages = [analysis.response];
        }

        // Adicionar variações naturais
        messages = messages.map(msg => this.addNaturalVariations(msg));

        return {
            messages: messages,
            timing: timing,
            totalDuration: messages.length * timing.typing + (messages.length - 1) * timing.pause
        };
    }

    // ✅ SIMULAR CONVERSA HUMANA COMPLETA
    async simulateHumanConversation(botToken, chatId, responseData) {
        console.log('🤖➡️👤 Simulando conversa humana natural');

        const conversationResponse = await this.createConversationalResponse(
            responseData.analysis,
            responseData.context,
            responseData.type
        );

        await this.sendConversationalMessages(
            conversationResponse.messages,
            botToken,
            chatId
        );

        return conversationResponse;
    }
}

module.exports = NaturalTiming;