const express = require('express');
const router = express.Router();
const NotificationSystem = require('../services/notification-system');

const notificationSystem = new NotificationSystem();

// 🧪 Rota de teste (usar o método existente)
router.get('/test', async (req, res) => {
    try {
        const result = await notificationSystem.testNotifications();
        res.json({
            success: true,
            results: result,
            message: 'Teste de notificações executado',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📊 Status geral (usar método existente)
router.get('/status', async (req, res) => {
    try {
        const status = notificationSystem.getStatus();
        res.json({
            status: 'active',
            configuration: status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📅 Status específico de appointments (NOVO)
router.get('/appointment-status', async (req, res) => {
    try {
        const result = await notificationSystem.getAppointmentNotificationStatus();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📧 Enviar confirmação manual (NOVO)
router.post('/send-confirmation', async (req, res) => {
    try {
        const { appointmentId } = req.body;
        
        if (!appointmentId) {
            return res.status(400).json({ error: 'appointmentId é obrigatório' });
        }

        const result = await notificationSystem.sendAppointmentConfirmation(appointmentId);
        
        res.json({
            success: result,
            message: result ? 'Confirmação enviada com sucesso' : 'Erro ao enviar confirmação'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ⏰ Enviar lembrete manual (NOVO)
router.post('/send-reminder', async (req, res) => {
    try {
        const { appointmentId, reminderType = '24h' } = req.body;
        
        if (!appointmentId) {
            return res.status(400).json({ error: 'appointmentId é obrigatório' });
        }

        const result = await notificationSystem.sendAppointmentReminder(appointmentId, reminderType);
        
        res.json({
            success: result,
            message: result ? `Lembrete ${reminderType} enviado com sucesso` : 'Erro ao enviar lembrete'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🤖 Processar lembretes automáticos (NOVO)
router.post('/process-automatic', async (req, res) => {
    try {
        const result = await notificationSystem.processAutomaticReminders();
        res.json({
            success: true,
            message: 'Processamento automático concluído',
            data: result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🚨 Enviar alerta de sistema (usar método existente)
router.post('/system-alert', async (req, res) => {
    try {
        const { message, level = 'info', recipients = [] } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Mensagem é obrigatória' });
        }

        // Usar método existente do sistema
        const alert = {
            id: `alert-${Date.now()}`,
            level: level.toUpperCase(),
            message,
            details: req.body.details || {},
            timestamp: new Date().toISOString(),
            resolved: false
        };

        let result;
        if (level.toUpperCase() === 'CRITICAL') {
            result = await notificationSystem.sendCriticalAlert(alert);
        } else {
            result = await notificationSystem.sendWarningAlert(alert);
        }
        
        res.json({
            success: !!result,
            message: result ? 'Alerta enviado com sucesso' : 'Erro ao enviar alerta'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;