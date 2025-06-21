const axios = require('axios');

class LocalStressTest {
    constructor() {
        this.baseURL = 'http://localhost:3001';
        this.results = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            responseTimes: []
        };
    }

    async runStressTest() {
        console.log('🔥 Teste de stress LOCAL iniciado...');
        console.log(`🎯 URL: ${this.baseURL}/health`);
        
        const promises = [];
        for (let i = 0; i < 20; i++) {
            promises.push(this.executeRequest(i));
        }
        
        await Promise.all(promises);
        this.generateReport();
    }

    async executeRequest(requestId) {
        const startTime = Date.now();
        
        try {
            const response = await axios.get(`${this.baseURL}/health`);
            const responseTime = Date.now() - startTime;
            
            this.results.totalRequests++;
            this.results.successfulRequests++;
            this.results.responseTimes.push(responseTime);
            
            console.log(`✅ Req ${requestId}: ${responseTime}ms (${response.status})`);
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.results.totalRequests++;
            this.results.failedRequests++;
            
            console.log(`❌ Req ${requestId}: ${responseTime}ms (ERRO)`);
        }
    }

    generateReport() {
        const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
        const avgResponseTime = this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length;
        
        console.log('\n🔥 RELATÓRIO LOCAL:');
        console.log('==================');
        console.log(`📊 Total: ${this.results.totalRequests}`);
        console.log(`✅ Sucessos: ${this.results.successfulRequests} (${successRate.toFixed(1)}%)`);
        console.log(`❌ Falhas: ${this.results.failedRequests}`);
        console.log(`⏱️  Tempo médio: ${avgResponseTime.toFixed(0)}ms`);
        
        if (successRate === 100) {
            console.log('🎉 PERFEITO! Sistema local 100% estável');
        }
    }
}

const test = new LocalStressTest();
test.runStressTest();