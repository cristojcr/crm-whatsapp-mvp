// ===============================================
// 📅 CORREÇÃO 4: FLUXO DE AGENDAMENTO INTELIGENTE
// ===============================================
// 📍 ARQUIVO: apps/api/src/services/intelligent-scheduling.js
// 🎯 OBJETIVO: Processar agendamentos corretamente

const { createClient } = require('@supabase/supabase-js');

class IntelligentScheduling {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    // ✅ ANALISAR INTENÇÃO DE AGENDAMENTO
    async analyzeSchedulingIntent(message, conversationState) {
        const text = message.toLowerCase();
        
        console.log('🔍 Analisando intenção de agendamento:', text);

        const schedulingKeywords = [
            'agendar', 'marcar', 'consulta', 'horário', 'hora',
            'amanhã', 'hoje', 'semana', 'segunda', 'terça', 'quarta',
            'quinta', 'sexta', 'sábado', 'domingo', 'dia'
        ];

        const hasSchedulingIntent = schedulingKeywords.some(keyword => 
            text.includes(keyword)
        );

        // Extrair informações de data e hora
        const dateTimeInfo = this.extractDateTimeInfo(text);
        
        return {
            hasIntent: hasSchedulingIntent,
            confidence: this.calculateConfidence(text, hasSchedulingIntent),
            dateTimeInfo: dateTimeInfo,
            suggestedAction: this.suggestAction(dateTimeInfo, conversationState)
        };
    }

    // ✅ EXTRAIR INFORMAÇÕES DE DATA E HORA
    extractDateTimeInfo(text) {
        const dateInfo = this.extractDate(text);
        const timeInfo = this.extractTime(text);
        
        return {
            hasDate: dateInfo.found,
            hasTime: timeInfo.found,
            date: dateInfo.value,
            time: timeInfo.value,
            dateText: dateInfo.text,
            timeText: timeInfo.text,
            isComplete: dateInfo.found && timeInfo.found
        };
    }

    // ✅ EXTRAIR DATA
    extractDate(text) {
        // Padrões de data
        const patterns = {
            relative: {
                hoje: new Date(),
                amanhã: new Date(Date.now() + 24 * 60 * 60 * 1000),
                'depois de amanhã': new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            },
            weekdays: {
                segunda: 1, terça: 2, quarta: 3, quinta: 4, 
                sexta: 5, sábado: 6, domingo: 0
            },
            datePattern: /(\d{1,2})\/(\d{1,2})/,
            dayPattern: /(\d{1,2}) de (\w+)/
        };

        // Verificar datas relativas
        for (const [keyword, date] of Object.entries(patterns.relative)) {
            if (text.includes(keyword)) {
                return {
                    found: true,
                    value: date,
                    text: keyword,
                    type: 'relative'
                };
            }
        }

        // Verificar dias da semana
        for (const [dayName, dayNumber] of Object.entries(patterns.weekdays)) {
            if (text.includes(dayName)) {
                const nextDate = this.getNextWeekday(dayNumber);
                return {
                    found: true,
                    value: nextDate,
                    text: dayName,
                    type: 'weekday'
                };
            }
        }

        // Verificar padrão DD/MM
        const dateMatch = text.match(patterns.datePattern);
        if (dateMatch) {
            const day = parseInt(dateMatch[1]);
            const month = parseInt(dateMatch[2]);
            const year = new Date().getFullYear();
            const date = new Date(year, month - 1, day);
            
            return {
                found: true,
                value: date,
                text: dateMatch[0],
                type: 'formatted'
            };
        }

        return { found: false, value: null, text: null, type: null };
    }

