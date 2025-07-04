// apps/api/src/services/partner-service.js
// ID 2.13 - PASSO 2.2: Services e Utilitários
// Sistema de Referencias e Parcerias - Lógica de Negócio

const { supabase } = require('../config/supabase');

class PartnerService {
    // ==========================================
    // GERAÇÃO DE CÓDIGO ÚNICO DE PARCEIRO
    // ==========================================
    static async generateUniquePartnerCode() {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const code = `PART${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
            
            const { data: existing } = await supabase
                .from('partners')
                .select('id')
                .eq('partner_code', code)
                .single();
            
            if (!existing) {
                return code;
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error('Failed to generate unique partner code');
    }

    // ==========================================
    // VERIFICAÇÃO DE APROVAÇÃO AUTOMÁTICA
    // ==========================================
    static async checkAutoApproval(partnerData) {
        try {
            const { data: settings } = await supabase
                .from('partner_settings')
                .select('setting_value')
                .eq('setting_key', 'auto_approval')
                .single();
            
            if (!settings || !settings.setting_value.enabled) {
                return false;
            }
            
            const requirements = settings.setting_value.min_requirements;
            
            // Verificar tipo de negócio
            if (requirements.business_type && 
                !requirements.business_type.includes(partnerData.business_type)) {
                return false;
            }
            
            // Verificar se tem documento válido
            if (!partnerData.document || partnerData.document.length < 11) {
                return false;
            }
            
            // Verificar se tem dados bancários (se obrigatório)
            if (requirements.bank_data_required && !partnerData.bank_data) {
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error checking auto approval:', error);
            return false;
        }
    }

    // ==========================================
    // ATUALIZAÇÃO DE ESTATÍSTICAS DO PARCEIRO
    // ==========================================
    static async updatePartnerStats(partnerId) {
        try {
            // Buscar estatísticas do mês atual
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            
            const { data: monthlyStats } = await supabase
                .from('partner_referrals')
                .select('status, commission_amount')
                .eq('partner_id', partnerId)
                .gte('created_at', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
                .lt('created_at', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);
            
            if (!monthlyStats) return;
            
            // Calcular estatísticas
            const totalReferrals = monthlyStats.length;
            const conversions = monthlyStats.filter(r => r.status === 'subscribed').length;
            const totalCommission = monthlyStats
                .filter(r => r.status === 'subscribed')
                .reduce((sum, r) => sum + (r.commission_amount || 0), 0);
            
            // Buscar estatísticas totais
            const { data: allTimeStats } = await supabase
                .from('partner_referrals')
                .select('status, commission_amount')
                .eq('partner_id', partnerId);
            
            const totalAllReferrals = allTimeStats ? allTimeStats.length : 0;
            const totalAllConversions = allTimeStats ? 
                allTimeStats.filter(r => r.status === 'subscribed').length : 0;
            const totalAllCommission = allTimeStats ? 
                allTimeStats
                    .filter(r => r.status === 'subscribed')
                    .reduce((sum, r) => sum + (r.commission_amount || 0), 0) : 0;
            
            // Atualizar dados do parceiro
            await supabase
                .from('partners')
                .update({
                    total_referrals: totalAllReferrals,
                    total_conversions: totalAllConversions,
                    total_commission_earned: totalAllCommission,
                    current_month_referrals: totalReferrals,
                    current_month_conversions: conversions
                })
                .eq('id', partnerId);
            
            // Verificar se deve fazer upgrade de tier
            await this.checkTierUpgrade(partnerId, totalAllConversions, totalAllCommission);
            
        } catch (error) {
            console.error('Error updating partner stats:', error);
        }
    }

    // ==========================================
    // VERIFICAÇÃO E UPGRADE DE TIER
    // ==========================================
    static async checkTierUpgrade(partnerId, totalConversions, totalCommission) {
        try {
            const { data: tierSettings } = await supabase
                .from('partner_settings')
                .select('setting_value')
                .eq('setting_key', 'tier_requirements')
                .single();
            
            if (!tierSettings) return;
            
            const requirements = tierSettings.setting_value;
            let newTier = 'bronze';
            
            // Verificar tier Gold
            if (totalConversions >= requirements.gold.min_conversions && 
                totalCommission >= requirements.gold.min_commission) {
                newTier = 'gold';
            }
            // Verificar tier Silver
            else if (totalConversions >= requirements.silver.min_conversions && 
                     totalCommission >= requirements.silver.min_commission) {
                newTier = 'silver';
            }
            
            // Atualizar tier se necessário
            const { data: currentPartner } = await supabase
                .from('partners')
                .select('commission_tier')
                .eq('id', partnerId)
                .single();
            
            if (currentPartner && currentPartner.commission_tier !== newTier) {
                await supabase
                    .from('partners')
                    .update({ commission_tier: newTier })
                    .eq('id', partnerId);
                
                // TODO: Enviar notificação de upgrade de tier
                console.log(`Partner ${partnerId} upgraded to ${newTier}`);
            }
        } catch (error) {
            console.error('Error checking tier upgrade:', error);
        }
    }

    // ==========================================
    // PROCESSAMENTO DE PAGAMENTOS DE COMISSÕES
    // ==========================================
    static async processCommissionPayments(options = {}) {
        try {
            const { data: settings } = await supabase
                .from('partner_settings')
                .select('setting_value')
                .eq('setting_key', 'payment_schedule')
                .single();
            
            if (!settings) return;
            
            const paymentConfig = settings.setting_value;
            const minimumAmount = paymentConfig.minimum_amount || 100;
            
            // Buscar comissões pendentes agrupadas por parceiro
            const { data: commissionGroups } = await supabase
                .rpc('get_pending_commissions_by_partner', {
                    min_amount: minimumAmount
                });
            
            if (!commissionGroups || commissionGroups.length === 0) {
                console.log('No commissions to process');
                return;
            }
            
            for (const group of commissionGroups) {
                // Marcar comissões como aprovadas
                await supabase
                    .from('partner_commissions')
                    .update({
                        status: 'approved',
                        approved_at: new Date().toISOString()
                    })
                    .eq('partner_id', group.partner_id)
                    .eq('status', 'pending');
                
                // TODO: Integrar com sistema de pagamento (PIX, transferência, etc.)
                // TODO: Enviar email de notificação
                
                console.log(`Approved R$${group.total_pending} for partner ${group.partner_id}`);
            }
        } catch (error) {
            console.error('Error processing commission payments:', error);
        }
    }

    // ==========================================
    // GERAÇÃO DE MATERIAIS DE MARKETING
    // ==========================================
    static async generateMarketingMaterials(partnerId) {
        try {
            const { data: partner } = await supabase
                .from('partners')
                .select('partner_code, business_name')
                .eq('id', partnerId)
                .single();
            
            if (!partner) return null;
            
            const baseUrl = process.env.APP_URL || 'https://seucrm.com';
            const affiliateLink = `${baseUrl}/api/partners/ref/${partner.partner_code}`;
            
            const materials = [
                {
                    type: 'banner',
                    title: 'Banner 728x90',
                    content_url: `${baseUrl}/materials/banner-728x90.png`,
                    content_html: `<a href="${affiliateLink}" target="_blank"><img src="${baseUrl}/materials/banner-728x90.png" alt="CRM WhatsApp" width="728" height="90" /></a>`
                },
                {
                    type: 'email_template',
                    title: 'Template de Email',
                    content_html: `
                        <h2>Conheça o CRM que vai revolucionar seu negócio!</h2>
                        <p>Olá!</p>
                        <p>Quero compartilhar com você uma ferramenta incrível que está transformando a forma como pequenos negócios se relacionam com seus clientes via WhatsApp.</p>
                        <p>O CRM Inteligente é perfeito para profissionais como você que querem:</p>
                        <ul>
                            <li>✅ Automatizar respostas no WhatsApp</li>
                            <li>✅ Organizar contatos e conversas</li>
                            <li>✅ Agendar compromissos automaticamente</li>
                            <li>✅ Aumentar vendas com IA brasileira</li>
                        </ul>
                        <p><a href="${affiliateLink}" style="background: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">🚀 Experimente GRÁTIS por 7 dias</a></p>
                        <p>Abraços,<br>${partner.business_name}</p>
                    `
                },
                {
                    type: 'social_media',
                    title: 'Post para Redes Sociais',
                    content_text: `🚀 Descobri uma ferramenta INCRÍVEL para automatizar WhatsApp!

O CRM Inteligente está revolucionando pequenos negócios com:
✅ Respostas automáticas inteligentes
✅ Agendamento sem complicação
✅ IA que entende o brasileiro
✅ Interface super simples

Link para teste gratuito: ${affiliateLink}

#CRM #WhatsApp #Automacao #PequenosNegocios`
                },
                {
                    type: 'landing_page',
                    title: 'Página de Indicação',
                    content_url: `${baseUrl}/landing/${partner.partner_code}`,
                    content_html: `<iframe src="${baseUrl}/landing/${partner.partner_code}" width="100%" height="600" frameborder="0"></iframe>`
                }
            ];
            
            return materials;
        } catch (error) {
            console.error('Error generating marketing materials:', error);
            return null;
        }
    }

    // ==========================================
    // BUSCAR ESTATÍSTICAS DETALHADAS
    // ==========================================
    static async getPartnerStats(partnerId, period = 'month') {
        try {
            let dateFilter = '';
            const now = new Date();
            
            switch(period) {
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    dateFilter = weekAgo.toISOString();
                    break;
                case 'month':
                    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
                    dateFilter = monthAgo.toISOString();
                    break;
                case 'year':
                    const yearAgo = new Date(now.getFullYear(), 0, 1);
                    dateFilter = yearAgo.toISOString();
                    break;
                default:
                    const defaultDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    dateFilter = defaultDate.toISOString();
            }
            
            const { data: referrals } = await supabase
                .from('partner_referrals')
                .select('*')
                .eq('partner_id', partnerId)
                .gte('created_at', dateFilter);
            
            const { data: commissions } = await supabase
                .from('partner_commissions')
                .select('*')
                .eq('partner_id', partnerId)
                .gte('created_at', dateFilter);
            
            const stats = {
                total_clicks: referrals ? referrals.length : 0,
                total_registrations: referrals ? referrals.filter(r => r.status !== 'clicked').length : 0,
                total_conversions: referrals ? referrals.filter(r => r.status === 'subscribed').length : 0,
                total_commission: commissions ? commissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0) : 0,
                conversion_rate: 0,
                pending_commission: commissions ? commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.commission_amount || 0), 0) : 0,
                paid_commission: commissions ? commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.commission_amount || 0), 0) : 0
            };
            
            if (stats.total_clicks > 0) {
                stats.conversion_rate = ((stats.total_conversions / stats.total_clicks) * 100).toFixed(2);
            }
            
            return stats;
        } catch (error) {
            console.error('Error getting partner stats:', error);
            return null;
        }
    }

    // ==========================================
    // FUNÇÃO AUXILIAR: TAXA DE COMISSÃO
    // ==========================================
    static async getPartnerCommissionRate(partnerId) {
        try {
            const { data: partner } = await supabase
                .from('partners')
                .select('commission_tier, custom_commission_rate')
                .eq('id', partnerId)
                .single();
            
            if (!partner) return 10;
            
            if (partner.custom_commission_rate) {
                return partner.custom_commission_rate;
            }
            
            switch (partner.commission_tier) {
                case 'bronze': return 10;
                case 'silver': return 15;
                case 'gold': return 20;
                default: return 10;
            }
        } catch (error) {
            console.error('Error getting commission rate:', error);
            return 10;
        }
    }

    // ==========================================
    // VALIDAR PARCEIRO ATIVO
    // ==========================================
    static async validateActivePartner(partnerCode) {
        try {
            const { data: partner } = await supabase
                .from('partners')
                .select('id, status, partner_code, business_name')
                .eq('partner_code', partnerCode)
                .eq('status', 'approved')
                .single();
            
            return partner;
        } catch (error) {
            console.error('Error validating partner:', error);
            return null;
        }
    }
}

module.exports = PartnerService;