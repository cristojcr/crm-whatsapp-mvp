// apps/web/components/WhiteLabelDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Palette,
  DollarSign,
  Users,
  BarChart3,
  Settings,
  Upload,
  Eye,
  Globe,
  Check,
  AlertCircle
} from 'lucide-react';

// Importar componentes específicos (criar separadamente)
import BrandingSettings from './BrandingSettings';
import PricingManagement from './PricingManagement';
import CustomerManagement from './CustomerManagement';

const WhiteLabelDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [whiteLabelData, setWhiteLabelData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWhiteLabelData();
  }, []);

  const loadWhiteLabelData = async () => {
    try {
      const response = await fetch('/api/white-label/settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setWhiteLabelData(data.settings);
    } catch (error) {
      console.error('Erro ao carregar dados white label:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Visão Geral', icon: BarChart3 },
    { id: 'branding', name: 'Marca & Visual', icon: Palette },
    { id: 'pricing', name: 'Preços', icon: DollarSign },
    { id: 'customers', name: 'Clientes', icon: Users },
    { id: 'settings', name: 'Configurações', icon: Settings }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando white label...</p>
        </div>
      </div>
    );
  }

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Status da Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Status da Configuração White Label
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              {whiteLabelData?.company_name ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <span>Nome da Empresa</span>
            </div>
            
            <div className="flex items-center space-x-3">
              {whiteLabelData?.logo_url ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <span>Logo</span>
            </div>
            
            <div className="flex items-center space-x-3">
              {whiteLabelData?.subdomain ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <span>Subdomínio</span>
            </div>
          </div>
          
          {whiteLabelData?.subdomain && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Sua plataforma white label está disponível em:</strong>
              </p>
              <p className="text-lg font-mono text-blue-600">
                https://{whiteLabelData.subdomain}.seudominio.com.br
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clientes Ativos</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Receita Mensal</p>
                <p className="text-2xl font-bold">R$ 0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Comissão</p>
                <p className="text-2xl font-bold">R$ 0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Conversões</p>
                <p className="text-2xl font-bold">0%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Setup Wizard */}
      {!whiteLabelData?.setup_completed && (
        <Card>
          <CardHeader>
            <CardTitle>Configuração Inicial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                Complete a configuração da sua plataforma white label:
              </p>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setActiveTab('branding')}
                  variant="outline"
                  size="sm"
                >
                  <Palette className="h-4 w-4 mr-2" />
                  Configurar Marca
                </Button>
                
                <Button
                  onClick={() => setActiveTab('pricing')}
                  variant="outline"
                  size="sm"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Definir Preços
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                White Label Dashboard
              </h1>
              {whiteLabelData?.company_name && (
                <Badge variant="secondary" className="ml-3">
                  {whiteLabelData.company_name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'branding' && (
          <BrandingSettings 
            whiteLabelData={whiteLabelData}
            onUpdate={loadWhiteLabelData}
          />
        )}
        {activeTab === 'pricing' && (
          <PricingManagement 
            partnerId={whiteLabelData?.partner_id}
          />
        )}
        {activeTab === 'customers' && (
          <CustomerManagement 
            partnerId={whiteLabelData?.partner_id}
          />
        )}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Configurações avançadas em breve...</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhiteLabelDashboard;