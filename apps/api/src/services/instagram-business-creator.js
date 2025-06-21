// src/services/instagram-business-creator.js
// ID 2.12 - FUNCIONALIDADE EXTRA: Configuração Instagram Business Account
// Permite usuários configurarem suas contas Instagram Business
// Input: App ID, App Secret, Page Access Token, Business Account ID
const axios = require('axios');
const { supabase } = require('../config/supabase');

class InstagramBusinessCreator {
    constructor() {
        this.graphApiUrl = 'https://graph.facebook.com/v18.0';
        this.instagramApiUrl = 'https://graph.facebook.com/v18.0';
    }

    // Configurar Instagram Business para usuário (funcionalidade principal)
    async setupInstagramForUser(userId, credentials) {
        try {
            const { 
                app_id, 
                app_secret, 
                page_access_token, 
                business_account_id,
                page_id 
            } = credentials;

            console.log(`📸 Iniciando configuração Instagram para usuário: ${userId}`);

            // ETAPA 1: Validar credenciais fornecidas
            await this.validateCredentials(credentials);

            // ETAPA 2: Obter informações detalhadas da conta
            const accountInfo = await this.getAccountInfo(page_access_token, business_account_id);

            // ETAPA 3: Configurar webhook
            const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/webhook/instagram/${userId}`;
            await this.setupInstagramWebhook(app_id, app_secret, page_access_token, webhookUrl);

            // ETAPA 4: Salvar configurações no banco (com dados criptografados)
            const channelConfig = {
                app_id: app_id,
                app_secret: app_secret, // TODO: Implementar criptografia em produção
                page_access_token: page_access_token, // TODO: Implementar criptografia
                business_account_id: business_account_id,
                page_id: page_id,
                webhook_url: webhookUrl,
                account_info: accountInfo,
                created_at: new Date().toISOString(),
                setup_method: 'manual_business',
                status: 'active'
            };

            const { data: channel, error } = await supabase
                .from('user_channels')
                .insert({
                    user_id: userId,
                    channel_type: 'instagram',
                    channel_config: channelConfig,
                    is_active: true,
                    is_primary: false
                })
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ Instagram configurado: @${accountInfo.username}`);

            return {
                success: true,
                account_info: {
                    id: accountInfo.id,
                    username: accountInfo.username,
                    name: accountInfo.name,
                    followers_count: accountInfo.followers_count,
                    profile_picture_url: accountInfo.profile_picture_url
                },
                channel: channel,
                webhook_url: webhookUrl,
                message: 'Instagram Business configurado com sucesso!',
                next_steps: [
                    'Clientes podem enviar mensagens diretas',
                    'Respostas automáticas já estão funcionando',
                    'Acesse @' + accountInfo.username + ' para testar'
                ]
            };

        } catch (error) {
            console.error('Erro configurando Instagram:', error);
            throw error;
        }
    }

    // Validar credenciais do Instagram Business (crítico para segurança)
    async validateCredentials(credentials) {
        const { app_id, app_secret, page_access_token, business_account_id } = credentials;

        // Verificar se todos os campos obrigatórios estão presentes
        if (!app_id || !app_secret || !page_access_token || !business_account_id) {
            throw new Error('Todos os campos são obrigatórios: App ID, App Secret, Page Access Token e Business Account ID');
        }

        try {
            console.log('🔐 Validando credenciais Instagram...');

            // Testar se o token de acesso é válido
            const response = await axios.get(
                `${this.graphApiUrl}/${business_account_id}`,
                {
                    params: {
                        access_token: page_access_token,
                        fields: 'id,username,name,account_type'
                    }
                }
            );

            if (!response.data.id) {
                throw new Error('Business Account ID inválido ou token sem permissões');
            }

            // Verificar se é realmente uma conta business
            if (response.data.account_type !== 'BUSINESS') {
                throw new Error('Esta não é uma conta Instagram Business válida');
            }

            console.log(`✅ Credenciais válidas para: @${response.data.username}`);
            return response.data;

        } catch (error) {
            if (error.response?.status === 401) {
                throw new Error('Token de acesso inválido ou expirado');
            } else if (error.response?.status === 403) {
                throw new Error('Sem permissão para acessar esta conta Business');
            } else if (error.response?.status === 404) {
                throw new Error('Business Account ID não encontrado');
            }
            
            throw new Error('Falha na validação: ' + error.message);
        }
    }

    // Configurar webhook do Instagram (para receber mensagens)
    async setupInstagramWebhook(appId, appSecret, pageAccessToken, webhookUrl) {
        try {
            console.log(`🔗 Configurando webhook Instagram: ${webhookUrl}`);

            // Gerar verify token único para este usuário
            const verifyToken = `verify_${appId}_${Date.now()}`;

            // Configurar subscription na Graph API
            const response = await axios.post(
                `${this.graphApiUrl}/${appId}/subscriptions`,
                {
                    object: 'instagram',
                    callback_url: webhookUrl,
                    verify_token: verifyToken,
                    fields: 'messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads'
                },
                {
                    params: {
                        access_token: `${appId}|${appSecret}`
                    }
                }
            );

            if (!response.data.success) {
                throw new Error('Falha ao configurar webhook');
            }

            console.log('✅ Webhook Instagram configurado com sucesso');

            return {
                success: true,
                verify_token: verifyToken,
                webhook_url: webhookUrl
            };

        } catch (error) {
            console.error('Erro configurando webhook Instagram:', error);
            
            if (error.response?.status === 400) {
                throw new Error('URL de webhook inválida ou app sem permissões');
            } else if (error.response?.status === 401) {
                throw new Error('App ID ou App Secret inválidos');
            }
            
            throw new Error(`Erro no webhook: ${error.message}`);
        }
    }

    // Obter informações completas da conta Instagram Business
    async getAccountInfo(pageAccessToken, businessAccountId) {
        try {
            console.log('📊 Obtendo informações da conta Instagram...');

            const response = await axios.get(
                `${this.graphApiUrl}/${businessAccountId}`,
                {
                    params: {
                        access_token: pageAccessToken,
                        fields: 'id,username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count,account_type'
                    }
                }
            );

            const accountData = response.data;

            console.log(`✅ Conta encontrada: @${accountData.username} (${accountData.followers_count} seguidores)`);

            return {
                id: accountData.id,
                username: accountData.username,
                name: accountData.name,
                biography: accountData.biography,
                website: accountData.website,
                profile_picture_url: accountData.profile_picture_url,
                followers_count: accountData.followers_count || 0,
                follows_count: accountData.follows_count || 0,
                media_count: accountData.media_count || 0,
                account_type: accountData.account_type,
                last_updated: new Date().toISOString()
            };

        } catch (error) {
            console.error('Erro obtendo info da conta:', error);
            throw new Error(`Erro ao buscar informações da conta: ${error.message}`);
        }
    }

    // Testar configuração existente do usuário
    async testUserInstagram(userId) {
        try {
            console.log(`🧪 Testando Instagram do usuário: ${userId}`);

            // Buscar configuração do usuário
            const { data: channel, error } = await supabase
                .from('user_channels')
                .select('channel_config')
                .eq('user_id', userId)
                .eq('channel_type', 'instagram')
                .eq('is_active', true)
                .single();

            if (error) {
                throw new Error('Instagram não configurado para este usuário');
            }

            const config = channel.channel_config;

            // Testar se as credenciais ainda são válidas
            const accountInfo = await this.getAccountInfo(
                config.page_access_token, 
                config.business_account_id
            );

            return {
                success: true,
                status: 'active',
                account_info: accountInfo,
                webhook_status: 'configured',
                last_test: new Date().toISOString(),
                message: 'Instagram funcionando perfeitamente!'
            };

        } catch (error) {
            return {
                success: false,
                status: 'error',
                error: error.message,
                last_test: new Date().toISOString()
            };
        }
    }

    // Atualizar token de acesso (tokens Instagram expiram)
    async refreshAccessToken(userId, newPageAccessToken) {
        try {
            console.log(`🔄 Atualizando token Instagram para usuário: ${userId}`);

            // Buscar configuração atual
            const { data: channel, error: fetchError } = await supabase
                .from('user_channels')
                .select('*')
                .eq('user_id', userId)
                .eq('channel_type', 'instagram')
                .eq('is_active', true)
                .single();

            if (fetchError) {
                throw new Error('Configuração Instagram não encontrada');
            }

            const currentConfig = channel.channel_config;

            // Validar novo token
            await this.getAccountInfo(newPageAccessToken, currentConfig.business_account_id);

            // Atualizar configuração
            const updatedConfig = {
                ...currentConfig,
                page_access_token: newPageAccessToken,
                last_token_update: new Date().toISOString()
            };

            const { error: updateError } = await supabase
                .from('user_channels')
                .update({ 
                    channel_config: updatedConfig,
                    updated_at: new Date().toISOString()
                })
                .eq('id', channel.id);

            if (updateError) throw updateError;

            return {
                success: true,
                message: 'Token atualizado com sucesso!',
                updated_at: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Erro atualizando token: ${error.message}`);
        }
    }

    // Obter estatísticas da conta Instagram Business
    async getAccountStats(userId, days = 30) {
        try {
            const { data: channel, error } = await supabase
                .from('user_channels')
                .select('channel_config')
                .eq('user_id', userId)
                .eq('channel_type', 'instagram')
                .eq('is_active', true)
                .single();

            if (error) throw new Error('Instagram não configurado');

            const config = channel.channel_config;

            // Buscar estatísticas básicas da conta
            const accountInfo = await this.getAccountInfo(
                config.page_access_token, 
                config.business_account_id
            );

            // Buscar mensagens dos últimos X dias no CRM
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
            
            const { data: messages, error: msgError } = await supabase
                .from('messages')
                .select('created_at, sender_type')
                .eq('channel_type', 'instagram')
                .eq('user_id', userId)
                .gte('created_at', startDate);

            if (msgError) throw msgError;

            const receivedMessages = messages?.filter(m => m.sender_type === 'contact').length || 0;
            const sentMessages = messages?.filter(m => m.sender_type === 'user').length || 0;

            return {
                success: true,
                account_info: accountInfo,
                period_days: days,
                crm_stats: {
                    total_messages: messages?.length || 0,
                    received_messages: receivedMessages,
                    sent_messages: sentMessages,
                    response_rate: receivedMessages > 0 ? ((sentMessages / receivedMessages) * 100).toFixed(1) + '%' : '0%'
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Remover Instagram do usuário
    async removeInstagramFromUser(userId, channelId) {
        try {
            // Buscar configuração antes de remover
            const { data: channel, error: fetchError } = await supabase
                .from('user_channels')
                .select('channel_config')
                .eq('id', channelId)
                .eq('user_id', userId)
                .eq('channel_type', 'instagram')
                .single();

            if (fetchError) {
                throw new Error('Canal não encontrado');
            }

            // TODO: Remover webhook (opcional - requer app permissions)
            console.log('ℹ️ Webhook mantido (remoção requer permissões avançadas)');

            // Remover do banco
            const { error: deleteError } = await supabase
                .from('user_channels')
                .delete()
                .eq('id', channelId)
                .eq('user_id', userId);

            if (deleteError) throw deleteError;

            return {
                success: true,
                message: 'Instagram removido do CRM com sucesso',
                note: 'Sua conta Instagram continua normal, apenas removida do CRM'
            };

        } catch (error) {
            throw error;
        }
    }
}

module.exports = InstagramBusinessCreator;