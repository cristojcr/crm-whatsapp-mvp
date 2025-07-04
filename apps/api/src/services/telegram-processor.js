// src/services/telegram-processor.js
const axios = require('axios');
const supabaseAdmin = require('../config/supabaseAdmin');

class TelegramProcessor {
    constructor() {
        // Configuração dinâmica - busca por usuário
    }

    // Buscar configuração do bot por usuário
    async getUserBotConfig(userId) {
        const { data: channel, error } = await supabaseAdmin
            .from('user_channels')
            .select('channel_config')
            .eq('user_id', userId)
            .eq('channel_type', 'telegram')
            .eq('is_active', true)
            .single();

        if (error) throw new Error('Bot Telegram não configurado para este usuário');
        
        return channel.channel_config;
    }

    // Processar updates do Telegram (agora multi-tenant)
    async processUpdate(update, userId) {
        try {
            if (update.message) {
                return await this.processMessage(update.message, userId);
            } else if (update.callback_query) {
                return await this.processCallbackQuery(update.callback_query, userId);
            }
            return null;
        } catch (error) {
            console.error('Erro processando update Telegram:', error);
            throw error;
        }
    }

    // Processar mensagens (adaptado para multi-tenant)
    async processMessage(message, userId) {
        const { from, text, photo, video, audio, voice, document, chat } = message;
        
        // Buscar configuração do bot do usuário
        const botConfig = await this.getUserBotConfig(userId);
        
        // Buscar ou criar contato
        const contact = await this.findOrCreateContact(from, userId);
        
        // Buscar ou criar conversa
        const conversation = await this.findOrCreateConversation(contact.id, userId, 'telegram');
        
        // 🆕 PROCESSAMENTO COM IA
        if (text && text.trim()) {
            console.log('🧠 Processando mensagem com IA:', text);
            
            // Analisar com IA
            const intentionAnalyzer = require('./intention-analyzer');
            const analysis = await intentionAnalyzer.analyzeWithProfessionalPreference(text, contact.id, userId);
            
            console.log('✅ Análise IA:', analysis);
            
            // Processar baseado na intenção
            let responseText = '';
            if (analysis.intention === 'scheduling') {
                responseText = await this.handleSchedulingIntent(analysis, contact, userId, botConfig);
            } else {
                responseText = await this.handleGeneralResponse(analysis, text);
            }
            
            // 💬 Enviar resposta (COMENTADO PARA TESTE)
            // await this.sendMessage(userId, chat.id, responseText);
            console.log('🧪 TESTE: Resposta que seria enviada:', responseText);
            console.log('🎯 IA FUNCIONANDO! Chat ID que receberia:', chat.id);
            
            // Salvar resposta da IA
            await this.saveMessage({
                conversation_id: conversation.id,
                content: responseText,
                message_type: 'text',
                sender_type: 'assistant',
                channel_type: 'telegram',
                channel_message_id: `ai_${Date.now()}`,
                metadata: { ai_analysis: analysis }
            });
        }
        
        // Salvar mensagem original
        const savedMessage = await this.saveMessage({
            conversation_id: conversation.id,
            content: text || '[Mídia]',
            message_type: text ? 'text' : 'media',
            sender_type: 'contact',
            channel_type: 'telegram',
            channel_message_id: message.message_id?.toString() || `telegram_${Date.now()}`,
            metadata: { telegram_data: message }
        });

        return savedMessage;
    }

