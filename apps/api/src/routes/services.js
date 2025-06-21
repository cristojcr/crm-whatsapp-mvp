// ===============================================
// ROUTES SERVICES: Gestão de serviços configuráveis
// ===============================================

const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// ===============================================
// LISTAR SERVIÇOS
// ===============================================

router.get('/', authenticateToken, async (req, res) => {
    try {
        // Buscar company_id do user_profiles
        const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('company_id, role')
        .eq('user_id', req.user.id)
        .single();

        if (!userProfile || !userProfile.company_id) {
        return res.status(400).json({
            success: false,
            error: 'Usuário não está associado a nenhuma empresa'
        });
        }

const companyId = userProfile.company_id;
        const { active_only } = req.query;

        let query = supabase
            .from('services')
            .select('*')
            .eq('company_id', companyId)
            .order('sort_order', { ascending: true });

        if (active_only === 'true') {
            query = query.eq('is_active', true);
        }

        const { data: services, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            services: services || []
        });

    } catch (error) {
        console.error('❌ Erro ao listar serviços:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao listar serviços'
        });
    }
});

// ===============================================
// BUSCAR SERVIÇO POR ID
// ===============================================

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        // Buscar company_id do user_profiles
        const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('company_id, role')
        .eq('user_id', req.user.id)
        .single();

        if (!userProfile || !userProfile.company_id) {
        return res.status(400).json({
            success: false,
            error: 'Usuário não está associado a nenhuma empresa'
        });
        }

const companyId = userProfile.company_id;

        const { data: service, error } = await supabase
            .from('services')
            .select('*')
            .eq('id', id)
            .eq('company_id', companyId)
            .single();

        if (error) throw error;

        if (!service) {
            return res.status(404).json({
                success: false,
                error: 'Serviço não encontrado'
            });
        }

        res.json({
            success: true,
            service: service
        });

    } catch (error) {
        console.error('❌ Erro ao buscar serviço:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar serviço'
        });
    }
});

// ===============================================
// CRIAR SERVIÇO
// ===============================================

router.post('/', authenticateToken, async (req, res) => {
    try {
        // Buscar company_id do user_profiles
        const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('company_id, role')
        .eq('user_id', req.user.id)
        .single();

        if (!userProfile || !userProfile.company_id) {
        return res.status(400).json({
            success: false,
            error: 'Usuário não está associado a nenhuma empresa'
        });
        }

const companyId = userProfile.company_id;
        const {
            name,
            description,
            duration_minutes = 60,
            price,
            buffer_minutes = 15,
            available_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            available_hours = { start: '09:00', end: '17:00' },
            max_advance_days = 30,
            min_advance_hours = 2,
            requires_confirmation = true,
            allow_online_booking = true,
            is_active = true,
            sort_order = 0
        } = req.body;

        // Validações
        if (!name || !duration_minutes) {
            return res.status(400).json({
                success: false,
                error: 'Nome e duração são obrigatórios'
            });
        }

        if (duration_minutes < 15 || duration_minutes > 480) {
            return res.status(400).json({
                success: false,
                error: 'Duração deve estar entre 15 e 480 minutos'
            });
        }

        const { data: service, error } = await supabase
            .from('services')
            .insert({
                company_id: companyId,
                name: name.trim(),
                description: description?.trim(),
                duration_minutes,
                price: price ? parseFloat(price) : null,
                buffer_minutes,
                available_days,
                available_hours,
                max_advance_days,
                min_advance_hours,
                requires_confirmation,
                allow_online_booking,
                is_active,
                sort_order
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            service: service
        });

    } catch (error) {
        console.error('❌ Erro ao criar serviço:', error);
        
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                error: 'Já existe um serviço com este nome'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Erro ao criar serviço'
        });
    }
});

// ===============================================
// ATUALIZAR SERVIÇO
// ===============================================

router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
                // Buscar company_id do user_profiles
        const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('company_id, role')
        .eq('user_id', req.user.id)
        .single();

        if (!userProfile || !userProfile.company_id) {
        return res.status(400).json({
            success: false,
            error: 'Usuário não está associado a nenhuma empresa'
        });
        }

const companyId = userProfile.company_id;
        const updateData = req.body;

        // Verificar se o serviço existe e pertence à empresa
        const { data: existingService } = await supabase
            .from('services')
            .select('*')
            .eq('id', id)
            .eq('company_id', companyId)
            .single();

        if (!existingService) {
            return res.status(404).json({
                success: false,
                error: 'Serviço não encontrado'
            });
        }

        // Validar dados se fornecidos
        if (updateData.duration_minutes && (updateData.duration_minutes < 15 || updateData.duration_minutes > 480)) {
            return res.status(400).json({
                success: false,
                error: 'Duração deve estar entre 15 e 480 minutos'
            });
        }

        // Limpar campos de texto
        if (updateData.name) updateData.name = updateData.name.trim();
        if (updateData.description) updateData.description = updateData.description.trim();
        if (updateData.price) updateData.price = parseFloat(updateData.price);

        const { data: service, error } = await supabase
            .from('services')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('company_id', companyId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            service: service
        });

    } catch (error) {
        console.error('❌ Erro ao atualizar serviço:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar serviço'
        });
    }
});

// ===============================================
// DELETAR SERVIÇO
// ===============================================

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
                // Buscar company_id do user_profiles
        const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('company_id, role')
        .eq('user_id', req.user.id)
        .single();

        if (!userProfile || !userProfile.company_id) {
        return res.status(400).json({
            success: false,
            error: 'Usuário não está associado a nenhuma empresa'
        });
        }

const companyId = userProfile.company_id;

        // Verificar se há agendamentos futuros para este serviço
        const { data: futureAppointments } = await supabase
            .from('appointments')
            .select('id')
            .eq('service_id', id)
            .gte('scheduled_at', new Date().toISOString())
            .in('status', ['confirmed', 'pending']);

        if (futureAppointments && futureAppointments.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Não é possível deletar serviço com agendamentos futuros. Cancele-os primeiro ou desative o serviço.'
            });
        }

        const { error } = await supabase
            .from('services')
            .delete()
            .eq('id', id)
            .eq('company_id', companyId);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Serviço deletado com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro ao deletar serviço:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao deletar serviço'
        });
    }
});

// ===============================================
// REORDENAR SERVIÇOS
// ===============================================

router.post('/reorder', authenticateToken, async (req, res) => {
    try {
        // Buscar company_id do user_profiles
        const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('company_id, role')
        .eq('user_id', req.user.id)
        .single();

        if (!userProfile || !userProfile.company_id) {
        return res.status(400).json({
            success: false,
            error: 'Usuário não está associado a nenhuma empresa'
        });
        }

const companyId = userProfile.company_id;
        const { service_orders } = req.body; // Array de {id, sort_order}

        if (!Array.isArray(service_orders)) {
            return res.status(400).json({
                success: false,
                error: 'service_orders deve ser um array'
            });
        }

        // Atualizar ordem de cada serviço
        const updatePromises = service_orders.map(({ id, sort_order }) =>
            supabase
                .from('services')
                .update({ sort_order })
                .eq('id', id)
                .eq('company_id', companyId)
        );

        await Promise.all(updatePromises);

        res.json({
            success: true,
            message: 'Ordem dos serviços atualizada'
        });

    } catch (error) {
        console.error('❌ Erro ao reordenar serviços:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao reordenar serviços'
        });
    }
});

module.exports = router;