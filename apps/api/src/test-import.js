// Carregar variáveis de ambiente primeiro
require('dotenv').config({ path: '.env.local' });

try {
  const processor = require('./services/message-processor');
  console.log('✅ IMPORT FUNCIONOU!');
  console.log('✅ Message processor carregado com sucesso');
} catch (error) {
  console.log('❌ ERRO IMPORT:', error.message);
  console.log('❌ STACK:', error.stack);
}