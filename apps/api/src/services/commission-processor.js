// apps/api/src/services/commission-processor.js
const { supabase } = require('../config/supabase');
const partnerNotificationService = require('./partner-notifications');

class CommissionProcessor {
  // Processar comissões mensais
  async processMonthlyCommissions(year, month) {
    try {
      console.log(`Processando comissões para ${month}/${year}`);
      
      // Buscar configurações de pagamento
      const { data: settings } = await supabase
        .from('partner_settings')
        .select('setting_value')
        .eq('setting_key', 'payment_schedule')
        .single();
        
      const paymentConfig = settings?.setting_value || { minimum_amount: 100 };
      
      // Buscar todas as indicações convertidas no período
      const { data: conversions, error } = await supabase
        .from('partner_referrals')
        .select(`
          *,
          partners (id, commission_tier, custom_commission_rate),
          subscriptions (plan_value, status)
        `)
        .eq('status', 'converted')
        .gte('converted_at', `${year}-${month.toString().padStart(2, '0')}-01`)
        .lt('converted_at', `${year}-${(month + 1).toString().padStart(2, '0')}-01`);
        
      if (error) throw error;
      
      // Agrupar por parceiro
      const partnerCommissions = {};
      
      for (const conversion of conversions) {
        const partnerId = conversion.partner_id;
        
        if (!partnerCommissions[partnerId]) {
          partnerCommissions[partnerId] = {
            partner: conversion.partners,
            conversions: [],
            total_commission: 0
          };
        }
        
        // Calcular comissão
        const commission = this.calculateCommission(
          conversion.subscriptions.plan_value,
          conversion.partners.commission_tier,
          conversion.partners.custom_commission_rate
        );
        
        partnerCommissions[partnerId].conversions.push({
          ...conversion,
          commission_amount: commission
        });
        
        partnerCommissions[partnerId].total_commission += commission;
      }
      
      // Processar pagamentos
      const processedCommissions = [];
      
      for (const [partnerId, data] of Object.entries(partnerCommissions)) {
        if (data.total_commission >= paymentConfig.minimum_amount) {
          // Criar registro de comissão
          const { data: commission, error: commissionError } = await supabase
            .from('partner_commissions')
            .insert({
              partner_id: partnerId,
              reference_month: month,
              reference_year: year,
              commission_amount: data.total_commission,
              status: 'pending',
              conversion_count: data.conversions.length,
              payment_data: {
                conversions: data.conversions.map(c => c.id),
                calculated_at: new Date().toISOString()
              }
            })
            .select()
            .single();
            
          if (commissionError) {
            console.error('Erro ao criar comissão:', commissionError);
            continue;
          }
          
          processedCommissions.push(commission);
          
          // Notificar parceiro
          await partnerNotificationService.notifyPaymentProcessed(partnerId, {
            amount: data.total_commission,
            period: `${month}/${year}`,
            payment_method: 'bank_transfer',
            estimated_date: this.getEstimatedPaymentDate(),
            transaction_id: commission.id
          });
        }
      }
      
      return processedCommissions;
      
    } catch (error) {
      console.error('Erro ao processar comissões mensais:', error);
      throw error;
    }
  }
  
  // Calcular comissão individual
  calculateCommission(planValue, tier, customRate = null) {
    if (customRate) {
      return (planValue * customRate) / 100;
    }
    
    const tierRates = {
      bronze: 10,
      silver: 15,
      gold: 20
    };
    
    const rate = tierRates[tier] || 10;
    return (planValue * rate) / 100;
  }
  
