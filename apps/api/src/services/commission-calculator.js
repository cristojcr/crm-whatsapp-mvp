// apps/api/src/services/commission-calculator.js
// ID 2.13 - FASE 3 PASSO 3.2: Calculadora de Comissões Avançada
// Sistema inteligente de cálculo e gestão de comissões

const { supabase } = require('../config/supabase');

class CommissionCalculator {
    
    // ==========================================
    // CALCULAR COMISSÃO PARA NOVA ASSINATURA
    // ==========================================
    static async calculateSignupCommission(partnerId, subscriptionData) {
        try {
            const { plan, amount, billing_cycle } = subscriptionData;
            
            // Buscar dados do parceiro
            const { data: partner } = await supabase
                .from('partners')
                .select('*')
                .eq('id', partnerId)
                .single();
            
            if (!partner) {
                throw new Error('Partner not found');
            }
            
            // Buscar configurações de comissão
            const { data: commissionSettings } = await supabase
                .from('partner_settings')
                .select('setting_value')
                .eq('setting_key', 'commission_rates')
                .single();
            
            let baseRate = 10; // Padrão
            if (commissionSettings) {
                const rates = commissionSettings.setting_value;
                baseRate = rates[partner.commission_tier] || baseRate;
            }
            
            // Usar taxa customizada se definida
            const finalRate = partner.custom_commission_rate || baseRate;
            
            // Calcular valor base dependendo do ciclo
            let baseAmount = amount;
            
            // Para planos anuais, aplicar bônus
            if (billing_cycle === 'yearly') {
                baseAmount = amount * 1.2; // 20% de bônus para anuais
            }
            
            // Aplicar multiplicador por plano
            const planMultipliers = {
                'basic': 1.0,
                'pro': 1.5,
                'premium': 2.0
            };
            
            const planMultiplier = planMultipliers[plan.toLowerCase()] || 1.0;
            baseAmount *= planMultiplier;
            
            // Calcular comissão final
            const commissionAmount = (baseAmount * finalRate / 100);
            
            return {
                partner_id: partnerId,
                commission_rate: finalRate,
                base_amount: baseAmount,
                commission_amount: Math.round(commissionAmount * 100) / 100,
                calculation_details: {
                    original_amount: amount,
                    billing_cycle,
                    plan,
                    tier: partner.commission_tier,
                    plan_multiplier: planMultiplier,
                    annual_bonus: billing_cycle === 'yearly' ? 1.2 : 1.0
                }
            };
        } catch (error) {
            console.error('Error calculating signup commission:', error);
            throw error;
        }
    }

    // ==========================================
    // CALCULAR COMISSÃO RECORRENTE (RENOVAÇÕES)
    // ==========================================
    static async calculateRecurringCommission(partnerId, renewalData) {
        try {
            const { subscription_id, amount, month, year } = renewalData;
            
            // Buscar dados da assinatura original
            const { data: originalReferral } = await supabase
                .from('partner_referrals')
                .select('*')
                .eq('subscription_id', subscription_id)
                .single();
            
            if (!originalReferral) {
                return { commission_amount: 0, message: 'No original referral found' };
            }
            
            // Verificar se já não foi calculada comissão para este período
            const { data: existingCommission } = await supabase
                .from('partner_commissions')
                .select('id')
                .eq('partner_id', partnerId)
                .eq('referral_id', originalReferral.id)
                .eq('commission_type', 'recurring')
                .eq('reference_month', month)
                .eq('reference_year', year)
                .single();
            
            if (existingCommission) {
                return { commission_amount: 0, message: 'Commission already calculated for this period' };
            }
            
            // Buscar dados do parceiro
            const { data: partner } = await supabase
                .from('partners')
                .select('commission_tier, custom_commission_rate')
                .eq('id', partnerId)
                .single();
            
            // Taxa reduzida para comissões recorrentes (50% da taxa original)
            let recurringRate = 5; // Padrão
            if (partner) {
                const tierRates = { bronze: 5, silver: 7.5, gold: 10 };
                recurringRate = partner.custom_commission_rate
                    ? partner.custom_commission_rate * 0.5
                    : tierRates[partner.commission_tier] || 5;
            }
            
            const commissionAmount = (amount * recurringRate / 100);
            
            return {
                partner_id: partnerId,
                referral_id: originalReferral.id,
                commission_type: 'recurring',
                commission_rate: recurringRate,
                base_amount: amount,
                commission_amount: Math.round(commissionAmount * 100) / 100,
                reference_month: month,
                reference_year: year
            };
        } catch (error) {
            console.error('Error calculating recurring commission:', error);
            throw error;
        }
    }

