// src/routes/telegram-setup.js
// ID 2.12 - FUNCIONALIDADE EXTRA: API de Setup de Bot Telegram
// Rotas para criação automática e configuração manual de bots Telegram
// Endpoints: POST /create-bot, POST /configure-bot, GET /test-bot
const express = require('express');
const router = express.Router();
const TelegramBotCreator = require('../services/telegram-bot-creator');
const TelegramProcessor = require('../services/telegram-processor_v2');
const { supabase } = require('../config/supabase');

const botCreator = new TelegramBotCreator();
const telegramProcessor = new TelegramProcessor();

// Criar bot automaticamente (funcionalidade principal para usuários leigos)
router.post('/create-bot', async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { email, password, botName, botUsername } = req.body;

        console.log(`🤖 Solicitação de criação automática de bot para usuário: ${userId}`);

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!email || !password || !botName || !botUsername) {
            return res.status(400).json({
                success: false,
                error: 'Email, senha, nome do bot e username são obrigatórios',
                code: 'MISSING_FIELDS',
                required_fields: ['email', 'password', 'botName', 'botUsername']
            });
        }

        // Verificar se username está no formato correto
        if (!botUsername.endsWith('_bot')) {
            return res.status(400).json({
                success: false,
                error: 'Username deve terminar com "_bot"',
                code: 'INVALID_USERNAME_FORMAT',
                example: 'clinicamaria_bot'
            });
        }

        // Verificar se usuário já tem um bot Telegram ativo
        const { data: existingChannel, error: checkError } = await supabase
            .from('user_channels')
            .select('id, channel_config')
            .eq('user_id', userId)
            .eq('channel_type', 'telegram')
            .eq('is_active', true)
            .single();

        if (existingChannel) {
            return res.status(409).json({
                success: false,
                error: 'Usuário já possui um bot Telegram ativo',
                code: 'BOT_ALREADY_EXISTS',
                existing_bot: existingChannel.channel_config.bot_username,
                suggestion: 'Desative o bot atual ou use configuração manual'
            });
        }

        // Verificar plano do usuário (validação de negócio)
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('plan')
            .eq('id', userId)
            .single();

        if (userError) {
            return res.status(500).json({
                success: false,
                error: 'Erro ao verificar plano do usuário',
                code: 'USER_PLAN_ERROR'
            });
        }

        if (user.plan === 'basic') {
            return res.status(403).json({
                success: false,
                error: 'Plano Básico não permite Telegram',
                code: 'PLAN_RESTRICTION',
                current_plan: 'basic',
                required_plan: 'pro',
                upgrade_url: '/dashboard/billing'
            });
        }

        // Tentar criar o bot
        const result = await botCreator.createBotForUser(userId, {
            email,
            password,
            botName,
            botUsername
        });

        // Log de sucesso
        console.log(`✅ Bot criado com sucesso para usuário ${userId}: @${result.bot_info.username}`);

        res.json({
            success: true,
            message: 'Bot Telegram criado com sucesso!',
            data: result,
            setup_complete: true
        });

    } catch (error) {
        console.error('Erro criando bot automaticamente:', error);
        
        // Tratamento de erros específicos
        if (error.message.includes('Username já em uso')) {
            res.status(409).json({
                success: false,
                error: 'Username já está sendo usado por outro bot',
                code: 'USERNAME_TAKEN',
                suggestion: 'Tente outro username'
            });
        } else if (error.message.includes('Token inválido')) {
            res.status(400).json({
                success: false,
                error: 'Credenciais do Telegram inválidas',
                code: 'INVALID_TELEGRAM_CREDENTIALS'
            });
        } else {
            res.status(500).json({
                success: false,
                error: error.message,
                code: 'CREATION_FAILED'
            });
        }
    }
});

// Configurar bot manualmente (para usuários avançados)
router.post('/configure-bot', async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { bot_token, bot_username } = req.body;

        console.log(`🔧 Configuração manual de bot para usuário: ${userId}`);

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        if (!bot_token) {
            return res.status(400).json({
                success: false,
                error: 'Token do bot é obrigatório',
                code: 'MISSING_BOT_TOKEN',
                help: 'Obtenha o token conversando com @BotFather no Telegram'
            });
        }

        // Verificar se token tem formato válido
        const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
        if (!tokenPattern.test(bot_token)) {
            return res.status(400).json({
                success: false,
                error: 'Formato do token inválido',
                code: 'INVALID_TOKEN_FORMAT',
                expected_format: '123456789:AAF...'
            });
        }

        // Verificar se bot é válido
        const verification = await botCreator.verifyBot(bot_token);
        
        if (!verification.valid) {
            return res.status(400).json({
                success: false,
                error: 'Token do bot inválido',
                code: 'INVALID_BOT_TOKEN',
                details: verification.error
            });
        }

        const botInfo = verification.bot_info;

        // Verificar se bot já está sendo usado por outro usuário
        const { data: existingBot, error: existingError } = await supabase
            .from('user_channels')
            .select('user_id, channel_config')
            .eq('channel_type', 'telegram')
            .eq('is_active', true);

        if (existingBot) {
            for (const channel of existingBot) {
                if (channel.channel_config.bot_token === bot_token && channel.user_id !== userId) {
                    return res.status(409).json({
                        success: false,
                        error: 'Este bot já está sendo usado por outro usuário',
                        code: 'BOT_IN_USE'
                    });
                }
            }
        }

        // Configurar bot usando o serviço
        const result = await botCreator.setupManualBot(userId, bot_token, bot_username);

        console.log(`✅ Bot configurado manualmente: @${botInfo.username}`);

        res.json({
            success: true,
            message: 'Bot configurado com sucesso!',
            data: result,
            setup_method: 'manual'
        });

    } catch (error) {
        console.error('Erro configurando bot manualmente:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'CONFIGURATION_FAILED'
        });
    }
});

