// 🎯 OBJETIVO: Processar agendamentos de forma inteligente e natural

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

class IntelligentScheduling {
    constructor() {
        this.supabaseAdmin = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    // 🔍 DETECTAR INTENÇÃO DE AGENDAMENTO COM CONTEXTO
    detectSchedulingIntent(messageText, conversationState, historicalContext) {
        const lowerText = messageText.toLowerCase().trim();
        
        console.log('🔍 Detectando intenção de agendamento...');
        console.log('📝 Mensagem:', lowerText);
        console.log('📊 Estado conversa:', conversationState);

        // Palavras-chave de agendamento
        const schedulingKeywords = [
            'agendar', 'marcar', 'consulta', 'atendimento', 'horário', 'agenda',
            'disponível', 'livre', 'vaga', 'quando posso', 'tem vaga',
            'quero marcar', 'gostaria de agendar', 'preciso marcar'
        ];

        // Palavras-chave de reagendamento
        const reschedulingKeywords = [
            'remarcar', 'reagendar', 'mudar', 'trocar', 'alterar',
            'mudar horário', 'trocar data', 'outro dia', 'outro horário'
        ];

        // Palavras-chave de cancelamento
        const cancellationKeywords = [
            'cancelar', 'desmarcar', 'não vou', 'não posso', 'não vai dar',
            'cancelamento', 'desmarcar consulta'
        ];

        // Detectar tipo de intenção
        let intention = null;
        let confidence = 0;

        if (schedulingKeywords.some(keyword => lowerText.includes(keyword))) {
            intention = 'scheduling';
            confidence = 0.8;
        } else if (reschedulingKeywords.some(keyword => lowerText.includes(keyword))) {
            intention = 'rescheduling';
            confidence = 0.8;
        } else if (cancellationKeywords.some(keyword => lowerText.includes(keyword))) {
            intention = 'cancellation';
            confidence = 0.8;
        }

        // Aumentar confiança se tiver contexto histórico de agendamentos
        if (intention && historicalContext?.upcomingAppointments?.length > 0) {
            confidence = Math.min(confidence + 0.1, 0.95);
        }

        // Detectar informações de data/hora na mensagem
        const dateTimeInfo = this.extractDateTimeInfo(lowerText);

        return {
            intention,
            confidence,
            dateTimeInfo,
            hasExistingAppointments: historicalContext?.upcomingAppointments?.length > 0,
            suggestedAction: this.getSuggestedAction(intention, conversationState, dateTimeInfo)
        };
    }

    // 📅 EXTRAIR INFORMAÇÕES DE DATA/HORA DA MENSAGEM
    extractDateTimeInfo(text) {
        const dateTimeInfo = {
            hasDate: false,
            hasTime: false,
            extractedDate: null,
            extractedTime: null,
            isRelativeDate: false
        };

        // Padrões de data
        const datePatterns = [
            { regex: /(\d{1,2})\/(\d{1,2})/, type: 'dd/mm' },
            { regex: /(amanhã|amanha)/, type: 'tomorrow' },
            { regex: /(hoje)/, type: 'today' },
            { regex: /(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)/, type: 'weekday' },
            { regex: /(próxima|proxima)\s+(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)/, type: 'next_weekday' }
        ];

        // Padrões de hora
        const timePatterns = [
            { regex: /(\d{1,2}):(\d{2})/, type: 'hh:mm' },
            { regex: /(\d{1,2})h(\d{2})?/, type: 'Xh ou XhYY' },
            { regex: /(manhã|manha)/, type: 'morning' },
            { regex: /(tarde)/, type: 'afternoon' },
            { regex: /(noite)/, type: 'evening' },
            { regex: /(\d{1,2})\s*(da\s*)?(manhã|manha|tarde|noite)/, type: 'X da manhã/tarde/noite' }
        ];

        // Verificar padrões de data
        for (const pattern of datePatterns) {
            const match = text.match(pattern.regex);
            if (match) {
                dateTimeInfo.hasDate = true;
                dateTimeInfo.extractedDate = match[0];
                dateTimeInfo.isRelativeDate = ['tomorrow', 'today', 'weekday', 'next_weekday'].includes(pattern.type);
                break;
            }
        }

        // Verificar padrões de hora
        for (const pattern of timePatterns) {
            const match = text.match(pattern.regex);
            if (match) {
                dateTimeInfo.hasTime = true;
                dateTimeInfo.extractedTime = match[0];
                break;
            }
        }

        return dateTimeInfo;
    }

    // 🎯 SUGERIR PRÓXIMA AÇÃO BASEADA NA INTENÇÃO
    getSuggestedAction(intention, conversationState, dateTimeInfo) {
        switch (intention) {
            case 'scheduling':
                if (dateTimeInfo.hasDate && dateTimeInfo.hasTime) {
                    return 'show_professionals_for_datetime';
                } else if (dateTimeInfo.hasDate) {
                    return 'ask_preferred_time';
                } else if (dateTimeInfo.hasTime) {
                    return 'ask_preferred_date';
                } else {
                    return 'show_available_options';
                }

            case 'rescheduling':
                return 'show_current_appointments_and_new_options';

            case 'cancellation':
                return 'show_appointments_to_cancel';

            default:
                return 'clarify_intent';
        }
    }

    // 👨‍⚕️ BUSCAR PROFISSIONAIS DISPONÍVEIS
    async getAvailableProfessionals(userId, serviceId = null) {
        try {
            console.log('👨‍⚕️ Buscando profissionais disponíveis...');
            
            let query = this.supabaseAdmin
                .from('professionals')
                .select('id, name, speciality, is_active')
                .eq('user_id', userId)
                .eq('is_active', true);

            if (serviceId) {
                // Filtrar por serviço específico se fornecido
                query = query.eq('service_id', serviceId);
            }

            const { data: professionals, error } = await query;

            if (error) throw error;

            console.log('✅ Encontrados', professionals?.length || 0, 'profissionais');
            return professionals || [];

        } catch (error) {
            console.error('❌ Erro buscando profissionais:', error);
            return [];
        }
    }

    // 📋 BUSCAR SERVIÇOS DISPONÍVEIS
    async getAvailableServices(userId) {
        try {
            console.log('📋 Buscando serviços disponíveis...');
            
            const { data: services, error } = await this.supabaseAdmin
                .from('services')
                .select('id, name, description, duration, price')
                .eq('user_id', userId)
                .eq('is_active', true);

            if (error) throw error;

            console.log('✅ Encontrados', services?.length || 0, 'serviços');
            return services || [];

        } catch (error) {
            console.error('❌ Erro buscando serviços:', error);
            return [];
        }
    }

    // 🕐 VERIFICAR DISPONIBILIDADE EM DATA/HORA ESPECÍFICA
    async checkAvailability(professionalId, requestedDateTime, duration = 60) {
        try {
            console.log('🕐 Verificando disponibilidade...');
            console.log('👨‍⚕️ Profissional:', professionalId);
            console.log('📅 Data/Hora:', requestedDateTime);

            const startTime = new Date(requestedDateTime);
            const endTime = new Date(startTime.getTime() + duration * 60000);

            // Buscar conflitos de agendamento
            const { data: conflicts, error } = await this.supabaseAdmin
                .from('appointments')
                .select('id, scheduled_at, status')
                .eq('professional_id', professionalId)
                .in('status', ['confirmed', 'pending'])
                .gte('scheduled_at', startTime.toISOString())
                .lt('scheduled_at', endTime.toISOString());

            if (error) throw error;

            const isAvailable = !conflicts || conflicts.length === 0;
            
            console.log('📊 Disponibilidade:', isAvailable ? 'LIVRE' : 'OCUPADO');
            
            return {
                available: isAvailable,
                conflicts: conflicts || [],
                suggestedTimes: isAvailable ? [] : await this.suggestAlternativeTimes(professionalId, requestedDateTime)
            };

        } catch (error) {
            console.error('❌ Erro verificando disponibilidade:', error);
            return { available: false, conflicts: [], suggestedTimes: [] };
        }
    }

    // 🔄 SUGERIR HORÁRIOS ALTERNATIVOS
    async suggestAlternativeTimes(professionalId, requestedDateTime, limitSuggestions = 3) {
        try {
            console.log('🔄 Sugerindo horários alternativos...');
            
            const requestedDate = new Date(requestedDateTime);
            const suggestions = [];
            
            // Tentar próximas 2 horas no mesmo dia
            for (let i = 1; i <= 4; i++) {
                const alternativeTime = new Date(requestedDate.getTime() + (i * 30 * 60000)); // +30 min cada
                const availability = await this.checkAvailability(professionalId, alternativeTime, 60);
                
                if (availability.available) {
                    suggestions.push({
                        datetime: alternativeTime,
                        formatted: alternativeTime.toLocaleString('pt-BR')
                    });
                    
                    if (suggestions.length >= limitSuggestions) break;
                }
            }

            // Se não encontrou no mesmo dia, tentar próximo dia útil
            if (suggestions.length < limitSuggestions) {
                const nextDay = new Date(requestedDate);
                nextDay.setDate(nextDay.getDate() + 1);
                nextDay.setHours(9, 0, 0, 0); // 9h da manhã

                for (let i = 0; i < 8; i++) { // Tentar 8 horários (9h-17h)
                    const alternativeTime = new Date(nextDay.getTime() + (i * 60 * 60000)); // +1h cada
                    const availability = await this.checkAvailability(professionalId, alternativeTime, 60);
                    
                    if (availability.available) {
                        suggestions.push({
                            datetime: alternativeTime,
                            formatted: alternativeTime.toLocaleString('pt-BR')
                        });
                        
                        if (suggestions.length >= limitSuggestions) break;
                    }
                }
            }

            console.log('✅ Sugestões encontradas:', suggestions.length);
            return suggestions;

        } catch (error) {
            console.error('❌ Erro sugerindo alternativas:', error);
            return [];
        }
    }

    // 📅 CRIAR AGENDAMENTO NO SISTEMA
    async createAppointment(appointmentData) {
        try {
            console.log('📅 Criando agendamento...');
            console.log('📋 Dados:', appointmentData);

            const { data: appointment, error } = await this.supabaseAdmin
                .from('appointments')
                .insert([{
                    contact_id: appointmentData.contactId,
                    professional_id: appointmentData.professionalId,
                    service_id: appointmentData.serviceId,
                    scheduled_at: appointmentData.scheduledAt,
                    status: 'confirmed',
                    source: 'telegram',
                    created_at: new Date().toISOString(),
                    metadata: appointmentData.metadata || {}
                }])
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Agendamento criado com ID:', appointment.id);

            // Tentar criar evento no Google Calendar também
            try {
                await this.createCalendarEvent(appointment, appointmentData);
            } catch (calendarError) {
                console.warn('⚠️ Erro criando evento no calendário:', calendarError.message);
            }

            return {
                success: true,
                appointment,
                calendarEventCreated: true
            };

        } catch (error) {
            console.error('❌ Erro criando agendamento:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 📅 CRIAR EVENTO NO GOOGLE CALENDAR
    async createCalendarEvent(appointment, appointmentData) {
        try {
            console.log('📅 Criando evento no Google Calendar...');

            // Buscar token do profissional
            const { data: professional } = await this.supabaseAdmin
                .from('professionals')
                .select('google_calendar_email, user_id')
                .eq('id', appointment.professional_id)
                .single();

            if (!professional?.google_calendar_email) {
                throw new Error('Profissional não tem Google Calendar configurado');
            }

            // Buscar access token do usuário
            const { data: user } = await this.supabaseAdmin
                .from('users')
                .select('google_access_token')
                .eq('id', professional.user_id)
                .single();

            if (!user?.google_access_token) {
                throw new Error('Token de acesso ao Google não encontrado');
            }

            // Preparar dados do evento
            const startDateTime = new Date(appointment.scheduled_at);
            const endDateTime = new Date(startDateTime.getTime() + 60 * 60000); // +1 hora

            const eventData = {
                summary: `Consulta - ${appointmentData.contactName || 'Cliente'}`,
                description: `Agendamento via Telegram\nContato: ${appointmentData.contactPhone || 'N/A'}`,
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: 'America/Sao_Paulo'
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: 'America/Sao_Paulo'
                }
            };

            // Criar evento no Google Calendar
            const response = await axios.post(
                'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                eventData,
                {
                    headers: {
                        'Authorization': `Bearer ${user.google_access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Evento criado no Google Calendar:', response.data.id);
            return response.data;

        } catch (error) {
            console.error('❌ Erro criando evento no calendário:', error);
            throw error;
        }
    }

    // 🎯 PROCESSAR INTENÇÃO DE AGENDAMENTO COMPLETA
    async processSchedulingIntent(messageText, contactId, userId, conversationState, historicalContext) {
        try {
            console.log('🎯 Processando intenção completa de agendamento...');

            // 1. Detectar intenção específica
            const intentionAnalysis = this.detectSchedulingIntent(messageText, conversationState, historicalContext);
            
            if (!intentionAnalysis.intention) {
                return {
                    success: false,
                    message: 'Não consegui identificar a intenção de agendamento.'
                };
            }

            // 2. Processar baseado na intenção detectada
            switch (intentionAnalysis.intention) {
                case 'scheduling':
                    return await this.handleNewScheduling(intentionAnalysis, contactId, userId, messageText);
                
                case 'rescheduling':
                    return await this.handleRescheduling(intentionAnalysis, contactId, userId, historicalContext);
                
                case 'cancellation':
                    return await this.handleCancellation(contactId, userId, historicalContext);
                
                default:
                    return {
                        success: false,
                        message: 'Tipo de agendamento não reconhecido.'
                    };
            }

        } catch (error) {
            console.error('❌ Erro processando intenção de agendamento:', error);
            return {
                success: false,
                message: 'Erro interno ao processar agendamento.',
                error: error.message
            };
        }
    }

    // 🆕 LIDAR COM NOVO AGENDAMENTO
    async handleNewScheduling(intentionAnalysis, contactId, userId, messageText) {
        try {
            const { dateTimeInfo, suggestedAction } = intentionAnalysis;

            // Buscar profissionais disponíveis
            const professionals = await this.getAvailableProfessionals(userId);
            
            if (professionals.length === 0) {
                return {
                    success: false,
                    message: 'Desculpe, não temos profissionais disponíveis no momento.'
                };
            }

            // Se tem data e hora específicas, verificar disponibilidade
            if (dateTimeInfo.hasDate && dateTimeInfo.hasTime) {
                // Processar data/hora específica
                return await this.processSpecificDateTime(dateTimeInfo, professionals, contactId, userId);
            }

            // Se não tem informações específicas, mostrar opções
            return this.showProfessionalOptions(professionals, dateTimeInfo);

        } catch (error) {
            console.error('❌ Erro lidando com novo agendamento:', error);
            return {
                success: false,
                message: 'Erro ao processar novo agendamento.'
            };
        }
    }

    // 👨‍⚕️ MOSTRAR OPÇÕES DE PROFISSIONAIS
    showProfessionalOptions(professionals, dateTimeInfo = null) {
        let message = '👨‍⚕️ Temos os seguintes profissionais disponíveis:\n\n';
        
        professionals.forEach((prof, index) => {
            message += `${index + 1}. *${prof.name}*`;
            if (prof.speciality) {
                message += ` - ${prof.speciality}`;
            }
            message += '\n';
        });

        message += '\n💬 Digite o número do profissional que você prefere ou me diga suas preferências!';

        if (dateTimeInfo?.hasDate || dateTimeInfo?.hasTime) {
            message += `\n\n📅 Detectei que você mencionou: ${dateTimeInfo.extractedDate || ''} ${dateTimeInfo.extractedTime || ''}`;
        }

        return {
            success: true,
            message,
            needsUserSelection: true,
            selectionType: 'professional',
            options: professionals
        };
    }
}

module.exports = IntelligentScheduling;