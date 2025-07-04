// apps/api/src/routes/admin/partner-settings-backend.js
const express = require('express');
const { supabase } = require('../../config/supabase');
const { authenticateToken } = require('../../middleware/auth');

const router = express.Router();

// GET /api/admin/partner-settings - Obter configurações
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { data: settingsData, error } = await supabase
            .from('partner_settings')
            .select('setting_key, setting_value')
            .eq('is_active', true);

        if (error) throw error;

        // Converter array de configurações em objeto
        const settings = {};
        settingsData.forEach(setting => {
            settings[setting.setting_key] = setting.setting_value;
        });

        // Configurações padrão se não existirem
        const defaultSettings = {
            commission_rates: {
                bronze: 10,
                silver: 15,
                gold: 20
            },
            auto_approval: {
                enabled: false,
                min_requirements: {
                    business_type: ['contador', 'associacao'],
                    min_experience_years: 2
                }
            },
            payment_schedule: {
                frequency: 'monthly',
                minimum_amount: 100,
                payment_day: 15,
                payment_methods: ['pix', 'bank_transfer']
            },
            tier_requirements: {
                silver: {
                    min_referrals: 10,
                    min_conversions: 5,
                    min_revenue: 5000
                },
                gold: {
                    min_referrals: 50,
                    min_conversions: 25,
                    min_revenue: 25000
                }
            },
            bonus_targets: [],
            marketing_materials: {
                enabled: true,
                custom_landing_pages: true,
                branded_links: true,
                email_templates: true,
                social_media_kit: true
            }
        };

        // Mesclar configurações padrão com as salvas
        const finalSettings = { ...defaultSettings, ...settings };

        res.json(finalSettings);
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/admin/partner-settings - Salvar configurações
router.post('/', authenticateToken, async (req, res) => {
    try {
        const settings = req.body;
        const adminId = req.user.id;

        // Preparar dados para inserção/atualização
        const settingsToUpdate = Object.entries(settings).map(([key, value]) => ({
            setting_key: key,
            setting_value: value,
            updated_by: adminId,
            updated_at: new Date().toISOString()
        }));

        // Usar upsert para inserir ou atualizar
        for (const setting of settingsToUpdate) {
            const { error } = await supabase
                .from('partner_settings')
                .upsert(setting, {
                    onConflict: 'setting_key'
                });

            if (error) throw error;
        }

        // Log da ação administrativa
        await supabase
            .from('audit_logs')
            .insert({
                user_id: adminId,
                action: 'update_partner_settings',
                resource_type: 'partner_settings',
                details: {
                    settings_updated: Object.keys(settings),
                    timestamp: new Date().toISOString()
                }
            });

        res.json({ success: true, message: 'Configurações salvas com sucesso' });
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;