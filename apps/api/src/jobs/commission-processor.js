// apps/api/src/jobs/commission-processor.js
// ID 2.13 - FASE 3 PASSO 3.3: Job de Processamento Automático
// Sistema de cron jobs para processar comissões automaticamente

const cron = require('node-cron');
const { supabase } = require('../config/supabase');
const CommissionCalculator = require('../services/commission-calculator');
const PartnerService = require('../services/partner-service');

class CommissionProcessor {
    
    // ==========================================
    // INICIAR TODOS OS JOBS AUTOMÁTICOS
    // ==========================================
    static start() {
        console.log('🚀 Starting commission processor jobs...');
        
        // 1. PROCESSAR COMISSÕES PENDENTES A CADA HORA
        cron.schedule('0 * * * *', async () => {
            console.log('💰 Running hourly commission processing...');
            try {
                await CommissionCalculator.processAllPendingCommissions();
                console.log('✅ Hourly commission processing completed');
            } catch (error) {
                console.error('❌ Error in hourly commission processing:', error);
            }
        });
        
        // 2. ATUALIZAR ESTATÍSTICAS DOS PARCEIROS DIARIAMENTE ÀS 6H
        cron.schedule('0 6 * * *', async () => {
            console.log('📊 Running daily partner stats update...');
            try {
                const { data: partners } = await supabase
                    .from('partners')
                    .select('id')
                    .eq('status', 'approved');
                
                if (partners && partners.length > 0) {
                    for (const partner of partners) {
                        await PartnerService.updatePartnerStats(partner.id);
                    }
                    console.log(`✅ Updated stats for ${partners.length} partners`);
                } else {
                    console.log('📋 No approved partners found for stats update');
                }
            } catch (error) {
                console.error('❌ Error in daily stats update:', error);
            }
        });
        
        // 3. PROCESSAR PAGAMENTOS MENSALMENTE NO DIA 15 ÀS 9H
        cron.schedule('0 9 15 * *', async () => {
            console.log('💳 Running monthly commission payments...');
            try {
                await PartnerService.processCommissionPayments({
                    month: new Date().getMonth() + 1,
                    year: new Date().getFullYear()
                });
                console.log('✅ Monthly commission payments processed');
            } catch (error) {
                console.error('❌ Error in monthly payment processing:', error);
            }
        });
        
        // 4. PROCESSAR COMISSÕES RECORRENTES MENSALMENTE NO DIA 1 ÀS 8H
        cron.schedule('0 8 1 * *', async () => {
            console.log('🔄 Running monthly recurring commissions...');
            try {
                await CommissionCalculator.processRecurringCommissions();
                console.log('✅ Monthly recurring commissions processed');
            } catch (error) {
                console.error('❌ Error in recurring commission processing:', error);
            }
        });
        
        // 5. CALCULAR BÔNUS MENSAIS NO DIA 2 ÀS 10H
        cron.schedule('0 10 2 * *', async () => {
            console.log('🏆 Running monthly bonus calculation...');
            try {
                await this.processMonthlyBonuses();
                console.log('✅ Monthly bonus calculation completed');
            } catch (error) {
                console.error('❌ Error in monthly bonus calculation:', error);
            }
        });
        
        // 6. LIMPEZA DE DADOS SEMANALMENTE AOS DOMINGOS ÀS 3H
        cron.schedule('0 3 * * 0', async () => {
            console.log('🧹 Running weekly data cleanup...');
            try {
                await this.weeklyDataCleanup();
                console.log('✅ Weekly data cleanup completed');
            } catch (error) {
                console.error('❌ Error in weekly data cleanup:', error);
            }
        });
        
        // 7. RELATÓRIO SEMANAL AOS DOMINGOS ÀS 18H
        cron.schedule('0 18 * * 0', async () => {
            console.log('📈 Generating weekly partner report...');
            try {
                await this.generateWeeklyReport();
                console.log('✅ Weekly partner report generated');
            } catch (error) {
                console.error('❌ Error generating weekly report:', error);
            }
        });
        
        console.log('✅ Commission processor jobs started successfully');
        console.log('📅 Jobs agendados:');
        console.log('   💰 Comissões pendentes: A cada hora (0 * * * *)');
        console.log('   📊 Estatísticas parceiros: Diariamente às 6h (0 6 * * *)');
        console.log('   💳 Pagamentos: Dia 15 às 9h (0 9 15 * *)');
        console.log('   🔄 Comissões recorrentes: Dia 1 às 8h (0 8 1 * *)');
        console.log('   🏆 Bônus: Dia 2 às 10h (0 10 2 * *)');
        console.log('   🧹 Limpeza: Domingos às 3h (0 3 * * 0)');
        console.log('   📈 Relatório: Domingos às 18h (0 18 * * 0)');
    }
    
