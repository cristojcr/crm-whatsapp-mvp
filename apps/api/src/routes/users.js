const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { prisma } = require('../config/prisma');

const router = express.Router();

// GET /api/users - Listar usuários (apenas admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const users = await prisma.user.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            conversations: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.user.count({ where });

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao buscar usuários'
    });
  }
});

// GET /api/users/:id - Buscar usuário por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Usuários só podem ver seus próprios dados, admins podem ver qualquer um
    const isAdmin = req.user.app_metadata?.role === 'admin';
    if (!isAdmin && req.user.id !== id) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Você só pode acessar seus próprios dados'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        conversations: {
          include: {
            contact: true,
            _count: {
              select: {
                messages: true
              }
            }
          },
          orderBy: { lastMessageAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao buscar usuário'
    });
  }
});

// PUT /api/users/:id - Atualizar usuário
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;

    // Usuários só podem atualizar seus próprios dados
    if (req.user.id !== id) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Você só pode atualizar seus próprios dados'
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: name || undefined,
        phone: phone || undefined,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Usuário atualizado com sucesso',
      user: updatedUser
    });

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        error: 'Conflito de dados',
        message: 'Phone já está em uso por outro usuário'
      });
    }

    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao atualizar usuário'
    });
  }
});

// DELETE /api/users/:id - Deletar usuário (apenas admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Não permitir admin deletar a si mesmo
    if (req.user.id === id) {
      return res.status(400).json({
        error: 'Operação não permitida',
        message: 'Você não pode deletar sua própria conta'
      });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({
      message: 'Usuário deletado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Usuário não encontrado'
      });
    }

    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao deletar usuário'
    });
  }
});

// GET /api/users/:id/stats - Estatísticas do usuário
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar permissão
    const isAdmin = req.user.app_metadata?.role === 'admin';
    if (!isAdmin && req.user.id !== id) {
      return res.status(403).json({
        error: 'Acesso negado'
      });
    }

    const stats = await prisma.user.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            conversations: true
          }
        }
      }
    });

    if (!stats) {
      return res.status(404).json({
        error: 'Usuário não encontrado'
      });
    }

    // Estatísticas detalhadas
    const [totalMessages, activeConversations, monthlyStats] = await Promise.all([
      prisma.message.count({
        where: {
          conversation: {
            userId: id
          }
        }
      }),
      prisma.conversation.count({
        where: {
          userId: id,
          isActive: true
        }
      }),
      prisma.conversation.findMany({
        where: {
          userId: id,
          createdAt: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
          }
        },
        select: {
          createdAt: true
        }
      })
    ]);

    res.json({
      stats: {
        totalConversations: stats._count.conversations,
        totalMessages,
        activeConversations,
        monthlyConversations: monthlyStats.length,
        joinedAt: (await prisma.user.findUnique({
          where: { id },
          select: { createdAt: true }
        }))?.createdAt
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao buscar estatísticas'
    });
  }
});

module.exports = router;