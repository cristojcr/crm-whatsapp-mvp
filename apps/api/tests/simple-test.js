const axios = require('axios');

async function testSingleRequest() {
    console.log('🧪 Testando uma única requisição...');
    
    const payload = {
        entry: [{
            id: 'test_entry',
            changes: [{
                value: {
                    messaging_product: 'whatsapp',
                    messages: [{
                        id: 'test_msg_123',
                        from: '+5511999999999',
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        text: { body: 'Teste simples' },
                        type: 'text'
                    }]
                }
            }]
        }]
    };
    
    try {
        console.log('📤 Enviando payload...');
        
        const response = await axios.post(
            'http://localhost:3001/api/webhook/whatsapp',
            payload,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            }
        );
        
        console.log('✅ Sucesso!');
        console.log('📊 Status:', response.status);
        console.log('📄 Response:', response.data);
        
    } catch (error) {
        console.log('❌ Erro detectado:');
        console.log('📊 Status:', error.response?.status);
        console.log('📄 Data:', error.response?.data);
        console.log('💬 Message:', error.message);
        console.log('🔧 Code:', error.code);
    }
}

testSingleRequest();