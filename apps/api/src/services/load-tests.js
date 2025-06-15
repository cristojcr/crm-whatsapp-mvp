// src/services/load-tests.js
const axios = require('axios');

class LoadTests {
    constructor() {
        this.baseURL = process.env.RAILWAY_URL || 'http://localhost:3001';
    }
    
    async runLoadTest(config) {
        console.log(`🚀 Iniciando teste de carga: ${config.users} usuários por ${config.duration/1000}s`);
        
        const results = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            responseTimes: [],
            maxResponseTime: 0,
            minResponseTime: Infinity,
            errors: []
        };
        
        const startTime = Date.now();
        const promises = [];
        
        // Simular usuários concurrent
        for (let userId = 1; userId <= config.users; userId++) {
            const userPromise = this.simulateUser(userId, config, results);
            promises.push(userPromise);
        }
        
        // Aguardar todos os usuários
        await Promise.all(promises);
        
        const duration = Date.now() - startTime;
        this.calculateFinalStats(results, duration);
        
        return results;
    }
    
    async simulateUser(userId, config, results) {
        const userPhone = `+55119${userId.toString().padStart(8, '0')}`;
        
        try {
            // Simular delay de ramp-up
            const rampUpDelay = (config.rampUp || 0) * (userId / config.users);
            await this.sleep(rampUpDelay);
            
            // Simular mensagem
            const messageContent = this.getRandomMessage(config.scenario);
            const responseTime = await this.sendMessage(userPhone, messageContent, userId);
            
            // Atualizar resultados
            this.updateStats(results, responseTime, true);
            
            console.log(`👤 Usuário ${userId}: ${responseTime}ms`);
            
        } catch (error) {
            this.updateStats(results, Date.now() - Date.now(), false, error);
            console.log(`❌ Usuário ${userId}: ${error.message}`);
        }
    }
    
    async sendMessage(phone, message, userId) {
        const startTime = Date.now();
        
        const payload = {
            entry: [{
                id: `load_test_${userId}`,
                changes: [{
                    value: {
                        messaging_product: 'whatsapp',
                        messages: [{
                            id: `load_msg_${userId}_${Date.now()}`,
                            from: phone,
                            timestamp: Math.floor(Date.now() / 1000).toString(),
                            text: { body: message },
                            type: 'text'
                        }]
                    }
                }]
            }]
        };
        
        const response = await axios.post(
            `${this.baseURL}/api/webhook/whatsapp`,
            payload,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            }
        );
        
        const responseTime = Date.now() - startTime;
        
        // Aceitar 200, 400 e 403 como sucesso para testes
        if (response.status < 200 || response.status >= 500) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return responseTime;
    }
    
    getRandomMessage(scenario) {
        const messages = {
            mixed: [
                'Gostaria de agendar uma consulta',
                'Qual o valor do tratamento?',
                'Vocês atendem qual horário?',
                'Preciso de mais informações',
                'Obrigado!'
            ],
            stress: [
                'Teste de carga de mensagem complexa com muito texto para testar limites',
                'Mensagem de stress test',
                'Load test message'
            ]
        };
        
        const messageArray = messages[scenario] || messages.mixed;
        return messageArray[Math.floor(Math.random() * messageArray.length)];
    }
    
    updateStats(results, responseTime, success, error = null) {
        results.totalRequests++;
        
        if (success) {
            results.successfulRequests++;
            results.responseTimes.push(responseTime);
            results.maxResponseTime = Math.max(results.maxResponseTime, responseTime);
            results.minResponseTime = Math.min(results.minResponseTime, responseTime);
        } else {
            results.failedRequests++;
            if (error) {
                results.errors.push({
                    message: error.message,
                    timestamp: new Date()
                });
            }
        }
    }
    
    calculateFinalStats(results, duration) {
        // Taxa de sucesso
        results.successRate = (results.successfulRequests / results.totalRequests) * 100;
        
        // Tempo médio de resposta
        if (results.responseTimes.length > 0) {
            results.avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
        } else {
            results.avgResponseTime = 0;
        }
        
        // Throughput (requisições por segundo)
        results.throughput = results.totalRequests / (duration / 1000);
        
        // Percentis de tempo de resposta
        const sortedTimes = results.responseTimes.sort((a, b) => a - b);
        results.percentiles = {
            p50: this.getPercentile(sortedTimes, 50),
            p90: this.getPercentile(sortedTimes, 90),
            p95: this.getPercentile(sortedTimes, 95),
            p99: this.getPercentile(sortedTimes, 99)
        };
    }
    
    getPercentile(sortedArray, percentile) {
        if (sortedArray.length === 0) return 0;
        const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
        return sortedArray[Math.max(0, index)];
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = { LoadTests };