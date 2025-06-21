// src/middleware/channel-validation.js
// ID 2.12 - FASE 3 - PASSO 3.1: Middleware de Validação de Canais
// Valida acesso a canais baseado no plano do usuário (Básico/Pro/Premium)
const { supabase } = require('../config/supabase');

// Middleware para validar acesso a canal baseado no plano
const validateChannelAccess = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.body.user_id || req.query.user_id;
        const channelType = req.body.channel || req.params.channel || req.headers['x-channel-type'];
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        if (!channelType) {
            return res.status(400).json({
                success: false,
                error: 'Tipo de canal é obrigatório'
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

        // Buscar canais ativos do usuário
        const { data: activeChannels, error: channelsError } = await supabase
            .from('user_channels')
            .select('channel_type')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (channelsError) {
            return res.status(500).json({
                success: false,
                error: 'Erro ao buscar canais do usuário'
            });
        }

        const userPlan = user.plan;
        const channelCount = activeChannels.length;

        // Plano Básico: apenas WhatsApp
        if (userPlan === 'basic' && channelType !== 'whatsapp') {
            return res.status(403).json({
                success: false,
                error: 'Plano Básico permite apenas WhatsApp',
                upgrade_required: true,
                current_plan: 'basic',
                required_plan: 'pro'
            });
        }

        // Plano Pro: apenas 1 canal
        if (userPlan === 'pro' && channelCount >= 1) {
            const existingChannel = activeChannels.find(ch => ch.channel_type === channelType);
            if (!existingChannel) {
                return res.status(403).json({
                    success: false,
                    error: 'Plano Pro permite apenas 1 canal ativo',
                    upgrade_required: true,
                    current_plan: 'pro',
                    required_plan: 'premium'
                });
            }
        }

        // Adicionar informações do usuário e canal no request
        req.userPlan = userPlan;
        req.channelType = channelType;
        req.activeChannels = activeChannels;

        next();
    } catch (error) {
        console.error('Erro no middleware de validação de canal:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno na validação de acesso'
        });
    }
};

// Middleware para validar setup de canal
const validateChannelSetup = async (req, res, next) => {
    try {
        const { channel_type, channel_config } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        if (!channel_type) {
            return res.status(400).json({
                success: false,
                error: 'Tipo de canal é obrigatório'
            });
        }

        // Validar tipos de canal suportados
        const supportedChannels = ['whatsapp', 'instagram', 'telegram'];
        if (!supportedChannels.includes(channel_type)) {
            return res.status(400).json({
                success: false,
                error: `Canal '${channel_type}' não suportado`,
                supported_channels: supportedChannels
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

        // Buscar canais ativos do usuário
        const { data: activeChannels, error: channelsError } = await supabase
            .from('user_channels')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (channelsError) {
            return res.status(500).json({
                success: false,
                error: 'Erro ao buscar canais do usuário'
            });
        }

        const userPlan = user.plan;
        const channelCount = activeChannels.length;

        // Plano Básico: apenas WhatsApp
        if (userPlan === 'basic' && channel_type !== 'whatsapp') {
            return res.status(403).json({
                success: false,
                error: 'Plano Básico permite apenas WhatsApp',
                upgrade_required: true
            });
        }

        // Plano Pro: apenas 1 canal
        if (userPlan === 'pro' && channelCount >= 1) {
            const existingChannel = activeChannels.find(ch => ch.channel_type === channel_type);
            if (!existingChannel) {
                return res.status(403).json({
                    success: false,
                    error: 'Plano Pro permite apenas 1 canal ativo',
                    upgrade_required: true
                });
            }
        }

        // Validar configuração do canal
        if (!channel_config || Object.keys(channel_config).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Configuração do canal é obrigatória'
            });
        }

        next();
    } catch (error) {
        console.error('Erro no middleware de setup de canal:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno na validação de setup'
        });
    }
};

module.exports = {
    validateChannelAccess,
    validateChannelSetup
};