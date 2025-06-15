// Testar import do processador
try {
  console.log('🧪 Testando import do message-processor...');
  const messageProcessor = require('./src/services/message-processor');
  console.log('✅ Import bem sucedido!');
  console.log('📦 Processador carregado:', typeof messageProcessor);
} catch (error) {
  console.error('❌ Erro no import:', error.message);
  console.error('📍 Stack:', error.stack);
}