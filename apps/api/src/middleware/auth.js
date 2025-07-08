const { supabase, supabaseAdmin } = require('../config/supabase');
const jwt = require('jsonwebtoken');




// Middleware para verificar JWT token
const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔍 DEBUG AUTHENTICATE TOKEN - Iniciando');
    
    const authHeader = req.headers['authorization'];
    console.log('🔍 Authorization header:', authHeader ? 'PRESENTE' : 'AUSENTE');
    
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    console.log('🔍 Token extraído:', token ? `${token.substring(0, 20)}...` : 'NENHUM');

    if (!token) {
      console.log('❌ Token não fornecido');
      return res.status(401).json({
        error: 'Token de acesso requerido',
        message: 'Faça login para acessar este recurso'
      });
    }

    console.log('🔍 Verificando token com Supabase...');
    
    // Verificar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    console.log('🔍 Resposta Supabase - User:', user ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
    console.log('🔍 Resposta Supabase - Error:', error?.message || 'NENHUM');

    if (error || !user) {
      console.log('❌ Token inválido ou expirado');
      return res.status(403).json({
        error: 'Token inválido ou expirado',
        message: 'Faça login novamente'
      });
    }

    // Adicionar usuário à request
    req.user = user;
    req.token = token;
    console.log('✅ User definido no req.user:', user.email);
    next();

  } catch (error) {
    console.error('❌ Erro na autenticação:', error);
    return res.status(500).json({
      error: 'Erro interno de autenticação',
      message: 'Tente novamente mais tarde'
    });
  }
};

// Middleware para verificar se usuário é admin
const requireAdmin = async (req, res, next) => {
  try {
    console.log('🔍 DEBUG REQUIRE ADMIN - Iniciando verificação');
    console.log('🔍 User do token:', req.user?.email);
    
    if (!req.user) {
      console.log('❌ Usuário não encontrado no token');
      return res.status(401).json({
        error: 'Usuário não autenticado'
      });
    }

    console.log('🔍 Procurando admin com email:', req.user.email);
    
    // Usar supabaseAdmin para verificar admin_users (bypassa RLS)
    const { data: admin, error } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('email', req.user.email)
      .eq('status', 'active')
      .single();

    console.log('🔍 Admin encontrado:', admin ? 'SIM' : 'NÃO');
    console.log('🔍 Erro na busca:', error?.message || 'Nenhum');

    if (error || !admin) {
      console.log('❌ Admin não encontrado ou inativo');
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Apenas administradores podem acessar este recurso'
      });
    }

    req.admin = admin;
    console.log('✅ Admin autenticado:', admin.email);
    next();
  } catch (error) {
    console.error('❌ Erro no requireAdmin:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: 'Tente novamente mais tarde'
    });
  }
};

// Middleware opcional - não falha se não houver token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        req.user = user;
        req.token = token;
      }
    }

    next(); // Continua independentemente
  } catch (error) {
    console.error('Erro na autenticação opcional:', error);
    next(); // Continua mesmo com erro
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth
};