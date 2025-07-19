// ===============================================
// 🔄 CORREÇÃO 2: ESTADOS CONVERSACIONAIS
// ===============================================
// 📍 ARQUIVO: apps/api/src/services/conversation-states.js
// 🎯 OBJETIVO: Manter contexto da conversa entre mensagens

const { createClient } = require('@supabase/supabase-js');

class ConversationStates {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        // Estados possíveis da conversa
        this.STATES = {
            INITIAL: 'initial',
            GREETING: 'greeting',
            SCHEDULING_INTENT: 'scheduling_intent',
            COLLECTING_DATE: 'collecting_date',
            COLLECTING_TIME: 'collecting_time',
            SELECTING_PROFESSIONAL: 'selecting_professional',
            CONFIRMING_APPOINTMENT: 'confirming_appointment',
            APPOINTMENT_CONFIRMED: 'appointment_confirmed',
            CANCELLING: 'cancelling',
            VIEWING_APPOINTMENTS: 'viewing_appointments',
            GENERAL_CONVERSATION: 'general_conversation',
            NEED_HELP: 'need_help'
        };
    }

    // ✅ OBTER ESTADO ATUAL DA CONVERSA
    async getCurrentState(conversationId) {
        try {
            console.log('🔍 Buscando estado para conversa:', conversationId);
            
            const { data, error } = await this.supabase
                .from('conversations')
                .select('status')
                .eq('id', conversationId)
                .single();

            if (error) {
                console.error('❌ Erro buscando estado:', error);
                return 'initial';
            }

            if (!data || !data.status) {
                console.log('📊 Estado vazio, usando inicial');
                return 'initial';
            }

            console.log('✅ Estado encontrado:', data.status);
            return data.status;
        } catch (error) {
            console.error('❌ Erro geral buscando estado:', error);
            return 'initial';
        }
    }

    // ✅ ATUALIZAR ESTADO DA CONVERSA
    async updateState(conversationId, newState, additionalContext = {}) {
        try {
            console.log('💾 Atualizando estado:', conversationId, '->', newState);

            // ✅ CORREÇÃO: Atualiza a coluna 'status' que já existe, em vez de 'metadata'
            const { error } = await this.supabase
                .from('conversations')
                .update({ 
                    status: newState, // Usa a coluna 'status'
                    updated_at: new Date().toISOString() 
                })
                .eq('id', conversationId);

            if (error) {
                console.error('❌ Erro salvando estado na coluna status:', error);
                return false;
            }

            console.log('✅ Estado atualizado com sucesso na coluna status.');
            return true;

        } catch (error) {
            console.error('❌ Erro geral atualizando estado:', error);
            return false;
        }
    }

    // ✅ DETERMINAR PRÓXIMO ESTADO BASEADO NA MENSAGEM
    determineNextState(currentState, message, analysis) {
        const text = message.toLowerCase();
        const intention = analysis?.intention;

        console.log('🎯 Determinando próximo estado:', {
            atual: currentState,
            intenção: intention,
            mensagem: text.substring(0, 50)
        });

        switch (currentState) {
            case this.STATES.INITIAL:
                if (this.isGreeting(text)) {
                    return this.STATES.GREETING;
                } else if (intention === 'scheduling') {
                    return this.STATES.SCHEDULING_INTENT;
                } else {
                    return this.STATES.GENERAL_CONVERSATION;
                }

            case this.STATES.GREETING:
                if (intention === 'scheduling') {
                    return this.STATES.SCHEDULING_INTENT;
                } else if (this.isAppointmentInquiry(text)) {
                    return this.STATES.VIEWING_APPOINTMENTS;
                } else {
                    return this.STATES.GENERAL_CONVERSATION;
                }

            case this.STATES.SCHEDULING_INTENT:
                if (analysis?.dateTimeInfo?.hasDate && analysis?.dateTimeInfo?.hasTime) {
                    return this.STATES.SELECTING_PROFESSIONAL;
                } else if (!analysis?.dateTimeInfo?.hasDate) {
                    return this.STATES.COLLECTING_DATE;
                } else if (!analysis?.dateTimeInfo?.hasTime) {
                    return this.STATES.COLLECTING_TIME;
                } else {
                    return this.STATES.COLLECTING_DATE;
                }

            case this.STATES.COLLECTING_DATE:
                if (this.hasDateInfo(text)) {
                    return this.STATES.COLLECTING_TIME;
                } else {
                    return this.STATES.COLLECTING_DATE; // Continua coletando
                }

            case this.STATES.COLLECTING_TIME:
                if (this.hasTimeInfo(text)) {
                    return this.STATES.SELECTING_PROFESSIONAL;
                } else {
                    return this.STATES.COLLECTING_TIME; // Continua coletando
                }

            case this.STATES.SELECTING_PROFESSIONAL:
                if (this.isProfessionalSelection(text)) {
                    return this.STATES.CONFIRMING_APPOINTMENT;
                } else {
                    return this.STATES.SELECTING_PROFESSIONAL;
                }

            case this.STATES.CONFIRMING_APPOINTMENT:
                if (this.isConfirmation(text)) {
                    return this.STATES.APPOINTMENT_CONFIRMED;
                } else if (this.isNegation(text)) {
                    return this.STATES.SCHEDULING_INTENT; // Recomeça
                } else {
                    return this.STATES.CONFIRMING_APPOINTMENT;
                }

            case this.STATES.APPOINTMENT_CONFIRMED:
                if (intention === 'scheduling') {
                    return this.STATES.SCHEDULING_INTENT;
                } else {
                    return this.STATES.GENERAL_CONVERSATION;
                }

            default:
                return this.STATES.GENERAL_CONVERSATION;
        }
    }

    // ✅ VERIFICADORES DE PADRÕES
    isGreeting(text) {
        const greetings = ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'e aí'];
        return greetings.some(greeting => text.includes(greeting));
    }

    isAppointmentInquiry(text) {
        const inquiries = ['consultas', 'agendamentos', 'marcado', 'quando', 'horário'];
        return inquiries.some(inquiry => text.includes(inquiry));
    }

    hasDateInfo(text) {
        const datePatterns = [
            /\d{1,2}\/\d{1,2}/, // DD/MM
            /amanhã|hoje|depois/, // Relativo
            /segunda|terça|quarta|quinta|sexta|sábado|domingo/, // Dias da semana
            /\d{1,2} de \w+/ // Dia do mês
        ];
        return datePatterns.some(pattern => pattern.test(text));
    }

    hasTimeInfo(text) {
        const timePatterns = [
            /\d{1,2}:\d{2}/, // HH:MM
            /\d{1,2}h/, // 14h
            /manhã|tarde|noite/, // Período
            /\d{1,2} horas/ // X horas
        ];
        return timePatterns.some(pattern => pattern.test(text));
    }

    isProfessionalSelection(text) {
        // Números (1, 2, 3) ou nomes
        return /^\d+$/.test(text.trim()) || text.includes('dr') || text.includes('dra');
    }

    isConfirmation(text) {
        const confirmations = ['sim', 'confirmo', 'ok', 'certo', 'isso', 'perfeito'];
        return confirmations.some(conf => text.includes(conf));
    }

    isNegation(text) {
        const negations = ['não', 'nao', 'cancelar', 'voltar', 'outro'];
        return negations.some(neg => text.includes(neg));
    }

    // ✅ OBTER CONTEXTO DO ESTADO
    getStateContext(state) {
        const contexts = {
            [this.STATES.INITIAL]: {
                expectation: 'greeting_or_intent',
                prompt_style: 'welcoming'
            },
            [this.STATES.GREETING]: {
                expectation: 'intent_clarification',
                prompt_style: 'friendly'
            },
            [this.STATES.SCHEDULING_INTENT]: {
                expectation: 'date_time_info',
                prompt_style: 'helpful'
            },
            [this.STATES.COLLECTING_DATE]: {
                expectation: 'date_specification',
                prompt_style: 'guiding'
            },
            [this.STATES.COLLECTING_TIME]: {
                expectation: 'time_specification',
                prompt_style: 'specific'
            },
            [this.STATES.SELECTING_PROFESSIONAL]: {
                expectation: 'professional_choice',
                prompt_style: 'options_presenting'
            },
            [this.STATES.CONFIRMING_APPOINTMENT]: {
                expectation: 'confirmation',
                prompt_style: 'confirming'
            }
        };

        return contexts[state] || {
            expectation: 'general_conversation',
            prompt_style: 'conversational'
        };
    }
}

module.exports = ConversationStates;