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
console.log('🔧 ARQUIVO PARTNERS.JS CARREGADO COM SUCESSO!');
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Importar Supabase Client
const supabase = require('./src/config/supabase');
// Importar Compliance Service para jobs automáticos (ID 2.15)
const ComplianceService = require('./src/services/compliance-service');

// Importar rotas
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const contactsRoutes = require('./src/routes/contacts');
const companiesRoutes = require('./src/routes/companies');
const companySettingsRoutes = require('./src/routes/company-settings');
const userProfileRoutes = require('./src/routes/user-profile');
const webhookRoutes = require('./src/routes/webhook');
const productRoutes = require('./src/routes/products');
const instagramRoutes = require('./src/routes/instagram');
const telegramRoutes = require('./src/routes/telegram');
const channelRoutes = require('./src/routes/channels');
const telegramSetupRoutes = require('./src/routes/telegram-setup');
const instagramSetupRoutes = require('./src/routes/instagram-setup');
const instagramAuthRoutes = require('./src/routes/instagram-auth');
const whiteLabelRoutes = require('./src/routes/white-label');
const pricingRoutes = require('./src/routes/pricing');
const tenantMiddleware = require('./src/middleware/tenant-middleware');
// Rotas de compliance e templates (ID 2.15)
const templatesRoutes = require('./src/routes/templates');
// const complianceRoutes = require('./src/routes/compliance');
const dataProtectionRoutes = require('./src/routes/data-protection');
const DataProtectionMiddleware = require('./src/middleware/data-protection-middleware');
// Rotas de profissionais (NOVA)
const professionalsRoutes = require('./src/routes/professionals');
console.log('🛍️ Product routes carregadas:', typeof productRoutes);
console.log('🔍 DEBUGANDO IMPORTS:');
console.log('📸 Instagram routes:', typeof instagramRoutes);
console.log('🤖 Telegram routes:', typeof telegramRoutes);
console.log('📱 Channel routes:', typeof channelRoutes);
console.log('💡 authRoutes:', typeof authRoutes);
console.log('👥 userRoutes:', typeof userRoutes);
// Novas rotas do Motor de Agenda (ID 2.9)                    
const appointmentsRoutes = require('./src/routes/appointments');
const servicesRoutes = require('./src/routes/services');
const { optionalAuth, authenticateToken } = require('./src/middleware/auth');

const AlertSystem = require('./src/services/alert-system');
const alertSystem = new AlertSystem();
const ReportSystem = require('./src/services/report-system');
const reportSystem = new ReportSystem();
const notificationRoutes = require('./src/routes/notifications');
const statisticsRoutes = require('./src/routes/statistics');
const cron = require('node-cron');
const NotificationSystem = require('./src/services/notification-system');

// Iniciar sistema de relatórios automáticos
reportSystem.startPeriodicReports(24); // Gerar relatórios a cada 24 horas

// Iniciar monitoramento de alertas
setInterval(async () => {
    await alertSystem.checkSystemHealth();
}, 60000); // Verificar a cada 1 minuto

const app = express();
// Inicializar sistema de notificações
const notificationSystem = new NotificationSystem();
const PORT = process.env.PORT || 3001;

// Configurar trust proxy para Railway
app.set('trust proxy', true);

// Configurar CSP para permitir scripts inline no dashboard
app.use('/admin', (req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  );
  next();
});

// Configurar headers para dashboard
app.use('/statistics-dashboard.html', (req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self';"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// Middlewares de segurança
// Helmet para todas as rotas, EXCETO admin
app.use('/admin', (req, res, next) => next()); // Pular helmet no admin
// app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));


// Rate limiting inteligente para produção e desenvolvimento
app.set('trust proxy', 1); // Confia no primeiro proxy (essencial para o Railway)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: (req, res) => (process.env.NODE_ENV === 'production' ? 100 : 1000), // Mais restritivo em produção
  message: {
    success: false,
    error: 'Muitas requisições originadas deste IP. Por favor, tente novamente após 15 minutos.'
  },
  standardHeaders: true, // Retorna os headers de limite
  legacyHeaders: false, // Desabilita os headers antigos `X-RateLimit-*`
});

app.use(limiter);
app.use(limiter);

// Middleware opcional de auth para todas as rotas
app.use(optionalAuth);
app.use(tenantMiddleware.resolveTenant);

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

// Servir arquivos estáticos
app.use(express.static('public'));



// Rota para dashboard de notificações
app.get('/notifications-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'notifications-dashboard.html'));
});

// Rota para dashboard de estatísticas
app.get('/statistics-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'statistics-dashboard.html'));
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
      'webhook.whatsapp.receive': 'POST /api/webhook/whatsapp',

      // Produtos
      'products.list': 'GET /api/products',
      'products.create': 'POST /api/products',
      'products.get': 'GET /api/products/:id',
      'products.update': 'PUT /api/products/:id',
      'products.delete': 'DELETE /api/products/:id',

      // Motor de Agenda (ID 2.9)
      'appointments.list': 'GET /api/appointments',
      'appointments.create': 'POST /api/appointments',
      'appointments.get': 'GET /api/appointments/:id',
      'appointments.update': 'PUT /api/appointments/:id',
      'appointments.cancel': 'DELETE /api/appointments/:id',
      'appointments.availability': 'GET /api/appointments/availability',
      'appointments.metrics': 'GET /api/appointments/metrics',
      'appointments.process': 'POST /api/appointments/process-message',
      'services.list': 'GET /api/services', 
      'services.create': 'POST /api/services',
      'services.get': 'GET /api/services/:id',
      'services.update': 'PUT /api/services/:id',
      'services.delete': 'DELETE /api/services/:id',
      'services.reorder': 'POST /api/services/reorder',

      // Alertas e Monitoramento (ID 2.7)
      'admin.alerts': 'GET /api/admin/alerts',
      'admin.alerts.resolve': 'POST /api/admin/alerts/:id/resolve',

      // Estatísticas (ID 2.11)
      'statistics.overview': 'GET /api/statistics/overview',
      'statistics.users': 'GET /api/statistics/users?period=30d',
      'statistics.ai': 'GET /api/statistics/ai?period=30d',
      'statistics.conversations': 'GET /api/statistics/conversations?period=30d',
      'statistics.appointments': 'GET /api/statistics/appointments?period=30d',
      'statistics.financial': 'GET /api/statistics/financial?period=30d',
      'statistics.growth': 'GET /api/statistics/growth?period=30d',
      'statistics.custom': 'POST /api/statistics/custom',
      'statistics.available': 'GET /api/statistics/available-metrics',
      // Sistema Multicanal (ID 2.12)
      'channels.list': 'GET /api/channels',
      'channels.configure': 'POST /api/channels/configure',
      'channels.status': 'GET /api/channels/status',
      'telegram.setup': 'POST /api/telegram-setup/create-bot',
      'telegram.webhook': 'POST /api/telegram-setup/configure-webhook',
      'instagram.setup': 'POST /api/instagram-setup/configure',
      'instagram.test': 'POST /api/instagram-setup/test-connection'
    },
    database: {
      provider: 'Supabase (PostgreSQL)',
      status: 'connected'
    },
    features: {
      ai_dual: 'DeepSeek + OpenAI',
      optimization: 'Ativada (ID 2.7)',
      cache: 'Inteligente',
      fallback: 'Multi-nível',
      alerts: 'Sistema de alertas automático'
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

// Rotas de profissionais (ID 2.17) - PROTEGIDAS
app.use('/api/professionals', professionalsRoutes);
// Rotas do Google Calendar Multi-Profissional (ID 2.17.2)
// Rotas de produts (ID 2.18)
app.use('/api/products', require('./src/routes/products'));
app.use('/api/calendar', require('./src/routes/calendar'));

// Rotas de subscription (limites de plano) - PROTEGIDAS  
app.use('/api/subscription', require('./src/routes/subscription'));

// Rotas de contatos
// app.use('/api/contacts', contactsRoutes);

// Rotas de empresas
app.use('/api/companies', companiesRoutes);

// Rotas de configurações de empresa
app.use('/api/company-settings', companySettingsRoutes);

// Rotas de perfil de usuário
app.use('/api/user-profile', userProfileRoutes);

// Rotas de webhook
app.use('/api/webhook', webhookRoutes);
// Rotas de produtos
app.use('/api/products', productRoutes);
// Rotas multicanal (ID 2.12)
// Rotas consentimentos
app.use('/api/consent-bulk', require('./src/routes/consent-bulk'));
console.log('🔧 REGISTRANDO ROTAS MULTICANAL...');
console.log('📸 Registrando /api/instagram...');
app.use('/api/instagram', instagramRoutes);
console.log('🤖 Registrando /api/telegram...');
app.use('/api/telegram', telegramRoutes);
console.log('📱 Registrando /api/channels...');
app.use('/api/channels', channelRoutes);
console.log('✅ ROTAS MULTICANAL REGISTRADAS!');
app.use('/api/webhook/instagram', instagramRoutes);
app.use('/api/webhook/telegram', telegramRoutes);
// Rotas de setup multicanal (ID 2.12)
app.use('/api/telegram-setup', telegramSetupRoutes);
app.use('/api/instagram-setup', instagramSetupRoutes);

app.use('/auth/instagram', instagramAuthRoutes);
// Novas rotas do Motor de Agenda
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/statistics', statisticsRoutes);
// Outras rotas...

// Rotas do Sistema de Parcerias (ID 2.13)
app.use('/api/partners', require('./src/routes/partners'));
app.use('/api/partner-notifications', require('./src/routes/partner-notifications'));
app.use('/api/admin/partner-settings', require('./src/routes/admin/partner-settings-backend'));
app.use('/api/admin/commissions', require('./src/routes/admin/commissions'));

// ==================== ROTAS DE ALERTAS (ID 2.7) ====================
// Rota para ver alertas
app.get('/api/admin/alerts', (req, res) => {
  try {
    const summary = alertSystem.getAlertsSummary();
    const recent = alertSystem.getRecentAlerts(24);
    res.json({
      success: true,
      summary,
      recent_alerts: recent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao buscar alertas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar alertas',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Rota para resolver alertas
app.post('/api/admin/alerts/:id/resolve', (req, res) => {
  try {
    const { id } = req.params;
    const alert = alertSystem.resolveAlert(id);
    if (alert) {
      res.json({ 
        success: true, 
        alert,
        message: 'Alerta resolvido com sucesso',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({ 
        success: false,
        error: 'Alerta não encontrado',
        alert_id: id,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Erro ao resolver alerta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao resolver alerta',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== ROTA DO DASHBOARD (ID 2.7) ====================
// Servir arquivos estáticos (dashboard)
app.use('/admin', express.static('public'));

// Rota específica do dashboard
app.get('/admin-dashboard', (req, res) => {
  res.redirect('/admin/admin-dashboard.html');
});
// Rota para gerar relatório manual
app.get('/api/admin/reports/generate', async (req, res) => {
  try {
    const report = await reportSystem.generateDailyReport();
    res.json({
      success: true,
      report,
      message: 'Relatório gerado com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao gerar relatório',
      message: error.message
    });
  }
});

// Rota para ver resumo de relatórios
app.get('/api/admin/reports/summary', (req, res) => {
  try {
    const summary = reportSystem.getReportSummary();
    res.json({
      success: true,
      summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar resumo de relatórios',
      message: error.message
    });
  }
});

// ==================== ROTAS DE NOTIFICAÇÕES (ID 2.7) ====================
// Rota para testar notificações
app.get('/api/admin/notifications/test', async (req, res) => {
  try {
    const results = await alertSystem.notificationSystem.testNotifications();
    res.json({
      success: true,
      results,
      message: 'Teste de notificações executado',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao testar notificações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao testar notificações',
      message: error.message
    });
  }
});

// Rota para ver status das notificações
app.get('/api/admin/notifications/status', (req, res) => {
  try {
    const status = alertSystem.notificationSystem.getStatus();
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao buscar status:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar status de notificações'
    });
  }
});

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

app.use('/api/white-label', whiteLabelRoutes);
app.use('/api/pricing', pricingRoutes);
// Rotas de compliance e templates (ID 2.15)
app.use('/api/templates', templatesRoutes);
// app.use('/api/compliance', complianceRoutes);
// Rotas de proteção de dados LGPD/GDPR (ID 2.16)
app.use(DataProtectionMiddleware.auditMiddleware);
app.use('/api/data-protection', dataProtectionRoutes);
const consentFormRoutes = require('./src/routes/consent-form');
app.use('/api/consent-form', consentFormRoutes);
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
      'POST /api/webhook/whatsapp',
      'GET /api/admin/alerts',
      'POST /api/admin/alerts/:id/resolve'
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
    
    // Agendar processamento automático de lembretes
    // Executa a cada 30 minutos
    cron.schedule('*/30 * * * *', async () => {
      console.log('🤖 Executando processamento automático de lembretes...');
      try {
        await notificationSystem.processAutomaticReminders();
      } catch (error) {
        console.error('❌ Erro no cron job:', error.message);
      }
    });

        // Agendar verificação de janelas expiradas (ID 2.15)
    // Executa a cada 15 minutos
    cron.schedule('*/15 * * * *', async () => {
      console.log('🚨 Executando verificação de compliance...');
      try {
        await ComplianceService.checkExpiredWindows();
        console.log('✅ Verificação de compliance concluída');
      } catch (error) {
        console.error('❌ Erro no job de compliance:', error.message);
      }
    });

    console.log('✅ Cron job de notificações configurado (a cada 30 minutos)');
    console.log('✅ Cron job de compliance configurado (a cada 15 minutos)');   
    
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
      console.log(`🚨 Alertas: http://localhost:${PORT}/api/admin/alerts`);
      console.log('🌐 Instagram: http://localhost:${PORT}/api/instagram');
      console.log('🤖 Telegram: http://localhost:${PORT}/api/telegram');
      console.log('📱 Gestão de canais: http://localhost:${PORT}/api/channels');
      console.log('🔗 Webhook Instagram: http://localhost:${PORT}/api/webhook/instagram');
      console.log('🔗 Webhook Telegram: http://localhost:${PORT}/api/webhook/telegram');
      console.log('🔧 Setup Telegram: http://localhost:${PORT}/api/telegram-setup');
      console.log('🔧 Setup Instagram: http://localhost:${PORT}/api/instagram-setup');
      console.log('📅 Google Calendar: http://localhost:${PORT}/api/calendar');
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