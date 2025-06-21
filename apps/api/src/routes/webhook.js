const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// ===============================================
// CONFIGURAÇÃO SUPABASE COM SERVICE ROLE KEY
// ===============================================
// Usar Service Role Key para bypassing RLS em webhooks
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===============================================
// IMPORTAR PROCESSADOR DE IA
// ===============================================

let messageProcessor;
try {
  messageProcessor = require('../services/message-processor');
  console.log('✅ Processador de IA carregado com sucesso');
} catch (error) {
  console.log('❌ ERRO ESPECÍFICO:', error.message);
  console.log('❌ STACK:', error.stack);
  messageProcessor = null;
}

// ===============================================
// CONFIGURAÇÃO DO WHATSAPP
// ===============================================
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'crm_webhook_token_2025';
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

// ===============================================
// CACHE DE USUÁRIO PADRÃO
// ===============================================
let defaultUserId = null;

// ===============================================
// GET: VERIFICAÇÃO DO WEBHOOK (CHALLENGE)
// ===============================================
router.get('/whatsapp', (req, res) => {
  console.log('🔔 Verificação de webhook recebida');
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  console.log('📋 Parâmetros:', { mode, token, challenge });
  
  // Verificar se é uma requisição de verificação válida
  if (mode === 'subscribe' && token === 'crm_webhook_token_2025_secure') {
    console.log('✅ Webhook verificado com sucesso!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Falha na verificação do webhook');
    res.status(403).send('Forbidden');
  }
});

