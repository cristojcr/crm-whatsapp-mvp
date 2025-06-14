const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../config/supabase');

// GET /api/company-settings/:companyId - Buscar configurações da empresa
router.get('/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    // Verificar se usuário tem acesso à empresa
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', req.user.id)
      .eq('company_id', companyId)
      .single();
    
    if (!userProfile) {
      return res.status(403).json({
        error: 'Sem acesso a esta empresa'
      });
    }
    
    const { data: settings, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('company_id', companyId)
      .single();
    
    if (error) throw error;
    
    res.json(settings);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao buscar configurações da empresa'
    });
  }
});

// PUT /api/company-settings/:companyId - Atualizar configurações
router.put('/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const {
      business_hours,
      timezone,
      language,
      auto_reply_enabled,
      auto_reply_message,
      ai_enabled,
      ai_model,
      ai_personality,
      webhook_url,
      whatsapp_token,
      whatsapp_phone_id
    } = req.body;
    
    // Verificar permissões (OWNER, ADMIN, MANAGER)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', req.user.id)
      .eq('company_id', companyId)
      .single();
    
    if (!userProfile || !['OWNER', 'ADMIN', 'MANAGER'].includes(userProfile.role)) {
      return res.status(403).json({
        error: 'Sem permissão para alterar configurações'
      });
    }
    
    const { data: settings, error } = await supabase
      .from('company_settings')
      .update({
        business_hours,
        timezone,
        language,
        auto_reply_enabled,
        auto_reply_message,
        ai_enabled,
        ai_model,
        ai_personality,
        webhook_url,
        whatsapp_token,
        whatsapp_phone_id
      })
      .eq('company_id', companyId)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(settings);
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao atualizar configurações'
    });
  }
});

module.exports = router;