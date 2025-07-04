// ===============================================
// APPOINTMENT PROCESSOR: Processamento inteligente de agendamentos
// ===============================================

const scheduleManager = require('./schedule-manager');
const intentionAnalyzer = require('./intention-analyzer');
const { deepseekClient } = require('./ai-config');
const { supabase } = require('../config/supabase');
const moment = require('moment-timezone');
const ProfessionalManager = require('./professional-manager');

// Constantes de intenção
const INTENTIONS = {
    SCHEDULING: 'scheduling',
    RESCHEDULE: 'reschedule', 
    CANCELLATION: 'cancellation',
    AVAILABILITY: 'availability',
    CONFIRMATION: 'confirmation'
};

class AppointmentProcessor {
    
    async processSchedulingMessage(messageData) {
        try {
            console.log('📅 Processando mensagem de agendamento');
            
            const { message, conversation_id, contact_id, user_id } = messageData;
            
            // 1. Analisar intenção específica
           const intentionResult = await intentionAnalyzer.analyzeHybrid(message);
            
            // 2. Buscar serviços disponíveis da empresa
            console.log('🔍 DEBUG: user_id recebido:', user_id);

            const { data: userProfile, error: profileError } = await supabase
                .from('user_profiles')
                .select('company_id')
                .eq('user_id', user_id)
                .single();

            console.log('🔍 DEBUG: userProfile encontrado:', userProfile);
            console.log('🔍 DEBUG: erro na query:', profileError);

            if (!userProfile?.company_id) {
                console.log('🔍 DEBUG: company_id não encontrado no userProfile');
                throw new Error('Usuário não possui empresa associada');
            }

            console.log('🔍 DEBUG: company_id encontrado:', userProfile.company_id);
            

            // Depois buscar serviços da empresa
            console.log('🔍 DEBUG: Buscando serviços com company_id:', userProfile.company_id);

            const { data: services, error: servicesError } = await supabase
                .from('services')
                .select('*')
                .eq('user_id', user_id)
                .eq('is_active', true)
                .order('sort_order');

            console.log('🔍 DEBUG: services encontrados:', services);
            console.log('🔍 DEBUG: erro na query services:', servicesError);
            console.log('🔍 DEBUG: servicesList length:', services?.length || 0);

                console.log('🔍 DEBUG: services encontrados:', services);
                console.log('🔍 DEBUG: servicesList length:', services?.length || 0);
                // Garantir que services é sempre um array
                const servicesList = Array.isArray(services) ? services : [];

            // 3. Detectar serviço mencionado
            const serviceDetection = intentionAnalyzer.detectServiceMention(message, servicesList);
            
            // 4. Extrair informações de data/hora
            const dateTimeInfo = intentionAnalyzer.extractDateTime(message);

            // 5. Processar baseado na intenção
            switch (intentionResult.intention) {
                case INTENTIONS.SCHEDULING:
                    return await this.handleNewAppointment(messageData, serviceDetection, dateTimeInfo, servicesList);
                    
                case INTENTIONS.RESCHEDULE:
                    return await this.handleReschedule(messageData, serviceDetection, dateTimeInfo);
                    
                case INTENTIONS.CANCELLATION:
                    return await this.handleCancellation(messageData);
                    
                case INTENTIONS.AVAILABILITY:
                    return await this.handleAvailabilityQuery(messageData, serviceDetection, dateTimeInfo, servicesList);
                    
                case INTENTIONS.CONFIRMATION:
                    return await this.handleConfirmation(messageData);
                    
                default:
                    return await this.handleGeneralSchedulingQuery(messageData, servicesList);
            }

        } catch (error) {
            console.error('❌ Erro ao processar mensagem de agendamento:', error);
            return {
                success: false,
                response: 'Desculpe, tive um problema para processar sua solicitação. Pode tentar novamente?',
                error: error.message
            };
        }
    }

    // ===============================================
    // NOVO AGENDAMENTO
    // ===============================================
    
