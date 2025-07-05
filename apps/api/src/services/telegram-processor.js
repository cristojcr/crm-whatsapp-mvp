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
                // 🆕 NOVO FLUXO: Buscar profissionais primeiro
                const professionals = await this.getAvailableProfessionals(userId);
                
                if (professionals.length === 0) {
                    responseText = "❌ *Ops!* Nenhum profissional está disponível no momento.\n\nTente novamente mais tarde ou entre em contato diretamente.";
                } else if (professionals.length === 1) {
                    // 🎯 Só 1 profissional: agendar direto
                    responseText = await this.handleSchedulingIntent(analysis, contact, userId, professionals[0]);
                } else {
                    // 🎯 Múltiplos profissionais: perguntar escolha
                    responseText = this.formatProfessionalsList(professionals);
                    
                    // 💾 Salvar estado do agendamento pendente
                    await this.savePendingAppointment(contact.id, userId, analysis, professionals);
                }
            } else if (await this.isProfessionalSelection(text, contact.id, userId)) {
                // 🆕 FASE 3: Usuário está escolhendo profissional
                responseText = await this.handleProfessionalSelection(text, contact.id, userId);
            } else {
                responseText = await this.handleGeneralResponse(analysis, text);
            }
            
            // 💬 Enviar resposta (COMENTADO PARA TESTE)
            // await this.sendMessage(userId, chat.id, responseText);
            // ✅ ENVIAR MENSAGEM REAL
            try {
                const botConfig = await this.getUserBotConfig(userId);
                const apiUrl = `https://api.telegram.org/bot${botConfig.bot_token}/sendMessage`;
                
                await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: message.chat.id,
                        text: responseText,
                        parse_mode: 'HTML'
                    })
                });
    
    console.log('✅ Mensagem enviada via Telegram!');
} catch (error) {
    console.error('❌ Erro enviando mensagem:', error);
}
            
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
    async handleSchedulingIntent(analysis, contact, userId, selectedProfessional) {
        try {
            console.log('🗓️ Processando agendamento com IA...');
            
            // 🎯 Usar profissional selecionado em vez de hardcoded
            const professionalId = selectedProfessional.id;
            
            // ... resto da função igual, mas usar professionalId dinâmico
            
            const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3001'}/api/calendar/create/${professionalId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: `Consulta - ${contact.name || 'Cliente'}`,
                    description: `Agendamento via Telegram IA\n\nCliente: ${contact.name}\nAnálise: ${analysis.reasoning}`,
                    startDateTime: `${analysis.dateTime.suggestedDate}T${analysis.dateTime.suggestedTime}:00`,
                    endDateTime: `${analysis.dateTime.suggestedDate}T${this.addHour(analysis.dateTime.suggestedTime)}:00`,
                    attendees: []
                })
            });

            if (response.ok) {
                const eventData = await response.json();
                console.log(`✅ Evento criado com sucesso: ${eventData.event.id}`);
                
                return `✅ *Agendamento confirmado!*\n\n📅 *Data:* ${this.formatDate(analysis.dateTime.suggestedDate)}\n🕒 *Horário:* ${analysis.dateTime.suggestedTime}\n👨‍⚕️ *Profissional:* ${selectedProfessional.name}\n\nSeu agendamento foi salvo no Google Calendar. Você receberá lembretes automáticos! 🔔`;
            } else {
                throw new Error('Erro na API do calendar');
            }
            
        } catch (error) {
            console.error('❌ Erro ao criar evento:', error);
            return "❌ *Ops!* Não consegui confirmar seu agendamento no momento. 😔\n\nTente novamente em alguns minutos ou entre em contato diretamente.";
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

    // 🆕 Buscar profissionais com Google Calendar ativo
async getAvailableProfessionals(userId) {
    try {
        const { data: professionals, error } = await supabaseAdmin
            .from('professionals')
            .select(`
                id,
                name,
                specialty,
                calendar_connected,
                google_calendar_id
            `)
            .eq('user_id', userId)
            .eq('calendar_connected', true)
            .eq('is_active', true);

        if (error) {
            console.error('❌ Erro buscando profissionais:', error);
            return [];
        }

        console.log(`✅ Encontrados ${professionals.length} profissionais ativos`);
        return professionals || [];
    } catch (error) {
        console.error('❌ Erro na busca:', error);
        return [];
    }
}

// 🆕 Salvar agendamento pendente para posterior confirmação
async savePendingAppointment(contactId, userId, analysis, professionals) {
    try {
        const pendingData = {
            contact_id: contactId,
            user_id: userId,
            analysis: analysis,
            professionals: professionals,
            status: 'awaiting_professional_selection',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min
        };

        await supabaseAdmin
            .from('pending_appointments')
            .insert(pendingData);

        console.log('✅ Agendamento pendente salvo');
    } catch (error) {
        console.error('❌ Erro salvando agendamento pendente:', error);
    }
}

// 🆕 Verificar se é seleção de profissional
async isProfessionalSelection(text, contactId, userId) {
    try {
        const { data: pending, error } = await supabaseAdmin
            .from('pending_appointments')
            .select('*')
            .eq('contact_id', contactId)
            .eq('user_id', userId)
            .eq('status', 'awaiting_professional_selection')
            .gt('expires_at', new Date().toISOString())
            .single();

        return !error && pending;
    } catch (error) {
        return false;
    }
}

// 🆕 Processar seleção de profissional
async handleProfessionalSelection(text, contactId, userId) {
    try {
        // Buscar agendamento pendente
        const { data: pending, error } = await supabaseAdmin
            .from('pending_appointments')
            .select('*')
            .eq('contact_id', contactId)
            .eq('user_id', userId)
            .eq('status', 'awaiting_professional_selection')
            .single();

        if (error || !pending) {
            return "❌ *Sessão expirada.* Por favor, solicite um novo agendamento.";
        }

        const professionals = pending.professionals;
        let selectedProfessional = null;

        // 🎯 Detectar seleção por número (1, 2, 3...)
        const numberMatch = text.match(/^(\d+)$/);
        if (numberMatch) {
            const index = parseInt(numberMatch[1]) - 1;
            if (index >= 0 && index < professionals.length) {
                selectedProfessional = professionals[index];
            }
        }

        // 🎯 Detectar seleção por nome
        if (!selectedProfessional) {
            const textLower = text.toLowerCase();
            selectedProfessional = professionals.find(prof => 
                prof.name.toLowerCase().includes(textLower) ||
                textLower.includes(prof.name.toLowerCase())
            );
        }

        if (!selectedProfessional) {
            return `❌ *Profissional não encontrado.*\n\n${this.formatProfessionalsList(professionals)}`;
        }

        // 🎯 Processar agendamento com profissional selecionado
        const analysis = pending.analysis;
        const result = await this.handleSchedulingIntent(analysis, { id: contactId }, userId, selectedProfessional);

        // 🧹 Limpar agendamento pendente
        await supabaseAdmin
            .from('pending_appointments')
            .delete()
            .eq('id', pending.id);

        return result;

    } catch (error) {
        console.error('❌ Erro processando seleção:', error);
        return "❌ *Erro interno.* Tente novamente em alguns minutos.";
    }
}



}

module.exports = TelegramProcessor;