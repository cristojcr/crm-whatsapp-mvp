const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// =============================================================================
// MIDDLEWARE DE SEGURANÇA E PERFORMANCE
// =============================================================================

// Helmet para headers de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configurado
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.vercel.app']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression para responses
app.use(compression());

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // requests por IP
  message: {
    error: 'Muitas requisições deste IP, tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================================================
// HEALTH CHECK E ROTAS BÁSICAS
// =============================================================================

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 CRM WhatsApp API - Online!',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// API Info
app.get('/api', (req, res) => {
  res.json({
    name: 'CRM WhatsApp API',
    version: '1.0.0',
    description: 'API REST para CRM WhatsApp Inteligente',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users', 
      conversations: '/api/conversations',
      messages: '/api/messages',
      calendar: '/api/calendar',
      billing: '/api/billing',
      webhooks: '/api/webhooks'
    },
    status: 'operational'
  });
});

// =============================================================================
// ROTAS DA API (placeholder - implementaremos depois)
// =============================================================================

// Rota de teste para Supabase
app.get('/api/test-db', async (req, res) => {
  try {
    // Teste de conexão com Supabase será implementado
    res.json({
      message: 'Database connection test',
      status: 'pending_implementation'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database connection failed',
      message: error.message
    });
  }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    message: `Rota ${req.method} ${req.originalUrl} não existe`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api',
      'GET /api/test-db'
    ]
  });
});

// Error Handler Global
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : error.message,
    code: error.code || 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

// =============================================================================
// START SERVER
// =============================================================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 CRM WhatsApp API está rodando!
📍 Ambiente: ${process.env.NODE_ENV || 'development'}
🌐 URL: http://localhost:${PORT}
📊 Health: http://localhost:${PORT}/health
📚 API: http://localhost:${PORT}/api
⏰ Iniciado em: ${new Date().toISOString()}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido, finalizando servidor...');
  server.close(() => {
    console.log('✅ Servidor finalizado gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recebido, finalizando servidor...');
  server.close(() => {
    console.log('✅ Servidor finalizado gracefully');
    process.exit(0);
  });
});

module.exports = app;