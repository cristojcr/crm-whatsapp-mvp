// src/services/instagram-processor.js
const axios = require('axios');
const { supabase } = require('../config/supabase');

class InstagramProcessor {
    constructor() {
        this.graphApiUrl = 'https://graph.facebook.com/v18.0';
    }

    // Buscar configuração do Instagram por usuário
    async getUserInstagramConfig(userId) {
        const { data: channel, error } = await supabase
            .from('user_channels')
            .select('channel_config')
            .eq('user_id', userId)
            .eq('channel_type', 'instagram')
            .eq('is_active', true)
            .single();

        if (error) throw new Error('Instagram não configurado para este usuário');
        
        return channel.channel_config;
    }

    // Processar mensagens recebidas do Instagram (multi-tenant)
    async processIncomingMessage(messageData, userId) {
        try {
            const config = await this.getUserInstagramConfig(userId);
            const { sender, message, timestamp } = messageData;
            
            // Buscar ou criar contato
            const contact = await this.findOrCreateContact(sender, userId);
            
            // Buscar ou criar conversa
            const conversation = await this.findOrCreateConversation(contact.id, userId, 'instagram');
            
            // Salvar mensagem no banco
            const savedMessage = await this.saveMessage({
                conversation_id: conversation.id,
                content: message.text || message.attachments?.[0]?.payload?.url,
                sender_type: 'contact',
                channel_type: 'instagram',
                channel_message_id: message.mid,
                metadata: {
                    sender_id: sender.id,
                    message_type: message.attachments ? 'media' : 'text',
                    timestamp: timestamp,
                    instagram_config: {
                        business_account_id: config.business_account_id,
                        page_id: config.page_id
                    }
                }
            });

            return savedMessage;
        } catch (error) {
            console.error('Erro processando mensagem Instagram:', error);
            throw error;
        }
    }

    // Buscar ou criar contato (multi-tenant)
    async findOrCreateContact(sender, userId) {
        let { data: contact, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('instagram_id', sender.id)
            .eq('user_id', userId) // Filtrar por usuário
            .single();

        if (error && error.code === 'PGRST116') {
            // Contato não existe, criar novo
            const { data: newContact, error: createError } = await supabase
                .from('contacts')
                .insert({
                    name: `Instagram User ${sender.id}`,
                    instagram_id: sender.id,
                    source: 'instagram',
                    user_id: userId // Associar ao usuário
                })
                .select()
                .single();

            if (createError) throw createError;
            contact = newContact;
        } else if (error) {
            throw error;
        }

        return contact;
    }

    // Buscar ou criar conversa (multi-tenant)
    async findOrCreateConversation(contactId, userId, channelType) {
        let { data: conversation, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('contact_id', contactId)
            .eq('channel_type', channelType)
            .eq('user_id', userId) // Filtrar por usuário
            .single();

        if (error && error.code === 'PGRST116') {
            // Conversa não existe, criar nova
            const { data: newConversation, error: createError } = await supabase
                .from('conversations')
                .insert({
                    contact_id: contactId,
                    channel_type: channelType,
                    status: 'active',
                    user_id: userId // Associar ao usuário
                })
                .select()
                .single();

            if (createError) throw createError;
            conversation = newConversation;
        } else if (error) {
            throw error;
        }

        return conversation;
    }

    // Salvar mensagem
    async saveMessage(messageData) {
        const { data: message, error } = await supabase
            .from('messages')
            .insert(messageData)
            .select()
            .single();

        if (error) throw error;
        return message;
    }

    // Enviar mensagem via Instagram (usando config do usuário)
    async sendMessage(userId, recipientId, message, messageType = 'text') {
        try {
            const config = await this.getUserInstagramConfig(userId);
            
            const payload = {
                recipient: { id: recipientId },
                message: messageType === 'text' 
                    ? { text: message }
                    : { 
                        attachment: {
                            type: messageType,
                            payload: { url: message }
                        }
                    }
            };

            const response = await axios.post(
                `${this.graphApiUrl}/me/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${config.page_access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Erro enviando mensagem Instagram:', error);
            throw error;
        }
    }

    // Obter informações da conta
    async getAccountInfo(userId) {
        try {
            const config = await this.getUserInstagramConfig(userId);
            
            const response = await axios.get(
                `${this.graphApiUrl}/${config.business_account_id}`,
                {
                    params: {
                        access_token: config.page_access_token,
                        fields: 'id,username,name,profile_picture_url,followers_count,media_count'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Erro obtendo info da conta:', error);
            throw error;
        }
    }

    // Validar configuração do Instagram
    async validateConfig(userId) {
        try {
            const config = await this.getUserInstagramConfig(userId);
            
            // Testar se o token é válido
            const response = await axios.get(
                `${this.graphApiUrl}/${config.business_account_id}`,
                {
                    params: {
                        access_token: config.page_access_token,
                        fields: 'id,username,name'
                    }
                }
            );

            return {
                valid: true,
                account_info: response.data
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }
}

module.exports = InstagramProcessor;