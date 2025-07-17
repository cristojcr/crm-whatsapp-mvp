// src/services/channel-router.js
const InstagramProcessor = require('./instagram-processor');
const TelegramProcessor = require('./telegram-processor_v2');
const { supabase } = require('../config/supabase');

class ChannelRouter {
    constructor() {
        this.processors = {
            instagram: new InstagramProcessor(),
            telegram: new TelegramProcessor(),
            whatsapp: null // WhatsApp processor já existe (será integrado depois)
        };
    }

    // Rotear mensagem para o processador correto (multi-tenant)
    async routeMessage(messageData, userId) {
        const { channel, ...data } = messageData;
        const processor = this.processors[channel];
        
        if (!processor) {
            throw new Error(`Processador não encontrado para canal: ${channel}`);
        }

        // Verificar se usuário tem acesso ao canal
        await this.validateChannelAccess(userId, channel);

        // Instagram
        if (channel === 'instagram') {
            return await processor.processIncomingMessage(data, userId);
        }

        // Telegram
        if (channel === 'telegram') {
            return await processor.processUpdate(data, userId);
        }

        // WhatsApp (manter lógica existente)
        if (channel === 'whatsapp') {
            // TODO: Integrar com processador WhatsApp existente
            console.log('WhatsApp: usando processador existente');
            return { success: true, message: 'WhatsApp processado' };
        }

        throw new Error(`Canal não suportado: ${channel}`);
    }

    // Enviar mensagem via canal específico (multi-tenant)
    async sendMessage(userId, channel, recipientId, message, options = {}) {
        const processor = this.processors[channel];
        
        if (!processor) {
            throw new Error(`Processador não encontrado para canal: ${channel}`);
        }

        // Verificar se usuário tem acesso ao canal
        await this.validateChannelAccess(userId, channel);

        // Instagram
        if (channel === 'instagram') {
            return await processor.sendMessage(userId, recipientId, message, options.message_type);
        }

        // Telegram
        if (channel === 'telegram') {
            return await processor.sendMessage(userId, recipientId, message, options);
        }

        // WhatsApp
        if (channel === 'whatsapp') {
            // TODO: Integrar com sender WhatsApp existente
            console.log('WhatsApp: usando sender existente');
            return { success: true, message: 'WhatsApp enviado' };
        }

        throw new Error(`Canal não suportado: ${channel}`);
    }

    // Buscar canais ativos do usuário
    async getUserActiveChannels(userId) {
        const { data: channels, error } = await supabase
            .from('user_channels')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('is_primary', { ascending: false });

        if (error) {
            throw new Error(`Erro buscando canais do usuário: ${error.message}`);
        }

        return channels;
    }

    // Configurar novo canal para usuário
    async setupUserChannel(userId, channelType, config, isPrimary = false) {
        try {
            // Validar se usuário pode ter esse canal
            await this.validateChannelForUser(userId, channelType);

            // Se for definir como primário, remover primário dos outros
            if (isPrimary) {
                await supabase
                    .from('user_channels')
                    .update({ is_primary: false })
                    .eq('user_id', userId);
            }

            // Criar novo canal
            const { data: channel, error } = await supabase
                .from('user_channels')
                .insert({
                    user_id: userId,
                    channel_type: channelType,
                    channel_config: config,
                    is_active: true,
                    is_primary: isPrimary
                })
                .select()
                .single();

            if (error) throw error;

            return channel;
        } catch (error) {
            console.error('Erro configurando canal do usuário:', error);
            throw error;
        }
    }

