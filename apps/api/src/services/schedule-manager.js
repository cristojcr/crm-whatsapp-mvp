// ===============================================
// SCHEDULE MANAGER: Gestão inteligente de agenda
// ===============================================

const { supabase } = require('../config/supabase');
const moment = require('moment-timezone');

class ScheduleManager {
    constructor() {
        this.defaultTimezone = 'America/Sao_Paulo';
    }

    // ===============================================
    // CONSULTAR DISPONIBILIDADE
    // ===============================================
    
    async getAvailableSlots(companyId, serviceId, date, timezone = this.defaultTimezone) {
        try {
            console.log(`🔍 Buscando slots disponíveis para empresa ${companyId}, serviço ${serviceId}, data ${date}`);
            
            // 1. Buscar configurações da empresa
            let { data: companySettings } = await supabase
                .from('company_settings')
                .select('business_hours, timezone')
                .eq('company_id', companyId)
                .single();
            // ADICIONAR/SUBSTITUIR ESTAS LINHAS:
            // ADICIONAR/SUBSTITUIR ESTAS LINHAS:
            // Verificar se companySettings existe, senão buscar pelo user_profile
            let actualCompanyId = companyId;
            if (!companySettings) {
                console.log(`⚠️ Configurações não encontradas para ${companyId}, tentando buscar company_id do user_profile...`);
                
                const { data: userProfile } = await supabase
                    .from('user_profiles')
                    .select('company_id')
                    .eq('user_id', companyId)
                    .single();
                
                if (userProfile?.company_id) {
                    actualCompanyId = userProfile.company_id;
                    console.log(`✅ Usando company_id correto: ${actualCompanyId}`);
                    
                    // Buscar configurações com company_id correto
                    const { data: newCompanySettings } = await supabase
                        .from('company_settings')
                        .select('business_hours, timezone')
                        .eq('company_id', actualCompanyId)
                        .single();
                    
                    companySettings = newCompanySettings;
                }
            }

            if (!companySettings) {
                throw new Error(`Configurações da empresa não encontradas para ${actualCompanyId}`);
            }
            // 2. Buscar dados do serviço
            const { data: service } = await supabase
                .from('services')
                .select('*')
                .eq('id', serviceId)
                .eq('is_active', true)
                .single();

            if (!service) {
                throw new Error('Serviço não encontrado ou inativo');
            }

            // 3. Verificar se o dia está disponível para o serviço
            const dayOfWeek = moment(date).format('dddd').toLowerCase();
            if (!service.available_days.includes(dayOfWeek)) {
                return {
                    success: true,
                    slots: [],
                    message: `Serviço não disponível em ${dayOfWeek}`
                };
            }

            // 4. Gerar slots baseados na configuração
            const availableSlots = await this.generateTimeSlots(
                companyId,
                service,
                date,
                companySettings.business_hours || {},
                timezone
            );

            // 5. Remover slots já ocupados
            const freeSlots = await this.filterOccupiedSlots(companyId, availableSlots, date);

            // 6. Aplicar bloqueios
            const finalSlots = await this.applyBlocks(companyId, freeSlots, date);

            return {
                success: true,
                slots: finalSlots,
                service: service.name,
                date: date
            };

        } catch (error) {
            console.error('❌ Erro ao buscar slots disponíveis:', error);
            return {
                success: false,
                error: error.message,
                slots: []
            };
        }
    }

    // ===============================================
    // GERAR SLOTS DE HORÁRIO
    // ===============================================
    
    async generateTimeSlots(companyId, service, date, businessHours, timezone) {
        const slots = [];
        const dayOfWeek = moment(date).format('dddd').toLowerCase();
        
        // Horários do serviço ou da empresa
        const serviceHours = service.available_hours;
        const startTime = serviceHours.start || '09:00';
        const endTime = serviceHours.end || '17:00';
        
        const startDateTime = moment.tz(`${date} ${startTime}`, timezone);
        const endDateTime = moment.tz(`${date} ${endTime}`, timezone);
        
        let currentSlot = startDateTime.clone();
        
        while (currentSlot.clone().add(service.duration_minutes, 'minutes').isSameOrBefore(endDateTime)) {
            // Verificar se está dentro do horário de funcionamento da empresa
            const slotTime = currentSlot.format('HH:mm');
            const dayConfig = businessHours[dayOfWeek];
            
            if (dayConfig && dayConfig.active) {
                if (slotTime >= dayConfig.open && slotTime <= dayConfig.close) {
                    slots.push({
                        start: currentSlot.toISOString(),
                        end: currentSlot.clone().add(service.duration_minutes, 'minutes').toISOString(),
                        display: currentSlot.format('HH:mm'),
                        duration: service.duration_minutes
                    });
                }
            }
            
            // Próximo slot (duração + buffer)
            currentSlot.add(service.duration_minutes + service.buffer_minutes, 'minutes');
        }
        
        return slots;
    }

