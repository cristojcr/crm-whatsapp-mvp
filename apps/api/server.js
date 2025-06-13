const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: '.env' });

// Importar configurações
const { createClient } = require('./src/config/supabase');
const { prisma, connectDatabase, testConnection } = require('./src/config/prisma');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de segurança
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // limite de requests por IP
  message: 'Muitas tentativas, tente novamente em 15 minutos.'
});
app.use(limiter);

// Middleware para adicionar Prisma nas requests
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Rotas principais
app.get('/', (req, res) => {
  res.json({
    message: '🚀 CRM WhatsApp API - Online!',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

app.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Testar apenas conexão Prisma (sem Supabase por enquanto)
    const prismaOk = await testConnection().catch(() => false);
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      connections: {
        prisma: prismaOk ? 'connected' : 'disconnected',
        supabase: 'pending' // Temporariamente removido
      },
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api', (req, res) => {
  res.json({
    name: 'CRM WhatsApp API',
    version: '1.0.0',
    description: 'API REST para CRM WhatsApp Inteligente',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      contacts: '/api/contacts',
      conversations: '/api/conversations',
      messages: '/api/messages',
      calendar: '/api/calendar',
      ai: '/api/ai',
      webhooks: '/api/webhooks'
    },
    database: {
      orm: 'Prisma',
      provider: 'PostgreSQL',
      host: 'Supabase'
    },
    status: 'operational'
  });
});

// Rota de teste do Prisma
app.get('/api/test-prisma', async (req, res) => {
  try {
    // Contar registros em cada tabela
    const stats = {
      users: await prisma.user.count(),
      contacts: await prisma.contact.count(),
      conversations: await prisma.conversation.count(),
      messages: await prisma.message.count(),
      calendar: await prisma.calendar.count(),
      aiInteractions: await prisma.aIInteraction.count()
    };
    
    res.json({
      message: '✅ Prisma funcionando!',
      database: 'PostgreSQL via Supabase',
      tables: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      message: '❌ Erro no Prisma',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Middleware de erro global
app.use((error, req, res, next) => {
  console.error('❌ Erro:', error);
  res.status(500).json({
    message: 'Erro interno do servidor',
    timestamp: new Date().toISOString()
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Rota não encontrada',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Inicializar servidor
async function startServer() {
  try {
    // Tentar conectar Prisma (não obrigatório)
    const prismaConnected = await connectDatabase();
    if (!prismaConnected) {
      console.log('⚠️ Prisma não conectou, mas servidor vai iniciar mesmo assim');
    }
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('🚀 CRM WhatsApp API está rodando!');
      console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`🗄️ Database: PostgreSQL via Supabase`);
      console.log(`🔧 ORM: Prisma`);
      console.log(`📊 Health: http://localhost:${PORT}/health`);
      console.log(`🧪 Teste Prisma: http://localhost:${PORT}/api/test-prisma`);
      console.log(`⚡ API: http://localhost:${PORT}/api`);
      console.log(`📅 Iniciado em: ${new Date().toISOString()}`);
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Desligando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM recebido, desligando...');
  await prisma.$disconnect();
  process.exit(0);
});

// Iniciar
startServer();