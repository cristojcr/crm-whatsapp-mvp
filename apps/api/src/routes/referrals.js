// ================================================
// FASE 2 PASSO 2.1 - ROTAS DE REFERRALS
// apps/api/src/routes/referrals.js
// ================================================

const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');

// ================================================
// MIDDLEWARE PARA RASTREAMENTO DE EVENTOS
// ================================================

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
            next();
        }
    };
};

// Processar evento após response
const processPartnerEvent = async (req, res, next) => {
    // Executar após response
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
            }
        } catch (error) {
            console.error('Error processing partner event:', error);
        }
    });

    next();
};

// ================================================
// HANDLERS PARA DIFERENTES TIPOS DE EVENTOS
// ================================================

const handleRegistrationEvent = async (req, referral) => {
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

    // Incrementar estatísticas
    await supabase.rpc('increment_partner_stats', {
        partner_id: referral.partner_id,
        stat_type: 'registrations'
    });

    // Criar analytics diários
    await updateDailyAnalytics(referral.partner_id, 'registrations');
};

const handleSubscriptionEvent = async (req, referral) => {
    const subscriptionData = req.body;

    // Calcular comissão
    const { data: commissionAmount } = await supabase
        .rpc('calculate_partner_commission', {
            p_partner_id: referral.partner_id,
            p_subscription_value: subscriptionData.amount,
            p_plan_type: subscriptionData.plan
        });

    // Atualizar referral
    await supabase
        .from('partner_referrals')
        .update({
            status: 'subscribed',
            subscribed_at: new Date().toISOString(),
            subscription_id: subscriptionData.subscription_id,
            subscription_plan: subscriptionData.plan,
            subscription_value: subscriptionData.amount,
            commission_amount: commissionAmount
        })
        .eq('id', referral.id);

    // Criar comissão
    await supabase
        .from('partner_commissions')
        .insert({
            partner_id: referral.partner_id,
            referral_id: referral.id,
            commission_type: 'signup',
            commission_rate: await getPartnerCommissionRate(referral.partner_id),
            base_amount: subscriptionData.amount,
            commission_amount: commissionAmount,
            reference_month: new Date().getMonth() + 1,
            reference_year: new Date().getFullYear(),
            status: 'pending'
        });

    // Atualizar estatísticas
    await supabase.rpc('increment_partner_stats', {
        partner_id: referral.partner_id,
        stat_type: 'conversions'
    });

    await updateDailyAnalytics(referral.partner_id, 'conversions');
};

const handlePageViewEvent = async (req, referral) => {
    // Incrementar contador de clicks
    await supabase
        .from('partner_referrals')
        .update({
            click_count: referral.click_count + 1
        })
        .eq('id', referral.id);

    await updateDailyAnalytics(referral.partner_id, 'clicks');
};

// ================================================
// FUNÇÕES AUXILIARES
// ================================================