    // ===============================================
    // FILTRAR SLOTS OCUPADOS
    // ===============================================
    
    async filterOccupiedSlots(companyId, slots, date) {
        try {
            // Buscar agendamentos existentes para o dia
            const { data: appointments } = await supabase
                .from('appointments')
                .select('scheduled_at, duration_minutes, status')
                .eq('user_id', companyId) // Assumindo que user_id = company owner
                .gte('scheduled_at', `${date}T00:00:00`)
                .lt('scheduled_at', `${date}T23:59:59`)
                .in('status', ['confirmed', 'pending']);

            if (!appointments || appointments.length === 0) {
                return slots;
            }

            // Filtrar slots que não conflitam com agendamentos
            return slots.filter(slot => {
                const slotStart = moment(slot.start);
                const slotEnd = moment(slot.end);

                return !appointments.some(appointment => {
                    const aptStart = moment(appointment.scheduled_at);
                    const aptEnd = aptStart.clone().add(appointment.duration_minutes, 'minutes');

                    // Verificar se há conflito
                    return slotStart.isBefore(aptEnd) && slotEnd.isAfter(aptStart);
                });
            });

        } catch (error) {
            console.error('❌ Erro ao filtrar slots ocupados:', error);
            return slots;
        }
    }

    // ===============================================
    // APLICAR BLOQUEIOS
    // ===============================================
    
    async applyBlocks(companyId, slots, date) {
        try {
            // Buscar bloqueios para o dia
            const { data: blocks } = await supabase
                .from('availability_blocks')
                .select('start_datetime, end_datetime, title')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .gte('start_datetime', `${date}T00:00:00`)
                .lt('end_datetime', `${date}T23:59:59`);

            if (!blocks || blocks.length === 0) {
                return slots;
            }

            // Filtrar slots que não conflitam com bloqueios
            return slots.filter(slot => {
                const slotStart = moment(slot.start);
                const slotEnd = moment(slot.end);

                return !blocks.some(block => {
                    const blockStart = moment(block.start_datetime);
                    const blockEnd = moment(block.end_datetime);

                    // Verificar se há conflito
                    return slotStart.isBefore(blockEnd) && slotEnd.isAfter(blockStart);
                });
            });

        } catch (error) {
            console.error('❌ Erro ao aplicar bloqueios:', error);
            return slots;
        }
    }

    // ===============================================
    // AGENDAR COMPROMISSO
    // ===============================================
    
