// 🔒 API PARA SALVAR CONSENTIMENTOS EM MASSA - INTEGRAÇÃO SUPABASE
// 📁 CRIAR: C:\Users\crist\crm-whatsapp-mvp\apps\api\src\routes\consent-bulk.js

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Configuração Supabase com service_role para bypass RLS
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // ← Service role para admin
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 🔒 ROTA: POST /api/consent-bulk - Salvar consentimentos em massa
router.post('/', async (req, res) => {
    try {
        console.log('🔒 [CONSENT-BULK] Recebendo consentimentos:', req.body);
        
        const { user_id, consents, user_info } = req.body;

        if (!user_id || !consents || !Array.isArray(consents)) {
            return res.status(400).json({
                success: false,
                error: 'user_id e consents (array) são obrigatórios'
            });
        }

        // 1. Verificar se usuário existe
        const { data: userCheck, error: userError } = await supabase
            .from('users')
            .select('id, email, name')
            .eq('id', user_id)
            .single();

        if (userError || !userCheck) {
            console.error('❌ [CONSENT-BULK] Usuário não encontrado:', userError);
            return res.status(404).json({
                success: false,
                error: 'Usuário não encontrado'
            });
        }

        console.log('✅ [CONSENT-BULK] Usuário encontrado:', userCheck.email);

        // 2. Remover consentimentos antigos deste usuário
        const { error: deleteError } = await supabase
            .from('data_protection_consents')
            .delete()
            .eq('user_id', user_id);

        if (deleteError) {
            console.error('⚠️ [CONSENT-BULK] Erro ao limpar consentimentos antigos:', deleteError);
            // Continua mesmo com erro de limpeza
        }

        // 3. Preparar novos consentimentos para inserção
        const now = new Date().toISOString();
        const consentsToInsert = consents.map(consent => ({
            user_id: user_id,
            consent_type: consent.consent_type,
            purpose: consent.purpose || `Consentimento para ${consent.consent_type}`,
            legal_basis: 'consent', // ← SEMPRE 'consent' (único valor apropriado para consentimentos)
            consent_given: consent.consent_given,
            consent_date: consent.consent_given ? now : null,
            withdrawal_date: !consent.consent_given ? now : null,
            ip_address: req.ip || '127.0.0.1',
            user_agent: req.get('User-Agent') || 'Unknown',
            consent_method: 'explicit_opt_in',
            created_at: now,
            updated_at: now
        }));

        console.log('📝 [CONSENT-BULK] Inserindo consentimentos:', consentsToInsert.length);

        // 4. Inserir novos consentimentos
        const { data: insertedConsents, error: insertError } = await supabase
            .from('data_protection_consents')
            .insert(consentsToInsert)
            .select();

        if (insertError) {
            console.error('❌ [CONSENT-BULK] Erro ao inserir consentimentos:', insertError);
            return res.status(500).json({
                success: false,
                error: 'Erro ao salvar consentimentos no banco de dados',
                details: insertError.message
            });
        }

        console.log('✅ [CONSENT-BULK] Consentimentos salvos:', insertedConsents?.length || 0);

        // 5. Log de auditoria (USANDO ESTRUTURA REAL)
        const { error: auditError } = await supabase
            .from('audit_logs')
            .insert({
                action: 'CONSENT_BULK_UPDATE',
                entity_type: 'data_protection_consents',
                entity_id: user_id,
                description: `Usuário ${userCheck.email} atualizou ${consents.length} consentimentos LGPD/GDPR`,
                category: 'compliance',
                new_values: {
                    consents_count: consents.length,
                    consent_types: consents.map(c => c.consent_type),
                    user_email: userCheck.email,
                    timestamp: now
                },
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                status: 'success',
                severity: 'info',
                legal_basis: 'consent',
                lgpd_article: 'Art. 7º - Base legal do consentimento',
                gdpr_article: 'Art. 6º(1)(a) - Consent of the data subject'
            });

        if (auditError) {
            console.error('⚠️ [CONSENT-BULK] Erro no log de auditoria:', auditError);
            // Não falha por causa do log
        }

        // 6. Resposta de sucesso
        res.json({
            success: true,
            message: 'Consentimentos salvos com sucesso',
            data: {
                user_id: user_id,
                consents_saved: insertedConsents?.length || 0,
                timestamp: now
            }
        });

    } catch (error) {
        console.error('💥 [CONSENT-BULK] Erro geral:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

// 🔍 ROTA: GET /api/consent-bulk/:user_id - Buscar consentimentos do usuário  
router.get('/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        
        console.log('🔍 [CONSENT-BULK] Buscando consentimentos para:', user_id);

        // 1. Buscar consentimentos do usuário
        const { data: consents, error: consentsError } = await supabase
            .from('data_protection_consents')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });

        if (consentsError) {
            console.error('❌ [CONSENT-BULK] Erro ao buscar consentimentos:', consentsError);
            return res.status(500).json({
                success: false,
                error: 'Erro ao buscar consentimentos',
                details: consentsError.message
            });
        }

        console.log('✅ [CONSENT-BULK] Consentimentos encontrados:', consents?.length || 0);

        // 2. Transformar para formato do frontend
        const formattedConsents = (consents || []).map(consent => ({
            consent_type: consent.consent_type,
            consent_given: consent.consent_given,
            purpose: consent.purpose,
            consent_date: consent.consent_date,
            withdrawal_date: consent.withdrawal_date
        }));

        res.json({
            success: true,
            data: {
                user_id: user_id,
                consents: formattedConsents,
                total: formattedConsents.length
            }
        });

    } catch (error) {
        console.error('💥 [CONSENT-BULK] Erro geral na busca:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

module.exports = router;