// apps/api/src/routes/subscription.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../config/supabase');


// GET /api/subscription/limits - Buscar limites do plano do usuário
// GET /api/subscription/limits - Buscar limites baseado em CANAIS ATIVOS
router.get('/limits', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 VERIFICANDO LIMITES DO PLANO PARA:', req.user.email);
        
        // 1. Buscar company_id do usuário (mesma lógica dos profissionais)
        let company_id = null;
        const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('company_id, role')
            .eq('user_id', req.user.id)
            .single();
            
        if (userProfile) {
            company_id = userProfile.company_id;
        } else {
            company_id = req.user.id; // Fallback
        }
        
        console.log('🎯 Company_id para verificação:', company_id);
        
        // 2. ✅ BUSCAR TODOS OS CANAIS DISPONÍVEIS (não apenas ativos)
        const { data: channels, error: channelsError } = await supabase
            .from('user_channels')
            .select('channel_type, is_active')
            .eq('user_id', req.user.id);
            // ❌ REMOVIDO: .eq('is_active', true)
            
        if (channelsError) {
            console.error('❌ Erro ao buscar canais:', channelsError);
            // Fallback: assumir plano básico se erro
            channels = [];
        }

        const totalChannelsCount = channels ? channels.length : 0;
        const activeChannelsCount = channels ? channels.filter(c => c.is_active).length : 0;
        const channelTypes = channels ? channels.map(c => c.channel_type) : [];

        console.log('📱 CANAIS DO USUÁRIO:', {
            total_disponivel: totalChannelsCount,
            ativos_com_ia: activeChannelsCount,
            types: channelTypes,
            detalhes: channels
        });

        // 3. Buscar profissionais ativos da empresa
        const { data: professionals, error: profError } = await supabase
            .from('professionals')
            .select('id, name, is_active')
            .eq('company_id', company_id)
            .eq('is_active', true);
            
        const currentProfessionals = professionals ? professionals.length : 0;
        console.log('👥 Profissionais ativos:', currentProfessionals);

        // 4. ✅ LÓGICA DOS PLANOS BASEADA EM CANAIS DISPONÍVEIS (não ativos)
        let planType = 'BASIC';
        let maxProfessionals = 1;

        if (totalChannelsCount >= 3) {
            planType = 'PREMIUM';
            maxProfessionals = -1; // Ilimitado
        } else if (totalChannelsCount === 2) {
            planType = 'PRO';
            maxProfessionals = 3;
        } else if (totalChannelsCount === 1) {
            planType = 'BASIC';
            maxProfessionals = 1;
        } else {
            // Sem canais = plano gratuito limitado
            planType = 'FREE';
            maxProfessionals = 0;
        }

        console.log('📊 PLANO DETECTADO:', {
            canais_disponiveis: totalChannelsCount,
            canais_ativos: activeChannelsCount,
            tipos_canais: channelTypes,
            plano: planType,
            limite_profissionais: maxProfessionals === -1 ? 'ILIMITADO' : maxProfessionals,
            profissionais_atuais: currentProfessionals
        });

        // 5. Retornar resposta
        res.json({
            success: true,
            plan: planType,
            current: currentProfessionals,
            max: maxProfessionals,
            channels_count: totalChannelsCount,
            active_channels_count: activeChannelsCount,
            channels: channelTypes,
            can_add: maxProfessionals === -1 || currentProfessionals < maxProfessionals,
            company_id: company_id,
            debug_info: {
                user_id: req.user.id,
                channels_found: channels,
                professionals_found: professionals
            }
        });
        
    } catch (error) {
        console.error('❌ Erro em /api/subscription/limits:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

// GET /api/subscription/usage - Buscar uso atual do plano
router.get('/usage', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Buscar empresa do usuário
        const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('company_id')
            .eq('user_id', userId)
            .single();

        if (profileError || !userProfile?.company_id) {
            return res.status(400).json({
                success: false,
                error: 'Usuário não está associado a uma empresa'
            });
        }

        const companyId = userProfile.company_id;

        // Contar usage atual
        const [
            { data: professionals },
            { data: contacts },
            { data: appointments },
            { data: aiMessages }
        ] = await Promise.all([
            // Profissionais ativos
            supabase
                .from('professionals')
                .select('id')
                .eq('company_id', companyId)
                .eq('is_active', true),
            
            // Contatos
            supabase
                .from('contacts')
                .select('id')
                .eq('company_id', companyId),
            
            // Agendamentos este mês
            supabase
                .from('appointments')
                .select('id')
                .eq('company_id', companyId)
                .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
            
            // Mensagens IA este mês
            supabase
                .from('ai_interactions')
                .select('id')
                .eq('company_id', companyId)
                .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        ]);

        res.json({
            success: true,
            usage: {
                professionals: professionals?.length || 0,
                contacts: contacts?.length || 0,
                appointments_this_month: appointments?.length || 0,
                ai_messages_this_month: aiMessages?.length || 0
            },
            company_id: companyId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro em /api/subscription/usage:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// GET /api/subscription/plan - Buscar detalhes do plano atual
router.get('/plan', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Buscar empresa e subscription
        const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select(`
                company_id,
                companies (
                    name,
                    subscriptions (
                        *,
                        subscription_plans (
                            name,
                            price,
                            features,
                            description
                        )
                    )
                )
            `)
            .eq('user_id', userId)
            .single();

        if (profileError || !userProfile?.company_id) {
            return res.status(400).json({
                success: false,
                error: 'Usuário não está associado a uma empresa'
            });
        }

        const subscription = userProfile.companies?.subscriptions?.[0];
        const plan = subscription?.subscription_plans;

        res.json({
            success: true,
            company: {
                id: userProfile.company_id,
                name: userProfile.companies.name
            },
            subscription: subscription ? {
                id: subscription.id,
                status: subscription.status,
                current_period_start: subscription.current_period_start,
                current_period_end: subscription.current_period_end,
                cancel_at_period_end: subscription.cancel_at_period_end
            } : null,
            plan: plan ? {
                name: plan.name,
                price: plan.price,
                features: plan.features,
                description: plan.description
            } : {
                name: 'BASIC',
                price: 0,
                features: {
                    max_professionals: 1,
                    max_contacts: 100,
                    max_appointments_per_month: 50,
                    ai_messages_per_month: 100
                },
                description: 'Plano básico gratuito'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro em /api/subscription/plan:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

module.exports = router;