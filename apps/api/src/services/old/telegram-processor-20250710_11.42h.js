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
            const analysis = await intentionAnalyzer.analyzeWithProductsAndProfessionals(text, contact.id, userId);
            
            console.log('✅ Análise IA:', analysis);
            
            // Processar baseado na intenção
            let responseText = '';
            // ✅ ETAPA 1: VERIFICAR SE O USUÁRIO ESTÁ RESPONDENDO A UMA SELEÇÃO DE PRODUTO
            const pendingProductSelection = await this.checkPendingProductSelection(contact.id, userId);
            if (pendingProductSelection && this.isNumericSelection(text)) {
                responseText = await this.handleProductSelection(text, pendingProductSelection, contact, userId);
            
            // ✅ ETAPA 2: VERIFICAR SE O USUÁRIO ESTÁ RESPONDENDO A UMA SELEÇÃO DE PROFISSIONAL
            } else if (await this.isProfessionalSelection(text, contact.id, userId)) {
                responseText = await this.handleProfessionalSelection(text, contact.id, userId);

            // ✅ ETAPA 3: SE NÃO FOR SELEÇÃO, VERIFICAR A INTENÇÃO DA IA
            } else if (analysis.intention === 'scheduling') {
            // ✅ ETAPA 1: VERIFICAR SE O USUÁRIO ESTÁ RESPONDENDO A UMA SELEÇÃO (DE PRODUTO OU PROFISSIONAL)
            // (Vamos adicionar a lógica para seleção de produto em breve)
            if (await this.isProfessionalSelection(text, contact.id, userId)) {
                responseText = await this.handleProfessionalSelection(text, contact.id, userId);

            // ✅ ETAPA 2: SE NÃO FOR SELEÇÃO, VERIFICAR A INTENÇÃO DA IA
            } else if (analysis.intention === 'scheduling') {
                
                // ✅ NOVA LÓGICA: PRIMEIRO, VERIFICAR SE A ANÁLISE RETORNOU PRODUTOS
                if (analysis.products && analysis.products.length > 0) {
                    if (analysis.products.length === 1) {
                        // Encontrou apenas 1 produto, vamos agendar diretamente
                        responseText = await this.processDirectScheduling(analysis.products[0], contact, userId, analysis);
                    } else {
                        // Encontrou múltiplos produtos, vamos mostrar as opções
                        responseText = await this.showProductOptions(analysis.products, contact, userId, analysis);
                    }
                } else {
                    // SE NÃO ENCONTROU PRODUTOS, SEGUE O FLUXO ANTIGO DE PROFISSIONAIS
                    const professionals = await this.getAvailableProfessionals(userId);
                    
                    if (professionals.length === 0) {
                        responseText = "❌ *Ops!* Nenhum profissional está disponível no momento.\n\nTente novamente mais tarde ou entre em contato diretamente.";
                    } else if (professionals.length === 1) {
                        responseText = await this.handleSchedulingIntent(analysis, contact, userId, professionals[0]);
                    } else {
                        responseText = this.formatProfessionalsList(professionals);
                        await this.savePendingAppointment(contact.id, userId, analysis, professionals);
                    }
                }

            } else if (analysis.intention === 'rescheduling') {
                responseText = await this.handleReschedulingIntent(analysis, contact, userId);
            } else if (analysis.intention === 'inquiry') {
                responseText = await this.handleInquiryIntent(analysis, contact, userId);
            } else if (analysis.intention === 'cancellation') {
                responseText = await this.handleCancellationIntent(analysis, contact, userId);
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

        // 📅 EXTRAIR DATA/HORA da análise IA (compatível com ambas estruturas)
        const dateTimeInfo = analysis.extracted_info || analysis.dateTime || {};
        const extractedDate = dateTimeInfo.date || dateTimeInfo.suggestedDate;
        const extractedTime = dateTimeInfo.time || dateTimeInfo.suggestedTime;

        if (!extractedDate && !extractedTime) {
            return "❌ Não consegui identificar a data e hora desejada. Por favor, informe quando gostaria de agendar.";
        }

        console.log('🗓️ Data extraída:', extractedDate);
        console.log('🕐 Hora extraída:', extractedTime);

        // 🕐 PROCESSAR DATA E HORA
        let appointmentDate = new Date();

        // Data sugerida pela IA
        if (extractedDate) {
            appointmentDate = new Date(extractedDate);
        }

        // Hora sugerida pela IA
        if (extractedTime) {
            const [hours, minutes] = extractedTime.split(':');
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

        // 🌐 CHAMAR API DO GOOGLE CALENDAR
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
    // ✅ NOVA FUNÇÃO createCalendarEvent() - CONVERSÃO MANUAL UTC
async createCalendarEvent(professional, contact, analysis) {
    try {
        const { google } = require('googleapis');
        
        // Configurar OAuth2 com credenciais do profissional
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
        
        // Extrair data e hora sugeridas pela IA
        let suggestedDate = analysis.dateTime?.suggestedDate;
        let suggestedTime = analysis.dateTime?.suggestedTime;

        if (!suggestedDate || !suggestedTime) {
            throw new Error('Data ou hora não detectada na análise');
        }
        
        // Montar objeto Date no horário original (fuso horário local - Brasília)
        let appointmentDate = new Date(`${suggestedDate}T${suggestedTime}:00`);

        // Somar 3 horas para converter para UTC (Google Calendar usa UTC)
        let appointmentDateUtc = new Date(appointmentDate.getTime() + 3 * 60 * 60 * 1000);

        // Calcular horário de término (+1 hora após início)
        let appointmentEndUtc = new Date(appointmentDateUtc.getTime() + 60 * 60 * 1000);

        // Preparar evento para o Google Calendar usando horários em UTC (sem timezone, pois já está ajustado)
        const event = {
            summary: `Consulta - ${contact.name}`,
            description: `Agendamento via Telegram\nContato: ${contact.name}\nHorário solicitado (Horário Brasília): ${suggestedTime}`,
            start: {
                dateTime: appointmentDateUtc.toISOString(),
                //timeZone: 'UTC' // Opcional, pois o ISO já está em UTC
            },
            end: {
                dateTime: appointmentEndUtc.toISOString(),
                //timeZone: 'UTC'
            },
            attendees: [
                { email: professional.google_calendar_email }
            ]
        };

        // Inserir evento no calendário
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event
        });

        console.log('✅ Evento criado no Google Calendar:', response.data.id);

        // Mensagem para usuário mostrando o horário original (sem a soma)
        return `✅ Agendamento confirmado!

📅 Data: ${new Date(suggestedDate).toLocaleDateString('pt-BR')}
🕐 Horário: ${suggestedTime} (Horário Brasília)
👨‍⚕️ Profissional: ${professional.name}

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

// 🆕 FUNÇÃO: Consultar agendamentos existentes
async handleInquiryIntent(analysis, contact, userId) {
    try {
        console.log('📋 Consultando agendamentos do cliente...');

        // Buscar agendamentos futuros
        const { data: upcomingAppointments, error } = await supabaseAdmin
            .from('appointments')
            .select(`
                id,
                scheduled_at,
                status,
                title,
                professionals(name, specialty)
            `)
            .eq('contact_id', contact.id)
            .gte('scheduled_at', new Date().toISOString())
            .order('scheduled_at', { ascending: true });

        if (error) {
            console.error('❌ Erro buscando agendamentos:', error);
            return "❌ Erro ao consultar seus agendamentos. Tente novamente.";
        }

        if (!upcomingAppointments || upcomingAppointments.length === 0) {
            return "📅 *Você não tem consultas agendadas no momento.*\n\n💬 Gostaria de agendar uma nova consulta?";
        }

        let responseText = `📅 *Suas próximas consultas:*\n\n`;

        upcomingAppointments.forEach((apt, index) => {
            const date = new Date(apt.scheduled_at);
            const dateStr = date.toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: '2-digit', 
                month: 'long' 
            });
            const timeStr = date.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            const professional = apt.professionals?.name || 'Profissional não especificado';
            const specialty = apt.professionals?.specialty || '';

            responseText += `${index + 1}. **${dateStr}** às **${timeStr}**\n`;
            responseText += `👨‍⚕️ **${professional}**${specialty ? ` - ${specialty}` : ''}\n`;
            responseText += `📋 Status: ${apt.status}\n\n`;
        });

        responseText += `💬 *Precisa remarcar ou cancelar alguma consulta? É só me falar!*`;

        return responseText;

    } catch (error) {
        console.error('❌ Erro na consulta de agendamentos:', error);
        return "❌ Erro ao consultar agendamentos. Tente novamente.";
    }
}

// 🆕 FUNÇÃO: Remarcação automática
// 🆕 FUNÇÃO: Remarcação automática
async handleReschedulingIntent(analysis, contact, userId) {
    try {
        console.log('🔄 Processando remarcação automática...');

        // 1. 🔍 BUSCAR AGENDAMENTOS FUTUROS DO CLIENTE
        const { data: appointments, error: appointmentsError } = await supabaseAdmin
            .from('appointments')
            .select(`
                id,
                scheduled_at,
                status,
                title,
                google_event_id,
                professionals(id, name, specialty, google_calendar_id, google_access_token, google_refresh_token)
            `)
            .eq('contact_id', contact.id)
            .gte('scheduled_at', new Date().toISOString())
            .eq('status', 'confirmed')
            .order('scheduled_at', { ascending: true });

        if (appointmentsError || !appointments || appointments.length === 0) {
            return "📅 *Você não tem consultas confirmadas para remarcar.*\n\n💬 Gostaria de agendar uma nova consulta?";
        }

        // 2. 🎯 IDENTIFICAR QUAL AGENDAMENTO REMARCAR
        let appointmentToReschedule = appointments[0]; // Por padrão, a próxima consulta

        // Se há referência específica na mensagem, tentar identificar
        if (analysis.extracted_info?.appointment_to_modify) {
            // Lógica para identificar agendamento específico baseado na descrição
            // Por enquanto, usar o primeiro (próximo agendamento)
        }

        // 3. 🕐 EXTRAIR NOVA DATA/HORA DA MENSAGEM
        const dateTimeInfo = analysis.extracted_info || {};
        const newDateTime = this.parseNewDateTime(analysis.message || '', dateTimeInfo);

        if (!newDateTime.isValid) {
            // Se não especificou nova data/hora, perguntar
            const currentDate = new Date(appointmentToReschedule.scheduled_at);
            const currentDateStr = currentDate.toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: '2-digit', 
                month: 'long' 
            });
            const currentTimeStr = currentDate.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            const professional = appointmentToReschedule.professionals?.name || 'N/A';

            return `📅 *Você tem consulta marcada para:*\n**${currentDateStr}** às **${currentTimeStr}**\n👨‍⚕️ **${professional}**\n\n💬 *Para quando gostaria de remarcar?*\nEx: "Para segunda às 15h" ou "Para dia 15 às 10h"`;
        }

        // 4. 🗑️ DELETAR EVENTO ANTIGO DO GOOGLE CALENDAR
        const professional = appointmentToReschedule.professionals;
        
        if (professional?.google_access_token && appointmentToReschedule.google_event_id) {
            try {
                await this.deleteGoogleCalendarEvent(
                    professional.google_access_token, 
                    appointmentToReschedule.google_event_id
                );
                console.log('🗑️ Evento antigo deletado do Google Calendar');
            } catch (calendarError) {
                console.error('❌ Erro deletando evento antigo:', calendarError);
                // Continuar mesmo se não conseguir deletar
            }
        }

        // 5. 📅 CRIAR NOVO EVENTO NO GOOGLE CALENDAR
        let newEventId = null;
        if (professional?.google_access_token) {
            try {
                const eventData = {
                    summary: appointmentToReschedule.title || `Consulta - ${contact.name}`,
                    start: {
                        dateTime: newDateTime.iso,
                        timeZone: 'America/Sao_Paulo'
                    },
                    end: {
                        dateTime: new Date(new Date(newDateTime.iso).getTime() + 60 * 60 * 1000).toISOString(),
                        timeZone: 'America/Sao_Paulo'
                    },
                    description: `Consulta remarcada - Cliente: ${contact.name}`
                };

                const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${professional.google_access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(eventData)
                });

                if (response.ok) {
                    const newEvent = await response.json();
                    newEventId = newEvent.id;
                    console.log('📅 Novo evento criado no Google Calendar:', newEventId);
                }
            } catch (calendarError) {
                console.error('❌ Erro criando novo evento:', calendarError);
                // Continuar mesmo se não conseguir criar evento
            }
        }

        // 6. 💾 ATUALIZAR NO BANCO DE DADOS
        const { error: updateError } = await supabaseAdmin
            .from('appointments')
            .update({
                scheduled_at: newDateTime.iso,
                google_event_id: newEventId,
                updated_at: new Date().toISOString()
            })
            .eq('id', appointmentToReschedule.id);

        if (updateError) {
            console.error('❌ Erro atualizando agendamento:', updateError);
            return "❌ Erro ao salvar remarcação. Tente novamente.";
        }

        // 7. ✅ ENVIAR CONFIRMAÇÃO
        const newDateStr = newDateTime.date.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: '2-digit', 
            month: 'long' 
        });
        const newTimeStr = newDateTime.date.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        return `✅ *Consulta remarcada com sucesso!*

👨‍⚕️ *Profissional:* ${professional?.name}
📅 *Nova data:* ${newDateStr}  
🕐 *Novo horário:* ${newTimeStr}

📝 *O evento foi atualizado no Google Calendar.*

💬 *Alguma outra dúvida? Estou aqui para ajudar!*`;

    } catch (error) {
        console.error('❌ Erro na remarcação:', error);
        return "❌ Erro ao remarcar. Tente novamente.";
    }
}

// 🆕 FUNÇÃO: Cancelamento automático
async handleCancellationIntent(analysis, contact, userId) {
    try {
        console.log('❌ Processando cancelamento automático...');

        // 1. 🔍 BUSCAR AGENDAMENTOS FUTUROS DO CLIENTE
        const { data: appointments, error: appointmentsError } = await supabaseAdmin
            .from('appointments')
            .select(`
                id,
                scheduled_at,
                status,
                title,
                google_event_id,
                professionals(id, name, specialty, google_access_token, google_refresh_token)
            `)
            .eq('contact_id', contact.id)
            .gte('scheduled_at', new Date().toISOString())
            .eq('status', 'confirmed')
            .order('scheduled_at', { ascending: true });

        if (appointmentsError || !appointments || appointments.length === 0) {
            return "📅 *Você não tem consultas confirmadas para cancelar.*\n\n💬 Gostaria de agendar uma nova consulta?";
        }

        // 2. 🎯 IDENTIFICAR QUAL AGENDAMENTO CANCELAR (próximo por padrão)
        let appointmentToCancel = appointments[0];

        // 3. 🗑️ DELETAR EVENTO DO GOOGLE CALENDAR
        const professional = appointmentToCancel.professionals;
        
        if (professional?.google_access_token && appointmentToCancel.google_event_id) {
            try {
                await this.deleteGoogleCalendarEvent(
                    professional.google_access_token, 
                    appointmentToCancel.google_event_id
                );
                console.log('🗑️ Evento deletado do Google Calendar');
            } catch (calendarError) {
                console.error('❌ Erro deletando evento:', calendarError);
                // Continuar mesmo se não conseguir deletar
            }
        }

        // 4. 💾 ATUALIZAR STATUS NO BANCO DE DADOS
        const { error: updateError } = await supabaseAdmin
            .from('appointments')
            .update({
                status: 'cancelled',
                updated_at: new Date().toISOString()
            })
            .eq('id', appointmentToCancel.id);

        if (updateError) {
            console.error('❌ Erro atualizando status:', updateError);
            return "❌ Erro ao cancelar. Tente novamente.";
        }

        // 5. ✅ ENVIAR CONFIRMAÇÃO
        const date = new Date(appointmentToCancel.scheduled_at);
        const dateStr = date.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: '2-digit', 
            month: 'long' 
        });
        const timeStr = date.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        return `✅ *Consulta cancelada com sucesso!*

📅 *Consulta cancelada:* ${dateStr} às ${timeStr}
👨‍⚕️ *Profissional:* ${professional?.name}

📝 *O evento foi removido do Google Calendar.*

💬 *Precisa agendar uma nova consulta? É só me falar!*`;

    } catch (error) {
        console.error('❌ Erro no cancelamento:', error);
        return "❌ Erro ao cancelar. Tente novamente.";
    }
}

// 🆕 FUNÇÃO: Deletar evento do Google Calendar
async deleteGoogleCalendarEvent(accessToken, eventId) {
    try {
        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Google Calendar API error: ${response.status}`);
        }

        console.log('🗑️ Evento deletado do Google Calendar:', eventId);
        return true;
    } catch (error) {
        console.error('❌ Erro deletando evento:', error);
        throw error;
    }
}

