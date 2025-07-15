import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, X, Package, TrendingUp, DollarSign, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ProductDashboard = () => {
  // --- ESTADOS DO COMPONENTE ---
  const [products, setProducts] = useState([]);
  const [professionals, setProfessionals] = useState([]);
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
    professional_id: '',
    link_url: '',
    link_label: '',
    status: 'active'
  });

  // Estados para estatísticas
  const [productStats, setProductStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalCategories: 0,
    averagePrice: 0
  });

  // --- EFEITOS E CARREGAMENTO DE DADOS ---
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([loadProfessionals(), loadProducts()]);
    setLoading(false);
  };

  // ✅ CARREGAR PROFISSIONAIS DIRETO DO SUPABASE
  const loadProfessionals = async () => {
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Erro ao carregar profissionais:', error);
        setProfessionals([]);
      } else {
        console.log('✅ Profissionais carregados:', data?.length || 0);
        setProfessionals(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
      setProfessionals([]);
    }
  };

  // ✅ CARREGAR PRODUTOS DIRETO DO SUPABASE
  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          professionals!professional_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar produtos:', error);
        setProducts([]);
      } else {
        console.log('✅ Produtos carregados:', data?.length || 0);
        // Mapear dados para incluir nome do profissional
        const productsWithProfessional = data?.map(product => ({
          ...product,
          professional_name: product.professionals?.name || 'Não atribuído'
        })) || [];
        setProducts(productsWithProfessional);
        
        // Calcular estatísticas
        calculateStats(productsWithProfessional);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setProducts([]);
    }
  };

  // ✅ CALCULAR ESTATÍSTICAS
  const calculateStats = (productsList) => {
    const activeProducts = productsList.filter(p => p.active).length;
    const categories = [...new Set(productsList.map(p => p.category).filter(Boolean))].length;
    const prices = productsList.filter(p => p.price && p.price > 0).map(p => p.price);
    const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

    setProductStats({
      totalProducts: productsList.length,
      activeProducts,
      totalCategories: categories,
      averagePrice: Math.round(averagePrice * 100) / 100
    });
  };

  // --- LÓGICA DE FILTRO E BUSCA ---
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // ✅ Categorias dinâmicas baseadas nos produtos criados
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // --- FUNÇÕES DO MODAL ---
  const openNewModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      price: '',
      duration_minutes: 60,
      professional_id: '',
      link_url: '',
      link_label: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      price: product.price || '',
      duration_minutes: product.duration_minutes || 60,
      professional_id: product.professional_id || '',
      link_url: product.link_url || '',
      link_label: product.link_label || '',
      status: product.active ? 'active' : 'inactive'
    });
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
      duration_minutes: 60,
      professional_id: '',
      link_url: '',
      link_label: '',
      status: 'active'
    });
  };

  // ✅ SALVAR DIRETO NO SUPABASE
  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Nome do produto é obrigatório');
      return;
    }

    try {
      // ✅ Tratar professional_id corretamente
      let professionalId = null;
      if (formData.professional_id && formData.professional_id !== '' && formData.professional_id !== 'all') {
        professionalId = formData.professional_id;
      }

      const productData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        category: formData.category?.trim() || null,
        price: formData.price ? parseFloat(formData.price) : null,
        duration_minutes: parseInt(formData.duration_minutes) || 60,
        professional_id: professionalId,
        link_url: formData.link_url?.trim() || null,
        link_label: formData.link_label?.trim() || null,
        active: formData.status === 'active'
      };

      console.log('💾 Salvando produto:', productData);

      if (editingProduct) {
        // ✅ EDITAR PRODUTO
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) {
          console.error('❌ Erro ao editar produto:', error);
          alert('Erro ao editar produto: ' + error.message);
          return;
        }

        console.log('✅ Produto editado com sucesso!');
        alert('Produto editado com sucesso!');
      } else {
        // ✅ CRIAR PRODUTO
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) {
          console.error('❌ Erro ao criar produto:', error);
          alert('Erro ao criar produto: ' + error.message);
          return;
        }

        console.log('✅ Produto criado com sucesso!');
        alert('Produto criado com sucesso!');
      }

      // ✅ Recarregar produtos e fechar modal SEMPRE após sucesso
      await loadProducts();
      closeModal();

    } catch (error) {
      console.error('❌ Erro inesperado ao salvar produto:', error);
      alert('Erro inesperado ao salvar produto: ' + error.message);
    }
  };

  // ✅ DELETAR DIRETO DO SUPABASE
  const handleDelete = async (productId) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('Erro ao deletar produto:', error);
        alert('Erro ao deletar produto: ' + error.message);
        return;
      }

      alert('Produto deletado com sucesso!');
      await loadProducts(); // Recarregar lista

    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      alert('Erro inesperado ao deletar produto');
    }
  };

  // --- FUNÇÃO PARA OBTER NOME DO PROFISSIONAL ---
  const getProfessionalName = (product) => {
    if (product.professional_name) {
      return product.professional_name;
    }
    
    if (product.professional_id === 'all') {
      return 'Todos os profissionais';
    }
    
    const professional = professionals.find(prof => prof.id === product.professional_id);
    return professional?.name || 'Não atribuído';
  };

  // --- ESTILOS PREMIUM (IGUAL AO PROFESSIONALDASHBOARD) ---
  const styles = {
    container: {
      padding: '24px',
      background: 'transparent',
      minHeight: '100%',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '32px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.95)',
      margin: 0,
      letterSpacing: '-0.02em'
    },
    subtitle: {
      color: 'rgba(255, 255, 255, 0.7)',
      margin: '4px 0 0 0',
      fontSize: '14px'
    },
    addButton: {
      background: 'linear-gradient(135deg, #6D4AFF 0%, #00A693 100%)',
      border: 'none',
      borderRadius: '12px',
      padding: '12px 24px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 12px rgba(109, 74, 255, 0.3)'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '32px'
    },
    statCard: {
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '16px',
      padding: '24px',
      textAlign: 'center'
    },
    statNumber: {
      fontSize: '32px',
      fontWeight: '700',
      color: '#00A693',
      margin: '0 0 8px 0'
    },
    statLabel: {
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.7)',
      margin: 0
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
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '12px',
      width: '100%',
      fontSize: '14px',
      outline: 'none',
      color: 'rgba(255, 255, 255, 0.95)',
      fontFamily: 'Inter, sans-serif',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box'
    },
    searchIcon: {
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'rgba(255, 255, 255, 0.6)'
    },
    selectContainer: {
      position: 'relative'
    },
    select: {
      paddingLeft: '40px',
      paddingRight: '32px',
      paddingTop: '12px',
      paddingBottom: '12px',
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '12px',
      fontSize: '14px',
      outline: 'none',
      color: 'rgba(255, 255, 255, 0.95)',
      fontFamily: 'Inter, sans-serif',
      transition: 'all 0.2s ease'
    },
    tableContainer: {
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '16px',
      overflow: 'hidden'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    tableHeader: {
      background: 'rgba(255, 255, 255, 0.05)'
    },
    th: {
      padding: '16px 24px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.8)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
    },
    td: {
      padding: '16px 24px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      color: 'rgba(255, 255, 255, 0.9)'
    },
    productName: {
      fontSize: '14px',
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.95)',
      margin: 0
    },
    productDescription: {
      fontSize: '13px',
      color: 'rgba(255, 255, 255, 0.6)',
      margin: '4px 0 0 0',
      maxWidth: '300px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    statusBadge: {
      display: 'inline-flex',
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: '600',
      borderRadius: '20px',
      border: '1px solid'
    },
    statusActive: {
      background: 'rgba(0, 166, 147, 0.2)',
      color: '#00A693',
      borderColor: 'rgba(0, 166, 147, 0.4)'
    },
    statusInactive: {
      background: 'rgba(239, 68, 68, 0.2)',
      color: '#ef4444',
      borderColor: 'rgba(239, 68, 68, 0.4)'
    },
    actionButton: {
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '8px',
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      color: 'rgba(255, 255, 255, 0.8)'
    },
    editButton: {
      color: '#6D4AFF',
      borderColor: 'rgba(109, 74, 255, 0.3)',
      marginRight: '8px'
    },
    deleteButton: {
      color: 'rgba(239, 68, 68, 0.8)',
      borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: 'rgba(255, 255, 255, 0.6)'
    },
    emptyIcon: {
      fontSize: '48px',
      marginBottom: '16px',
      opacity: 0.5
    },
    emptyText: {
      fontSize: '18px',
      marginBottom: '8px',
      color: 'rgba(255, 255, 255, 0.9)'
    },
    emptySubtext: {
      fontSize: '14px',
      opacity: 0.7
    },
    emptyButton: {
      color: '#6D4AFF',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontWeight: '600',
      marginTop: '8px',
      fontSize: '14px'
    },
    spinner: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '256px',
      flexDirection: 'column'
    },
    spinnerElement: {
      width: '32px',
      height: '32px',
      border: '3px solid rgba(255, 255, 255, 0.2)',
      borderTopColor: '#6D4AFF',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '16px'
    },
    spinnerText: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: '16px'
    },
    // Modal styles (IGUAIS AO PROFESSIONALDASHBOARD)
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modalContent: {
      background: 'rgba(28, 27, 31, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '20px',
      padding: '32px',
      width: '100%',
      maxWidth: '600px',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    modalTitle: {
      fontSize: '24px',
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.95)',
      margin: 0
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: 'rgba(255, 255, 255, 0.7)',
      cursor: 'pointer',
      padding: '8px'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '24px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: 'rgba(255, 255, 255, 0.9)',
      marginBottom: '8px'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '12px',
      color: 'rgba(255, 255, 255, 0.95)',
      fontSize: '14px',
      fontFamily: 'Inter, sans-serif',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box'
    },
    modalSelect: {
      width: '100%',
      padding: '12px 16px',
      background: 'rgba(40, 40, 40, 0.95)',
      border: '1px solid rgba(255, 255, 255, 0.25)',
      borderRadius: '12px',
      color: 'rgba(255, 255, 255, 0.95)',
      fontSize: '14px',
      fontFamily: 'Inter, sans-serif',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box',
      cursor: 'pointer'
    },
    textarea: {
      width: '100%',
      padding: '12px 16px',
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '12px',
      color: 'rgba(255, 255, 255, 0.95)',
      fontSize: '14px',
      fontFamily: 'Inter, sans-serif',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box',
      minHeight: '80px',
      resize: 'vertical'
    },
    modalActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px'
    },
    cancelButton: {
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '12px',
      padding: '12px 24px',
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    saveButton: {
      background: 'linear-gradient(135deg, #6D4AFF 0%, #00A693 100%)',
      border: 'none',
      borderRadius: '12px',
      padding: '12px 24px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }
  };

  // --- RENDERIZAÇÃO ---
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.spinner}>
          <div style={styles.spinnerElement}></div>
          <p style={styles.spinnerText}>Carregando produtos...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            
            /* Estilo para options dos selects */
            select option {
              background: #2a2a2a !important;
              color: #ffffff !important;
              padding: 8px 12px !important;
            }
            
            select option:hover {
              background: #404040 !important;
            }
            
            select option:checked {
              background: #6D4AFF !important;
              color: white !important;
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Produtos & Serviços</h1>
          <p style={styles.subtitle}>Gerencie os produtos e serviços da sua empresa</p>
        </div>
        <button
          onClick={openNewModal}
          style={styles.addButton}
        >
          <Plus size={20} />
          Novo Produto
        </button>
      </div>

      {/* Estatísticas */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{productStats.totalProducts}</h3>
          <p style={styles.statLabel}>Total de Produtos</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{productStats.activeProducts}</h3>
          <p style={styles.statLabel}>Produtos Ativos</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{productStats.totalCategories}</h3>
          <p style={styles.statLabel}>Categorias</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>R$ {productStats.averagePrice}</h3>
          <p style={styles.statLabel}>Preço Médio</p>
        </div>
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
              <th style={styles.th}>Links</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="8" style={{...styles.td, ...styles.emptyState}}>
                  <Package size={48} style={styles.emptyIcon} />
                  <h3 style={styles.emptyText}>Nenhum produto encontrado</h3>
                  <p style={styles.emptySubtext}>Adicione seu primeiro produto para começar</p>
                  <button
                    onClick={openNewModal}
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
                    {product.link_url ? (
                      <a 
                        href={product.link_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{color: '#6D4AFF', textDecoration: 'none'}}
                      >
                        {product.link_label || 'Link'}
                      </a>
                    ) : '-'}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      ...(product.active ? styles.statusActive : styles.statusInactive)
                    }}>
                      {product.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={{display: 'flex', gap: '4px'}}>
                      <button
                        onClick={() => openEditModal(product)}
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
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button 
                onClick={closeModal}
                style={styles.closeButton}
              >
                <X size={24} />
              </button>
            </div>
            
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
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
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Categoria</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  style={styles.input}
                  placeholder="Ex: Clínica Geral, Estética, etc."
                />
              </div>

              <div style={styles.formGroup}>
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
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Duração (min)</label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                  style={styles.input}
                  placeholder="60"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Profissional</label>
                <select
                  value={formData.professional_id}
                  onChange={(e) => setFormData({...formData, professional_id: e.target.value})}
                  style={styles.modalSelect}
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

              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  style={styles.modalSelect}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                style={styles.textarea}
                placeholder="Descrição detalhada do produto/serviço"
              />
            </div>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Link</label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({...formData, link_url: e.target.value})}
                  style={styles.input}
                  placeholder="https://exemplo.com"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Label do Link</label>
                <input
                  type="text"
                  value={formData.link_label || ''}
                  onChange={(e) => setFormData({...formData, link_label: e.target.value})}
                  style={styles.input}
                  placeholder="Ex: Mais Info, Agendar"
                />
              </div>
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
                onClick={handleSave}
                style={styles.saveButton}
              >
                {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDashboard;