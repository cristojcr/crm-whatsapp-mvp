// ===============================================
// ROUTES APPOINTMENTS: API completa de agendamentos
// ===============================================

const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const scheduleManager = require('../services/schedule-manager');
const appointmentProcessor = require('../services/appointment-processor');

// ===============================================
// LISTAR AGENDAMENTOS
// ===============================================

router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, date_from, date_to, service_id } = req.query;
        const userId = req.user.id;

        let query = supabase
            .from('appointments')
            .select(`
                *,
                contacts(name, phone),
                services(name, duration_minutes)
            `)
            .eq('user_id', userId)
            .order('scheduled_at', { ascending: true });

        // Filtros opcionais
        if (status) {
            query = query.eq('status', status);
        }

        if (date_from) {
            query = query.gte('scheduled_at', date_from);
        }

        if (date_to) {
            query = query.lte('scheduled_at', date_to);
        }

        if (service_id) {
            query = query.eq('service_id', service_id);
        }

        const { data: appointments, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            appointments: appointments || [],
            total: appointments?.length || 0
        });

    } catch (error) {
        console.error('❌ Erro ao listar agendamentos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao listar agendamentos'
        });
    }
});

// ===============================================
// BUSCAR DISPONIBILIDADE
// ===============================================

router.get('/availability', authenticateToken, async (req, res) => {
    try {
        const { service_id, date } = req.query;
        const companyId = req.user.id;

        if (!service_id || !date) {
            return res.status(400).json({
                success: false,
                error: 'service_id e date são obrigatórios'
            });
        }

        const result = await scheduleManager.getAvailableSlots(companyId, service_id, date);

        res.json(result);

    } catch (error) {
        console.error('❌ Erro ao buscar disponibilidade:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar disponibilidade'
        });
    }
});

// ===============================================
// CRIAR AGENDAMENTO
// ===============================================

router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            contact_id,
            service_id,
            scheduled_at,
            duration_minutes,
            title,
            description,
            customer_notes,
            price
        } = req.body;

        // Validações básicas
        if (!contact_id || !service_id || !scheduled_at) {
            return res.status(400).json({
                success: false,
                error: 'contact_id, service_id e scheduled_at são obrigatórios'
            });
        }

        const appointmentData = {
            user_id: userId,
            contact_id,
            service_id,
            scheduled_at,
            duration_minutes,
            title,
            description,
            customer_notes,
            price,
            status: 'confirmed',
            created_via: 'api'
        };

        const result = await scheduleManager.bookAppointment(appointmentData);

        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }

    } catch (error) {
        console.error('❌ Erro ao criar agendamento:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao criar agendamento'
        });
    }
});

// ===============================================
// ATUALIZAR AGENDAMENTO
// ===============================================

router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const updateData = req.body;

        // Verificar se o agendamento pertence ao usuário
        const { data: appointment } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Agendamento não encontrado'
            });
        }

        // Se está mudando data/hora, usar o scheduleManager
        if (updateData.scheduled_at && updateData.scheduled_at !== appointment.scheduled_at) {
            const result = await scheduleManager.rescheduleAppointment(
                id,
                updateData.scheduled_at,
                updateData.service_id || appointment.service_id
            );
            
            return res.json(result);
        }

        // Atualização simples
        const { data: updatedAppointment, error } = await supabase
            .from('appointments')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            appointment: updatedAppointment
        });

    } catch (error) {
        console.error('❌ Erro ao atualizar agendamento:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar agendamento'
        });
    }
});

// ===============================================
// CANCELAR AGENDAMENTO
// ===============================================

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { reason } = req.body;

        // Verificar se o agendamento pertence ao usuário
        const { data: appointment } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Agendamento não encontrado'
            });
        }

        const result = await scheduleManager.cancelAppointment(id, reason);

        res.json(result);

    } catch (error) {
        console.error('❌ Erro ao cancelar agendamento:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao cancelar agendamento'
        });
    }
});

// ===============================================
// PROCESSAR MENSAGEM DE AGENDAMENTO (WEBHOOK)
// ===============================================

router.post('/process-message', authenticateToken, async (req, res) => {
    try {
        const messageData = {
            ...req.body,
            user_id: req.user.id  // ← ADICIONAR O USER_ID
        };

        console.log('📅 Processando mensagem de agendamento:', messageData);
        console.log('🔍 DEBUG ROUTES: req.user =', req.user);
        console.log('🔍 DEBUG ROUTES: user_id =', req.user.id);

        const result = await appointmentProcessor.processSchedulingMessage(messageData);

        res.json(result);

    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao processar mensagem'
        });
    }
});

// ===============================================
// MÉTRICAS DE AGENDAMENTO
// ===============================================

router.get('/metrics', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { date_from, date_to } = req.query;

        const startDate = date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = date_to || new Date().toISOString();

        // Buscar métricas básicas
        const { data: appointments } = await supabase
            .from('appointments')
            .select('*')
            .eq('user_id', userId)
            .gte('scheduled_at', startDate)
            .lte('scheduled_at', endDate);

        if (!appointments) {
            return res.json({
                success: true,
                metrics: {
                    total_appointments: 0,
                    completed: 0,
                    cancelled: 0,
                    no_shows: 0,
                    total_revenue: 0,
                    completion_rate: 0
                }
            });
        }

        // Calcular métricas
        const metrics = {
            total_appointments: appointments.length,
            completed: appointments.filter(apt => apt.status === 'completed').length,
            cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
            no_shows: appointments.filter(apt => apt.status === 'no_show').length,
            pending: appointments.filter(apt => apt.status === 'pending').length,
            confirmed: appointments.filter(apt => apt.status === 'confirmed').length,
            total_revenue: appointments
                .filter(apt => apt.status === 'completed')
                .reduce((sum, apt) => sum + (parseFloat(apt.price) || 0), 0),
            completion_rate: appointments.length > 0 
                ? (appointments.filter(apt => apt.status === 'completed').length / appointments.length * 100).toFixed(1)
                : 0
        };

        res.json({
            success: true,
            metrics: metrics,
            period: { from: startDate, to: endDate }
        });

    } catch (error) {
        console.error('❌ Erro ao buscar métricas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar métricas'
        });
    }
});

// GET /api/appointments/stats - Estatísticas reais de appointments
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Buscando estatísticas reais de appointments...');
    
    // Buscar company_id do usuário
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', req.user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Appointments deste mês
    const { data: thisMonthAppointments, error: thisMonthError } = await supabase
      .from('appointments')
      .select('id, created_at')
      .eq('company_id', profile.company_id)
      .gte('created_at', new Date(currentYear, currentMonth, 1).toISOString())
      .lt('created_at', new Date(currentYear, currentMonth + 1, 1).toISOString());

    if (thisMonthError) throw thisMonthError;

    // Appointments do mês passado
    const { data: lastMonthAppointments, error: lastMonthError } = await supabase
      .from('appointments')
      .select('id, created_at')
      .eq('company_id', profile.company_id)
      .gte('created_at', new Date(lastMonthYear, lastMonth, 1).toISOString())
      .lt('created_at', new Date(lastMonthYear, lastMonth + 1, 1).toISOString());

    if (lastMonthError) throw lastMonthError;

    const thisMonthTotal = thisMonthAppointments?.length || 0;
    const lastMonthTotal = lastMonthAppointments?.length || 0;

    // Calcular crescimento real
    let growthPercentage = 0;
    if (lastMonthTotal > 0) {
      growthPercentage = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
    } else if (thisMonthTotal > 0) {
      growthPercentage = 100;
    }

    console.log(`📊 Estatísticas reais: ${thisMonthTotal} appointments este mês, ${lastMonthTotal} mês passado`);

    res.json({
      total_this_month: thisMonthTotal,
      total_last_month: lastMonthTotal,
      growth_percentage: Math.round(growthPercentage * 100) / 100,
      company_id: profile.company_id
    });

  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas de appointments:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

module.exports = router;