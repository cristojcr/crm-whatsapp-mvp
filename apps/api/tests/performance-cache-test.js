// tests/performance-cache-test.js
const axios = require('axios');

class CachePerformanceTester {
    constructor() {
        this.baseURL = process.env.RAILWAY_URL || 'http://localhost:3001';
        this.results = [];
    }

    async runAllTests() {
        console.log('⚡ INICIANDO TESTES DE PERFORMANCE E CACHE...\n');
        
        await this.testCacheMiss();
        await this.testCacheHit();
        await this.testMultipleEndpoints();
        await this.generateReport();
    }

    async testCacheMiss() {
        console.log('❄️ Teste 1: CACHE MISS (primeira requisição)...');
        
        const endpoint = '/api/statistics/overview?period=90d';
        const startTime = Date.now();
        
        try {
            const response = await axios.get(`${this.baseURL}${endpoint}`, {
                timeout: 10000
            });
            
            const responseTime = Date.now() - startTime;
            
            console.log(`  ✅ Status: ${response.status}`);
            console.log(`  ⏱️ Tempo: ${responseTime}ms`);
            console.log(`  📊 Dados: ${response.data.success ? 'OK' : 'ERRO'}`);
            
            this.results.push({
                test: 'cache_miss',
                responseTime,
                success: response.status === 200,
                endpoint
            });
            
        } catch (error) {
            console.log(`  ❌ ERRO: ${error.message}`);
            this.results.push({
                test: 'cache_miss',
                responseTime: 9999,
                success: false,
                endpoint,
                error: error.message
            });
        }
        
        console.log('');
    }

    async testCacheHit() {
        console.log('🚀 Teste 2: CACHE HIT (requisições subsequentes)...');
        
        const endpoint = '/api/statistics/overview?period=90d';
        const times = [];
        
        for (let i = 1; i <= 3; i++) {
            const startTime = Date.now();
            
            try {
                const response = await axios.get(`${this.baseURL}${endpoint}`, {
                    timeout: 5000
                });
                
                const responseTime = Date.now() - startTime;
                times.push(responseTime);
                
                console.log(`  🎯 Requisição ${i}: ${responseTime}ms`);
                
            } catch (error) {
                console.log(`  ❌ Requisição ${i}: ERRO - ${error.message}`);
                times.push(9999);
            }
            
            // Pequena pausa entre requisições
            await this.sleep(200);
        }
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        console.log(`  📊 Tempo médio: ${avgTime.toFixed(0)}ms`);
        
        this.results.push({
            test: 'cache_hit',
            responseTime: avgTime,
            success: times.every(t => t < 9999),
            endpoint,
            times
        });
        
        console.log('');
    }

    async testMultipleEndpoints() {
        console.log('🔥 Teste 3: MÚLTIPLOS ENDPOINTS simultaneamente...');
        
        const endpoints = [
            '/api/statistics/users?period=30d',
            '/api/statistics/ai?period=30d',
            '/api/statistics/conversations?period=30d',
            '/api/statistics/appointments?period=30d'
        ];
        
        const startTime = Date.now();
        
        try {
            const promises = endpoints.map(endpoint => 
                axios.get(`${this.baseURL}${endpoint}`, { timeout: 8000 })
            );
            
            const responses = await Promise.all(promises);
            const totalTime = Date.now() - startTime;
            
            console.log(`  ✅ ${responses.length} APIs responderam`);
            console.log(`  ⏱️ Tempo total: ${totalTime}ms`);
            console.log(`  📊 Tempo médio por API: ${(totalTime/responses.length).toFixed(0)}ms`);
            
            this.results.push({
                test: 'multiple_endpoints',
                responseTime: totalTime,
                success: responses.every(r => r.status === 200),
                endpoints: endpoints.length
            });
            
        } catch (error) {
            console.log(`  ❌ ERRO: ${error.message}`);
            this.results.push({
                test: 'multiple_endpoints',
                responseTime: 9999,
                success: false,
                error: error.message
            });
        }
        
        console.log('');
    }

    async generateReport() {
        console.log('📊 RELATÓRIO FINAL DE PERFORMANCE:');
        console.log('=====================================');
        
        const cacheMissResult = this.results.find(r => r.test === 'cache_miss');
        const cacheHitResult = this.results.find(r => r.test === 'cache_hit');
        
        if (cacheMissResult && cacheHitResult) {
            const improvement = ((cacheMissResult.responseTime - cacheHitResult.responseTime) / cacheMissResult.responseTime * 100);
            
            console.log(`🔍 Cache Miss (1ª requisição): ${cacheMissResult.responseTime}ms`);
            console.log(`⚡ Cache Hit (próximas): ${cacheHitResult.responseTime.toFixed(0)}ms`);
            console.log(`📈 Melhoria de performance: ${improvement.toFixed(1)}%`);
            
            if (improvement > 30) {
                console.log('✅ CACHE FUNCIONANDO PERFEITAMENTE!');
            } else if (improvement > 10) {
                console.log('⚠️ Cache funcionando, mas pode melhorar');
            } else {
                console.log('❌ Cache pode não estar funcionando corretamente');
            }
        }
        
        const successfulTests = this.results.filter(r => r.success).length;
        const totalTests = this.results.length;
        
        console.log(`\n🎯 Testes bem-sucedidos: ${successfulTests}/${totalTests}`);
        console.log(`📊 Taxa de sucesso: ${((successfulTests/totalTests)*100).toFixed(1)}%`);
        
        if (successfulTests === totalTests) {
            console.log('\n🎉 TODOS OS TESTES DE PERFORMANCE PASSARAM!');
        } else {
            console.log('\n⚠️ Alguns testes falharam - verificar logs acima');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Executar testes
const tester = new CachePerformanceTester();
tester.runAllTests().catch(console.error);