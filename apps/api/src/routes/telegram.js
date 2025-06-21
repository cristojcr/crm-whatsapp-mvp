// src/routes/telegram.js
const express = require('express');
const router = express.Router();
const TelegramProcessor = require('../services/telegram-processor');
const { validateChannelAccess } = require('../middleware/channel-validation');

const telegramProcessor = new TelegramProcessor();

// Webhook dinâmico por usuário: /api/webhook/telegram/:userId
router.post('/webhook/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const update = req.body;
        
        console.log(`📱 Telegram webhook recebido para usuário: ${userId}`);
        
        if (update.message || update.callback_query) {
            await telegramProcessor.processUpdate(update, userId);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Erro no webhook Telegram:', error);
        res.status(500).send('Erro interno');
    }
});

// Enviar mensagem (usando config do usuário)
router.post('/send', validateChannelAccess, async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { chat_id, message, options } = req.body;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        if (!chat_id || !message) {
            return res.status(400).json({
                success: false,
                error: 'Chat ID e mensagem são obrigatórios'
            });
        }
        
        const result = await telegramProcessor.sendMessage(
            userId,
            chat_id,
            message,
            options || {}
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Erro enviando mensagem Telegram:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Configurar webhook do Telegram para usuário específico
router.post('/setup-webhook', async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/webhook/telegram/${userId}`;
        const result = await telegramProcessor.setWebhook(userId, webhookUrl);
        
        res.json({
            success: true,
            webhook_url: webhookUrl,
            data: result
        });
    } catch (error) {
        console.error('Erro configurando webhook Telegram:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Testar configuração do Telegram do usuário
router.get('/test', async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        // Buscar configuração do usuário
        const botConfig = await telegramProcessor.getUserBotConfig(userId);
        
        // Testar se bot está funcionando
        const axios = require('axios');
        const response = await axios.get(`https://api.telegram.org/bot${botConfig.bot_token}/getMe`);
        
        res.json({
            success: true,
            config_valid: response.data.ok,
            bot_info: response.data.result,
            message: 'Telegram configurado corretamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Telegram não configurado ou com erro'
        });
    }
});

// Obter informações do bot do usuário
router.get('/me', async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const botConfig = await telegramProcessor.getUserBotConfig(userId);
        
        const axios = require('axios');
        const response = await axios.get(`https://api.telegram.org/bot${botConfig.bot_token}/getMe`);
        
        res.json({
            success: true,
            bot_info: response.data.result
        });
    } catch (error) {
        console.error('Erro obtendo info do bot:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Listar conversas do Telegram do usuário
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
                    telegram_id,
                    telegram_username
                )
            `)
            .eq('user_id', userId)
            .eq('channel_type', 'telegram')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            conversations: conversations
        });
    } catch (error) {
        console.error('Erro listando conversas Telegram:', error);
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
            .eq('channel_type', 'telegram')
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

// Enviar mensagem de teste
router.post('/test-send', async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { chat_id } = req.body;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        if (!chat_id) {
            return res.status(400).json({
                success: false,
                error: 'Chat ID é obrigatório'
            });
        }

        const testMessage = '🤖 Teste de conexão do CRM!\n\nSeu bot Telegram está funcionando perfeitamente! ✅';
        
        const result = await telegramProcessor.sendMessage(
            userId,
            chat_id,
            testMessage
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

module.exports = router;