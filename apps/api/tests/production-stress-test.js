const axios = require('axios');

class ProductionStressTest {
    constructor() {
        this.baseURL = 'https://escalabots-backend-production.up.railway.app';
        this.results = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            responseTimes: [],
            errors: [],
            maxResponseTime: 0,
            minResponseTime: Infinity
        };
    }

    async runStressTest() {
        console.log('🔥 Iniciando teste de stress em PRODUÇÃO...');
        console.log(`🎯 URL: ${this.baseURL}`);
        console.log('⚠️  ATENÇÃO: Testando sistema em produção!');
        
        const startTime = Date.now();
        
        // Teste com 50 requisições simultâneas
        const promises = [];
        for (let i = 0; i < 50; i++) {
            promises.push(this.executeRequest(i));
        }
        
        await Promise.all(promises);
        
        const duration = Date.now() - startTime;
        this.generateReport(duration);
    }

    async executeRequest(requestId) {
        const startTime = Date.now();
        
        try {
            // Teste no endpoint de health check
            const response = await axios.get(`${this.baseURL}/health`, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'CRM-StressTest/1.0'
                }
            });
            
            const responseTime = Date.now() - startTime;
            this.updateStats(responseTime, true, response.status);
            
            console.log(`✅ Req ${requestId}: ${responseTime}ms (${response.status})`);
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.updateStats(responseTime, false, error);
            
            console.log(`❌ Req ${requestId}: ${responseTime}ms (ERRO: ${error.code || error.message})`);
        }
    }

    updateStats(responseTime, success, statusOrError) {
        this.results.totalRequests++;
        this.results.responseTimes.push(responseTime);
        this.results.maxResponseTime = Math.max(this.results.maxResponseTime, responseTime);
        this.results.minResponseTime = Math.min(this.results.minResponseTime, responseTime);
        
        if (success) {
            this.results.successfulRequests++;
        } else {
            this.results.failedRequests++;
            this.results.errors.push(statusOrError);
        }
    }

    generateReport(totalDuration) {
        console.log('\n🔥 RELATÓRIO DE STRESS - PRODUÇÃO:');
        console.log('=====================================');
        
        const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
        const avgResponseTime = this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length;
        
        console.log(`📊 Total de requisições: ${this.results.totalRequests}`);
        console.log(`✅ Sucessos: ${this.results.successfulRequests} (${successRate.toFixed(1)}%)`);
        console.log(`❌ Falhas: ${this.results.failedRequests}`);
        console.log(`⏱️  Tempo médio: ${avgResponseTime.toFixed(0)}ms`);
        console.log(`📈 Tempo máximo: ${this.results.maxResponseTime}ms`);
        console.log(`📉 Tempo mínimo: ${this.results.minResponseTime}ms`);
        console.log(`🚀 Duração total: ${totalDuration}ms`);
        
        // Análise de performance
        console.log('\n💡 ANÁLISE:');
        if (successRate >= 95 && avgResponseTime <= 3000) {
            console.log('🎉 EXCELENTE! Sistema em produção está estável');
        } else if (successRate >= 90 && avgResponseTime <= 5000) {
            console.log('⚠️  BOM! Algumas otimizações podem ser necessárias');
        } else {
            console.log('🚨 ATENÇÃO! Sistema precisa de investigação');
        }
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ ERROS ENCONTRADOS:');
            this.results.errors.slice(0, 5).forEach((error, index) => {
                console.log(`  ${index + 1}. ${error.code || error.message}`);
            });
        }
    }
}

// Executar teste
const stressTest = new ProductionStressTest();
stressTest.runStressTest();