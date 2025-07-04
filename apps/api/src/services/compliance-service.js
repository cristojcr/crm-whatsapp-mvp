// apps/api/src/services/compliance-service.js
const { supabase } = require('../config/supabase');

class ComplianceService {
    
    // Verificar se pode enviar mensagem (compliance check principal)
    static async canSendMessage(conversationId, channelType, userId) {
        try {
            console.log(`🔍 Verificando compliance para conversa ${conversationId} no canal ${channelType}`);
            
            // Buscar janela ativa
            const window = await this.getActiveWindow(conversationId, channelType);
            
            if (!window) {
                console.log('❌ Nenhuma janela encontrada - não pode enviar');
                return {
                    canSend: false,
                    reason: 'NO_WINDOW',
                    message: 'Nenhuma interação do cliente encontrada'
                };
            }
            
            const now = new Date();
            const expiresAt = new Date(window.window_expires_at);
            
            if (now <= expiresAt) {
                const remainingHours = (expiresAt - now) / (1000 * 60 * 60);
                console.log(`✅ Janela ativa - ${remainingHours.toFixed(1)}h restantes`);
                
                return {
                    canSend: true,
                    window: window,
                    remainingHours: remainingHours,
                    expiresAt: expiresAt
                };
            } else {
                console.log('⏰ Janela expirada - só templates aprovados');
                
                return {
                    canSend: false,
                    reason: 'WINDOW_EXPIRED',
                    message: 'Janela de 24h expirada - use template aprovado',
                    window: window,
                    expiredHours: (now - expiresAt) / (1000 * 60 * 60)
                };
            }
            
        } catch (error) {
            console.error('❌ Erro ao verificar compliance:', error);
            return {
                canSend: false,
                reason: 'ERROR',
                message: 'Erro interno na verificação'
            };
        }
    }
    
    // Registrar nova mensagem do cliente (abre/renova janela)
    static async registerCustomerMessage(conversationId, channelType, contactPhone, userId) {
        try {
            console.log(`📝 Registrando mensagem do cliente - conversa ${conversationId}`);
            
            const now = new Date();
            const expiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // +24h
            
            // Upsert da janela (criar ou atualizar)
            const { data, error } = await supabase
                .from('message_windows')
                .upsert({
                    conversation_id: conversationId,
                    channel_type: channelType,
                    contact_phone: contactPhone,
                    user_id: userId,
                    last_customer_message_at: now.toISOString(),
                    window_expires_at: expiresAt.toISOString(),
                    window_status: 'open'
                }, {
                    onConflict: 'conversation_id,channel_type'
                })
                .select()
                .single();
                
            if (error) {
                console.error('❌ Erro ao registrar janela:', error);
                return null;
            }
            
            console.log(`✅ Janela registrada - expira em ${expiresAt.toISOString()}`);
            
            // Processar fila de mensagens pendentes
            await this.processQueueForConversation(conversationId);
            
            return data;
            
        } catch (error) {
            console.error('❌ Erro ao registrar mensagem do cliente:', error);
            return null;
        }
    }
    
