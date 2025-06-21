const axios = require('axios');

class CachePerformanceTest {
    constructor() {
        this.baseURL = 'https://crm-whatsapp-mvp-production.up.railway.app';
        this.results = {
            withoutCache: [],
            withCache: []
        };
    }

    async runCacheTests() {
        console.log('🚀 Testando performance do cache...');
        
        // Teste 1: Sem cache (primeira execução)
        console.log('\n📊 FASE 1: Testando SEM cache (primeira execução)');
        await this.testWithoutCache();
        
        // Aguardar um pouco
        await this.sleep(2000);
        
        // Teste 2: Com cache (execuções subsequentes)
        console.log('\n⚡ FASE 2: Testando COM cache (execuções subsequentes)');
        await this.testWithCache();
        
        this.analyzeResults();
    }

    async testWithoutCache() {
        const testMessages = [
            'Gostaria de agendar uma consulta',
            'Qual o valor do tratamento de canal?',
            'Como devo escovar os dentes?'
        ];

        for (let i = 0; i < testMessages.length; i++) {
            const message = testMessages[i];
            console.log(`  🧪 Teste ${i+1}: "${message.substring(0, 30)}..."`);
            
            const startTime = Date.now();
            
            try {
                // Simular processamento de mensagem
                const response = await axios.post(
                    `${this.baseURL}/api/webhook/whatsapp`,
                    this.createTestPayload(message),
                    {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 30000
                    }
                );
                
                const responseTime = Date.now() - startTime;
                this.results.withoutCache.push(responseTime);
                
                console.log(`    ⏱️  ${responseTime}ms - Status: ${response.status}`);
                
            } catch (error) {
                const responseTime = Date.now() - startTime;
                this.results.withoutCache.push(responseTime);
                
                console.log(`    ⏱️  ${responseTime}ms - Status: ${error.response?.status || 'ERROR'}`);
            }
            
            await this.sleep(1000); // Aguarda 1s entre testes
        }
    }

    async testWithCache() {
        // Usar as mesmas mensagens para testar cache
        const testMessages = [
            'Gostaria de agendar uma consulta',
            'Qual o valor do tratamento de canal?',
            'Como devo escovar os dentes?'
        ];

        // Executar múltiplas vezes para garantir que o cache seja usado
        for (let round = 1; round <= 3; round++) {
            console.log(`  📈 Rodada ${round}/3:`);
            
            for (let i = 0; i < testMessages.length; i++) {
                const message = testMessages[i];
                
                const startTime = Date.now();
                
                try {
                    const response = await axios.post(
                        `${this.baseURL}/api/webhook/whatsapp`,
                        this.createTestPayload(message),
                        {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 30000
                        }
                    );
                    
                    const responseTime = Date.now() - startTime;
                    this.results.withCache.push(responseTime);
                    
                    console.log(`    ⚡ Teste ${i+1}: ${responseTime}ms`);
                    
                } catch (error) {
                    const responseTime = Date.now() - startTime;
                    this.results.withCache.push(responseTime);
                    
                    console.log(`    ⚡ Teste ${i+1}: ${responseTime}ms (${error.response?.status || 'ERROR'})`);
                }
                
                await this.sleep(500); // Aguarda 0.5s entre testes
            }
            
            await this.sleep(1000); // Aguarda 1s entre rodadas
        }
    }

    createTestPayload(message) {
        return {
            object: "whatsapp_business_account",
            entry: [{
                id: "cache-test-entry",
                changes: [{
                    value: {
                        messaging_product: "whatsapp",
                        metadata: {
                            display_phone_number: "15551234567",
                            phone_number_id: "cache-test-phone"
                        },
                        messages: [{
                            from: "5511999888777",
                            id: `cache-test-${Date.now()}-${Math.random()}`,
                            timestamp: Math.floor(Date.now() / 1000).toString(),
                            text: {
                                body: message
                            },
                            type: "text"
                        }]
                    },
                    field: "messages"
                }]
            }]
        };
    }

    analyzeResults() {
        console.log('\n🔍 ANÁLISE DE PERFORMANCE DO CACHE:');
        console.log('====================================');
        
        if (this.results.withoutCache.length === 0 || this.results.withCache.length === 0) {
            console.log('❌ Dados insuficientes para análise');
            return;
        }
        
        // Calcular médias
        const avgWithoutCache = this.results.withoutCache.reduce((a, b) => a + b, 0) / this.results.withoutCache.length;
        const avgWithCache = this.results.withCache.reduce((a, b) => a + b, 0) / this.results.withCache.length;
        
        // Calcular melhoria
        const improvement = ((avgWithoutCache - avgWithCache) / avgWithoutCache) * 100;
        
        console.log(`📊 Sem cache - Média: ${avgWithoutCache.toFixed(0)}ms`);
        console.log(`⚡ Com cache - Média: ${avgWithCache.toFixed(0)}ms`);
        console.log(`📈 Melhoria: ${improvement.toFixed(1)}%`);
        
        // Análise detalhada
        console.log('\n📋 Detalhes:');
        console.log(`  🐌 Sem cache: ${this.results.withoutCache.map(t => t + 'ms').join(', ')}`);
        console.log(`  ⚡ Com cache: ${this.results.withCache.map(t => t + 'ms').join(', ')}`);
        
        // Conclusão
        console.log('\n💡 CONCLUSÃO:');
        if (improvement > 20) {
            console.log('🎉 EXCELENTE! Cache funcionando muito bem');
        } else if (improvement > 10) {
            console.log('✅ BOM! Cache proporcionando melhoria');
        } else if (improvement > 0) {
            console.log('⚠️  LEVE! Cache funcionando, mas pode melhorar');
        } else {
            console.log('🚨 PROBLEMA! Cache não está funcionando adequadamente');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Executar teste
const cacheTest = new CachePerformanceTest();
cacheTest.runCacheTests();