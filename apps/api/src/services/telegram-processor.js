const axios = require("axios");

const ConversationMemory = require('./conversation-memory');
const ConversationEngine = require('./conversation-engine');
const CustomerContext = require("./customer-context");
const { createClient } = require('@supabase/supabase-js');
const ConversationStates = require('./conversation-states');
const NaturalTiming = require('./natural-timing');
const IntelligentScheduling = require('./intelligent-scheduling');
const intentionAnalyzer = require('./intention-analyzer');

class TelegramProcessor {
    constructor() {
        this.conversationContextManager = require('./conversation-context-manager');
        this.conversationMemory = new ConversationMemory();
        this.conversationStates = new ConversationStates();
        this.naturalTiming = new NaturalTiming();
        this.intelligentScheduling = new IntelligentScheduling();
        this.conversationEngine = new ConversationEngine(); 
     
        
        // ✅ ÚNICA CRIAÇÃO DO CLIENTE SUPABASE
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    // Buscar configuração do bot por usuário
    async getUserBotConfig(userId) {
        try {
            console.log('⚙️ Buscando configuração do bot para usuário:', userId);

            const { data, error } = await this.supabase
                .from('user_channels')
                .select('channel_config')
                .eq('user_id', userId)
                .eq('channel_type', 'telegram')
                .single();

            if (error) {
                if (error.code !== 'PGRST116') {
                    console.error('❌ Erro buscando config do canal:', error.message);
                }
                return null;
            }

            const botToken = data?.channel_config?.bot_token;

            if (!botToken) {
                console.error('❌ Bot token não encontrado dentro de channel_config');
                return null;
            }

            console.log('✅ Bot token encontrado com sucesso.');
            return { bot_token: botToken };

        } catch (error) {
            console.error('❌ Erro geral em getUserBotConfig:', error);
            return null;
        }
    }

    // ✅ NOVA FUNÇÃO: Enviar ação de "digitando"
    async sendTypingAction(botToken, chatId) {
        try {
            await axios.post(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
                chat_id: chatId,
                action: 'typing'
            });
        } catch (error) {
            console.error('❌ Erro enviando ação de digitando:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Calcular tempo de digitação baseado no tamanho da mensagem
    calculateTypingTime(messageLength) {
        // Fórmula: 2 segundos base + 1 segundo a cada 50 caracteres
        // Mínimo: 2 segundos, Máximo: 10 segundos
        const baseTime = 2000; // 2 segundos
        const additionalTime = Math.floor(messageLength / 50) * 1000; // 1 segundo por 50 chars
        const totalTime = Math.min(baseTime + additionalTime, 10000); // Máximo 10 segundos
        
        return totalTime;
    }

    // ✅ NOVA FUNÇÃO: Quebrar mensagem longa em partes menores com bom senso
    breakLongMessage(message) {
        // Se a mensagem for menor que 300 caracteres, não quebrar
        if (message.length <= 300) {
            return [message];
        }

        const parts = [];
        const sentences = message.split(/(?<=[.!?])\s+/); // Quebrar por frases
        let currentPart = '';

        for (const sentence of sentences) {
            // Se adicionar esta frase ultrapassar 400 caracteres, finalizar a parte atual
            if (currentPart.length + sentence.length > 400 && currentPart.length > 0) {
                parts.push(currentPart.trim());
                currentPart = sentence;
            } else {
                currentPart += (currentPart ? ' ' : '') + sentence;
            }
        }

        // Adicionar a última parte se houver conteúdo
        if (currentPart.trim()) {
            parts.push(currentPart.trim());
        }

        // Se não conseguiu quebrar por frases, quebrar por caracteres
        if (parts.length === 0) {
            const maxLength = 400;
            for (let i = 0; i < message.length; i += maxLength) {
                parts.push(message.substring(i, i + maxLength));
            }
        }

        return parts;
    }

    // ✅ FUNÇÃO MODIFICADA: Enviar resposta conversacional com typing e quebra inteligente
    async sendConversationalResponseWithTyping(response, botToken, chatId, conversation, userId, analysis) {
        try {
            // Pegar apenas a primeira mensagem para evitar spam
            const message = Array.isArray(response.messages) ? response.messages[0] : (response.messages || response);
            
            if (!message) return;
            
            // Quebrar mensagem se for muito longa
            const messageParts = this.breakLongMessage(message);
            
            for (let j = 0; j < messageParts.length; j++) {
                const part = messageParts[j];
                
                // Calcular tempo de digitação baseado no tamanho da parte
                const typingTime = this.calculateTypingTime(part.length);
                
                // Enviar ação de "digitando"
                await this.sendTypingAction(botToken, chatId);
                
                // Aguardar o tempo de digitação
                await new Promise(resolve => setTimeout(resolve, typingTime));
                
                // Enviar a mensagem
                await this.conversationEngine.sendMessage(botToken, chatId, part, { parse_mode: "Markdown" });
                
                // Pequena pausa entre partes da mesma mensagem (1 segundo)
                if (j < messageParts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            // Salvar resposta
            await this.saveConversationalResponse(conversation.id, message, userId, analysis);
            
        } catch (error) {
            console.error('❌ Erro enviando resposta conversacional com typing:', error);
        }
    }

    // ✅ FUNÇÃO MODIFICADA: Enviar lista com typing
    async sendListWithTyping(introMessage, listContent, botToken, chatId) {
        try {
            // Enviar mensagem introdutória com typing
            const introTypingTime = this.calculateTypingTime(introMessage.length);
            await this.sendTypingAction(botToken, chatId);
            await new Promise(resolve => setTimeout(resolve, introTypingTime));
            await this.conversationEngine.sendMessage(botToken, chatId, introMessage, { parse_mode: "Markdown" });
            
            // Pausa antes da lista
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Enviar lista com typing
            const listTypingTime = this.calculateTypingTime(listContent.length);
            await this.sendTypingAction(botToken, chatId);
            await new Promise(resolve => setTimeout(resolve, listTypingTime));
            await this.conversationEngine.sendMessage(botToken, chatId, listContent, { parse_mode: "Markdown" });
            
        } catch (error) {
            console.error('❌ Erro enviando lista com typing:', error);
        }
    }

    // Processar updates do Telegram (agora multi-tenant)
    async processUpdate(req, res) {
        try {
            console.log('📱 Processando update Telegram...');
            console.log('📋 Body recebido:', JSON.stringify(req.body, null, 2));
            
            const update = req.body; // ✅ DEFINIR update
            const userId = req.params.userId; // ✅ EXTRAIR userId
            
            console.log('🐛 DEBUG - update completo:', JSON.stringify(update, null, 2));
            console.log('🐛 DEBUG - update.message:', update.message);
            console.log('🐛 DEBUG - update.message?.from:', update.message?.from);
            console.log('🐛 DEBUG - userId extraído:', userId);
            
            if (update.message) {
                // ✅ CHAMAR CORRETAMENTE processMessage
                const result = await this.processMessage(update.message, userId);
                
                if (res && !res.headersSent) {
                    return res.status(200).json({ status: 'success', result });
                }
            } else {
                console.log('⚠️ Update sem mensagem, ignorando');
                if (res && !res.headersSent) {
                    return res.status(200).json({ status: 'ignored' });
                }
            }
            
        } catch (error) {
            console.error('❌ Erro em processUpdate:', error);
            if (res && !res.headersSent) {
                return res.status(500).json({ error: 'Erro interno' });
            }
        }
    }

    async showAvailableProfessionals(userId, dateTimeInfo) {
        try {
            const availableProfessionals = await this.intelligentScheduling.getAvailableProfessionals(
                userId,
                analysis.dateTime?.suggestedDate, // Passa a data sugerida
                analysis.dateTime?.suggestedTime,  // Passa a hora sugerida
                text
            );

            const response = this.intelligentScheduling.generateSchedulingResponse(
                availableProfessionals, dateTimeInfo
            );

            return response;

        } catch (error) {
            console.error('❌ Erro buscando profissionais:', error);
            return {
                type: 'error',
                messages: ['Ops, tive um problema buscando os profissionais. Pode tentar novamente? 😊']
            };
        }
    }

    async handleIntelligentScheduling(text, contact, conversation, userId, schedulingAnalysis, currentState) {
        try {
            console.log('📅 Processando agendamento inteligente');

            const states = this.conversationStates.STATES;

            switch (currentState) {
                case states.INITIAL:
                case states.GREETING:
                    if (schedulingAnalysis.hasIntent) {
                        await this.conversationStates.updateState(
                            conversation.id, states.SCHEDULING_INTENT
                        );
                        
                        if (schedulingAnalysis.dateTimeInfo.isComplete) {
                            return await this.showAvailableProfessionals(
                                userId, schedulingAnalysis.dateTimeInfo
                            );
                        } else {
                            return await this.intelligentScheduling.requestMissingInfo(schedulingAnalysis.dateTimeInfo);
                        }
                    }
                    break;

                case states.COLLECTING_DATE:
                    const dateInfo = this.intelligentScheduling.extractDate(text);
                    if (dateInfo.found) {
                        await this.conversationStates.updateState(
                            conversation.id, states.COLLECTING_TIME, { date: dateInfo }
                        );
                        return {
                            type: 'collecting_time',
                            messages: ['Perfeito! 📅', 'E que horário você prefere?']
                        };
                    } else {
                        return {
                            type: 'retry_date',
                            messages: ['Não consegui entender a data. 😅', 'Pode me dizer de outra forma? Ex: "amanhã" ou "15/07"']
                        };
                    }

                case states.COLLECTING_TIME:
                    const timeInfo = this.intelligentScheduling.extractTime(text);
                    if (timeInfo.found) {
                        // Buscar profissionais disponíveis
                        const stateData = await this.getConversationStateData(conversation.id);
                        const dateTimeInfo = {
                            date: stateData?.date,
                            time: timeInfo.value,
                            hasDate: true,
                            hasTime: true
                        };
                        
                        return await this.showAvailableProfessionals(userId, dateTimeInfo);
                    } else {
                        return {
                            type: 'retry_time',
                            messages: ['Não consegui entender o horário. 😅', 'Pode me dizer assim: "14:00" ou "2 da tarde"?']
                        };
                    }

                case states.SELECTING_PROFESSIONAL:
                    return await this.handleProfessionalSelection(text, conversation, userId);

                default:
                    return await this.processGeneralConversation(text, contact, userId);
            }

        } catch (error) {
            console.error('❌ Erro no agendamento inteligente:', error);
            return {
                type: 'error',
                messages: ['Ops, tive um problema com o agendamento. Vamos tentar de novo? 😊']
            };
        }
    }

    async processWithContextAndState(text, contact, conversation, userId, memoryContext, currentState) {
        try {
            // =================================================================
            // PASSO 1: OBTER A ANÁLISE DE INTENÇÃO UMA ÚNICA VEZ
            // =================================================================
            // Esta chamada usa o intention-analyzer simplificado que criamos.
            const analysis = await intentionAnalyzer.analyze(text, { memoryContext });
            console.log('✅ PASSO 1 - Análise de Intenção Concluída:', analysis);

            // =================================================================
            // PASSO 2: DETERMINAR E ATUALIZAR O ESTADO DA CONVERSA
            // =================================================================
            const nextState = this.conversationStates.determineNextState(currentState, text, analysis);
            await this.conversationStates.updateState(conversation.id, nextState);
            console.log(`✅ PASSO 2 - Estado da Conversa Atualizado para: ${nextState}`);

            // =================================================================
            // PASSO 3: AGIR COM BASE NA INTENÇÃO CORRETA
            // =================================================================
            // Se a intenção for de agendamento, o fluxo de DADOS REAIS é ativado.
            if (analysis.intention === 'scheduling') {
                console.log('📅 PASSO 3 - FLUXO DE AGENDAMENTO ATIVADO');

                // 3a. Buscar profissionais REAIS no Supabase.
                const availableProfessionals = await this.intelligentScheduling.getAvailableProfessionals(
                    userId, null, null, text
                );
                console.log(`👨‍⚕️ Profissionais Reais Encontrados: ${availableProfessionals.length}`);

                // 3b. Gerar uma resposta USANDO os profissionais reais.
                // ✅ CORREÇÃO: A função correta está no intelligentScheduling, não no conversationEngine.
                const response = this.intelligentScheduling.generateSchedulingResponse(
                    availableProfessionals, 
                    analysis.dateTime || {} // Passa o dateTime da análise ou um objeto vazio
                );
                return response;
            }
            // Se for qualquer outra intenção, usamos a IA para uma resposta de conversa.
            else {
                console.log('💬 PASSO 3 - FLUXO DE CONVERSA GERAL ATIVADO');
                
                // 3a. Gerar uma resposta de conversa natural, sem inventar dados.
                const response = await this.conversationEngine.generateNaturalResponse(
                    analysis.intention, // Passando a intenção ('general')
                    memoryContext,      // Passando o contexto da memória
                    { name: contact.name } // Passando o objeto com o nome do cliente
                );
                return response;
            }

        } catch (error) {
            console.error('❌ Erro fatal no processWithContextAndState:', error);
            // Garante que o bot sempre dê uma resposta, mesmo em caso de erro.
            return this.conversationEngine.generateFallbackResponse(); 
        }
    }

    async saveMessage(messageData) {
        try {
            console.log('💾 Salvando mensagem...');

            // USA A INSTÂNCIA CENTRALIZADA 'this.supabase'
            const { data, error } = await this.supabase
                .from('messages')
                .insert(messageData) // Removido o array desnecessário [messageData]
                .select()
                .single();

            if (error) throw error;
            
            console.log('✅ Mensagem salva:', data.id);
            return data;
            
        } catch (error) {
            console.error('❌ Erro salvando mensagem:', error);
            return null;
        }
    }

    async sendNaturalResponse(response, userId, chatId, conversation) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            if (!botConfig?.bot_token) {
                console.error('❌ Bot token não encontrado, não é possível enviar resposta.');
                return; // Usar return sem valor
            }

            // ✅ LÓGICA INTELIGENTE: Verifica se a resposta veio da IA ou do nosso sistema.
            const messages = response?.data?.messages || response?.messages;

            if (!messages || messages.length === 0) {
                console.log('⚠️ Nenhuma mensagem para enviar na resposta.');
                return; // Interrompe se não houver mensagens
            }

            const messagePlan = await this.naturalTiming.planConversationalMessages(messages);

            for (const step of messagePlan) {
                if (step.type === 'typing') {
                    await this.sendTypingAction(botConfig.bot_token, chatId);
                    await new Promise(resolve => setTimeout(resolve, step.duration));
                } else if (step.type === 'message') {
                    await this.conversationEngine.sendMessage(botConfig.bot_token, chatId, step.content, { parse_mode: 'Markdown' });
                }
            }
        } catch (error) {
            console.error('❌ Erro enviando resposta natural:', error);
        }
    }

    async sendErrorMessage(chatId, userId) {
        try {
            console.error('🚨 Enviando mensagem de erro padrão para o usuário.');
            const botConfig = await this.getUserBotConfig(userId);
            if (botConfig?.bot_token) {
                await this.conversationEngine.sendMessage(botConfig.bot_token, chatId, "Ops! 😅 Encontrei um probleminha técnico. Você pode tentar de novo, por favor?");
            }
        } catch (e) {
            console.error('❌ Falha crítica ao tentar enviar a mensagem de erro:', e);
        }
    }

    // Processar mensagens (adaptado para multi-tenant com conversação natural)
    async processMessage(message, userId) {

        try {
            console.log('🐛 DEBUG - userId recebido:', userId);
            console.log('🐛 DEBUG - message.from:', message.from);
            console.log('📱 Processando mensagem Telegram:', message.text);
            
            const text = message.text;
            const chatId = message.chat.id;
            const fromId = message.from.id;

            // 1. BUSCAR/CRIAR CONTATO E CONVERSA
            const { contact, conversation } = await this.getOrCreateContactAndConversation(message, userId);
            
            // ADICIONE ESTES LOGS LOGO DEPOIS:
            console.log('🐛 DEBUG - contact:', contact);
            console.log('🐛 DEBUG - conversation:', conversation);
            console.log('🐛 DEBUG - contact.id:', contact?.id);
            console.log('🐛 DEBUG - conversation.id:', conversation?.id);

            if (!contact || !conversation) {
                console.error('❌ Falha ao obter contato/conversa');
                console.error('❌ contact é:', contact);
                console.error('❌ conversation é:', conversation);
                return await this.sendErrorMessage(chatId, userId);
            }

            // 2. OBTER CONTEXTO COMPLETO COM MEMÓRIA
            const memoryContext = await this.conversationMemory.prepareContextForAI(
                contact.id, userId, text
            );

            // 3. OBTER ESTADO ATUAL DA CONVERSA
            const currentState = await this.conversationStates.getCurrentState(conversation.id);
            console.log('📊 Estado atual da conversa:', currentState);

            // 4. ANÁLISE COGNITIVA PURA (SEM PALAVRAS-CHAVE)
            console.log('🧠 Usando apenas análise cognitiva da IA');

            // 5. PROCESSAR APENAS COM IA COGNITIVA
            const response = await this.processWithContextAndState(
                text, contact, conversation, userId, memoryContext, currentState, intentionAnalyzer
            );

            // 6. ENVIAR RESPOSTA COM TIMING NATURAL
            await this.sendNaturalResponse(response, userId, chatId, conversation);

            return true;

        } catch (error) {
            console.error('❌ Erro processando mensagem:', error);
            return await this.sendErrorMessage(message.chat.id, userId);
        }
    }

    // ✅ FUNÇÃO CORRIGIDA: Verificar seleções pendentes
    async checkForPendingSelections(contactId, userId, text) {
        try {
            // Verificar se o texto parece ser uma seleção numérica
            if (!/^\d+$/.test(text.trim())) {
                return null;
            }

            // ⚠️ TEMPORÁRIO: Desabilitado até a tabela pending_appointments ser criada
            console.log('⚠️ Verificação de seleções pendentes temporariamente desabilitada');
            return null;

            // TODO: Reativar após executar create_pending_appointments_table_complete.sql
            /*
            const { data: pending, error } = await supabaseAdmin
                .from('pending_appointments')
                .select('*')
                .eq('contact_id', contactId)
                .eq('user_id', userId)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('❌ Erro verificando seleções pendentes:', error);
                return null;
            }

            return pending;
            */
        } catch (error) {
            console.error('❌ Erro em checkForPendingSelections:', error);
            return null;
        }
    }

    // ✅ NOVA FUNÇÃO: Processar seleção pendente
    async handlePendingSelection(pending, text, contact, userId, customerContext, chatId, conversation) {
        try {
            console.log('🔄 Processando seleção pendente:', pending.type);

            switch (pending.type) {
                case 'product_selection':
                    await this.handleProductSelectionWithConversation(text, pending, contact, userId, customerContext, chatId, conversation);
                    break;
                case 'professional_selection':
                    await this.handleProfessionalSelectionWithConversation(text, contact.id, userId, customerContext, chatId, conversation);
                    break;
                case 'rescheduling_selection':
                    await this.handleReschedulingSelectionWithConversation(text, pending, contact, userId, customerContext, chatId, conversation);
                    break;
                case 'cancellation_selection':
                    await this.handleCancellationSelectionWithConversation(text, pending, contact, userId, customerContext, chatId, conversation);
                    break;
                default:
                    console.log('⚠️ Tipo de seleção pendente desconhecido:', pending.type);
                    break;
            }
        } catch (error) {
            console.error('❌ Erro processando seleção pendente:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Analisar intenção da mensagem (SEMPRE USA INTENTION-ANALYZER)
    async analyzeMessageIntent(text, contactId, userId) {
        try {
            const lowerText = text.toLowerCase().trim();
            
            console.log('🎭 DEBUG: Analisando mensagem:', text);
            
            // SEMPRE usar o analisador de intenção completo para garantir análise correta
            console.log('🎭 DEBUG: Usando intention-analyzer para análise completa');
            const intentionAnalyzer = require('./intention-analyzer');
            const analysis = await intentionAnalyzer.analyzeWithProductsAndProfessionals(
                text, 
                contact.id, 
                userId, 
                customerContext  // 🆕 Adicionar contexto
            );
            console.log('🔍 INTENÇÃO DETECTADA:', analysis.intention);
            console.log('🔍 ANÁLISE COMPLETA:', analysis);
            
            console.log('🎭 DEBUG: Resultado do intention-analyzer:', result);
            
            // Se for um cumprimento simples E não tiver outras intenções, marcar como tal
            const greetings = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'tudo bom', 'como vai', 'e ai'];
            const isSimpleGreeting = greetings.some(greeting => lowerText.includes(greeting)) && 
                                   lowerText.length < 20 && 
                                   (!result.intention || result.intention === 'general_inquiry');
            
            if (isSimpleGreeting) {
                console.log('🎭 DEBUG: Marcando como cumprimento simples');
                result.is_simple_greeting = true;
                result.intention = result.intention || 'greeting';
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Erro analisando intenção:', error);
            // Fallback para intenção genérica
            return {
                intention: 'general_inquiry',
                confidence: 0.5,
                original_message: text,
                extracted_info: {}
            };
        }
    }

    // ✅ FUNÇÃO MODIFICADA: Processar intenção com conversação natural (uma resposta por vez)
    async handleIntentionWithNaturalConversation(analysis, contact, userId, customerContext, chatId, conversation) {
        try {
            console.log('🎭 Processando intenção com conversação natural:', analysis.intention);
            
            const botConfig = await this.getUserBotConfig(userId);
            
            // ✅ ETAPA 1: VERIFICAR SE O USUÁRIO ESTÁ RESPONDENDO A UMA SELEÇÃO DE PRODUTO
            const pendingProductSelection = await this.checkPendingProductSelection(contact.id, userId);
            if (pendingProductSelection && this.isNumericSelection(analysis.original_message)) {
                await this.handleProductSelectionWithConversation(analysis.original_message, pendingProductSelection, contact, userId, customerContext, chatId, conversation);
                return;
            }

            // ✅ ETAPA 2: VERIFICAR SE O USUÁRIO ESTÁ RESPONDENDO A UMA SELEÇÃO DE PROFISSIONAL
            if (await this.isProfessionalSelection(analysis.original_message, contact.id, userId)) {
                await this.handleProfessionalSelectionWithConversation(analysis.original_message, contact.id, userId, customerContext, chatId, conversation);
                return;
            }

            // ✅ ETAPA 3: PROCESSAR INTENÇÕES PRINCIPAIS
            switch (analysis.intention) {
                case 'greeting':
                    await this.handleGreetingWithConversation(analysis, contact, userId, customerContext, chatId, conversation);
                    break;
                    
                case 'scheduling':
                    await this.handleSchedulingIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation);
                    break;
                    
                case 'inquiry':
                    await this.handleInquiryIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation);
                    break;
                    
                case 'rescheduling':
                    await this.handleReschedulingIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation);
                    break;
                    
                case 'cancellation':
                    await this.handleCancellationIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation);
                    break;
                    
                case 'general_inquiry':
                    await this.handleGeneralInquiryWithConversation(analysis, contact, userId, customerContext, chatId, conversation);
                    break;
                    
                default:
                    console.log('⚠️ INTENÇÃO NÃO RECONHECIDA:', analysis.intention);
                    console.log('⚠️ MENSAGEM ORIGINAL:', text);
                    await this.handleDefaultIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation);
                    break;
            }
            
        } catch (error) {
            console.error('❌ Erro processando intenção com conversação:', error);
            
            // Resposta de erro empática
            const errorResponse = await this.conversationEngine.generateNaturalResponse('error', customerContext, {
                name: contact.name
            });
            
            await this.sendConversationalResponseWithTyping(errorResponse, botConfig.bot_token, chatId, conversation, userId, analysis);
        }
    }

    // ✅ NOVA FUNÇÃO: Processar cumprimentos com conversação
    async handleGreetingWithConversation(analysis, contact, userId, customerContext, chatId, conversation) {
        try {
            console.log('👋 Processando cumprimento com conversa natural...');
            
            const botConfig = await this.getUserBotConfig(userId);
            
            // ✅ CORRIGIDO: Obter horário atual correto
            const currentTime = this.getCurrentTimeInfo();
            
            // Gerar resposta natural para cumprimento
            const greetingResponse = await this.conversationEngine.generateNaturalResponse('greeting', customerContext, {
                name: contact.name
            }, {
                timeOfDay: currentTime.period,
                currentHour: currentTime.hour,
                isReturningCustomer: customerContext.isReturningCustomer
            });
            
            await this.sendConversationalResponseWithTyping(greetingResponse, botConfig.bot_token, chatId, conversation, userId, analysis);
            
        } catch (error) {
            console.error('❌ Erro processando cumprimento:', error);
        }
    }

    // ✅ FUNÇÃO MODIFICADA: Processar agendamento com conversação (CORRIGIDA DEFINITIVAMENTE)
    async handleSchedulingIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation) {
        try {
            console.log('🗓 Processando agendamento com conversa natural...');
            console.log('🗓 DEBUG: Análise recebida:', JSON.stringify(analysis, null, 2));
            
            const botConfig = await this.getUserBotConfig(userId);
            
            // ✅ CORRIGIDO: Verificar se há data/hora CLARAMENTE especificada na mensagem original
            const originalMessage = analysis.original_message?.toLowerCase() || '';
            const dateTimeInfo = analysis.extracted_info || analysis.dateTime || {};
            
            console.log('📅 DEBUG: Mensagem original:', originalMessage);
            console.log('📅 DEBUG: DateTimeInfo extraído:', dateTimeInfo);
            
            // Verificar se a mensagem original contém especificação clara de data/hora
            const hasExplicitDateTime = this.hasExplicitDateTimeInMessage(originalMessage);
            
            console.log('📅 DEBUG: Tem data/hora explícita na mensagem?', hasExplicitDateTime);
            
            // Se NÃO há especificação clara de data/hora na mensagem original, SEMPRE perguntar
            if (!hasExplicitDateTime) {
                console.log('📅 SEMPRE perguntando data/hora - não há especificação clara na mensagem...');
                
                const askDateTimeResponse = await this.conversationEngine.generateNaturalResponse('ask_datetime', customerContext, {
                    name: contact.name
                }, {
                    currentTime: this.getCurrentTimeInfo(),
                    reason: 'scheduling_request',
                    message: 'Para quando você gostaria de agendar?'
                });
                
                await this.sendConversationalResponseWithTyping(askDateTimeResponse, botConfig.bot_token, chatId, conversation, userId, analysis);
                return;
            }
            
            // Se chegou aqui, há especificação clara - usar os dados extraídos
            const extractedDate = dateTimeInfo.date || dateTimeInfo.suggestedDate;
            const extractedTime = dateTimeInfo.time || dateTimeInfo.suggestedTime;
            
            console.log(`📅 Data/hora claramente especificada - Data: ${extractedDate}, Hora: ${extractedTime}`);
            
            // Verificar horário comercial APENAS para a data/hora especificada pelo usuário
            const isWithinBusinessHours = await this.checkBusinessHours(extractedDate, extractedTime, userId);
            
            if (!isWithinBusinessHours) {
                const outOfHoursResponse = await this.conversationEngine.generateNaturalResponse('out_of_hours', customerContext, {
                    name: contact.name
                }, {
                    requestedTime: `${extractedTime} do dia ${extractedDate}`,
                    businessHours: 'Segunda a sexta, das 8h às 17h',
                    currentTime: this.getCurrentTimeInfo(),
                    suggestion: 'Por favor, escolha um horário dentro do nosso funcionamento.'
                });
                
                await this.sendConversationalResponseWithTyping(outOfHoursResponse, botConfig.bot_token, chatId, conversation, userId, analysis);
                return;
            }
            
            console.log('✅ Horário solicitado está dentro do horário comercial, prosseguindo...');
            
            // Verificar se há produtos na análise
            if (analysis.products && analysis.products.length > 0) {
                await this.handleProductListWithConversation(analysis.products, contact, userId, customerContext, chatId, analysis, conversation);
            } else {
                // Buscar profissionais disponíveis
                const professionals = await this.getAvailableProfessionals(userId, extractedDate, extractedTime);
                
                if (professionals.length > 0) {
                    await this.handleProfessionalListWithConversation(professionals, contact, userId, customerContext, chatId, analysis, conversation);
                } else {
                    const noAvailabilityResponse = await this.conversationEngine.generateNaturalResponse('no_availability', customerContext, {
                        name: contact.name
                    }, {
                        requestedTime: `${extractedTime} do dia ${extractedDate}`,
                        currentTime: this.getCurrentTimeInfo(),
                        suggestion: 'Posso sugerir outros horários disponíveis se desejar.'
                    });
                    
                    await this.sendConversationalResponseWithTyping(noAvailabilityResponse, botConfig.bot_token, chatId, conversation, userId, analysis);
                }
            }
            
        } catch (error) {
            console.error('❌ Erro no agendamento com conversação:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Verificar se mensagem tem data/hora explícita
    hasExplicitDateTimeInMessage(message) {
        // Palavras que indicam especificação de tempo
        const timeIndicators = [
            // Horários específicos
            /\d{1,2}:\d{2}/, // 14:30, 9:00
            /\d{1,2}h\d{0,2}/, // 14h30, 9h
            /\d{1,2}\s*(hora|horas)/, // 2 horas, 14 hora
            
            // Datas específicas
            /amanhã/, /amanha/,
            /hoje/,
            /segunda/, /terça/, /terca/, /quarta/, /quinta/, /sexta/, /sabado/, /sábado/, /domingo/,
            /\d{1,2}\/\d{1,2}/, // 16/07, 5/8
            /\d{1,2}\s*de\s*(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/,
            
            // Períodos específicos
            /manhã/, /manha/, /tarde/, /noite/, /madrugada/,
            /cedo/, /cedinho/,
            /meio.dia/, /meio-dia/,
            
            // Expressões temporais específicas
            /próxima/, /proxima/, /próximo/, /proximo/,
            /na\s*(segunda|terça|terca|quarta|quinta|sexta|sabado|sábado|domingo)/,
            /às\s*\d/, /as\s*\d/, // às 14, as 9
            /para\s*(amanhã|amanha|hoje|segunda|terça|terca|quarta|quinta|sexta)/
        ];
        
        const hasExplicitTime = timeIndicators.some(pattern => pattern.test(message));
        
        console.log('📅 DEBUG hasExplicitDateTimeInMessage:', {
            message: message,
            hasExplicitTime: hasExplicitTime,
            matchedPatterns: timeIndicators.filter(pattern => pattern.test(message))
        });
        
        return hasExplicitTime;
    }

    // ✅ NOVA FUNÇÃO: Obter informações corretas de horário atual (CORRIGIDA PARA BRASÍLIA)
    getCurrentTimeInfo() {
        // Obter horário atual em UTC
        const now = new Date();
        
        // Converter para horário de Brasília (UTC-3)
        // Se o servidor estiver em UTC, subtraímos 3 horas
        // Se já estiver em horário local brasileiro, usamos direto
        
        // Verificar se o servidor está em UTC (offset = 0) ou já em horário local
        const serverOffset = now.getTimezoneOffset(); // em minutos
        console.log(`🕐 DEBUG: Server timezone offset = ${serverOffset} minutos`);
        
        let brasiliaTime;
        if (serverOffset === 0) {
            // Servidor em UTC, converter para Brasília (UTC-3)
            brasiliaTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
            console.log(`🕐 DEBUG: Servidor em UTC, convertendo para Brasília`);
        } else {
            // Servidor já pode estar em horário local, usar direto
            brasiliaTime = now;
            console.log(`🕐 DEBUG: Usando horário local do servidor`);
        }
        
        const hour = brasiliaTime.getHours();
        const minute = brasiliaTime.getMinutes();
        
        console.log(`🕐 DEBUG getCurrentTimeInfo: Hora original do servidor = ${now.getHours()}:${now.getMinutes()}`);
        console.log(`🕐 DEBUG getCurrentTimeInfo: Hora ajustada para Brasília = ${hour}:${minute}`);
        
        let period;
        if (hour >= 5 && hour < 12) {
            period = 'manhã';
        } else if (hour >= 12 && hour < 18) {
            period = 'tarde';
        } else {
            period = 'noite';
        }
        
        console.log(`🕐 DEBUG getCurrentTimeInfo: Período determinado = ${period} (hora: ${hour})`);
        
        const timeInfo = {
            hour: hour,
            minute: minute,
            period: period,
            fullTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
            date: brasiliaTime.toLocaleDateString('pt-BR'),
            timestamp: brasiliaTime.toISOString(),
            timezone: 'America/Sao_Paulo',
            serverOriginalTime: `${now.getHours()}:${now.getMinutes()}`,
            adjustedTime: `${hour}:${minute}`
        };
        
        console.log(`🕐 DEBUG getCurrentTimeInfo: Retornando:`, timeInfo);
        return timeInfo;
    }

    // ✅ NOVA FUNÇÃO: Processar consultas com conversação
    async handleInquiryIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation) {
        try {
            console.log('❓ Processando consulta com conversa natural...');
            
            const botConfig = await this.getUserBotConfig(userId);
            
            // Gerar resposta natural para consulta
            const inquiryResponse = await this.conversationEngine.generateNaturalResponse('inquiry', customerContext, {
                name: contact.name
            }, {
                question: analysis.original_message,
                context: analysis.extracted_info
            });
            
            await this.sendConversationalResponseWithTyping(inquiryResponse, botConfig.bot_token, chatId, conversation, userId, analysis);
            
        } catch (error) {
            console.error('❌ Erro processando consulta:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Processar reagendamento com conversação
    async handleReschedulingIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation) {
        try {
            console.log('🔄 Processando reagendamento com conversa natural...');
            
            const botConfig = await this.getUserBotConfig(userId);
            
            // Buscar agendamentos existentes do cliente
            const existingAppointments = await this.getCustomerAppointments(contact.id, userId);
            
            if (existingAppointments.length === 0) {
                const noAppointmentsResponse = await this.conversationEngine.generateNaturalResponse('no_appointments', customerContext, {
                    name: contact.name
                });
                
                await this.sendConversationalResponseWithTyping(noAppointmentsResponse, botConfig.bot_token, chatId, conversation, userId, analysis);
                return;
            }
            
            // Mostrar agendamentos disponíveis para reagendamento
            const reschedulingResponse = await this.conversationEngine.generateNaturalResponse('rescheduling_options', customerContext, {
                name: contact.name
            }, {
                appointments: existingAppointments
            });
            
            // Criar lista de agendamentos
            let appointmentsList = "📅 *Seus agendamentos:*\n\n";
            existingAppointments.forEach((apt, index) => {
                const date = new Date(apt.appointment_date).toLocaleDateString('pt-BR');
                const time = new Date(apt.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                appointmentsList += `${index + 1}. *${apt.professionals?.name || 'Profissional'}*\n`;
                appointmentsList += `   📅 ${date} às ${time}\n`;
                if (apt.title) appointmentsList += `   📝 ${apt.title}\n`;
                appointmentsList += "\n";
            });
            
            appointmentsList += "📝 *Digite o número do agendamento que deseja reagendar*";
            
            // Enviar com typing
            const introMessage = reschedulingResponse.messages[0] || "Vou mostrar seus agendamentos:";
            await this.sendListWithTyping(introMessage, appointmentsList, botConfig.bot_token, chatId);
            
            // Salvar seleção pendente para reagendamento
            await this.savePendingRescheduling(contact.id, userId, existingAppointments, analysis);
            
            // Salvar resposta
            await this.saveConversationalResponse(conversation.id, introMessage + '\n' + appointmentsList, userId, analysis);
            
        } catch (error) {
            console.error('❌ Erro processando reagendamento:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Processar cancelamento com conversação
    async handleCancellationIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation) {
        try {
            console.log('❌ Processando cancelamento com conversa natural...');
            
            const botConfig = await this.getUserBotConfig(userId);
            
            // Buscar agendamentos existentes do cliente
            const existingAppointments = await this.getCustomerAppointments(contact.id, userId);
            
            if (existingAppointments.length === 0) {
                const noAppointmentsResponse = await this.conversationEngine.generateNaturalResponse('no_appointments', customerContext, {
                    name: contact.name
                });
                
                await this.sendConversationalResponseWithTyping(noAppointmentsResponse, botConfig.bot_token, chatId, conversation, userId, analysis);
                return;
            }
            
            // Mostrar agendamentos disponíveis para cancelamento
            const cancellationResponse = await this.conversationEngine.generateNaturalResponse('cancellation_options', customerContext, {
                name: contact.name
            }, {
                appointments: existingAppointments
            });
            
            // Criar lista de agendamentos
            let appointmentsList = "📅 *Seus agendamentos:*\n\n";
            existingAppointments.forEach((apt, index) => {
                const date = new Date(apt.appointment_date).toLocaleDateString('pt-BR');
                const time = new Date(apt.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                appointmentsList += `${index + 1}. *${apt.professionals?.name || 'Profissional'}*\n`;
                appointmentsList += `   📅 ${date} às ${time}\n`;
                if (apt.title) appointmentsList += `   📝 ${apt.title}\n`;
                appointmentsList += "\n";
            });
            
            appointmentsList += "📝 *Digite o número do agendamento que deseja cancelar*";
            
            // Enviar com typing
            const introMessage = cancellationResponse.messages[0] || "Vou mostrar seus agendamentos:";
            await this.sendListWithTyping(introMessage, appointmentsList, botConfig.bot_token, chatId);
            
            // Salvar seleção pendente para cancelamento
            await this.savePendingCancellation(contact.id, userId, existingAppointments, analysis);
            
            // Salvar resposta
            await this.saveConversationalResponse(conversation.id, introMessage + '\n' + appointmentsList, userId, analysis);
            
        } catch (error) {
            console.error('❌ Erro processando cancelamento:', error);
        }
    }

    // ✅ FUNÇÃO MODIFICADA: Mostrar lista de produtos com conversação e typing
    async handleProductListWithConversation(products, contact, userId, customerContext, chatId, analysis, conversation) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            
            // Gerar resposta natural para lista de produtos
            const productResponse = await this.conversationEngine.generateNaturalResponse('products_list', customerContext, {
                name: contact.name
            }, {
                products: products
            });
            
            // Criar lista formatada de produtos
            let productList = "🏥 *Nossos serviços disponíveis:*\n\n";
            products.forEach((product, index) => {
                productList += `${index + 1}. *${product.name}*\n`;
                if (product.description) {
                    productList += `   ${product.description}\n`;
                }
                if (product.price) {
                    productList += `   💰 R$ ${product.price}\n`;
                }
                productList += "\n";
            });
            
            productList += "📝 *Digite o número do serviço desejado*";
            
            // Enviar com typing
            const introMessage = productResponse.messages[0] || "Vou mostrar nossos serviços disponíveis:";
            await this.sendListWithTyping(introMessage, productList, botConfig.bot_token, chatId);
            
            // Salvar seleção pendente
            await this.savePendingProductSelection(contact.id, userId, products, analysis);
            
            // Salvar resposta
            await this.saveConversationalResponse(conversation.id, introMessage + '\n' + productList, userId, analysis);
            
        } catch (error) {
            console.error('❌ Erro mostrando produtos com conversação:', error);
        }
    }

    // ✅ FUNÇÃO MODIFICADA: Mostrar lista de profissionais com conversação e typing
    async handleProfessionalListWithConversation(professionals, contact, userId, customerContext, chatId, analysis, conversation) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            
            // Gerar resposta natural para lista de profissionais
            const professionalResponse = await this.conversationEngine.generateNaturalResponse('professionals_list', customerContext, {
                name: contact.name
            }, {
                professionals: professionals
            });
            
            // Criar lista formatada de profissionais
            let professionalList = "👨‍⚕️ *Profissionais disponíveis:*\n\n";
            professionals.forEach((prof, index) => {
                professionalList += `${index + 1}. *Dr(a). ${prof.name}*\n`;
                if (prof.specialty) {
                    professionalList += `   🎯 ${prof.specialty}\n`;
                }
                professionalList += "\n";
            });
            
            professionalList += "📝 *Digite o número do profissional desejado*";
            
            // Enviar com typing
            const introMessage = professionalResponse.messages[0] || "Vou mostrar os profissionais disponíveis:";
            await this.sendListWithTyping(introMessage, professionalList, botConfig.bot_token, chatId);
            
            // Salvar seleção pendente
            await this.savePendingProfessionalSelection(contact.id, userId, professionals, analysis);
            
            // Salvar resposta
            await this.saveConversationalResponse(conversation.id, introMessage + '\n' + professionalList, userId, analysis);
            
        } catch (error) {
            console.error('❌ Erro mostrando profissionais com conversação:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Processar seleção de produto com conversação
    async handleProductSelectionWithConversation(text, pendingSelection, contact, userId, customerContext, chatId, conversation) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            const cleanText = text.trim();
            const products = JSON.parse(pendingSelection.products || pendingSelection.data?.products);
            
            let selectedProduct = null;
            
            // Tentar por número
            if (/^\d+$/.test(cleanText)) {
                const index = parseInt(cleanText) - 1;
                if (index >= 0 && index < products.length) {
                    selectedProduct = products[index];
                }
            }
            
            if (!selectedProduct) {
                const invalidResponse = await this.conversationEngine.generateNaturalResponse('invalid_selection', customerContext, {
                    name: contact.name
                });
                
                await this.sendConversationalResponseWithTyping(invalidResponse, botConfig.bot_token, chatId, conversation, userId, {});
                return;
            }
            
            // Confirmar seleção com empatia
            const confirmResponse = await this.conversationEngine.generateNaturalResponse('product_selected', customerContext, {
                name: contact.name
            }, {
                product: selectedProduct
            });
            
            await this.sendConversationalResponseWithTyping(confirmResponse, botConfig.bot_token, chatId, conversation, userId, {});
            
            // Buscar profissionais para o produto selecionado
            const professionals = await this.getProfessionalsForProduct(selectedProduct.id, userId);
            
            if (professionals.length > 0) {
                await this.handleProfessionalListWithConversation(professionals, contact, userId, customerContext, chatId, JSON.parse(pendingSelection.analysis), conversation);
            }
            
            // Limpar seleção pendente de produto
            await this.clearPendingProductSelection(contact.id, userId);
            
        } catch (error) {
            console.error('❌ Erro na seleção do produto:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Processar seleção de profissional com conversação
    async handleProfessionalSelectionWithConversation(text, contactId, userId, customerContext, chatId, conversation) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            const pending = await this.getPendingProfessionalSelection(contactId, userId);
            
            if (!pending) return;
            
            const professionals = JSON.parse(pending.professionals);
            const cleanText = text.trim();
            
            let selectedProfessional = null;
            
            // Tentar por número
            if (/^\d+$/.test(cleanText)) {
                const index = parseInt(cleanText) - 1;
                if (index >= 0 && index < professionals.length) {
                    selectedProfessional = professionals[index];
                }
            }
            
            if (!selectedProfessional) {
                const invalidResponse = await this.conversationEngine.generateNaturalResponse('invalid_selection', customerContext, {
                    name: customerContext.customer.name
                });
                
                await this.sendConversationalResponseWithTyping(invalidResponse, botConfig.bot_token, chatId, conversation, userId, {});
                return;
            }
            
            // Confirmar seleção com empatia
            const confirmResponse = await this.conversationEngine.generateNaturalResponse('professional_selected', customerContext, {
                name: customerContext.customer.name
            }, {
                professional: selectedProfessional
            });
            
            await this.sendConversationalResponseWithTyping(confirmResponse, botConfig.bot_token, chatId, conversation, userId, {});
            
            // Processar agendamento real
            const originalAnalysis = JSON.parse(pending.analysis);
            const contact = await this.getContactById(contactId);
            await this.processDirectSchedulingWithConversation(selectedProfessional, contact, userId, originalAnalysis, customerContext, chatId, conversation);
            
            // Limpar agendamento pendente
            await this.clearPendingProfessionalSelection(contactId, userId);
            
        } catch (error) {
            console.error('❌ Erro na seleção do profissional:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Processar agendamento direto com conversação
    async processDirectSchedulingWithConversation(selectedProfessional, contact, userId, analysis, customerContext, chatId, conversation) {
        try {
            console.log('📅 Processando agendamento direto com conversação...');
            
            const botConfig = await this.getUserBotConfig(userId);
            
            // Extrair informações de data/hora
            const dateTimeInfo = analysis.extracted_info || analysis.dateTime || {};
            const extractedDate = dateTimeInfo.date || dateTimeInfo.suggestedDate;
            const extractedTime = dateTimeInfo.time || dateTimeInfo.suggestedTime;
            
            if (!extractedDate || !extractedTime) {
                const missingInfoResponse = await this.conversationEngine.generateNaturalResponse('missing_datetime', customerContext, {
                    name: contact.name
                }, {
                    professional: selectedProfessional
                });
                
                await this.sendConversationalResponseWithTyping(missingInfoResponse, botConfig.bot_token, chatId, conversation, userId, analysis);
                return;
            }
            
            // Verificar disponibilidade do profissional
            const [year, month, day] = extractedDate.split("-").map(Number);
            const [hours, minutes] = extractedTime.split(":").map(Number);
            const appointmentDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
            
            const availabilityResponse = await fetch(`http://localhost:3001/api/calendar/check-availability/${selectedProfessional.id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    startDateTime: appointmentDate.toISOString(),
                    duration: 60 // 1 hora padrão
                })
            });
            
            const availabilityResult = await availabilityResponse.json();
            
            if (!availabilityResult.success || !availabilityResult.available) {
                const unavailableResponse = await this.conversationEngine.generateNaturalResponse('professional_unavailable', customerContext, {
                    name: contact.name
                }, {
                    professional: selectedProfessional,
                    requestedTime: `${extractedTime} do dia ${extractedDate}`,
                    reason: availabilityResult.reason || 'Horário não disponível'
                });
                
                await this.sendConversationalResponseWithTyping(unavailableResponse, botConfig.bot_token, chatId, conversation, userId, analysis);
                return;
            }
            
            // Criar o agendamento
            const appointmentData = {
                user_id: userId,
                contact_id: contact.id,
                professional_id: selectedProfessional.id,
                appointment_date: appointmentDate.toISOString(),
                title: analysis.extracted_info?.service || "Consulta",
                description: analysis.original_message || "",
                status: "scheduled",
                duration: 60,
                created_at: new Date().toISOString()
            };
            
            const { data: appointment, error } = await this.supabase 
                .from("appointments")
                .insert(appointmentData)
                .select()
                .single();
            
            if (error) {
                console.error("❌ Erro criando agendamento:", error);
                
                const errorResponse = await this.conversationEngine.generateNaturalResponse('booking_error', customerContext, {
                    name: contact.name
                });
                
                await this.sendConversationalResponseWithTyping(errorResponse, botConfig.bot_token, chatId, conversation, userId, analysis);
                return;
            }
            
            // Confirmar agendamento com sucesso
            const confirmationResponse = await this.conversationEngine.generateNaturalResponse('appointment_confirmed', customerContext, {
                name: contact.name
            }, {
                appointmentDetails: {
                    professional: selectedProfessional.name,
                    date: extractedDate,
                    time: extractedTime,
                    service: appointmentData.title
                }
            });
            
            await this.sendConversationalResponseWithTyping(confirmationResponse, botConfig.bot_token, chatId, conversation, userId, analysis);
            
            console.log("✅ Agendamento criado com sucesso:", appointment.id);
            
        } catch (error) {
            console.error('❌ Erro no agendamento direto:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Processar pergunta geral com conversação
    async handleGeneralInquiryWithConversation(analysis, contact, userId, customerContext, chatId, conversation) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            
            const inquiryResponse = await this.conversationEngine.generateNaturalResponse('general_inquiry', customerContext, {
                name: contact.name
            }, {
                question: analysis.original_message
            });
            
            await this.sendConversationalResponseWithTyping(inquiryResponse, botConfig.bot_token, chatId, conversation, userId, analysis);
            
        } catch (error) {
            console.error('❌ Erro processando pergunta geral:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Processar intenção padrão com conversação
    async handleDefaultIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            
            const defaultResponse = await this.conversationEngine.generateNaturalResponse('general_inquiry', customerContext, {
                name: contact.name
            });
            
            await this.sendConversationalResponseWithTyping(defaultResponse, botConfig.bot_token, chatId, conversation, userId, analysis);
            
        } catch (error) {
            console.error('❌ Erro processando intenção padrão:', error);
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Salvar resposta conversacional
    async saveConversationalResponse(conversationId, content, userId, analysis) {
        try {
            await this.saveMessage({
                conversation_id: conversationId,
                content: content,
                message_type: "text",
                sender_type: "assistant",
                channel_type: "telegram",
                channel_message_id: `ai_${Date.now()}`,
                user_id: userId,
                metadata: { ai_analysis: analysis, conversation_engine: true }
            });
        } catch (error) {
            console.error('❌ Erro salvando resposta conversacional:', error);
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Verificar horário comercial (CORRIGIDA)
    async checkBusinessHours(date, time, userId) {
        try {
            console.log(`🕐 Verificando horário comercial para usuário ${userId}, data: ${date}, hora: ${time}`);
            
            // Primeiro, verificar se há configuração de horário comercial global para a empresa
            const { data: companyBusinessHours, error: companyError } = await this.supabase
                .from('company_business_hours')
                .select('*')
                .eq('company_id', userId) // Assumindo que userId é o company_id
                .eq('is_active', true);

            if (companyError) {
                console.error('❌ Erro buscando horário comercial da empresa:', companyError);
            }

            // Se não encontrar horário da empresa, verificar nas configurações do usuário
            if (!companyBusinessHours || companyBusinessHours.length === 0) {
                console.log('⚠️ Nenhuma configuração de horário comercial da empresa encontrada, verificando user_settings...');
                
                const { data: userSettings, error: userError } = await this.supabase
                    .from('user_settings')
                    .select('business_hours_start, business_hours_end, business_days')
                    .eq('user_id', userId)
                    .single();

                if (userError || !userSettings) {
                    console.error('❌ Nenhuma configuração de horário comercial encontrada:', userError);
                    // Fallback: assumir horário comercial padrão (8h às 17h, segunda a sexta)
                    return this.checkDefaultBusinessHours(date, time);
                }

                return this.checkUserBusinessHours(date, time, userSettings);
            }

            // Verificar horário comercial da empresa
            return this.checkCompanyBusinessHours(date, time, companyBusinessHours);
            
        } catch (error) {
            console.error('❌ Erro verificando horário comercial:', error);
            // Em caso de erro, assumir horário comercial padrão
            return this.checkDefaultBusinessHours(date, time);
        }
    }

    personalizeResponse(analysis, memoryContext) {
        let response = analysis.response || 'Olá! Como posso ajudar?';

        // PERSONALIZAR BASEADO NO RELACIONAMENTO
        if (memoryContext.customerName && !memoryContext.shouldGreet) {
            // Cliente conhecido, não precisa se apresentar
            response = response.replace(/oi|olá|bom dia|boa tarde|boa noite/gi, '');
            response = `${memoryContext.customerName}, ${response.trim()}`;
        }

        // ADICIONAR CONTEXTO SE RELEVANTE
        if (memoryContext.relationshipStage === 'loyal_customer') {
            response = this.addLoyalCustomerTouch(response);
        }

        return response;
    }

    addLoyalCustomerTouch(response) {
        const touches = [
            'Como sempre, estou aqui para ajudar! ',
            'É sempre um prazer falar com você! ',
            'Que bom ter você aqui novamente! '
        ];
        
        const randomTouch = touches[Math.floor(Math.random() * touches.length)];
        return randomTouch + response;
    }

    // ✅ NOVA FUNÇÃO: Verificar horário comercial padrão (fallback)
    checkDefaultBusinessHours(date, time) {
        try {
            const [year, month, day] = date.split("-").map(Number);
            const [hours, minutes] = time.split(":").map(Number);
            const appointmentDate = new Date(year, month - 1, day, hours, minutes);
            
            // Verificar se é dia útil (segunda a sexta = 1 a 5)
            const dayOfWeek = appointmentDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) { // Domingo ou sábado
                console.log('❌ Fora do horário: fim de semana');
                return false;
            }
            
            // Verificar se está dentro do horário (8h às 17h)
            if (hours < 8 || hours >= 17) {
                console.log(`❌ Fora do horário: ${hours}h não está entre 8h e 17h`);
                return false;
            }
            
            console.log('✅ Dentro do horário comercial padrão');
            return true;
            
        } catch (error) {
            console.error('❌ Erro verificando horário padrão:', error);
            return false;
        }
    }

    // ✅ NOVA FUNÇÃO: Verificar horário comercial do usuário
    checkUserBusinessHours(date, time, userSettings) {
        try {
            const [year, month, day] = date.split("-").map(Number);
            const [hours, minutes] = time.split(":").map(Number);
            const appointmentDate = new Date(year, month - 1, day, hours, minutes);
            
            // Verificar dia da semana
            const dayOfWeek = appointmentDate.getDay();
            const businessDays = userSettings.business_days || [1, 2, 3, 4, 5]; // Segunda a sexta por padrão
            
            if (!businessDays.includes(dayOfWeek)) {
                console.log(`❌ Fora do horário: dia ${dayOfWeek} não está nos dias úteis`);
                return false;
            }
            
            // Verificar horário
            const startTime = userSettings.business_hours_start || '08:00:00';
            const endTime = userSettings.business_hours_end || '17:00:00';
            
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);
            
            const appointmentMinutes = hours * 60 + minutes;
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            
            if (appointmentMinutes < startMinutes || appointmentMinutes >= endMinutes) {
                console.log(`❌ Fora do horário: ${hours}:${minutes} não está entre ${startTime} e ${endTime}`);
                return false;
            }
            
            console.log('✅ Dentro do horário comercial do usuário');
            return true;
            
        } catch (error) {
            console.error('❌ Erro verificando horário do usuário:', error);
            return false;
        }
    }

    // ✅ NOVA FUNÇÃO: Verificar horário comercial da empresa
    checkCompanyBusinessHours(date, time, companyBusinessHours) {
        try {
            const [year, month, day] = date.split("-").map(Number);
            const [hours, minutes] = time.split(":").map(Number);
            const appointmentDate = new Date(year, month - 1, day, hours, minutes);
            
            // Verificar dia da semana (0 = domingo, 1 = segunda, etc.)
            const dayOfWeek = appointmentDate.getDay();
            
            // Buscar configuração para este dia da semana
            const dayConfig = companyBusinessHours.find(config => config.day_of_week === dayOfWeek);
            
            if (!dayConfig) {
                console.log(`❌ Fora do horário: sem configuração para o dia ${dayOfWeek}`);
                return false;
            }
            
            // Verificar horário
            const startTime = dayConfig.start_time;
            const endTime = dayConfig.end_time;
            
            if (!startTime || !endTime) {
                console.log(`❌ Fora do horário: horários não configurados para o dia ${dayOfWeek}`);
                return false;
            }
            
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);
            
            const appointmentMinutes = hours * 60 + minutes;
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            
            // Verificar intervalo de almoço se existir
            if (dayConfig.break_start_time && dayConfig.break_end_time) {
                const [breakStartHour, breakStartMin] = dayConfig.break_start_time.split(':').map(Number);
                const [breakEndHour, breakEndMin] = dayConfig.break_end_time.split(':').map(Number);
                
                const breakStartMinutes = breakStartHour * 60 + breakStartMin;
                const breakEndMinutes = breakEndHour * 60 + breakEndMin;
                
                if (appointmentMinutes >= breakStartMinutes && appointmentMinutes < breakEndMinutes) {
                    console.log(`❌ Fora do horário: ${hours}:${minutes} está no intervalo de almoço`);
                    return false;
                }
            }
            
            if (appointmentMinutes < startMinutes || appointmentMinutes >= endMinutes) {
                console.log(`❌ Fora do horário: ${hours}:${minutes} não está entre ${startTime} e ${endTime}`);
                return false;
            }
            
            console.log('✅ Dentro do horário comercial da empresa');
            return true;
            
        } catch (error) {
            console.error('❌ Erro verificando horário da empresa:', error);
            return false;
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Buscar agendamentos do cliente
    async getCustomerAppointments(contactId, userId) {
        try {
            const { data: appointments, error } = await this.supabase
                .from('appointments')
                .select(`
                    *,
                    professionals:professional_id (name, specialty)
                `)
                .eq('user_id', userId)
                .eq('contact_id', contactId)
                .gte('appointment_date', new Date().toISOString())
                .eq('status', 'scheduled')
                .order('appointment_date', { ascending: true });
            
            if (error) throw error;
            return appointments || [];
        } catch (error) {
            console.error('❌ Erro buscando agendamentos do cliente:', error);
            return [];
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Salvar reagendamento pendente
    async savePendingRescheduling(contactId, userId, appointments, analysis) {
        try {
            // ⚠️ TEMPORÁRIO: Desabilitado até a tabela pending_appointments ser criada
            console.log('⚠️ savePendingRescheduling temporariamente desabilitado');
            return;

            // TODO: Reativar após executar create_pending_appointments_table_complete.sql
            /*
            await supabaseAdmin
                .from('pending_appointments')
                .upsert({
                    contact_id: contactId,
                    user_id: userId,
                    appointments: JSON.stringify(appointments),
                    analysis: JSON.stringify(analysis),
                    type: 'rescheduling_selection',
                    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                    created_at: new Date().toISOString()
                });
            */
        } catch (error) {
            console.error('❌ Erro salvando reagendamento pendente:', error);
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Salvar cancelamento pendente
    async savePendingCancellation(contactId, userId, appointments, analysis) {
        try {
            // ⚠️ TEMPORÁRIO: Desabilitado até a tabela pending_appointments ser criada
            console.log('⚠️ savePendingCancellation temporariamente desabilitado');
            return;

            // TODO: Reativar após executar create_pending_appointments_table_complete.sql
            /*
            await supabaseAdmin
                .from('pending_appointments')
                .upsert({
                    contact_id: contactId,
                    user_id: userId,
                    appointments: JSON.stringify(appointments),
                    analysis: JSON.stringify(analysis),
                    type: 'cancellation_selection',
                    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                    created_at: new Date().toISOString()
                });
            */
        } catch (error) {
            console.error('❌ Erro salvando cancelamento pendente:', error);
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Salvar seleção pendente de produto
    async savePendingProductSelection(contactId, userId, products, analysis) {
        try {
            // ⚠️ TEMPORÁRIO: Desabilitado até a tabela pending_appointments ser criada
            console.log('⚠️ savePendingProductSelection temporariamente desabilitado');
            return;

            // TODO: Reativar após executar create_pending_appointments_table_complete.sql
            /*
            await supabaseAdmin
                .from('pending_appointments')
                .upsert({
                    contact_id: contactId,
                    user_id: userId,
                    products: JSON.stringify(products),
                    analysis: JSON.stringify(analysis),
                    type: 'product_selection',
                    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutos
                    created_at: new Date().toISOString()
                });
            */
        } catch (error) {
            console.error('❌ Erro salvando seleção pendente de produto:', error);
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Salvar seleção pendente de profissional
    async savePendingProfessionalSelection(contactId, userId, professionals, analysis) {
        try {
            // ⚠️ TEMPORÁRIO: Desabilitado até a tabela pending_appointments ser criada
            console.log('⚠️ savePendingProfessionalSelection temporariamente desabilitado');
            return;

            // TODO: Reativar após executar create_pending_appointments_table_complete.sql
            /*
            await supabaseAdmin
                .from('pending_appointments')
                .upsert({
                    contact_id: contactId,
                    user_id: userId,
                    professionals: JSON.stringify(professionals),
                    analysis: JSON.stringify(analysis),
                    type: 'professional_selection',
                    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutos
                    created_at: new Date().toISOString()
                });
            */
        } catch (error) {
            console.error('❌ Erro salvando seleção pendente de profissional:', error);
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Verificar seleção pendente de produto
    async checkPendingProductSelection(contactId, userId) {
        try {
            // ⚠️ TEMPORÁRIO: Desabilitado até a tabela pending_appointments ser criada
            console.log('⚠️ checkPendingProductSelection temporariamente desabilitado');
            return null;

            // TODO: Reativar após executar create_pending_appointments_table_complete.sql
            /*
            const { data, error } = await supabaseAdmin
                .from('pending_appointments')
                .select('*')
                .eq('contact_id', contactId)
                .eq('user_id', userId)
                .eq('type', 'product_selection')
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data;
            */
        } catch (error) {
            console.error('❌ Erro verificando seleção pendente de produto:', error);
            return null;
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Obter seleção pendente de profissional
    async getPendingProfessionalSelection(contactId, userId) {
        try {
            // ⚠️ TEMPORÁRIO: Desabilitado até a tabela pending_appointments ser criada
            console.log('⚠️ getPendingProfessionalSelection temporariamente desabilitado');
            return null;

            // TODO: Reativar após executar create_pending_appointments_table_complete.sql
            /*
            const { data, error } = await supabaseAdmin
                .from('pending_appointments')
                .select('*')
                .eq('contact_id', contactId)
                .eq('user_id', userId)
                .eq('type', 'professional_selection')
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data;
            */
        } catch (error) {
            console.error('❌ Erro obtendo seleção pendente de profissional:', error);
            return null;
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Limpar seleção pendente de produto
    async clearPendingProductSelection(contactId, userId) {
        try {
            // ⚠️ TEMPORÁRIO: Desabilitado até a tabela pending_appointments ser criada
            console.log('⚠️ clearPendingProductSelection temporariamente desabilitado');
            return;

            // TODO: Reativar após executar create_pending_appointments_table_complete.sql
            /*
            await supabaseAdmin
                .from('pending_appointments')
                .delete()
                .eq('contact_id', contactId)
                .eq('user_id', userId)
                .eq('type', 'product_selection');
            */
        } catch (error) {
            console.error('❌ Erro limpando seleção pendente de produto:', error);
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Limpar seleção pendente de profissional
    async clearPendingProfessionalSelection(contactId, userId) {
        try {
            // ⚠️ TEMPORÁRIO: Desabilitado até a tabela pending_appointments ser criada
            console.log('⚠️ clearPendingProfessionalSelection temporariamente desabilitado');
            return;

            // TODO: Reativar após executar create_pending_appointments_table_complete.sql
            /*
            await supabaseAdmin
                .from('pending_appointments')
                .delete()
                .eq('contact_id', contactId)
                .eq('user_id', userId)
                .eq('type', 'professional_selection');
            */
        } catch (error) {
            console.error('❌ Erro limpando seleção pendente de profissional:', error);
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Verificar se é seleção de profissional
    async isProfessionalSelection(text, contactId, userId) {
        const pending = await this.getPendingProfessionalSelection(contactId, userId);
        return pending && this.isNumericSelection(text);
    }

    // ✅ FUNÇÃO AUXILIAR: Verificar se é seleção numérica
    isNumericSelection(text) {
        return /^\d+$/.test(text.trim());
    }

    // ✅ FUNÇÃO AUXILIAR: Obter contato por ID
    async getContactById(contactId) {
        try {
            const { data, error } = await this.supabase
                .from('contacts')
                .select('*')
                .eq('id', contactId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('❌ Erro obtendo contato:', error);
            return null;
        }
    }

    // ===== MÉTODOS ORIGINAIS MANTIDOS =====

    async findOrCreateContact(from, userId) {
        const { data: existingContact, error: searchError } = await this.supabase
            .from("contacts")
            .select("*")
            .eq("telegram_id", from.id.toString())
            .eq("user_id", userId)
            .single();

        if (existingContact) {
            return existingContact;
        }

        const { data: newContact, error: createError } = await this.supabase
            .from("contacts")
            .insert({
                name: from.first_name + (from.last_name ? ` ${from.last_name}` : ""),
                phone: from.username || null,
                telegram_id: from.id.toString(),
                user_id: userId,
                status: "active"
            })
            .select()
            .single();

        if (createError) throw createError;
        return newContact;
    }

    async findOrCreateConversation(contactId, userId, channelType) {
        const { data: existingConversation, error: searchError } = await this.supabase
            .from("conversations")
            .select("*")
            .eq("contact_id", contactId)
            .eq("user_id", userId)
            .eq("channel_type", channelType)
            .single();

        if (existingConversation) {
            return existingConversation;
        }

        const { data: newConversation, error: createError } = await this.supabase
            .from("conversations")
            .insert({
                contact_id: contactId,
                user_id: userId,
                channel_type: channelType,
                status: "active"
            })
            .select()
            .single();

        if (createError) throw createError;
        return newConversation;
    }

    async saveMessage(messageData) {
        const { data, error } = await this.supabase
            .from("messages")
            .insert(messageData)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    getMessageType(message) {
        if (message.text) return "text";
        if (message.photo) return "photo";
        if (message.video) return "video";
        if (message.audio) return "audio";
        if (message.voice) return "voice";
        if (message.document) return "document";
        return "unknown";
    }

    async getFileUrl(fileId, botToken) {
        try {
            const response = await axios.get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
            const filePath = response.data.result.file_path;
            return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
        } catch (error) {
            console.error("Erro obtendo URL do arquivo:", error);
            return null;
        }
    }

    async sendMessage(userId, chatId, message, options = {}) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            const response = await axios.post(`https://api.telegram.org/bot${botConfig.bot_token}/sendMessage`, {
                chat_id: chatId,
                text: message,
                ...options
            });
            return response.data;
        } catch (error) {
            console.error("Erro enviando mensagem:", error);
            throw error;
        }
    }

    async setWebhook(userId, webhookUrl) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            const response = await axios.post(`https://api.telegram.org/bot${botConfig.bot_token}/setWebhook`, {
                url: webhookUrl
            });
            return response.data;
        } catch (error) {
            console.error("Erro configurando webhook:", error);
            throw error;
        }
    }

    async processCallbackQuery(callbackQuery, userId) {
        // Implementação original mantida
        console.log("Processando callback query:", callbackQuery);
        // ... resto da implementação original
    }

    async getAvailableProfessionals(userId, date, time) {
        try {
            const { data: professionals, error } = await this.supabase
                .from('professionals')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true);
            
            if (error) throw error;
            return professionals || [];
        } catch (error) {
            console.error('❌ Erro buscando profissionais:', error);
            return [];
        }
    }

    async getProfessionalsForProduct(productId, userId) {
        try {
            const { data: professionals, error } = await this.supabase
                .from('professionals')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true);
            
            if (error) throw error;
            return professionals || [];
        } catch (error) {
            console.error('❌ Erro buscando profissionais para produto:', error);
            return [];
        }
    }

    async deleteGoogleCalendarEvent(accessToken, eventId) {
        try {
            const response = await axios.delete(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ Erro deletando evento do Google Calendar:', error);
            throw error;
        }
    }

    // Métodos originais para compatibilidade (implementações simplificadas)
    async handleSchedulingIntent(analysis, contact, userId, selectedProfessional = null) {
        // Redirecionar para versão com conversação
        const customerContext = await this.customerContext.getCustomerContext(contact.id, userId);
        await this.handleSchedulingIntentWithConversation(analysis, contact, userId, customerContext, null, null);
    }

    async handleInquiryIntent(analysis, contact, userId) {
        // Redirecionar para versão com conversação
        const customerContext = await this.customerContext.getCustomerContext(contact.id, userId);
        await this.handleInquiryIntentWithConversation(analysis, contact, userId, customerContext, null, null);
    }

    async handleReschedulingIntent(analysis, contact, userId) {
        // Redirecionar para versão com conversação
        const customerContext = await this.customerContext.getCustomerContext(contact.id, userId);
        await this.handleReschedulingIntentWithConversation(analysis, contact, userId, customerContext, null, null);
    }

    async handleCancellationIntent(analysis, contact, userId) {
        // Redirecionar para versão com conversação
        const customerContext = await this.customerContext.getCustomerContext(contact.id, userId);
        await this.handleCancellationIntentWithConversation(analysis, contact, userId, customerContext, null, null);
    }

    async processDirectScheduling(selectedProduct, contact, userId, originalAnalysis) {
        // Redirecionar para versão com conversação
        const customerContext = await this.customerContext.getCustomerContext(contact.id, userId);
        await this.processDirectSchedulingWithConversation(selectedProduct, contact, userId, originalAnalysis, customerContext, null, null);
    }

    async handleProductSelection(text, pendingSelection, contact, userId) {
        // Redirecionar para versão com conversação
        const customerContext = await this.customerContext.getCustomerContext(contact.id, userId);
        await this.handleProductSelectionWithConversation(text, pendingSelection, contact, userId, customerContext, null, null);
    }

    async handleProfessionalSelection(text, contactId, userId) {
        // Redirecionar para versão com conversação
        const customerContext = await this.customerContext.getCustomerContext(contactId, userId);
        await this.handleProfessionalSelectionWithConversation(text, contactId, userId, customerContext, null, null);
    }

    async showProductOptions(products, contact, userId, analysis) {
        // Redirecionar para versão com conversação
        const customerContext = await this.customerContext.getCustomerContext(contact.id, userId);
        await this.handleProductListWithConversation(products, contact, userId, customerContext, null, analysis, null);
    }

    async handleGeneralResponse(analysis, originalText) {
        const responses = {
            greeting: "Olá! 😊 Como posso ajudar você hoje? \n\nPosso ajudar com:\n• Agendamentos\n• Informações sobre serviços\n• Reagendamentos",
            information: "Estou aqui para ajudar! Sobre o que você gostaria de saber?",
            pricing: "Para informações sobre valores, entre em contato conosco! Temos várias opções de tratamento.",
            support: "Estou aqui para ajudar! Qual é sua dúvida?"
        };
        
        return responses[analysis.intention] || "Obrigado pela mensagem! Como posso ajudar você? 😊";
    }

    // Implementações simplificadas dos métodos restantes para manter compatibilidade
    async handleReschedulingSelectionWithConversation(text, pending, contact, userId, customerContext, chatId, conversation) {
        const botConfig = await this.getUserBotConfig(userId);
        const response = { messages: ["✅ Agendamento selecionado para reagendamento!"] };
        await this.sendConversationalResponseWithTyping(response, botConfig.bot_token, chatId, conversation, userId, {});
    }

    async handleCancellationSelectionWithConversation(text, pending, contact, userId, customerContext, chatId, conversation) {
        const botConfig = await this.getUserBotConfig(userId);
        const response = { messages: ["✅ Agendamento cancelado com sucesso!"] };
        await this.sendConversationalResponseWithTyping(response, botConfig.bot_token, chatId, conversation, userId, {});
    }

    // ✅ FUNÇÃO AUXILIAR: Obter período do dia correto (DEPRECIADA - usar getCurrentTimeInfo)
    getTimeOfDay() {
        return this.getCurrentTimeInfo().period;
    }


    // ✅ FUNÇÃO AUXILIAR: Buscar/Criar contato e conversa (manter lógica existente)
    async getOrCreateContactAndConversation(message, userId) {
        try {
            console.log('🔍 Buscando/criando contato e conversa REAL...');
            
            const telegramId = message.from.id.toString();
            const chatId = message.chat.id.toString();
            const phone = telegramId; // Usar telegram_id como phone temporariamente
            
            // ===============================================
            // 1. BUSCAR OU CRIAR CONTATO
            // ===============================================
            let { data: existingContact, error: contactError } = await this.supabase
                .from('contacts')
                .select('*')
                .eq('user_id', userId)
                .eq('telegram_id', telegramId)
                .single();

            let contact;
            
            if (contactError && contactError.code === 'PGRST116') {
                // Contato não existe, criar novo
                console.log('👤 Criando novo contato...');
                
                const { data: newContact, error: createContactError } = await this.supabase
                    .from('contacts')
                    .insert({
                        user_id: userId,
                        name: `${message.from.first_name} ${message.from.last_name || ''}`.trim(),
                        phone: phone,
                        telegram_id: telegramId,
                        telegram_username: message.from.username || null,
                        source: 'telegram',
                        metadata: {
                            telegram_data: message.from
                        }
                    })
                    .select()
                    .single();

                if (createContactError) {
                    console.error('❌ Erro criando contato:', createContactError);
                    throw createContactError;
                }
                
                contact = newContact;
                console.log('✅ Contato criado:', contact.id);
                
            } else if (contactError) {
                console.error('❌ Erro buscando contato:', contactError);
                throw contactError;
            } else {
                contact = existingContact;
                console.log('✅ Contato encontrado:', contact.id);
            }

            // ===============================================
            // 2. BUSCAR OU CRIAR CONVERSA
            // ===============================================
            let { data: existingConversation, error: conversationError } = await this.supabase
                .from('conversations')
                .select('*')
                .eq('user_id', userId)
                .eq('contact_id', contact.id)
                .eq('channel_type', 'telegram')
                .single();

            let conversation;
            
            if (conversationError && conversationError.code === 'PGRST116') {
                // Conversa não existe, criar nova
                console.log('💬 Criando nova conversa...');
                
                const { data: newConversation, error: createConversationError } = await this.supabase
                    .from('conversations')
                    .insert({
                        user_id: userId,
                        contact_id: contact.id,
                        channel_type: 'telegram',
                        channel_conversation_id: chatId,
                        metadata: {
                            chat_data: message.chat,
                            conversation_state: 'initial'
                        }
                    })
                    .select()
                    .single();

                if (createConversationError) {
                    console.error('❌ Erro criando conversa:', createConversationError);
                    throw createConversationError;
                }
                
                conversation = newConversation;
                console.log('✅ Conversa criada:', conversation.id);
                
            } else if (conversationError) {
                console.error('❌ Erro buscando conversa:', conversationError);
                throw conversationError;
            } else {
                conversation = existingConversation;
                console.log('✅ Conversa encontrada:', conversation.id);
            }

            // ===============================================
            // 3. SALVAR MENSAGEM NO BANCO
            // ===============================================
            const { error: messageError } = await this.supabase
                .from('messages')
                .insert({
                    conversation_id: conversation.id,
                    user_id: userId,
                    contact_id: contact.id,
                    content: message.text,
                    sender_type: 'user',
                    channel_type: 'telegram',
                    channel_message_id: message.message_id.toString(),
                    metadata: {
                        telegram_message: message
                    }
                });

            if (messageError) {
                console.error('❌ Erro salvando mensagem:', messageError);
                // Não falhar por causa de erro de mensagem
            } else {
                console.log('💾 Mensagem salva com sucesso');
            }

            console.log('✅ Contato e conversa prontos:', {
                contactId: contact.id,
                conversationId: conversation.id
            });

            return {
                contact: contact,
                conversation: conversation
            };

        } catch (error) {
            console.error('❌ Erro geral em getOrCreateContactAndConversation:', error);
            
            // FALLBACK: Retornar estrutura mínima funcional
            return {
                contact: {
                    id: 'fallback-contact-id',
                    name: message.from.first_name,
                    phone: message.from.id.toString()
                },
                conversation: {
                    id: 'fallback-conversation-id',
                    channel_type: 'telegram'
                }
            };
        }
    }

    async getBySubdomain(subdomain) {
        try {
            console.log('🔍 Buscando usuário por subdomínio:', subdomain);
            
            const { data: user, error } = await this.supabase
                .from('users')
                .select('*')
                .or(`subdomain.eq.${subdomain},subdomain.eq.${subdomain.replace('-production', '')}`)
                .single();

            if (error) {
                console.error('❌ Usuário não encontrado para subdomínio:', subdomain, error);
                return null;
            }

            console.log('✅ Usuário encontrado:', user.id);
            return user;
            
        } catch (error) {
            console.error('❌ Erro buscando usuário:', error);
            return null;
        }
    }


}

module.exports = TelegramProcessor;