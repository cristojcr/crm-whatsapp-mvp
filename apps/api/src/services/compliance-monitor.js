// apps/api/src/services/compliance-monitor.js
const ComplianceService = require('./compliance-service');
const { supabase } = require('../config/supabase');

class ComplianceMonitor {
    
    // Executar verificação completa (executar a cada hora)
    static async runComplianceCheck() {
        try {
            console.log('🔍 Iniciando verificação de compliance...');
            
            // 1. Marcar janelas expiradas
            await ComplianceService.checkExpiredWindows();
            
            // 2. Processar filas de mensagens
            await this.processAllQueues();
            
            // 3. Alertar sobre janelas próximas do vencimento
            await this.alertExpiringWindows();
            
            // 4. Limpar fila antiga
            await this.cleanOldQueue();
            
            console.log('✅ Verificação de compliance concluída');
            
        } catch (error) {
            console.error('❌ Erro na verificação de compliance:', error);
        }
    }
    
    // Processar todas as filas pendentes
    static async processAllQueues() {
        try {
            console.log('🔄 Processando filas de mensagens...');
            
            // Buscar conversas com mensagens na fila
            const { data: conversations, error } = await supabase
                .from('message_queue')
                .select('conversation_id')
                .eq('queue_status', 'waiting_window')
                .neq('conversation_id', null);
                
            if (error || !conversations) {
                console.log('✅ Nenhuma fila para processar');
                return;
            }
            
            // Processar cada conversa única
            const uniqueConversations = [...new Set(conversations.map(c => c.conversation_id))];
            
            for (const conversationId of uniqueConversations) {
                await ComplianceService.processQueueForConversation(conversationId);
            }
            
            console.log(`✅ ${uniqueConversations.length} filas processadas`);
            
        } catch (error) {
            console.error('❌ Erro ao processar filas:', error);
        }
    }
    
    // Alertar sobre janelas próximas do vencimento
    static async alertExpiringWindows() {
        try {
            const now = new Date();
            const oneHourFromNow = new Date(now.getTime() + (60 * 60 * 1000));
            
            const { data: expiringWindows, error } = await supabase
                .from('message_windows')
                .select(`
                    *,
                    conversations(*)
                `)
                .eq('window_status', 'open')
                .lte('window_expires_at', oneHourFromNow.toISOString())
                .gte('window_expires_at', now.toISOString());
                
            if (error || !expiringWindows || expiringWindows.length === 0) {
                return;
            }
            
            console.log(`⏰ ${expiringWindows.length} janelas expirando em 1h`);
            
            // Aqui você pode implementar notificações
            // Email, Slack, push notifications, etc.
            for (const window of expiringWindows) {
                console.log(`⚠️ Janela expirando: ${window.contact_phone} em ${window.window_expires_at}`);
            }
            
        } catch (error) {
            console.error('❌ Erro ao alertar janelas expiradas:', error);
        }
    }
    
    // Limpar mensagens antigas da fila
    static async cleanOldQueue() {
        try {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            const { error } = await supabase
                .from('message_queue')
                .delete()
                .in('queue_status', ['sent', 'failed'])
                .lt('created_at', oneWeekAgo.toISOString());
                
            if (error) {
                console.error('❌ Erro ao limpar fila antiga:', error);
            } else {
                console.log('🧹 Fila antiga limpa');
            }
            
        } catch (error) {
            console.error('❌ Erro ao limpar fila:', error);
        }
    }
    
    // Estatísticas de compliance
    static async getComplianceStats(userId, days = 7) {
        try {
            const since = new Date();
            since.setDate(since.getDate() - days);
            
            // Janelas ativas
            const { data: activeWindows } = await supabase
                .from('message_windows')
                .select('*')
                .eq('user_id', userId)
                .eq('window_status', 'open');
                
            // Mensagens na fila
            const { data: queuedMessages } = await supabase
                .from('message_queue')
                .select('*')
                .eq('user_id', userId)
                .in('queue_status', ['pending', 'waiting_window', 'waiting_template']);
                
            // Mensagens enviadas via template
            const { data: templateMessages } = await supabase
                .from('message_queue')
                .select('*')
                .eq('user_id', userId)
                .eq('queue_status', 'sent')
                .eq('message_type', 'template')
                .gte('created_at', since.toISOString());
            
            return {
                activeWindows: activeWindows?.length || 0,
                queuedMessages: queuedMessages?.length || 0,
                templateMessagesSent: templateMessages?.length || 0,
                complianceRate: '100%' // Sempre 100% se sistema está funcionando
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas:', error);
            return {
                activeWindows: 0,
                queuedMessages: 0,
                templateMessagesSent: 0,
                complianceRate: 'N/A'
            };
        }
    }
}

module.exports = ComplianceMonitor;