    // Buscar ou criar contato (adaptado para multi-tenant)
    async findOrCreateContact(from, userId) {
        console.log('🔥 VERSÃO NOVA DO CÓDIGO - DEBUG from:', JSON.stringify(from));
        
        let { data: contact, error } = await supabaseAdmin
            .from('contacts')
            .select('*')
            .eq('telegram_id', from.id)
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            const name = from.first_name + (from.last_name ? ` ${from.last_name}` : '');
            
            // SUPER DEFENSIVO - GARANTIR QUE NUNCA SERÁ NULL
            let phone = 'telegram_default'; // VALOR PADRÃO
            
            if (from.username) {
                phone = `@${from.username}`;
            } else if (from.id) {
                phone = `telegram_${from.id}`;
            }
            
            console.log('🔥 PHONE SERÁ:', phone);
            
            const { data: newContact, error: createError } = await supabaseAdmin
                .from('contacts')
                .insert({
                    name: name,
                    phone: phone, // GARANTIDO QUE NÃO É NULL
                    telegram_id: from.id,
                    user_id: userId,
                    status: 'new'
                })
                .select()
                .single();

            if (createError) throw createError;
            contact = newContact;
        } else if (error) {
            throw error;
        }

        return contact;
    }

    // Buscar ou criar conversa (adaptado para multi-tenant)
    async findOrCreateConversation(contactId, userId, channelType) {
        let { data: conversation, error } = await supabaseAdmin
            .from('conversations')
            .select('*')
            .eq('contact_id', contactId)
            .eq('channel_type', channelType)
            .eq('user_id', userId) // Filtrar por usuário
            .single();

        if (error && error.code === 'PGRST116') {
            // Conversa não existe, criar nova
            const { data: newConversation, error: createError } = await supabaseAdmin
                .from('conversations')
                .insert({
                    contact_id: contactId,
                    channel_type: channelType,
                    status: 'active',
                    user_id: userId // Associar ao usuário
                })
                .select()
                .single();

            if (createError) throw createError;
            conversation = newConversation;
        } else if (error) {
            throw error;
        }

        return conversation;
    }

    // Salvar mensagem
    async saveMessage(messageData) {
        const { data: message, error } = await supabaseAdmin
            .from('messages')
            .insert(messageData)
            .select()
            .single();

        if (error) throw error;
        return message;
    }

    // Obter URL do arquivo (usando token do usuário)
    async getFileUrl(fileId, botToken) {
        try {
            const response = await axios.get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
            const filePath = response.data.result.file_path;
            return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
        } catch (error) {
            console.error('Erro obtendo URL do arquivo:', error);
            return null;
        }
    }

    // Enviar mensagem via Telegram (usando config do usuário)
    async sendMessage(userId, chatId, message, options = {}) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            const apiUrl = `https://api.telegram.org/bot${botConfig.bot_token}`;
            
            const payload = {
                chat_id: chatId,
                text: message,
                ...options
            };

            const response = await axios.post(
                `${apiUrl}/sendMessage`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Erro enviando mensagem Telegram:', error);
            throw error;
        }
    }

    // Configurar webhook (usando token do usuário)
    async setWebhook(userId, webhookUrl) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            const apiUrl = `https://api.telegram.org/bot${botConfig.bot_token}`;
            
            const response = await axios.post(
                `${apiUrl}/setWebhook`,
                {
                    url: webhookUrl,
                    allowed_updates: ['message', 'callback_query']
                }
            );

            return response.data;
        } catch (error) {
            console.error('Erro configurando webhook Telegram:', error);
            throw error;
        }
    }

    // Processar callback queries (botões inline)
    async processCallbackQuery(callbackQuery, userId) {
        const { from, data, message } = callbackQuery;
        const botConfig = await this.getUserBotConfig(userId);
        const apiUrl = `https://api.telegram.org/bot${botConfig.bot_token}`;
        
        // Responder ao callback
        await axios.post(`${apiUrl}/answerCallbackQuery`, {
            callback_query_id: callbackQuery.id,
            text: 'Processado!'
        });

        return { processed: true, data };
    }
    // Processar intenção de agendamento com IA + Google Calendar
    async handleSchedulingIntent(analysis, contact, userId, botConfig) {
        try {
            console.log('🗓️ Processando agendamento com IA...');
            
            // Extrair informações da análise
            const { dateTime } = analysis;
            
            if (!dateTime || !dateTime.suggestedDate || !dateTime.suggestedTime) {
                return "Entendi que você quer agendar! 📅\n\nPor favor, me informe:\n• Que dia você prefere?\n• Qual horário seria melhor?\n\nExemplo: 'Quero agendar para amanhã às 14h'";
            }

            // Buscar profissionais da empresa com Google Calendar conectado
            const { data: professionals, error } = await supabaseAdmin
                .from('professionals')
                .select('*')
                .eq('company_id', userId)
                .eq('calendar_connected', true)
                .limit(1);

            if (error || !professionals || professionals.length === 0) {
                return "Ops! Nenhum profissional tem o Google Calendar configurado ainda. 📅\n\nPeça para o administrador conectar o Google Calendar no dashboard.";
            }

            const professional = professionals[0];
            
            // Criar data/hora do evento
            const eventDate = new Date(dateTime.suggestedDate + 'T' + dateTime.suggestedTime + ':00.000Z');
            const eventEnd = new Date(eventDate.getTime() + 60 * 60 * 1000); // +1 hora

            // Dados do evento
            const eventData = {
                title: `Consulta - ${contact.name}`,
                description: `Agendamento feito via Telegram\n\nContato: ${contact.name}\nTelefone: ${contact.phone}`,
                startDateTime: eventDate.toISOString(),
                endDateTime: eventEnd.toISOString(),
                attendeeEmail: contact.email || null
            };

            console.log('📅 Criando evento no Google Calendar...');

            // Chamar API do Calendar para criar evento
            const response = await fetch(`http://localhost:3001/api/calendar/create/${professional.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // ✅ SEM Authorization - chamada interna do sistema
                },
                body: JSON.stringify(eventData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Evento criado com sucesso no Google Calendar!');
                
                // Resposta de sucesso
                const dataFormatada = eventDate.toLocaleDateString('pt-BR');
                const horaFormatada = eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                return `✅ Agendamento confirmado!\n\n📅 Data: ${dataFormatada}\n🕒 Horário: ${horaFormatada}\n👨‍⚕️ Profissional: ${professional.name}\n\nSeu agendamento foi salvo no Google Calendar. Você receberá lembretes automáticos! 🔔`;
                
            } else {
                console.error('❌ Erro ao criar evento:', result);
                return "Ops! Não consegui confirmar seu agendamento no momento. 😔\n\nTente novamente em alguns minutos ou entre em contato diretamente.";
            }

        } catch (error) {
            console.error('❌ Erro no handleSchedulingIntent:', error);
            return "Entendi que você quer agendar! 📅\n\nNo momento estou com dificuldades técnicas. Tente novamente em alguns minutos.";
        }
    }

    // 📅 PROCESSAR AGENDAMENTO
    async processSchedulingRequest(analysis, contact, userId) {
        try {
            // Buscar profissionais disponíveis
            const { data: professionals } = await supabaseAdmin
                .from('professionals')
                .select('*')
                .eq('user_id', userId)
                .eq('calendar_connected', true);
            
            if (!professionals || professionals.length === 0) {
                return "No momento não temos profissionais com agenda disponível. Entre em contato para mais informações.";
            }
            
            // Se preferência específica, tentar encontrar profissional
            if (analysis.professional_preference?.from_message?.hasPreference) {
                const pref = analysis.professional_preference.from_message;
                
                if (pref.type === 'specific_professional') {
                    const prof = professionals.find(p => 
                        p.name.toLowerCase().includes(pref.professionalName.toLowerCase())
                    );
                    if (prof) {
                        return await this.createCalendarEvent(prof, contact, analysis);
                    }
                }
            }
            
            // Usar primeiro profissional disponível
            const selectedProfessional = professionals[0];
            return await this.createCalendarEvent(selectedProfessional, contact, analysis);
            
        } catch (error) {
            console.error('❌ Erro agendamento:', error);
            return "Erro interno. Tente novamente em alguns momentos.";
        }
    }

    // 📅 CRIAR EVENTO NO GOOGLE CALENDAR
    async createCalendarEvent(professional, contact, analysis) {
        try {
            // Buscar Google Calendar API
            const { google } = require('googleapis');
            
            // Configurar OAuth2
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );
            
            oauth2Client.setCredentials({
                access_token: professional.google_access_token,
                refresh_token: professional.google_refresh_token
            });
            
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            
            // Criar evento (horário padrão: amanhã 14h)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(14, 0, 0, 0);
            
            const endTime = new Date(tomorrow);
            endTime.setHours(15, 0, 0, 0);
            
            const event = {
                summary: `Consulta - ${contact.name}`,
                description: `Agendamento via Telegram\nContato: ${contact.name}`,
                start: {
                    dateTime: tomorrow.toISOString(),
                    timeZone: 'America/Sao_Paulo'
                },
                end: {
                    dateTime: endTime.toISOString(),
                    timeZone: 'America/Sao_Paulo'
                },
                attendees: [
                    { email: professional.google_calendar_email }
                ]
            };
            
            const response = await calendar.events.insert({
                calendarId: 'primary',
                resource: event
            });
            
            console.log('✅ Evento criado:', response.data.id);
            
            return `✅ Agendamento confirmado!

    📅 Data: ${tomorrow.toLocaleDateString('pt-BR')}
    🕐 Horário: 14:00
    👨‍⚕️ Profissional: ${professional.name}
    📧 Contato: ${professional.email}

    Você receberá uma confirmação por email. Até lá! 😊`;
            
        } catch (error) {
            console.error('❌ Erro criando evento:', error);
            return "Agendamento processado! Entraremos em contato para confirmar horário. 📞";
        }
    }

    // 🔍 CONSULTAR DISPONIBILIDADE
    async processAvailabilityQuery(professional_preference, userId) {
        try {
            const { data: professionals } = await supabaseAdmin
                .from('professionals')
                .select('name, specialty')
                .eq('user_id', userId)
                .eq('calendar_connected', true);
            
            if (!professionals || professionals.length === 0) {
                return "No momento não temos agenda disponível. Entre em contato para mais informações.";
            }
            
            let response = "📅 Profissionais disponíveis:\n\n";
            professionals.forEach((prof, index) => {
                response += `${index + 1}. ${prof.name}`;
                if (prof.specialty) response += ` - ${prof.specialty}`;
                response += "\n";
            });
            
            response += "\nQual profissional você prefere? Ou posso agendar com o próximo disponível! 😊";
            
            return response;
            
        } catch (error) {
            console.error('❌ Erro consultando disponibilidade:', error);
            return "No momento temos horários disponíveis! Entre em contato para agendar. 📞";
        }
    }

    // ❌ PROCESSAR CANCELAMENTO
    async processCancellationRequest(contact, userId) {
        // Por enquanto, resposta padrão
        return `Entendi que você quer cancelar um agendamento.

    Para cancelar, preciso de mais informações:
    - Data do agendamento
    - Nome do profissional

    Ou entre em contato conosco diretamente! 📞`;
    }

    // 🔄 PROCESSAR REAGENDAMENTO
    async processRescheduleRequest(contact, userId) {
        return `Para reagendar sua consulta, preciso saber:

    - Data atual do agendamento
    - Nova data/horário preferido

    Ou entre em contato para ajudarmos! 📞`;
    }

    // 💬 RESPOSTA GERAL (não é agendamento)
    async handleGeneralResponse(analysis, originalText) {
        const responses = {
            greeting: "Olá! 😊 Como posso ajudar você hoje? \n\nPosso ajudar com:\n• Agendamentos\n• Informações sobre serviços\n• Reagendamentos",
            information: "Estou aqui para ajudar! Sobre o que você gostaria de saber?",
            pricing: "Para informações sobre valores, entre em contato conosco! Temos várias opções de tratamento.",
            support: "Estou aqui para ajudar! Qual é sua dúvida?"
        };
        
        return responses[analysis.intention] || "Obrigado pela mensagem! Como posso ajudar você? 😊";
    }

}

module.exports = TelegramProcessor;