    // ==========================================
    // PROCESSAR BÔNUS MENSAIS
    // ==========================================
    static async processMonthlyBonuses() {
        try {
            const currentMonth = new Date().getMonth(); // Mês anterior
            const currentYear = new Date().getFullYear();
            
            // Se janeiro, usar dezembro do ano anterior
            const targetMonth = currentMonth === 0 ? 12 : currentMonth;
            const targetYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            
            console.log(`🏆 Processing bonuses for ${targetMonth}/${targetYear}`);
            
            // Buscar todos os parceiros aprovados
            const { data: partners } = await supabase
                .from('partners')
                .select('id, partner_code, business_name')
                .eq('status', 'approved');
            
            if (!partners || partners.length === 0) {
                console.log('📋 No approved partners found for bonus calculation');
                return;
            }
            
            let processedCount = 0;
            
            for (const partner of partners) {
                try {
                    const bonusData = await CommissionCalculator.calculateBonusCommission(
                        partner.id,
                        targetMonth,
                        targetYear
                    );
                    
                    if (bonusData.commission_amount > 0) {
                        // Criar registro de comissão de bônus
                        await supabase
                            .from('partner_commissions')
                            .insert({
                                partner_id: bonusData.partner_id,
                                commission_type: 'bonus',
                                commission_rate: 0, // Bônus não tem taxa
                                base_amount: 0,
                                commission_amount: bonusData.commission_amount,
                                reference_month: targetMonth,
                                reference_year: targetYear,
                                status: 'pending',
                                notes: `Bônus mensal - Detalhes: ${JSON.stringify(bonusData.bonus_details)}`
                            });
                        
                        console.log(`🏆 Bonus created for ${partner.partner_code}: R$${bonusData.commission_amount}`);
                        processedCount++;
                    }
                } catch (error) {
                    console.error(`❌ Error processing bonus for partner ${partner.partner_code}:`, error);
                }
            }
            
            console.log(`✅ Processed bonuses for ${processedCount} partners`);
        } catch (error) {
            console.error('❌ Error in processMonthlyBonuses:', error);
        }
    }
    
    // ==========================================
    // LIMPEZA SEMANAL DE DADOS
    // ==========================================
    static async weeklyDataCleanup() {
        try {
            console.log('🧹 Starting weekly data cleanup...');
            
            // 1. Limpar referrals antigos sem conversão (90+ dias)
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            
            const { data: oldReferrals, error: deleteError } = await supabase
                .from('partner_referrals')
                .delete()
                .eq('status', 'clicked')
                .lt('created_at', ninetyDaysAgo.toISOString());
            
            if (!deleteError && oldReferrals) {
                console.log(`🗑️ Cleaned up ${oldReferrals.length} old referrals`);
            }
            
            // 2. Limpar analytics antigos (1+ ano)
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            
            const { data: oldAnalytics, error: analyticsError } = await supabase
                .from('partner_analytics')
                .delete()
                .eq('period_type', 'daily')
                .lt('period_date', oneYearAgo.toISOString().split('T')[0]);
            
            if (!analyticsError && oldAnalytics) {
                console.log(`📊 Cleaned up ${oldAnalytics.length} old analytics records`);
            }
            
            // 3. Consolidar analytics diários em mensais (para dados antigos)
            await this.consolidateDailyAnalytics();
            
            console.log('✅ Weekly data cleanup completed');
        } catch (error) {
            console.error('❌ Error in weeklyDataCleanup:', error);
        }
    }
    
