// tests/partnership-e2e-test.js
const axios = require('axios');

class PartnershipE2ETests {
    constructor() {
        this.baseURL = 'http://localhost:3001';
        this.testResults = [];
        this.testData = {
            partner: null,
            commission: null,
            referral: null
        };
    }
    
    async runCompletePartnershipFlow() {
        console.log('🎯 INICIANDO TESTE E2E - SISTEMA DE PARCERIAS');
        console.log('================================================');
        
        try {
            await this.testPartnerRegistration();
            await this.testReferralTracking();
            await this.testCommissionCalculation();
            await this.testAdminAPIs();
            await this.testNotificationSystem();
            
            this.generateFinalReport();
        } catch (error) {
            console.error('❌ Erro durante os testes:', error.message);
        }
    }
    
    async testPartnerRegistration() {
        console.log('\n📋 TESTE 1: CADASTRO DE PARCEIRO');
        console.log('--------------------------------');
        
        const testCases = [
            {
                name: 'Cadastro Contador',
                data: {
                    business_name: 'Escritório Contábil Teste',
                    contact_person: 'joana Silva',
                    email: 'joana.teste@email.com',
                    business_type: 'contador',
                    phone: '11999999999',
                    document: '12345678901'
                }
            },
            {
                name: 'Cadastro Associação',
                data: {
                    business_name: 'Associação Comercial Teste',
                    contact_person: 'Mario Santos',
                    email: 'mario.teste@email.com',
                    business_type: 'associacao',
                    phone: '11888888888',
                    document: '12345678000199'
                }
            }
        ];
        
        for (let testCase of testCases) {
            try {
                const response = await this.makeRequest('POST', '/api/partners/register', testCase.data);
                
                if (response.status === 201 || response.status === 200) {
                    console.log(`✅ ${testCase.name}: SUCCESS`);
                    console.log(`   📧 Email: ${testCase.data.email}`);
                    console.log(`   🏢 Tipo: ${testCase.data.business_type}`);
                    
                    // Salvar primeiro parceiro para testes posteriores
                    if (!this.testData.partner) {
                        this.testData.partner = response.data.partner;
                    }
                    
                    this.testResults.push({
                        test: testCase.name,
                        status: 'SUCCESS',
                        responseTime: response.responseTime,
                        details: `Partner ID: ${response.data.partner?.id || 'N/A'}`
                    });
                } else {
                    throw new Error(`Status ${response.status}`);
                }
            } catch (error) {
                console.log(`❌ ${testCase.name}: FAILED - ${error.message}`);
                this.testResults.push({
                    test: testCase.name,
                    status: 'FAILED',
                    error: error.message
                });
            }
        }
    }
    
    async testReferralTracking() {
        console.log('\n🔗 TESTE 2: RASTREAMENTO DE REFERÊNCIAS');
        console.log('---------------------------------------');
        
        if (!this.testData.partner) {
            console.log('⚠️ Pulando teste: Nenhum parceiro disponível');
            return;
        }
        
        const testCases = [
            {
                name: 'Tracking de Click',
                endpoint: '/api/partners/track-click',
                data: {
                    partner_code: this.testData.partner.partner_code,
                    source: 'website',
                    utm_campaign: 'test-campaign'
                }
            },
            {
                name: 'Registro de Conversão',
                endpoint: '/api/partners/track-conversion',
                data: {
                    partner_code: this.testData.partner.partner_code,
                    client_email: 'cliente.teste@email.com',
                    subscription_plan: 'basic',
                    conversion_value: 99.90
                }
            }
        ];
        
        for (let testCase of testCases) {
            try {
                const response = await this.makeRequest('POST', testCase.endpoint, testCase.data);
                
                if (response.status === 200 || response.status === 201) {
                    console.log(`✅ ${testCase.name}: SUCCESS`);
                    console.log(`   📊 Partner Code: ${testCase.data.partner_code}`);
                    
                    this.testResults.push({
                        test: testCase.name,
                        status: 'SUCCESS',
                        responseTime: response.responseTime
                    });
                } else {
                    throw new Error(`Status ${response.status}`);
                }
            } catch (error) {
                console.log(`❌ ${testCase.name}: FAILED - ${error.message}`);
                this.testResults.push({
                    test: testCase.name,
                    status: 'FAILED',
                    error: error.message
                });
            }
        }
    }
    
