// ===============================================
// 🧠 CORREÇÃO 1: SISTEMA DE MEMÓRIA CONVERSACIONAL
// ===============================================
// 📍 ARQUIVO: apps/api/src/services/conversation-memory.js
// 🎯 OBJETIVO: IA lembrar conversas anteriores

const { createClient } = require('@supabase/supabase-js');

class ConversationMemory {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    // ✅ BUSCAR HISTÓRICO COMPLETO DO CLIENTE
    async getCustomerFullHistory(contactId, userId) {
        try {
            console.log('🧠 Buscando histórico completo do cliente:', contactId);

            // 1. Buscar últimas 10 mensagens
            const { data: recentMessages } = await this.supabase
                .from('messages')
                .select('content, sender_type, created_at, metadata')
                .eq('contact_id', contactId)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10);

            // 2. Buscar agendamentos (histórico + futuros)
            const { data: appointments } = await this.supabase
                .from('appointments')
                .select('*')
                .eq('contact_id', contactId)
                .eq('user_id', userId)
                .order('appointment_date', { ascending: false })
                .limit(5);

            // 3. Buscar perfil do contato
            const { data: contact } = await this.supabase
                .from('contacts')
                .select('name, phone, telegram_username, metadata')
                .eq('id', contactId)
                .single();

            // 4. Análise do relacionamento
            const relationshipAnalysis = this.analyzeCustomerRelationship(recentMessages, appointments);

            const fullHistory = {
                contact: contact,
                recentMessages: recentMessages || [],
                appointments: appointments || [],
                relationship: relationshipAnalysis,
                lastInteraction: recentMessages?.[0]?.created_at || null,
                totalMessages: recentMessages?.length || 0,
                hasAppointments: (appointments?.length || 0) > 0
            };

            console.log('🧠 Histórico completo obtido:', {
                mensagens: fullHistory.totalMessages,
                agendamentos: appointments?.length || 0,
                relacionamento: relationshipAnalysis.stage
            });

            return fullHistory;

        } catch (error) {
            console.error('❌ Erro buscando histórico:', error);
            return null;
        }
    }

    // ✅ ANALISAR RELACIONAMENTO COM CLIENTE
    analyzeCustomerRelationship(messages, appointments) {
        if (!messages || messages.length === 0) {
            return {
                stage: 'new_customer',
                confidence: 1.0,
                description: 'Cliente novo, primeira interação'
            };
        }

        const messageCount = messages.length;
        const hasAppointments = appointments && appointments.length > 0;
        const lastMessageAge = this.getMessageAge(messages[0]?.created_at);

        // Análise do estágio do relacionamento
        if (hasAppointments && messageCount > 5) {
            return {
                stage: 'loyal_customer',
                confidence: 0.9,
                description: 'Cliente fiel com histórico de agendamentos'
            };
        } else if (hasAppointments) {
            return {
                stage: 'returning_customer',
                confidence: 0.8,
                description: 'Cliente retornante'
            };
        } else if (messageCount > 3) {
            return {
                stage: 'engaged_prospect',
                confidence: 0.7,
                description: 'Prospecto engajado'
            };
        } else {
            return {
                stage: 'new_contact',
                confidence: 0.6,
                description: 'Contato recente'
            };
        }
    }

    // ✅ PREPARAR CONTEXTO PARA IA
    async prepareContextForAI(contactId, userId, currentMessage) {
        const history = await this.getCustomerFullHistory(contactId, userId);
        
        if (!history) {
            return {
                isNewCustomer: true,
                shouldGreet: true,
                context: "Cliente novo, primeira interação"
            };
        }

        const contextPrompt = this.buildContextPrompt(history, currentMessage);
        
        return {
            isNewCustomer: history.relationship.stage === 'new_customer',
            shouldGreet: this.shouldGreetCustomer(history),
            context: contextPrompt,
            customerName: history.contact?.name,
            relationshipStage: history.relationship.stage
        };
    }

    // ✅ CONSTRUIR PROMPT DE CONTEXTO
    buildContextPrompt(history, currentMessage) {
        let contextParts = [];

        // Informações do cliente
        if (history.contact?.name) {
            contextParts.push(`Cliente: ${history.contact.name}`);
        }

        // Estágio do relacionamento
        contextParts.push(`Relacionamento: ${history.relationship.description}`);

        // Histórico de mensagens recentes
        if (history.recentMessages.length > 0) {
            contextParts.push("Últimas interações:");
            history.recentMessages.slice(0, 3).forEach((msg, index) => {
                const sender = msg.sender_type === 'user' ? 'Cliente' : 'Assistente';
                const time = this.formatTimeAgo(msg.created_at);
                contextParts.push(`${sender} (${time}): ${msg.content}`);
            });
        }

        // Histórico de agendamentos
        if (history.appointments.length > 0) {
            contextParts.push("Agendamentos:");
            history.appointments.slice(0, 2).forEach(apt => {
                const status = apt.status || 'agendado';
                const date = new Date(apt.appointment_date).toLocaleDateString('pt-BR');
                contextParts.push(`- ${date}: ${status}`);
            });
        }

        return contextParts.join('\n');
    }

    // ✅ VERIFICAR SE DEVE CUMPRIMENTAR
    shouldGreetCustomer(history) {
        if (!history || history.totalMessages === 0) {
            return true; // Primeira interação
        }

        const lastMessage = history.recentMessages[0];
        if (!lastMessage) return true;

        const hoursSinceLastMessage = this.getMessageAge(lastMessage.created_at);
        
        // Cumprimentar se passou mais de 12 horas
        return hoursSinceLastMessage > 12;
    }

    // ✅ UTILITÁRIOS
    getMessageAge(timestamp) {
        if (!timestamp) return Infinity;
        const now = new Date();
        const messageTime = new Date(timestamp);
        return (now - messageTime) / (1000 * 60 * 60); // Horas
    }

    formatTimeAgo(timestamp) {
        const hours = this.getMessageAge(timestamp);
        if (hours < 1) return 'agora';
        if (hours < 24) return `${Math.floor(hours)}h atrás`;
        return `${Math.floor(hours / 24)}d atrás`;
    }
}

module.exports = ConversationMemory;