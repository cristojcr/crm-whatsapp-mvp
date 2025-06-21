const axios = require('axios');

class FailoverTest {
    constructor() {
        this.baseURL = 'https://crm-whatsapp-mvp-production.up.railway.app';
        this.testResults = {
            normalOperation: [],
            stressTest: []
        };
    }

    async runFailoverTests() {
        console.log('🔧 Iniciando testes de failover automático...');
        console.log('⚠️  Teste simula diferentes cenários de carga');
        
        // Teste 1: Operação normal
        await this.testNormalOperation();
        
        // Teste 2: Stress test para forçar failover
        await this.testStressScenario();
        
        this.generateFailoverReport();
    }

    async testNormalOperation() {
        console.log('\n✅ TESTE 1: Operação Normal');
        console.log('============================');
        
        const testCases = [
            { message: 'Oi! Como vai?', expectedProvider: 'deepseek' },
            { message: 'Gostaria de comprar seu produto premium', expectedProvider: 'openai' },
            { message: 'Preciso agendar urgente', expectedProvider: 'deepseek' }
        ];
        
        for (const testCase of testCases) {
            const result = await this.executeFailoverTest(testCase, 'normal');
            this.testResults.normalOperation.push(result);
        }
    }

    async testStressScenario() {
        console.log('\n🚨 TESTE 2: Cenário de Stress (múltiplas requests)');
        console.log('================================================');
        console.log('📝 Nota: Teste vai enviar múltiplas mensagens simultaneamente');
        
        const testCases = [
            { message: 'Teste stress 1', scenario: 'stress' },
            { message: 'Teste stress 2', scenario: 'stress' },
            { message: 'Teste stress 3', scenario: 'stress' },
            { message: 'Teste stress 4', scenario: 'stress' },
            { message: 'Teste stress 5', scenario: 'stress' }
        ];
        
        // Enviar todas simultaneamente para criar stress
        const promises = testCases.map(testCase => 
            this.executeFailoverTest(testCase, 'stress')
        );
        
        const results = await Promise.all(promises);
        this.testResults.stressTest = results;
    }

    async executeFailoverTest(testCase, scenario) {
        console.log(`  🧪 Testando: "${testCase.message.substring(0, 30)}..."`);
        
        const startTime = Date.now();
        
        try {
            const payload = this.createTestPayload(testCase.message, scenario);
            
            const response = await axios.post(
                `${this.baseURL}/api/webhook/whatsapp`,
                payload,
                {
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Test-Scenario': scenario
                    },
                    timeout: 30000
                }
            );
            
            const responseTime = Date.now() - startTime;
            
            console.log(`    ✅ Sucesso - ${responseTime}ms`);
            
            return {
                message: testCase.message,
                scenario,
                success: true,
                responseTime,
                status: response.status,
                hasResponse: !!response.data
            };
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            console.log(`    ❌ Erro - ${responseTime}ms (${error.response?.status || 'NETWORK'})`);
            
            return {
                message: testCase.message,
                scenario,
                success: false,
                responseTime,
                error: error.message,
                status: error.response?.status || 'NETWORK_ERROR'
            };
        }
        
        if (scenario !== 'stress') {
            await this.sleep(1000); // Aguarda 1s entre testes normais
        }
    }

    createTestPayload(message, scenario) {
        return {
            object: "whatsapp_business_account",
            entry: [{
                id: `failover-test-${scenario}`,
                changes: [{
                    value: {
                        messaging_product: "whatsapp",
                        metadata: {
                            display_phone_number: "15551234567",
                            phone_number_id: `test-phone-${scenario}`
                        },
                        messages: [{
                            from: "5511999777666",
                            id: `failover-${Date.now()}-${Math.random()}`,
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

    generateFailoverReport() {
        console.log('\n🔧 RELATÓRIO DE FAILOVER:');
        console.log('=========================');
        
        // Calcular estatísticas por cenário
        const scenarios = [
            { name: 'Normal', results: this.testResults.normalOperation },
            { name: 'Stress', results: this.testResults.stressTest }
        ];
        
        scenarios.forEach(scenario => {
            if (scenario.results.length > 0) {
                const successCount = scenario.results.filter(r => r.success).length;
                const totalCount = scenario.results.length;
                const successRate = (successCount / totalCount) * 100;
                const avgTime = scenario.results.reduce((sum, r) => sum + r.responseTime, 0) / totalCount;
                
                console.log(`\n📊 ${scenario.name}:`);
                console.log(`  ✅ Sucessos: ${successCount}/${totalCount} (${successRate.toFixed(1)}%)`);
                console.log(`  ⏱️  Tempo médio: ${avgTime.toFixed(0)}ms`);
                
                if (successRate >= 80) {
                    console.log(`  💚 Status: FUNCIONANDO`);
                } else if (successRate >= 50) {
                    console.log(`  💛 Status: PARCIAL`);
                } else {
                    console.log(`  💔 Status: PROBLEMÁTICO`);
                }
            }
        });
        
        // Análise geral do failover
        console.log('\n🎯 ANÁLISE GERAL:');
        
        const allResults = [
            ...this.testResults.normalOperation,
            ...this.testResults.stressTest
        ];
        
        const totalSuccess = allResults.filter(r => r.success).length;
        const totalTests = allResults.length;
        const overallRate = (totalSuccess / totalTests) * 100;
        
        console.log(`📈 Taxa geral de sucesso: ${overallRate.toFixed(1)}%`);
        
        if (overallRate >= 90) {
            console.log('🎉 EXCELENTE! Sistema de failover muito robusto');
        } else if (overallRate >= 80) {
            console.log('✅ BOM! Sistema de failover funcionando');
        } else if (overallRate >= 70) {
            console.log('⚠️  ACEITÁVEL! Failover precisa de melhorias');
        } else {
            console.log('🚨 CRÍTICO! Sistema de failover não está funcionando adequadamente');
        }
        
        // Análise de performance sob stress
        const stressResults = this.testResults.stressTest;
        if (stressResults.length > 0) {
            const stressSuccessRate = (stressResults.filter(r => r.success).length / stressResults.length) * 100;
            console.log(`\n🔥 Performance sob stress: ${stressSuccessRate.toFixed(1)}%`);
            
            if (stressSuccessRate >= 80) {
                console.log('💪 Sistema aguenta bem a pressão!');
            } else {
                console.log('⚠️  Sistema sofre sob pressão - normal para IA');
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Executar teste
const failoverTest = new FailoverTest();
failoverTest.runFailoverTests();