// src/routes/instagram.js
const express = require('express');
const router = express.Router();
const InstagramProcessor = require('../services/instagram-processor');
const { validateChannelAccess } = require('../middleware/channel-validation');

const instagramProcessor = new InstagramProcessor();

// Verificação do webhook Instagram dinâmico por usuário
router.get('/webhook/:userId', (req, res) => {
    const { userId } = req.params;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log(`📸 Instagram webhook verificação para usuário: ${userId}`);

    // Verificação simples (pode ser melhorada validando token específico do usuário)
    if (mode === 'subscribe' && token && token.includes('verify_')) {
        console.log(`✅ Instagram webhook verificado para usuário: ${userId}`);
        res.status(200).send(challenge);
    } else {
        console.log(`❌ Instagram webhook verificação falhou para usuário: ${userId}`);
        res.status(403).send('Verificação falhou');
    }
});

// Receber mensagens do Instagram por usuário
router.post('/webhook/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const body = req.body;
        
        console.log(`📸 Instagram webhook recebido para usuário: ${userId}`);
        
        if (body.object === 'instagram') {
            for (const entry of body.entry) {
                if (entry.messaging) {
                    for (const messagingEvent of entry.messaging) {
                        if (messagingEvent.message) {
                            await instagramProcessor.processIncomingMessage({
                                sender: messagingEvent.sender,
                                message: messagingEvent.message,
                                timestamp: messagingEvent.timestamp
                            }, userId);
                        }
                    }
                }
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Erro no webhook Instagram:', error);
        res.status(500).send('Erro interno');
    }
});

// Enviar mensagem via Instagram (usando config do usuário)
router.post('/send', validateChannelAccess, async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { recipient_id, message, message_type } = req.body;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        if (!recipient_id || !message) {
            return res.status(400).json({
                success: false,
                error: 'Recipient ID e mensagem são obrigatórios'
            });
        }
        
        const result = await instagramProcessor.sendMessage(
            userId,
            recipient_id,
            message,
            message_type || 'text'
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Erro enviando mensagem Instagram:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Testar configuração do Instagram do usuário
router.get('/test', async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        // Testar se a configuração está funcionando
        const validation = await instagramProcessor.validateConfig(userId);
        
        res.json({
            success: validation.valid,
            config_valid: validation.valid,
            account_info: validation.account_info || null,
            error: validation.error || null,
            message: validation.valid 
                ? 'Instagram configurado corretamente' 
                : 'Instagram precisa de configuração ou tem erro'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Instagram não configurado'
        });
    }
});

// Obter informações da conta Instagram do usuário
router.get('/account-info', async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const accountInfo = await instagramProcessor.getAccountInfo(userId);
        
        res.json({
            success: true,
            account_info: accountInfo
        });
    } catch (error) {
        console.error('Erro obtendo info da conta Instagram:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Listar conversas do Instagram do usuário
router.get('/conversations', async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const { supabase } = require('../config/supabase');
        
        const { data: conversations, error } = await supabase
            .from('conversations')
            .select(`
                *,
                contacts (
                    id,
                    name,
                    instagram_id
                )
            `)
            .eq('user_id', userId)
            .eq('channel_type', 'instagram')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            conversations: conversations
        });
    } catch (error) {
        console.error('Erro listando conversas Instagram:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obter mensagens de uma conversa específica
router.get('/conversations/:conversationId/messages', async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        const { conversationId } = req.params;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const { supabase } = require('../config/supabase');
        
        // Verificar se a conversa pertence ao usuário
        const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', conversationId)
            .eq('user_id', userId)
            .eq('channel_type', 'instagram')
            .single();

        if (convError) {
            return res.status(404).json({
                success: false,
                error: 'Conversa não encontrada'
            });
        }

        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            messages: messages
        });
    } catch (error) {
        console.error('Erro buscando mensagens:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obter estatísticas da conta Instagram
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        // Buscar informações da conta
        const accountInfo = await instagramProcessor.getAccountInfo(userId);

        // Buscar mensagens dos últimos 30 dias
        const { supabase } = require('../config/supabase');
        const { data: messages, error } = await supabase
            .from('messages')
            .select('created_at, sender_type')
            .eq('channel_type', 'instagram')
            .eq('user_id', userId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        if (error) throw error;

        const receivedMessages = messages?.filter(m => m.sender_type === 'contact').length || 0;
        const sentMessages = messages?.filter(m => m.sender_type === 'user').length || 0;

        res.json({
            success: true,
            account_info: accountInfo,
            stats_last_30_days: {
                total_messages: messages?.length || 0,
                received_messages: receivedMessages,
                sent_messages: sentMessages
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Enviar mensagem de teste
router.post('/test-send', async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { recipient_id } = req.body;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        if (!recipient_id) {
            return res.status(400).json({
                success: false,
                error: 'Recipient ID é obrigatório'
            });
        }

        const testMessage = '📸 Teste de conexão do CRM!\n\nSeu Instagram Business está funcionando perfeitamente! ✅';
        
        const result = await instagramProcessor.sendMessage(
            userId,
            recipient_id,
            testMessage,
            'text'
        );

        res.json({
            success: true,
            message: 'Mensagem de teste enviada com sucesso!',
            data: result
        });
    } catch (error) {
        console.error('Erro enviando mensagem de teste:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Webhook para verificação (método GET para verificação inicial)
router.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('📸 Instagram webhook verificação geral');

    if (mode === 'subscribe' && token) {
        console.log('✅ Instagram webhook verificado (geral)');
        res.status(200).send(challenge);
    } else {
        console.log('❌ Instagram webhook verificação falhou (geral)');
        res.status(403).send('Verificação falhou');
    }
});

// Webhook para receber mensagens (método POST geral)
router.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        
        console.log('📸 Instagram webhook recebido (geral)');
        
        // Responder OK mesmo se não processar (evita reenvios do Facebook)
        res.status(200).send('OK');
    } catch (error) {
        console.error('Erro no webhook Instagram geral:', error);
        res.status(500).send('Erro interno');
    }
});

module.exports = router;