// Função para atualizar analytics diários
const updateDailyAnalytics = async (partnerId, metricType) => {
    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabase
        .from('partner_analytics')
        .select('*')
        .eq('partner_id', partnerId)
        .eq('period_type', 'daily')
        .eq('period_date', today)
        .single();

    if (existing) {
        // Atualizar registro existente
        const updateData = {};
        switch (metricType) {
            case 'clicks':
                updateData.clicks = existing.clicks + 1;
                break;
            case 'registrations':
                updateData.registrations = existing.registrations + 1;
                break;
            case 'conversions':
                updateData.subscriptions = existing.subscriptions + 1;
                break;
        }

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
};

// Função auxiliar para buscar taxa de comissão do parceiro
const getPartnerCommissionRate = async (partnerId) => {
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
};

// ================================================
// 🔐 ROTAS PÚBLICAS
// ================================================

// Processar referral no cadastro de usuário
router.post('/process', async (req, res) => {
    try {
        const { referral_token, user_id, email, name, phone } = req.body;

        if (!referral_token) {
            return res.json({ message: 'No referral token provided' });
        }

        // Buscar referral existente
        const { data: referral, error: referralError } = await supabase
            .from('partner_referrals')
            .select('*')
            .eq('referral_token', referral_token)
            .single();

        if (referralError || !referral) {
            return res.status(404).json({ error: 'Invalid referral token' });
        }

        // Atualizar referral com dados do usuário registrado
        const { data: updatedReferral, error: updateError } = await supabase
            .from('partner_referrals')
            .update({
                referred_user_id: user_id,
                referred_email: email,
                referred_name: name,
                referred_phone: phone,
                status: 'registered',
                registered_at: new Date().toISOString()
            })
            .eq('id', referral.id)
            .select()
            .single();

        if (updateError) {
            return res.status(400).json({ error: updateError.message });
        }

        // Incrementar contador de registros do parceiro
        await supabase.rpc('increment_partner_stats', {
            partner_id: referral.partner_id,
            stat_type: 'registrations'
        });

        res.json({
            message: 'Referral processed successfully',
            referral: updatedReferral
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process referral' });
    }
});

// Processar conversão para assinatura
router.post('/convert', async (req, res) => {
    try {
        const { user_id, subscription_id, plan_type, subscription_value } = req.body;

        // Buscar referral do usuário
        const { data: referral, error: referralError } = await supabase
            .from('partner_referrals')
            .select('*')
            .eq('referred_user_id', user_id)
            .eq('status', 'registered')
            .single();

        if (referralError || !referral) {
            return res.json({ message: 'No active referral found for user' });
        }

        // Buscar dados do parceiro para calcular comissão
        const { data: partner, error: partnerError } = await supabase
            .from('partners')
            .select('*')
            .eq('id', referral.partner_id)
            .single();

        if (partnerError || !partner) {
            return res.status(400).json({ error: 'Partner not found' });
        }

        // Calcular comissão usando a function do banco
        const { data: commissionAmount } = await supabase
            .rpc('calculate_partner_commission', {
                p_partner_id: partner.id,
                p_subscription_value: subscription_value,
                p_plan_type: plan_type
            });

        // Atualizar referral com conversão
        const { data: updatedReferral, error: updateError } = await supabase
            .from('partner_referrals')
            .update({
                status: 'subscribed',
                subscribed_at: new Date().toISOString(),
                subscription_id,
                subscription_plan: plan_type,
                subscription_value,
                commission_rate: partner.commission_tier === 'bronze' ? 10 :
                               partner.commission_tier === 'silver' ? 15 : 20,
                commission_amount: commissionAmount
            })
            .eq('id', referral.id)
            .select()
            .single();

        if (updateError) {
            return res.status(400).json({ error: updateError.message });
        }

        // Criar registro de comissão
        const { data: commission, error: commissionError } = await supabase
            .from('partner_commissions')
            .insert({
                partner_id: partner.id,
                referral_id: referral.id,
                commission_type: 'signup',
                commission_rate: updatedReferral.commission_rate,
                base_amount: subscription_value,
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
            partner_id: partner.id,
            stat_type: 'conversions'
        });

        res.json({
            message: 'Conversion processed successfully',
            referral: updatedReferral,
            commission: commission
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process conversion' });
    }
});

// Validar token de referral
router.get('/validate/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const { data: referral, error } = await supabase
            .from('partner_referrals')
            .select(`
                id,
                referral_token,
                status,
                created_at,
                partners (
                    partner_code,
                    business_name,
                    status
                )
            `)
            .eq('referral_token', token)
            .single();

        if (error || !referral) {
            return res.status(404).json({ 
                valid: false, 
                message: 'Invalid referral token' 
            });
        }

        if (referral.partners.status !== 'approved') {
            return res.status(400).json({ 
                valid: false, 
                message: 'Partner not approved' 
            });
        }

        res.json({
            valid: true,
            referral: {
                token: referral.referral_token,
                status: referral.status,
                partner: {
                    code: referral.partners.partner_code,
                    name: referral.partners.business_name
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to validate token' });
    }
});

// ================================================
// 🔐 ROTAS AUTENTICADAS
// ================================================

// Buscar referrals do usuário logado
router.get('/my-referrals', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: referrals, error } = await supabase
            .from('partner_referrals')
            .select(`
                id,
                referral_token,
                status,
                commission_amount,
                created_at,
                partners (
                    partner_code,
                    business_name
                )
            `)
            .eq('referred_user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ referrals });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load referrals' });
    }
});

// ================================================
// MIDDLEWARE EXPORTS PARA USO EM OUTRAS ROTAS
// ================================================

module.exports = {
    router,
    trackPartnerEvent,
    processPartnerEvent
};