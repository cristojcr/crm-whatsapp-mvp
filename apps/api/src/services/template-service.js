// apps/api/src/services/template-service.js
const { supabase } = require('../config/supabase');
const axios = require('axios');

class TemplateService {
    
    // Buscar credenciais do usuário usando a tabela user_channels existente
    static async getUserChannelConfig(userId, channelType) {
        try {
            const { data: channel, error } = await supabase
                .from('user_channels')
                .select('channel_config')
                .eq('user_id', userId)
                .eq('channel_type', channelType)
                .eq('is_active', true)
                .single();
                
            if (error) {
                console.error(`❌ Credenciais ${channelType} não encontradas para usuário ${userId}`);
                return null;
            }
            
            return channel.channel_config;
        } catch (error) {
            console.error(`❌ Erro ao buscar config ${channelType}:`, error);
            return null;
        }
    }
    
    // Sincronizar templates do WhatsApp Business API (usando config existente)
    static async syncWhatsAppTemplates(userId) {
        try {
            console.log(`🔄 Sincronizando templates WhatsApp para usuário ${userId}`);
            
            // Usar função para buscar config do user_channels
            const config = await this.getUserChannelConfig(userId, 'whatsapp');
            
            if (!config) {
                console.error('❌ WhatsApp não configurado para este usuário');
                return [];
            }
            
            const accessToken = config.access_token;
            const wabaId = config.waba_id;
            
            if (!accessToken || !wabaId) {
                console.error('❌ Token ou WABA ID não configurado');
                return [];
            }
            
            // Chamar API da Meta
            const response = await axios.get(
                `https://graph.facebook.com/v18.0/${wabaId}/message_templates`,
                {
                    params: {
                        access_token: accessToken,
                        limit: 100
                    }
                }
            );
            
            const templates = response.data.data || [];
            console.log(`📋 ${templates.length} templates encontrados na Meta`);
            
            // Salvar no banco
            for (const template of templates) {
                await this.saveTemplate(userId, 'whatsapp', template);
            }
            
            return templates;
            
        } catch (error) {
            console.error('❌ Erro ao sincronizar templates WhatsApp:', error);
            return [];
        }
    }
    
    // Salvar template no banco
    static async saveTemplate(userId, channelType, templateData) {
        try {
            // Extrair dados do template
            const templateInfo = {
                user_id: userId,
                channel_type: channelType,
                template_name: templateData.name,
                template_id: templateData.id,
                template_language: templateData.language,
                template_category: templateData.category,
                template_status: templateData.status,
                body_text: '',
                header_text: null,
                footer_text: null,
                buttons: null
            };
            
            // Extrair componentes
            if (templateData.components) {
                for (const component of templateData.components) {
                    if (component.type === 'BODY') {
                        templateInfo.body_text = component.text;
                    } else if (component.type === 'HEADER') {
                        templateInfo.header_text = component.text;
                    } else if (component.type === 'FOOTER') {
                        templateInfo.footer_text = component.text;
                    } else if (component.type === 'BUTTONS') {
                        templateInfo.buttons = component.buttons;
                    }
                }
            }
            
            // Upsert no banco
            const { error } = await supabase
                .from('approved_templates')
                .upsert(templateInfo, {
                    onConflict: 'user_id,channel_type,template_id'
                });
                
            if (error) {
                console.error('❌ Erro ao salvar template:', error);
            } else {
                console.log(`✅ Template salvo: ${templateData.name}`);
            }
            
        } catch (error) {
            console.error('❌ Erro ao salvar template:', error);
        }
    }
    
