// ================================================
// FASE 2 PASSO 2.1 - ROTAS DE PARCEIROS
// apps/api/src/routes/partners.js
// ================================================

const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ================================================
// MIDDLEWARE PARA AUTENTICAÇÃO DE PARCEIROS
// ================================================
const authenticatePartner = async (req, res, next) => {
    try {
        const partnerId = req.headers['x-partner-id'];
        const partnerCode = req.headers['x-partner-code'];

        if (!partnerId && !partnerCode) {
            return res.status(401).json({ error: 'Partner authentication required' });
        }

        let query = supabase.from('partners').select('*');
        
        if (partnerId) {
            query = query.eq('id', partnerId);
        } else {
            query = query.eq('partner_code', partnerCode);
        }

        const { data: partner, error } = await query.single();

        if (error || !partner) {
            return res.status(401).json({ error: 'Invalid partner credentials' });
        }

        if (partner.status !== 'approved') {
            return res.status(403).json({ error: 'Partner not approved' });
        }

        req.partner = partner;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Authentication error' });
    }
};

// ================================================
// 🔐 ROTAS PÚBLICAS
// ================================================

// Cadastro de novo parceiro
router.post('/register', async (req, res) => {
    try {
        const {
            business_name,
            business_type,
            contact_person,
            email,
            phone,
            document,
            address,
            bank_data
        } = req.body;

        // Validações básicas
        if (!business_name || !email || !contact_person) {
            return res.status(400).json({ 
                error: 'Business name, email and contact person are required' 
            });
        }

        // Verificar se email já existe
        const { data: existingPartner } = await supabase
            .from('partners')
            .select('id')
            .eq('email', email)
            .single();

        if (existingPartner) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Gerar código único do parceiro
        const partnerCode = `P${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;

        // Criar parceiro
        const { data: partner, error } = await supabase
            .from('partners')
            .insert({
                partner_code: partnerCode,
                partner_type: 'individual', // ou 'company' baseado no business_type
                business_name,
                business_type,
                contact_person,
                email,
                phone,
                document,
                address,
                bank_data,
                status: 'pending'
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({
            message: 'Partner registered successfully',
            partner: {
                id: partner.id,
                partner_code: partner.partner_code,
                business_name: partner.business_name,
                status: partner.status
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Verificar status de parceiro pelo código
router.get('/status/:partnerCode', async (req, res) => {
    try {
        const { partnerCode } = req.params;

        const { data: partner, error } = await supabase
            .from('partners')
            .select('id, partner_code, business_name, status, created_at')
            .eq('partner_code', partnerCode)
            .single();

        if (error || !partner) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        res.json({ partner });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check status' });
    }
});

// Tracking manual de clicks
router.post('/track-click', async (req, res) => {
    try {
        const {
            partner_code,
            source,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            client_ip,
            user_agent
        } = req.body;

        // Validação básica
        if (!partner_code) {
            return res.status(400).json({ error: 'Partner code is required' });
        }

        // Verificar se parceiro existe e está ativo
        const { data: partner, error: partnerError } = await supabase
            .from('partners')
            .select('id, partner_code, business_name')
            .eq('partner_code', partner_code)
            .eq('status', 'approved')
            .single();

        if (partnerError || !partner) {
            return res.status(404).json({ error: 'Partner not found or not active' });
        }

        // Gerar token único para rastreamento
        const referralToken = `CLK${Date.now()}${Math.random().toString(36).substr(2, 5)}`;

        // Registrar click de referral
        const { data: referral, error } = await supabase
            .from('partner_referrals')
            .insert({
                partner_id: partner.id,
                referral_token: referralToken,
                referred_email: 'temp_click@tracking.com', // ← ADICIONAR ESTA LINHA
                source_url: source || 'manual_tracking',
                utm_source,
                utm_medium,
                utm_campaign,
                utm_content,
                user_agent: user_agent || req.get('User-Agent'),
                ip_address: client_ip || req.ip,
                status: 'clicked'
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Atualizar contador de referrals do parceiro
        await supabase
            .from('partners')
            .update({
                total_referrals: partner.total_referrals + 1,
                current_month_referrals: partner.current_month_referrals + 1
            })
            .eq('id', partner.id);

        res.status(201).json({
            message: 'Click tracked successfully',
            referral_token: referralToken,
            partner_code: partner_code
        });

    } catch (error) {
        console.error('Error tracking click:', error);
        res.status(500).json({ error: 'Failed to track click' });
    }
});

// Tracking de conversões (quando cliente se cadastra via referral)
router.post('/track-conversion', async (req, res) => {
    try {
        console.log('🔍 DEBUG CONVERSION - Body recebido:', req.body);
        const {
            partner_code,
            referral_token,
            client_email,
            client_name,
            subscription_plan,
            conversion_value =99.9,
            registered_at
        } = req.body;

        console.log('🔍 DEBUG CONVERSION - Campos extraídos:', {
            partner_code, client_email, client_name, subscription_plan
        });

        // Validação básica
        if (!partner_code || !client_email) {
            return res.status(400).json({ 
                error: 'Partner code and client email are required' 
            });
        }

        // Verificar se parceiro existe e está ativo
        const { data: partner, error: partnerError } = await supabase
            .from('partners')
            .select('id, partner_code, commission_tier')
            .eq('partner_code', partner_code)
            .eq('status', 'approved')
            .single();

        if (partnerError || !partner) {
            return res.status(404).json({ error: 'Partner not found or not active' });
        }

        // Verificar se já existe conversão para este email e parceiro
        const { data: existingConversion } = await supabase
            .from('partner_referrals')
            .select('id')
            .eq('partner_id', partner.id)
            .eq('referred_email', client_email)
            .eq('status', 'converted')
            .single();

        if (existingConversion) {
            return res.status(400).json({ 
                error: 'Conversion already exists for this client and partner' 
            });
        }

        // Buscar referral existente pelo token (se fornecido)
        let referralRecord = null;
        if (referral_token) {
            const { data: existingReferral } = await supabase
                .from('partner_referrals')
                .select('*')
                .eq('referral_token', referral_token)
                .eq('partner_id', partner.id)
                .single();

            referralRecord = existingReferral;
        }

        // Se não tem referral existente, criar novo
        if (!referralRecord) {
            const newReferralToken = `CONV${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
            
            const { data: newReferral, error: newReferralError } = await supabase
                .from('partner_referrals')
                .insert({
                    partner_id: partner.id,
                    referral_token: newReferralToken,
                    referred_email: client_email,
                    referred_name: client_name,
                    subscription_plan,
                    // conversion_value: conversion_value || 0,
                    registered_at: registered_at || new Date().toISOString(),
                    status: 'converted',
                    source_url: 'direct_conversion'
                })
                .select()
                .single();

            if (newReferralError) {
                return res.status(400).json({ error: newReferralError.message });
            }

            referralRecord = newReferral;
        } else {
            // Atualizar referral existente com dados da conversão
            const { data: updatedReferral, error: updateError } = await supabase
                .from('partner_referrals')
                .update({
                    referred_email: client_email,
                    referred_name: client_name,
                    subscription_plan,
                    // conversion_value: conversion_value || 0,
                    registered_at: registered_at || new Date().toISOString(),
                    status: 'converted'
                })
                .eq('id', referralRecord.id)
                .select()
                .single();

            if (updateError) {
                return res.status(400).json({ error: updateError.message });
            }

            referralRecord = updatedReferral;
        }

        // Atualizar contadores do parceiro
        await supabase
            .from('partners')
            .update({
                total_conversions: partner.total_conversions + 1,
                current_month_conversions: partner.current_month_conversions + 1
            })
            .eq('id', partner.id);

        // Calcular comissão baseada no plano e tier do parceiro
        const commissionRates = {
            bronze: 0.10,
            silver: 0.15,
            gold: 0.20,
            custom: partner.custom_commission_rate || 0.10
        };

        const commissionRate = commissionRates[partner.commission_tier] || 0.10;
        const commissionAmount = (conversion_value || 0) * commissionRate;

        // Criar registro de comissão
        if (commissionAmount > 0) {
            await supabase
                .from('partner_commissions')
                .insert({
                    partner_id: partner.id,
                    referral_id: referralRecord.id,
                    commission_type: 'referral_bonus',
                    commission_rate: commissionRate,
                    base_amount: conversion_value || 99.9,
                    commission_amount: commissionAmount,
                    reference_month: new Date().getMonth() + 1,
                    reference_year: new Date().getFullYear(),
                    status: 'pending'
                });
        }

        res.status(201).json({
            message: 'Conversion tracked successfully',
            referral_id: referralRecord.id,
            partner_code: partner_code,
            commission_amount: commissionAmount,
            client_email
        });

    } catch (error) {
        console.error('❌ ERRO DETALHADO NA CONVERSÃO:', error);
        res.status(500).json({ error: 'Failed to track conversion' });
    }
});

