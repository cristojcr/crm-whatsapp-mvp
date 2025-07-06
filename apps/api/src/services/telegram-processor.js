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
async handleSchedulingIntent(analysis, contact, userId, selectedProfessional = null) {
    try {
        console.log('🗓️ Iniciando agendamento escalável...');
        console.log('👤 Profissional selecionado:', selectedProfessional?.name || 'Automático');
        
        if (!selectedProfessional || !selectedProfessional.id) {
            return "❌ *Ops!* Erro na seleção do profissional. Tente novamente.";
        }

        // 🔍 BUSCAR DADOS DO GOOGLE CALENDAR DO PROFISSIONAL SELECIONADO
        const { data: professionalCalendar, error: calendarError } = await supabaseAdmin
            .from('professionals')
            .select('google_calendar_email, google_calendar_id, google_access_token, google_refresh_token, calendar_connected')
            .eq('id', selectedProfessional.id)
            .single();

        if (calendarError || !professionalCalendar) {
            console.error('❌ Erro buscando dados do profissional:', calendarError);
            return "❌ *Ops!* Erro ao acessar dados do profissional. Tente novamente.";
        }

        // ✅ VERIFICAR SE PROFISSIONAL TEM GOOGLE CALENDAR CONECTADO
        if (!professionalCalendar.calendar_connected || !professionalCalendar.google_calendar_email) {
            console.log('❌ Profissional sem Google Calendar:', professionalCalendar);
            return `❌ *Ops!* O profissional **${selectedProfessional.name}** ainda não conectou o Google Calendar.

📞 *Entre em contato diretamente para agendar:*
👨‍⚕️ **${selectedProfessional.name}**
${selectedProfessional.specialty ? `🎯 **Especialidade:** ${selectedProfessional.specialty}` : ''}

⚙️ *Administrador: Configure o Google Calendar deste profissional no dashboard.*`;
        }

        console.log('✅ Calendário do profissional encontrado:', professionalCalendar.google_calendar_email);

        // 📅 EXTRAIR DATA/HORA da análise IA
        const { dateTime } = analysis;
        if (!dateTime || (!dateTime.suggestedDate && !dateTime.suggestedTime)) {
            return "❌ Não consegui identificar a data e hora desejada. Por favor, informe quando gostaria de agendar.";
        }

        // 🕐 PROCESSAR DATA E HORA
        let appointmentDate = new Date();
        
        // Data sugerida pela IA
        if (dateTime.suggestedDate) {
            appointmentDate = new Date(dateTime.suggestedDate);
        }
        
        // Hora sugerida pela IA
        if (dateTime.suggestedTime) {
            const [hours, minutes] = dateTime.suggestedTime.split(':');
            appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        // 📝 CRIAR EVENTO NO GOOGLE CALENDAR DO PROFISSIONAL
        const eventTitle = `Consulta - ${contact.name || contact.phone}`;
        const eventDescription = `👤 Paciente: ${contact.name || 'Cliente'}
📞 Telefone: ${contact.phone}

👨‍⚕️ Profissional: ${selectedProfessional.name}
${selectedProfessional.specialty ? `🎯 Especialidade: ${selectedProfessional.specialty}` : ''}

🤖 Agendamento via IA WhatsApp CRM
⏰ Agendado em: ${new Date().toLocaleString('pt-BR')}`;

        // 🌐 CHAMAR API DO GOOGLE CALENDAR
        console.log('📡 Criando evento no Google Calendar...');
        // ✅ SUBSTITUIR por chamada para sua API existente:
        const startDateTime = appointmentDate.toISOString();
        const endDateTime = new Date(appointmentDate.getTime() + 60 * 60 * 1000).toISOString(); // +1 hora

        const response = await fetch(`http://localhost:3001/api/calendar/create/${selectedProfessional.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // ✅ SEM Authorization - chamada interna
            },
            body: JSON.stringify({
                title: eventTitle,
                description: eventDescription,
                startDateTime: startDateTime,
                endDateTime: endDateTime,
                attendees: []
            })
        });

        const eventResult = await response.json();


        if (!eventResult.success) {
            console.error('❌ Erro criando evento:', eventResult.error);
            return "❌ *Ops!* Não consegui confirmar seu agendamento no momento. 😔\n\nTente novamente em alguns minutos ou entre em contato diretamente.";
        }

        console.log('✅ Evento criado com sucesso:', eventResult.eventId);

        // 💾 SALVAR AGENDAMENTO NO BANCO
        const { error: appointmentError } = await supabaseAdmin
            .from('appointments')
            .insert({
                user_id: userId,
                contact_id: contact.id,
                professional_id: selectedProfessional.id,
                scheduled_at: appointmentDate.toISOString(),
                status: 'confirmed',
                google_event_id: eventResult.eventId,
                title: eventTitle,
                description: eventDescription,
                created_via: 'telegram_ai',
                created_at: new Date().toISOString()
            });

        if (appointmentError) {
            console.error('❌ Erro salvando agendamento:', appointmentError);
        } else {
            console.log('✅ Agendamento salvo no banco');
        }

        // 🎉 MENSAGEM DE SUCESSO
        const successMessage = `✅ *Agendamento confirmado!*

👨‍⚕️ *Profissional:* ${selectedProfessional.name}
${selectedProfessional.specialty ? `🎯 *Especialidade:* ${selectedProfessional.specialty}` : ''}
📅 *Data:* ${appointmentDate.toLocaleDateString('pt-BR')}
🕐 *Horário:* ${appointmentDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}

📱 *Você receberá lembretes automáticos.*
📝 *O evento foi adicionado ao calendário do profissional.*

Em caso de dúvidas, entre em contato! 😊`;

        return successMessage;

    } catch (error) {
        console.error('❌ Erro no agendamento escalável:', error);
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
        
        // 🔧 USAR HORÁRIO REAL DA IA (não hardcoded)
        const suggestedDate = analysis.dateTime?.suggestedDate;
        const suggestedTime = analysis.dateTime?.suggestedTime;
        
        if (!suggestedDate || !suggestedTime) {
            throw new Error('Data/hora não detectada na mensagem');
        }
        
        // 🔧 CRIAR DATETIME CORRETO (sem .toISOString())
        const eventDateTime = `${suggestedDate}T${suggestedTime}:00-03:00`;
        
        // Calcular fim (1 hora depois)
        const startDate = new Date(`${suggestedDate}T${suggestedTime}:00`);
        const endDate = new Date(startDate.getTime() + (60 * 60 * 1000));
        const endDateTime = `${suggestedDate}T${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`;
        
        console.log('📅 Agendando para:', eventDateTime, 'até', endDateTime);
        
        // ✅ CORRIGIDO (com logs e timezone):
        // 🔧 USAR HORÁRIO REAL DA IA
        const suggestedDate = analysis.dateTime?.suggestedDate;
        const suggestedTime = analysis.dateTime?.suggestedTime;

        console.log('🕐 Timezone do servidor:', new Date().toISOString());
        console.log('📊 Data/hora da IA:', suggestedDate, suggestedTime);

        if (!suggestedDate || !suggestedTime) {
            throw new Error('Data/hora não detectada na mensagem');
        }

        // 🔧 CRIAR DATETIME COM TIMEZONE BRASÍLIA
        const eventDateTime = `${suggestedDate}T${suggestedTime}:00-03:00`;

        // Calcular fim (1 hora depois)  
        const startDate = new Date(`${suggestedDate}T${suggestedTime}:00-03:00`);
        const endDate = new Date(startDate.getTime() + (60 * 60 * 1000));
        const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
        const endDateTime = `${suggestedDate}T${endTime}:00-03:00`;

        console.log('📅 Agendando para:', eventDateTime, 'até', endDateTime);

        const event = {
            summary: `Consulta - ${contact.name}`,
            description: `Agendamento via Telegram\nContato: ${contact.name}`,
            start: {
                dateTime: eventDateTime,  // ✅ COM -03:00
                timeZone: 'America/Sao_Paulo'
            },
            end: {
                dateTime: endDateTime,    // ✅ COM -03:00
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

📅 Data: ${new Date(suggestedDate).toLocaleDateString('pt-BR')}
🕐 Horário: ${suggestedTime}
👨‍⚕️ Profissional: ${professional.name}
📧 Contato: ${professional.email}

Você receberá uma confirmação por email. Até lá! 😊`;
        
    } catch (error) {
        console.error('❌ Erro criando evento:', error);
        return "Agendamento processado! Entraremos em contato para confirmar horário.";
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
            console.log('🔍 DEBUG: Buscando profissionais para company_id:', userId);
            
            const { data: professionals, error } = await supabaseAdmin
                .from('professionals')
                .select(`
                    id,
                    name,
                    specialty,
                    calendar_connected,
                    google_calendar_id,
                    is_active,
                    company_id
                `)
                .eq('company_id', userId)  // ✅ MUDANÇA: company_id em vez de user_id
                .eq('calendar_connected', true)
                .eq('is_active', true);

            console.log('🔍 DEBUG: Query result:', { professionals, error });
            console.log(`✅ Encontrados ${professionals?.length || 0} profissionais ativos`);

            if (error) {
                console.error('❌ Erro buscando profissionais:', error);
                return [];
            }

            return professionals || [];
        } catch (error) {
            console.error('❌ Erro na busca:', error);
            return [];
        }
    }

// 🆕 2. Salvar agendamento pendente
async savePendingAppointment(contactId, userId, analysis, professionals) {
    try {
        console.log('💾 Salvando agendamento pendente...');
        
        const { error } = await supabaseAdmin
            .from('pending_appointments')
            .insert({
                contact_id: contactId,
                user_id: userId,
                message_content: analysis.originalMessage || '',
                analysis: JSON.stringify(analysis), // ← 🆕 CAMPO FALTANDO!
                professionals: JSON.stringify(professionals),
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('❌ Erro salvando agendamento pendente:', error);
        } else {
            console.log('✅ Agendamento pendente salvo com sucesso!');
        }
    } catch (error) {
        console.error('❌ Erro salvando pendente:', error);
    }
}

// 🆕 3. Verificar se usuário está escolhendo profissional
async isProfessionalSelection(text, contactId, userId) {
    try {
        console.log('🔍 DEBUG isProfessionalSelection:');
        console.log('  Text:', text);
        console.log('  ContactId:', contactId);
        console.log('  UserId:', userId);
        
        // Verificar se existe agendamento pendente
        const { data: pending, error } = await supabaseAdmin
            .from('pending_appointments')
            .select('*')
            .eq('contact_id', contactId)
            .eq('user_id', userId)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        console.log('📊 Busca pending_appointments:');
        console.log('  Data:', pending);
        console.log('  Error:', error);

        if (error || !pending) {
            console.log('❌ Nenhum agendamento pendente encontrado');
            return false;
        }

        console.log('✅ Agendamento pendente encontrado!');

        // Verificar se texto parece ser seleção (número ou nome)
        const cleanText = text.trim().toLowerCase();
        console.log('🧹 Texto limpo:', cleanText);
        
        const isNumber = /^[1-9]$/.test(cleanText);
        console.log('🔢 É número?', isNumber);
        
        const professionals = JSON.parse(pending.professionals);
        console.log('👥 Profissionais disponíveis:', professionals.length);
        
        const isName = professionals.some(prof => 
            prof.name.toLowerCase().includes(cleanText) || 
            cleanText.includes(prof.name.toLowerCase())
        );
        console.log('📝 É nome?', isName);

        const result = isNumber || isName;
        console.log('🎯 Resultado final isProfessionalSelection:', result);
        
        return result;
    } catch (error) {
        console.error('❌ Erro verificando seleção:', error);
        return false;
    }
}

// 🆕 4. Processar seleção do profissional
async handleProfessionalSelection(text, contactId, userId) {
    try {
        // Buscar agendamento pendente
        const { data: pending, error } = await supabaseAdmin
            .from('pending_appointments')
            .select('*')
            .eq('contact_id', contactId)
            .eq('user_id', userId)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !pending) {
            return "❌ Não encontrei nenhum agendamento pendente. Por favor, solicite novamente.";
        }

        const professionals = JSON.parse(pending.professionals);
        const cleanText = text.trim().toLowerCase();
        let selectedProfessional = null;

        // Tentar encontrar por número
        if (/^[1-9]$/.test(cleanText)) {
            const index = parseInt(cleanText) - 1;
            if (index >= 0 && index < professionals.length) {
                selectedProfessional = professionals[index];
            }
        }

        // Se não encontrou por número, tentar por nome
        if (!selectedProfessional) {
            selectedProfessional = professionals.find(prof => 
                prof.name.toLowerCase().includes(cleanText) || 
                cleanText.includes(prof.name.toLowerCase())
            );
        }

        if (!selectedProfessional) {
            return `❌ Não consegui identificar o profissional "${text}". Por favor, responda com o número (1, 2, 3...) ou nome completo.`;
        }

        // 🆕 USAR A ANÁLISE ORIGINAL DO BANCO, NÃO A ATUAL!
        const originalAnalysis = JSON.parse(pending.analysis);
        
        console.log('🗓️ Processando agendamento com IA...');
        console.log('📊 Análise original:', originalAnalysis);
        console.log('👤 Profissional selecionado:', selectedProfessional.name);

        const contact = await this.getContactById(contactId);
        const appointmentResult = await this.handleSchedulingIntent(originalAnalysis, contact, userId, selectedProfessional);

        // 🧹 Limpar agendamento pendente
        await supabaseAdmin
            .from('pending_appointments')
            .delete()
            .eq('contact_id', contactId)
            .eq('user_id', userId);

        return appointmentResult;

    } catch (error) {
        console.error('❌ Erro processando seleção:', error);
        return "❌ Erro processando sua escolha. Tente novamente.";
    }
}

// 🆕 1. Formatar lista de profissionais para o usuário
formatProfessionalsList(professionals) {
    if (!professionals || professionals.length === 0) {
        return "❌ Nenhum profissional disponível no momento.";
    }

    let message = "👨‍⚕️ *Profissionais disponíveis:*\n\n";
    
    professionals.forEach((prof, index) => {
        const number = index + 1;
        const specialty = prof.specialty ? ` - ${prof.specialty}` : '';
        message += `${number}. *${prof.name}*${specialty}\n`;
    });
    
    message += "\n📱 *Responda com o número ou nome do profissional de sua preferência.*";
    
    return message;
}

// 🆕 5. Buscar contato por ID (helper)
async getContactById(contactId) {
    try {
        const { data: contact, error } = await supabaseAdmin
            .from('contacts')
            .select('*')
            .eq('id', contactId)
            .single();

        if (error) throw error;
        return contact;
    } catch (error) {
        console.error('❌ Erro buscando contato:', error);
        throw error;
    }
}



}

module.exports = TelegramProcessor;