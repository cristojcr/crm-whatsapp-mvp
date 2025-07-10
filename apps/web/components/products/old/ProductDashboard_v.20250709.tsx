import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
// Futuramente, importaremos o modal aqui:
import ProductModal from './ProductModal'; 

const ProductDashboard = () => {
  // --- ESTADOS DO COMPONENTE ---
  const [products, setProducts] = useState([]);
  const [professionals, setProfessionals] = useState([]); // Para o modal
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  // Estados para o modal (Fase 5)
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // --- EFEITOS E CARREGAMENTO DE DADOS ---
  // Simula o carregamento de dados da API
  useEffect(() => {
    setLoading(true);
    // Dados mocados para visualização inicial
    const mockProducts = [
      { id: 1, name: 'Tratamento de Canal', description: 'Procedimento endodôntico completo.', category: 'Endodontia', price: '850.00', duration_minutes: 90, status: 'active', professionals: { name: 'Dr. Julio Cristo' } },
      { id: 2, name: 'Limpeza Dental Profissional', description: 'Remoção de tártaro e placa bacteriana.', category: 'Clínica Geral', price: '250.00', duration_minutes: 50, status: 'active', professionals: { name: 'Dra. Maria' } },
      { id: 3, name: 'Clareamento a Laser', description: 'Sessão única de clareamento dental.', category: 'Estética', price: '1200.00', duration_minutes: 60, status: 'inactive', professionals: { name: 'Dr. Pedro' } },
    ];
    setTimeout(() => {
      setProducts(mockProducts);
      setLoading(false);
    }, 1000); // Simula 1 segundo de loading
  }, []);

  // --- LÓGICA DE FILTRO E BUSCA ---
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // --- RENDERIZAÇÃO ---
  // Spinner de carregamento
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Produtos & Serviços</h2>
          <p className="text-gray-600">Gerencie os produtos e serviços da sua empresa</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null); // Define como NULO para indicar que é um NOVO produto
            setShowModal(true);      // Mostra o modal
          }}
  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Produto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <Filter size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todas as categorias</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto/Serviço</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profissional</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duração</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    Nenhum produto encontrado.
                    <br />
                    <button
                      onClick={() => {
                        setEditingProduct(null); // Também define como NULO
                        setShowModal(true);      // Também mostra o modal
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium mt-2"
                    >
                      Adicionar primeiro produto
                    </button>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">{product.description}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{product.professionals?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{product.category || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{product.price ? `R$ ${product.price}` : '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{product.duration_minutes ? `${product.duration_minutes} min` : '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {product.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingProduct(product); // Passa o 'product' da linha atual para o estado de edição
                            setShowModal(true);         // Mostra o modal
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button className="text-red-600 hover:text-red-900"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductDashboard;