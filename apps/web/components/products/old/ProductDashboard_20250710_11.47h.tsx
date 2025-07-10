
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, X } from 'lucide-react';

const ProductDashboard = () => {
  // --- ESTADOS DO COMPONENTE ---
  const [products, setProducts] = useState([]);
  const [professionals, setProfessionals] = useState([]); // Para o dropdown
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  // Estados para o modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Estados do formulário do modal
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    duration_minutes: '',
    professional_id: '', // 🆕 Campo profissional
    status: 'active'
  });

  // --- FUNÇÃO PARA OBTER TOKEN DE AUTENTICAÇÃO ---
  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    
    // Buscar chave específica do Supabase (padrão: sb-*-auth-token)
    const allKeys = Object.keys(localStorage);
    const supabaseKey = allKeys.find(key => 
      key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    
    if (supabaseKey) {
      const stored = localStorage.getItem(supabaseKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.access_token) {
            return parsed.access_token;
          }
        } catch (error) {
          return stored;
        }
      }
    }
    
    return null;
  };

  // --- FUNÇÃO PARA REQUISIÇÕES AUTENTICADAS ---
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = getAuthToken();
    
    if (!token) {
      console.warn('⚠️ Token não encontrado');
      return null;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (response.status === 401) {
        console.error('❌ Sessão expirada');
        return null;
      }
      
      return response;
    } catch (error) {
      console.error('❌ Erro de conexão:', error);
      return null;
    }
  };

  // --- CARREGAMENTO DE DADOS ---
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    
    // Carregar profissionais primeiro
    await loadProfessionals();
    
    // Depois carregar produtos (ou usar dados mocados se não conseguir conectar)
    await loadProducts();
    
    setLoading(false);
  };

  const loadProfessionals = async () => {
    try {
      const response = await makeAuthenticatedRequest('http://localhost:3001/api/professionals');
      
      if (response && response.ok) {
        const data = await response.json();
        setProfessionals(data.data || []);
      } else {
        // Dados mocados para profissionais se não conseguir conectar
        setProfessionals([
          { id: 1, name: 'Dr. Julio Cristo' },
          { id: 2, name: 'Dra. Maria Silva' },
          { id: 3, name: 'Dr. Pedro Santos' }
        ]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar profissionais:', error);
      // Dados mocados como fallback
      setProfessionals([
        { id: 1, name: 'Dr. Julio Cristo' },
        { id: 2, name: 'Dra. Maria Silva' },
        { id: 3, name: 'Dr. Pedro Santos' }
      ]);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await makeAuthenticatedRequest('http://localhost:3001/api/products');
      
      if (response && response.ok) {
        const data = await response.json();
        setProducts(data.data || []);
      } else {
        // Dados mocados se não conseguir conectar com backend
        const mockProducts = [
          { 
            id: 1, 
            name: 'Tratamento de Canal', 
            description: 'Procedimento endodôntico completo.', 
            category: 'Endodontia', 
            price: '850.00', 
            duration_minutes: 90, 
            status: 'active', 
            professional_id: 1,
            professionals: { name: 'Dr. Julio Cristo' } 
          },
          { 
            id: 2, 
            name: 'Limpeza Dental Profissional', 
            description: 'Remoção de tártaro e placa bacteriana.', 
            category: 'Clínica Geral', 
            price: '250.00', 
            duration_minutes: 50, 
            status: 'active', 
            professional_id: 2,
            professionals: { name: 'Dra. Maria Silva' } 
          },
          { 
            id: 3, 
            name: 'Clareamento a Laser', 
            description: 'Sessão única de clareamento dental.', 
            category: 'Estética', 
            price: '1200.00', 
            duration_minutes: 60, 
            status: 'inactive', 
            professional_id: 3,
            professionals: { name: 'Dr. Pedro Santos' } 
          },
        ];
        setProducts(mockProducts);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar produtos:', error);
      // Usar dados mocados como fallback
      const mockProducts = [
        { 
          id: 1, 
          name: 'Tratamento de Canal', 
          description: 'Procedimento endodôntico completo.', 
          category: 'Endodontia', 
          price: '850.00', 
          duration_minutes: 90, 
          status: 'active', 
          professional_id: 1,
          professionals: { name: 'Dr. Julio Cristo' } 
        },
        { 
          id: 2, 
          name: 'Limpeza Dental Profissional', 
          description: 'Remoção de tártaro e placa bacteriana.', 
          category: 'Clínica Geral', 
          price: '250.00', 
          duration_minutes: 50, 
          status: 'active', 
          professional_id: 2,
          professionals: { name: 'Dra. Maria Silva' } 
        },
        { 
          id: 3, 
          name: 'Clareamento a Laser', 
          description: 'Sessão única de clareamento dental.', 
          category: 'Estética', 
          price: '1200.00', 
          duration_minutes: 60, 
          status: 'inactive', 
          professional_id: 3,
          professionals: { name: 'Dr. Pedro Santos' } 
        },
      ];
      setProducts(mockProducts);
    }
  };

  // --- LÓGICA DE FILTRO E BUSCA ---
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // --- FUNÇÕES DO MODAL ---
  const openModal = (product = null) => {
    setEditingProduct(product);
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        price: product.price || '',
        duration_minutes: product.duration_minutes || '',
        professional_id: product.professional_id || '',
        status: product.status || 'active'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: '',
        price: '',
        duration_minutes: '',
        professional_id: '',
        status: 'active'
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      price: '',
      duration_minutes: '',
      professional_id: '',
      status: 'active'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação
    if (!formData.name) {
      alert('Nome é obrigatório');
      return;
    }

    try {
      if (editingProduct) {
        // Editar produto existente
        const response = await makeAuthenticatedRequest(`http://localhost:3001/api/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...formData,
            duration_minutes: parseInt(formData.duration_minutes) || 0
          })
        });

        if (response && response.ok) {
          await loadProducts(); // Recarregar da API
          alert('Produto atualizado com sucesso!');
        } else {
          // Fallback: atualizar localmente
          setProducts(prev => prev.map(p => 
            p.id === editingProduct.id 
              ? { 
                  ...p, 
                  ...formData, 
                  duration_minutes: parseInt(formData.duration_minutes) || 0,
                  professionals: { 
                    name: formData.professional_id === 'all' 
                      ? 'Todos os profissionais' 
                      : professionals.find(prof => prof.id == formData.professional_id)?.name || 'Não atribuído'
                  }
                }
              : p
          ));
          alert('Produto atualizado localmente (sem conexão com servidor)');
        }
      } else {
        // Adicionar novo produto
        const response = await makeAuthenticatedRequest('http://localhost:3001/api/products', {
          method: 'POST',
          body: JSON.stringify({
            ...formData,
            duration_minutes: parseInt(formData.duration_minutes) || 0
          })
        });

        if (response && response.ok) {
          await loadProducts(); // Recarregar da API
          alert('Produto criado com sucesso!');
        } else {
          // Fallback: adicionar localmente
          const newProduct = {
            id: Date.now(), // ID temporário
            ...formData,
            duration_minutes: parseInt(formData.duration_minutes) || 0,
            professionals: { 
              name: formData.professional_id === 'all' 
                ? 'Todos os profissionais' 
                : professionals.find(prof => prof.id == formData.professional_id)?.name || 'Não atribuído'
            }
          };
          setProducts(prev => [...prev, newProduct]);
          alert('Produto criado localmente (sem conexão com servidor)');
        }
      }
      
      closeModal();
    } catch (error) {
      console.error('❌ Erro ao salvar produto:', error);
      alert('Erro ao salvar produto. Tente novamente.');
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) {
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(`http://localhost:3001/api/products/${productId}`, {
        method: 'DELETE'
      });

      if (response && response.ok) {
        await loadProducts(); // Recarregar da API
        alert('Produto excluído com sucesso!');
      } else {
        // Fallback: remover localmente
        setProducts(prev => prev.filter(p => p.id !== productId));
        alert('Produto removido localmente (sem conexão com servidor)');
      }
    } catch (error) {
      console.error('❌ Erro ao excluir produto:', error);
      // Fallback: remover localmente
      setProducts(prev => prev.filter(p => p.id !== productId));
      alert('Produto removido localmente (erro de conexão)');
    }
  };

  // --- FUNÇÃO PARA OBTER NOME DO PROFISSIONAL ---
  const getProfessionalName = (product) => {
    if (product.professionals?.name) {
      return product.professionals.name;
    }
    
    if (product.professional_id === 'all') {
      return 'Todos os profissionais';
    }
    
    const professional = professionals.find(prof => prof.id == product.professional_id);
    return professional?.name || 'Não atribuído';
  };

  // --- ESTILOS ---
  const styles = {
    container: {
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#111827',
      margin: 0
    },
    subtitle: {
      color: '#6b7280',
      margin: '4px 0 0 0'
    },
    button: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      color: 'white',
      border: 'none',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s ease'
    },
    filtersContainer: {
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
      marginBottom: '24px'
    },
    searchContainer: {
      position: 'relative',
      flex: 1,
      maxWidth: '400px'
    },
    searchInput: {
      paddingLeft: '40px',
      paddingRight: '16px',
      paddingTop: '12px',
      paddingBottom: '12px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      width: '100%',
      fontSize: '14px',
      outline: 'none'
    },
    searchIcon: {
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#9ca3af'
    },
    selectContainer: {
      position: 'relative'
    },
    select: {
      paddingLeft: '40px',
      paddingRight: '32px',
      paddingTop: '12px',
      paddingBottom: '12px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      background: 'white'
    },
    tableContainer: {
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    tableHeader: {
      background: '#f9fafb'
    },
    th: {
      padding: '12px 24px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
    td: {
      padding: '16px 24px',
      borderTop: '1px solid #f3f4f6'
    },
    productName: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#111827',
      margin: 0
    },
    productDescription: {
      fontSize: '14px',
      color: '#6b7280',
      margin: '4px 0 0 0',
      maxWidth: '300px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    statusBadge: {
      display: 'inline-flex',
      padding: '4px 8px',
      fontSize: '12px',
      fontWeight: '600',
      borderRadius: '12px'
    },
    statusActive: {
      background: '#dcfce7',
      color: '#166534'
    },
    statusInactive: {
      background: '#fee2e2',
      color: '#991b1b'
    },
    actionButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '6px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease'
    },
    editButton: {
      color: '#3b82f6',
      marginRight: '8px'
    },
    deleteButton: {
      color: '#ef4444'
    },
    emptyState: {
      textAlign: 'center',
      padding: '48px 24px',
      color: '#6b7280'
    },
    emptyButton: {
      color: '#3b82f6',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontWeight: '600',
      marginTop: '8px'
    },
    spinner: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '256px'
    },
    spinnerElement: {
      width: '32px',
      height: '32px',
      border: '3px solid #f3f4f6',
      borderTopColor: '#3b82f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    // Modal styles
    modalOverlay: {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    },
    modalContent: {
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      width: '100%',
      maxWidth: '500px',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1f2937',
      margin: 0
    },
    modalCloseButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#6b7280',
      fontSize: '24px'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '6px'
    },
    input: {
      padding: '12px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none'
    },
    textarea: {
      padding: '12px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      resize: 'vertical',
      minHeight: '80px'
    },
    modalActions: {
      display: 'flex',
      gap: '12px',
      marginTop: '8px'
    },
    cancelButton: {
      flex: 1,
      padding: '12px 16px',
      color: '#6b7280',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      background: 'white'
    },
    submitButton: {
      flex: 1,
      padding: '12px 16px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer'
    }
  };

  // --- RENDERIZAÇÃO ---
  if (loading) {
    return (
      <div style={styles.spinner}>
        <div style={styles.spinnerElement}></div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Cabeçalho */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Produtos & Serviços</h2>
          <p style={styles.subtitle}>Gerencie os produtos e serviços da sua empresa</p>
        </div>
        <button
          onClick={() => openModal()}
          style={styles.button}
        >
          <Plus size={20} />
          Novo Produto
        </button>
      </div>

      {/* Filtros */}
      <div style={styles.filtersContainer}>
        <div style={styles.searchContainer}>
          <Search size={20} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.selectContainer}>
          <Filter size={20} style={styles.searchIcon} />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={styles.select}
          >
            <option value="">Todas as categorias</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead style={styles.tableHeader}>
            <tr>
              <th style={styles.th}>Produto/Serviço</th>
              <th style={styles.th}>Profissional</th>
              <th style={styles.th}>Categoria</th>
              <th style={styles.th}>Preço</th>
              <th style={styles.th}>Duração</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="7" style={{...styles.td, ...styles.emptyState}}>
                  Nenhum produto encontrado.
                  <br />
                  <button
                    onClick={() => openModal()}
                    style={styles.emptyButton}
                  >
                    Adicionar primeiro produto
                  </button>
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td style={styles.td}>
                    <div style={styles.productName}>{product.name}</div>
                    <div style={styles.productDescription}>{product.description}</div>
                  </td>
                  <td style={styles.td}>{getProfessionalName(product)}</td>
                  <td style={styles.td}>{product.category || '-'}</td>
                  <td style={styles.td}>{product.price ? `R$ ${product.price}` : '-'}</td>
                  <td style={styles.td}>{product.duration_minutes ? `${product.duration_minutes} min` : '-'}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      ...(product.status === 'active' ? styles.statusActive : styles.statusInactive)
                    }}>
                      {product.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={{display: 'flex', gap: '4px'}}>
                      <button
                        onClick={() => openModal(product)}
                        style={{...styles.actionButton, ...styles.editButton}}
                        title="Editar produto"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        style={{...styles.actionButton, ...styles.deleteButton}}
                        title="Excluir produto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Produto */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button 
                onClick={closeModal}
                style={styles.modalCloseButton}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nome *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={styles.input}
                  placeholder="Nome do produto/serviço"
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  style={styles.textarea}
                  placeholder="Descrição detalhada do produto/serviço"
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Categoria</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  style={styles.input}
                  placeholder="Ex: Clínica Geral, Estética, etc."
                />
              </div>

              {/* 🆕 CAMPO PROFISSIONAL */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Profissional</label>
                <select
                  value={formData.professional_id}
                  onChange={(e) => setFormData({...formData, professional_id: e.target.value})}
                  style={styles.input}
                >
                  <option value="">Selecione um profissional</option>
                  <option value="all">🌟 Todos os profissionais</option>
                  {professionals.map(professional => (
                    <option key={professional.id} value={professional.id}>
                      {professional.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{display: 'flex', gap: '16px'}}>
                <div style={{...styles.inputGroup, flex: 1}}>
                  <label style={styles.label}>Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    style={styles.input}
                    placeholder="0.00"
                  />
                </div>
                
                <div style={{...styles.inputGroup, flex: 1}}>
                  <label style={styles.label}>Duração (min)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                    style={styles.input}
                    placeholder="60"
                  />
                </div>
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  style={styles.input}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
              
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={styles.cancelButton}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                >
                  {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDashboard;