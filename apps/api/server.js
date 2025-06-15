// Debug e carregamento de variáveis PRIMEIRO
console.log('📂 Carregando variáveis de ambiente...');

// Carregar .env.local da pasta atual
require('dotenv').config({ 
  path: require('path').join(__dirname, '.env.local')
});

// Debug das variáveis CRÍTICAS
console.log('🔍 DEBUG VARIÁVEIS:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('URL Supabase:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING');
console.log('ANON Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'OK' : 'MISSING');
console.log('SERVICE Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'MISSING');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'OK' : 'MISSING');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Importar Supabase Client (agora que as variáveis estão OK)
const supabase = require('./src/config/supabase');
// const { prisma, connectDatabase, testConnection } = require('./src/config/prisma');

// Importar rotas (comentar se der erro)
// const authRoutes = require('./src/routes/auth');
// const userRoutes = require('./src/routes/users');
// const { optionalAuth, authenticateToken } = require('./src/middleware/auth');
// Importar rotas
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const contactsRoutes = require('./src/routes/contacts');
const { optionalAuth, authenticateToken } = require('./src/middleware/auth');
const companiesRoutes = require('./src/routes/companies');
const companySettingsRoutes = require('./src/routes/company-settings');
const userProfileRoutes = require('./src/routes/user-profile');
const webhookRoutes = require('./src/routes/webhook');

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar trust proxy para Railway
app.set('trust proxy', true);

// Middlewares de segurança
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // limite de requests por IP
  message: 'Muitas tentativas, tente novamente em 15 minutos.',
  trustProxy: false  // ← ADICIONAR ESTA LINHA
});
app.use(limiter);

// Middleware para adicionar Prisma nas requests
// app.use((req, res, next) => {
//   req.prisma = prisma;
//   next();
// });
// Middleware opcional de auth para todas as rotas
app.use(optionalAuth);

// Rotas de autenticação
app.use('/api/auth', authRoutes);

// Rotas de usuários (protegidas)
app.use('/api/users', userRoutes);

// Rotas contacts
app.use('/api/contacts', contactsRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/company-settings', companySettingsRoutes);
app.use('/api/user-profile', userProfileRoutes);
app.use('/api/webhook', webhookRoutes);

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
    // Testar conexão Supabase
    let supabaseStatus = 'disconnected';
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
      supabaseStatus = error ? 'error' : 'connected';
    } catch (err) {
      console.error('Erro ao testar Supabase:', err.message);
      supabaseStatus = 'error';
    }
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      connections: {
        prisma: 'disabled',
        supabase: supabaseStatus
      },
      memory: process.memoryUsage()
    });
  } catch (error) {
    console.error('❌ Erro no health check:', error);
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
    authentication: {
      type: 'JWT Bearer Token',
      login: '/api/auth/login',
      register: '/api/auth/register',
      refresh: '/api/auth/refresh'
    },
    endpoints: {
      // Autenticação
      'auth.login': 'POST /api/auth/login',
      'auth.register': 'POST /api/auth/register',
      'auth.logout': 'POST /api/auth/logout',
      'auth.me': 'GET /api/auth/me',
      'auth.refresh': 'POST /api/auth/refresh',
      'auth.forgot': 'POST /api/auth/forgot-password',
      
      // Usuários
      'users.list': 'GET /api/users',
      'users.get': 'GET /api/users/:id',
      'users.update': 'PUT /api/users/:id',
      'users.delete': 'DELETE /api/users/:id (admin)',
      'users.stats': 'GET /api/users/:id/stats',

      // Adicionar após os endpoints existentes
      'companies.list': 'GET /api/companies',
      'companies.create': 'POST /api/companies',
      'companies.get': 'GET /api/companies/:id',
      'companies.update': 'PUT /api/companies/:id',
      'companies.delete': 'DELETE /api/companies/:id',

      // Configurações de empresa
      'company-settings.get': 'GET /api/company-settings/:companyId',
      'company-settings.update': 'PUT /api/company-settings/:companyId',

      // Perfil de usuário
      'user-profile.me': 'GET /api/user-profile/me',
      'user-profile.update': 'PUT /api/user-profile/me',
      'user-profile.get': 'GET /api/user-profile/:id',
      'user-profile.role': 'PUT /api/user-profile/:id/role',
      'user-profile.company': 'PUT /api/user-profile/:id/company',

      // webhook whatsapp:
      'webhook.whatsapp.verify': 'GET /api/webhook/whatsapp',
      'webhook.whatsapp.receive': 'POST /api/webhook/whatsapp',
      
      // Outros endpoints
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
    status: 'operational',
    authenticated_user: req.user ? {
      id: req.user.id,
      email: req.user.email
    } : null
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

// Rota de teste protegida
app.get('/api/test-auth', authenticateToken, async (req, res) => {
  try {
    res.json({
      message: '🔒 Rota protegida funcionando!',
      user: {
        id: req.user.id,
        email: req.user.email,
        authenticated_at: new Date().toISOString()
      },
      token_info: {
        valid: true,
        provider: 'Supabase Auth'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro no teste de autenticação',
      message: error.message
    });
  }
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
    console.log('🚀 Iniciando servidor...');
    
    // Por enquanto, vamos pular a conexão Prisma
    // const prismaConnected = await connectDatabase();
    console.log('⚠️ Prisma temporariamente desabilitado');
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('🚀 CRM WhatsApp API está rodando!');
      console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`🗄️ Database: PostgreSQL via Supabase`);
      console.log(`🔧 ORM: Prisma (temporariamente desabilitado)`);
      console.log(`📊 Health: http://localhost:${PORT}/health`);
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