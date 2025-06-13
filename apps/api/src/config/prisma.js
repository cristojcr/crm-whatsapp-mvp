const { PrismaClient } = require('@prisma/client');

// Configuração do Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  errorFormat: 'pretty'
});

// Função para conectar ao banco
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Prisma conectado ao Supabase PostgreSQL');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar Prisma:', error);
    return false;
  }
}

// Função para desconectar
async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Prisma desconectado');
  } catch (error) {
    console.error('❌ Erro ao desconectar Prisma:', error);
  }
}

// Função para testar conexão
async function testConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Teste de conexão Prisma: OK');
    return true;
  } catch (error) {
    console.error('❌ Teste de conexão Prisma falhou:', error);
    return false;
  }
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
  testConnection
};