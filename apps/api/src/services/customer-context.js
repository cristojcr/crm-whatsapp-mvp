// apps/api/src/services/customer-context.js
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

class CustomerContext {
    constructor() {
        this.contextCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    // Obter contexto completo do cliente
    async getCustomerContext(contactId, userId) {
        try {
            console.log('👤 Carregando contexto do cliente:', contactId);
            
            // Verificar cache primeiro
            const cacheKey = `${contactId}_${userId}`;
            if (this.contextCache.has(cacheKey)) {
                const cached = this.contextCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    console.log('📋 Usando contexto do cache');
                    return cached.data;
                }
            }

            // Buscar dados do cliente
            const customerData = await this.getCustomerData(contactId);
            
            // Buscar histórico de conversas
            const conversationHistory = await this.getConversationHistory(contactId, userId);
            
            // Buscar agendamentos anteriores
            const appointmentHistory = await this.getAppointmentHistory(contactId, userId);
            
            // Buscar preferências
            const preferences = await this.getCustomerPreferences(contactId);

            const context = {
                customer: customerData,
                conversation: conversationHistory,
                appointments: appointmentHistory,
                preferences: preferences,
                hasHistory: conversationHistory.length > 0,
                isReturningCustomer: appointmentHistory.length > 0,
                lastInteraction: conversationHistory[0]?.created_at || null,
                preferredProfessional: this.extractPreferredProfessional(appointmentHistory),
                communicationStyle: this.detectCommunicationStyle(conversationHistory)
            };

            // Salvar no cache
            this.contextCache.set(cacheKey, {
                data: context,
                timestamp: Date.now()
            });

            return context;
        } catch (error) {
            console.error('❌ Erro carregando contexto:', error);
            return this.getBasicContext(contactId);
        }
    }

    // Dados básicos do cliente
    async getCustomerData(contactId) {
        try {
            const { data: contact, error } = await supabaseAdmin
                .from('contacts')
                .select('*')
                .eq('id', contactId)
                .single();

            if (error) throw error;

            return {
                id: contact.id,
                name: contact.name,
                phone: contact.phone,
                firstContact: contact.created_at,
                status: contact.status
            };
        } catch (error) {
            console.error('❌ Erro buscando dados do cliente:', error);
            return { id: contactId, name: null };
        }
    }

    // Histórico de conversas recentes
    async getConversationHistory(contactId, userId) {
        try {
            const { data: messages, error } = await supabaseAdmin
                .from('messages')
                .select('content, sender_type, created_at, metadata')
                .eq('user_id', userId)
                .eq('contact_id', contactId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            return messages || [];
        } catch (error) {
            console.error('❌ Erro buscando histórico:', error);
            return [];
        }
    }

    // Histórico de agendamentos
    async getAppointmentHistory(contactId, userId) {
        try {
            const { data: appointments, error } = await supabaseAdmin
                .from('appointments')
                .select(`
                    *,
                    professionals:professional_id (name, specialty)
                `)
                .eq('user_id', userId)
                .eq('contact_id', contactId)
                .order('appointment_date', { ascending: false })
                .limit(5);

            if (error) throw error;
            return appointments || [];
        } catch (error) {
            console.error('❌ Erro buscando agendamentos:', error);
            return [];
        }
    }

    // Preferências do cliente
    async getCustomerPreferences(contactId) {
        try {
            const { data: prefs, error } = await supabaseAdmin
                .from('customer_preferences')
                .select('*')
                .eq('contact_id', contactId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            
            return prefs || {
                preferred_time: null,
                preferred_professional: null,
                communication_style: 'formal',
                reminder_preferences: 'standard'
            };
        } catch (error) {
            console.error('❌ Erro buscando preferências:', error);
            return {};
        }
    }

    // Extrair profissional preferido do histórico
    extractPreferredProfessional(appointmentHistory) {
        if (!appointmentHistory.length) return null;
        
        // Contar frequência de cada profissional
        const professionalCount = {};
        appointmentHistory.forEach(apt => {
            if (apt.professionals) {
                const profId = apt.professional_id;
                professionalCount[profId] = (professionalCount[profId] || 0) + 1;
            }
        });

        // Retornar o mais frequente
        const mostFrequent = Object.entries(professionalCount)
            .sort(([,a], [,b]) => b - a)[0];
        
        if (mostFrequent) {
            const appointment = appointmentHistory.find(apt => 
                apt.professional_id === parseInt(mostFrequent[0])
            );
            return appointment?.professionals || null;
        }
        
        return null;
    }

    // Detectar estilo de comunicação
    detectCommunicationStyle(conversationHistory) {
        if (!conversationHistory.length) return 'formal';
        
        const recentMessages = conversationHistory.slice(0, 5);
        let informalCount = 0;
        
        recentMessages.forEach(msg => {
            if (msg.sender_type === 'contact' && msg.content) {
                const content = msg.content.toLowerCase();
                // Indicadores de informalidade
                if (content.includes('oi') || content.includes('opa') || 
                    content.includes('valeu') || content.includes('blz') ||
                    content.includes('😊') || content.includes('👍')) {
                    informalCount++;
                }
            }
        });
        
        return informalCount > recentMessages.length / 2 ? 'informal' : 'formal';
    }

    // Contexto básico em caso de erro
    getBasicContext(contactId) {
        return {
            customer: { id: contactId, name: null },
            conversation: [],
            appointments: [],
            preferences: {},
            hasHistory: false,
            isReturningCustomer: false,
            lastInteraction: null,
            preferredProfessional: null,
            communicationStyle: 'formal'
        };
    }

    // Salvar preferências do cliente
    async saveCustomerPreferences(contactId, preferences) {
        try {
            const { data, error } = await supabaseAdmin
                .from('customer_preferences')
                .upsert({
                    contact_id: contactId,
                    ...preferences,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            
            // Limpar cache para forçar reload
            this.clearCustomerCache(contactId);
            
            return data;
        } catch (error) {
            console.error('❌ Erro salvando preferências:', error);
            return null;
        }
    }

    // Limpar cache de um cliente específico
    clearCustomerCache(contactId) {
        const keysToDelete = [];
        for (const key of this.contextCache.keys()) {
            if (key.startsWith(`${contactId}_`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.contextCache.delete(key));
    }

    // Limpar todo o cache
    clearAllCache() {
        this.contextCache.clear();
    }
}

module.exports = CustomerContext;

