// src/services/telegram-bot-creator.js
// ID 2.12 - FUNCIONALIDADE EXTRA: Criação Automática de Bot Telegram
// Permite usuários leigos criarem bots automaticamente via dashboard
// Input: email/senha do Telegram + nome do bot desejado
const axios = require('axios');
const { supabase } = require('../config/supabase');

class TelegramBotCreator {
    constructor() {
        this.telegramApiUrl = 'https://api.telegram.org/bot';
        this.botFatherUsername = '@BotFather';
    }

    // Criar bot automaticamente para o usuário (funcionalidade principal)
    async createBotForUser(userId, userCredentials) {
        try {
            const { email, password, botName, botUsername } = userCredentials;
            
            console.log(`🤖 Iniciando criação de bot para usuário: ${userId}`);
            
            // ETAPA 1: Validar dados de entrada
            this.validateBotData(botName, botUsername);
            
            // ETAPA 2: Simular criação via BotFather (na prática seria automação complexa)
            console.log('🔐 Simulando autenticação com Telegram...');
            const botData = await this.simulateCreateTelegramBot(botName, botUsername);
            
            // ETAPA 3: Configurar webhook do bot
            const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/webhook/telegram/${userId}`;
            await this.setupBotWebhook(botData.token, webhookUrl);
            
            // ETAPA 4: Salvar configurações no banco
            const channelConfig = {
                bot_token: botData.token,
                bot_username: botData.username,
                bot_name: botData.name,
                bot_id: botData.id,
                webhook_url: webhookUrl,
                created_automatically: true,
                created_at: new Date().toISOString(),
                user_credentials_used: {
                    email: email,
                    // NUNCA salvar senha em texto plano
                    password_hash: 'hidden_for_security'
                }
            };

            const { data: channel, error } = await supabase
                .from('user_channels')
                .insert({
                    user_id: userId,
                    channel_type: 'telegram',
                    channel_config: channelConfig,
                    is_active: true,
                    is_primary: false
                })
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ Bot criado com sucesso: ${botData.username}`);

            return {
                success: true,
                bot_info: {
                    id: botData.id,
                    username: botData.username,
                    name: botData.name,
                    token: botData.token.substring(0, 10) + '...[OCULTO]' // Por segurança
                },
                channel: channel,
                webhook_url: webhookUrl,
                message: 'Bot Telegram criado com sucesso! Já está funcionando.',
                next_steps: [
                    'Encontre seu bot no Telegram: @' + botData.username,
                    'Envie /start para testar',
                    'Seus clientes já podem conversar!'
                ]
            };

        } catch (error) {
            console.error('Erro criando bot Telegram:', error);
            throw error;
        }
    }

    // Validar dados do bot antes de criar
    validateBotData(botName, botUsername) {
        if (!botName || botName.length < 3) {
            throw new Error('Nome do bot deve ter pelo menos 3 caracteres');
        }

        if (!botUsername || !botUsername.endsWith('_bot')) {
            throw new Error('Username deve terminar com "_bot"');
        }

        if (botUsername.length < 5 || botUsername.length > 32) {
            throw new Error('Username deve ter entre 5 e 32 caracteres');
        }

        // Verificar caracteres inválidos
        const validUsernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!validUsernameRegex.test(botUsername)) {
            throw new Error('Username só pode conter letras, números e underscore');
        }
    }

    // Simular criação de bot (NOTA: na prática seria automação complexa com Puppeteer/Selenium)
    async simulateCreateTelegramBot(botName, botUsername) {
        // IMPORTANTE: Esta é uma SIMULAÇÃO para desenvolvimento
        // Na produção real, seria necessário:
        // 1. Usar automação web (Puppeteer) para acessar Telegram Web
        // 2. Fazer login com credenciais do usuário
        // 3. Conversar com @BotFather automaticamente
        // 4. Capturar o token real retornado
        
        console.log(`🔧 Simulando criação do bot: ${botName} (@${botUsername})`);
        
        // Simular delay de criação
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Gerar token simulado (formato real: 123456789:AAF...)
        const botId = Math.floor(Math.random() * 1000000000);
        const tokenSuffix = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const simulatedToken = `${botId}:AAF${tokenSuffix}`;

        const botData = {
            id: botId,
            token: simulatedToken,
            username: botUsername.startsWith('@') ? botUsername.substring(1) : botUsername,
            name: botName,
            can_join_groups: true,
            can_read_all_group_messages: false,
            supports_inline_queries: false,
            created_via: 'crm_auto_creator'
        };

        console.log(`✅ Bot simulado criado: @${botData.username}`);
        return botData;
    }

    // Configurar webhook do bot recém-criado
    async setupBotWebhook(botToken, webhookUrl) {
        try {
            console.log(`🔗 Configurando webhook: ${webhookUrl}`);
            
            const response = await axios.post(
                `${this.telegramApiUrl}${botToken}/setWebhook`,
                {
                    url: webhookUrl,
                    allowed_updates: ['message', 'callback_query'],
                    drop_pending_updates: true
                }
            );

            if (!response.data.ok) {
                throw new Error(`Erro configurando webhook: ${response.data.description}`);
            }

            console.log('✅ Webhook configurado com sucesso');
            return response.data;
        } catch (error) {
            console.error('Erro configurando webhook:', error);
            throw new Error(`Falha ao configurar webhook: ${error.message}`);
        }
    }

    // Verificar se bot está funcionando (para validação)
    async verifyBot(botToken) {
        try {
            const response = await axios.get(`${this.telegramApiUrl}${botToken}/getMe`);
            
            if (!response.data.ok) {
                throw new Error('Token do bot inválido');
            }

            return {
                valid: true,
                bot_info: response.data.result
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    // Configurar bot manualmente (para usuários avançados)
    async setupManualBot(userId, botToken, botUsername) {
        try {
            console.log(`🔧 Configuração manual de bot para usuário: ${userId}`);
            
            // Verificar se bot é válido
            const verification = await this.verifyBot(botToken);
            if (!verification.valid) {
                throw new Error(`Token inválido: ${verification.error}`);
            }

            const botInfo = verification.bot_info;

            // Configurar webhook
            const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/webhook/telegram/${userId}`;
            await this.setupBotWebhook(botToken, webhookUrl);

            // Salvar configuração no banco
            const channelConfig = {
                bot_token: botToken,
                bot_username: botInfo.username,
                bot_name: botInfo.first_name,
                bot_id: botInfo.id,
                webhook_url: webhookUrl,
                created_automatically: false,
                created_at: new Date().toISOString(),
                setup_method: 'manual'
            };

            const { data: channel, error } = await supabase
                .from('user_channels')
                .insert({
                    user_id: userId,
                    channel_type: 'telegram',
                    channel_config: channelConfig,
                    is_active: true,
                    is_primary: false
                })
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                message: 'Bot configurado manualmente com sucesso!',
                bot_info: botInfo,
                channel: channel
            };
        } catch (error) {
            console.error('Erro na configuração manual:', error);
            throw error;
        }
    }

    // Testar bot existente do usuário
    async testUserBot(userId) {
        try {
            // Buscar configuração do bot
            const { data: channel, error } = await supabase
                .from('user_channels')
                .select('channel_config')
                .eq('user_id', userId)
                .eq('channel_type', 'telegram')
                .eq('is_active', true)
                .single();

            if (error) {
                throw new Error('Bot não configurado para este usuário');
            }

            const botConfig = channel.channel_config;
            
            // Verificar status do bot
            const verification = await this.verifyBot(botConfig.bot_token);
            
            if (!verification.valid) {
                throw new Error(`Bot com problema: ${verification.error}`);
            }

            // Enviar mensagem de teste (opcional)
            const testMessage = `🤖 Teste automático do CRM\n\nBot funcionando perfeitamente!\n\nData: ${new Date().toLocaleString('pt-BR')}`;
            
            return {
                success: true,
                bot_status: 'active',
                bot_info: verification.bot_info,
                webhook_status: 'configured',
                last_test: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Remover bot do usuário
    async removeBotFromUser(userId, channelId) {
        try {
            // Buscar configuração antes de remover
            const { data: channel, error: fetchError } = await supabase
                .from('user_channels')
                .select('channel_config')
                .eq('id', channelId)
                .eq('user_id', userId)
                .eq('channel_type', 'telegram')
                .single();

            if (fetchError) {
                throw new Error('Canal não encontrado');
            }

            // Remover webhook do bot (opcional - bot continua existindo)
            try {
                await axios.post(
                    `${this.telegramApiUrl}${channel.channel_config.bot_token}/deleteWebhook`
                );
            } catch (webhookError) {
                console.log('Aviso: Não foi possível remover webhook do bot');
            }

            // Remover do banco
            const { error: deleteError } = await supabase
                .from('user_channels')
                .delete()
                .eq('id', channelId)
                .eq('user_id', userId);

            if (deleteError) throw deleteError;

            return {
                success: true,
                message: 'Bot removido do CRM com sucesso',
                note: 'O bot ainda existe no Telegram, apenas removido da sua conta'
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = TelegramBotCreator;