    // ==========================================
    // CALCULAR COMISSÃO DE BÔNUS POR METAS
    // ==========================================
    static async calculateBonusCommission(partnerId, month, year) {
        try {
            // Buscar regras de bônus
            const { data: bonusSettings } = await supabase
                .from('partner_settings')
                .select('setting_value')
                .eq('setting_key', 'bonus_targets')
                .single();
            
            if (!bonusSettings || !bonusSettings.setting_value) {
                return { bonus_amount: 0 };
            }
            
            const bonusRules = bonusSettings.setting_value;
            
            // Buscar analytics do parceiro para o período
            const { data: analytics } = await supabase
                .from('partner_analytics')
                .select('*')
                .eq('partner_id', partnerId)
                .eq('period_type', 'monthly')
                .eq('reference_month', month)
                .eq('reference_year', year)
                .single();
            
            if (!analytics) {
                return { bonus_amount: 0 };
            }
            
            let totalBonus = 0;
            const bonusDetails = [];
            
            // Avaliar cada regra de bônus
            for (const rule of bonusRules) {
                let metAchieved = false;
                
                switch (rule.metric) {
                    case 'conversions':
                        metAchieved = analytics.subscriptions >= rule.target;
                        break;
                    case 'referrals':
                        metAchieved = analytics.registrations >= rule.target;
                        break;
                    case 'revenue':
                        metAchieved = analytics.gross_revenue >= rule.target;
                        break;
                    case 'conversion_rate':
                        metAchieved = analytics.conversion_rate >= rule.target;
                        break;
                }
                
                if (metAchieved) {
                    totalBonus += rule.bonus_amount;
                    bonusDetails.push({
                        metric: rule.metric,
                        target: rule.target,
                        achieved: analytics[rule.metric],
                        bonus: rule.bonus_amount
                    });
                }
            }
            
            return {
                partner_id: partnerId,
                commission_type: 'bonus',
                commission_amount: totalBonus,
                bonus_details: bonusDetails,
                reference_month: month,
                reference_year: year
            };
        } catch (error) {
            console.error('Error calculating bonus commission:', error);
            return { bonus_amount: 0 };
        }
    }

    // ==========================================
    // PROCESSAR TODAS AS COMISSÕES PENDENTES
    // ==========================================
    static async processAllPendingCommissions() {
        try {
            console.log('Starting commission processing...');
            
            // Buscar todas as conversões sem comissão calculada
            const { data: pendingReferrals } = await supabase
                .from('partner_referrals')
                .select('*')
                .eq('status', 'subscribed')
                .eq('commission_status', 'pending');
            
            if (!pendingReferrals?.length) {
                console.log('No pending referrals found');
                return;
            }
            
            for (const referral of pendingReferrals) {
                try {
                    // Calcular comissão
                    const commissionData = await this.calculateSignupCommission(
                        referral.partner_id,
                        {
                            plan: referral.subscription_plan,
                            amount: referral.subscription_value,
                            billing_cycle: 'monthly' // Assumir mensal por padrão
                        }
                    );
                    
                    // Criar registro de comissão
                    await supabase
                        .from('partner_commissions')
                        .insert({
                            partner_id: commissionData.partner_id,
                            referral_id: referral.id,
                            commission_type: 'signup',
                            commission_rate: commissionData.commission_rate,
                            base_amount: commissionData.base_amount,
                            commission_amount: commissionData.commission_amount,
                            reference_month: new Date().getMonth() + 1,
                            reference_year: new Date().getFullYear(),
                            status: 'pending'
                        });
                    
                    // Atualizar status do referral
                    await supabase
                        .from('partner_referrals')
                        .update({
                            commission_status: 'calculated',
                            commission_amount: commissionData.commission_amount
                        })
                        .eq('id', referral.id);
                    
                    console.log(`Commission calculated for referral ${referral.id}: R$${commissionData.commission_amount}`);
                } catch (error) {
                    console.error(`Error processing referral ${referral.id}:`, error);
                }
            }
            
            console.log('Commission processing completed');
        } catch (error) {
            console.error('Error in processAllPendingCommissions:', error);
        }
    }

    // ==========================================
    // PROCESSAR COMISSÕES RECORRENTES MENSAIS
    // ==========================================
    static async processRecurringCommissions() {
        try {
            console.log('Processing recurring commissions...');
            
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            
            // Buscar todas as assinaturas ativas
            const { data: activeSubscriptions } = await supabase
                .from('partner_referrals')
                .select('*')
                .eq('status', 'subscribed')
                .not('subscription_id', 'is', null);
            
            if (!activeSubscriptions?.length) {
                console.log('No active subscriptions found');
                return;
            }
            
            for (const subscription of activeSubscriptions) {
                try {
                    const recurringData = await this.calculateRecurringCommission(
                        subscription.partner_id,
                        {
                            subscription_id: subscription.subscription_id,
                            amount: subscription.subscription_value,
                            month: currentMonth,
                            year: currentYear
                        }
                    );
                    
                    if (recurringData.commission_amount > 0) {
                        await supabase
                            .from('partner_commissions')
                            .insert(recurringData);
                        
                        console.log(`Recurring commission created: R$${recurringData.commission_amount}`);
                    }
                } catch (error) {
                    console.error(`Error processing recurring commission for ${subscription.id}:`, error);
                }
            }
            
            console.log('Recurring commissions processing completed');
        } catch (error) {
            console.error('Error in processRecurringCommissions:', error);
        }
    }

