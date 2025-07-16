// apps/api/src/services/conversation-context-manager.js
const { createClient } = require('@supabase/supabase-js');

class ConversationContextManager {
    constructor() {
        this.supabaseAdmin = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }

    // ✅ NOVA FUNÇÃO: Buscar contexto da conversa (últimas mensagens)
    async getConversationContext(conversationId, limit = 10) {
        try {
            console.log(`💬 Buscando contexto da conversa ${conversationId} (últimas ${limit} mensagens)`);
            
            const { data: messages, error } = await this.supabaseAdmin
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('❌ Erro buscando contexto da conversa:', error);
                return [];
            }

            // Reverter ordem para cronológica (mais antiga primeiro)
            const contextMessages = messages.reverse().map(msg => ({
                role: msg.sender_type === 'contact' ? 'user' : 'assistant',
                content: msg.content,
                timestamp: msg.created_at,
                sender_type: msg.sender_type
            }));

            console.log(`💬 Contexto encontrado: ${contextMessages.length} mensagens`);
            return contextMessages;

        } catch (error) {
            console.error('❌ Erro obtendo contexto da conversa:', error);
            return [];
        }
    }

    // ✅ NOVA FUNÇÃO: Buscar informações do cliente para contexto
    async getCustomerContext(contactId, userId) {
        try {
            console.log(`👤 Buscando contexto do cliente ${contactId}`);
            
            // Buscar informações do contato
            const { data: contact, error: contactError } = await this.supabaseAdmin
                .from('contacts')
                .select('*')
                .eq('id', contactId)
                .eq('user_id', userId)
                .single();

            if (contactError) {
                console.error('❌ Erro buscando contato:', contactError);
                return null;
            }

            // Buscar preferências do cliente (se existir)
            const { data: preferences, error: prefError } = await this.supabaseAdmin
                .from('customer_preferences')
                .select('*')
                .eq('contact_id', contactId)
                .single();

            // Buscar agendamentos recentes
            const { data: recentAppointments, error: aptError } = await this.supabaseAdmin
                .from('appointments')
                .select(`
                    *,
                    professionals (name, specialization),
                    products (name, description)
                `)
                .eq('contact_id', contactId)
                .order('appointment_date', { ascending: false })
                .limit(5);

            const context = {
                contact: contact,
                preferences: preferences || null,
                recentAppointments: recentAppointments || [],
                hasHistory: (recentAppointments && recentAppointments.length > 0),
                preferredProfessional: preferences?.preferred_professional || null,
                communicationStyle: preferences?.communication_style || 'formal'
            };

            console.log(`👤 Contexto do cliente carregado:`, {
                name: contact.name,
                hasPreferences: !!preferences,
                appointmentCount: recentAppointments?.length || 0
            });

            return context;

        } catch (error) {
            console.error('❌ Erro obtendo contexto do cliente:', error);
            return null;
        }
    }

    // ✅ NOVA FUNÇÃO: Preparar contexto completo para IA
    async prepareFullContext(conversationId, contactId, userId) {
        try {
            console.log(`🧠 Preparando contexto completo para conversa ${conversationId}`);
            
            // Buscar contexto da conversa (últimas mensagens)
            const conversationHistory = await this.getConversationContext(conversationId, 10);
            
            // Buscar contexto do cliente
            const customerContext = await this.getCustomerContext(contactId, userId);
            
            // Preparar contexto para a IA
            const fullContext = {
                conversation: {
                    id: conversationId,
                    history: conversationHistory,
                    messageCount: conversationHistory.length
                },
                customer: customerContext,
                currentTime: this.getCurrentTimeInfo(),
                businessInfo: await this.getBusinessInfo(userId)
            };

            console.log(`🧠 Contexto completo preparado:`, {
                conversationMessages: conversationHistory.length,
                hasCustomerHistory: customerContext?.hasHistory || false,
                customerName: customerContext?.contact?.name || 'Desconhecido'
            });

            return fullContext;

        } catch (error) {
            console.error('❌ Erro preparando contexto completo:', error);
            return null;
        }
    }

    // ✅ NOVA FUNÇÃO: Obter informações do negócio
    async getBusinessInfo(userId) {
        try {
            const { data: businessInfo, error } = await this.supabaseAdmin
                .from('user_settings')
                .select('business_name, business_type, business_hours_start, business_hours_end')
                .eq('user_id', userId)
                .single();

            if (error) {
                console.log('⚠️ Informações do negócio não encontradas, usando padrão');
                return {
                    name: 'Clínica',
                    type: 'healthcare',
                    hours: 'Segunda a sexta, das 8h às 17h'
                };
            }

            return {
                name: businessInfo.business_name || 'Clínica',
                type: businessInfo.business_type || 'healthcare',
                hours: `${businessInfo.business_hours_start || '08:00'} às ${businessInfo.business_hours_end || '17:00'}`
            };

        } catch (error) {
            console.error('❌ Erro obtendo informações do negócio:', error);
            return {
                name: 'Clínica',
                type: 'healthcare',
                hours: 'Segunda a sexta, das 8h às 17h'
            };
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Obter horário atual
    getCurrentTimeInfo() {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        let period;
        if (hour >= 5 && hour < 12) {
            period = 'manhã';
        } else if (hour >= 12 && hour < 18) {
            period = 'tarde';
        } else {
            period = 'noite';
        }
        
        return {
            hour: hour,
            minute: minute,
            period: period,
            fullTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
            date: now.toLocaleDateString('pt-BR'),
            timestamp: now.toISOString(),
            timezone: 'America/Sao_Paulo'
        };
    }

    // ✅ NOVA FUNÇÃO: Verificar se conversa foi retomada após pausa
    async checkConversationResumption(conversationId, thresholdMinutes = 30) {
        try {
            const { data: lastMessage, error } = await this.supabaseAdmin
                .from('messages')
                .select('created_at')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !lastMessage) {
                return false;
            }

            const lastMessageTime = new Date(lastMessage.created_at);
            const now = new Date();
            const diffMinutes = (now - lastMessageTime) / (1000 * 60);

            const isResumption = diffMinutes > thresholdMinutes;
            
            if (isResumption) {
                console.log(`🔄 Conversa retomada após ${Math.round(diffMinutes)} minutos de pausa`);
            }

            return isResumption;

        } catch (error) {
            console.error('❌ Erro verificando retomada da conversa:', error);
            return false;
        }
    }
}

module.exports = ConversationContextManager;

