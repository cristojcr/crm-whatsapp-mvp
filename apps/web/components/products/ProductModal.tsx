// ARQUIVO: apps/web/components/products/ProductModal.tsx

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// O modal recebe o produto a ser editado (se houver), a lista de profissionais, e as funções para fechar e salvar.
const ProductModal = ({ product, professionals, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    professional_id: '',
    price: '',
    duration_minutes: '',
    category: '',
    status: 'active',
    observations: ''
  });
  const [loading, setLoading] = useState(false);

  // Efeito para preencher o formulário quando um produto é passado para edição
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        professional_id: product.professional_id || '',
        price: product.price || '',
        duration_minutes: product.duration_minutes || '',
        category: product.category || '',
        status: product.status || 'active',
        observations: product.observations || ''
      });
    }
  }, [product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Lógica para salvar os dados (será implementada na FASE 2 do Backend)
    console.log('Salvando dados:', formData);
    // Simulação de chamada de API
    setTimeout(() => {
      setLoading(false);
      alert(product ? 'Produto atualizado com sucesso (simulação)!' : 'Produto criado com sucesso (simulação)!');
      onSave(); // Chama a função para fechar o modal e recarregar a lista
    }, 1500);
  };

  // Lista de categorias para o campo select
  const categories = [
    'Clínica Geral', 'Ortodontia', 'Cirurgia', 'Estética', 'Endodontia', 
    'Periodontia', 'Implantodontia', 'Radiologia', 'Consulta', 'Exame', 'Outro'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {product ? 'Editar Produto' : 'Novo Produto'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome do Produto */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto/Serviço *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Tratamento de Canal"
              />
            </div>

            {/* Descrição */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Detalhada</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descreva o procedimento, indicações, requisitos..."
              />
            </div>

            {/* Profissional Responsável */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profissional Responsável</label>
              <select
                value={formData.professional_id}
                onChange={(e) => setFormData({ ...formData, professional_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Nenhum específico</option>
                {/* A lista de profissionais será carregada aqui */}
              </select>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            {/* Preço */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>

            {/* Duração */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração (minutos)</label>
              <input
                type="number"
                min="0"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: 60"
              />
            </div>

            {/* Status */}
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="flex gap-4">
                    <label className="flex items-center">
                        <input type="radio" value="active" checked={formData.status === 'active'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="mr-2"/>
                        Ativo
                    </label>
                    <label className="flex items-center">
                        <input type="radio" value="inactive" checked={formData.status === 'inactive'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="mr-2"/>
                        Inativo
                    </label>
                </div>
            </div>

            {/* Observações */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Requisitos especiais, preparação necessária..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;