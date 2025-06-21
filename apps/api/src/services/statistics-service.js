const { createClient } = require('@supabase/supabase-js');

class StatisticsService {
    constructor() {
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
    }

    // 🏠 DASHBOARD GERAL - Visão resumida
    async getDashboardOverview() {
        try {
            const cacheKey = 'dashboard_overview';
            if (this.isValidCache(cacheKey)) {
                return this.cache.get(cacheKey).data;
            }

            // Usar view existente se disponível
            const { data: summary } = await this.supabase
                .from('admin_dashboard_summary')
                .select('*')
                .single();

            // Se view não existir, calcular manualmente
            if (!summary) {
                const overview = await this.calculateDashboardOverview();
                this.setCache(cacheKey, overview);
                return overview;
            }

            this.setCache(cacheKey, summary);
            return summary;

        } catch (error) {
            console.error('Erro ao buscar overview:', error);
            return this.getDefaultOverview();
        }
    }

    async calculateDashboardOverview() {
        const promises = [
            this.getTotalUsers(),
            this.getTotalConversations(),
            this.getTotalMessages(),
            this.getTotalAppointments(),
            this.getAICosts(),
            this.getActiveSubscriptions()
        ];

        const [
            totalUsers,
            totalConversations, 
            totalMessages,
            totalAppointments,
            aiCosts,
            activeSubscriptions
        ] = await Promise.all(promises);

        return {
            users_total: totalUsers,
            conversations_total: totalConversations,
            messages_total: totalMessages,
            appointments_total: totalAppointments,
            ai_cost_month_usd: aiCosts.monthlyTotal,
            active_subscriptions: activeSubscriptions,
            timestamp: new Date().toISOString()
        };
    }

