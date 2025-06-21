const axios = require('axios');

class WebhookRealTest {
    constructor() {
        this.baseURL = 'https://crm-whatsapp-mvp-production.up.railway.app';
        this.testResults = [];
    }

    async runWebhookTests() {
        console.log('📱 Iniciando testes de webhook REAL...');
        console.log(`🎯 URL: ${this.baseURL}/api/webhook/whatsapp`);
        
        const testCases = [
            {
                name: 'Agendamento Dentista',
                payload: this.createWhatsAppPayload('Oi! Gostaria de agendar uma limpeza para amanhã de manhã')
            },
            {
                name: 'Consulta Preço',
                payload: this.createWhatsAppPayload('Qual o valor da consulta?')
            },
            {
                name: 'Dúvida Técnica',
                payload: this.createWhatsAppPayload('Como devo escovar os dentes após o procedimento?')
            },
            {
                name: 'Mensagem Complexa',
                payload: this.createWhatsAppPayload('Preciso remarcar minha consulta de canal que estava marcada para terça, mas só consigo na sexta à tarde, pode ser?')
            }
        ];

        for (const testCase of testCases) {
            await this.executeWebhookTest(testCase);
            await this.sleep(2000); // Aguarda 2s entre testes
        }

        this.generateWebhookReport();
    }

    createWhatsAppPayload(message) {
        return {
            object: "whatsapp_business_account",
            entry: [{
                id: "test-entry-id",
                changes: [{
                    value: {
                        messaging_product: "whatsapp",
                        metadata: {
                            display_phone_number: "15551234567",
                            phone_number_id: "test-phone-id"
                        },
                        messages: [{
                            from: "5511999999999",
                            id: `test-msg-${Date.now()}`,
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

    async executeWebhookTest(testCase) {
        console.log(`\n🧪 Testando: ${testCase.name}`);
        
        const startTime = Date.now();
        
        try {
            const response = await axios.post(
                `${this.baseURL}/api/webhook/whatsapp`,
                testCase.payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'WhatsApp/2.0'
                    },
                    timeout: 30000
                }
            );
            
            const responseTime = Date.now() - startTime;
            
            this.testResults.push({
                name: testCase.name,
                success: true,
                responseTime,
                status: response.status,
                response: response.data
            });
            
            console.log(`  ✅ Sucesso - ${responseTime}ms (${response.status})`);
            
            // Verificar se há resposta do sistema
            if (response.data && response.data.message) {
                console.log(`  📝 Resposta: ${response.data.message.substring(0, 100)}...`);
            }
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            this.testResults.push({
                name: testCase.name,
                success: false,
                responseTime,
                error: error.message,
                status: error.response?.status || 'NETWORK_ERROR'
            });
            
            console.log(`  ❌ Erro - ${responseTime}ms (${error.response?.status || 'NETWORK_ERROR'})`);
            console.log(`  🔍 Detalhes: ${error.message}`);
        }
    }

    generateWebhookReport() {
        console.log('\n📱 RELATÓRIO DE WEBHOOK REAL:');
        console.log('================================');
        
        const totalTests = this.testResults.length;
        const successfulTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - successfulTests;
        const successRate = (successfulTests / totalTests) * 100;
        const avgResponseTime = this.testResults.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;
        
        console.log(`📊 Total de testes: ${totalTests}`);
        console.log(`✅ Sucessos: ${successfulTests} (${successRate.toFixed(1)}%)`);
        console.log(`❌ Falhas: ${failedTests}`);
        console.log(`⏱️  Tempo médio: ${avgResponseTime.toFixed(0)}ms`);
        
        console.log('\n📋 Detalhes por teste:');
        this.testResults.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`  ${status} ${result.name}: ${result.responseTime}ms (${result.status})`);
        });
        
        // Análise do webhook
        console.log('\n💡 ANÁLISE DO WEBHOOK:');
        if (successRate >= 80) {
            console.log('🎉 WEBHOOK FUNCIONANDO! Sistema processando corretamente');
        } else if (successRate >= 50) {
            console.log('⚠️  WEBHOOK PARCIAL! Algumas melhorias necessárias');
        } else {
            console.log('🚨 WEBHOOK COM PROBLEMAS! Investigação necessária');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Executar teste
const webhookTest = new WebhookRealTest();
webhookTest.runWebhookTests();