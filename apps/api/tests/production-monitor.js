const axios = require('axios');

class ProductionMonitor {
    constructor() {
        this.baseURL = 'https://crm-whatsapp-mvp-production.up.railway.app';
        this.isMonitoring = false;
        this.metrics = {
            requests: 0,
            errors: 0,
            avgResponseTime: 0,
            responseTimes: []
        };
    }

    async startMonitoring() {
        console.log('📊 Iniciando monitoramento em tempo real...');
        console.log('⏰ Monitoramento por 5 minutos');
        console.log('🔄 Verificações a cada 30 segundos');
        console.log('=====================================\n');
        
        this.isMonitoring = true;
        
        const startTime = Date.now();
        const monitorDuration = 5 * 60 * 1000; // 5 minutos
        
        while (this.isMonitoring && (Date.now() - startTime < monitorDuration)) {
            await this.checkSystemHealth();
            await this.sleep(30000); // Aguarda 30 segundos
        }
        
        this.generateFinalReport();
    }

    async checkSystemHealth() {
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        
        try {
            const startTime = Date.now();
            const response = await axios.get(`${this.baseURL}/health`, {
                timeout: 10000
            });
            const responseTime = Date.now() - startTime;
            
            this.metrics.requests++;
            this.metrics.responseTimes.push(responseTime);
            this.updateAvgResponseTime();
            
            const status = response.status === 200 ? '✅ SAUDÁVEL' : '⚠️  ATENÇÃO';
            console.log(`[${timestamp}] ${status} - ${responseTime}ms - Uptime: ${response.data.performance?.uptime || 'N/A'}`);
            
            // Mostrar info adicional
            if (response.data.connections?.supabase?.status) {
                console.log(`  🗄️  Supabase: ${response.data.connections.supabase.status}`);
            }
            if (response.data.memory?.used) {
                console.log(`  💾 Memória: ${response.data.memory.used}`);
            }
            
        } catch (error) {
            this.metrics.errors++;
            console.log(`[${timestamp}] ❌ ERRO - ${error.code || error.message}`);
        }
    }

    updateAvgResponseTime() {
        if (this.metrics.responseTimes.length > 0) {
            const sum = this.metrics.responseTimes.reduce((a, b) => a + b, 0);
            this.metrics.avgResponseTime = sum / this.metrics.responseTimes.length;
        }
    }

    generateFinalReport() {
        console.log('\n📊 RELATÓRIO FINAL DE MONITORAMENTO:');
        console.log('====================================');
        
        const totalChecks = this.metrics.requests + this.metrics.errors;
        const uptime = totalChecks > 0 ? ((this.metrics.requests / totalChecks) * 100) : 0;
        
        console.log(`🔄 Total de verificações: ${totalChecks}`);
        console.log(`✅ Sucessos: ${this.metrics.requests}`);
        console.log(`❌ Erros: ${this.metrics.errors}`);
        console.log(`📈 Uptime: ${uptime.toFixed(1)}%`);
        console.log(`⏱️  Tempo médio: ${this.metrics.avgResponseTime.toFixed(0)}ms`);
        
        // Análise da estabilidade
        console.log('\n💡 ANÁLISE DE ESTABILIDADE:');
        if (uptime >= 98) {
            console.log('🎉 EXCELENTE! Sistema muito estável');
        } else if (uptime >= 95) {
            console.log('✅ BOM! Sistema estável');
        } else if (uptime >= 90) {
            console.log('⚠️  ATENÇÃO! Alguns problemas detectados');
        } else {
            console.log('🚨 CRÍTICO! Sistema instável');
        }
        
        if (this.metrics.avgResponseTime > 3000) {
            console.log('⚡ RECOMENDAÇÃO: Investigar performance');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    stop() {
        this.isMonitoring = false;
        console.log('\n⏹️  Monitoramento interrompido pelo usuário');
    }
}

// Executar monitoramento
const monitor = new ProductionMonitor();

// Permitir interrupção com Ctrl+C
process.on('SIGINT', () => {
    monitor.stop();
    process.exit(0);
});

monitor.startMonitoring();