// Landing page com tracking de referral
router.get('/ref/:partnerCode', async (req, res) => {
    try {
        const { partnerCode } = req.params;
        const { utm_source, utm_medium, utm_campaign, utm_content } = req.query;

        // Verificar se parceiro existe e está ativo
        const { data: partner, error } = await supabase
            .from('partners')
            .select('id, partner_code, business_name')
            .eq('partner_code', partnerCode)
            .eq('status', 'approved')
            .single();

        if (error || !partner) {
            return res.redirect('https://seucrm.com/cadastro');
        }

        // Gerar token único para rastreamento
        const referralToken = `REF${Date.now()}${Math.random().toString(36).substr(2, 5)}`;

        // Registrar click de referral
        await supabase.from('partner_referrals').insert({
            partner_id: partner.id,
            referral_token: referralToken,
            source_url: req.get('Referer'),
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            user_agent: req.get('User-Agent'),
            ip_address: req.ip,
            status: 'clicked'
        });

        // Redirecionar para página de cadastro com token
        const redirectUrl = `https://seucrm.com/cadastro?ref=${referralToken}&partner=${partnerCode}`;
        res.redirect(redirectUrl);
    } catch (error) {
        res.redirect('https://seucrm.com/cadastro');
    }
});

// ================================================
// 🔐 ROTAS AUTENTICADAS - PARCEIROS
// ================================================