    async handleNewAppointment(messageData, serviceDetection, dateTimeInfo, servicesList) {
        try {
            const { message, contact_id, user_id } = messageData;

            // Se não detectou serviço específico, mostrar opções
            if (!serviceDetection && servicesList.length > 1) {
                return await this.showServiceOptions(servicesList);
            }

            // Usar primeiro serviço se só tem um
            const targetService = serviceDetection?.service || servicesList[0];
            
            if (!targetService) {
                return {
                    success: false,
                    response: 'Desculpe, não encontrei serviços disponíveis. Entre em contato conosco!'
                };
            }

            // Se não tem data específica, mostrar próximos horários
            if (!dateTimeInfo.relative && !dateTimeInfo.weekdays) {
                return await this.showNextAvailableSlots(user_id, targetService);
            }

            // Processar data específica mencionada
            const targetDate = this.parseTargetDate(dateTimeInfo);
            if (!targetDate) {
                return {
                    success: false,
                    response: 'Não consegui entender a data. Pode especificar melhor? Ex: "amanhã", "segunda-feira", etc.'
                };
            }

            // Buscar horários disponíveis para a data
            const availabilityResult = await scheduleManager.getAvailableSlots(
                user_id, 
                targetService.id, 
                targetDate
            );

            if (!availabilityResult.success || availabilityResult.slots.length === 0) {
                return await this.suggestAlternativeDates(user_id, targetService, targetDate);
            }

            // Mostrar horários disponíveis
            return this.formatAvailableSlots(availabilityResult.slots, targetService, targetDate);

        } catch (error) {
            console.error('❌ Erro ao processar novo agendamento:', error);
            return {
                success: false,
                response: 'Ops, tive um problema para verificar a agenda. Tente novamente!'
            };
        }
    }

    // ===============================================
    // REAGENDAMENTO
    // ===============================================
    
    async handleReschedule(messageData, serviceDetection, dateTimeInfo) {
        try {
            const { contact_id, user_id } = messageData;

            // Buscar agendamentos futuros do cliente
            const { data: appointments } = await supabase
                .from('appointments')
                .select('*')
                .eq('contact_id', contact_id)
                .eq('user_id', user_id)
                .in('status', ['confirmed', 'pending'])
                .gte('scheduled_at', new Date().toISOString())
                .order('scheduled_at', { ascending: true });

            if (!appointments || appointments.length === 0) {
                return {
                    success: false,
                    response: 'Não encontrei agendamentos futuros para reagendar. Gostaria de fazer um novo agendamento?'
                };
            }

            // Se tem apenas um agendamento
            if (appointments.length === 1) {
                const appointment = appointments[0];
                const appointmentDate = moment(appointment.scheduled_at).format('DD/MM/YYYY [às] HH:mm');
                
                return {
                    success: true,
                    response: `Encontrei seu agendamento para ${appointmentDate}. Para qual data gostaria de reagendar?`,
                    action: 'awaiting_reschedule_date',
                    appointment_id: appointment.id
                };
            }

            // Se tem múltiplos agendamentos, mostrar lista
            return this.showAppointmentsList(appointments, 'reschedule');

        } catch (error) {
            console.error('❌ Erro ao processar reagendamento:', error);
            return {
                success: false,
                response: 'Problema ao buscar seus agendamentos. Tente novamente!'
            };
        }
    }

    // ===============================================
    // CANCELAMENTO
    // ===============================================
    
    async handleCancellation(messageData) {
        try {
            const { contact_id, user_id } = messageData;

            // Buscar agendamentos futuros
            const { data: appointments } = await supabase
                .from('appointments')
                .select('*')
                .eq('contact_id', contact_id)
                .eq('user_id', user_id)
                .in('status', ['confirmed', 'pending'])
                .gte('scheduled_at', new Date().toISOString())
                .order('scheduled_at', { ascending: true });

            if (!appointments || appointments.length === 0) {
                return {
                    success: false,
                    response: 'Não encontrei agendamentos futuros para cancelar.'
                };
            }

            // Se tem apenas um agendamento
            if (appointments.length === 1) {
                const appointment = appointments[0];
                const appointmentDate = moment(appointment.scheduled_at).format('DD/MM/YYYY [às] HH:mm');
                
                return {
                    success: true,
                    response: `Confirma o cancelamento do agendamento para ${appointmentDate}? Digite "CONFIRMAR CANCELAMENTO" para confirmar.`,
                    action: 'confirm_cancellation',
                    appointment_id: appointment.id
                };
            }

            // Múltiplos agendamentos
            return this.showAppointmentsList(appointments, 'cancel');

        } catch (error) {
            console.error('❌ Erro ao processar cancelamento:', error);
            return {
                success: false,
                response: 'Problema ao buscar seus agendamentos. Tente novamente!'
            };
        }
    }

    // ===============================================
    // CONSULTA DE DISPONIBILIDADE
    // ===============================================
    
