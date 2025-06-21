const fs = require('fs').promises;
const path = require('path');

class ReportSystem {
    constructor() {
        this.reportData = {
            requests: [],
            errors: [],
            performance: [],
            alerts: []
        };
        this.startTime = Date.now();
    }

    logRequest(endpoint, method, responseTime, status) {
        this.reportData.requests.push({
            endpoint,
            method,
            responseTime,
            status,
            timestamp: new Date().toISOString()
        });

        // Manter apenas os últimos 1000 requests
        if (this.reportData.requests.length > 1000) {
            this.reportData.requests = this.reportData.requests.slice(-1000);
        }
    }

    logError(error, context = {}) {
        this.reportData.errors.push({
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        });

        // Manter apenas os últimos 100 erros
        if (this.reportData.errors.length > 100) {
            this.reportData.errors = this.reportData.errors.slice(-100);
        }
    }

    logPerformance(metric, value, unit = 'ms') {
        this.reportData.performance.push({
            metric,
            value,
            unit,
            timestamp: new Date().toISOString()
        });

        // Manter apenas as últimas 500 métricas
        if (this.reportData.performance.length > 500) {
            this.reportData.performance = this.reportData.performance.slice(-500);
        }
    }

    async generateDailyReport() {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const report = {
            period: {
                start: yesterday.toISOString(),
                end: now.toISOString(),
                duration: '24 hours'
            },
            summary: await this.generateSummary(yesterday),
            requests: await this.analyzeRequests(yesterday),
            errors: await this.analyzeErrors(yesterday),
            performance: await this.analyzePerformance(yesterday),
            alerts: this.reportData.alerts.filter(alert =>
                new Date(alert.timestamp) > yesterday
            ),
            recommendations: await this.generateRecommendations()
        };

        // Salvar relatório
        await this.saveReport(report, 'daily');
        return report;
    }

    async generateSummary(since) {
        const requests = this.reportData.requests.filter(r =>
            new Date(r.timestamp) > since
        );

        const errors = this.reportData.errors.filter(e =>
            new Date(e.timestamp) > since
        );

        const totalRequests = requests.length;
        const successfulRequests = requests.filter(r => r.status < 400).length;
        const avgResponseTime = requests.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests;

        return {
            totalRequests,
            successfulRequests,
            errorCount: errors.length,
            successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100,
            avgResponseTime: avgResponseTime || 0,
            uptime: this.calculateUptime(),
            memoryUsage: this.getCurrentMemoryUsage(),
            timestamp: new Date().toISOString()
        };
    }

    async analyzeRequests(since) {
        const requests = this.reportData.requests.filter(r =>
            new Date(r.timestamp) > since
        );

        const endpointStats = {};
        requests.forEach(req => {
            if (!endpointStats[req.endpoint]) {
                endpointStats[req.endpoint] = {
                    count: 0,
                    totalTime: 0,
                    errors: 0
                };
            }
            endpointStats[req.endpoint].count++;
            endpointStats[req.endpoint].totalTime += req.responseTime;
            if (req.status >= 400) {
                endpointStats[req.endpoint].errors++;
            }
        });

        // Calcular médias
        Object.keys(endpointStats).forEach(endpoint => {
            const stats = endpointStats[endpoint];
            stats.avgResponseTime = stats.totalTime / stats.count;
            stats.errorRate = (stats.errors / stats.count) * 100;
        });

        return {
            total: requests.length,
            byEndpoint: endpointStats,
            topEndpoints: Object.entries(endpointStats)
                .sort(([,a], [,b]) => b.count - a.count)
                .slice(0, 10),
            slowestEndpoints: Object.entries(endpointStats)
                .sort(([,a], [,b]) => b.avgResponseTime - a.avgResponseTime)
                .slice(0, 5)
        };
    }

    async analyzeErrors(since) {
        const errors = this.reportData.errors.filter(e =>
            new Date(e.timestamp) > since
        );

        const errorTypes = {};
        errors.forEach(err => {
            const type = err.message.split(':')[0] || 'Unknown';
            errorTypes[type] = (errorTypes[type] || 0) + 1;
        });

        return {
            total: errors.length,
            byType: errorTypes,
            recent: errors.slice(-10),
            trend: this.calculateErrorTrend(errors)
        };
    }

