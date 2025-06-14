const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../config/supabase');

// GET /api/user-profile/me - Buscar meu perfil
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        companies(*),
        users(id, email, name, phone)
      `)
      .eq('user_id', req.user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    if (!profile) {
      // Se não existe perfil, criar um básico
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: req.user.id,
          role: 'AGENT'
        })
        .select(`
          *,
          companies(*),
          users(id, email, name, phone)
        `)
        .single();
      
      if (createError) throw createError;
      
      return res.json(newProfile);
    }
    
    res.json(profile);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao buscar perfil do usuário'
    });
  }
});

// PUT /api/user-profile/me - Atualizar meu perfil
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const {
      department,
      position,
      avatar_url,
      bio,
      phone_secondary,
      emergency_contact,
      timezone,
      language,
      notifications_email,
      notifications_whatsapp,
      notifications_sms,
      two_factor_enabled
    } = req.body;
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update({
        department,
        position,
        avatar_url,
        bio,
        phone_secondary,
        emergency_contact,
        timezone,
        language,
        notifications_email,
        notifications_whatsapp,
        notifications_sms,
        two_factor_enabled,
        last_activity_at: new Date().toISOString()
      })
      .eq('user_id', req.user.id)
      .select(`
        *,
        companies(*),
        users(id, email, name, phone)
      `)
      .single();
    
    if (error) throw error;
    
    res.json(profile);
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao atualizar perfil'
    });
  }
});

// GET /api/user-profile/:id - Buscar perfil de outro usuário
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        companies(*),
        users(id, email, name, phone)
      `)
      .eq('user_id', id)
      .single();
    
    if (error) throw error;
    
    if (!profile) {
      return res.status(404).json({
        error: 'Perfil não encontrado'
      });
    }
    
    // Verificar se tem permissão para ver este perfil
    const { data: myProfile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', req.user.id)
      .single();
    
    if (!myProfile || 
        (profile.company_id !== myProfile.company_id) ||
        !['OWNER', 'ADMIN', 'MANAGER'].includes(myProfile.role)) {
      return res.status(403).json({
        error: 'Sem permissão para ver este perfil'
      });
    }
    
    res.json(profile);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao buscar perfil do usuário'
    });
  }
});

// PUT /api/user-profile/:id/role - Alterar role do usuário
router.put('/:id/role', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['OWNER', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER'].includes(role)) {
      return res.status(400).json({
        error: 'Role inválido'
      });
    }
    
    // Verificar permissões
    const { data: myProfile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', req.user.id)
      .single();
    
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('user_id', id)
      .single();
    
    if (!myProfile || !targetProfile || 
        myProfile.company_id !== targetProfile.company_id ||
        !['OWNER', 'ADMIN'].includes(myProfile.role)) {
      return res.status(403).json({
        error: 'Sem permissão para alterar role'
      });
    }
    
    // OWNER não pode ter role alterado
    if (targetProfile.role === 'OWNER') {
      return res.status(403).json({
        error: 'Não é possível alterar role do proprietário'
      });
    }
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('user_id', id)
      .select(`
        *,
        companies(*),
        users(id, email, name, phone)
      `)
      .single();
    
    if (error) throw error;
    
    res.json(profile);
  } catch (error) {
    console.error('Erro ao alterar role:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao alterar role do usuário'
    });
  }
});

// PUT /api/user-profile/:id/company - Alterar empresa do usuário
router.put('/:id/company', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id, role = 'AGENT' } = req.body;
    
    // Apenas OWNER pode mover usuários entre empresas
    const { data: myProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', req.user.id)
      .single();
    
    if (!myProfile || myProfile.role !== 'OWNER') {
      return res.status(403).json({
        error: 'Apenas proprietários podem alterar empresa de usuários'
      });
    }
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update({ 
        company_id,
        role: role !== 'OWNER' ? role : 'ADMIN' // Evitar múltiplos OWNERs
      })
      .eq('user_id', id)
      .select(`
        *,
        companies(*),
        users(id, email, name, phone)
      `)
      .single();
    
    if (error) throw error;
    
    res.json(profile);
  } catch (error) {
    console.error('Erro ao alterar empresa:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao alterar empresa do usuário'
    });
  }
});

module.exports = router;