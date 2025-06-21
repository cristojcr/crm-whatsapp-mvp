const supabase = require('../config/supabase');

class Product {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.currency = data.currency || 'BRL';
    this.sku = data.sku;
    this.link_url = data.link_url;
    this.image_url = data.image_url;
    this.gallery_urls = data.gallery_urls || [];
    this.category = data.category;
    this.tags = data.tags || [];
    this.active = data.active !== undefined ? data.active : true;
    this.in_stock = data.in_stock !== undefined ? data.in_stock : true;
    this.stock_quantity = data.stock_quantity;
    this.views_count = data.views_count || 0;
    this.clicks_count = data.clicks_count || 0;
    this.conversions_count = data.conversions_count || 0;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Validação dos dados
  validate() {
    const errors = [];
    
    if (!this.name || this.name.trim().length < 2) {
      errors.push('Nome do produto deve ter pelo menos 2 caracteres');
    }
    
    if (!this.description || this.description.trim().length < 10) {
      errors.push('Descrição deve ter pelo menos 10 caracteres');
    }
    
    if (!this.price || this.price <= 0) {
      errors.push('Preço deve ser maior que zero');
    }
    
    if (!this.user_id) {
      errors.push('ID do usuário é obrigatório');
    }
    
    // Validar URLs se fornecidas
    if (this.link_url && !this.isValidUrl(this.link_url)) {
      errors.push('URL do produto inválida');
    }
    
    if (this.image_url && !this.isValidUrl(this.image_url)) {
      errors.push('URL da imagem inválida');
    }
    
    return errors;
  }

  // Validar URL
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Criar novo produto
  static async create(productData) {
    try {
      const product = new Product(productData);
      const validationErrors = product.validate();
      
      if (validationErrors.length > 0) {
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
      }

      const { data, error } = await supabase
        .from('products')
        .insert([{
          user_id: product.user_id,
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency,
          sku: product.sku,
          link_url: product.link_url,
          image_url: product.image_url,
          gallery_urls: product.gallery_urls,
          category: product.category,
          tags: product.tags,
          active: product.active,
          in_stock: product.in_stock,
          stock_quantity: product.stock_quantity
        }])
        .select('*')
        .single();

      if (error) throw error;
      
      return new Product(data);
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      throw error;
    }
  }

  // Buscar produto por ID
  static async findById(id, user_id) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('user_id', user_id)
        .single();

      if (error) throw error;
      if (!data) return null;
      
      return new Product(data);
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      throw error;
    }
  }

  // Listar produtos do usuário
  static async findByUser(user_id, options = {}) {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('user_id', user_id);

      // Filtros opcionais
      if (options.category) {
        query = query.eq('category', options.category);
      }
      
      if (options.active !== undefined) {
        query = query.eq('active', options.active);
      }
      
      if (options.in_stock !== undefined) {
        query = query.eq('in_stock', options.in_stock);
      }
      
      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%,sku.ilike.%${options.search}%`);
      }

      // Filtro por tags
      if (options.tags && options.tags.length > 0) {
        query = query.overlaps('tags', options.tags);
      }

      // Ordenação
      query = query.order(options.sort_by || 'created_at', { 
        ascending: options.sort_order === 'asc' 
      });

      // Paginação
      if (options.limit) {
        query = query.limit(options.limit);
        if (options.offset) {
          query = query.range(options.offset, options.offset + options.limit - 1);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return data.map(item => new Product(item));
    } catch (error) {
      console.error('Erro ao listar produtos:', error);
      throw error;
    }
  }

  // Buscar produtos por categoria
  static async findByCategory(user_id, category) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user_id)
        .eq('category', category)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      
      return data.map(item => new Product(item));
    } catch (error) {
      console.error('Erro ao buscar produtos por categoria:', error);
      throw error;
    }
  }

  // Listar categorias únicas do usuário
  static async getCategories(user_id) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('user_id', user_id)
        .eq('active', true)
        .not('category', 'is', null);

      if (error) throw error;
      
      // Extrair categorias únicas
      const categories = [...new Set(data.map(item => item.category))];
      return categories.filter(cat => cat && cat.trim().length > 0);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }
  }

  // Atualizar produto
  async update(updateData) {
    try {
      // Merge dos dados atuais com os novos
      const updatedProduct = { ...this, ...updateData };
      const product = new Product(updatedProduct);
      
      const validationErrors = product.validate();
      if (validationErrors.length > 0) {
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
      }

      const { data, error } = await supabase
        .from('products')
        .update({
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency,
          sku: product.sku,
          link_url: product.link_url,
          image_url: product.image_url,
          gallery_urls: product.gallery_urls,
          category: product.category,
          tags: product.tags,
          active: product.active,
          in_stock: product.in_stock,
          stock_quantity: product.stock_quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id)
        .eq('user_id', this.user_id)
        .select('*')
        .single();

      if (error) throw error;
      
      // Atualizar instância atual
      Object.assign(this, new Product(data));
      return this;
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }
  }

  // Deletar produto (soft delete)
  async delete() {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id)
        .eq('user_id', this.user_id);

      if (error) throw error;
      
      this.active = false;
      return true;
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      throw error;
    }
  }

  // Deletar permanentemente
  async hardDelete() {
    try {
      // Primeiro deletar interações relacionadas
      await supabase.from('product_interactions').delete().eq('product_id', this.id);
      
      // Então deletar o produto
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', this.id)
        .eq('user_id', this.user_id);

      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Erro ao deletar produto permanentemente:', error);
      throw error;
    }
  }

  // Adicionar imagem à galeria
  async addImageToGallery(imageUrl) {
    try {
      if (!this.isValidUrl(imageUrl)) {
        throw new Error('URL da imagem inválida');
      }

      const updatedGallery = [...(this.gallery_urls || []), imageUrl];
      
      await this.update({ gallery_urls: updatedGallery });
      return true;
    } catch (error) {
      console.error('Erro ao adicionar imagem:', error);
      throw error;
    }
  }

  // Remover imagem da galeria
  async removeImageFromGallery(imageUrl) {
    try {
      const updatedGallery = (this.gallery_urls || []).filter(url => url !== imageUrl);
      
      await this.update({ gallery_urls: updatedGallery });
      return true;
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      throw error;
    }
  }

  // Incrementar contador de views
  async incrementViews() {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          views_count: (this.views_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id);

      if (error) throw error;
      
      this.views_count = (this.views_count || 0) + 1;
      return true;
    } catch (error) {
      console.error('Erro ao incrementar views:', error);
      throw error;
    }
  }

  // Incrementar contador de clicks
  async incrementClicks() {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          clicks_count: (this.clicks_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id);

      if (error) throw error;
      
      this.clicks_count = (this.clicks_count || 0) + 1;
      return true;
    } catch (error) {
      console.error('Erro ao incrementar clicks:', error);
      throw error;
    }
  }
}

module.exports = Product;