    // Buscar janela ativa
    static async getActiveWindow(conversationId, channelType) {
        try {
            const { data, error } = await supabase
                .from('message_windows')
                .select('*')
                .eq('conversation_id', conversationId)
                .eq('channel_type', channelType)
                .single();
                
            if (error && error.code !== 'PGRST116') { // Não encontrado é ok
                console.error('❌ Erro ao buscar janela:', error);
                return null;
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ Erro ao buscar janela ativa:', error);
            return null;
        }
    }
    
    // Adicionar mensagem à fila (quando não pode enviar)
    static async addToQueue(conversationId, userId, channelType, recipientPhone, messageContent, messageType = 'text') {
        try {
            console.log(`📋 Adicionando mensagem à fila - conversa ${conversationId}`);
            
            const { data, error } = await supabase
                .from('message_queue')
                .insert({
                    conversation_id: conversationId,
                    user_id: userId,
                    channel_type: channelType,
                    recipient_phone: recipientPhone,
                    message_type: messageType,
                    message_content: messageContent,
                    queue_status: 'waiting_window'
                })
                .select()
                .single();
                
            if (error) {
                console.error('❌ Erro ao adicionar à fila:', error);
                return null;
            }
            
            console.log(`✅ Mensagem adicionada à fila: ${data.id}`);
            return data;
            
        } catch (error) {
            console.error('❌ Erro ao adicionar mensagem à fila:', error);
            return null;
        }
    }
    
    // Processar fila de mensagens pendentes
    static async processQueueForConversation(conversationId) {
        try {
            console.log(`🔄 Processando fila para conversa ${conversationId}`);
            
            // Buscar mensagens pendentes
            const { data: queuedMessages, error } = await supabase
                .from('message_queue')
                .select('*')
                .eq('conversation_id', conversationId)
                .eq('queue_status', 'waiting_window')
                .order('created_at', { ascending: true });
                
            if (error) {
                console.error('❌ Erro ao buscar fila:', error);
                return;
            }
            
            if (!queuedMessages || queuedMessages.length === 0) {
                console.log('✅ Nenhuma mensagem na fila');
                return;
            }
            
            console.log(`📋 ${queuedMessages.length} mensagens na fila para processar`);
            
            // Importar message processor
            const { processOutgoingMessage } = require('./message-processor');
            
            // Processar cada mensagem
            for (const message of queuedMessages) {
                try {
                    console.log(`📤 Enviando mensagem da fila: ${message.id}`);
                    
                    // Tentar enviar mensagem
                    const sent = await processOutgoingMessage(
                        message.channel_type,
                        message.recipient_phone,
                        message.message_content,
                        message.user_id
                    );
                    
                    if (sent) {
                        // Marcar como enviada
                        await supabase
                            .from('message_queue')
                            .update({ 
                                queue_status: 'sent',
                                last_attempt_at: new Date().toISOString()
                            })
                            .eq('id', message.id);
                            
                        console.log(`✅ Mensagem enviada da fila: ${message.id}`);
                    } else {
                        // Incrementar tentativas
                        await supabase
                            .from('message_queue')
                            .update({ 
                                attempts: message.attempts + 1,
                                last_attempt_at: new Date().toISOString(),
                                queue_status: message.attempts + 1 >= message.max_attempts ? 'failed' : 'waiting_window'
                            })
                            .eq('id', message.id);
                            
                        console.log(`❌ Falha ao enviar mensagem da fila: ${message.id}`);
                    }
                    
                } catch (messageError) {
                    console.error(`❌ Erro ao processar mensagem da fila ${message.id}:`, messageError);
                }
            }
            
        } catch (error) {
            console.error('❌ Erro ao processar fila:', error);
        }
    }
    
    // Buscar templates aprovados
    static async getApprovedTemplates(userId, channelType) {
        try {
            const { data, error } = await supabase
                .from('approved_templates')
                .select('*')
                .eq('user_id', userId)
                .eq('channel_type', channelType)
                .eq('template_status', 'APPROVED')
                .order('created_at', { ascending: false });
                
            if (error) {
                console.error('❌ Erro ao buscar templates:', error);
                return [];
            }
            
            return data || [];
            
        } catch (error) {
            console.error('❌ Erro ao buscar templates aprovados:', error);
            return [];
        }
    }
    
    // Verificar janelas expiradas (executar via cron)
    static async checkExpiredWindows() {
        try {
            console.log('🔍 Verificando janelas expiradas...');
            
            const now = new Date().toISOString();
            
            const { data, error } = await supabase
                .from('message_windows')
                .update({ window_status: 'expired' })
                .lt('window_expires_at', now)
                .eq('window_status', 'open')
                .select();
                
            if (error) {
                console.error('❌ Erro ao atualizar janelas expiradas:', error);
                return;
            }
            
            if (data && data.length > 0) {
                console.log(`⏰ ${data.length} janelas marcadas como expiradas`);
            }
            
        } catch (error) {
            console.error('❌ Erro ao verificar janelas expiradas:', error);
        }
    }
}

module.exports = ComplianceService;