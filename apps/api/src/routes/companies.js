const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../config/supabase');

// Função para gerar slug único
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

// GET /api/companies - Listar empresas do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, active } = req.query;
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('companies')
      .select(`
        *,
        company_settings(*),
        user_profiles!inner(user_id, role)
      `)
      .eq('user_profiles.user_id', req.user.id);
    
    // Filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,business_type.ilike.%${search}%`);
    }
    
    if (active !== undefined) {
      query = query.eq('is_active', active === 'true');
    }
    
    const { data: companies, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);
    
    if (error) throw error;
    
    // Contar total
    const { count: total } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('user_profiles.user_id', req.user.id);
    
    res.json({
      companies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao buscar empresas'
    });
  }
});

// POST /api/companies - Criar nova empresa
router.post('/', authenticateToken, async (req, res) => {
  // ===== DEBUG - INÍCIO =====
  console.log('🔍 DEBUG COMPANIES - Dados recebidos:');
  console.log('req.body:', JSON.stringify(req.body, null, 2));
  console.log('req.body.name:', req.body.name);
  console.log('req.body.business_type:', req.body.business_type);
  console.log('req.body.industry:', req.body.industry);
  console.log('req.user.id:', req.user?.id);
  console.log('typeof name:', typeof req.body.name);
  console.log('typeof business_type:', typeof req.body.business_type);
  console.log('typeof industry:', typeof req.body.industry);
  // ========================================
  
  try {
    const {
      name,
      slug,
      business_type,
      industry,
      website,
      phone,
      email,
      address,
      city,
      state,
      postal_code,
      description
      
    } = req.body;
    
    // Validações flexíveis - aceita business_type OU industry
    if (!name || (!business_type && !industry)) {
      console.log('❌ Validação falhou:');
      console.log('  name:', name);
      console.log('  business_type:', business_type);
      console.log('  industry:', industry);
      
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Nome e tipo de negócio (business_type ou industry) são obrigatórios'
      });
    }
    
    // Usar business_type se fornecido, senão usar industry
    const finalBusinessType = business_type || industry;
    
    console.log('✅ Validação passou - finalBusinessType:', finalBusinessType);
    
    // Gerar slug único
    let finalSlug = slug || generateSlug(name);
    
    console.log('🔧 Slug gerado:', finalSlug);
    
    // Verificar se slug já existe
    const { data: existingSlug, error: slugError } = await supabase
      .from('companies')
      .select('slug')
      .eq('slug', finalSlug)
      .single();
    
    if (slugError && slugError.code !== 'PGRST116') {
      console.error('❌ Erro ao verificar slug:', slugError);
      throw slugError;
    }
    
    if (existingSlug) {
      finalSlug = `${finalSlug}-${Date.now()}`;
      console.log('🔄 Slug atualizado para evitar duplicação:', finalSlug);
    }
    
    console.log('💾 Criando empresa no banco...');
    
    // Criar empresa
    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        name,
        slug: finalSlug,
        business_type: finalBusinessType,
        industry: industry || finalBusinessType,
        website,
        phone,
        email,
        address,
        city,
        state,
        postal_code,
        description,
        owner_id: req.user.id
    
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar empresa:', error);
      throw error;
    }
    
    console.log('✅ Empresa criada:', company.id);
    
    // Criar perfil do usuário como OWNER da empresa
    console.log('👤 Criando perfil de usuário...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: req.user.id,
        company_id: company.id,
        role: 'OWNER'
      });
    
    if (profileError) {
      console.error('❌ Erro ao criar perfil:', profileError);
      throw profileError;
    }
    
    console.log('✅ Perfil criado');
    
    // Criar configurações padrão da empresa
    console.log('⚙️ Criando configurações da empresa...');
    const { error: settingsError } = await supabase
      .from('company_settings')
      .insert({
        company_id: company.id
      });
    
    if (settingsError) {
      console.error('❌ Erro ao criar configurações:', settingsError);
      throw settingsError;
    }
    
    console.log('✅ Configurações criadas');
    console.log('🎉 Empresa totalmente configurada!');
    
    res.status(201).json({
      message: 'Empresa criada com sucesso',
      company
    });
    
  } catch (error) {
    console.error('❌ Erro geral ao criar empresa:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao criar empresa',
      details: error.message
    });
  }
});

// GET /api/companies/:id - Buscar empresa por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: company, error } = await supabase
      .from('companies')
      .select(`
        *,
        company_settings(*),
        user_profiles!inner(user_id, role)
      `)
      .eq('id', id)
      .eq('user_profiles.user_id', req.user.id)
      .single();
    
    if (error) throw error;
    
    if (!company) {
      return res.status(404).json({
        error: 'Empresa não encontrada'
      });
    }
    
    res.json(company);
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao buscar empresa'
    });
  }
});

// PUT /api/companies/:id - Atualizar empresa
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      business_type,
      industry,
      website,
      phone,
      email,
      address,
      city,
      state,
      postal_code,
      description,
      is_active
    } = req.body;
    
    // Verificar permissão
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', req.user.id)
      .eq('company_id', id)
      .single();
    
    if (!userProfile || !['OWNER', 'ADMIN'].includes(userProfile.role)) {
      return res.status(403).json({
        error: 'Sem permissão para atualizar empresa'
      });
    }
    
    const { data: company, error } = await supabase
      .from('companies')
      .update({
        name,
        business_type,
        industry,
        website,
        phone,
        email,
        address,
        city,
        state,
        postal_code,
        description,
        is_active
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(company);
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao atualizar empresa'
    });
  }
});

// DELETE /api/companies/:id - Deletar empresa
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se é OWNER
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', req.user.id)
      .eq('company_id', id)
      .single();
    
    if (!userProfile || userProfile.role !== 'OWNER') {
      return res.status(403).json({
        error: 'Apenas o proprietário pode deletar a empresa'
      });
    }
    
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({
      message: 'Empresa deletada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar empresa:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao deletar empresa'
    });
  }
});

module.exports = router;