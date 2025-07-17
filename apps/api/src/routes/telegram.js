// src/routes/telegram.js
const express = require('express');
const router = express.Router();
const TelegramProcessor = require('../services/telegram-processor');
const { validateChannelAccess } = require('../middleware/channel-validation');
const { checkCompliance } = require('../middleware/compliance-middleware');
router.use(express.json({ limit: '50mb' }));
router.use(express.urlencoded({ extended: true }));
// ✅ ADICIONAR ESTA LINHA AQUI:
const telegramProcessor = new TelegramProcessor();

// Rota raiz para status do Telegram - ADICIONAR AQUI
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
        console.log('📦 Body:', req.body ? 'OK' : 'UNDEFINED');
        
        await telegramProcessor.processUpdate(req, res);
        
        // Garantir que sempre responde
        if (!res.headersSent) {
            res.status(200).json({ status: 'processed' });
        }
        
    } catch (error) {
        console.error('❌ Erro no webhook Telegram:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Erro interno' });
        }
    }
});

// Enviar mensagem (usando config do usuário)
router.post('/send', validateChannelAccess, checkCompliance, async (req, res) => {
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

                // ADICIONAR log de compliance se disponível
        if (req.complianceInfo) {
            console.log(`✅ Compliance Telegram OK - ${req.complianceInfo.remainingHours?.toFixed(1)}h restantes`);
        }

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

// 🏗️ SISTEMA DEFINITIVO DE WEBHOOK
router.post('/setup-webhook', async (req, res) => {
    try {
        const { bot_token, user_id } = req.body;
        
        if (!bot_token || !user_id) {
            return res.status(400).json({ error: 'Token e user_id obrigatórios' });
        }

        const { getWebhookBaseUrl, shouldAutoConfigureWebhook } = require('../utils/environment');
        
        const webhookUrl = `${getWebhookBaseUrl()}/api/telegram/webhook/${user_id}`;
        
        console.log('🔗 Webhook URL:', webhookUrl);
        console.log('🌐 Auto-configurar:', shouldAutoConfigureWebhook());

        // ✅ LÓGICA DEFINITIVA
        if (shouldAutoConfigureWebhook()) {
            // PRODUÇÃO: Configurar automaticamente
            try {
                const response = await fetch(`https://api.telegram.org/bot${bot_token}/setWebhook`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: webhookUrl,
                        allowed_updates: ['message', 'callback_query']
                    })
                });

                const result = await response.json();
                
                if (result.ok) {
                    console.log('✅ Webhook configurado automaticamente!');
                    res.json({ 
                        success: true, 
                        auto_configured: true,
                        webhook_url: webhookUrl,
                        environment: 'production',
                        message: '✅ Bot conectado e funcionando!'
                    });
                } else {
                    console.error('❌ Erro do Telegram:', result);
                    res.status(400).json({ 
                        error: 'Erro configurando webhook: ' + result.description,
                        telegram_response: result 
                    });
                }
            } catch (error) {
                console.error('❌ Erro na configuração automática:', error);
                res.status(500).json({ error: 'Erro interno configurando webhook' });
            }
        } else {
            // DESENVOLVIMENTO: Instruções manuais
            res.json({ 
                success: true, 
                auto_configured: false,
                webhook_url: webhookUrl,
                environment: 'development',
                manual_setup: {
                    message: '⚠️ Configuração manual necessária (desenvolvimento)',
                    instructions: [
                        '1. Use ngrok para expor localhost: ngrok http 3001',
                        '2. Copie a URL HTTPS do ngrok',
                        '3. Configure manualmente: https://api.telegram.org/bot' + bot_token + '/setWebhook?url=SUA_URL_NGROK/api/telegram/webhook/' + user_id,
                        '4. Ou aguarde deploy em produção para configuração automática'
                    ],
                    webhook_url_template: webhookUrl
                }
            });
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

// 🆕 ROTA: Configurar webhook automaticamente
router.post('/setup-webhook', async (req, res) => {
    try {
        const { bot_token, user_id } = req.body;
        
        if (!bot_token || !user_id) {
            return res.status(400).json({ error: 'Token e user_id obrigatórios' });
        }

        const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3001'}/api/telegram/webhook/${user_id}`;
        
        console.log('🔗 Configurando webhook:', webhookUrl);
        
        // Configurar webhook na API do Telegram
        const response = await fetch(`https://api.telegram.org/bot${bot_token}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: webhookUrl,
                allowed_updates: ['message', 'callback_query']
            })
        });

        const result = await response.json();
        
        if (result.ok) {
            console.log('✅ Webhook configurado com sucesso!');
            res.json({ 
                success: true, 
                webhook_url: webhookUrl,
                telegram_response: result 
            });
        } else {
            console.error('❌ Erro do Telegram:', result);
            res.status(400).json({ error: 'Erro configurando webhook: ' + result.description });
        }

    } catch (error) {
        console.error('❌ Erro configurando webhook:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// 🆕 ADICIONAR AQUI - ROTA WEBHOOK RECEBER MENSAGENS
router.post('/webhook/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const update = req.body;
        
        console.log('📱 Webhook recebido:', { userId, hasMessage: !!update.message });
        console.log('🐛 DEBUG - req.body webhook:', JSON.stringify(req.body, null, 2));
        console.log('🐛 DEBUG - req.params.userId:', req.params.userId);

        if (update.message) {
            // Usar o telegram-processor que já tem IA integrada!
            const TelegramProcessor = require('../services/telegram-processor');
            const processor = new TelegramProcessor();
            
            await processor.processMessage(update.message, userId);
        }

        res.status(200).json({ success: true });
        
    } catch (error) {
        console.error('❌ Erro processando webhook:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

module.exports = router;