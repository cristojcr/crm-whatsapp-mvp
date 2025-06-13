const express = require('express');
const rateLimit = require('express-rate-limit');
const { createClient } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { prisma } = require('../config/prisma');

const router = express.Router();

// Rate limiting para autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: {
    error: 'Muitas tentativas de login',
    message: 'Tente novamente em 15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// POST /api/auth/register - Registrar novo usuário
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    // Validações básicas
    if (!email || !password) {
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Email e senha são obrigatórios'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Senha muito fraca',
        message: 'A senha deve ter pelo menos 6 caracteres'
      });
    }

    // Criar usuário no Supabase Auth
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || null,
          phone: phone || null
        }
      }
    });

    if (error) {
      return res.status(400).json({
        error: 'Erro ao criar usuário',
        message: error.message
      });
    }

    // Criar registro no Prisma (se conectado)
    try {
      await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email,
          name: name || null,
          phone: phone || null
        }
      });
    } catch (prismaError) {
      console.warn('Erro ao criar usuário no Prisma:', prismaError);
      // Não falha se Prisma der erro
    }

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: name,
        phone: phone,
        email_confirmed: data.user.email_confirmed_at ? true : false
      },
      session: data.session
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao processar registro'
    });
  }
});

// POST /api/auth/login - Login de usuário
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Email e senha são obrigatórios'
      });
    }

    // Login no Supabase
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        message: error.message
      });
    }

    // Buscar dados completos do usuário (se Prisma conectado)
    let userData = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name || null,
      phone: data.user.user_metadata?.phone || null
    };

    try {
      const prismaUser = await prisma.user.findUnique({
        where: { id: data.user.id }
      });
      if (prismaUser) {
        userData = {
          ...userData,
          ...prismaUser
        };
      }
    } catch (prismaError) {
      console.warn('Erro ao buscar usuário no Prisma:', prismaError);
    }

    res.json({
      message: 'Login realizado com sucesso',
      user: userData,
      session: data.session,
      access_token: data.session.access_token
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao processar login'
    });
  }
});

// POST /api/auth/logout - Logout de usuário
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Erro no logout:', error);
    }

    res.json({
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao processar logout'
    });
  }
});

// GET /api/auth/me - Dados do usuário atual
router.get('/me', authenticateToken, async (req, res) => {
  try {
    let userData = {
      id: req.user.id,
      email: req.user.email,
      name: req.user.user_metadata?.name || null,
      phone: req.user.user_metadata?.phone || null,
      email_confirmed: req.user.email_confirmed_at ? true : false,
      created_at: req.user.created_at
    };

    // Buscar dados completos no Prisma (se conectado)
    try {
      const prismaUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          conversations: {
            take: 5,
            orderBy: { lastMessageAt: 'desc' }
          }
        }
      });

      if (prismaUser) {
        userData = {
          ...userData,
          ...prismaUser,
          stats: {
            totalConversations: prismaUser.conversations.length
          }
        };
      }
    } catch (prismaError) {
      console.warn('Erro ao buscar dados no Prisma:', prismaError);
    }

    res.json({
      user: userData
    });

  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao buscar dados do usuário'
    });
  }
});

// POST /api/auth/refresh - Renovar token
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Refresh token obrigatório'
      });
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({
        error: 'Refresh token inválido',
        message: error.message
      });
    }

    res.json({
      message: 'Token renovado com sucesso',
      session: data.session,
      access_token: data.session.access_token
    });

  } catch (error) {
    console.error('Erro ao renovar token:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao renovar token'
    });
  }
});

// POST /api/auth/forgot-password - Recuperar senha
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email obrigatório'
      });
    }

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/auth/reset-password'
    });

    if (error) {
      return res.status(400).json({
        error: 'Erro ao enviar email',
        message: error.message
      });
    }

    res.json({
      message: 'Email de recuperação enviado com sucesso'
    });

  } catch (error) {
    console.error('Erro na recuperação de senha:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao processar recuperação de senha'
    });
  }
});

module.exports = router;