  // Aprovar comissão para pagamento
  async approveCommission(commissionId, adminId) {
    try {
      const { data: commission, error } = await supabase
        .from('partner_commissions')
        .update({
          status: 'approved',
          approved_by: adminId,
          approved_at: new Date().toISOString()
        })
        .eq('id', commissionId)
        .select()
        .single();
        
      if (error) throw error;
      
      // Log da ação
      await supabase
        .from('audit_logs')
        .insert({
          user_id: adminId,
          action: 'approve_commission',
          resource_type: 'partner_commissions',
          resource_id: commissionId,
          details: {
            commission_amount: commission.commission_amount,
            partner_id: commission.partner_id
          }
        });
        
      return commission;
      
    } catch (error) {
      console.error('Erro ao aprovar comissão:', error);
      throw error;
    }
  }
  
  // Processar pagamento em lote
  async processBatchPayments(commissionIds, adminId) {
    try {
      const results = [];
      
      for (const commissionId of commissionIds) {
        try {
          const { data: commission, error } = await supabase
            .from('partner_commissions')
            .update({
              status: 'paid',
              paid_by: adminId,
              paid_at: new Date().toISOString()
            })
            .eq('id', commissionId)
            .eq('status', 'approved')
            .select()
            .single();
            
          if (error) throw error;
          
          results.push({
            commission_id: commissionId,
            success: true,
            amount: commission.commission_amount
          });
          
          // Notificar parceiro
          await partnerNotificationService.notifyPaymentProcessed(commission.partner_id, {
            amount: commission.commission_amount,
            payment_method: 'bank_transfer',
            transaction_id: commission.id,
            payment_date: new Date().toISOString()
          });
          
        } catch (error) {
          results.push({
            commission_id: commissionId,
            success: false,
            error: error.message
          });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Erro ao processar pagamentos em lote:', error);
      throw error;
    }
  }
  
  // Gerar relatório financeiro
  async generateFinancialReport(year, month = null) {
    try {
      let dateFilter = {};
      
      if (month) {
        dateFilter = {
          reference_year: year,
          reference_month: month
        };
      } else {
        dateFilter = {
          reference_year: year
        };
      }
      
      const { data: commissions, error } = await supabase
        .from('partner_commissions')
        .select(`
          *,
          partners (partner_code, business_name, commission_tier)
        `)
        .match(dateFilter);
        
      if (error) throw error;
      
      const report = {
        period: month ? `${month}/${year}` : year.toString(),
        summary: {
          total_commissions: commissions.length,
          total_amount: commissions.reduce((sum, c) => sum + parseFloat(c.commission_amount), 0),
          by_status: {},
          by_tier: {},
          partners_count: new Set(commissions.map(c => c.partner_id))
        },
        details: commissions
      };
      
      // Agrupar por status
      commissions.forEach(commission => {
        const status = commission.status;
        if (!report.summary.by_status[status]) {
          report.summary.by_status[status] = { count: 0, amount: 0 };
        }
        report.summary.by_status[status].count++;
        report.summary.by_status[status].amount += parseFloat(commission.commission_amount);
      });
      
      // Agrupar por tier
      commissions.forEach(commission => {
        const tier = commission.partners.commission_tier;
        if (!report.summary.by_tier[tier]) {
          report.summary.by_tier[tier] = { count: 0, amount: 0 };
        }
        report.summary.by_tier[tier].count++;
        report.summary.by_tier[tier].amount += parseFloat(commission.commission_amount);
      });
      
      report.summary.partners_count = report.summary.partners_count.size;
      
      return report;
      
    } catch (error) {
      console.error('Erro ao gerar relatório financeiro:', error);
      throw error;
    }
  }
  
  // Obter data estimada de pagamento
  getEstimatedPaymentDate() {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 15);
    return nextMonth.toISOString().split('T')[0];
  }
  
  // Obter comissões pendentes
  async getPendingCommissions() {
    try {
      const { data: commissions, error } = await supabase
        .from('partner_commissions')
        .select(`
          *,
          partners (partner_code, business_name, email)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return commissions;
      
    } catch (error) {
      console.error('Erro ao buscar comissões pendentes:', error);
      return [];
    }
  }
}

module.exports = new CommissionProcessor();