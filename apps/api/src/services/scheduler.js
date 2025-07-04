// apps/api/src/services/scheduler.js
const cron = require('node-cron');
const ComplianceMonitor = require('./compliance-monitor');

class Scheduler {
    
    static init() {
        console.log('🕐 Iniciando agendador de tarefas...');
        
        // Verificação de compliance a cada hora
        cron.schedule('0 * * * *', async () => {
            console.log('🔄 Executando verificação de compliance...');
            await ComplianceMonitor.runComplianceCheck();
        }, {
            scheduled: true,
            timezone: "America/Sao_Paulo"
        });
        
        // Limpeza de fila a cada 6 horas
        cron.schedule('0 */6 * * *', async () => {
            console.log('🧹 Executando limpeza de fila...');
            await ComplianceMonitor.cleanOldQueue();
        }, {
            scheduled: true,
            timezone: "America/Sao_Paulo"
        });
        
        // Verificação express a cada 15 minutos
        cron.schedule('*/15 * * * *', async () => {
            console.log('⚡ Verificação express de compliance...');
            await ComplianceMonitor.processAllQueues();
        }, {
            scheduled: true,
            timezone: "America/Sao_Paulo"
        });
        
        console.log('✅ Agendador de tarefas iniciado');
    }
}

module.exports = Scheduler;