// apps/api/src/routes/templates.js
const express = require('express');
const router = express.Router();
const TemplateService = require('../services/template-service');
const { authenticateToken } = require('../middleware/auth');
const { supabase } = require('../config/supabase');

// Middleware de autenticação
router.use(authenticateToken);

// Listar templates aprovados
router.get('/', async (req, res) => {
    try {
        const { channel_type } = req.query;
        const userId = req.user.id;
        
        if (!channel_type) {
            return res.status(400).json({
                error: 'channel_type é obrigatório'
            });
        }
        
        const templates = await TemplateService.getAvailableTemplates(userId, channel_type);
        
        res.json({
            success: true,
            templates: templates,
            count: templates.length
        });
        
    } catch (error) {
        console.error('❌ Erro ao listar templates:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// Sincronizar templates do WhatsApp
router.post('/sync/whatsapp', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const templates = await TemplateService.syncWhatsAppTemplates(userId);
        
        res.json({
            success: true,
            message: 'Templates sincronizados com sucesso',
            count: templates.length,
            templates: templates
        });
        
    } catch (error) {
        console.error('❌ Erro ao sincronizar templates WhatsApp:', error);
        res.status(500).json({
            error: 'Erro ao sincronizar templates'
        });
    }
});

// Enviar template aprovado
router.post('/send', async (req, res) => {
    try {
        const { channel_type, recipient_phone, template_name, parameters } = req.body;
        const userId = req.user.id;
        
        if (!channel_type || !recipient_phone || !template_name) {
            return res.status(400).json({
                error: 'channel_type, recipient_phone e template_name são obrigatórios'
            });
        }
        
        const sent = await TemplateService.sendApprovedTemplate(
            userId,
            channel_type,
            recipient_phone,
            template_name,
            parameters || []
        );
        
        if (sent) {
            res.json({
                success: true,
                message: 'Template enviado com sucesso'
            });
        } else {
            res.status(400).json({
                error: 'Falha ao enviar template'
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao enviar template:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// Buscar template específico
router.get('/:templateId', async (req, res) => {
    try {
        const { templateId } = req.params;
        const { channel_type } = req.query;
        const userId = req.user.id;
        
        const { data: template, error } = await supabase
            .from('approved_templates')
            .select('*')
            .eq('user_id', userId)
            .eq('template_id', templateId)
            .eq('channel_type', channel_type)
            .single();
            
        if (error || !template) {
            return res.status(404).json({
                error: 'Template não encontrado'
            });
        }
        
        res.json({
            success: true,
            template: template
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar template:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

module.exports = router;