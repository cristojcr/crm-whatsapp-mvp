// src/routes/channels.js
const express = require('express');
const router = express.Router();
// Rota de teste pública (DEVE estar ANTES de qualquer middleware)
router.get('/test', (req, res) => {
    res.json({
        success: true,
        service: 'channels',
        message: 'Sistema multicanal ativo',
        available_channels: ['whatsapp', 'instagram', 'telegram'],
        status: 'operational',
        timestamp: new Date().toISOString()
    });
});
const { supabase } = require('../config/supabase');
const { validateChannelAccess, validateChannelSetup } = require('../middleware/channel-validation');
const ChannelRouter = require('../services/channel-router');

const channelRouter = new ChannelRouter();

// Listar canais do usuário
router.get('/', async (req, res) => {
    try {
        const userId = req.query.user_id || req.user?.id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID requerido'
            });
        }

        // Buscar plano do usuário
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('plan')
            .eq('id', userId)
            .single();

        if (userError) {
            return res.status(500).json({
                success: false,
                error: 'Erro ao buscar dados do usuário'
            });
        }

        const userPlan = user.plan || 'basic';
        const channels = await channelRouter.getUserActiveChannels(userId);
        const availableChannels = channelRouter.getAvailableChannels(userPlan);
        const channelsStatus = await channelRouter.getChannelsStatus();
        
        res.json({
            success: true,
            user_plan: userPlan,
            active_channels: channels,
            available_channels: availableChannels,
            channels_status: channelsStatus,
            summary: {
                total_active: channels.length,
                can_add_more: userPlan === 'premium' || (userPlan === 'pro' && channels.length === 0),
                primary_channel: channels.find(ch => ch.is_primary)?.channel_type || null
            }
        });
    } catch (error) {
        console.error('Erro listando canais:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// Configurar novo canal
router.post('/setup', validateChannelSetup, async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { channel_type, channel_config, is_primary } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const newChannel = await channelRouter.setupUserChannel(
            userId,
            channel_type,
            channel_config,
            is_primary || false
        );

        res.json({
            success: true,
            message: `Canal ${channel_type} configurado com sucesso`,
            channel: newChannel
        });
    } catch (error) {
        console.error('Erro configurando canal:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Desativar canal
router.post('/:channelId/deactivate', async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.user?.id || req.body.user_id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const channel = await channelRouter.deactivateUserChannel(userId, channelId);

        res.json({
            success: true,
            message: `Canal ${channel.channel_type} desativado com sucesso`,
            channel: channel
        });
    } catch (error) {
        console.error('Erro desativando canal:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Ativar canal
router.post('/:channelId/activate', async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.user?.id || req.body.user_id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const channel = await channelRouter.activateUserChannel(userId, channelId);

        res.json({
            success: true,
            message: `Canal ${channel.channel_type} ativado com sucesso`,
            channel: channel
        });
    } catch (error) {
        console.error('Erro ativando canal:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Definir canal como primário
router.post('/:channelId/set-primary', async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.user?.id || req.body.user_id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const channel = await channelRouter.setPrimaryChannel(userId, channelId);

        res.json({
            success: true,
            message: `Canal ${channel.channel_type} definido como primário`,
            channel: channel
        });
    } catch (error) {
        console.error('Erro definindo canal primário:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Testar envio de mensagem por canal
router.post('/test-send', validateChannelAccess, async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { channel, recipient_id, message } = req.body;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        if (!channel || !recipient_id || !message) {
            return res.status(400).json({
                success: false,
                error: 'Canal, recipient_id e message são obrigatórios'
            });
        }

        const result = await channelRouter.sendMessage(
            userId,
            channel,
            recipient_id,
            message
        );

        res.json({
            success: true,
            message: `Mensagem enviada via ${channel} com sucesso`,
            result: result
        });
    } catch (error) {
        console.error('Erro testando envio:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Estatísticas por canal
router.get('/stats', async (req, res) => {
    try {
        const userId = req.query.user_id || req.user?.id;
        const days = parseInt(req.query.days) || 30;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID requerido'
            });
        }

        const stats = await channelRouter.getChannelStats(userId, days);

        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Erro buscando estatísticas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obter configuração de um canal específico
router.get('/:channelId', async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.user?.id || req.query.user_id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const { data: channel, error } = await supabase
            .from('user_channels')
            .select('*')
            .eq('id', channelId)
            .eq('user_id', userId)
            .single();

        if (error) {
            return res.status(404).json({
                success: false,
                error: 'Canal não encontrado'
            });
        }

        // Remover dados sensíveis antes de retornar
        const safeChannel = {
            ...channel,
            channel_config: {
                ...channel.channel_config,
                // Ocultar tokens e secrets
                bot_token: channel.channel_config.bot_token ? '[OCULTO]' : undefined,
                page_access_token: channel.channel_config.page_access_token ? '[OCULTO]' : undefined,
                app_secret: channel.channel_config.app_secret ? '[OCULTO]' : undefined
            }
        };

        res.json({
            success: true,
            channel: safeChannel
        });
    } catch (error) {
        console.error('Erro buscando canal:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Atualizar configuração de um canal
router.put('/:channelId', async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.user?.id || req.body.user_id;
        const { channel_config, is_active, is_primary } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const updateData = {};
        if (channel_config !== undefined) updateData.channel_config = channel_config;
        if (is_active !== undefined) updateData.is_active = is_active;
        if (is_primary !== undefined) {
            // Se definindo como primário, remover primário dos outros
            if (is_primary) {
                await supabase
                    .from('user_channels')
                    .update({ is_primary: false })
                    .eq('user_id', userId);
            }
            updateData.is_primary = is_primary;
        }

        updateData.updated_at = new Date().toISOString();

        const { data: channel, error } = await supabase
            .from('user_channels')
            .update(updateData)
            .eq('id', channelId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            return res.status(404).json({
                success: false,
                error: 'Canal não encontrado ou erro na atualização'
            });
        }

        res.json({
            success: true,
            message: 'Canal atualizado com sucesso',
            channel: channel
        });
    } catch (error) {
        console.error('Erro atualizando canal:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Deletar canal
router.delete('/:channelId', async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.user?.id || req.body.user_id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const { data: channel, error } = await supabase
            .from('user_channels')
            .delete()
            .eq('id', channelId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            return res.status(404).json({
                success: false,
                error: 'Canal não encontrado'
            });
        }

        res.json({
            success: true,
            message: `Canal ${channel.channel_type} removido com sucesso`,
            channel: channel
        });
    } catch (error) {
        console.error('Erro removendo canal:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Validar configuração de todos os canais do usuário
router.post('/validate-all', async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const channels = await channelRouter.getUserActiveChannels(userId);
        const validationResults = {};

        for (const channel of channels) {
            try {
                if (channel.channel_type === 'telegram') {
                    const TelegramProcessor = require('../services/telegram-processor');
                    const telegramProcessor = new TelegramProcessor();
                    const config = await telegramProcessor.getUserBotConfig(userId);
                    
                    const axios = require('axios');
                    const response = await axios.get(`https://api.telegram.org/bot${config.bot_token}/getMe`);
                    
                    validationResults[channel.channel_type] = {
                        valid: response.data.ok,
                        details: response.data.result
                    };
                } else if (channel.channel_type === 'instagram') {
                    const InstagramProcessor = require('../services/instagram-processor');
                    const instagramProcessor = new InstagramProcessor();
                    const validation = await instagramProcessor.validateConfig(userId);
                    
                    validationResults[channel.channel_type] = validation;
                } else {
                    validationResults[channel.channel_type] = {
                        valid: true,
                        details: 'Canal não suporta validação automática'
                    };
                }
            } catch (error) {
                validationResults[channel.channel_type] = {
                    valid: false,
                    error: error.message
                };
            }
        }

        res.json({
            success: true,
            channels_count: channels.length,
            validation_results: validationResults
        });
    } catch (error) {
        console.error('Erro validando canais:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota de teste pública (sem autenticação)
router.get('/test', (req, res) => {
    res.json({
        success: true,
        service: 'channels',
        message: 'Sistema multicanal ativo',
        available_channels: ['whatsapp', 'instagram', 'telegram'],
        status: 'operational',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;