// Testar bot existente do usuário
router.get('/test-bot', async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        console.log(`🧪 Testando bot do usuário: ${userId}`);

        const result = await botCreator.testUserBot(userId);

        if (result.success) {
            res.json({
                success: true,
                message: 'Bot está funcionando perfeitamente!',
                data: result
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error,
                code: 'BOT_TEST_FAILED'
            });
        }

    } catch (error) {
        console.error('Erro testando bot:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'TEST_ERROR'
        });
    }
});

// Enviar mensagem de teste via bot do usuário
router.post('/send-test-message', async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { chat_id, custom_message } = req.body;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        if (!chat_id) {
            return res.status(400).json({
                success: false,
                error: 'Chat ID é obrigatório',
                help: 'Use o chat ID de um contato ou grupo'
            });
        }

        const testMessage = custom_message || `🤖 Teste do CRM\n\nSeu bot Telegram está funcionando!\n\n✅ Status: Ativo\n📅 Data: ${new Date().toLocaleString('pt-BR')}\n\nAgora seus clientes podem conversar com você! 🎉`;
        
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
            error: error.message,
            code: 'SEND_TEST_FAILED'
        });
    }
});

// Listar bots do usuário (histórico e status)
router.get('/my-bots', async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const { data: channels, error } = await supabase
            .from('user_channels')
            .select('*')
            .eq('user_id', userId)
            .eq('channel_type', 'telegram')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Remover dados sensíveis antes de retornar
        const safeBots = channels.map(channel => ({
            id: channel.id,
            bot_name: channel.channel_config.bot_name,
            bot_username: channel.channel_config.bot_username,
            is_active: channel.is_active,
            is_primary: channel.is_primary,
            created_automatically: channel.channel_config.created_automatically,
            created_at: channel.created_at,
            webhook_url: channel.channel_config.webhook_url,
            status: channel.is_active ? 'active' : 'inactive'
        }));

        res.json({
            success: true,
            bots: safeBots,
            total: safeBots.length,
            active_count: safeBots.filter(bot => bot.is_active).length
        });

    } catch (error) {
        console.error('Erro listando bots:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Remover bot do usuário
router.delete('/remove-bot/:channelId', async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { channelId } = req.params;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const result = await botCreator.removeBotFromUser(userId, channelId);

        res.json({
            success: true,
            message: result.message,
            note: result.note
        });

    } catch (error) {
        console.error('Erro removendo bot:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obter instruções de setup para usuários
router.get('/setup-instructions', (req, res) => {
    res.json({
        success: true,
        instructions: {
            automatic_setup: {
                title: "Criação Automática (Recomendado)",
                description: "Criamos o bot automaticamente para você",
                steps: [
                    "1. Informe seu email/telefone do Telegram",
                    "2. Informe sua senha do Telegram", 
                    "3. Escolha o nome do seu bot",
                    "4. Escolha o username (deve terminar com _bot)",
                    "5. Clique em 'Criar Bot Automaticamente'"
                ],
                time_estimate: "2-3 minutos",
                difficulty: "Muito Fácil"
            },
            manual_setup: {
                title: "Configuração Manual (Avançado)",
                description: "Para usuários que já têm um bot",
                steps: [
                    "1. Acesse @BotFather no Telegram",
                    "2. Digite /newbot",
                    "3. Informe o nome do bot",
                    "4. Informe o username (termine com _bot)",
                    "5. Copie o token que o BotFather enviar",
                    "6. Cole o token no campo abaixo"
                ],
                time_estimate: "5-10 minutos", 
                difficulty: "Médio"
            }
        },
        help: {
            common_issues: [
                "Username já em uso: Tente outro username único",
                "Token inválido: Verifique se copiou corretamente do @BotFather",
                "Bot não responde: Verifique se o webhook está configurado"
            ],
            support_contact: "Entre em contato com o suporte se precisar de ajuda"
        }
    });
});

module.exports = router;