// 🆕 FUNÇÃO AUXILIAR: Parse de nova data/hora
parseNewDateTime(message, extractedInfo) {
    try {
        // Implementação básica - pode ser expandida
        const timeMatch = message.match(/(\d{1,2}):?(\d{0,2})\s?(h|hs|horas?)?/i);
        const dayMatch = message.match(/(segunda|terça|quarta|quinta|sexta|sábado|domingo|seg|ter|qua|qui|sex|sáb|dom)/i);
        
        if (!timeMatch) {
            return { isValid: false };
        }

        const hour = parseInt(timeMatch[1]);
        const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        
        // Criar data para próxima ocorrência do dia especificado
        let targetDate = new Date();
        
        if (dayMatch) {
            const dayNames = {
                'segunda': 1, 'seg': 1,
                'terça': 2, 'ter': 2,
                'quarta': 3, 'qua': 3,
                'quinta': 4, 'qui': 4,
                'sexta': 5, 'sex': 5,
                'sábado': 6, 'sáb': 6,
                'domingo': 0, 'dom': 0
            };
            
            const targetDay = dayNames[dayMatch[1].toLowerCase()];
            const today = targetDate.getDay();
            const daysUntilTarget = (targetDay - today + 7) % 7 || 7;
            
            targetDate.setDate(targetDate.getDate() + daysUntilTarget);
        } else {
            // Se não especificou dia, assumir próximo dia útil
            targetDate.setDate(targetDate.getDate() + 1);
        }
        
        targetDate.setHours(hour, minute, 0, 0);
        
        return {
            isValid: true,
            date: targetDate,
            iso: targetDate.toISOString()
        };
        
    } catch (error) {
        console.error('❌ Erro parseando data/hora:', error);
        return { isValid: false };
    }
}