    // Enviar template aprovado (integrar com sistema de envio existente)
    static async sendApprovedTemplate(userId, channelType, recipientPhone, templateName, parameters = []) {
        try {
            console.log(`📤 Enviando template ${templateName} para ${recipientPhone}`);
            
            // Buscar template
            const { data: template, error } = await supabase
                .from('approved_templates')
                .select('*')
                .eq('user_id', userId)
                .eq('channel_type', channelType)
                .eq('template_name', templateName)
                .eq('template_status', 'APPROVED')
                .single();
                
            if (error || !template) {
                console.error('❌ Template não encontrado ou não aprovado');
                return false;
            }
            
            if (channelType === 'whatsapp') {
                return await this.sendWhatsAppTemplate(userId, recipientPhone, template, parameters);
            } else if (channelType === 'instagram') {
                return await this.sendInstagramTemplate(userId, recipientPhone, template, parameters);
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Erro ao enviar template:', error);
            return false;
        }
    }
    
    // Enviar template WhatsApp (usar config do user_channels)
    static async sendWhatsAppTemplate(userId, recipientPhone, template, parameters) {
        try {
            // Usar função existente para buscar config
            const config = await this.getUserChannelConfig(userId, 'whatsapp');
            
            if (!config) {
                console.error('❌ WhatsApp não configurado para este usuário');
                return false;
            }
            
            const accessToken = config.access_token;
            const phoneNumberId = config.phone_number_id;
            
            // Montar payload do template
            const payload = {
                messaging_product: 'whatsapp',
                to: recipientPhone,
                type: 'template',
                template: {
                    name: template.template_name,
                    language: {
                        code: template.template_language
                    }
                }
            };
            
            // Adicionar parâmetros se existirem
            if (parameters && parameters.length > 0) {
                payload.template.components = [{
                    type: 'body',
                    parameters: parameters.map(param => ({
                        type: 'text',
                        text: param
                    }))
                }];
            }
            
            // Enviar via Meta API
            const response = await axios.post(
                `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log(`✅ Template WhatsApp enviado: ${response.data.messages[0].id}`);
            
            // INTEGRAR: Salvar mensagem usando função existente
            const conversation = await this.findOrCreateConversationForTemplate(userId, recipientPhone, 'whatsapp');
            if (conversation) {
                await this.saveTemplateMessage(conversation.id, template, parameters, 'outgoing', userId);
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao enviar template WhatsApp:', error);
            return false;
        }
    }
    
    // Função auxiliar para integrar com sistema existente
    static async findOrCreateConversationForTemplate(userId, recipientPhone, channelType) {
        try {
            // Buscar conversa existente
            const { data: conversation, error } = await supabase
                .from('conversations')
                .select('id')
                .eq('user_id', userId)
                .eq('contact_phone', recipientPhone)
                .eq('channel_type', channelType)
                .single();
                
            if (conversation) {
                return conversation;
            }
            
            // Se não existir, criar nova (usando padrão do sistema)
            const { data: newConversation, error: createError } = await supabase
                .from('conversations')
                .insert({
                    user_id: userId,
                    contact_phone: recipientPhone,
                    channel_type: channelType,
                    status: 'active'
                })
                .select('id')
                .single();
                
            return createError ? null : newConversation;
            
        } catch (error) {
            console.error('❌ Erro ao buscar/criar conversa para template:', error);
            return null;
        }
    }
    
    // Salvar mensagem de template no banco (integrar com estrutura existente)
    static async saveTemplateMessage(conversationId, template, parameters, senderType, userId) {
        try {
            let content = template.body_text;
            
            // Substituir parâmetros no texto
            if (parameters && parameters.length > 0) {
                parameters.forEach((param, index) => {
                    content = content.replace(`{{${index + 1}}}`, param);
                });
            }
            
            await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    content: content,
                    sender_type: senderType,
                    channel_type: template.channel_type,
                    message_type: 'template',
                    metadata: {
                        template_name: template.template_name,
                        template_id: template.template_id,
                        parameters: parameters
                    }
                });
                
            console.log(`✅ Mensagem de template salva: ${template.template_name}`);
            
        } catch (error) {
            console.error('❌ Erro ao salvar mensagem de template:', error);
        }
    }
    
    // Listar templates disponíveis
    static async getAvailableTemplates(userId, channelType) {
        try {
            const { data, error } = await supabase
                .from('approved_templates')
                .select('*')
                .eq('user_id', userId)
                .eq('channel_type', channelType)
                .eq('template_status', 'APPROVED')
                .order('template_name');
                
            if (error) {
                console.error('❌ Erro ao buscar templates:', error);
                return [];
            }
            
            return data || [];
            
        } catch (error) {
            console.error('❌ Erro ao buscar templates:', error);
            return [];
        }
    }
}

module.exports = TemplateService;