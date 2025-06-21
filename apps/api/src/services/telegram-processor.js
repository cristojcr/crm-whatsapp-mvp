// src/services/telegram-processor.js
const axios = require('axios');
const { supabase } = require('../config/supabase');

class TelegramProcessor {
    constructor() {
        // Configuração dinâmica - busca por usuário
    }

    // Buscar configuração do bot por usuário
    async getUserBotConfig(userId) {
        const { data: channel, error } = await supabase
            .from('user_channels')
            .select('channel_config')
            .eq('user_id', userId)
            .eq('channel_type', 'telegram')
            .eq('is_active', true)
            .single();

        if (error) throw new Error('Bot Telegram não configurado para este usuário');
        
        return channel.channel_config;
    }

    // Processar updates do Telegram (agora multi-tenant)
    async processUpdate(update, userId) {
        try {
            if (update.message) {
                return await this.processMessage(update.message, userId);
            } else if (update.callback_query) {
                return await this.processCallbackQuery(update.callback_query, userId);
            }
            return null;
        } catch (error) {
            console.error('Erro processando update Telegram:', error);
            throw error;
        }
    }

    // Processar mensagens (adaptado para multi-tenant)
    async processMessage(message, userId) {
        const { from, text, photo, video, audio, voice, document, chat } = message;
        
        // Buscar configuração do bot do usuário
        const botConfig = await this.getUserBotConfig(userId);
        
        // Buscar ou criar contato
        const contact = await this.findOrCreateContact(from, userId);
        
        // Buscar ou criar conversa
        const conversation = await this.findOrCreateConversation(contact.id, userId, 'telegram');
        
        // Determinar tipo e conteúdo da mensagem
        let messageContent = text;
        let messageType = 'text';
        let metadata = { 
            telegram_message_id: message.message_id,
            bot_config: {
                bot_username: botConfig.bot_username,
                bot_name: botConfig.bot_name
            }
        };

        if (photo) {
            messageType = 'photo';
            messageContent = await this.getFileUrl(photo[photo.length - 1].file_id, botConfig.bot_token);
            metadata.photo_sizes = photo;
        } else if (video) {
            messageType = 'video';
            messageContent = await this.getFileUrl(video.file_id, botConfig.bot_token);
            metadata.video_info = video;
        } else if (audio) {
            messageType = 'audio';
            messageContent = await this.getFileUrl(audio.file_id, botConfig.bot_token);
            metadata.audio_info = audio;
        } else if (voice) {
            messageType = 'voice';
            messageContent = await this.getFileUrl(voice.file_id, botConfig.bot_token);
            metadata.voice_info = voice;
        } else if (document) {
            messageType = 'document';
            messageContent = await this.getFileUrl(document.file_id, botConfig.bot_token);
            metadata.document_info = document;
        }

        // Salvar mensagem no banco
        const savedMessage = await this.saveMessage({
            conversation_id: conversation.id,
            content: messageContent,
            message_type: messageType,
            sender_type: 'contact',
            channel_type: 'telegram',
            channel_message_id: message.message_id.toString(),
            metadata: metadata
        });

        return savedMessage;
    }

    // Buscar ou criar contato (adaptado para multi-tenant)
    async findOrCreateContact(from, userId) {
        let { data: contact, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('telegram_id', from.id)
            .eq('user_id', userId) // Filtrar por usuário
            .single();

        if (error && error.code === 'PGRST116') {
            // Contato não existe, criar novo
            const name = from.first_name + (from.last_name ? ` ${from.last_name}` : '');
            const { data: newContact, error: createError } = await supabase
                .from('contacts')
                .insert({
                    name: name || `Telegram User ${from.id}`,
                    telegram_id: from.id,
                    telegram_username: from.username,
                    source: 'telegram',
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

    // Buscar ou criar conversa (adaptado para multi-tenant)
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

    // Obter URL do arquivo (usando token do usuário)
    async getFileUrl(fileId, botToken) {
        try {
            const response = await axios.get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
            const filePath = response.data.result.file_path;
            return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
        } catch (error) {
            console.error('Erro obtendo URL do arquivo:', error);
            return null;
        }
    }

    // Enviar mensagem via Telegram (usando config do usuário)
    async sendMessage(userId, chatId, message, options = {}) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            const apiUrl = `https://api.telegram.org/bot${botConfig.bot_token}`;
            
            const payload = {
                chat_id: chatId,
                text: message,
                ...options
            };

            const response = await axios.post(
                `${apiUrl}/sendMessage`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Erro enviando mensagem Telegram:', error);
            throw error;
        }
    }

    // Configurar webhook (usando token do usuário)
    async setWebhook(userId, webhookUrl) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            const apiUrl = `https://api.telegram.org/bot${botConfig.bot_token}`;
            
            const response = await axios.post(
                `${apiUrl}/setWebhook`,
                {
                    url: webhookUrl,
                    allowed_updates: ['message', 'callback_query']
                }
            );

            return response.data;
        } catch (error) {
            console.error('Erro configurando webhook Telegram:', error);
            throw error;
        }
    }

    // Processar callback queries (botões inline)
    async processCallbackQuery(callbackQuery, userId) {
        const { from, data, message } = callbackQuery;
        const botConfig = await this.getUserBotConfig(userId);
        const apiUrl = `https://api.telegram.org/bot${botConfig.bot_token}`;
        
        // Responder ao callback
        await axios.post(`${apiUrl}/answerCallbackQuery`, {
            callback_query_id: callbackQuery.id,
            text: 'Processado!'
        });

        return { processed: true, data };
    }
}

module.exports = TelegramProcessor;