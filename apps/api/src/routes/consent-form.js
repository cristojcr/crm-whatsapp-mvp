// 🚀 PASSO 4.3: APIs ESPECÍFICAS PARA FORMULÁRIO DE CONSENTIMENTO
// 📍 Arquivo: apps/api/src/routes/consent-form.js

const express = require('express');
const { supabase } = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Criar cliente admin com service_role para operações de sistema
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ========================================
// 🔄 POST /api/consent-form/bulk
// Salvar múltiplos consentimentos de uma vez (do formulário)
// ========================================
router.post('/bulk', async (req, res) => {
    try {
        const { user_info, consents } = req.body;
        
        if (!user_info || !consents || !Array.isArray(consents)) {
            return res.status(400).json({
                error: 'Dados inválidos',
                required: ['user_info', 'consents (array)']
            });
        }

        console.log(`📝 Salvando ${consents.length} consentimentos para ${user_info.email}`);

        // 1. Buscar usuário usando service_role (bypassa RLS)
        const { data: existingUser, error: findError } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', user_info.email)
            .single();

        if (findError || !existingUser) {
            console.error('❌ Usuário não encontrado para email:', user_info.email);
            console.error('Erro do Supabase:', findError);
            return res.status(404).json({
                error: 'Usuário não encontrado. Você precisa estar logado.',
                suggestion: 'Faça login primeiro e tente novamente.',
                debug: {
                    searched_email: user_info.email,
                    supabase_error: findError?.message
                }
            });
        }

        const userId = existingUser.id;
        console.log(`✅ Usuário encontrado: ${userId}`);

        // 2. Salvar todos os consentimentos usando service_role
        const consentRecords = consents.map(consent => ({
            user_id: userId,
            consent_type: consent.consent_type,
            consent_given: consent.consent_given,
            purpose: consent.purpose || `Consentimento para ${consent.consent_type}`,
            legal_basis: consent.legal_basis || 'consent',
            consent_date: new Date().toISOString(),
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            consent_method: 'explicit_opt_in'
            // ❌ REMOVIDOS: version, additional_data (não existem na tabela!)
        }));

        const { data: savedConsents, error: consentError } = await supabaseAdmin
            .from('data_protection_consents')
            .insert(consentRecords)
            .select();

        if (consentError) {
            console.error('❌ Erro ao salvar consentimentos:', consentError);
            throw consentError;
        }

        // 3. Log de auditoria usando service_role
        // const { error: auditError } = await supabaseAdmin
        //     .from('audit_logs')
        //     .insert({
        //         action: 'CONSENT_BULK_UPDATE',
        //         entity_type: 'data_protection_consents',
        //         entity_id: userId,
        //         description: `Usuário ${user_info.email} registrou ${consents.length} consentimentos LGPD/GDPR via formulário web`,
        //         category: 'compliance',
        //         status: 'success',
        //         severity: 'info',
        //         ip_address: req.ip,
        //         user_agent: req.get('User-Agent'),
        //         metadata: {
        //             // ✅ CAMPOS LGPD/GDPR VÃO NO METADATA
        //             legal_basis: 'consent',
        //             lgpd_article: 'Art. 7º - Base legal do consentimento',
        //             gdpr_article: 'Art. 6º(1)(a) - Consent of the data subject',
        //             consents_count: consents.length,
        //             consent_types: consents.map(c => c.consent_type),
        //             user_email: user_info.email,
        //             form_version: '1.0',
        //             browser_info: req.get('User-Agent'),
        //             timestamp: new Date().toISOString()
        //         }
        //     });

        // if (auditError) {
        //     console.error('⚠️ Erro no log de auditoria:', auditError);
        //     // Não falhar por causa do log de auditoria
        // }

        console.log(`✅ ${savedConsents.length} consentimentos salvos com sucesso!`);

        res.status(201).json({
            success: true,
            message: `${consents.length} consentimentos salvos com sucesso`,
            user_id: userId,
            consents_saved: savedConsents.length,
            consent_ids: savedConsents.map(c => c.id)
        });

    } catch (error) {
        console.error('❌ Erro ao salvar consentimentos em bulk:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

// ========================================
// 🔍 GET /api/consent-form/user/:email
// Buscar consentimentos existentes do usuário
// ========================================
router.get('/user/:email', async (req, res) => {
    try {
        const { email } = req.params;

        console.log(`🔍 Buscando consentimentos para: ${email}`);

        // 1. Buscar usuário usando service_role
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (userError || !user) {
            return res.json({
                consents: [],
                message: 'Usuário não encontrado ou sem consentimentos'
            });
        }

        // 2. Buscar consentimentos usando service_role
        const { data: consents, error: consentsError } = await supabaseAdmin
            .from('data_protection_consents')
            .select('*')
            .eq('user_id', user.id)
            .order('consent_date', { ascending: false });

        if (consentsError) throw consentsError;

        // 3. Agrupar por tipo (mais recente por tipo)
        const latestConsents = {};
        consents.forEach(consent => {
            if (!latestConsents[consent.consent_type]) {
                latestConsents[consent.consent_type] = consent;
            }
        });

        res.json({
            user_id: user.id,
            consents: Object.values(latestConsents),
            total_records: consents.length
        });

    } catch (error) {
        console.error('❌ Erro ao buscar consentimentos:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

// ========================================
// 🔄 PUT /api/consent-form/user/:email/revoke-all
// Revogar todos os consentimentos do usuário
// ========================================
router.put('/user/:email/revoke-all', async (req, res) => {
    try {
        const { email } = req.params;
        const { reason } = req.body;

        console.log(`🚫 Revogando todos os consentimentos para: ${email}`);

        // 1. Buscar usuário usando service_role
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (userError || !user) {
            return res.status(404).json({
                error: 'Usuário não encontrado'
            });
        }

        // 2. Revogar todos os consentimentos ativos usando service_role
        const { data: revokedConsents, error: revokeError } = await supabaseAdmin
            .from('data_protection_consents')
            .update({ 
                consent_given: false,
                withdrawal_date: new Date().toISOString(),
                withdrawal_reason: reason || 'Revogação total solicitada pelo usuário'
            })
            .eq('user_id', user.id)
            .eq('consent_given', true)
            .select();

        if (revokeError) throw revokeError;

        // 3. Log de auditoria usando service_role
    // await supabaseAdmin
    //     .from('audit_logs')
    //     .insert({
    //         action: 'CONSENT_REVOKE_ALL',
    //         entity_type: 'data_protection_consents', 
    //         entity_id: user.id,
    //         description: `Usuário ${email} revogou todos os ${revokedConsents.length} consentimentos LGPD/GDPR`,
    //         category: 'compliance',
    //         status: 'success',
    //         severity: 'warning',
    //         ip_address: req.ip,
    //         user_agent: req.get('User-Agent'),
    //         metadata: {
    //             legal_basis: 'withdrawal',
    //             lgpd_article: 'Art. 18º - Direito de revogação do consentimento',
    //             gdpr_article: 'Art. 7º(3) - Right to withdraw consent',
    //             revoked_count: revokedConsents.length,
    //             reason: reason || 'Revogação solicitada pelo usuário',
    //             user_email: email,
    //             revoked_consent_ids: revokedConsents.map(c => c.id)
    //         }
    //     });

        res.json({
            success: true,
            message: `${revokedConsents.length} consentimentos revogados`,
            revoked_consents: revokedConsents.length,
            user_id: user.id
        });

    } catch (error) {
        console.error('❌ Erro ao revogar consentimentos:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

// ========================================
// ✅ GET /api/consent-form/health
// Health check específico para APIs do formulário
// ========================================
router.get('/health', async (req, res) => {
    try {
        // Testar conexão com tabelas usando service_role
        const { data: testConsent } = await supabaseAdmin
            .from('data_protection_consents')
            .select('count')
            .limit(1);

        const { data: testUsers } = await supabaseAdmin
            .from('users')
            .select('count')
            .limit(1);

        res.json({
            status: 'healthy',
            message: 'APIs do formulário de consentimento operacionais',
            timestamp: new Date().toISOString(),
            database_status: 'connected',
            tables_accessible: ['data_protection_consents', 'users', 'audit_logs'],
            service_role: 'active'
        });

    } catch (error) {
        console.error('❌ Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;