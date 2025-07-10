import React, { useState, useEffect } from 'react';

const ProductDashboard = () => {
  // --- ESTADOS DO COMPONENTE ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  // Estados para o modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    duration_minutes: 60,
    status: 'active'
  });

  // --- EFEITOS E CARREGAMENTO DE DADOS ---
  useEffect(() => {
    setLoading(true);
    // Dados mocados para visualização inicial
    const mockProducts = [
      { 
        id: 1, 
        name: 'Tratamento de Canal', 
        description: 'Procedimento endodôntico completo para salvar o dente.', 
        category: 'Endodontia', 
        price: '850.00', 
        duration_minutes: 90, 
        status: 'active', 
        professional: 'Dr. Julio Cristo' 
      },
      { 
        id: 2, 
        name: 'Limpeza Dental Profissional', 
        description: 'Remoção de tártaro e placa bacteriana com ultrassom.', 
        category: 'Clínica Geral', 
        price: '250.00', 
        duration_minutes: 50, 
        status: 'active', 
        professional: 'Dra. Maria Silva' 
      },
      { 
        id: 3, 
        name: 'Clareamento a Laser', 
        description: 'Sessão única de clareamento dental com tecnologia LED.', 
        category: 'Estética', 
        price: '1200.00', 
        duration_minutes: 60, 
        status: 'inactive', 
        professional: 'Dr. Pedro Santos' 
      },
    ];
    setTimeout(() => {
      setProducts(mockProducts);
      setLoading(false);
    }, 1000);
  }, []);

  // --- LÓGICA DE FILTRO E BUSCA ---
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // --- FUNÇÕES DO MODAL ---
  const openNewModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      price: '',
      duration_minutes: 60,
      status: 'active'
    });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      duration_minutes: product.duration_minutes,
      status: product.status
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Nome do produto é obrigatório');
      return;
    }
    
    if (editingProduct) {
      // Editar produto existente
      setProducts(products.map(p => 
        p.id === editingProduct.id 
          ? { ...p, ...formData, id: editingProduct.id }
          : p
      ));
      alert('Produto atualizado com sucesso!');
    } else {
      // Criar novo produto
      const newProduct = {
        ...formData,
        id: Date.now(),
        professional: 'Todos os profissionais'
      };
      setProducts([newProduct, ...products]);
      alert('Produto criado com sucesso!');
    }
    
    closeModal();
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja deletar este produto?')) {
      setProducts(products.filter(p => p.id !== id));
      alert('Produto deletado com sucesso!');
    }
  };

  // --- ESTILOS PREMIUM (IGUAL AOS CARDS DE PROFISSIONAIS) ---
  const styles = {
    container: {
      fontFamily: 'Arial, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      borderBottom: '2px solid #E5E7EB',
      paddingBottom: '20px'
    },
    title: {
      margin: 0,
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1F2937'
    },
    subtitle: {
      margin: '8px 0 0 0',
      color: '#6B7280',
      fontSize: '16px'
    },
    addButton: {
      backgroundColor: '#3B82F6',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
    },
    filtersContainer: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      alignItems: 'center'
    },
    searchInput: {
      flex: 1,
      maxWidth: '400px',
      padding: '12px 16px',
      border: '2px solid #E5E7EB',
      borderRadius: '12px',
      fontSize: '16px',
      outline: 'none',
      transition: 'border-color 0.2s'
    },
    filterSelect: {
      padding: '12px 16px',
      border: '2px solid #E5E7EB',
      borderRadius: '12px',
      fontSize: '16px',
      backgroundColor: 'white',
      cursor: 'pointer',
      outline: 'none'
    },
    // Grid de produtos (igual aos profissionais)
    productsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '24px'
    },
    // Card de produto (estilo premium igual aos profissionais)
    productCard: {
      background: '#f9fafb',
      padding: '24px',
      borderRadius: '16px',
      border: '1px solid #f3f4f6',
      transition: 'all 0.3s ease',
      position: 'relative',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    cardActions: {
      position: 'absolute',
      top: '16px',
      right: '16px',
      display: 'flex',
      gap: '8px'
    },
    iconButton: {
      backgroundColor: '#3B82F6',
      color: 'white',
      border: 'none',
      padding: '8px',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s'
    },
    deleteIconButton: {
      backgroundColor: '#EF4444',
      color: 'white',
      border: 'none',
      padding: '8px',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s'
    },
    productHeader: {
      marginBottom: '16px',
      paddingRight: '80px' // Espaço para os botões
    },
    productName: {
      margin: '0 0 8px 0',
      fontSize: '20px',
      fontWeight: '600',
      color: '#1F2937'
    },
    productDescription: {
      margin: 0,
      color: '#6B7280',
      fontSize: '14px',
      lineHeight: '1.5'
    },
    productDetails: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginBottom: '16px'
    },
    detailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    detailLabel: {
      fontSize: '14px',
      color: '#6B7280',
      fontWeight: '500'
    },
    detailValue: {
      fontSize: '14px',
      color: '#1F2937',
      fontWeight: '600'
    },
    priceValue: {
      fontSize: '18px',
      color: '#059669',
      fontWeight: 'bold'
    },
    statusBadge: {
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase'
    },
    statusActive: {
      backgroundColor: '#D1FAE5',
      color: '#065F46'
    },
    statusInactive: {
      backgroundColor: '#FEE2E2',
      color: '#991B1B'
    },
    // Loading
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '60px',
      flexDirection: 'column',
      gap: '16px'
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: '4px solid #f3f4f6',
      borderTop: '4px solid #3B82F6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    // Empty state
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#6B7280'
    },
    emptyIcon: {
      fontSize: '48px',
      marginBottom: '16px'
    },
    emptyTitle: {
      margin: '0 0 8px 0',
      color: '#374151',
      fontSize: '20px',
      fontWeight: '600'
    },
    emptySubtitle: {
      margin: 0,
      fontSize: '16px'
    },
    // Modal
    modalOverlay: {
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
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '24px',
      width: '100%',
      maxWidth: '500px',
      maxHeight: '90vh',
      overflowY: 'auto'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    modalTitle: {
      margin: 0,
      fontSize: '24px',
      fontWeight: '600',
      color: '#1F2937'
    },
    closeButton: {
      backgroundColor: 'transparent',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#6B7280',
      padding: '4px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151'
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '2px solid #E5E7EB',
      borderRadius: '8px',
      fontSize: '16px',
      outline: 'none',
      transition: 'border-color 0.2s'
    },
    textarea: {
      width: '100%',
      padding: '12px',
      border: '2px solid #E5E7EB',
      borderRadius: '8px',
      fontSize: '16px',
      outline: 'none',
      minHeight: '80px',
      resize: 'vertical',
      fontFamily: 'inherit'
    },
    modalActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px'
    },
    cancelButton: {
      backgroundColor: '#F3F4F6',
      color: '#374151',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '500'
    },
    saveButton: {
      backgroundColor: '#3B82F6',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '600'
    }
  };

  // Spinner CSS
  const spinnerCSS = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  // Loading
  if (loading) {
    return (
      <div style={styles.container}>
        <style>{spinnerCSS}</style>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{spinnerCSS}</style>
      
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>📦 Produtos & Serviços</h2>
          <p style={styles.subtitle}>Gerencie os produtos e serviços da sua empresa</p>
        </div>
        <button
          onClick={openNewModal}
          style={styles.addButton}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          ➕ Novo Produto
        </button>
      </div>

      {/* Filtros */}
      <div style={styles.filtersContainer}>
        <input
          type="text"
          placeholder="🔍 Buscar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
          onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
          onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">Todas as categorias</option>
          <option value="Endodontia">Endodontia</option>
          <option value="Clínica Geral">Clínica Geral</option>
          <option value="Estética">Estética</option>
          <option value="Ortodontia">Ortodontia</option>
          <option value="Cirurgia">Cirurgia</option>
        </select>
      </div>

      {/* Grid de Produtos */}
      {filteredProducts.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📦</div>
          <h3 style={styles.emptyTitle}>
            {searchTerm || filterCategory ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
          </h3>
          <p style={styles.emptySubtitle}>
            {searchTerm || filterCategory 
              ? 'Tente ajustar os filtros de busca'
              : 'Comece criando seu primeiro produto ou serviço'
            }
          </p>
        </div>
      ) : (
        <div style={styles.productsGrid}>
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              style={styles.productCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              {/* Botões de ação no topo direito */}
              <div style={styles.cardActions}>
                <button
                  onClick={() => openEditModal(product)}
                  style={styles.iconButton}
                  title="Editar produto"
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#2563EB'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#3B82F6'}
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  style={styles.deleteIconButton}
                  title="Deletar produto"
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#DC2626'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#EF4444'}
                >
                  🗑️
                </button>
              </div>

              {/* Header do produto */}
              <div style={styles.productHeader}>
                <h4 style={styles.productName}>{product.name}</h4>
                <p style={styles.productDescription}>{product.description}</p>
              </div>

              {/* Detalhes do produto */}
              <div style={styles.productDetails}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Categoria:</span>
                  <span style={styles.detailValue}>{product.category}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Preço:</span>
                  <span style={styles.priceValue}>R$ {product.price}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Duração:</span>
                  <span style={styles.detailValue}>{product.duration_minutes} min</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Profissional:</span>
                  <span style={styles.detailValue}>{product.professional}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Status:</span>
                  <span 
                    style={{
                      ...styles.statusBadge,
                      ...(product.status === 'active' ? styles.statusActive : styles.statusInactive)
                    }}
                  >
                    {product.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button onClick={closeModal} style={styles.closeButton}>×</button>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nome do Produto/Serviço *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                style={styles.input}
                placeholder="Ex: Consulta Médica, Exame de Sangue..."
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                style={styles.textarea}
                placeholder="Descreva o produto ou serviço..."
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Categoria *</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                style={styles.input}
                placeholder="Ex: Consulta, Exame, Procedimento..."
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Preço (R$) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                style={styles.input}
                placeholder="0.00"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Duração (minutos)</label>
              <input
                type="number"
                min="1"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value) || 60})}
                style={styles.input}
                placeholder="60"
              />
            </div>

            <div style={styles.modalActions}>
              <button onClick={closeModal} style={styles.cancelButton}>
                Cancelar
              </button>
              <button onClick={handleSave} style={styles.saveButton}>
                {editingProduct ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDashboard;

