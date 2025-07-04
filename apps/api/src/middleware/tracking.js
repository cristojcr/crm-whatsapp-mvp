// apps/api/src/middleware/tracking.js
// ID 2.13 - FASE 3 PASSO 3.1: Sistema de Rastreamento
// Middleware para rastreamento completo de conversões de parceiros

const { supabase } = require('../config/supabase');

// ==========================================
// MIDDLEWARE PRINCIPAL DE RASTREAMENTO
// ==========================================

// Middleware para rastrear eventos de parceiros
const trackPartnerEvent = (eventType) => {
    return async (req, res, next) => {
        try {
            // Verificar se há token de referral nos headers ou query
            const referralToken = req.headers['x-referral-token'] ||
                                req.query.ref ||
                                req.body.referral_token;
            
            if (!referralToken) {
                return next();
            }
            
            // Buscar referral
            const { data: referral } = await supabase
                .from('partner_referrals')
                .select('*')
                .eq('referral_token', referralToken)
                .single();
            
            if (!referral) {
                return next();
            }
            
            // Adicionar dados de rastreamento ao request
            req.partnerTracking = {
                referral,
                eventType,
                timestamp: new Date().toISOString(),
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip
            };
            
            next();
        } catch (error) {
            // Não bloquear o request em caso de erro de tracking
            console.error('Error in trackPartnerEvent:', error);
            next();
        }
    };
};

// ==========================================
// PROCESSAMENTO DE EVENTOS APÓS RESPONSE
// ==========================================

// Processar evento após response
const processPartnerEvent = async (req, res, next) => {
    // Executar após response para não afetar performance
    res.on('finish', async () => {
        if (!req.partnerTracking) return;
        
        try {
            const { referral, eventType } = req.partnerTracking;
            
            switch (eventType) {
                case 'registration':
                    await handleRegistrationEvent(req, referral);
                    break;
                case 'subscription':
                    await handleSubscriptionEvent(req, referral);
                    break;
                case 'page_view':
                    await handlePageViewEvent(req, referral);
                    break;
                case 'click':
                    await handleClickEvent(req, referral);
                    break;
                default:
                    console.log(`Unknown event type: ${eventType}`);
            }
        } catch (error) {
            console.error('Error processing partner event:', error);
        }
    });
    
    next();
};

// ==========================================
// HANDLERS PARA DIFERENTES TIPOS DE EVENTOS
// ==========================================

// Handler para evento de registro/cadastro
const handleRegistrationEvent = async (req, referral) => {
    try {
        const userData = req.body;
        
        // Atualizar referral com dados de registro
        await supabase
            .from('partner_referrals')
            .update({
                referred_user_id: userData.user_id,
                referred_email: userData.email,
                referred_name: userData.name,
                referred_phone: userData.phone,
                status: 'registered',
                registered_at: new Date().toISOString()
            })
            .eq('id', referral.id);
        
        // Incrementar estatísticas do parceiro
        await supabase.rpc('increment_partner_stats', {
            partner_id: referral.partner_id,
            stat_type: 'registrations'
        });
        
        // Criar analytics diários
        await updateDailyAnalytics(referral.partner_id, 'registrations');
        
        console.log(`Registration tracked for partner ${referral.partner_id}`);
    } catch (error) {
        console.error('Error handling registration event:', error);
    }
};

// Handler para evento de assinatura/conversão
const handleSubscriptionEvent = async (req, referral) => {
    try {
        const subscriptionData = req.body;
        
        // Calcular comissão
        const commissionRate = await getPartnerCommissionRate(referral.partner_id);
        const commissionAmount = (subscriptionData.amount * commissionRate / 100);
        
        // Atualizar referral com dados de conversão
        const { data: updatedReferral, error: updateError } = await supabase
            .from('partner_referrals')
            .update({
                status: 'subscribed',
                subscribed_at: new Date().toISOString(),
                subscription_id: subscriptionData.subscription_id,
                subscription_plan: subscriptionData.plan,
                subscription_value: subscriptionData.amount,
                commission_rate: commissionRate,
                commission_amount: commissionAmount
            })
            .eq('id', referral.id)
            .select()
            .single();
        
        if (updateError) {
            console.error('Error updating referral:', updateError);
            return;
        }
        
        // Criar registro de comissão
        const { data: commission, error: commissionError } = await supabase
            .from('partner_commissions')
            .insert({
                partner_id: referral.partner_id,
                referral_id: referral.id,
                commission_type: 'signup',
                commission_rate: commissionRate,
                base_amount: subscriptionData.amount,
                commission_amount: commissionAmount,
                reference_month: new Date().getMonth() + 1,
                reference_year: new Date().getFullYear(),
                status: 'pending'
            })
            .select()
            .single();
        
        if (commissionError) {
            console.error('Error creating commission:', commissionError);
        }
        
        // Atualizar estatísticas do parceiro
        await supabase.rpc('increment_partner_stats', {
            partner_id: referral.partner_id,
            stat_type: 'conversions'
        });
        
        // Criar analytics diários
        await updateDailyAnalytics(referral.partner_id, 'conversions');
        
        console.log(`Subscription tracked for partner ${referral.partner_id}, commission: R$${commissionAmount}`);
    } catch (error) {
        console.error('Error handling subscription event:', error);
    }
};

