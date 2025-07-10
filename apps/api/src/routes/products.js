// ARQUIVO: apps/api/src/routes/products.js

const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');

// Aplica autenticação para todas as rotas de produtos
router.use(authenticateToken);

// --- Rotas Principais (CRUD) ---
// GET /api/products -> Listar todos os produtos (com filtros)
router.get('/', ProductController.index);

// POST /api/products -> Criar um novo produto
router.post('/', ProductController.create);

// GET /api/products/:id -> Obter um produto específico
router.get('/:id', ProductController.show);

// PUT /api/products/:id -> Atualizar um produto
router.put('/:id', ProductController.update);

// DELETE /api/products/:id -> Deletar um produto
router.delete('/:id', ProductController.destroy);


// --- Rotas Adicionais ---
// GET /api/products/meta/categories -> Listar categorias
router.get('/meta/categories', ProductController.categories);

// GET /api/products/category/:category -> Listar produtos por categoria
router.get('/category/:category', ProductController.byCategory);

// GET /api/products/:id/stats -> Obter estatísticas de um produto
router.get('/:id/stats', ProductController.stats);

// POST /api/products/:id/click -> Registrar um clique
router.post('/:id/click', ProductController.click);

// POST /api/products/:id/gallery/add -> Adicionar imagem
router.post('/:id/gallery/add', ProductController.addImageToGallery);

// DELETE /api/products/:id/gallery/remove -> Remover imagem
router.delete('/:id/gallery/remove', ProductController.removeImageFromGallery);

// A rota de busca inteligente (search) não está no seu controller,
// se precisar dela, podemos adicionar depois.

module.exports = router;