    // ==========================================
    // GERAR RELATÓRIO DE COMISSÕES PARA ADMIN
    // ==========================================
    static async generateCommissionReport(period = null) {
        try {
            let dateFilter = '';
            if (period) {
                const { startDate, endDate } = period;
                dateFilter = `AND pc.created_at BETWEEN '${startDate}' AND '${endDate}'`;
            }
            
            const { data: report, error } = await supabase
                .from('partners')
                .select(`
                    id,
                    partner_code,
                    business_name,
                    commission_tier,
                    partner_commissions!inner (
                        id,
                        commission_amount,
                        status,
                        commission_type,
                        created_at
                    )
                `)
                .eq('status', 'approved');
            
            if (error) {
                throw error;
            }
            
            // Processar dados para relatório
            const processedReport = report.map(partner => {
                const commissions = partner.partner_commissions;
                
                return {
                    partner_code: partner.partner_code,
                    business_name: partner.business_name,
                    commission_tier: partner.commission_tier,
                    total_commissions: commissions.length,
                    pending_amount: commissions
                        .filter(c => c.status === 'pending')
                        .reduce((sum, c) => sum + c.commission_amount, 0),
                    approved_amount: commissions
                        .filter(c => c.status === 'approved')
                        .reduce((sum, c) => sum + c.commission_amount, 0),
                    paid_amount: commissions
                        .filter(c => c.status === 'paid')
                        .reduce((sum, c) => sum + c.commission_amount, 0),
                    total_amount: commissions
                        .reduce((sum, c) => sum + c.commission_amount, 0)
                };
            });
            
            // Ordenar por valor total
            return processedReport.sort((a, b) => b.total_amount - a.total_amount);
        } catch (error) {
            console.error('Error generating commission report:', error);
            throw error;
        }
    }

    // ==========================================
    // APROVAR COMISSÕES PENDENTES
    // ==========================================
    static async approveCommissions(commissionIds) {
        try {
            const { data, error } = await supabase
                .from('partner_commissions')
                .update({
                    status: 'approved',
                    approved_at: new Date().toISOString()
                })
                .in('id', commissionIds)
                .select();
            
            if (error) {
                throw error;
            }
            
            console.log(`Approved ${data.length} commissions`);
            return data;
        } catch (error) {
            console.error('Error approving commissions:', error);
            throw error;
        }
    }

    // ==========================================
    // MARCAR COMISSÕES COMO PAGAS
    // ==========================================
    static async markCommissionsAsPaid(commissionIds, paymentDetails = {}) {
        try {
            const { data, error } = await supabase
                .from('partner_commissions')
                .update({
                    status: 'paid',
                    paid_at: new Date().toISOString(),
                    payment_method: paymentDetails.payment_method || 'bank_transfer',
                    payment_reference: paymentDetails.payment_reference || null
                })
                .in('id', commissionIds)
                .select();
            
            if (error) {
                throw error;
            }
            
            console.log(`Marked ${data.length} commissions as paid`);
            return data;
        } catch (error) {
            console.error('Error marking commissions as paid:', error);
            throw error;
        }
    }

    // ==========================================
    // BUSCAR ESTATÍSTICAS DE COMISSÕES
    // ==========================================
    static async getCommissionStats(period = 'month') {
        try {
            let dateFilter = '';
            const now = new Date();
            
            switch(period) {
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    dateFilter = `created_at >= '${weekAgo.toISOString()}'`;
                    break;
                case 'month':
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    dateFilter = `created_at >= '${monthStart.toISOString()}'`;
                    break;
                case 'year':
                    const yearStart = new Date(now.getFullYear(), 0, 1);
                    dateFilter = `created_at >= '${yearStart.toISOString()}'`;
                    break;
            }
            
            const { data: commissions, error } = await supabase
                .from('partner_commissions')
                .select('commission_amount, status, commission_type')
                .or(dateFilter);
            
            if (error) {
                throw error;
            }
            
            const stats = {
                total_commissions: commissions.length,
                total_amount: commissions.reduce((sum, c) => sum + c.commission_amount, 0),
                pending_amount: commissions
                    .filter(c => c.status === 'pending')
                    .reduce((sum, c) => sum + c.commission_amount, 0),
                approved_amount: commissions
                    .filter(c => c.status === 'approved')
                    .reduce((sum, c) => sum + c.commission_amount, 0),
                paid_amount: commissions
                    .filter(c => c.status === 'paid')
                    .reduce((sum, c) => sum + c.commission_amount, 0),
                signup_commissions: commissions.filter(c => c.commission_type === 'signup').length,
                recurring_commissions: commissions.filter(c => c.commission_type === 'recurring').length,
                bonus_commissions: commissions.filter(c => c.commission_type === 'bonus').length
            };
            
            return stats;
        } catch (error) {
            console.error('Error getting commission stats:', error);
            throw error;
        }
    }
}

module.exports = CommissionCalculator;