// ===============================================
// POST: RECEBER MENSAGENS DO WHATSAPP
// ===============================================
router.post('/whatsapp', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('📱 WhatsApp Webhook - Mensagem recebida');
  
  try {
    // VALIDAÇÃO DE ASSINATURA DESABILITADA PARA TESTES LOCAIS
    // Em produção, descomente e configure WHATSAPP_APP_SECRET
    /*
    if (WHATSAPP_APP_SECRET) {
      const signature = req.get('X-Hub-Signature-256');
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
      const expectedSignature = crypto
        .createHmac('sha256', WHATSAPP_APP_SECRET)
        .update(body)
        .digest('hex');
      
      if (!signature || signature !== `sha256=${expectedSignature}`) {
        console.log('❌ Assinatura inválida');
        return res.status(401).send('Unauthorized');
      }
    }
    */
    
    // Parse do body
    let body;
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else if (Buffer.isBuffer(req.body)) {
      body = JSON.parse(req.body.toString());
    } else {
      body = req.body;
    }
    
    console.log('📝 Body recebido:', JSON.stringify(body, null, 2));
    
    // Verificar se é uma mensagem válida
    if (body.object !== 'whatsapp_business_account') {
      console.log('❌ Objeto inválido:', body.object);
      return res.status(400).send('Bad Request');
    }
    
    // Processar cada entrada
    if (body.entry && body.entry.length > 0) {
      for (const entry of body.entry) {
        await processWhatsAppEntry(entry);
      }
    }
    
    // Responder rapidamente ao WhatsApp
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ===============================================
// FUNÇÃO: BUSCAR USUÁRIO PADRÃO DO SISTEMA
// ===============================================
async function getDefaultUserId() {
  if (defaultUserId) {
    return defaultUserId;
  }
  
  try {
    // Buscar primeiro usuário ativo do sistema
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    
    if (error || !user) {
      console.log('⚠️ Nenhum usuário ativo encontrado no sistema');
      return null;
    }
    
    defaultUserId = user.id;
    console.log('👤 Usuário padrão definido:', defaultUserId);
    return defaultUserId;
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuário padrão:', error);
    return null;
  }
}

// ===============================================
// FUNÇÃO: PROCESSAR ENTRADA DO WEBHOOK
// ===============================================
async function processWhatsAppEntry(entry) {
  try {
    console.log('🔄 Processando entrada:', entry.id);
    
    if (!entry.changes || entry.changes.length === 0) {
      console.log('⚠️ Sem mudanças na entrada');
      return;
    }
    
    for (const change of entry.changes) {
      if (change.field === 'messages') {
        await processMessages(change.value);
      } else if (change.field === 'message_status') {
        await processMessageStatus(change.value);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar entrada:', error);
  }
}

// ===============================================
// FUNÇÃO: PROCESSAR MENSAGENS
// ===============================================
async function processMessages(value) {
  try {
    console.log('💬 Processando mensagens');
    
    if (!value.messages || value.messages.length === 0) {
      console.log('⚠️ Sem mensagens para processar');
      return;
    }
    
    const phoneNumberId = value.metadata?.phone_number_id;
    const displayPhoneNumber = value.metadata?.display_phone_number;
    
    console.log('📞 Phone Number ID:', phoneNumberId);
    console.log('📱 Display Phone:', displayPhoneNumber);
    
    // Processar cada mensagem
    for (const message of value.messages) {
      await processSingleMessage(message, phoneNumberId);
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar mensagens:', error);
  }
}

// ===============================================
// FUNÇÃO: PROCESSAR MENSAGEM INDIVIDUAL
// ===============================================
async function processSingleMessage(message, phoneNumberId) {
  try {
    console.log('📨 Processando mensagem:', message.id);
    
    const {
      id: whatsappMessageId,
      from: senderPhone,
      timestamp,
      type: messageType,
      text,
      image,
      audio,
      document,
      video
    } = message;
    
    // Extrair conteúdo baseado no tipo
    let content = '';
    let metadata = { 
      whatsapp_phone_number_id: phoneNumberId,
      timestamp: parseInt(timestamp),
      raw_message: message 
    };
    
    switch (messageType) {
      case 'text':
        content = text?.body || '';
        break;
      case 'image':
        content = image?.caption || '[Imagem]';
        metadata.media = {
          id: image?.id,
          mime_type: image?.mime_type,
          sha256: image?.sha256
        };
        break;
      case 'audio':
        content = '[Áudio]';
        metadata.media = {
          id: audio?.id,
          mime_type: audio?.mime_type,
          voice: audio?.voice || false
        };
        break;
      case 'document':
        content = document?.filename || '[Documento]';
        metadata.media = {
          id: document?.id,
          mime_type: document?.mime_type,
          filename: document?.filename
        };
        break;
      case 'video':
        content = video?.caption || '[Vídeo]';
        metadata.media = {
          id: video?.id,
          mime_type: video?.mime_type
        };
        break;
      default:
        content = `[${messageType}]`;
    }
    
    console.log('📝 Conteúdo extraído:', content);
    console.log('👤 Remetente:', senderPhone);
    
    // Buscar ou criar contato
    const contact = await findOrCreateContact(senderPhone, phoneNumberId);
    if (!contact) {
      console.log('❌ Erro ao buscar/criar contato');
      return;
    }
    
    // Buscar ou criar conversa
    const conversation = await findOrCreateConversation(contact);
    if (!conversation) {
      console.log('❌ Erro ao buscar/criar conversa');
      return;
    }
    
    // Verificar se mensagem já existe (evitar duplicatas)
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('whatsapp_message_id', whatsappMessageId)
      .maybeSingle(); // Usar maybeSingle() em vez de single()
    
    if (existingMessage) {
      console.log('⚠️ Mensagem já processada:', whatsappMessageId);
      return;
    }
    
    // Salvar mensagem no banco
    const { data: savedMessage, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        content,
        message_type: messageType,
        sender_type: 'contact',
        whatsapp_message_id: whatsappMessageId,
        metadata,
        created_at: new Date(parseInt(timestamp) * 1000).toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao salvar mensagem:', error);
      return;
    }
    
    console.log('✅ Mensagem salva:', savedMessage.id);
    
    // ===============================================
    // 🤖 PROCESSAMENTO DE IA - NOVO!
    // ===============================================
    // Processar mensagem com IA (assíncrono para não travar webhook)
    if (messageProcessor && savedMessage.id) {
      // Usar setImmediate para processar após responder ao WhatsApp
      setImmediate(async () => {
        try {
          console.log('🤖 Iniciando processamento IA para mensagem:', savedMessage.id);
          const processingResult = await messageProcessor.processMessage(savedMessage.id);
          
          if (processingResult && processingResult.success) {
            console.log('✅ Processamento IA concluído com sucesso');
            console.log(`🎯 Intenção detectada: ${processingResult.intention}`);
            console.log(`💬 Resposta gerada: ${processingResult.response?.substring(0, 100)}...`);
          } else {
            console.log('⚠️ Processamento IA finalizado com erro ou sem resultado');
          }
        } catch (error) {
          console.error('❌ Erro no processamento IA:', error.message);
          // Não falhar o webhook por erro de IA
        }
      });
    } else {
      console.log('🤖 [FUTURO] Processamento IA não disponível - executando sem IA');
    }
    
    // ===============================================
    // ATUALIZAR CONVERSA
    // ===============================================
    // Atualizar última interação da conversa
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        last_message: content.substring(0, 100),
        last_message_at: new Date().toISOString(),
        last_sender: 'contact',
        total_messages: (conversation.total_messages || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation.id);
    
    if (updateError) {
      console.error('❌ Erro ao atualizar conversa:', updateError);
    } else {
      console.log('✅ Conversa atualizada com sucesso');
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar mensagem individual:', error);
  }
}

// ===============================================
// FUNÇÃO: BUSCAR OU CRIAR CONTATO
// ===============================================
async function findOrCreateContact(phone, phoneNumberId) {
  try {
    // Limpar número de telefone
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Buscar contato existente
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle(); // Usar maybeSingle() para não dar erro se não encontrar
    
    if (existingContact) {
      console.log('👤 Contato encontrado:', existingContact.id);
      return existingContact;
    }
    
    // Buscar usuário padrão do sistema
    const systemUserId = await getDefaultUserId();
    if (!systemUserId) {
      console.log('❌ Nenhum usuário ativo no sistema para associar contato');
      return null;
    }
    
    // Criar novo contato associado ao usuário padrão
    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert({
        phone: cleanPhone,
        name: `Contato ${cleanPhone}`,
        lifecycle_stage: 'lead',
        user_id: systemUserId, // ✅ CORRIGIDO: Usar usuário válido
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar contato:', error);
      return null;
    }
    
    console.log('✅ Novo contato criado:', newContact.id, 'para usuário:', systemUserId);
    return newContact;
    
  } catch (error) {
    console.error('❌ Erro ao buscar/criar contato:', error);
    return null;
  }
}

// ===============================================
// FUNÇÃO: BUSCAR OU CRIAR CONVERSA
// ===============================================
async function findOrCreateConversation(contact) {
  try {
    // Buscar conversa ativa existente
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('status', 'open')
      .maybeSingle(); // Usar maybeSingle() para não dar erro se não encontrar
    
    if (existingConversation) {
      console.log('💬 Conversa encontrada:', existingConversation.id);
      return existingConversation;
    }
    
    // Verificar se o contato tem user_id válido
    if (!contact.user_id) {
      console.log('❌ Contato sem user_id válido:', contact.id);
      return null;
    }
    
    // Criar nova conversa
    const { data: newConversation, error } = await supabase
      .from('conversations')
      .insert({
        contact_id: contact.id,
        user_id: contact.user_id, // ✅ CORRIGIDO: Agora contact.user_id é válido
        status: 'open',
        ai_enabled: true,
        priority: 'normal',
        total_messages: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar conversa:', error);
      return null;
    }
    
    console.log('✅ Nova conversa criada:', newConversation.id, 'para usuário:', contact.user_id);
    return newConversation;
    
  } catch (error) {
    console.error('❌ Erro ao buscar/criar conversa:', error);
    return null;
  }
}

// ===============================================
// FUNÇÃO: PROCESSAR STATUS DE MENSAGENS
// ===============================================
async function processMessageStatus(value) {
  try {
    console.log('📊 Processando status de mensagens');
    
    if (!value.statuses || value.statuses.length === 0) {
      return;
    }
    
    for (const status of value.statuses) {
      const { id: whatsappMessageId, status: messageStatus, timestamp } = status;
      
      // Buscar mensagem existente
      const { data: message } = await supabase
        .from('messages')
        .select('metadata')
        .eq('whatsapp_message_id', whatsappMessageId)
        .maybeSingle();
      
      if (message) {
        // Atualizar metadata com status
        const updatedMetadata = {
          ...message.metadata,
          status: messageStatus,
          status_timestamp: timestamp
        };
        
        const { error } = await supabase
          .from('messages')
          .update({ metadata: updatedMetadata })
          .eq('whatsapp_message_id', whatsappMessageId);
        
        if (error) {
          console.error('❌ Erro ao atualizar status:', error);
        } else {
          console.log(`✅ Status atualizado: ${whatsappMessageId} → ${messageStatus}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar status:', error);
  }
}

// ===============================================
// WEBHOOKS DINÂMICOS MULTI-TENANT (ID 2.12)
// ===============================================

// Webhook dinâmico por usuário: /api/webhook/whatsapp/:userId
router.get('/whatsapp/:userId', (req, res) => {
    const { userId } = req.params;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log(`📱 WhatsApp webhook verificação para usuário: ${userId}`);

    if (mode === 'subscribe' && token) {
        console.log(`✅ WhatsApp webhook verificado para usuário: ${userId}`);
        res.status(200).send(challenge);
    } else {
        console.log(`❌ WhatsApp webhook verificação falhou para usuário: ${userId}`);
        res.status(403).send('Verificação falhou');
    }
});

// Webhook dinâmico para receber mensagens: /api/webhook/whatsapp/:userId
router.post('/whatsapp/:userId', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(`📱 WhatsApp webhook MULTI-TENANT para usuário: ${userId}`);
        
        // Parse do body (mesmo código da função original)
        let body;
        if (typeof req.body === 'string') {
            body = JSON.parse(req.body);
        } else if (Buffer.isBuffer(req.body)) {
            body = JSON.parse(req.body.toString());
        } else {
            body = req.body;
        }
        
        if (body.object !== 'whatsapp_business_account') {
            return res.status(400).send('Bad Request');
        }
        
        // Processar cada entrada com userId específico
        if (body.entry && body.entry.length > 0) {
            for (const entry of body.entry) {
                await processWhatsAppEntryMultiTenant(entry, userId);
            }
        }
        
        res.status(200).send('OK');
        
    } catch (error) {
        console.error('❌ Erro no webhook WhatsApp multi-tenant:', error);
        res.status(500).send('Internal Server Error');
    }
});

// ===============================================
// FUNÇÕES MULTI-TENANT (ID 2.12)
// ===============================================

// Processar entrada do webhook com userId específico
async function processWhatsAppEntryMultiTenant(entry, userId) {
    try {
        console.log(`🔄 Processando entrada multi-tenant para usuário: ${userId}`);
        
        if (!entry.changes || entry.changes.length === 0) {
            console.log('⚠️ Sem mudanças na entrada');
            return;
        }
        
        for (const change of entry.changes) {
            if (change.field === 'messages') {
                await processMessagesMultiTenant(change.value, userId);
            } else if (change.field === 'message_status') {
                await processMessageStatusMultiTenant(change.value, userId);
            }
        }
        
    } catch (error) {
        console.error(`❌ Erro ao processar entrada multi-tenant para usuário ${userId}:`, error);
    }
}

// Processar mensagens multi-tenant
async function processMessagesMultiTenant(value, userId) {
    try {
        console.log(`💬 Processando mensagens multi-tenant para usuário: ${userId}`);
        
        if (!value.messages || value.messages.length === 0) {
            console.log('⚠️ Sem mensagens para processar');
            return;
        }
        
        const phoneNumberId = value.metadata?.phone_number_id;
        
        // Processar cada mensagem
        for (const message of value.messages) {
            await processSingleMessageMultiTenant(message, phoneNumberId, userId);
        }
        
    } catch (error) {
        console.error(`❌ Erro ao processar mensagens multi-tenant para usuário ${userId}:`, error);
    }
}

// Processar mensagem individual multi-tenant
async function processSingleMessageMultiTenant(message, phoneNumberId, userId) {
    try {
        console.log(`📨 Processando mensagem multi-tenant para usuário: ${userId}`);
        
        const {
            id: whatsappMessageId,
            from: senderPhone,
            timestamp,
            type: messageType,
            text,
            image,
            audio,
            document,
            video
        } = message;
        
        // Extrair conteúdo (mesmo código da função original)
        let content = '';
        let metadata = { 
            whatsapp_phone_number_id: phoneNumberId,
            timestamp: parseInt(timestamp),
            raw_message: message,
            user_id: userId // Adicionar user_id no metadata
        };
        
        switch (messageType) {
            case 'text':
                content = text?.body || '';
                break;
            case 'image':
                content = image?.caption || '[Imagem]';
                metadata.media = {
                    id: image?.id,
                    mime_type: image?.mime_type,
                    sha256: image?.sha256
                };
                break;
            case 'audio':
                content = '[Áudio]';
                metadata.media = {
                    id: audio?.id,
                    mime_type: audio?.mime_type,
                    voice: audio?.voice || false
                };
                break;
            case 'document':
                content = document?.filename || '[Documento]';
                metadata.media = {
                    id: document?.id,
                    mime_type: document?.mime_type,
                    filename: document?.filename
                };
                break;
            case 'video':
                content = video?.caption || '[Vídeo]';
                metadata.media = {
                    id: video?.id,
                    mime_type: video?.mime_type
                };
                break;
            default:
                content = `[${messageType}]`;
        }
        
        // Buscar ou criar contato multi-tenant
        const contact = await findOrCreateContactMultiTenant(senderPhone, phoneNumberId, userId);
        if (!contact) {
            console.log('❌ Erro ao buscar/criar contato multi-tenant');
            return;
        }
        
        // Buscar ou criar conversa multi-tenant
        const conversation = await findOrCreateConversationMultiTenant(contact, userId);
        if (!conversation) {
            console.log('❌ Erro ao buscar/criar conversa multi-tenant');
            return;
        }
        
        // Verificar se mensagem já existe
        const { data: existingMessage } = await supabase
            .from('messages')
            .select('id')
            .eq('whatsapp_message_id', whatsappMessageId)
            .eq('user_id', userId) // Filtrar por usuário
            .maybeSingle();
        
        if (existingMessage) {
            console.log('⚠️ Mensagem já processada:', whatsappMessageId);
            return;
        }
        
        // Salvar mensagem multi-tenant
        const { data: savedMessage, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversation.id,
                content,
                message_type: messageType,
                sender_type: 'contact',
                whatsapp_message_id: whatsappMessageId,
                channel_type: 'whatsapp', // Novo campo
                channel_message_id: whatsappMessageId, // Novo campo
                user_id: userId, // Novo campo - MULTI-TENANT
                metadata,
                created_at: new Date(parseInt(timestamp) * 1000).toISOString()
            })
            .select()
            .single();
        
        if (error) {
            console.error('❌ Erro ao salvar mensagem multi-tenant:', error);
            return;
        }
        
        console.log(`✅ Mensagem multi-tenant salva: ${savedMessage.id} para usuário: ${userId}`);
        
        // Processamento IA (mesmo código da função original)
        if (messageProcessor && savedMessage.id) {
            setImmediate(async () => {
                try {
                    console.log(`🤖 Iniciando processamento IA multi-tenant para mensagem: ${savedMessage.id}`);
                    const processingResult = await messageProcessor.processMessage(savedMessage.id);
                    
                    if (processingResult && processingResult.success) {
                        console.log('✅ Processamento IA multi-tenant concluído com sucesso');
                    }
                } catch (error) {
                    console.error('❌ Erro no processamento IA multi-tenant:', error.message);
                }
            });
        }
        
        // Atualizar conversa
        const { error: updateError } = await supabase
            .from('conversations')
            .update({
                last_message: content.substring(0, 100),
                last_message_at: new Date().toISOString(),
                last_sender: 'contact',
                total_messages: (conversation.total_messages || 0) + 1,
                updated_at: new Date().toISOString()
            })
            .eq('id', conversation.id)
            .eq('user_id', userId); // Filtrar por usuário
        
        if (updateError) {
            console.error('❌ Erro ao atualizar conversa multi-tenant:', updateError);
        } else {
            console.log('✅ Conversa multi-tenant atualizada com sucesso');
        }
        
    } catch (error) {
        console.error(`❌ Erro ao processar mensagem individual multi-tenant para usuário ${userId}:`, error);
    }
}

// Buscar ou criar contato multi-tenant
async function findOrCreateContactMultiTenant(phone, phoneNumberId, userId) {
    try {
        // Limpar número de telefone
        const cleanPhone = phone.replace(/\D/g, '');
        
        // Buscar contato existente para este usuário específico
        const { data: existingContact } = await supabase
            .from('contacts')
            .select('*')
            .eq('phone', cleanPhone)
            .eq('user_id', userId) // Filtrar por usuário
            .maybeSingle();
        
        if (existingContact) {
            console.log(`👤 Contato encontrado para usuário ${userId}:`, existingContact.id);
            return existingContact;
        }
        
        // Criar novo contato associado ao usuário específico
        const { data: newContact, error } = await supabase
            .from('contacts')
            .insert({
                phone: cleanPhone,
                name: `Contato ${cleanPhone}`,
                lifecycle_stage: 'lead',
                user_id: userId, // Associar ao usuário específico
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) {
            console.error(`❌ Erro ao criar contato para usuário ${userId}:`, error);
            return null;
        }
        
        console.log(`✅ Novo contato criado para usuário ${userId}:`, newContact.id);
        return newContact;
        
    } catch (error) {
        console.error(`❌ Erro ao buscar/criar contato para usuário ${userId}:`, error);
        return null;
    }
}

// Buscar ou criar conversa multi-tenant
async function findOrCreateConversationMultiTenant(contact, userId) {
    try {
        // Buscar conversa ativa existente para este usuário
        const { data: existingConversation } = await supabase
            .from('conversations')
            .select('*')
            .eq('contact_id', contact.id)
            .eq('user_id', userId) // Filtrar por usuário
            .eq('status', 'open')
            .maybeSingle();
        
        if (existingConversation) {
            console.log(`💬 Conversa encontrada para usuário ${userId}:`, existingConversation.id);
            return existingConversation;
        }
        
        // Criar nova conversa associada ao usuário específico
        const { data: newConversation, error } = await supabase
            .from('conversations')
            .insert({
                contact_id: contact.id,
                user_id: userId, // Associar ao usuário específico
                status: 'open',
                ai_enabled: true,
                priority: 'normal',
                total_messages: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) {
            console.error(`❌ Erro ao criar conversa para usuário ${userId}:`, error);
            return null;
        }
        
        console.log(`✅ Nova conversa criada para usuário ${userId}:`, newConversation.id);
        return newConversation;
        
    } catch (error) {
        console.error(`❌ Erro ao buscar/criar conversa para usuário ${userId}:`, error);
        return null;
    }
}

// Processar status de mensagem multi-tenant
async function processMessageStatusMultiTenant(value, userId) {
    try {
        console.log(`📊 Processando status de mensagens multi-tenant para usuário: ${userId}`);
        
        if (!value.statuses || value.statuses.length === 0) {
            return;
        }
        
        for (const status of value.statuses) {
            const { id: whatsappMessageId, status: messageStatus, timestamp } = status;
            
            // Buscar mensagem existente para este usuário
            const { data: message } = await supabase
                .from('messages')
                .select('metadata')
                .eq('whatsapp_message_id', whatsappMessageId)
                .eq('user_id', userId) // Filtrar por usuário
                .maybeSingle();
            
            if (message) {
                // Atualizar metadata com status
                const updatedMetadata = {
                    ...message.metadata,
                    status: messageStatus,
                    status_timestamp: timestamp
                };
                
                const { error } = await supabase
                    .from('messages')
                    .update({ metadata: updatedMetadata })
                    .eq('whatsapp_message_id', whatsappMessageId)
                    .eq('user_id', userId); // Filtrar por usuário
                
                if (error) {
                    console.error(`❌ Erro ao atualizar status para usuário ${userId}:`, error);
                } else {
                    console.log(`✅ Status atualizado para usuário ${userId}: ${whatsappMessageId} → ${messageStatus}`);
                }
            }
        }
        
    } catch (error) {
        console.error(`❌ Erro ao processar status para usuário ${userId}:`, error);
    }
}



module.exports = router;