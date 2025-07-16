// 🎯 OBJETIVO: Tornar conversas naturais com pausas e "digitando..."

const axios = require('axios');

class NaturalTiming {
    constructor() {
        this.typingSimulation = true; // Ativar simulação de digitação
        this.averageTypingSpeed = 40; // Palavras por minuto (realista para uma pessoa)
    }

    // ⏱️ CALCULAR TEMPO REALISTA DE DIGITAÇÃO
    calculateTypingTime(text) {
        if (!text) return 1000;
        
        const wordCount = text.split(' ').length;
        const charactersCount = text.length;
        
        // Tempo baseado em velocidade de digitação humana (40 WPM)
        const wordsTime = (wordCount / this.averageTypingSpeed) * 60 * 1000;
        
        // Tempo mínimo baseado em caracteres (40 chars por segundo)
        const charsTime = (charactersCount / 40) * 1000;
        
        // Usar o maior dos dois + tempo de "pensar"
        const baseTime = Math.max(wordsTime, charsTime);
        const thinkingTime = Math.random() * 2000 + 1000; // 1-3 segundos para "pensar"
        
        const totalTime = baseTime + thinkingTime;
        
        // Limitar entre 2-8 segundos para ser realista
        return Math.min(Math.max(totalTime, 2000), 8000);
    }

    // 💬 QUEBRAR MENSAGEM LONGA EM MÚLTIPLAS MENSAGENS
    breakIntoNaturalMessages(longText) {
        if (!longText || longText.length < 100) {
            return [longText];
        }

        const sentences = longText.split(/[.!?]+/).filter(s => s.trim());
        const messages = [];
        let currentMessage = '';

        for (const sentence of sentences) {
            const trimmedSentence = sentence.trim();
            if (!trimmedSentence) continue;

            // Se adicionar esta frase deixaria a mensagem muito longa, quebrar
            if (currentMessage.length + trimmedSentence.length > 150) {
                if (currentMessage) {
                    messages.push(currentMessage.trim() + '.');
                    currentMessage = '';
                }
            }

            currentMessage += trimmedSentence + '. ';
        }

        // Adicionar última mensagem se houver
        if (currentMessage.trim()) {
            messages.push(currentMessage.trim());
        }

        // Se não conseguiu quebrar, retornar original
        return messages.length > 0 ? messages : [longText];
    }

    // 🎬 SIMULAR AÇÃO "DIGITANDO..." NO TELEGRAM
    async showTypingIndicator(botToken, chatId, duration = 3000) {
        try {
            console.log('⌨️ Simulando "digitando..." por', duration, 'ms');
            
            const apiUrl = `https://api.telegram.org/bot${botToken}/sendChatAction`;
            
            await axios.post(apiUrl, {
                chat_id: chatId,
                action: 'typing'
            });

            // Manter indicador por tempo calculado
            await this.sleep(Math.min(duration, 5000)); // Máximo 5 segundos
            
        } catch (error) {
            console.error('❌ Erro simulando digitação:', error.message);
        }
    }

    // 💤 FUNÇÃO DE PAUSA
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 📤 ENVIAR MENSAGENS COM TIMING NATURAL
    async sendNaturalMessages(botToken, chatId, messages) {
        try {
            console.log('📤 Enviando', messages.length, 'mensagens com timing natural');
            
            const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
            
            for (let i = 0; i < messages.length; i++) {
                const message = messages[i];
                if (!message?.trim()) continue;

                console.log(`📨 Mensagem ${i + 1}/${messages.length}:`, message);

                // 1. MOSTRAR "DIGITANDO..." ANTES DE CADA MENSAGEM
                if (this.typingSimulation) {
                    const typingDuration = this.calculateTypingTime(message);
                    await this.showTypingIndicator(botToken, chatId, typingDuration);
                }

                // 2. ENVIAR A MENSAGEM
                await axios.post(apiUrl, {
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                });

                console.log('✅ Mensagem enviada');

                // 3. PAUSA ENTRE MENSAGENS (se houver mais)
                if (i < messages.length - 1) {
                    const pauseBetweenMessages = Math.random() * 2000 + 1000; // 1-3 segundos
                    console.log('⏸️ Pausa entre mensagens:', pauseBetweenMessages, 'ms');
                    await this.sleep(pauseBetweenMessages);
                }
            }

            console.log('🎉 Todas as mensagens enviadas com timing natural!');
            return true;

        } catch (error) {
            console.error('❌ Erro enviando mensagens naturais:', error);
            return false;
        }
    }

