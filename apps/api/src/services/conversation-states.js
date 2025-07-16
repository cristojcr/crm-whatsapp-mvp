const { createClient } = require('@supabase/supabase-js');

// 🗂️ ESTADOS POSSÍVEIS DA CONVERSA
const CONVERSATION_STATES = {
    INITIAL: 'initial',                    // Primeira interação
    GREETING: 'greeting',                  // Cumprimentando
    SCHEDULING_INTENT: 'scheduling_intent', // Quer agendar
    SELECTING_SERVICE: 'selecting_service', // Escolhendo serviço
    SELECTING_PROFESSIONAL: 'selecting_professional', // Escolhendo profissional
    SELECTING_DATE: 'selecting_date',      // Escolhendo data
    SELECTING_TIME: 'selecting_time',      // Escolhendo horário
    CONFIRMING_APPOINTMENT: 'confirming_appointment', // Confirmando agendamento
    APPOINTMENT_CONFIRMED: 'appointment_confirmed', // Agendamento confirmado
    RESCHEDULING: 'rescheduling',          // Reagendando
    CANCELING: 'canceling',                // Cancelando
    GENERAL_INQUIRY: 'general_inquiry',    // Pergunta geral
    WAITING_RESPONSE: 'waiting_response'   // Aguardando resposta específica
};

class ConversationStates {
    constructor() {
        this.supabaseAdmin = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    // 📥 BUSCAR ESTADO ATUAL DA CONVERSA
    async getCurrentState(conversationId) {
        try {
            console.log('🔍 Buscando estado atual da conversa:', conversationId);
            
            const { data: conversation } = await this.supabaseAdmin
                .from('conversations')
                .select('metadata')
                .eq('id', conversationId)
                .single();

            const currentState = conversation?.metadata?.conversation_state || CONVERSATION_STATES.INITIAL;
            const stateData = conversation?.metadata?.state_data || {};
            
            console.log('📊 Estado atual:', currentState);
            return { state: currentState, data: stateData };
            
        } catch (error) {
            console.error('❌ Erro buscando estado:', error);
            return { state: CONVERSATION_STATES.INITIAL, data: {} };
        }
    }

    // 💾 SALVAR NOVO ESTADO DA CONVERSA
    async setState(conversationId, newState, stateData = {}) {
        try {
            console.log('💾 Salvando novo estado:', newState);
            
            // Buscar metadata atual
            const { data: conversation } = await this.supabaseAdmin
                .from('conversations')
                .select('metadata')
                .eq('id', conversationId)
                .single();

            const currentMetadata = conversation?.metadata || {};
            
            // Atualizar com novo estado
            const updatedMetadata = {
                ...currentMetadata,
                conversation_state: newState,
                state_data: stateData,
                state_updated_at: new Date().toISOString()
            };

            const { error } = await this.supabaseAdmin
                .from('conversations')
                .update({ metadata: updatedMetadata })
                .eq('id', conversationId);

            if (error) throw error;
            
            console.log('✅ Estado salvo com sucesso');
            return true;
            
        } catch (error) {
            console.error('❌ Erro salvando estado:', error);
            return false;
        }
    }

    // 🎯 DETERMINAR PRÓXIMO ESTADO BASEADO NA MENSAGEM
    async determineNextState(currentState, messageText, analysisResult) {
        const lowerMessage = messageText.toLowerCase().trim();
        
        console.log('🎯 Determinando próximo estado...');
        console.log('📍 Estado atual:', currentState);
        console.log('💬 Mensagem:', lowerMessage);

        // MÁQUINA DE ESTADOS
        switch (currentState) {
            case CONVERSATION_STATES.INITIAL:
                // Primeira mensagem
                if (this.isGreeting(lowerMessage)) {
                    return CONVERSATION_STATES.GREETING;
                } else if (this.isSchedulingIntent(lowerMessage)) {
                    return CONVERSATION_STATES.SCHEDULING_INTENT;
                } else {
                    return CONVERSATION_STATES.GENERAL_INQUIRY;
                }

            case CONVERSATION_STATES.GREETING:
                // Após cumprimento
                if (this.isSchedulingIntent(lowerMessage)) {
                    return CONVERSATION_STATES.SCHEDULING_INTENT;
                } else {
                    return CONVERSATION_STATES.GENERAL_INQUIRY;
                }

            case CONVERSATION_STATES.SCHEDULING_INTENT:
                // Quer agendar - próximo passo é escolher profissional ou serviço
                if (this.isNumericSelection(lowerMessage)) {
                    return CONVERSATION_STATES.SELECTING_PROFESSIONAL;
                } else if (this.hasDateTimeInfo(lowerMessage)) {
                    return CONVERSATION_STATES.SELECTING_DATE;
                } else {
                    return CONVERSATION_STATES.SELECTING_SERVICE;
                }

            case CONVERSATION_STATES.SELECTING_PROFESSIONAL:
                // Escolheu profissional
                if (this.isNumericSelection(lowerMessage) || this.isConfirmation(lowerMessage)) {
                    return CONVERSATION_STATES.SELECTING_DATE;
                } else {
                    return CONVERSATION_STATES.SELECTING_PROFESSIONAL; // Ainda escolhendo
                }

            case CONVERSATION_STATES.SELECTING_DATE:
                // Escolhendo data/horário
                if (this.hasDateTimeInfo(lowerMessage) || this.isNumericSelection(lowerMessage)) {
                    return CONVERSATION_STATES.CONFIRMING_APPOINTMENT;
                } else {
                    return CONVERSATION_STATES.SELECTING_DATE; // Ainda escolhendo
                }

            case CONVERSATION_STATES.CONFIRMING_APPOINTMENT:
                // Confirmando agendamento
                if (this.isConfirmation(lowerMessage)) {
                    return CONVERSATION_STATES.APPOINTMENT_CONFIRMED;
                } else if (this.isNegation(lowerMessage)) {
                    return CONVERSATION_STATES.SCHEDULING_INTENT; // Voltar ao início
                } else {
                    return CONVERSATION_STATES.CONFIRMING_APPOINTMENT; // Ainda confirmando
                }

            case CONVERSATION_STATES.APPOINTMENT_CONFIRMED:
                // Agendamento confirmado - nova conversa
                if (this.isSchedulingIntent(lowerMessage)) {
                    return CONVERSATION_STATES.SCHEDULING_INTENT;
                } else if (this.isReschedulingIntent(lowerMessage)) {
                    return CONVERSATION_STATES.RESCHEDULING;
                } else if (this.isCancellationIntent(lowerMessage)) {
                    return CONVERSATION_STATES.CANCELING;
                } else {
                    return CONVERSATION_STATES.GENERAL_INQUIRY;
                }

            default:
                return CONVERSATION_STATES.GENERAL_INQUIRY;
        }
    }

    // 🔍 FUNÇÕES AUXILIARES PARA DETECTAR INTENÇÕES
    isGreeting(text) {
        const greetings = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'e ai', 'eai', 'hey'];
        return greetings.some(greeting => text.includes(greeting)) && text.length < 30;
    }

