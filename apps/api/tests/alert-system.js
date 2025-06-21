const axios = require('axios');

class AlertSystem {
    constructor() {
        this.alerts = [];
        this.thresholds = {
            responseTime: 5000, // 5 segundos
            errorRate: 10, // 10%
            memoryUsage: 80, // 80%
            cpuUsage: 80, // 80%
            consecutiveErrors: 3
        };
        this.consecutiveErrors = 0;
        this.lastCheck = Date.now();
    }

    async checkSystemHealth() {
        try {
            const startTime = Date.now();
            const response = await axios.get('http://localhost:3001/health', {
                timeout: 10000
            });
            const responseTime = Date.now() - startTime;

            // Reset contador de erros consecutivos
            this.consecutiveErrors = 0;

            // Verificar thresholds
            await this.checkThresholds(response.data, responseTime);

        } catch (error) {
            this.consecutiveErrors++;
            
            if (this.consecutiveErrors >= this.thresholds.consecutiveErrors) {
                await this.sendAlert('CRITICAL', 'Sistema Indisponível', {
                    error: error.message,
                    consecutiveErrors: this.consecutiveErrors,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    async checkThresholds(healthData, responseTime) {
        const alerts = [];

        // Verificar tempo de resposta
        if (responseTime > this.thresholds.responseTime) {
            alerts.push({
                level: 'WARNING',
                type: 'Performance',
                message: `Tempo de resposta alto: ${responseTime}ms`,
                threshold: this.thresholds.responseTime,
                current: responseTime
            });
        }

        // Verificar uso de memória
        if (healthData.memory && healthData.memory.used) {
            const memoryUsed = parseInt(healthData.memory.used.replace('MB', ''));
            const memoryTotal = parseInt(healthData.memory.total.replace('MB', ''));
            const memoryPercentage = (memoryUsed / memoryTotal) * 100;

            if (memoryPercentage > this.thresholds.memoryUsage) {
                alerts.push({
                    level: 'WARNING',
                    type: 'Memory',
                    message: `Uso alto de memória: ${memoryPercentage.toFixed(1)}%`,
                    threshold: this.thresholds.memoryUsage,
                    current: memoryPercentage
                });
            }
        }

        // Verificar conexões
        if (healthData.connections?.supabase?.status !== 'connected') {
            alerts.push({
                level: 'CRITICAL',
                type: 'Database',
                message: 'Conexão Supabase perdida',
                details: healthData.connections.supabase
            });
        }

        // Enviar alertas se necessário
        for (const alert of alerts) {
            await this.sendAlert(alert.level, alert.message, alert);
        }
    }

    async sendAlert(level, message, details = {}) {
        const alert = {
            id: `alert-${Date.now()}`,
            level,
            message,
            details,
            timestamp: new Date().toISOString(),
            resolved: false
        };

        this.alerts.push(alert);

        // Log no console
        const icon = level === 'CRITICAL' ? '🚨' : level === 'WARNING' ? '⚠️' : 'ℹ️';
        console.log(`${icon} ALERTA ${level}: ${message}`);
        console.log(`   Detalhes:`, JSON.stringify(details, null, 2));

        // Aqui você pode integrar com Slack, email, etc.
        await this.notifyExternal(alert);

        return alert;
    }

    async notifyExternal(alert) {
        try {
            // Exemplo de notificação via webhook (pode ser Slack, Discord, etc.)
            const webhookUrl = process.env.ALERT_WEBHOOK_URL;
            
            if (webhookUrl) {
                await axios.post(webhookUrl, {
                    text: `🚨 CRM Alert: ${alert.message}`,
                    level: alert.level,
                    timestamp: alert.timestamp,
                    details: alert.details
                });
            }

            // Exemplo de log para arquivo
            const logEntry = `[${alert.timestamp}] ${alert.level}: ${alert.message}\n`;
            // fs.appendFileSync('logs/alerts.log', logEntry);

        } catch (error) {
            console.error('Erro ao enviar notificação externa:', error.message);
        }
    }

    getRecentAlerts(hours = 24) {
        const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
        return this.alerts.filter(alert => 
            new Date(alert.timestamp).getTime() > cutoffTime
        );
    }

    getAlertsSummary() {
        const recent = this.getRecentAlerts();
        const summary = {
            total: recent.length,
            critical: recent.filter(a => a.level === 'CRITICAL').length,
            warning: recent.filter(a => a.level === 'WARNING').length,
            info: recent.filter(a => a.level === 'INFO').length,
            unresolved: recent.filter(a => !a.resolved).length
        };

        return summary;
    }

    resolveAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
            alert.resolvedAt = new Date().toISOString();
            console.log(`✅ Alerta resolvido: ${alert.message}`);
        }
        return alert;
    }
}

module.exports = AlertSystem;