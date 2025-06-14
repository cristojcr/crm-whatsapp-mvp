const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../config/supabase');

// GET /api/contacts - Listar todos os contatos do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, tags } = req.query;
    const offset = (page - 1) * limit;
    
    // Construir query base
    let query = supabase
      .from('contacts')
      .select('*, conversations(count)')
      .eq('user_id', req.user.id);
    
    // Adicionar filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }
    
    if (tags && tags.length > 0) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query = query.overlaps('tags', tagArray);
    }
    
    // Adicionar paginação e ordenação
    const { data: contacts, error } = await query
      .order('updated_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);
    
    if (error) throw error;
    
    // Contar total para paginação
    const { count: total } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);
    
    res.json({
      contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar contatos:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao buscar contatos'
    });
  }
});

// POST /api/contacts - Criar novo contato

router.post('/', authenticateToken, async (req, res) => {
  try {
    // DEBUG MAIS DETALHADO
    console.log('🚨🚨🚨 DEBUG CREATE CONTACT 🚨🚨🚨');
    console.log('req.user:', JSON.stringify(req.user, null, 2));
    console.log('req.user existe?', !!req.user);
    console.log('req.user.id:', req.user?.id);
    console.log('req.user.id type:', typeof req.user?.id);
    console.log('req.headers.authorization:', req.headers.authorization?.substring(0, 50) + '...');
    console.log('req.body:', req.body);
    
    // Verificar se req.user existe
    if (!req.user || !req.user.id) {
      console.log('❌ ERRO: req.user ou req.user.id não existe!');
      return res.status(401).json({
        error: 'Usuário não autenticado ou ID não encontrado',
        debug: {
          hasUser: !!req.user,
          userId: req.user?.id
        }
      });
    }
    
    const { name, phone, email, tags, notes } = req.body;
    
    // Validações
    if (!phone) {
      return res.status(400).json({
        error: 'Telefone é obrigatório'
      });
    }
    
    // ... resto do código igual
    
    // Verificar se já existe contato com este telefone
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', phone)
      .eq('user_id', req.user.id)
      .single();
    
    if (existingContact) {
      return res.status(409).json({
        error: 'Já existe um contato com este telefone'
      });
    }
    
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        name: name || null,
        phone,
        email: email || null,
        tags: tags || [],
        notes: notes || null,
        user_id: req.user.id
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(contact);
  } catch (error) {
    console.error('Erro ao criar contato:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao criar contato'
    });
  }
});

// PUT /api/contacts/:id - Atualizar contato
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, tags, notes } = req.body;
    
    const { data: contact, error } = await supabase
      .from('contacts')
      .update({
        name: name || null,
        phone,
        email: email || null,
        tags: tags || [],
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    
    if (error) throw error;
    
    if (!contact) {
      return res.status(404).json({
        error: 'Contato não encontrado'
      });
    }
    
    res.json(contact);
  } catch (error) {
    console.error('Erro ao atualizar contato:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao atualizar contato'
    });
  }
});

// DELETE /api/contacts/:id - Deletar contato
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    
    res.json({
      message: 'Contato deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar contato:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao deletar contato'
    });
  }
});

module.exports = router;