    isSchedulingIntent(text) {
        const schedulingWords = ['agendar', 'marcar', 'consulta', 'horário', 'disponível', 'agenda', 'atendimento'];
        return schedulingWords.some(word => text.includes(word));
    }

    isReschedulingIntent(text) {
        const reschedulingWords = ['remarcar', 'reagendar', 'mudar horário', 'trocar data', 'alterar'];
        return reschedulingWords.some(word => text.includes(word));
    }

    isCancellationIntent(text) {
        const cancellationWords = ['cancelar', 'desmarcar', 'não vou', 'não posso'];
        return cancellationWords.some(word => text.includes(word));
    }

    isNumericSelection(text) {
        return /^\d+$/.test(text.trim()) || ['1', '2', '3', '4', '5'].includes(text.trim());
    }

    isConfirmation(text) {
        const confirmations = ['sim', 'confirmo', 'ok', 'tudo bem', 'perfeito', 'aceito', 'pode ser'];
        return confirmations.some(word => text.includes(word));
    }

    isNegation(text) {
        const negations = ['não', 'nao', 'cancelar', 'mudar', 'trocar'];
        return negations.some(word => text.includes(word));
    }

    hasDateTimeInfo(text) {
        const dateTimePatterns = [
            /\d{1,2}\/\d{1,2}/, // dd/mm
            /\d{1,2}:\d{2}/, // hh:mm
            /(amanhã|hoje|segunda|terça|quarta|quinta|sexta|sábado|domingo)/,
            /(manhã|tarde|noite)/,
            /\d{1,2}h/
        ];
        return dateTimePatterns.some(pattern => pattern.test(text));
    }

    // 📋 OBTER CONTEXTO BASEADO NO ESTADO
    getStateContext(state, stateData = {}) {
        const contexts = {
            [CONVERSATION_STATES.INITIAL]: 'Cliente iniciando primeira conversa',
            [CONVERSATION_STATES.GREETING]: 'Cliente cumprimentando',
            [CONVERSATION_STATES.SCHEDULING_INTENT]: 'Cliente quer agendar consulta',
            [CONVERSATION_STATES.SELECTING_SERVICE]: 'Cliente escolhendo tipo de serviço',
            [CONVERSATION_STATES.SELECTING_PROFESSIONAL]: 'Cliente escolhendo profissional',
            [CONVERSATION_STATES.SELECTING_DATE]: 'Cliente escolhendo data/horário',
            [CONVERSATION_STATES.CONFIRMING_APPOINTMENT]: 'Cliente confirmando agendamento',
            [CONVERSATION_STATES.APPOINTMENT_CONFIRMED]: 'Agendamento confirmado com sucesso',
            [CONVERSATION_STATES.RESCHEDULING]: 'Cliente quer remarcar consulta',
            [CONVERSATION_STATES.CANCELING]: 'Cliente quer cancelar consulta',
            [CONVERSATION_STATES.GENERAL_INQUIRY]: 'Pergunta geral ou informação'
        };

        return {
            description: contexts[state] || 'Estado não identificado',
            data: stateData,
            nextExpectedAction: this.getExpectedAction(state)
        };
    }

    // 🎯 PRÓXIMA AÇÃO ESPERADA
    getExpectedAction(state) {
        const actions = {
            [CONVERSATION_STATES.INITIAL]: 'Aguardar primeira mensagem',
            [CONVERSATION_STATES.GREETING]: 'Responder cumprimento e oferecer ajuda',
            [CONVERSATION_STATES.SCHEDULING_INTENT]: 'Mostrar opções de profissionais/serviços',
            [CONVERSATION_STATES.SELECTING_PROFESSIONAL]: 'Aguardar seleção de profissional',
            [CONVERSATION_STATES.SELECTING_DATE]: 'Aguardar data/horário desejado',
            [CONVERSATION_STATES.CONFIRMING_APPOINTMENT]: 'Aguardar confirmação final',
            [CONVERSATION_STATES.APPOINTMENT_CONFIRMED]: 'Oferecer outros serviços',
            [CONVERSATION_STATES.RESCHEDULING]: 'Buscar agendamento atual e oferecer novas opções',
            [CONVERSATION_STATES.CANCELING]: 'Confirmar cancelamento',
            [CONVERSATION_STATES.GENERAL_INQUIRY]: 'Responder pergunta específica'
        };

        return actions[state] || 'Determinar próxima ação';
    }
}

module.exports = { ConversationStates, CONVERSATION_STATES };