    async testCommissionCalculation() {
        console.log('\n💰 TESTE 3: CÁLCULO DE COMISSÕES');
        console.log('--------------------------------');
        
        const testCases = [
            {
                name: 'Processar Comissões Mensais',
                endpoint: '/api/admin/commissions/process-monthly',
                data: {
                    year: new Date().getFullYear(),
                    month: new Date().getMonth() + 1
                }
            },
            {
                name: 'Listar Comissões Pendentes',
                endpoint: '/api/admin/commissions/pending',
                method: 'GET'
            },
            {
                name: 'Relatório Financeiro',
                endpoint: '/api/admin/commissions/report',
                method: 'GET',
                params: {
                    start_date: '2024-01-01',
                    end_date: '2024-12-31'
                }
            }
        ];
        
        for (let testCase of testCases) {
            try {
                let response;
                
                if (testCase.method === 'GET') {
                    const url = testCase.params ? 
                        `${testCase.endpoint}?${new URLSearchParams(testCase.params).toString()}` : 
                        testCase.endpoint;
                    response = await this.makeRequest('GET', url);
                } else {
                    response = await this.makeRequest('POST', testCase.endpoint, testCase.data);
                }
                
                if (response.status === 200) {
                    console.log(`✅ ${testCase.name}: SUCCESS`);
                    
                    if (testCase.name === 'Processar Comissões Mensais' && response.data.commissions) {
                        console.log(`   📊 Comissões processadas: ${response.data.commissions.length}`);
                        this.testData.commission = response.data.commissions[0];
                    }
                    
                    this.testResults.push({
                        test: testCase.name,
                        status: 'SUCCESS',
                        responseTime: response.responseTime
                    });
                } else {
                    throw new Error(`Status ${response.status}`);
                }
            } catch (error) {
                console.log(`❌ ${testCase.name}: FAILED - ${error.message}`);
                this.testResults.push({
                    test: testCase.name,
                    status: 'FAILED',
                    error: error.message
                });
            }
        }
    }
    
    async testAdminAPIs() {
        console.log('\n🔧 TESTE 4: APIs ADMINISTRATIVAS');
        console.log('--------------------------------');
        
        const testCases = [
            {
                name: 'Listar Todos Parceiros',
                endpoint: '/api/partners/admin/list',         // ✅ CORRETO
                method: 'GET'
            },
            {
                name: 'Dashboard de Parceiros',
                endpoint: '/api/partners/admin/dashboard',    // ✅ CORRETO
                method: 'GET'
            },
            {
                name: 'Configurações de Comissão',
                endpoint: '/api/admin/partner-settings',
                method: 'GET'
            }
        ];
        
        for (let testCase of testCases) {
            try {
                const response = await this.makeRequest(testCase.method, testCase.endpoint);
                
                if (response.status === 200) {
                    console.log(`✅ ${testCase.name}: SUCCESS`);
                    console.log(`   📊 Tempo: ${response.responseTime}ms`);
                    
                    this.testResults.push({
                        test: testCase.name,
                        status: 'SUCCESS',
                        responseTime: response.responseTime
                    });
                } else {
                    throw new Error(`Status ${response.status}`);
                }
            } catch (error) {
                console.log(`❌ ${testCase.name}: FAILED - ${error.message}`);
                this.testResults.push({
                    test: testCase.name,
                    status: 'FAILED',
                    error: error.message
                });
            }
        }
    }
    