    async bookAppointment(appointmentData) {
        try {
            console.log('📅 Criando novo agendamento:', appointmentData);

            // Validar se o slot ainda está disponível
            const isAvailable = await this.validateSlotAvailability(
                appointmentData.user_id,
                appointmentData.scheduled_at,
                appointmentData.service_id
            );

            if (!isAvailable) {
                return {
                    success: false,
                    error: 'Horário não está mais disponível'
                };
            }

            // Criar agendamento
            const { data: appointment, error } = await supabase
                .from('appointments')
                .insert({
                    ...appointmentData,
                    status: 'confirmed',
                    created_via: 'whatsapp',
                    confirmation_sent: false,
                    reminder_sent_24h: false,
                    reminder_sent_2h: false
                })
                .select()
                .single();

            if (error) throw error;

            // Criar evento no Google Calendar (se configurado)
            await this.createGoogleCalendarEvent(appointment);

            console.log('✅ Agendamento criado com sucesso:', appointment.id);
            
            return {
                success: true,
                appointment: appointment,
                message: 'Agendamento criado com sucesso!'
            };

        } catch (error) {
            console.error('❌ Erro ao criar agendamento:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===============================================
    // REAGENDAR COMPROMISSO
    // ===============================================
    
    async rescheduleAppointment(appointmentId, newDateTime, serviceId) {
        try {
            console.log(`🔄 Reagendando compromisso ${appointmentId} para ${newDateTime}`);

            // Buscar agendamento atual
            const { data: currentAppointment } = await supabase
                .from('appointments')
                .select('*')
                .eq('id', appointmentId)
                .single();

            if (!currentAppointment) {
                return {
                    success: false,
                    error: 'Agendamento não encontrado'
                };
            }

            // Validar novo horário
            const isAvailable = await this.validateSlotAvailability(
                currentAppointment.user_id,
                newDateTime,
                serviceId
            );

            if (!isAvailable) {
                return {
                    success: false,
                    error: 'Novo horário não está disponível'
                };
            }

            // Atualizar agendamento
            const { data: updatedAppointment, error } = await supabase
                .from('appointments')
                .update({
                    scheduled_at: newDateTime,
                    service_id: serviceId,
                    updated_at: new Date().toISOString(),
                    confirmation_sent: false,
                    reminder_sent_24h: false,
                    reminder_sent_2h: false
                })
                .eq('id', appointmentId)
                .select()
                .single();

            if (error) throw error;

            // Atualizar Google Calendar
            await this.updateGoogleCalendarEvent(updatedAppointment);

            console.log('✅ Reagendamento realizado com sucesso');
            
            return {
                success: true,
                appointment: updatedAppointment,
                message: 'Reagendamento realizado com sucesso!'
            };

        } catch (error) {
            console.error('❌ Erro ao reagendar:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===============================================
    // CANCELAR COMPROMISSO
    // ===============================================
    
    async cancelAppointment(appointmentId, reason = 'Cancelado pelo cliente') {
        try {
            console.log(`❌ Cancelando compromisso ${appointmentId}`);

            // Atualizar status do agendamento
            const { data: cancelledAppointment, error } = await supabase
                .from('appointments')
                .update({
                    status: 'cancelled',
                    cancellation_reason: reason,
                    updated_at: new Date().toISOString()
                })
                .eq('id', appointmentId)
                .select()
                .single();

            if (error) throw error;

            // Remover do Google Calendar
            await this.deleteGoogleCalendarEvent(cancelledAppointment);

            // Verificar lista de espera
            await this.processWaitingList(cancelledAppointment);

            console.log('✅ Cancelamento realizado com sucesso');
            
            return {
                success: true,
                appointment: cancelledAppointment,
                message: 'Cancelamento realizado com sucesso!'
            };

        } catch (error) {
            console.error('❌ Erro ao cancelar:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ===============================================
    // VALIDAÇÕES E UTILITÁRIOS
    // ===============================================
    
    async validateSlotAvailability(companyId, dateTime, serviceId) {
        try {
            const date = moment(dateTime).format('YYYY-MM-DD');
            const time = moment(dateTime).format('HH:mm');

            // Buscar slots disponíveis
            const availabilityResult = await this.getAvailableSlots(companyId, serviceId, date);
            
            if (!availabilityResult.success) {
                return false;
            }

            // Verificar se o horário específico está disponível
            return availabilityResult.slots.some(slot => 
                moment(slot.start).format('HH:mm') === time
            );

        } catch (error) {
            console.error('❌ Erro ao validar disponibilidade:', error);
            return false;
        }
    }

    async createGoogleCalendarEvent(appointment) {
        // TODO: Implementar integração Google Calendar
        console.log('📅 Criando evento no Google Calendar:', appointment.id);
    }

    async updateGoogleCalendarEvent(appointment) {
        // TODO: Implementar atualização Google Calendar
        console.log('📅 Atualizando evento no Google Calendar:', appointment.id);
    }

    async deleteGoogleCalendarEvent(appointment) {
        // TODO: Implementar remoção Google Calendar
        console.log('📅 Removendo evento do Google Calendar:', appointment.id);
    }

    async processWaitingList(cancelledAppointment) {
        // TODO: Implementar sistema de lista de espera
        console.log('📋 Processando lista de espera para:', cancelledAppointment.scheduled_at);
    }

        // ===============================================
    // MÉTODOS MULTI-PROFISSIONAL
    // ===============================================

    async checkMultipleProfessionalsAvailability(companyId, dateTime, duration = 60) {
        try {
            console.log('👥 Verificando disponibilidade de múltiplos profissionais');
            
            // Buscar todos os profissionais ativos da empresa
            const { data: professionals } = await supabase
                .from('professionals')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('display_order');
            
            if (!professionals?.length) {
                return {
                    success: false,
                    error: 'Nenhum profissional encontrado'
                };
            }
            
            // Verificar disponibilidade de cada profissional
            const availabilityResults = await Promise.all(
                professionals.map(async (professional) => {
                    const availability = await this.checkProfessionalAvailability(
                        professional.id,
                        dateTime,
                        duration
                    );
                    
                    return {
                        professional,
                        available: availability.success,
                        reason: availability.reason || availability.error
                    };
                })
            );
            
            const availableProfessionals = availabilityResults.filter(result => result.available);
            
            return {
                success: true,
                all_professionals: availabilityResults,
                available_professionals: availableProfessionals,
                total_available: availableProfessionals.length
            };
            
        } catch (error) {
            console.error('❌ Erro ao verificar disponibilidade múltipla:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async checkProfessionalAvailability(professionalId, dateTime, duration = 60) {
        try {
            const appointmentDate = new Date(dateTime);
            const dayOfWeek = appointmentDate.getDay();
            const timeSlot = appointmentDate.toTimeString().slice(0, 5);
            
            // Buscar dados do profissional
            const { data: professional } = await supabase
                .from('professionals')
                .select('*, company_id')
                .eq('id', professionalId)
                .single();
            
            if (!professional || !professional.is_active) {
                return {
                    success: false,
                    error: 'Profissional não encontrado ou inativo'
                };
            }
            
            // Verificar horário de funcionamento do profissional (específico)
            const { data: professionalAvailability } = await supabase
                .from('professional_availability')
                .select('*')
                .eq('professional_id', professionalId)
                .eq('day_of_week', dayOfWeek)
                .eq('is_available', true)
                .or(`effective_from.is.null,effective_from.lte.${appointmentDate.toISOString().split('T')[0]}`)
                .or(`effective_until.is.null,effective_until.gte.${appointmentDate.toISOString().split('T')[0]}`)
                .single();
            
            // Se não tem horário específico, usar horário da empresa
            if (!professionalAvailability) {
                const companyAvailability = await this.checkCompanyBusinessHours(
                    professional.company_id,
                    dayOfWeek,
                    timeSlot
                );
                
                if (!companyAvailability.success) {
                    return companyAvailability;
                }
            } else {
                // Verificar se está dentro do horário do profissional
                const startTime = professionalAvailability.start_time;
                const endTime = professionalAvailability.end_time;
                const breakStart = professionalAvailability.break_start_time;
                const breakEnd = professionalAvailability.break_end_time;
                
                if (timeSlot < startTime || timeSlot >= endTime) {
                    return {
                        success: false,
                        error: `Fora do horário de atendimento de ${professional.name}`
                    };
                }
                
                // Verificar pausa/almoço
                if (breakStart && breakEnd && timeSlot >= breakStart && timeSlot < breakEnd) {
                    return {
                        success: false,
                        error: `Horário de pausa de ${professional.name}`
                    };
                }
            }
            
            // Verificar conflitos com agendamentos existentes
            const endDateTime = new Date(appointmentDate.getTime() + (duration * 60000));
            
            const { data: conflicts } = await supabase
                .from('appointments')
                .select('*')
                .eq('professional_id', professionalId)
                .eq('status', 'CONFIRMED')
                .or(`and(scheduled_at.lte.${dateTime},scheduled_at.gte.${endDateTime.toISOString()}),and(scheduled_at.lte.${dateTime},scheduled_at.gte.${endDateTime.toISOString()})`);
            
            if (conflicts?.length > 0) {
                return {
                    success: false,
                    error: `${professional.name} já tem agendamento neste horário`
                };
            }
            
            // Verificar Google Calendar se necessário
            if (professional.google_calendar_email) {
                const googleConflict = await this.checkGoogleCalendarAvailability(
                    professional.google_calendar_email,
                    dateTime,
                    duration
                );
                
                if (!googleConflict.success) {
                    return {
                        success: false,
                        error: `Conflito na agenda Google de ${professional.name}`
                    };
                }
            }
            
            return {
                success: true,
                professional,
                reason: `${professional.name} disponível`
            };
            
        } catch (error) {
            console.error('❌ Erro ao verificar disponibilidade do profissional:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async suggestAlternativeTimes(companyId, professionalId = null, preferredDate, duration = 60) {
        try {
            console.log('📅 Sugerindo horários alternativos');
            
            const suggestions = [];
            const baseDate = new Date(preferredDate);
            
            // Buscar profissionais (específico ou todos da empresa)
            let professionals;
            if (professionalId) {
                const { data: prof } = await supabase
                    .from('professionals')
                    .select('*')
                    .eq('id', professionalId)
                    .single();
                professionals = prof ? [prof] : [];
            } else {
                const { data: profs } = await supabase
                    .from('professionals')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('is_active', true);
                professionals = profs || [];
            }
            
            // Verificar próximos 7 dias
            for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
                const checkDate = new Date(baseDate);
                checkDate.setDate(baseDate.getDate() + dayOffset);
                
                // Verificar horários de 8h às 18h de hora em hora
                for (let hour = 8; hour < 18; hour++) {
                    const checkDateTime = new Date(checkDate);
                    checkDateTime.setHours(hour, 0, 0, 0);
                    
                    // Verificar cada profissional
                    for (const professional of professionals) {
                        const availability = await this.checkProfessionalAvailability(
                            professional.id,
                            checkDateTime.toISOString(),
                            duration
                        );
                        
                        if (availability.success) {
                            suggestions.push({
                                professional,
                                datetime: checkDateTime.toISOString(),
                                formatted_time: checkDateTime.toLocaleDateString('pt-BR') + ' às ' + 
                                            checkDateTime.toLocaleTimeString('pt-BR', { 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })
                            });
                        }
                    }
                }
                
                // Limitar sugestões a 5 por dia
                if (suggestions.length >= 35) break;
            }
            
            return {
                success: true,
                suggestions: suggestions.slice(0, 10), // Top 10 sugestões
                total_found: suggestions.length
            };
            
        } catch (error) {
            console.error('❌ Erro ao sugerir horários alternativos:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}



module.exports = ScheduleManager;