    // 👥 ESTATÍSTICAS DE USUÁRIOS
    async getUserStatistics(period = '30d') {
        try {
            const { startDate, endDate } = this.getPeriodDates(period);
            
            const [
                totalUsers,
                newUsers,
                activeUsers,
                usersByPlan,
                topUsers
            ] = await Promise.all([
                this.getTotalUsers(),
                this.getNewUsers(startDate, endDate),
                this.getActiveUsers(startDate, endDate),
                this.getUsersByPlan(),
                this.getTopUsers(startDate, endDate)
            ]);

            return {
                period,
                totalUsers,
                newUsers,
                activeUsers,
                growth: newUsers > 0 ? ((newUsers / (totalUsers - newUsers)) * 100).toFixed(1) : 0,
                usersByPlan,
                topUsers,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Erro ao buscar estatísticas de usuários:', error);
            throw error;
        }
    }

    // 🤖 ESTATÍSTICAS DE IA
    async getAIStatistics(period = '30d') {
        try {
            const { startDate, endDate } = this.getPeriodDates(period);

            const { data: aiData } = await this.supabase
                .from('ai_interactions')
                .select('ai_provider, ai_model, tokens, cost, created_at')
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            if (!aiData) return this.getDefaultAIStats();

            const stats = {
                period,
                totalInteractions: aiData.length,
                totalTokens: aiData.reduce((sum, item) => sum + (item.tokens || 0), 0),
                totalCost: aiData.reduce((sum, item) => sum + (item.cost || 0), 0),
                byProvider: {},
                byModel: {},
                costSavings: 0,
                timestamp: new Date().toISOString()
            };

            // Agrupar por provedor (OpenAI vs DeepSeek)
            aiData.forEach(item => {
                const provider = item.ai_provider || 'unknown';
                const model = item.ai_model || 'unknown';
                const tokens = item.tokens || 0;
                const cost = item.cost || 0;

                // Por provedor
                if (!stats.byProvider[provider]) {
                    stats.byProvider[provider] = { interactions: 0, tokens: 0, cost: 0 };
                }
                stats.byProvider[provider].interactions++;
                stats.byProvider[provider].tokens += tokens;
                stats.byProvider[provider].cost += cost;

                // Por modelo
                if (!stats.byModel[model]) {
                    stats.byModel[model] = { interactions: 0, tokens: 0, cost: 0 };
                }
                stats.byModel[model].interactions++;
                stats.byModel[model].tokens += tokens;
                stats.byModel[model].cost += cost;
            });

            // Calcular economia (assumindo que DeepSeek é mais barato)
            const openAICost = stats.byProvider['openai']?.cost || 0;
            const deepSeekCost = stats.byProvider['deepseek']?.cost || 0;
            if (deepSeekCost > 0 && openAICost > 0) {
                stats.costSavings = ((openAICost - deepSeekCost) / openAICost * 100).toFixed(1);
            }

            return stats;

        } catch (error) {
            console.error('Erro ao buscar estatísticas de IA:', error);
            return this.getDefaultAIStats();
        }
    }

    // 💬 ESTATÍSTICAS DE CONVERSAS
    async getConversationStatistics(period = '30d') {
        try {
            const { startDate, endDate } = this.getPeriodDates(period);

            const [conversationsData, messagesData] = await Promise.all([
                this.supabase
                    .from('conversations')
                    .select('id, status, ai_enabled, total_messages, created_at')
                    .gte('created_at', startDate)
                    .lte('created_at', endDate),
                this.supabase
                    .from('messages')
                    .select('id, conversation_id, sender_type, intention, emotion, is_automated, created_at')
                    .gte('created_at', startDate)
                    .lte('created_at', endDate)
            ]);

            const conversations = conversationsData.data || [];
            const messages = messagesData.data || [];

            const stats = {
                period,
                totalConversations: conversations.length,
                totalMessages: messages.length,
                avgMessagesPerConversation: conversations.length > 0 ? 
                    (messages.length / conversations.length).toFixed(1) : 0,
                conversationsWithAI: conversations.filter(c => c.ai_enabled).length,
                automatedMessages: messages.filter(m => m.is_automated).length,
                topIntentions: this.getTopIntentions(messages),
                emotionDistribution: this.getEmotionDistribution(messages),
                timestamp: new Date().toISOString()
            };

            return stats;

        } catch (error) {
            console.error('Erro ao buscar estatísticas de conversas:', error);
            throw error;
        }
    }

    // 📅 ESTATÍSTICAS DE AGENDAMENTO
    async getAppointmentStatistics(period = '30d') {
        try {
            const { startDate, endDate } = this.getPeriodDates(period);

            const { data: appointments } = await this.supabase
                .from('appointments')
                .select(`
                    id, status, scheduled_at, duration_minutes, created_at,
                    services(name),
                    users(business_name)
                `)
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            if (!appointments) return this.getDefaultAppointmentStats();

            const stats = {
                period,
                totalAppointments: appointments.length,
                confirmedAppointments: appointments.filter(a => a.status === 'confirmed').length,
                cancelledAppointments: appointments.filter(a => a.status === 'cancelled').length,
                completedAppointments: appointments.filter(a => a.status === 'completed').length,
                avgDuration: this.calculateAvgDuration(appointments),
                topServices: this.getTopServices(appointments),
                appointmentsByHour: this.getAppointmentsByHour(appointments),
                timestamp: new Date().toISOString()
            };

            stats.conversionRate = stats.totalAppointments > 0 ? 
                ((stats.confirmedAppointments / stats.totalAppointments) * 100).toFixed(1) : 0;

            return stats;

        } catch (error) {
            console.error('Erro ao buscar estatísticas de agendamento:', error);
            return this.getDefaultAppointmentStats();
        }
    }

    // 💰 ESTATÍSTICAS FINANCEIRAS
    async getFinancialStatistics(period = '30d') {
        try {
            const { startDate, endDate } = this.getPeriodDates(period);

            const [subscriptionsData, costsData, billingData] = await Promise.all([
                this.supabase
                    .from('subscriptions')
                    .select('plan_id, status, created_at, subscription_plans(price)')
                    .gte('created_at', startDate)
                    .lte('created_at', endDate),
                this.supabase
                    .from('cost_tracking')
                    .select('cost_usd, cost_type, created_at')
                    .gte('created_at', startDate)
                    .lte('created_at', endDate),
                this.supabase
                    .from('billing_cycles')
                    .select('amount_brl, status, created_at')
                    .gte('created_at', startDate)
                    .lte('created_at', endDate)
            ]);

            const subscriptions = subscriptionsData.data || [];
            const costs = costsData.data || [];
            const billing = billingData.data || [];

            const totalRevenue = billing
                .filter(b => b.status === 'paid')
                .reduce((sum, b) => sum + (b.amount_brl || 0), 0);

            const totalCosts = costs
                .reduce((sum, c) => sum + (c.cost_usd || 0), 0);

            const stats = {
                period,
                totalRevenue: totalRevenue.toFixed(2),
                totalCosts: totalCosts.toFixed(2),
                profit: (totalRevenue - totalCosts * 5.5).toFixed(2), // Aproximação USD->BRL
                activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
                newSubscriptions: subscriptions.length,
                avgRevenuePerUser: subscriptions.length > 0 ? 
                    (totalRevenue / subscriptions.length).toFixed(2) : 0,
                timestamp: new Date().toISOString()
            };

            return stats;

        } catch (error) {
            console.error('Erro ao buscar estatísticas financeiras:', error);
            return this.getDefaultFinancialStats();
        }
    }

    // 📈 MÉTRICAS DE CRESCIMENTO
    async getGrowthMetrics(period = '30d') {
        try {
            const currentPeriod = this.getPeriodDates(period);
            const previousPeriod = this.getPreviousPeriodDates(period);

            const [currentStats, previousStats] = await Promise.all([
                this.getBasicMetrics(currentPeriod.startDate, currentPeriod.endDate),
                this.getBasicMetrics(previousPeriod.startDate, previousPeriod.endDate)
            ]);

            const growth = {
                period,
                users: this.calculateGrowth(previousStats.users, currentStats.users),
                conversations: this.calculateGrowth(previousStats.conversations, currentStats.conversations),
                messages: this.calculateGrowth(previousStats.messages, currentStats.messages),
                appointments: this.calculateGrowth(previousStats.appointments, currentStats.appointments),
                revenue: this.calculateGrowth(previousStats.revenue, currentStats.revenue),
                timestamp: new Date().toISOString()
            };

            return growth;

        } catch (error) {
            console.error('Erro ao calcular métricas de crescimento:', error);
            throw error;
        }
    }

    // 🛠️ MÉTODOS AUXILIARES
    async getTotalUsers() {
        const { count } = await this.supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        return count || 0;
    }

    async getTotalConversations() {
        const { count } = await this.supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true });
        return count || 0;
    }

    async getTotalMessages() {
        const { count } = await this.supabase
            .from('messages')
            .select('*', { count: 'exact', head: true });
        return count || 0;
    }

    async getTotalAppointments() {
        const { count } = await this.supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true });
        return count || 0;
    }

    async getAICosts() {
        const { data } = await this.supabase
            .from('ai_interactions')
            .select('cost')
            .gte('created_at', this.getStartOfMonth());

        const monthlyTotal = data?.reduce((sum, item) => sum + (item.cost || 0), 0) || 0;
        return { monthlyTotal };
    }

    async getActiveSubscriptions() {
        const { count } = await this.supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
        return count || 0;
    }

    getPeriodDates(period) {
        const endDate = new Date();
        const startDate = new Date();

        switch (period) {
            case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(endDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(endDate.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(endDate.getDate() - 30);
        }

        return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        };
    }

    getPreviousPeriodDates(period) {
        const currentPeriod = this.getPeriodDates(period);
        const periodLength = new Date(currentPeriod.endDate) - new Date(currentPeriod.startDate);
        
        const endDate = new Date(currentPeriod.startDate);
        const startDate = new Date(endDate.getTime() - periodLength);

        return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        };
    }

    calculateGrowth(previous, current) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return (((current - previous) / previous) * 100).toFixed(1);
    }

    // Cache management
    isValidCache(key) {
        const cached = this.cache.get(key);
        return cached && (Date.now() - cached.timestamp) < this.cacheExpiry;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    // Default responses para quando não há dados
    getDefaultOverview() {
        return {
            users_total: 0,
            conversations_total: 0,
            messages_total: 0,
            appointments_total: 0,
            ai_cost_month_usd: 0,
            active_subscriptions: 0,
            timestamp: new Date().toISOString()
        };
    }

    getDefaultAIStats() {
        return {
            period: '30d',
            totalInteractions: 0,
            totalTokens: 0,
            totalCost: 0,
            byProvider: {},
            byModel: {},
            costSavings: 0,
            timestamp: new Date().toISOString()
        };
    }

    getDefaultAppointmentStats() {
        return {
            period: '30d',
            totalAppointments: 0,
            confirmedAppointments: 0,
            cancelledAppointments: 0,
            completedAppointments: 0,
            conversionRate: 0,
            avgDuration: 0,
            topServices: [],
            appointmentsByHour: {},
            timestamp: new Date().toISOString()
        };
    }

    getDefaultFinancialStats() {
        return {
            period: '30d',
            totalRevenue: '0.00',
            totalCosts: '0.00',
            profit: '0.00',
            activeSubscriptions: 0,
            newSubscriptions: 0,
            avgRevenuePerUser: '0.00',
            timestamp: new Date().toISOString()
        };
    }
    // 🛠️ MÉTODOS AUXILIARES FALTANTES
    async getNewUsers(startDate, endDate) {
        try {
            const { count } = await this.supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', startDate)
                .lte('created_at', endDate);
            return count || 0;
        } catch (error) {
            console.error('Erro ao buscar novos usuários:', error);
            return 0;
        }
    }

    async getActiveUsers(startDate, endDate) {
        try {
            // Usuários que tiveram conversas no período
            const { data } = await this.supabase
                .from('conversations')
                .select('user_id')
                .gte('created_at', startDate)
                .lte('created_at', endDate);
            
            const uniqueUsers = [...new Set(data?.map(c => c.user_id) || [])];
            return uniqueUsers.length;
        } catch (error) {
            console.error('Erro ao buscar usuários ativos:', error);
            return 0;
        }
    }

    async getUsersByPlan() {
        try {
            const { data } = await this.supabase
                .from('users')
                .select('plan');
            
            const planCounts = {};
            data?.forEach(user => {
                const plan = user.plan || 'free';
                planCounts[plan] = (planCounts[plan] || 0) + 1;
            });
            
            return planCounts;
        } catch (error) {
            console.error('Erro ao buscar usuários por plano:', error);
            return {};
        }
    }

    async getTopUsers(startDate, endDate) {
        try {
            const { data } = await this.supabase
                .from('ai_interactions')
                .select('user_id, cost')
                .gte('created_at', startDate)
                .lte('created_at', endDate);
            
            const userCosts = {};
            data?.forEach(interaction => {
                const userId = interaction.user_id;
                if (userId) {
                    userCosts[userId] = (userCosts[userId] || 0) + (interaction.cost || 0);
                }
            });
            
            // Ordenar por custo e pegar top 5
            const topUsers = Object.entries(userCosts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([userId, cost]) => ({ userId, cost }));
            
            return topUsers;
        } catch (error) {
            console.error('Erro ao buscar top usuários:', error);
            return [];
        }
    }

    async getBasicMetrics(startDate, endDate) {
        try {
            const [users, conversations, messages, appointments, revenue] = await Promise.all([
                this.getNewUsers(startDate, endDate),
                this.supabase.from('conversations').select('*', { count: 'exact', head: true })
                    .gte('created_at', startDate).lte('created_at', endDate),
                this.supabase.from('messages').select('*', { count: 'exact', head: true })
                    .gte('created_at', startDate).lte('created_at', endDate),
                this.supabase.from('appointments').select('*', { count: 'exact', head: true })
                    .gte('created_at', startDate).lte('created_at', endDate),
                this.supabase.from('billing_cycles').select('amount_brl')
                    .eq('status', 'paid')
                    .gte('created_at', startDate).lte('created_at', endDate)
            ]);

            const totalRevenue = revenue.data?.reduce((sum, b) => sum + (b.amount_brl || 0), 0) || 0;

            return {
                users,
                conversations: conversations.count || 0,
                messages: messages.count || 0,
                appointments: appointments.count || 0,
                revenue: totalRevenue
            };
        } catch (error) {
            console.error('Erro ao buscar métricas básicas:', error);
            return { users: 0, conversations: 0, messages: 0, appointments: 0, revenue: 0 };
        }
    }

    getTopIntentions(messages) {
        const intentions = {};
        messages.forEach(msg => {
            if (msg.intention) {
                intentions[msg.intention] = (intentions[msg.intention] || 0) + 1;
            }
        });
        
        return Object.entries(intentions)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([intention, count]) => ({ intention, count }));
    }

    getEmotionDistribution(messages) {
        const emotions = {};
        messages.forEach(msg => {
            if (msg.emotion) {
                emotions[msg.emotion] = (emotions[msg.emotion] || 0) + 1;
            }
        });
        return emotions;
    }

    calculateAvgDuration(appointments) {
        if (!appointments.length) return 0;
        const total = appointments.reduce((sum, apt) => sum + (apt.duration_minutes || 0), 0);
        return Math.round(total / appointments.length);
    }

    getTopServices(appointments) {
        const services = {};
        appointments.forEach(apt => {
            const serviceName = apt.services?.name || 'Sem serviço';
            services[serviceName] = (services[serviceName] || 0) + 1;
        });
        
        return Object.entries(services)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([service, count]) => ({ service, count }));
    }

    getAppointmentsByHour(appointments) {
        const hours = {};
        appointments.forEach(apt => {
            if (apt.scheduled_at) {
                const hour = new Date(apt.scheduled_at).getHours();
                hours[hour] = (hours[hour] || 0) + 1;
            }
        });
        return hours;
    }

    getStartOfMonth() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }
}

module.exports = StatisticsService;