    async testNotificationSystem() {
        console.log('\n📧 TESTE 5: SISTEMA DE NOTIFICAÇÕES');
        console.log('----------------------------------');
        
        const testCases = [
            {
                name: 'Health Check Notificações',
                endpoint: '/api/partner-notifications/health',
                method: 'GET'
            },
            {
                name: 'Status do Sistema',
                endpoint: '/health',
                method: 'GET'
            }
        ];
        
        for (let testCase of testCases) {
            try {
                const response = await this.makeRequest(testCase.method, testCase.endpoint);
                
                if (response.status === 200) {
                    console.log(`✅ ${testCase.name}: SUCCESS`);
                    console.log(`   🟢 Status: ${response.data.status || 'healthy'}`);
                    
                    this.testResults.push({
                        test: testCase.name,
                        status: 'SUCCESS',
                        responseTime: response.responseTime
                    });
                } else {
                    throw new Error(`Status ${response.status}`);
                }
            } catch (error) {
                console.log(`❌ ${testCase.name}: FAILED - ${error.message}`);
                this.testResults.push({
                    test: testCase.name,
                    status: 'FAILED',
                    error: error.message
                });
            }
        }
    }
    
    async makeRequest(method, endpoint, data = null) {
        const startTime = Date.now();
        const url = `${this.baseURL}${endpoint}`;
        
        try {
            let response;
            
            const config = {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (method === 'GET') {
                response = await axios.get(url, config);
            } else if (method === 'POST') {
                response = await axios.post(url, data, config);
            } else if (method === 'PUT') {
                response = await axios.put(url, data, config);
            }
            
            return {
                status: response.status,
                data: response.data,
                responseTime: Date.now() - startTime
            };
        } catch (error) {
            return {
                status: error.response?.status || 500,
                error: error.message,
                responseTime: Date.now() - startTime
            };
        }
    }
    
    generateFinalReport() {
        console.log('\n📊 RELATÓRIO FINAL - SISTEMA DE PARCERIAS');
        console.log('=========================================');
        
        const totalTests = this.testResults.length;
        const successTests = this.testResults.filter(r => r.status === 'SUCCESS').length;
        const failedTests = this.testResults.filter(r => r.status === 'FAILED').length;
        const averageTime = this.testResults
            .filter(r => r.responseTime)
            .reduce((sum, r) => sum + r.responseTime, 0) / this.testResults.filter(r => r.responseTime).length;
        
        console.log(`📈 RESUMO GERAL:`);
        console.log(`   🧪 Total de testes: ${totalTests}`);
        console.log(`   ✅ Sucessos: ${successTests} (${(successTests/totalTests*100).toFixed(1)}%)`);
        console.log(`   ❌ Falhas: ${failedTests} (${(failedTests/totalTests*100).toFixed(1)}%)`);
        console.log(`   ⏱️ Tempo médio: ${averageTime.toFixed(0)}ms`);
        
        console.log(`\n📋 DETALHES DOS TESTES:`);
        this.testResults.forEach((result, index) => {
            const icon = result.status === 'SUCCESS' ? '✅' : '❌';
            console.log(`   ${icon} ${index + 1}. ${result.test} - ${result.responseTime || 'N/A'}ms`);
            if (result.error) {
                console.log(`      ⚠️ Erro: ${result.error}`);
            }
        });
        
        console.log(`\n🎯 AVALIAÇÃO FINAL:`);
        if (successTests / totalTests >= 0.8) {
            console.log('🟢 SISTEMA DE PARCERIAS: APROVADO!');
            console.log('✅ Pronto para produção');
        } else if (successTests / totalTests >= 0.6) {
            console.log('🟡 SISTEMA DE PARCERIAS: PARCIALMENTE FUNCIONAL');
            console.log('⚠️ Revisar falhas antes do deploy');
        } else {
            console.log('🔴 SISTEMA DE PARCERIAS: NECESSITA CORREÇÕES');
            console.log('❌ Muitas falhas detectadas');
        }
        
        console.log('\n=========================================');
        console.log('🎊 TESTE E2E CONCLUÍDO!');
    }
}

// Executar testes E2E
const partnershipTests = new PartnershipE2ETests();
partnershipTests.runCompletePartnershipFlow();