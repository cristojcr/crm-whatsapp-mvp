// apps/web/components/BrandingSettings.jsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Palette, Eye, Save } from 'lucide-react';

const BrandingSettings = ({ whiteLabelData, onUpdate }) => {
  const [formData, setFormData] = useState({
    company_name: whiteLabelData?.company_name || '',
    subdomain: whiteLabelData?.subdomain || '',
    primary_color: whiteLabelData?.primary_color || '#6366f1',
    secondary_color: whiteLabelData?.secondary_color || '#8b5cf6',
    accent_color: whiteLabelData?.accent_color || '#06b6d4',
    support_email: whiteLabelData?.support_email || '',
    support_phone: whiteLabelData?.support_phone || ''
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/white-label/logo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });

      if (response.ok) {
        onUpdate(); // Recarregar dados
      }
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/white-label/settings', {
        method: whiteLabelData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onUpdate(); // Recarregar dados
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuração de Marca</h2>
          <p className="text-gray-600">
            Personalize a aparência da sua plataforma white label
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações */}
        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    company_name: e.target.value
                  }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Sua Empresa Ltda"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Subdomínio
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={formData.subdomain}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                    }))}
                    className="flex-1 px-3 py-2 border rounded-l-lg"
                    placeholder="minhaempresa"
                  />
                  <span className="px-3 py-2 bg-gray-100 border-t border-b border-r rounded-r-lg text-sm text-gray-600">
                    .seudominio.com.br
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email de Suporte
                </label>
                <input
                  type="email"
                  value={formData.support_email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    support_email: e.target.value
                  }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="suporte@suaempresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Telefone de Suporte
                </label>
                <input
                  type="tel"
                  value={formData.support_phone}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    support_phone: e.target.value
                  }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </CardContent>
          </Card>

          {/* Logo */}
          <Card>
            <CardHeader>
              <CardTitle>Logo da Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {whiteLabelData?.logo_url && (
                  <div className="flex items-center justify-center p-4 border rounded-lg">
                    <img
                      src={whiteLabelData.logo_url}
                      alt="Logo atual"
                      className="max-h-16 max-w-32 object-contain"
                    />
                  </div>
                )}
                
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    {uploading ? 'Enviando...' : 'Fazer Upload do Logo'}
                  </label>
                </div>
                
                <p className="text-xs text-gray-500">
                  Recomendado: PNG ou SVG, máximo 2MB, proporção 3:1
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Cores */}
          <Card>
            <CardHeader>
              <CardTitle>Paleta de Cores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Cor Primária
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        primary_color: e.target.value
                      }))}
                      className="w-12 h-10 border rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        primary_color: e.target.value
                      }))}
                      className="flex-1 px-2 py-1 text-xs border rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Cor Secundária
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        secondary_color: e.target.value
                      }))}
                      className="w-12 h-10 border rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        secondary_color: e.target.value
                      }))}
                      className="flex-1 px-2 py-1 text-xs border rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Cor de Destaque
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.accent_color}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        accent_color: e.target.value
                      }))}
                      className="w-12 h-10 border rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.accent_color}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        accent_color: e.target.value
                      }))}
                      className="flex-1 px-2 py-1 text-xs border rounded"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Preview da Marca
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Preview do Header */}
                <div 
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: formData.primary_color }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {whiteLabelData?.logo_url ? (
                        <img
                          src={whiteLabelData.logo_url}
                          alt="Logo"
                          className="h-8 object-contain"
                        />
                      ) : (
                        <div className="w-20 h-8 bg-white bg-opacity-20 rounded flex items-center justify-center">
                          <span className="text-white text-xs">LOGO</span>
                        </div>
                      )}
                      <span className="ml-3 text-white font-medium">
                        {formData.company_name || 'Sua Empresa'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Preview dos Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className="p-3 rounded-lg text-white"
                    style={{ backgroundColor: formData.secondary_color }}
                  >
                    <div className="text-sm font-medium">Clientes</div>
                    <div className="text-lg font-bold">25</div>
                  </div>
                  <div 
                    className="p-3 rounded-lg text-white"
                    style={{ backgroundColor: formData.accent_color }}
                  >
                    <div className="text-sm font-medium">Receita</div>
                    <div className="text-lg font-bold">R$ 2.5K</div>
                  </div>
                </div>

                {/* Preview do Botão */}
                <button 
                  className="w-full py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: formData.primary_color }}
                >
                  Botão de Ação
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BrandingSettings;