    // Validar se usuário pode usar o canal baseado no plano
    async validateChannelForUser(userId, channelType) {
        // Buscar plano do usuário
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('plan')
            .eq('id', userId)
            .single();

        if (userError) throw userError;

        // Buscar canais ativos do usuário
        const { data: activeChannels, error: channelsError } = await supabase
            .from('user_channels')
            .select('channel_type')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (channelsError) throw channelsError;

        const channelCount = activeChannels.length;
        const userPlan = user.plan;

        // Plano Básico: apenas WhatsApp
        if (userPlan === 'basic' && channelType !== 'whatsapp') {
            throw new Error('Plano Básico permite apenas WhatsApp. Faça upgrade para Pro ou Premium.');
        }

        // Plano Pro: apenas 1 canal
        if (userPlan === 'pro' && channelCount >= 1) {
            const existingChannel = activeChannels.find(ch => ch.channel_type === channelType);
            if (!existingChannel) {
                throw new Error('Plano Pro permite apenas 1 canal ativo. Desative o canal atual ou faça upgrade para Premium.');
            }
        }

        // Plano Premium: todos os canais permitidos
        if (userPlan === 'premium') {
            return true; // Pode usar qualquer canal
        }

        return true;
    }

    // Validar acesso ao canal (para uso em tempo real)
    async validateChannelAccess(userId, channelType) {
        const { data: channel, error } = await supabase
            .from('user_channels')
            .select('id')
            .eq('user_id', userId)
            .eq('channel_type', channelType)
            .eq('is_active', true)
            .single();

        if (error) {
            throw new Error(`Canal ${channelType} não configurado ou inativo para este usuário`);
        }

        return true;
    }

    // Listar canais disponíveis por plano
    getAvailableChannels(userPlan) {
        const channels = {
            basic: ['whatsapp'],
            pro: ['whatsapp', 'instagram', 'telegram'], // Pode escolher 1
            premium: ['whatsapp', 'instagram', 'telegram'] // Pode usar todos
        };

        return channels[userPlan] || channels.basic;
    }

    // Verificar status de todos os canais
    async getChannelsStatus() {
        const status = {
            instagram: this.processors.instagram ? 'active' : 'inactive',
            telegram: this.processors.telegram ? 'active' : 'inactive',
            whatsapp: 'active' // Assumindo que WhatsApp sempre está ativo
        };

        return status;
    }

    // Desativar canal do usuário
    async deactivateUserChannel(userId, channelId) {
        const { data: channel, error } = await supabase
            .from('user_channels')
            .update({ is_active: false })
            .eq('id', channelId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return channel;
    }

    // Ativar canal do usuário
    async activateUserChannel(userId, channelId) {
        // Primeiro verificar se pode ativar (validação de plano)
        const { data: channelToActivate, error: fetchError } = await supabase
            .from('user_channels')
            .select('channel_type')
            .eq('id', channelId)
            .eq('user_id', userId)
            .single();

        if (fetchError) throw fetchError;

        await this.validateChannelForUser(userId, channelToActivate.channel_type);

        const { data: channel, error } = await supabase
            .from('user_channels')
            .update({ is_active: true })
            .eq('id', channelId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return channel;
    }

    // Definir canal como primário
    async setPrimaryChannel(userId, channelId) {
        // Remover primário de outros canais
        await supabase
            .from('user_channels')
            .update({ is_primary: false })
            .eq('user_id', userId);

        // Definir como primário
        const { data: channel, error } = await supabase
            .from('user_channels')
            .update({ is_primary: true })
            .eq('id', channelId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return channel;
    }

    // Obter estatísticas por canal
    async getChannelStats(userId, days = 30) {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const { data: stats, error } = await supabase
            .from('messages')
            .select('channel_type, created_at')
            .eq('user_id', userId)
            .gte('created_at', startDate)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Agrupar por canal
        const channelStats = stats.reduce((acc, msg) => {
            const channel = msg.channel_type || 'whatsapp';
            if (!acc[channel]) {
                acc[channel] = 0;
            }
            acc[channel]++;
            return acc;
        }, {});

        return {
            period_days: days,
            total_messages: stats.length,
            by_channel: channelStats
        };
    }
}

module.exports = ChannelRouter;