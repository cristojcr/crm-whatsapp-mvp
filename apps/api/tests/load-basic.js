// tests/load-basic.js
const { LoadTests } = require('../src/services/load-tests');

async function runBasicLoadTest() {
    console.log('🚀 Iniciando teste de carga básico...');
    
    const loadTest = new LoadTests();
    
    const config = {
        users: 50,
        duration: 120000, // 2 minutos
        rampUp: 30000,    // 30 segundos para chegar ao máximo
        scenario: 'mixed' // Cenário misto
    };
    
    console.log('📊 Configuração do teste:', config);
    
    try {
        const results = await loadTest.runLoadTest(config);
        
        console.log('\n📈 RESULTADOS DO TESTE BÁSICO:');
        console.log(`✅ Taxa de sucesso: ${results.successRate.toFixed(2)}%`);
        console.log(`⏱️ Tempo médio de resposta: ${results.avgResponseTime.toFixed(0)}ms`);
        console.log(`🚀 Throughput: ${results.throughput.toFixed(2)} req/s`);
        console.log(`❌ Falhas: ${results.failedRequests}`);
        
        // Verificar se passou nos critérios
        if (results.successRate >= 95 && results.avgResponseTime <= 2000) {
            console.log('✅ TESTE BÁSICO PASSOU!');
            return true;
        } else {
            console.log('❌ TESTE BÁSICO FALHOU!');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
        return false;
    }
}

runBasicLoadTest();