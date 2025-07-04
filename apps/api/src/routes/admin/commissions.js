// apps/api/src/routes/admin/commissions.js
const express = require('express');
const { supabase } = require('../../config/supabase');
const { authenticateToken } = require('../../middleware/auth');
const commissionProcessor = require('../../services/commission-processor');

const router = express.Router();

// GET /api/admin/commissions - Listar comissões
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      status,
      partner_id,
      month,
      year,
      limit = 50,
      offset = 0
    } = req.query;

    let query = supabase
      .from('partner_commissions')
      .select(`
        *,
        partners (partner_code, business_name, email),
        partner_referrals (client_email, signup_date)
      `)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (partner_id) query = query.eq('partner_id', partner_id);
    if (month) query = query.eq('reference_month', parseInt(month));
    if (year) query = query.eq('reference_year', parseInt(year));

    const { data: commissions, error } = await query
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    // Buscar totais
    const { data: totals, error: totalsError } = await supabase
      .from('partner_commissions')
      .select('status, commission_amount')
      .gte('created_at', '2024-01-01');

    if (totalsError) throw totalsError;

    const summary = totals.reduce((acc, comm) => {
      if (!acc[comm.status]) {
        acc[comm.status] = { count: 0, amount: 0 };
      }
      acc[comm.status].count++;
      acc[comm.status].amount += parseFloat(comm.commission_amount);
      return acc;
    }, {});

    res.json({
      commissions,
      summary,
      total: commissions.length
    });

  } catch (error) {
    console.error('Erro ao buscar comissões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/commissions/process-monthly - Processar comissões mensais
router.post('/process-monthly', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({ error: 'Ano e mês são obrigatórios' });
    }

    const commissions = await commissionProcessor.processMonthlyCommissions(year, month);

    // Log da ação
    await supabase
      .from('audit_logs')
      .insert({
        entity_id: req.user.id,
        action: 'process_monthly_commissions',
        entity_type: 'partner_commissions',
        description: `Processamento de comissões mensais para período ${month}/${year}`,
        category: 'financial',
        metadata: {
          period: `${month}/${year}`,
          commissions_processed: commissions.length,
          timestamp: new Date().toISOString()
        },
        status: 'success',
        severity: 'info'
      });

    res.json({
      success: true,
      message: `${commissions.length} comissões processadas para ${month}/${year}`,
      commissions
    });

  } catch (error) {
    console.error('Erro ao processar comissões mensais:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/admin/commissions/:id/approve - Aprovar comissão
router.put('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const commission = await commissionProcessor.approveCommission(id, adminId);

    // Log da ação
    await supabase
      .from('audit_logs')
      .insert({
        entity_id: adminId,
        action: 'approve_commission',
        entity_type: 'partner_commissions',
        description: `Aprovação de comissão ID ${id} no valor de ${commission.commission_amount}`,
        category: 'financial',
        metadata: {
          commission_id: id,
          commission_amount: commission.commission_amount,
          partner_id: commission.partner_id,
          timestamp: new Date().toISOString()
        },
        status: 'success',
        severity: 'info'
      });

    res.json({
      success: true,
      message: 'Comissão aprovada com sucesso',
      commission
    });

  } catch (error) {
    console.error('Erro ao aprovar comissão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/admin/commissions/:id/pay - Marcar como paga
router.put('/:id/pay', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, payment_reference, net_amount } = req.body;

    if (!payment_method || !payment_reference) {
      return res.status(400).json({
        error: 'Método de pagamento e referência são obrigatórios'
      });
    }

    const { data: commission, error } = await supabase
      .from('partner_commissions')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method,
        payment_reference,
        net_amount: net_amount || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log da ação
    await supabase
      .from('audit_logs')
      .insert({
        entity_id: req.user.id,
        action: 'pay_commission',
        entity_type: 'partner_commissions',
        description: `Pagamento de comissão ID ${id} no valor de ${commission.commission_amount} via ${payment_method}`,
        category: 'financial',
        metadata: {
          commission_id: id,
          commission_amount: commission.commission_amount,
          payment_method: payment_method,
          payment_reference: payment_reference,
          timestamp: new Date().toISOString()
        },
        status: 'success',
        severity: 'info'
      });

    res.json({
      success: true,
      message: 'Comissão marcada como paga',
      commission
    });

  } catch (error) {
    console.error('Erro ao marcar comissão como paga:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/commissions/report - Gerar relatório financeiro
router.get('/report', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        error: 'Data inicial e final são obrigatórias'
      });
    }

    const report = await commissionProcessor.generateFinancialReport(start_date, end_date);

    res.json(report);

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/commissions/bulk-approve - Aprovar múltiplas comissões
router.post('/bulk-approve', authenticateToken, async (req, res) => {
  try {
    const { commission_ids } = req.body;

    if (!Array.isArray(commission_ids) || commission_ids.length === 0) {
      return res.status(400).json({ error: 'IDs de comissões são obrigatórios' });
    }

    const results = [];
    const adminId = req.user.id;

    for (const id of commission_ids) {
      try {
        const commission = await commissionProcessor.approveCommission(id, adminId);
        results.push({ id, success: true, commission });
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }

    // Log da ação
    await supabase
      .from('audit_logs')
      .insert({
        entity_id: adminId,
        action: 'bulk_approve_commissions',
        entity_type: 'partner_commissions',
        description: `Aprovação em massa de ${results.filter(r => r.success).length} comissões (${results.filter(r => !r.success).length} falharam)`,
        category: 'financial',
        metadata: {
          commission_ids: commission_ids,
          approved_count: results.filter(r => r.success).length,
          failed_count: results.filter(r => !r.success).length,
          timestamp: new Date().toISOString()
        },
        status: 'success',
        severity: 'info'
      });

    res.json({
      success: true,
      message: `${results.filter(r => r.success).length} comissões aprovadas`,
      results
    });

  } catch (error) {
    console.error('Erro ao aprovar comissões em lote:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/commissions/pending - Listar comissões pendentes
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const commissions = await commissionProcessor.getPendingCommissions();

    res.json({
      success: true,
      commissions,
      total: commissions.length
    });

  } catch (error) {
    console.error('Erro ao buscar comissões pendentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;