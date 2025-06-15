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

// Importar Supabase Client
const supabase = require('./src/config/supabase');

// Importar rotas
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const contactsRoutes = require('./src/routes/contacts');
const companiesRoutes = require('./src/routes/companies');
const companySettingsRoutes = require('./src/routes/company-settings');
const userProfileRoutes = require('./src/routes/user-profile');
const webhookRoutes = require('./src/routes/webhook');
const { optionalAuth, authenticateToken } = require('./src/middleware/auth');

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
  trustProxy: false
});
app.use(limiter);

// Middleware opcional de auth para todas as rotas
app.use(optionalAuth);

// ============================================
// ROTAS PRINCIPAIS
// ============================================

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: '🚀 CRM WhatsApp API - Online!',
    version: '2.7.1',
    documentation: '/api/docs',
    health: '/health',
    timestamp: new Date().toISOString()
  });
});

// Health Check Endpoint (OTIMIZADO)
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Testar conexão Supabase
    let supabaseStatus = 'disconnected';
    let supabaseError = null;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
      supabaseStatus = error ? 'error' : 'connected';
      if (error) supabaseError = error.message;
    } catch (err) {
      console.error('Erro ao testar Supabase:', err.message);
      supabaseStatus = 'error';
      supabaseError = err.message;
    }
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.7.1',
      uptime: Math.floor(process.uptime()),
      responseTime: `${responseTime}ms`,
      connections: {
        supabase: {
          status: supabaseStatus,
          error: supabaseError
        }
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      },
      performance: {
        uptime: `${Math.floor(process.uptime() / 60)}m ${Math.floor(process.uptime() % 60)}s`,
        responseTime: responseTime
      }
    });
  } catch (error) {
    console.error('❌ Erro no health check:', error);
    res.status(500).json({
      status: 'unhealthy',
      message: error.message,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`
    });
  }
});

// API Documentation
app.get('/api', (req, res) => {
  res.json({
    name: 'CRM WhatsApp API',
    version: '2.7.1',
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

      // Empresas
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

      // Contatos
      'contacts.list': 'GET /api/contacts',
      'contacts.create': 'POST /api/contacts',
      'contacts.get': 'GET /api/contacts/:id',
      'contacts.update': 'PUT /api/contacts/:id',
      'contacts.delete': 'DELETE /api/contacts/:id',

      // Webhook WhatsApp
      'webhook.whatsapp.verify': 'GET /api/webhook/whatsapp',
      'webhook.whatsapp.receive': 'POST /api/webhook/whatsapp'
    },
    database: {
      provider: 'Supabase (PostgreSQL)',
      status: 'connected'
    },
    features: {
      ai_dual: 'DeepSeek + OpenAI',
      optimization: 'Ativada (ID 2.7)',
      cache: 'Inteligente',
      fallback: 'Multi-nível'
    },
    status: 'operational',
    authenticated_user: req.user ? {
      id: req.user.id,
      email: req.user.email
    } : null,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// ROTAS DA API
// ============================================

// Rotas de autenticação
app.use('/api/auth', authRoutes);

// Rotas de usuários (protegidas)
app.use('/api/users', userRoutes);

// Rotas de contatos
app.use('/api/contacts', contactsRoutes);

// Rotas de empresas
app.use('/api/companies', companiesRoutes);

// Rotas de configurações de empresa
app.use('/api/company-settings', companySettingsRoutes);

// Rotas de perfil de usuário
app.use('/api/user-profile', userProfileRoutes);

// Rotas de webhook
app.use('/api/webhook', webhookRoutes);

// ============================================
// ROTAS DE TESTE E DEBUG
// ============================================

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

// Rota de teste do banco
app.get('/api/test-database', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (error) throw error;

    res.json({
      message: '✅ Banco de dados funcionando!',
      database: 'Supabase PostgreSQL',
      test_query: 'SELECT COUNT(*) FROM users',
      result: 'success',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      message: '❌ Erro no banco de dados',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// MIDDLEWARES DE ERRO
// ============================================

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Rota não encontrada',
    path: req.originalUrl,
    available_endpoints: [
      'GET /',
      'GET /health',
      'GET /api',
      'POST /api/auth/login',
      'GET /api/webhook/whatsapp',
      'POST /api/webhook/whatsapp'
    ],
    timestamp: new Date().toISOString()
  });
});

// Middleware de erro global
app.use((error, req, res, next) => {
  console.error('❌ Erro:', error);
  res.status(500).json({
    message: 'Erro interno do servidor',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================

// Inicializar servidor
async function startServer() {
  try {
    console.log('🚀 Iniciando servidor...');
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('');
      console.log('🎉 ===================================');
      console.log('🚀   CRM WhatsApp API - ONLINE!     ');
      console.log('🎉 ===================================');
      console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 URL Local: http://localhost:${PORT}`);
      console.log(`🏭 URL Produção: https://escalabots-backend-production.up.railway.app`);
      console.log(`🗄️  Database: Supabase PostgreSQL`);
      console.log(`📊 Health: http://localhost:${PORT}/health`);
      console.log(`⚡ API Docs: http://localhost:${PORT}/api`);
      console.log(`🤖 Webhook: http://localhost:${PORT}/api/webhook/whatsapp`);
      console.log(`📅 Iniciado: ${new Date().toLocaleString('pt-BR')}`);
      console.log('🎉 ===================================');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar servidor:', error);
    process.exit(1);
  }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGINT', async () => {
  console.log('\n🛑 Desligando servidor graciosamente...');
  console.log('✅ Servidor finalizado com sucesso');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM recebido, desligando...');
  console.log('✅ Servidor finalizado com sucesso');
  process.exit(0);
});

// Iniciar servidor
startServer();