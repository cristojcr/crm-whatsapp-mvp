// apps/api/src/routes/partner-notifications.js
const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const partnerNotificationService = require('../services/partner-notifications');

const router = express.Router();

// GET /api/partner-notifications - Listar notificações do parceiro
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, unread_only = false } = req.query;

    // Buscar parceiro pelo user_id
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (partnerError || !partner) {
      return res.status(404).json({ error: 'Parceiro não encontrado' });
    }

    let query = supabase
      .from('partner_notifications')
      .select('*')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false });

    if (unread_only === 'true') {
      query = query.eq('read', false);
    }

    const { data: notifications, error } = await query
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    // Contar notificações não lidas
    const { count: unreadCount, error: countError } = await supabase
      .from('partner_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partner.id)
      .eq('read', false);

    if (countError) throw countError;

    res.json({
      notifications,
      unread_count: unreadCount,
      total: notifications.length
    });

  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/partner-notifications/:id/read - Marcar como lida
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Buscar parceiro
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (partnerError || !partner) {
      return res.status(404).json({ error: 'Parceiro não encontrado' });
    }

    const success = await partnerNotificationService.markAsRead(id, partner.id);

    if (success) {
      res.json({ success: true, message: 'Notificação marcada como lida' });
    } else {
      res.status(500).json({ error: 'Erro ao marcar notificação como lida' });
    }

  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/partner-notifications/read-all - Marcar todas como lidas
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar parceiro
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (partnerError || !partner) {
      return res.status(404).json({ error: 'Parceiro não encontrado' });
    }

    const success = await partnerNotificationService.markAllAsRead(partner.id);

    if (success) {
      res.json({ success: true, message: 'Todas notificações marcadas como lidas' });
    } else {
      res.status(500).json({ error: 'Erro ao marcar notificações como lidas' });
    }

  } catch (error) {
    console.error('Erro ao marcar todas notificações como lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/partner-notifications/health - Health check do sistema
router.get('/health', async (req, res) => {
  try {
    // Testar conexão com banco
    const { data: testQuery, error } = await supabase
      .from('partner_notifications')
      .select('count', { count: 'exact', head: true });

    if (error) throw error;

    // Estatísticas básicas
    const { data: stats, error: statsError } = await supabase
      .from('partner_notifications')
      .select('read')
      .limit(1000);

    if (statsError) throw statsError;

    const totalNotifications = stats.length;
    const unreadCount = stats.filter(n => !n.read).length;

    res.json({
      status: 'healthy',
      service: 'partner-notifications',
      database: 'connected',
      timestamp: new Date().toISOString(),
      stats: {
        total_notifications: totalNotifications,
        unread_notifications: unreadCount,
        read_notifications: totalNotifications - unreadCount
      }
    });

  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      service: 'partner-notifications',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;