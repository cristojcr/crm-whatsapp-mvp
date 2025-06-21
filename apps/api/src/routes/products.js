const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// ===== ROTAS DE PRODUTOS =====
// GET /api/products - Listar produtos
router.get('/', ProductController.index);

// GET /api/products/categories - Listar categorias disponíveis
router.get('/categories', ProductController.categories);

// GET /api/products/category/:category - Buscar produtos por categoria
router.get('/category/:category', ProductController.byCategory);

// GET /api/products/:id - Buscar produto específico
router.get('/:id', ProductController.show);

// GET /api/products/:id/stats - Estatísticas do produto
router.get('/:id/stats', ProductController.stats);

// POST /api/products - Criar produto
router.post('/', ProductController.create);

// PUT /api/products/:id - Atualizar produto
router.put('/:id', ProductController.update);

// DELETE /api/products/:id - Deletar produto
router.delete('/:id', ProductController.destroy);

// POST /api/products/:id/gallery - Adicionar imagem à galeria
router.post('/:id/gallery', ProductController.addImageToGallery);

// DELETE /api/products/:id/gallery - Remover imagem da galeria
router.delete('/:id/gallery', ProductController.removeImageFromGallery);

// POST /api/products/:id/click - Registrar click no produto
router.post('/:id/click', ProductController.click);

module.exports = router;