    async handleAvailabilityQuery(messageData, serviceDetection, dateTimeInfo, servicesList) {
        try {
            const { user_id } = messageData;

            // Usar primeiro serviço se não detectou específico
            const targetService = serviceDetection?.service || servicesList[0];
            
            if (!targetService) {
                return {
                    success: false,
                    response: 'Não encontrei serviços disponíveis.'
                };
            }

            // Se mencionou data específica
            if (dateTimeInfo.relative || dateTimeInfo.weekdays) {
                const targetDate = this.parseTargetDate(dateTimeInfo);
                
                if (targetDate) {
                    const availabilityResult = await scheduleManager.getAvailableSlots(
                        user_id, 
                        targetService.id, 
                        targetDate
                    );

                    if (availabilityResult.success && availabilityResult.slots.length > 0) {
                        return this.formatAvailableSlots(availabilityResult.slots, targetService, targetDate);
                    }
                }
            }

            // Mostrar próximos horários disponíveis
            return await this.showNextAvailableSlots(user_id, targetService);

        } catch (error) {
            console.error('❌ Erro ao consultar disponibilidade:', error);
            return {
                success: false,
                response: 'Problema ao consultar horários. Tente novamente!'
            };
        }
    }

    // ===============================================
    // CONFIRMAÇÃO
    // ===============================================
    