    // 🎯 FUNÇÃO PRINCIPAL: PROCESSAR E ENVIAR COM TIMING NATURAL
    async processAndSendNaturally(botToken, chatId, responseText) {
        try {
            if (!responseText?.trim()) {
                console.log('⚠️ Texto de resposta vazio');
                return false;
            }

            console.log('🎬 Iniciando processamento natural da resposta');
            console.log('📝 Texto original:', responseText);

            // 1. QUEBRAR EM MENSAGENS NATURAIS
            const messages = this.breakIntoNaturalMessages(responseText);
            console.log('🔄 Quebrado em', messages.length, 'mensagens');

            // 2. ENVIAR COM TIMING NATURAL
            const success = await this.sendNaturalMessages(botToken, chatId, messages);

            return success;

        } catch (error) {
            console.error('❌ Erro no processamento natural:', error);
            
            // FALLBACK: Enviar mensagem diretamente se der erro
            try {
                const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
                await axios.post(apiUrl, {
                    chat_id: chatId,
                    text: responseText,
                    parse_mode: 'HTML'
                });
                console.log('✅ Mensagem enviada via fallback');
                return true;
            } catch (fallbackError) {
                console.error('❌ Erro no fallback também:', fallbackError);
                return false;
            }
        }
    }

    // 🎨 ADICIONAR VARIAÇÕES NATURAIS À RESPOSTA
    addNaturalVariations(text) {
        // Adicionar pequenas hesitações e variações humanas
        const variations = {
            'Ok': ['Ok', 'Tudo bem', 'Perfeito', 'Entendi'],
            'Sim': ['Sim', 'Claro', 'Com certeza', 'Isso mesmo'],
            'Não': ['Não', 'Não mesmo', 'Negativo', 'Nem pensar'],
            'Obrigado': ['Obrigado', 'Valeu', 'Muito obrigado', 'Agradeço']
        };

        let variedText = text;
        
        // Aplicar variações aleatórias
        Object.entries(variations).forEach(([original, options]) => {
            if (variedText.includes(original)) {
                const randomVariation = options[Math.floor(Math.random() * options.length)];
                variedText = variedText.replace(original, randomVariation);
            }
        });

        // Adicionar pausas naturais ocasionais
        if (Math.random() < 0.3) { // 30% de chance
            const pausePhrases = ['Bem...', 'Vamos ver...', 'Deixe-me verificar...', 'Hmm...'];
            const randomPause = pausePhrases[Math.floor(Math.random() * pausePhrases.length)];
            variedText = randomPause + ' ' + variedText;
        }

        return variedText;
    }

    // 🕒 DETERMINAR MELHOR HORÁRIO PARA RESPOSTA
    getSociallyAppropriateDelay() {
        const now = new Date();
        const hour = now.getHours();
        
        // Delays baseados no horário (simular comportamento humano)
        if (hour >= 22 || hour <= 6) {
            // Noite/madrugada - resposta mais demorada
            return Math.random() * 5000 + 3000; // 3-8 segundos
        } else if (hour >= 12 && hour <= 14) {
            // Horário de almoço - resposta um pouco mais demorada
            return Math.random() * 4000 + 2000; // 2-6 segundos
        } else {
            // Horário comercial normal
            return Math.random() * 3000 + 1000; // 1-4 segundos
        }
    }
}

module.exports = NaturalTiming;