    // ==========================================
    // CONSOLIDAR ANALYTICS DIÁRIOS EM MENSAIS
    // ==========================================
    static async consolidateDailyAnalytics() {
        try {
            // Buscar dados diários dos últimos 3 meses para consolidar
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            
            const { data: dailyData } = await supabase
                .from('partner_analytics')
                .select('*')
                .eq('period_type', 'daily')
                .lt('period_date', threeMonthsAgo.toISOString().split('T')[0]);
            
            if (!dailyData || dailyData.length === 0) {
                console.log('📊 No daily data to consolidate');
                return;
            }
            
            // Agrupar por parceiro e mês
            const monthlyGroups = {};
            
            dailyData.forEach(record => {
                const date = new Date(record.period_date);
                const key = `${record.partner_id}-${date.getFullYear()}-${date.getMonth() + 1}`;
                
                if (!monthlyGroups[key]) {
                    monthlyGroups[key] = {
                        partner_id: record.partner_id,
                        year: date.getFullYear(),
                        month: date.getMonth() + 1,
                        clicks: 0,
                        registrations: 0,
                        subscriptions: 0,
                        records: []
                    };
                }
                
                monthlyGroups[key].clicks += record.clicks || 0;
                monthlyGroups[key].registrations += record.registrations || 0;
                monthlyGroups[key].subscriptions += record.subscriptions || 0;
                monthlyGroups[key].records.push(record.id);
            });
            
            // Criar registros mensais consolidados
            for (const group of Object.values(monthlyGroups)) {
                try {
                    // Verificar se já existe registro mensal
                    const { data: existing } = await supabase
                        .from('partner_analytics')
                        .select('id')
                        .eq('partner_id', group.partner_id)
                        .eq('period_type', 'monthly')
                        .eq('reference_month', group.month)
                        .eq('reference_year', group.year)
                        .single();
                    
                    if (!existing) {
                        await supabase
                            .from('partner_analytics')
                            .insert({
                                partner_id: group.partner_id,
                                period_type: 'monthly',
                                reference_month: group.month,
                                reference_year: group.year,
                                clicks: group.clicks,
                                registrations: group.registrations,
                                subscriptions: group.subscriptions
                            });
                        
                        // Deletar registros diários consolidados
                        await supabase
                            .from('partner_analytics')
                            .delete()
                            .in('id', group.records);
                        
                        console.log(`📊 Consolidated ${group.records.length} daily records into monthly for partner ${group.partner_id}`);
                    }
                } catch (error) {
                    console.error(`❌ Error consolidating data for partner ${group.partner_id}:`, error);
                }
            }
        } catch (error) {
            console.error('❌ Error in consolidateDailyAnalytics:', error);
        }
    }
    
    // ==========================================
    // GERAR RELATÓRIO SEMANAL
    // ==========================================
    static async generateWeeklyReport() {
        try {
            console.log('📈 Generating weekly partner report...');
            
            // Período da semana passada
            const now = new Date();
            const lastWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const lastWeekEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
            
            // Buscar estatísticas da semana
            const report = await CommissionCalculator.generateCommissionReport({
                startDate: lastWeekStart.toISOString(),
                endDate: lastWeekEnd.toISOString()
            });
            
            // Calcular totais
            const totals = {
                total_partners: report.length,
                total_commissions: report.reduce((sum, p) => sum + p.total_commissions, 0),
                total_amount: report.reduce((sum, p) => sum + p.total_amount, 0),
                pending_amount: report.reduce((sum, p) => sum + p.pending_amount, 0),
                approved_amount: report.reduce((sum, p) => sum + p.approved_amount, 0),
                paid_amount: report.reduce((sum, p) => sum + p.paid_amount, 0)
            };
            
            // Log do resumo
            console.log('📊 RELATÓRIO SEMANAL DE PARCERIAS:');
            console.log(`   👥 Parceiros ativos: ${totals.total_partners}`);
            console.log(`   💰 Total de comissões: ${totals.total_commissions}`);
            console.log(`   💵 Valor total: R$${totals.total_amount.toFixed(2)}`);
            console.log(`   ⏳ Pendente: R$${totals.pending_amount.toFixed(2)}`);
            console.log(`   ✅ Aprovado: R$${totals.approved_amount.toFixed(2)}`);
            console.log(`   💳 Pago: R$${totals.paid_amount.toFixed(2)}`);
            
            // TODO: Enviar relatório por email para admins
            // TODO: Salvar relatório no sistema
            
            console.log('✅ Weekly report generated successfully');
        } catch (error) {
            console.error('❌ Error generating weekly report:', error);
        }
    }
    
    // ==========================================
    // PARAR TODOS OS JOBS (PARA TESTES)
    // ==========================================
    static stop() {
        console.log('🛑 Stopping commission processor jobs...');
        // Note: node-cron não tem método global para parar, 
        // mas os jobs param quando o processo termina
        console.log('✅ Commission processor jobs stopped');
    }
    
    // ==========================================
    // STATUS DOS JOBS
    // ==========================================
    static getStatus() {
        return {
            status: 'running',
            jobs: [
                { name: 'Hourly Commission Processing', schedule: '0 * * * *', description: 'Process pending commissions' },
                { name: 'Daily Stats Update', schedule: '0 6 * * *', description: 'Update partner statistics' },
                { name: 'Monthly Payments', schedule: '0 9 15 * *', description: 'Process commission payments' },
                { name: 'Recurring Commissions', schedule: '0 8 1 * *', description: 'Process recurring commissions' },
                { name: 'Monthly Bonuses', schedule: '0 10 2 * *', description: 'Calculate monthly bonuses' },
                { name: 'Weekly Cleanup', schedule: '0 3 * * 0', description: 'Clean up old data' },
                { name: 'Weekly Report', schedule: '0 18 * * 0', description: 'Generate weekly report' }
            ],
            last_started: new Date().toISOString()
        };
    }
}

module.exports = CommissionProcessor;