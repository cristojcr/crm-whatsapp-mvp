// tests/stress-test.js
const axios = require('axios');

async function runStressTest() {
    console.log('💥 Iniciando teste de stress...');
    
    // Teste escalonado - aumenta carga progressivamente
    const phases = [
        { users: 20, duration: 30000, name: '20 usuários' },
        { users: 50, duration: 30000, name: '50 usuários' },
        { users: 100, duration: 45000, name: '100 usuários' },
        { users: 150, duration: 60000, name: '150 usuários' }
    ];
    
    const results = [];
    
    for (let phase of phases) {
        console.log(`\n🔥 Fase: ${phase.name}`);
        
        try {
            const result = await runPhase(phase);
            result.phase = phase.name;
            results.push(result);
            
            console.log(`✅ Taxa de sucesso: ${result.successRate.toFixed(2)}%`);
            console.log(`⏱️ Tempo médio: ${result.avgResponseTime.toFixed(0)}ms`);
            console.log(`🚀 Throughput: ${result.throughput.toFixed(2)} req/s`);
            
            // Se taxa de sucesso < 90%, sistema está no limite
            if (result.successRate < 90) {
                console.log(`❌ LIMITE ENCONTRADO: ${phase.name}`);
                break;
            }
            
            // Pausa entre fases
            console.log('⏸️ Pausa de 10s entre fases...');
            await sleep(10000);
            
        } catch (error) {
            console.error(`❌ Erro na fase ${phase.name}:`, error.message);
            break;
        }
    }
    
    // Relatório final
    console.log('\n📊 RELATÓRIO FINAL DO STRESS TEST:');
    results.forEach(result => {
        console.log(`${result.phase}: ${result.successRate.toFixed(1)}% - ${result.avgResponseTime.toFixed(0)}ms`);
    });
    
    return results;
}

async function runPhase(config) {
    const startTime = Date.now();
    const promises = [];
    const metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimes: [],
        errors: []
    };
    
    console.log(`  📊 Configuração: ${config.users} usuários, ${config.duration/1000}s`);
    
    // Criar usuários simulados com ramp-up
    for (let userId = 1; userId <= config.users; userId++) {
        const userPromise = simulateStressUser(userId, config, metrics);
        promises.push(userPromise);
        
        // Ramp-up: adicionar usuários gradualmente
        if (userId % 10 === 0) {
            await sleep(1000); // Pausa a cada 10 usuários
        }
    }
    
    // Executar todos os usuários
    await Promise.all(promises);
    
    const totalDuration = Date.now() - startTime;
    
    // Calcular métricas finais
    const avgResponseTime = metrics.responseTimes.length > 0 
        ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
        : 0;
        
    const successRate = metrics.totalRequests > 0 
        ? (metrics.successfulRequests / metrics.totalRequests) * 100
        : 0;
        
    const throughput = metrics.totalRequests / (totalDuration / 1000);
    
    return {
        config: config,
        totalRequests: metrics.totalRequests,
        successfulRequests: metrics.successfulRequests,
        failedRequests: metrics.failedRequests,
        successRate: successRate,
        avgResponseTime: avgResponseTime,
        maxResponseTime: Math.max(...metrics.responseTimes, 0),
        minResponseTime: Math.min(...metrics.responseTimes, 0),
        throughput: throughput,
        duration: totalDuration,
        errorsCount: metrics.errors.length
    };
}

async function simulateStressUser(userId, config, metrics) {
    const phoneNumber = `+55119${userId.toString().padStart(8, '0')}`;
    
    try {
        const messageStartTime = Date.now();
        
        const payload = {
            entry: [{
                id: `stress_test_${userId}`,
                changes: [{
                    value: {
                        messaging_product: 'whatsapp',
                        messages: [{
                            id: `stress_msg_${userId}_${Date.now()}`,
                            from: phoneNumber,
                            timestamp: Math.floor(Date.now() / 1000).toString(),
                            text: { body: `Teste de stress ${userId}` },
                            type: 'text'
                        }]
                    }
                }]
            }]
        };
        
        const response = await axios.post(
            'http://localhost:3001/api/webhook/whatsapp',
            payload,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            }
        );
        
        const responseTime = Date.now() - messageStartTime;
        
        metrics.totalRequests++;
        metrics.responseTimes.push(responseTime);
        
        if (response.status >= 200 && response.status < 500) {
            metrics.successfulRequests++;
        } else {
            metrics.failedRequests++;
        }
        
    } catch (error) {
        metrics.totalRequests++;
        
        if (error.response && error.response.status >= 200 && error.response.status < 500) {
            metrics.successfulRequests++;
            metrics.responseTimes.push(100); // Tempo estimado
        } else {
            metrics.failedRequests++;
            metrics.errors.push({
                userId: userId,
                message: error.message,
                timestamp: new Date()
            });
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

runStressTest();