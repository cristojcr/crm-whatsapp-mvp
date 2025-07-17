// src/routes/telegram.js
const express = require('express');
const router = express.Router();
// ✅ MUDANÇA 1: Apontando para o arquivo renomeado
const TelegramProcessor = require('../services/telegram-processor_v2.js'); 
const { validateChannelAccess } = require('../middleware/channel-validation');
const { checkCompliance } = require('../middleware/compliance-middleware');

router.use(express.json({ limit: '50mb' }));
router.use(express.urlencoded({ extended: true }));

const telegramProcessor = new TelegramProcessor();

// Rota raiz para status
router.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'telegram',
    message: 'Telegram API ativa',
    status: 'operational',
    available_endpoints: [
      'GET /test - Testar configuração',
      'POST /send - Enviar mensagem',
      'GET /conversations - Listar conversas',
      'GET /me - Info do bot',
      'POST /test-send - Enviar teste'
    ],
    timestamp: new Date().toISOString()
  });
});

// Webhook dinâmico por usuário: /api/webhook/telegram/:userId
router.post('/webhook/:userId', async (req, res) => {
    try {
        console.log('📱 Telegram webhook recebido para usuário:', req.params.userId);
        await telegramProcessor.processUpdate(req, res);
        
        if (!res.headersSent) {
            res.status(200).json({ status: 'processed' });
        }
    } catch (error) {
        console.error('❌ Erro no webhook Telegram:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Erro interno no webhook' });
        }
    }
});

// Enviar mensagem (usando config do usuário)
router.post('/send', validateChannelAccess, checkCompliance, async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { chat_id, message, options } = req.body;
        
        if (!userId || !chat_id || !message) {
            return res.status(400).json({ error: 'userId, chat_id e message são obrigatórios' });
        }
        
        const result = await telegramProcessor.sendMessage(userId, chat_id, message, options || {});

        if (req.complianceInfo) {
            console.log(`✅ Compliance Telegram OK - ${req.complianceInfo.remainingHours?.toFixed(1)}h restantes`);
        }

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Erro enviando mensagem Telegram:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sistema de setup de webhook
router.post('/setup-webhook', async (req, res) => {
    try {
        const { bot_token, user_id } = req.body;
        if (!bot_token || !user_id) {
            return res.status(400).json({ error: 'Token e user_id obrigatórios' });
        }

        const { getWebhookBaseUrl, shouldAutoConfigureWebhook } = require('../utils/environment');
        const webhookUrl = `${getWebhookBaseUrl()}/api/telegram/webhook/${user_id}`;
        
        if (shouldAutoConfigureWebhook()) {
            const response = await fetch(`https://api.telegram.org/bot${bot_token}/setWebhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'callback_query'] } )
            });
            const result = await response.json();
            if (result.ok) {
                res.json({ success: true, auto_configured: true, webhook_url: webhookUrl, environment: 'production', message: '✅ Bot conectado e funcionando!' });
            } else {
                res.status(400).json({ error: 'Erro configurando webhook: ' + result.description, telegram_response: result });
            }
        } else {
            res.json({ success: true, auto_configured: false, webhook_url: webhookUrl, environment: 'development', manual_setup: { /* ... */ } });
        }
    } catch (error) {
        console.error('❌ Erro configurando webhook:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Testar configuração do Telegram do usuário
router.get('/test', async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

        const botConfig = await telegramProcessor.getUserBotConfig(userId);
        if (!botConfig) return res.status(404).json({ error: 'Configuração do bot não encontrada' });
        
        const axios = require('axios');
        const response = await axios.get(`https://api.telegram.org/bot${botConfig.bot_token}/getMe` );
        
        res.json({ success: true, config_valid: response.data.ok, bot_info: response.data.result, message: 'Telegram configurado corretamente' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message, message: 'Telegram não configurado ou com erro' });
    }
});

// Obter informações do bot do usuário
router.get('/me', async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

        const botConfig = await telegramProcessor.getUserBotConfig(userId);
        if (!botConfig) return res.status(404).json({ error: 'Configuração do bot não encontrada' });
        
        const axios = require('axios');
        const response = await axios.get(`https://api.telegram.org/bot${botConfig.bot_token}/getMe` );
        
        res.json({ success: true, bot_info: response.data.result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Listar conversas do Telegram do usuário
router.get('/conversations', async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

        // ✅ MUDANÇA APLICADA: Usa a instância centralizada
        const { data: conversations, error } = await telegramProcessor.supabase
            .from('conversations')
            .select('*, contacts (id, name, telegram_id, telegram_username)')
            .eq('user_id', userId)
            .eq('channel_type', 'telegram')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, conversations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obter mensagens de uma conversa específica
router.get('/conversations/:conversationId/messages', async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        const { conversationId } = req.params;
        if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

        // ✅ MUDANÇA APLICADA: Usa a instância centralizada
        const { data: conversation, error: convError } = await telegramProcessor.supabase
            .from('conversations')
            .select('id')
            .eq('id', conversationId)
            .eq('user_id', userId)
            .single();

        if (convError) return res.status(404).json({ error: 'Conversa não encontrada' });

        // ✅ MUDANÇA APLICADA: Usa a instância centralizada
        const { data: messages, error } = await telegramProcessor.supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json({ success: true, messages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Enviar mensagem de teste
router.post('/test-send', async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { chat_id } = req.body;
        if (!userId || !chat_id) return res.status(400).json({ error: 'userId e chat_id são obrigatórios' });

        const testMessage = '🤖 Teste de conexão do CRM!\n\nSeu bot Telegram está funcionando perfeitamente! ✅';
        const result = await telegramProcessor.sendMessage(userId, chat_id, testMessage);
        res.json({ success: true, message: 'Mensagem de teste enviada com sucesso!', data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Rota de setup de webhook duplicada foi removida para evitar conflitos.

module.exports = router;