    async analyzePerformance(since) {
        const metrics = this.reportData.performance.filter(m =>
            new Date(m.timestamp) > since
        );

        const performanceStats = {};
        metrics.forEach(metric => {
            if (!performanceStats[metric.metric]) {
                performanceStats[metric.metric] = {
                    values: [],
                    unit: metric.unit
                };
            }
            performanceStats[metric.metric].values.push(metric.value);
        });

        // Calcular estatísticas
        Object.keys(performanceStats).forEach(metric => {
            const values = performanceStats[metric].values;
            performanceStats[metric].avg = values.reduce((a, b) => a + b, 0) / values.length;
            performanceStats[metric].min = Math.min(...values);
            performanceStats[metric].max = Math.max(...values);
            performanceStats[metric].count = values.length;
        });

        return performanceStats;
    }

    async generateRecommendations() {
        const recommendations = [];
        const summary = await this.generateSummary(new Date(Date.now() - 24 * 60 * 60 * 1000));

        // Recomendações baseadas em performance
        if (summary.avgResponseTime > 1000) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                title: 'Tempo de resposta alto',
                description: `Tempo médio de resposta: ${summary.avgResponseTime.toFixed(0)}ms`,
                action: 'Considere otimizar queries de banco e adicionar cache'
            });
        }

        // Recomendações baseadas em taxa de erro
        if (summary.successRate < 95) {
            recommendations.push({
                type: 'reliability',
                priority: 'critical',
                title: 'Taxa de sucesso baixa',
                description: `Taxa de sucesso: ${summary.successRate.toFixed(1)}%`,
                action: 'Investigar e corrigir erros recorrentes'
            });
        }

        // Recomendações baseadas em memória
        if (summary.memoryUsage > 80) {
            recommendations.push({
                type: 'memory',
                priority: 'medium',
                title: 'Uso alto de memória',
                description: `Uso atual: ${summary.memoryUsage.toFixed(1)}%`,
                action: 'Monitorar vazamentos de memória e otimizar uso'
            });
        }

        return recommendations;
    }

    async saveReport(report, type) {
        try {
            const reportsDir = path.join(process.cwd(), 'reports');
            
            // Criar diretório se não existir
            try {
                await fs.access(reportsDir);
            } catch {
                await fs.mkdir(reportsDir, { recursive: true });
            }

            const filename = `${type}-report-${new Date().toISOString().split('T')[0]}.json`;
            const filepath = path.join(reportsDir, filename);

            await fs.writeFile(filepath, JSON.stringify(report, null, 2));
            console.log(`📊 Relatório salvo: ${filename}`);
        } catch (error) {
            console.error('Erro ao salvar relatório:', error);
        }
    }

    calculateUptime() {
        const uptimeMs = Date.now() - this.startTime;
        const uptimeHours = uptimeMs / (1000 * 60 * 60);
        return Math.min(99.9, (uptimeHours / 24) * 100); // Simular uptime
    }

    getCurrentMemoryUsage() {
        const used = process.memoryUsage().heapUsed;
        const total = process.memoryUsage().heapTotal;
        return (used / total) * 100;
    }

    calculateErrorTrend(errors) {
        // Simular análise de tendência (implementar lógica mais sofisticada se necessário)
        const recent = errors.slice(-10);
        const older = errors.slice(-20, -10);
        
        if (recent.length > older.length) {
            return 'increasing';
        } else if (recent.length < older.length) {
            return 'decreasing';
        } else {
            return 'stable';
        }
    }

    getReportSummary() {
        return {
            totalReports: this.reportData.requests.length > 0 ? 1 : 0,
            lastGenerated: new Date().toISOString(),
            dataPoints: {
                requests: this.reportData.requests.length,
                errors: this.reportData.errors.length,
                performance: this.reportData.performance.length
            },
            status: 'operational'
        };
    }

    // Método para executar relatórios periodicamente
    startPeriodicReports(intervalHours = 24) {
        console.log(`📊 Iniciando relatórios automáticos a cada ${intervalHours} horas...`);
        
        // Executar imediatamente
        this.generateDailyReport();
        
        // Configurar intervalo
        setInterval(() => {
            this.generateDailyReport();
        }, intervalHours * 60 * 60 * 1000);
    }
}

module.exports = ReportSystem;