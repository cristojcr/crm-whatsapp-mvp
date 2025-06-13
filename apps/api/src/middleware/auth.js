const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// Middleware para verificar JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Token de acesso requerido',
        message: 'Faça login para acessar este recurso'
      });
    }

    // Verificar token com Supabase
    
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({
        error: 'Token inválido ou expirado',
        message: 'Faça login novamente'
      });
    }

    // Adicionar usuário à request
    req.user = user;
    req.token = token;
    next();

  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(500).json({
      error: 'Erro interno de autenticação',
      message: 'Tente novamente mais tarde'
    });
  }
};

// Middleware para verificar se usuário é admin
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuário não autenticado'
      });
    }

    // Verificar se usuário tem role admin no metadata
    const isAdmin = req.user.app_metadata?.role === 'admin' || 
                   req.user.user_metadata?.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Apenas administradores podem acessar este recurso'
      });
    }

    next();
  } catch (error) {
    console.error('Erro na verificação de admin:', error);
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