async showProductOptions(products, contact, userId, analysis) {
    let message = `✅ *Ótima escolha!* Encontrei ${products.length} serviços relacionados:\n\n`;
    products.forEach((product, index) => {
      message += `*${index + 1}.* ${product.name}\n`;
      if (product.professionals) {
        message += `   👨‍⚕️ Com: ${product.professionals.name}\n`;
      }
      if (product.price) {
        message += `   💰 Valor: R$ ${product.price}\n\n`;
      }
    });
    message += `Digite o *número* do serviço que você deseja agendar (1 a ${products.length}):`;
    
    // (A lógica de salvar o estado pendente virá no próximo passo)
    // ✅ VERSÃO FINAL: Salva o estado da seleção de produto pendente no banco de dados.
    async savePendingProductSelection(contactId, userId, products, analysis) {
        try {
        console.log('💾 Salvando seleção de produto pendente no banco de dados...');
        
        const { error } = await supabaseAdmin
            .from('pending_interactions')
            // Usamos .upsert() para substituir qualquer interação pendente anterior do mesmo tipo para o mesmo usuário/contato.
            .upsert({
            contact_id: contactId,
            user_id: userId,
            type: 'product_selection',
            data: {
                products: products, // A lista de produtos oferecida
                original_analysis: analysis, // A análise original da IA que iniciou o fluxo
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // Expira em 10 minutos
            },
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
            }, { onConflict: 'contact_id, user_id, type' }); // Define a chave de conflito para o upsert

        if (error) {
            throw error; // Lança o erro para ser capturado pelo bloco catch
        }
        
        console.log('✅ Estado de seleção pendente salvo com sucesso.');

        } catch (error) {
        console.error('❌ Erro ao salvar estado de seleção pendente:', error);
        }
    }
    
    return message;
  }

  async processDirectScheduling(product, contact, userId, analysis) {
    const professional = product.professionals;
    // Reutiliza a função de agendamento que já existe, passando o profissional do produto
    return await this.handleSchedulingIntent(analysis, contact, userId, professional);
  }

}

