const Product = require('../models/Product');

class ProductController {
  // Listar produtos
  static async index(req, res) {
    try {
      const user_id = req.user.id; // Assumindo que user_id vem do middleware de auth
      const options = {
        category: req.query.category,
        active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
        in_stock: req.query.in_stock !== undefined ? req.query.in_stock === 'true' : undefined,
        search: req.query.search,
        tags: req.query.tags ? req.query.tags.split(',') : undefined,
        sort_by: req.query.sort_by || 'created_at',
        sort_order: req.query.sort_order || 'desc',
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      const products = await Product.findByUser(user_id, options);

      res.json({
        success: true,
        data: products,
        meta: {
          total: products.length,
          limit: options.limit,
          offset: options.offset
        }
      });
    } catch (error) {
      console.error('Erro ao listar produtos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // Buscar produto específico
  static async show(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const product = await Product.findById(id, user_id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Produto não encontrado'
        });
      }

      // Incrementar views
      await product.incrementViews();

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // Criar novo produto
  static async create(req, res) {
    try {
      const user_id = req.user.id;
      const productData = {
        ...req.body,
        user_id
      };

      const product = await Product.create(productData);

      res.status(201).json({
        success: true,
        data: product,
        message: 'Produto criado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      
      if (error.message.includes('Dados inválidos')) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // Atualizar produto
  static async update(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const product = await Product.findById(id, user_id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Produto não encontrado'
        });
      }

      await product.update(req.body);

      res.json({
        success: true,
        data: product,
        message: 'Produto atualizado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      
      if (error.message.includes('Dados inválidos')) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // Deletar produto (soft delete)
  static async destroy(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const product = await Product.findById(id, user_id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Produto não encontrado'
        });
      }

      await product.delete();

      res.json({
        success: true,
        message: 'Produto deletado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // Listar categorias disponíveis
  static async categories(req, res) {
    try {
      const user_id = req.user.id;

      const categories = await Product.getCategories(user_id);

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Erro ao listar categorias:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // Buscar produtos por categoria
  static async byCategory(req, res) {
    try {
      const { category } = req.params;
      const user_id = req.user.id;

      const products = await Product.findByCategory(user_id, category);

      res.json({
        success: true,
        data: products,
        category: category
      });
    } catch (error) {
      console.error('Erro ao buscar produtos por categoria:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // Adicionar imagem à galeria
  static async addImageToGallery(req, res) {
    try {
      const { id } = req.params;
      const { image_url } = req.body;
      const user_id = req.user.id;

      if (!image_url) {
        return res.status(400).json({
          success: false,
          error: 'URL da imagem é obrigatória'
        });
      }

      const product = await Product.findById(id, user_id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Produto não encontrado'
        });
      }

      await product.addImageToGallery(image_url);

      res.json({
        success: true,
        data: product,
        message: 'Imagem adicionada à galeria com sucesso'
      });
    } catch (error) {
      console.error('Erro ao adicionar imagem:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // Remover imagem da galeria
  static async removeImageFromGallery(req, res) {
    try {
      const { id } = req.params;
      const { image_url } = req.body;
      const user_id = req.user.id;

      if (!image_url) {
        return res.status(400).json({
          success: false,
          error: 'URL da imagem é obrigatória'
        });
      }

      const product = await Product.findById(id, user_id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Produto não encontrado'
        });
      }

      await product.removeImageFromGallery(image_url);

      res.json({
        success: true,
        data: product,
        message: 'Imagem removida da galeria com sucesso'
      });
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // Incrementar clicks (quando produto é clicado)
  static async click(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const product = await Product.findById(id, user_id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Produto não encontrado'
        });
      }

      await product.incrementClicks();

      res.json({
        success: true,
        message: 'Click registrado com sucesso',
        data: {
          clicks_count: product.clicks_count
        }
      });
    } catch (error) {
      console.error('Erro ao registrar click:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  // Estatísticas do produto
  static async stats(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const product = await Product.findById(id, user_id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Produto não encontrado'
        });
      }

      res.json({
        success: true,
        data: {
          views: product.views_count || 0,
          clicks: product.clicks_count || 0,
          conversions: product.conversions_count || 0,
          ctr: product.views_count > 0 ? ((product.clicks_count || 0) / product.views_count * 100).toFixed(2) : 0,
          conversion_rate: product.clicks_count > 0 ? ((product.conversions_count || 0) / product.clicks_count * 100).toFixed(2) : 0
        }
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }
}

module.exports = ProductController;