    // ✅ EXTRAIR HORA
    extractTime(text) {
        const patterns = {
            hourMinute: /(\d{1,2}):(\d{2})/,
            hour: /(\d{1,2})h/,
            period: /(manhã|tarde|noite)/,
            specific: /(\d{1,2}) horas?/
        };

        // Verificar HH:MM
        const timeMatch = text.match(patterns.hourMinute);
        if (timeMatch) {
            const hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2]);
            return {
                found: true,
                value: { hour, minute },
                text: timeMatch[0],
                type: 'formatted'
            };
        }

        // Verificar hora simples (14h)
        const hourMatch = text.match(patterns.hour);
        if (hourMatch) {
            const hour = parseInt(hourMatch[1]);
            return {
                found: true,
                value: { hour, minute: 0 },
                text: hourMatch[0],
                type: 'simple'
            };
        }

        // Verificar período
        const periodMatch = text.match(patterns.period);
        if (periodMatch) {
            const period = periodMatch[1];
            const suggestedHour = this.getSuggestedHourForPeriod(period);
            return {
                found: true,
                value: { hour: suggestedHour, minute: 0 },
                text: period,
                type: 'period'
            };
        }

        return { found: false, value: null, text: null, type: null };
    }

    // ✅ BUSCAR PROFISSIONAIS DISPONÍVEIS
    async getAvailableProfessionals(userId, date, time) {
        try {
            console.log('👨‍⚕️ Buscando profissionais disponíveis para:', { date, time });

            // Buscar todos os profissionais ativos
            const { data: professionals, error } = await this.supabase
                .from('professionals')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .eq('google_calendar_connected', true);

            if (error) {
                console.error('❌ Erro buscando profissionais:', error);
                return [];
            }

            if (!professionals || professionals.length === 0) {
                console.log('⚠️ Nenhum profissional encontrado');
                return [];
            }

            // Verificar disponibilidade de cada profissional
            const availableProfessionals = [];
            
            for (const professional of professionals) {
                const isAvailable = await this.checkProfessionalAvailability(
                    professional, date, time
                );
                
                if (isAvailable) {
                    availableProfessionals.push(professional);
                }
            }

            console.log(`✅ ${availableProfessionals.length} profissionais disponíveis`);
            return availableProfessionals;

        } catch (error) {
            console.error('❌ Erro geral buscando profissionais:', error);
            return [];
        }
    }

    // ✅ VERIFICAR DISPONIBILIDADE DO PROFISSIONAL
    async checkProfessionalAvailability(professional, date, time) {
        try {
            // Verificar horário comercial
            if (!this.isWithinBusinessHours(time)) {
                return false;
            }

            // Verificar conflitos no Google Calendar (implementar se necessário)
            // const hasConflict = await this.checkCalendarConflicts(professional, date, time);
            
            return true; // Por enquanto assume disponível se dentro do horário

        } catch (error) {
            console.error('❌ Erro verificando disponibilidade:', error);
            return false;
        }
    }

    // ✅ CRIAR AGENDAMENTO
    async createAppointment(appointmentData) {
        try {
            console.log('📅 Criando agendamento:', appointmentData);

            const { data: appointment, error } = await this.supabase
                .from('appointments')
                .insert({
                    user_id: appointmentData.userId,
                    contact_id: appointmentData.contactId,
                    professional_id: appointmentData.professionalId,
                    appointment_date: appointmentData.appointmentDate,
                    appointment_time: appointmentData.appointmentTime,
                    status: 'confirmed',
                    source: 'telegram',
                    metadata: appointmentData.metadata || {}
                })
                .select()
                .single();

            if (error) {
                console.error('❌ Erro criando agendamento:', error);
                return null;
            }

            console.log('✅ Agendamento criado com sucesso:', appointment.id);
            return appointment;

        } catch (error) {
            console.error('❌ Erro geral criando agendamento:', error);
            return null;
        }
    }

    // ✅ GERAR RESPOSTA PARA AGENDAMENTO
    generateSchedulingResponse(availableProfessionals, dateTimeInfo) {
        if (availableProfessionals.length === 0) {
            return {
                type: 'no_professionals',
                messages: [
                    'Opa! 😔',
                    'Infelizmente não temos profissionais disponíveis para esse horário.',
                    'Que tal tentarmos outro dia ou horário?'
                ]
            };
        }

        if (availableProfessionals.length === 1) {
            const professional = availableProfessionals[0];
            return {
                type: 'single_professional',
                messages: [
                    'Perfeito! 🎉',
                    `Temos o(a) ${professional.name} disponível para ${this.formatDateTime(dateTimeInfo)}.`,
                    'Posso confirmar esse agendamento para você?'
                ],
                professional: professional
            };
        }

        // Múltiplos profissionais
        let professionalsList = '👨‍⚕️ <b>Profissionais disponíveis:</b>\n\n';
        availableProfessionals.forEach((prof, index) => {
            professionalsList += `${index + 1}. <b>${prof.name}</b>`;
            if (prof.specialty) {
                professionalsList += ` - ${prof.specialty}`;
            }
            professionalsList += '\n';
        });

        return {
            type: 'multiple_professionals',
            messages: [
                'Ótimo! 😊',
                `Temos ${availableProfessionals.length} profissionais disponíveis para ${this.formatDateTime(dateTimeInfo)}.`,
                professionalsList,
                'Digite o número ou nome do profissional de sua preferência:'
            ],
            professionals: availableProfessionals
        };
    }

    // ✅ UTILITÁRIOS
    getNextWeekday(targetDay) {
        const today = new Date();
        const currentDay = today.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        const resultDate = new Date(today);
        resultDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
        return resultDate;
    }

    getSuggestedHourForPeriod(period) {
        const suggestions = {
            manhã: 9,
            tarde: 14,
            noite: 19
        };
        return suggestions[period] || 14;
    }

    isWithinBusinessHours(time) {
        if (!time || !time.hour) return true; // Se não especificou hora, assume OK
        
        const hour = time.hour;
        return hour >= 8 && hour <= 18; // 8h às 18h
    }

    formatDateTime(dateTimeInfo) {
        let result = '';
        
        if (dateTimeInfo.hasDate) {
            result += dateTimeInfo.dateText || 'a data solicitada';
        }
        
        if (dateTimeInfo.hasTime) {
            if (result) result += ' às ';
            result += dateTimeInfo.timeText || 'o horário solicitado';
        }
        
        return result || 'o horário solicitado';
    }

    calculateConfidence(text, hasIntent) {
        if (!hasIntent) return 0;
        
        let confidence = 0.5; // Base
        
        // Aumentar confiança baseado em palavras-chave específicas
        if (text.includes('agendar') || text.includes('marcar')) confidence += 0.3;
        if (text.includes('consulta')) confidence += 0.2;
        if (text.includes('horário') || text.includes('hora')) confidence += 0.1;
        
        return Math.min(confidence, 1.0);
    }

    suggestAction(dateTimeInfo, conversationState) {
        if (!dateTimeInfo.hasDate && !dateTimeInfo.hasTime) {
            return 'collect_datetime';
        } else if (!dateTimeInfo.hasDate) {
            return 'collect_date';
        } else if (!dateTimeInfo.hasTime) {
            return 'collect_time';
        } else {
            return 'show_professionals';
        }
    }
}

module.exports = IntelligentScheduling;