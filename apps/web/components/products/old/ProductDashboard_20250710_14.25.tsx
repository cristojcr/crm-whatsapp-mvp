import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pggcikrkhauoxamsogyw.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnZ2Npa3JraGF1b3hhbXNvZ3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI4NzQsImV4cCI6MjA1MDU0ODg3NH0.VQxvKjGqtNFqmCeqGhBGcIOI3UzIImZpCZI6TJHSEnI';

const supabase = createClient(supabaseUrl, supabaseKey);

interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  duration_minutes?: number;
  professional_id?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Professional {
  id: string;
  name: string;
  email: string;
  specialty: string;
  is_active: boolean;
}

const ProductDashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const [formData, setFormData] = useState<Product>({
    name: '',
    description: '',
    price: 0,
    category: '',
    duration_minutes: 60,
    professional_id: '',
    active: true
  });

  // Carregar dados iniciais
  useEffect(() => {
    loadProducts();
    loadProfessionals();
  }, []);

  // Carregar produtos do Supabase
  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          professional:professionals(name, specialty)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar produtos:', error);
        showNotification('error', 'Erro ao carregar produtos');
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      showNotification('error', 'Erro ao conectar com o banco de dados');
    } finally {
      setLoading(false);
    }
  };

  // Carregar profissionais do Supabase
  const loadProfessionals = async () => {
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('id, name, email, specialty, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Erro ao carregar profissionais:', error);
        return;
      }

      setProfessionals(data || []);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
    }
  };

  // Mostrar notificação
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Salvar produto
  const handleSave = async () => {
    try {
      setLoading(true);

      // Validações
      if (!formData.name.trim()) {
        showNotification('error', 'Nome do produto é obrigatório');
        return;
      }
      if (!formData.category) {
        showNotification('error', 'Categoria é obrigatória');
        return;
      }
      if (formData.price <= 0) {
        showNotification('error', 'Preço deve ser maior que zero');
        return;
      }

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: formData.price,
        category: formData.category,
        duration_minutes: formData.duration_minutes || 60,
        professional_id: formData.professional_id || null,
        active: formData.active,
        user_id: getUserId() // Função para pegar o ID do usuário logado
      };

      let result;
      if (editingProduct?.id) {
        // Atualizar produto existente
        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)
          .select();
      } else {
        // Criar novo produto
        result = await supabase
          .from('products')
          .insert([productData])
          .select();
      }

      if (result.error) {
        console.error('Erro ao salvar produto:', result.error);
        showNotification('error', 'Erro ao salvar produto');
        return;
      }

      showNotification('success', editingProduct ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!');
      closeModal();
      await loadProducts();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      showNotification('error', 'Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  // Deletar produto
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este produto?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar produto:', error);
        showNotification('error', 'Erro ao deletar produto');
        return;
      }

      showNotification('success', 'Produto deletado com sucesso!');
      loadProducts();
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      showNotification('error', 'Erro ao deletar produto');
    } finally {
      setLoading(false);
    }
  };

  // Função para pegar ID do usuário
  const getUserId = () => {
    // Usar um UUID válido como fallback
    return localStorage.getItem('user_id') || '00000000-0000-0000-0000-000000000000';
  };

  // Abrir modal para edição
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      duration_minutes: product.duration_minutes || 60,
      professional_id: product.professional_id || '',
      active: product.active
    });
    setIsModalOpen(true);
  };

  // Abrir modal para novo produto
  const openNewModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: '',
      duration_minutes: 60,
      professional_id: '',
      active: true
    });
    setIsModalOpen(true);
  };

  // Fechar modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: '',
      duration_minutes: 60,
      professional_id: '',
      active: true
    });
  };

  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Notificação */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 20px',
          borderRadius: '8px',
          color: 'white',
          backgroundColor: notification.type === 'success' ? '#10B981' : '#EF4444',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '30px',
        borderBottom: '2px solid #E5E7EB',
        paddingBottom: '20px'
      }}>
        <h2 style={{ 
          margin: 0, 
          color: '#1F2937',
          fontSize: '28px',
          fontWeight: 'bold'
        }}>
          📦 Produtos e Serviços
        </h2>
        <button
          onClick={openNewModal}
          disabled={loading}
          style={{
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
        >
          ➕ Novo Produto
        </button>
      </div>

      {/* Filtros */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="🔍 Buscar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '300px',
            padding: '12px 16px',
            border: '2px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
          onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '12px 16px',
            border: '2px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '16px',
            backgroundColor: 'white',
            minWidth: '200px'
          }}
        >
          <option value="">Todas as categorias</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          color: '#6B7280'
        }}>
          Carregando produtos...
        </div>
      )}

      {/* Lista de produtos */}
      {!loading && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
          gap: '20px' 
        }}>
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              style={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <h3 style={{ 
                  margin: 0, 
                  color: '#1F2937',
                  fontSize: '18px',
                  fontWeight: '600',
                  flex: 1
                }}>
                  {product.name}
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => openEditModal(product)}
                    style={{
                      backgroundColor: '#3B82F6',
                      color: 'white',
                      border: 'none',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(product.id!)}
                    style={{
                      backgroundColor: '#EF4444',
                      color: 'white',
                      border: 'none',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    title="Deletar"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <p style={{ 
                color: '#6B7280', 
                margin: '0 0 12px 0',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                {product.description}
              </p>

              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '8px',
                marginBottom: '12px'
              }}>
                <span style={{
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {product.category}
                </span>
                <span style={{
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  R$ {product.price.toFixed(2)}
                </span>
                {product.duration_minutes && (
                  <span style={{
                    backgroundColor: '#DBEAFE',
                    color: '#1E40AF',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {product.duration_minutes}min
                  </span>
                )}
              </div>

              {product.professional_id && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6B7280',
                  marginTop: '8px'
                }}>
                  👨‍⚕️ Profissional específico
                </div>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #F3F4F6'
              }}>
                <span style={{
                  fontSize: '12px',
                  color: product.active ? '#10B981' : '#EF4444',
                  fontWeight: '500'
                }}>
                  {product.active ? '✅ Ativo' : '❌ Inativo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredProducts.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#6B7280'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>
            {searchTerm || selectedCategory ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
          </h3>
          <p style={{ margin: 0 }}>
            {searchTerm || selectedCategory 
              ? 'Tente ajustar os filtros de busca'
              : 'Comece criando seu primeiro produto ou serviço'
            }
          </p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0',
              color: '#1F2937',
              fontSize: '20px',
              fontWeight: '600'
            }}>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  Nome do Produto/Serviço *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                  placeholder="Ex: Consulta Médica, Exame de Sangue..."
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  placeholder="Descreva o produto ou serviço..."
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px',
                    color: '#374151',
                    fontWeight: '500'
                  }}>
                    Categoria *
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                    placeholder="Ex: Consulta, Exame, Procedimento..."
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px',
                    color: '#374151',
                    fontWeight: '500'
                  }}>
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px',
                    color: '#374151',
                    fontWeight: '500'
                  }}>
                    Duração (minutos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value) || 60})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none'
                    }}
                    placeholder="60"
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px',
                    color: '#374151',
                    fontWeight: '500'
                  }}>
                    Profissional
                  </label>
                  <select
                    value={formData.professional_id}
                    onChange={(e) => setFormData({...formData, professional_id: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '16px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">🌟 Todos os profissionais</option>
                    {professionals.map(prof => (
                      <option key={prof.id} value={prof.id}>
                        👨‍⚕️ {prof.name} - {prof.specialty}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#374151',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({...formData, active: e.target.checked})}
                    style={{ transform: 'scale(1.2)' }}
                  />
                  Produto ativo
                </label>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginTop: '24px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={closeModal}
                disabled={loading}
                style={{
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                style={{
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDashboard;

