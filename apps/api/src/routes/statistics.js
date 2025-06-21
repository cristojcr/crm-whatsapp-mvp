const express = require('express');
const router = express.Router();
const StatisticsService = require('../services/statistics-service');
const { authenticateToken } = require('../middleware/auth');

const statisticsService = new StatisticsService();

// 🏠 Dashboard Overview (dados principais)
router.get('/overview', async (req, res) => {
    try {
        const overview = await statisticsService.getDashboardOverview();
        res.json({
            success: true,
            data: overview,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro no overview:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar overview',
            message: error.message
        });
    }
});

// 👥 Estatísticas de usuários
router.get('/users', async (req, res) => {
    try {
        const period = req.query.period || '30d';
        const stats = await statisticsService.getUserStatistics(period);
        
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro nas estatísticas de usuários:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar estatísticas de usuários',
            message: error.message
        });
    }
});

// 🤖 Estatísticas de IA
router.get('/ai', async (req, res) => {
    try {
        const period = req.query.period || '30d';
        const stats = await statisticsService.getAIStatistics(period);
        
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro nas estatísticas de IA:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar estatísticas de IA',
            message: error.message
        });
    }
});

// 💬 Estatísticas de conversas
router.get('/conversations', async (req, res) => {
    try {
        const period = req.query.period || '30d';
        const stats = await statisticsService.getConversationStatistics(period);
        
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro nas estatísticas de conversas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar estatísticas de conversas',
            message: error.message
        });
    }
});

// 📅 Estatísticas de agendamento
router.get('/appointments', async (req, res) => {
    try {
        const period = req.query.period || '30d';
        const stats = await statisticsService.getAppointmentStatistics(period);
        
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro nas estatísticas de agendamento:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar estatísticas de agendamento',
            message: error.message
        });
    }
});

// 💰 Estatísticas financeiras
router.get('/financial', async (req, res) => {
    try {
        const period = req.query.period || '30d';
        const stats = await statisticsService.getFinancialStatistics(period);
        
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro nas estatísticas financeiras:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar estatísticas financeiras',
            message: error.message
        });
    }
});

// 📈 Métricas de crescimento
router.get('/growth', async (req, res) => {
    try {
        const period = req.query.period || '30d';
        const growth = await statisticsService.getGrowthMetrics(period);
        
        res.json({
            success: true,
            data: growth,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro nas métricas de crescimento:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar métricas de crescimento',
            message: error.message
        });
    }
});

// 📊 Estatísticas customizadas
router.post('/custom', async (req, res) => {
    try {
        const { metrics, period, filters } = req.body;
        
        if (!metrics || !Array.isArray(metrics)) {
            return res.status(400).json({
                success: false,
                error: 'Parâmetro metrics é obrigatório e deve ser um array'
            });
        }

        const customStats = {};
        
        for (const metric of metrics) {
            switch (metric) {
                case 'users':
                    customStats.users = await statisticsService.getUserStatistics(period);
                    break;
                case 'ai':
                    customStats.ai = await statisticsService.getAIStatistics(period);
                    break;
                case 'conversations':
                    customStats.conversations = await statisticsService.getConversationStatistics(period);
                    break;
                case 'appointments':
                    customStats.appointments = await statisticsService.getAppointmentStatistics(period);
                    break;
                case 'financial':
                    customStats.financial = await statisticsService.getFinancialStatistics(period);
                    break;
                case 'growth':
                    customStats.growth = await statisticsService.getGrowthMetrics(period);
                    break;
            }
        }
        
        res.json({
            success: true,
            data: customStats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro nas estatísticas customizadas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar estatísticas customizadas',
            message: error.message
        });
    }
});

// 📋 Listar métricas disponíveis
router.get('/available-metrics', (req, res) => {
    res.json({
        success: true,
        data: {
            metrics: [
                {
                    name: 'overview',
                    description: 'Visão geral do dashboard',
                    endpoint: '/api/statistics/overview'
                },
                {
                    name: 'users',
                    description: 'Estatísticas de usuários',
                    endpoint: '/api/statistics/users',
                    parameters: ['period']
                },
                {
                    name: 'ai',
                    description: 'Estatísticas de IA (tokens, custos, providers)',
                    endpoint: '/api/statistics/ai',
                    parameters: ['period']
                },
                {
                    name: 'conversations',
                    description: 'Estatísticas de conversas e mensagens',
                    endpoint: '/api/statistics/conversations',
                    parameters: ['period']
                },
                {
                    name: 'appointments',
                    description: 'Estatísticas de agendamento',
                    endpoint: '/api/statistics/appointments',
                    parameters: ['period']
                },
                {
                    name: 'financial',
                    description: 'Estatísticas financeiras e receita',
                    endpoint: '/api/statistics/financial',
                    parameters: ['period']
                },
                {
                    name: 'growth',
                    description: 'Métricas de crescimento comparativo',
                    endpoint: '/api/statistics/growth',
                    parameters: ['period']
                }
            ],
            periods: ['7d', '30d', '90d', '1y'],
            timestamp: new Date().toISOString()
        }
    });
});

module.exports = router;