    async handleConfirmation(messageData) {
        try {
            // Buscar contexto da conversa para saber o que está sendo confirmado
            const { conversation_id } = messageData;
            
            const { data: recentMessages } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversation_id)
                .order('created_at', { ascending: false })
                .limit(5);

            // Procurar por ações pendentes na conversa
            const pendingAction = this.findPendingAction(recentMessages);
            
            if (pendingAction) {
                return await this.executePendingAction(pendingAction, messageData);
            }

            return {
                success: true,
                response: 'Perfeito! Em que mais posso ajudar?'
            };

        } catch (error) {
            console.error('❌ Erro ao processar confirmação:', error);
            return {
                success: false,
                response: 'Não entendi o que confirmar. Pode ser mais específico?'
            };
        }
    }

    // ===============================================
    // UTILITÁRIOS
    // ===============================================
    
    parseTargetDate(dateTimeInfo) {
        const now = moment().tz('America/Sao_Paulo');
        
        // Palavras relativas
        if (dateTimeInfo.relative) {
            const relative = dateTimeInfo.relative[0].toLowerCase();
            
            switch (relative) {
                case 'hoje':
                    return now.format('YYYY-MM-DD');
                case 'amanhã':
                    return now.add(1, 'day').format('YYYY-MM-DD');
                case 'depois de amanha':
                    return now.add(2, 'days').format('YYYY-MM-DD');
                default:
                    return null;
            }
        }

        // Dias da semana
        if (dateTimeInfo.weekdays) {
            const weekday = dateTimeInfo.weekdays[0].toLowerCase();
            const dayMap = {
                'segunda': 1, 'seg': 1,
                'terça': 2, 'ter': 2,
                'quarta': 3, 'qua': 3,
                'quinta': 4, 'qui': 4,
                'sexta': 5, 'sex': 5,
                'sábado': 6, 'sáb': 6,
                'domingo': 0, 'dom': 0
            };

            const targetDay = dayMap[weekday];
            if (targetDay !== undefined) {
                const target = now.clone().day(targetDay);
                
                // Se o dia já passou esta semana, pegar da próxima
                if (target.isBefore(now, 'day')) {
                    target.add(1, 'week');
                }
                
                return target.format('YYYY-MM-DD');
            }
        }

        return null;
    }

    async showServiceOptions(servicesList) {
        const serviceList = servicesList.map((service, index) => 
            `${index + 1}. ${service.name} (${service.duration_minutes}min)`
        ).join('\n');

        return {
            success: true,
            response: `Temos os seguintes serviços disponíveis:\n\n${serviceList}\n\nQual serviço você gostaria de agendar?`,
            action: 'select_service',
            services: servicesList
        };
    }

    async showNextAvailableSlots(companyId, service, daysAhead = 7) {
        const slots = [];
        const today = moment().tz('America/Sao_Paulo');

        for (let i = 0; i < daysAhead; i++) {
            const date = today.clone().add(i, 'days').format('YYYY-MM-DD');
            
            const availabilityResult = await scheduleManager.getAvailableSlots(
                companyId, 
                service.id, 
                date
            );

            if (availabilityResult.success && availabilityResult.slots.length > 0) {
                slots.push({
                    date: date,
                    displayDate: today.clone().add(i, 'days').format('dddd, DD/MM'),
                    slots: availabilityResult.slots.slice(0, 3) // Mostrar apenas 3 primeiros
                });

                if (slots.length >= 3) break; // Mostrar apenas 3 dias
            }
        }

        if (slots.length === 0) {
            return {
                success: false,
                response: `Desculpe, não tenho horários disponíveis para ${service.name} nos próximos ${daysAhead} dias. Entre em contato para verificar outras datas!`
            };
        }

        let response = `📅 Próximos horários disponíveis para ${service.name}:\n\n`;
        
        slots.forEach(daySlots => {
            response += `*${daySlots.displayDate}*\n`;
            daySlots.slots.forEach(slot => {
                response += `• ${slot.display}\n`;
            });
            response += '\n';
        });

        response += 'Qual horário prefere?';

        return {
            success: true,
            response: response,
            action: 'select_slot',
            available_slots: slots,
            service: service
        };
    }

    formatAvailableSlots(slots, service, date) {
        const displayDate = moment(date).format('dddd, DD/MM/YYYY');
        
        let response = `📅 Horários disponíveis para ${service.name} em ${displayDate}:\n\n`;
        
        slots.forEach((slot, index) => {
            response += `${index + 1}. ${slot.display}\n`;
        });

        response += '\nQual horário prefere?';

        return {
            success: true,
            response: response,
            action: 'select_slot',
            available_slots: [{ date, displayDate, slots }],
            service: service
        };
    }

    showAppointmentsList(appointments, action) {
        let response = `Encontrei os seguintes agendamentos:\n\n`;
        
        appointments.forEach((apt, index) => {
            const date = moment(apt.scheduled_at).format('DD/MM/YYYY [às] HH:mm');
            response += `${index + 1}. ${date}`;
            if (apt.service_id) {
                response += ` - ${apt.title || 'Agendamento'}`;
            }
            response += '\n';
        });

        const actionText = action === 'reschedule' ? 'reagendar' : 'cancelar';
        response += `\nQual agendamento você gostaria de ${actionText}?`;

        return {
            success: true,
            response: response,
            action: `select_appointment_to_${action}`,
            appointments: appointments
        };
    }

    findPendingAction(messages) {
        // Implementar lógica para encontrar ações pendentes
        return null;
    }

    async executePendingAction(action, messageData) {
        // Implementar execução de ações pendentes
        return {
            success: true,
            response: 'Ação executada com sucesso!'
        };
    }

    // ===============================================
    // PROCESSAMENTO MULTI-PROFISSIONAL (PASSO 3.2)
    // ===============================================

    static async processMultiProfessionalScheduling(message, contactData, companyId) {
        try {
            console.log('👥 Processando agendamento multi-profissional');
            
            // Análise com preferências
            const analysis = await intentionAnalyzer.analyzeWithProfessionalPreference(
                message, 
                contactData.id, 
                companyId
            );
            
            if (!analysis.isSchedulingIntent) {
                return {
                    success: false,
                    response: "Não consegui identificar uma solicitação de agendamento. Como posso ajudar?",
                    confidence: analysis.confidence
                };
            }
            
            // Extrair data/hora da mensagem
            const dateTimeInfo = this.extractDateTime(message);
            if (!dateTimeInfo.success) {
                return await this.handleDateTimeQuery(analysis);
            }
            
            // Processar baseado na abordagem sugerida
            const result = await this.executeSchedulingApproach(
                analysis.suggested_approach,
                dateTimeInfo,
                contactData,
                companyId,
                analysis
            );
            
            return result;
            
        } catch (error) {
            console.error('❌ Erro no processamento multi-profissional:', error);
            return {
                success: false,
                response: "Desculpe, houve um erro ao processar seu agendamento. Tente novamente.",
                error: error.message
            };
        }
    }

    static async executeSchedulingApproach(approach, dateTimeInfo, contactData, companyId, analysis) {
        switch (approach.approach) {
            case 'specific_professional':
                return await this.scheduleWithSpecificProfessional(
                    approach.professional_name,
                    dateTimeInfo,
                    contactData,
                    companyId
                );
                
            case 'specialty_based':
                return await this.scheduleWithSpecialist(
                    approach.specialty,
                    dateTimeInfo,
                    contactData,
                    companyId
                );
                
            case 'historical_preference':
                return await this.scheduleWithPreferredProfessional(
                    approach.professional_id,
                    dateTimeInfo,
                    contactData,
                    companyId
                );
                
            case 'availability_based':
            case 'balanced_suggestion':
            default:
                return await this.scheduleWithBestAvailable(
                    dateTimeInfo,
                    contactData,
                    companyId,
                    approach.urgency
                );
        }
    }

    static async scheduleWithSpecificProfessional(professionalName, dateTimeInfo, contactData, companyId) {
        try {
            // Buscar profissional pelo nome
            const { data: professionals } = await supabase
                .from('professionals')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .ilike('name', `%${professionalName}%`);
            
            if (!professionals?.length) {
                return {
                    success: false,
                    response: `Não encontrei nenhum profissional com o nome "${professionalName}". ` +
                            `Posso sugerir outros profissionais disponíveis?`,
                    suggestion_needed: true
                };
            }
            
            const professional = professionals[0];
            
            // Verificar disponibilidade
            const ScheduleManager = require('./schedule-manager');
            const availability = await ScheduleManager.checkProfessionalAvailability(
                professional.id,
                dateTimeInfo.appointmentTime,
                60
            );
            
            if (!availability.success) {
                // Sugerir horários alternativos com este profissional
                const alternatives = await ScheduleManager.suggestAlternativeTimes(
                    companyId,
                    professional.id,
                    dateTimeInfo.appointmentTime,
                    60
                );
                
                if (alternatives.success && alternatives.suggestions.length > 0) {
                    const alternativesList = alternatives.suggestions
                        .slice(0, 3)
                        .map(s => s.formatted_time)
                        .join(', ');
                    
                    return {
                        success: false,
                        response: `${professional.name} não está disponível em ${dateTimeInfo.formattedDateTime}. ` +
                                `Horários disponíveis com ${professional.name}: ${alternativesList}. ` +
                                `Qual prefere?`,
                        alternatives: alternatives.suggestions,
                        professional: professional
                    };
                } else {
                    return {
                        success: false,
                        response: `${professional.name} não está disponível em ${dateTimeInfo.formattedDateTime}. ` +
                                `Posso sugerir outros profissionais disponíveis neste horário?`,
                        suggestion_needed: true
                    };
                }
            }
            
            // Criar agendamento
            const appointmentResult = await this.createAppointmentWithProfessional(
                professional,
                dateTimeInfo,
                contactData,
                companyId,
                'Cliente solicitou especificamente'
            );
            
            return appointmentResult;
            
        } catch (error) {
            console.error('❌ Erro ao agendar com profissional específico:', error);
            return {
                success: false,
                response: "Erro ao processar agendamento com profissional específico."
            };
        }
    }

    static async scheduleWithSpecialist(specialty, dateTimeInfo, contactData, companyId) {
        try {
            // Buscar especialistas
            const { data: specialists } = await supabase
                .from('professionals')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .ilike('specialty', `%${specialty}%`)
                .order('display_order');
            
            if (!specialists?.length) {
                return {
                    success: false,
                    response: `Não temos especialistas em ${specialty} no momento. ` +
                            `Posso agendar com um clínico geral?`,
                    suggestion_needed: true
                };
            }
            
            // Verificar disponibilidade dos especialistas
            const ScheduleManager = require('./schedule-manager');
            for (const specialist of specialists) {
                const availability = await ScheduleManager.checkProfessionalAvailability(
                    specialist.id,
                    dateTimeInfo.appointmentTime,
                    60
                );
                
                if (availability.success) {
                    const appointmentResult = await this.createAppointmentWithProfessional(
                        specialist,
                        dateTimeInfo,
                        contactData,
                        companyId,
                        `Especialista em ${specialty}`
                    );
                    
                    return appointmentResult;
                }
            }
            
            // Nenhum especialista disponível - sugerir alternativas
            const alternatives = await ScheduleManager.suggestAlternativeTimes(
                companyId,
                specialists[0].id,
                dateTimeInfo.appointmentTime,
                60
            );
            
            if (alternatives.success && alternatives.suggestions.length > 0) {
                const nextAvailable = alternatives.suggestions[0];
                return {
                    success: false,
                    response: `Nossos especialistas em ${specialty} não estão disponíveis em ${dateTimeInfo.formattedDateTime}. ` +
                            `O próximo horário disponível com ${nextAvailable.professional.name} é ${nextAvailable.formatted_time}. ` +
                            `Confirma?`,
                    suggested_appointment: nextAvailable
                };
            }
            
            return {
                success: false,
                response: `Especialistas em ${specialty} não disponíveis hoje. ` +
                        `Posso sugerir outros profissionais ou outros dias?`,
                suggestion_needed: true
            };
            
        } catch (error) {
            console.error('❌ Erro ao agendar com especialista:', error);
            return {
                success: false,
                response: "Erro ao buscar especialista."
            };
        }
    }

    static async scheduleWithBestAvailable(dateTimeInfo, contactData, companyId, urgency = 'normal') {
        try {
            // Sugerir melhor profissional
            const suggestion = await ProfessionalManager.suggestBestProfessional(
                companyId,
                contactData.id,
                dateTimeInfo.appointmentTime
            );
            
            if (!suggestion.success) {
                return {
                    success: false,
                    response: "Não consegui encontrar profissionais disponíveis. Tente outro horário."
                };
            }
            
            const professional = suggestion.professional;
            
            // Verificar disponibilidade
            const ScheduleManager = require('./schedule-manager');
            const availability = await ScheduleManager.checkProfessionalAvailability(
                professional.id,
                dateTimeInfo.appointmentTime,
                60
            );
            
            if (availability.success) {
                const appointmentResult = await this.createAppointmentWithProfessional(
                    professional,
                    dateTimeInfo,
                    contactData,
                    companyId,
                    suggestion.reason
                );
                
                return appointmentResult;
            } else {
                // Sugerir próximos horários disponíveis
                const alternatives = await ScheduleManager.suggestAlternativeTimes(
                    companyId,
                    null, // Qualquer profissional
                    dateTimeInfo.appointmentTime,
                    60
                );
                
                if (alternatives.success && alternatives.suggestions.length > 0) {
                    const topSuggestions = alternatives.suggestions
                        .slice(0, 3)
                        .map(s => `${s.formatted_time} com ${s.professional.name}`)
                        .join('\n');
                    
                    return {
                        success: false,
                        response: `${dateTimeInfo.formattedDateTime} não está disponível. ` +
                                `Próximos horários:\n${topSuggestions}\n\nQual prefere?`,
                        alternatives: alternatives.suggestions
                    };
                }
                
                return {
                    success: false,
                    response: "Não temos horários disponíveis próximos. Posso verificar outros dias?"
                };
            }
            
        } catch (error) {
            console.error('❌ Erro ao agendar com melhor disponível:', error);
            return {
                success: false,
                response: "Erro ao buscar horários disponíveis."
            };
        }
    }

    static async createAppointmentWithProfessional(professional, dateTimeInfo, contactData, companyId, reason) {
        try {
            // Criar agendamento
            const { data: appointment, error } = await supabase
                .from('appointments')
                .insert({
                    contact_id: contactData.id,
                    professional_id: professional.id,
                    scheduled_at: dateTimeInfo.appointmentTime,
                    duration_minutes: 60,
                    status: 'CONFIRMED',
                    auto_assigned_reason: reason,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            
            // Criar evento no Google Calendar
            if (professional.google_calendar_email) {
                const ScheduleManager = require('./schedule-manager');
                await ScheduleManager.createGoogleCalendarEvent({
                    ...appointment,
                    professional_email: professional.google_calendar_email
                });
            }
            
            // Atualizar preferência do cliente
            await ProfessionalManager.updateClientPreference(
                contactData.id,
                companyId,
                professional.id
            );
            
            return {
                success: true,
                response: `✅ Agendamento confirmado!\n\n` +
                        `📅 Data: ${dateTimeInfo.formattedDateTime}\n` +
                        `👨‍⚕️ Profissional: ${professional.name}\n` +
                        `📍 ${reason}\n\n` +
                        `Enviaremos lembretes 24h e 2h antes. Até lá!`,
                appointment,
                professional
            };
            
        } catch (error) {
            console.error('❌ Erro ao criar agendamento:', error);
            return {
                success: false,
                response: "Erro ao confirmar agendamento. Tente novamente."
            };
        }
    }

    static async handleDateTimeQuery(analysis) {
        return {
            success: false,
            response: "Para qual data e horário gostaria de agendar? " +
                    "Exemplo: 'amanhã às 14h' ou 'quinta-feira de manhã'",
            needs_datetime: true
        };
    }

    static extractDateTime(message) {
        // Usando o método do intention-analyzer
        return intentionAnalyzer.extractDateTime(message);
    }
}

module.exports = AppointmentProcessor;