// ======================================================
  // ✅ NOVAS FUNÇÕES PARA DETECÇÃO DE SELEÇÃO DE PRODUTO
  // ======================================================

  /**
   ✅ VERSÃO FINAL: Verifica no DB se existe uma seleção de produto pendente.
   */
  async checkPendingProductSelection(contactId, userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('pending_interactions')
        .select('*')
        .eq('contact_id', contactId)
        .eq('user_id', userId)
        .eq('type', 'product_selection')
        .gt('expires_at', new Date().toISOString()) // Busca apenas interações que não expiraram
        .single(); // Esperamos no máximo uma interação pendente por vez

      if (error && error.code !== 'PGRST116') { // Ignora o erro 'PGRST116' (nenhuma linha encontrada)
        throw error;
      }

      return data; // Retorna os dados da interação pendente ou null se não houver

    } catch (error) {
      console.error('❌ Erro em checkPendingProductSelection:', error);
      return null;
    }
  }

  /**
   * Uma função simples para verificar se o texto é apenas um número.
   */
  isNumericSelection(text) {
    return /^\d+$/.test(text.trim());
  }

  /**
   * Processa a escolha numérica do usuário, agenda e limpa o estado pendente.
   */
  async handleProductSelection(text, pendingSelection, contact, userId) {
    try {
      const selectedIndex = parseInt(text.trim()) - 1;
      const products = pendingSelection.data.products;

      if (selectedIndex < 0 || selectedIndex >= products.length) {
        return `❌ Opção inválida. Por favor, digite um número de 1 a ${products.length}.`;
      }

      const selectedProduct = products[selectedIndex];

      // Limpar a seleção pendente para não ser usada novamente
      // await supabaseAdmin
      //   .from('pending_interactions')
      //   .delete()
      //   .eq('id', pendingSelection.id);

      console.log(`✅ Cliente selecionou o produto: "${selectedProduct.name}"`);

      // Reutiliza a função de agendamento direto com o produto selecionado
      return await this.processDirectScheduling(selectedProduct, contact, userId, pendingSelection.data.original_analysis);
    } catch (error) {
      console.error('❌ Erro ao processar seleção de produto:', error);
      return '❌ Ocorreu um erro ao processar sua seleção. Tente novamente.';
    }
  }

module.exports = TelegramProcessor;