// Dashboard do parceiro
router.get('/dashboard', authenticatePartner, async (req, res) => {
    try {
        const partnerId = req.partner.id;

        // Buscar dados do dashboard usando a view
        const { data: dashboardData, error } = await supabase
            .from('partner_dashboard_summary')
            .select('*')
            .eq('id', partnerId)
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Buscar últimas indicações
        const { data: recentReferrals } = await supabase
            .from('partner_referrals')
            .select(`
                id,
                referred_email,
                referred_name,
                status,
                created_at
            `)
            .eq('partner_id', partnerId)
            .order('created_at', { ascending: false })
            .limit(10);

        res.json({
            dashboard: dashboardData,
            recent_referrals: recentReferrals || []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

// Gerar novo link de afiliado
router.post('/generate-link', authenticatePartner, async (req, res) => {
    try {
        const partnerCode = req.partner.partner_code;
        const { campaign_name, utm_source, utm_medium, utm_content } = req.body;

        let baseUrl = `https://api.seucrm.com/api/partners/ref/${partnerCode}`;

        // Adicionar parâmetros UTM se fornecidos
        const params = new URLSearchParams();
        if (utm_source) params.append('utm_source', utm_source);
        if (utm_medium) params.append('utm_medium', utm_medium);
        if (campaign_name) params.append('utm_campaign', campaign_name);
        if (utm_content) params.append('utm_content', utm_content);

        if (params.toString()) {
            baseUrl += `?${params.toString()}`;
        }

        res.json({
            affiliate_link: baseUrl,
            partner_code: partnerCode,
            utm_parameters: Object.fromEntries(params)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate link' });
    }
});

// Buscar materiais de marketing do parceiro
router.get('/materials', authenticatePartner, async (req, res) => {
    try {
        const partnerId = req.partner.id;
        const { type } = req.query;

        // Buscar materiais usando a function do banco
        const { data: materials, error } = await supabase
            .rpc('get_partner_materials', {
                partner_uuid: partnerId,
                material_type_filter: type || null,
                only_active: true
            });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ materials });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load materials' });
    }
});

// Buscar comissões do parceiro
router.get('/commissions', authenticatePartner, async (req, res) => {
    try {
        const partnerId = req.partner.id;
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('partner_commissions')
            .select(`
                id,
                commission_type,
                commission_rate,
                base_amount,
                commission_amount,
                status,
                reference_month,
                reference_year,
                created_at
            `)
            .eq('partner_id', partnerId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: commissions, error } = await query;

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ commissions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load commissions' });
    }
});

// Atualizar dados do parceiro
router.put('/profile', authenticatePartner, async (req, res) => {
    try {
        const partnerId = req.partner.id;
        const {
            business_name,
            contact_person,
            phone,
            address,
            bank_data,
            email_notifications,
            marketing_materials_access
        } = req.body;

        const updateData = {};
        if (business_name) updateData.business_name = business_name;
        if (contact_person) updateData.contact_person = contact_person;
        if (phone) updateData.phone = phone;
        if (address) updateData.address = address;
        if (bank_data) updateData.bank_data = bank_data;
        if (typeof email_notifications === 'boolean') updateData.email_notifications = email_notifications;
        if (typeof marketing_materials_access === 'boolean') updateData.marketing_materials_access = marketing_materials_access;

        const { data: partner, error } = await supabase
            .from('partners')
            .update(updateData)
            .eq('id', partnerId)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            message: 'Profile updated successfully',
            partner
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ================================================
// 🔐 ROTAS ADMIN
// ================================================

// Listar todos os parceiros (admin)
router.get('/admin/list', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, business_type } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('partners')
            .select(`
                id,
                partner_code,
                business_name,
                business_type,
                contact_person,
                email,
                status,
                commission_tier,
                total_referrals,
                total_conversions,
                total_commission_earned,
                created_at
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }
        if (business_type) {
            query = query.eq('business_type', business_type);
        }

        const { data: partners, error } = await query;

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ partners });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load partners' });
    }
});

// Aprovar/rejeitar parceiro (admin)
router.put('/admin/:partnerId/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { partnerId } = req.params;
        const { status } = req.body; // Remover notes

        const updateData = {
            status
            // notes removido
        };

        if (status === 'approved') {
            updateData.approved_at = new Date().toISOString();
            updateData.approved_by = req.admin.id;  // ✅ este campo existe
        }

        const { data: partner, error } = await supabase
            .from('partners')
            .update(updateData)
            .eq('id', partnerId)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // TODO: Enviar email de notificação para o parceiro

        res.json({
            message: `Partner ${status} successfully`,
            partner
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update partner status' });
    }
});

// Dashboard administrativo completo
router.get('/admin/dashboard', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Buscar todos os parceiros para estatísticas
        const { data: partners, error: partnersError } = await supabase
            .from('partners')
            .select('status, commission_tier, created_at, total_referrals, total_conversions, total_commission_earned');

        if (partnersError) {
            return res.status(400).json({ error: partnersError.message });
        }

        // Estatísticas dos parceiros
        const partnerStats = {
            total: partners.length,
            approved: partners.filter(p => p.status === 'approved').length,
            pending: partners.filter(p => p.status === 'pending').length,
            rejected: partners.filter(p => p.status === 'rejected').length,
            bronze: partners.filter(p => p.commission_tier === 'bronze').length,
            silver: partners.filter(p => p.commission_tier === 'silver').length,
            gold: partners.filter(p => p.commission_tier === 'gold').length
        };

        res.json({
            success: true,
            dashboard: {
                partner_stats: partnerStats,
                total_partners: partners.length
            },
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        res.status(500).json({ error: 'Failed to load admin dashboard' });
    }
});

// Buscar estatísticas administrativas
router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Usar a view admin_partner_summary para estatísticas
        const { data: stats, error } = await supabase
            .from('admin_partner_summary')
            .select('*')
            .order('month', { ascending: false })
            .limit(12); // Últimos 12 meses

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Estatísticas gerais
        const { data: generalStats, error: generalError } = await supabase
            .from('partners')
            .select('status, commission_tier')
            .then(result => {
                if (result.error) return result;
                
                const data = result.data;
                const summary = {
                    total: data.length,
                    approved: data.filter(p => p.status === 'approved').length,
                    pending: data.filter(p => p.status === 'pending').length,
                    rejected: data.filter(p => p.status === 'rejected').length,
                    bronze: data.filter(p => p.commission_tier === 'bronze').length,
                    silver: data.filter(p => p.commission_tier === 'silver').length,
                    gold: data.filter(p => p.commission_tier === 'gold').length
                };
                
                return { data: summary, error: null };
            });

        if (generalError) {
            return res.status(400).json({ error: generalError.message });
        }

        res.json({
            monthly_stats: stats,
            general_stats: generalStats.data
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load admin stats' });
    }
});

module.exports = router;