// Handler para visualização de página
const handlePageViewEvent = async (req, referral) => {
    try {
        // Incrementar contador de clicks se for a primeira vez
        const { data: existing } = await supabase
            .from('partner_referrals')
            .select('click_count')
            .eq('id', referral.id)
            .single();
        
        if (existing) {
            await supabase
                .from('partner_referrals')
                .update({
                    click_count: existing.click_count + 1,
                    source_url: req.get('Referer') || '',
                    user_agent: req.get('User-Agent'),
                    ip_address: req.ip
                })
                .eq('id', referral.id);
        }
        
        // Criar analytics diários
        await updateDailyAnalytics(referral.partner_id, 'clicks');
        
        console.log(`Page view tracked for partner ${referral.partner_id}`);
    } catch (error) {
        console.error('Error handling page view event:', error);
    }
};

// Handler para evento de click
const handleClickEvent = async (req, referral) => {
    try {
        // Atualizar dados do click
        await supabase
            .from('partner_referrals')
            .update({
                click_count: referral.click_count + 1,
                source_url: req.get('Referer') || '',
                utm_source: req.query.utm_source || '',
                utm_medium: req.query.utm_medium || '',
                utm_campaign: req.query.utm_campaign || '',
                utm_content: req.query.utm_content || '',
                user_agent: req.get('User-Agent'),
                ip_address: req.ip
            })
            .eq('id', referral.id);
        
        // Criar analytics diários
        await updateDailyAnalytics(referral.partner_id, 'clicks');
        
        console.log(`Click tracked for partner ${referral.partner_id}`);
    } catch (error) {
        console.error('Error handling click event:', error);
    }
};

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

// Atualizar analytics diários
const updateDailyAnalytics = async (partnerId, metricType) => {
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Verificar se já existe registro para hoje
        const { data: existing } = await supabase
            .from('partner_analytics')
            .select('*')
            .eq('partner_id', partnerId)
            .eq('period_type', 'daily')
            .eq('period_date', today)
            .single();
        
        if (existing) {
            // Atualizar registro existente
            const updateData = {
                clicks: existing.clicks + (metricType === 'clicks' ? 1 : 0),
                registrations: existing.registrations + (metricType === 'registrations' ? 1 : 0),
                subscriptions: existing.subscriptions + (metricType === 'conversions' ? 1 : 0)
            };
            
            await supabase
                .from('partner_analytics')
                .update(updateData)
                .eq('id', existing.id);
        } else {
            // Criar novo registro
            const insertData = {
                partner_id: partnerId,
                period_type: 'daily',
                period_date: today,
                clicks: metricType === 'clicks' ? 1 : 0,
                registrations: metricType === 'registrations' ? 1 : 0,
                subscriptions: metricType === 'conversions' ? 1 : 0
            };
            
            await supabase
                .from('partner_analytics')
                .insert(insertData);
        }
    } catch (error) {
        console.error('Error updating daily analytics:', error);
    }
};

// Função auxiliar para buscar taxa de comissão do parceiro
const getPartnerCommissionRate = async (partnerId) => {
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
};

// ==========================================
// FUNÇÃO PARA CRIAR REFERRAL TRACKING
// ==========================================

// Função para criar novo tracking de referral (usado nas rotas públicas)
const createPartnerReferral = async (partnerCode, metadata = {}) => {
    try {
        // Buscar parceiro
        const { data: partner } = await supabase
            .from('partners')
            .select('id')
            .eq('partner_code', partnerCode)
            .eq('status', 'approved')
            .single();
        
        if (!partner) {
            throw new Error('Partner not found or not approved');
        }
        
        // Gerar token único
        const referralToken = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Criar referral
        const { data: referral, error } = await supabase
            .from('partner_referrals')
            .insert({
                partner_id: partner.id,
                referral_token: referralToken,
                status: 'clicked',
                source_url: metadata.source_url || '',
                utm_source: metadata.utm_source || '',
                utm_medium: metadata.utm_medium || '',
                utm_campaign: metadata.utm_campaign || '',
                utm_content: metadata.utm_content || '',
                user_agent: metadata.user_agent || '',
                ip_address: metadata.ip_address || '',
                click_count: 1
            })
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        // Atualizar analytics
        await updateDailyAnalytics(partner.id, 'clicks');
        
        return referralToken;
    } catch (error) {
        console.error('Error creating partner referral:', error);
        return null;
    }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    trackPartnerEvent,
    processPartnerEvent,
    createPartnerReferral,
    updateDailyAnalytics,
    getPartnerCommissionRate
};