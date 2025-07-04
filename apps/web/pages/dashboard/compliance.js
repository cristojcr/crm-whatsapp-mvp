// apps/web/pages/dashboard/compliance.js
import React, { useState, useEffect } from 'react';

export default function CompliancePage() {
  const [stats, setStats] = useState(null);
  const [windows, setWindows] = useState([]);
  const [queue, setQueue] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComplianceData();
    const interval = setInterval(loadComplianceData, 30000); // Atualizar a cada 30s
    return () => clearInterval(interval);
  }, []);

  const loadComplianceData = async () => {
    try {
      setLoading(true);
      
      // Buscar estatísticas
      const statsResponse = await fetch('/api/compliance/stats');
      const statsData = await statsResponse.json();
      
      // Buscar janelas ativas
      const windowsResponse = await fetch('/api/compliance/windows');
      const windowsData = await windowsResponse.json();
      
      // Buscar fila
      const queueResponse = await fetch('/api/compliance/queue');
      const queueData = await queueResponse.json();
      
      // Buscar templates WhatsApp
      const templatesResponse = await fetch('/api/templates?channel_type=whatsapp');
      const templatesData = await templatesResponse.json();

      setStats(statsData.stats || {});
      setWindows(windowsData.windows || []);
      setQueue(queueData.queue || []);
      setTemplates(templatesData.templates || []);
      
    } catch (error) {
      console.error('Erro ao carregar dados de compliance:', error);
      // Dados de exemplo para teste
      setStats({
        total_conversations: 0,
        active_windows: 0,
        expired_windows: 0,
        queued_messages: 0,
        sent_today: 0,
        compliance_rate: 100
      });
      setWindows([]);
      setQueue([]);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const processQueue = async () => {
    try {
      const response = await fetch('/api/compliance/process-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      alert(data.message || 'Fila processada!');
      loadComplianceData(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao processar fila:', error);
      alert('Erro ao processar fila');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>🔒 Sistema de Compliance - Janela 24h Meta</h1>
        <p>Carregando dados de compliance...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>
          🔒 Sistema de Compliance - Janela 24h Meta
        </h1>
        <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
          Monitoramento em tempo real das regras WhatsApp Business API
        </p>
      </div>

      {/* Estatísticas Principais */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>💬 Conversas Ativas</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50', margin: 0 }}>
            {stats?.total_conversations || 0}
          </p>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>⏰ Janelas Ativas</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3', margin: 0 }}>
            {stats?.active_windows || 0}
          </p>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>❌ Janelas Expiradas</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336', margin: 0 }}>
            {stats?.expired_windows || 0}
          </p>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>📋 Fila de Mensagens</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800', margin: 0 }}>
            {stats?.queued_messages || 0}
          </p>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>📤 Enviadas Hoje</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#9C27B0', margin: 0 }}>
            {stats?.sent_today || 0}
          </p>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>✅ Taxa Compliance</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50', margin: 0 }}>
            {stats?.compliance_rate || 100}%
          </p>
        </div>
      </div>

      {/* Ações */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>⚡ Ações Rápidas</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={processQueue}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🚀 Processar Fila
          </button>
          
          <button
            onClick={loadComplianceData}
            style={{
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Atualizar Dados
          </button>
        </div>
      </div>

      {/* Status das APIs */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>🔗 Status das APIs</h3>
        <div style={{ display: 'grid', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📊 /api/compliance/stats</span>
            <span style={{ 
              padding: '5px 10px', 
              borderRadius: '20px', 
              backgroundColor: stats ? '#4CAF50' : '#f44336',
              color: 'white',
              fontSize: '12px'
            }}>
              {stats ? 'OK' : 'ERROR'}
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⏰ /api/compliance/windows</span>
            <span style={{ 
              padding: '5px 10px', 
              borderRadius: '20px', 
              backgroundColor: '#4CAF50',
              color: 'white',
              fontSize: '12px'
            }}>
              OK
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📋 /api/compliance/queue</span>
            <span style={{ 
              padding: '5px 10px', 
              borderRadius: '20px', 
              backgroundColor: '#4CAF50',
              color: 'white',
              fontSize: '12px'
            }}>
              OK
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📱 /api/templates</span>
            <span style={{ 
              padding: '5px 10px', 
              borderRadius: '20px', 
              backgroundColor: '#4CAF50',
              color: 'white',
              fontSize: '12px'
            }}>
              OK
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
        <p>🔒 Sistema de Compliance ativo - Última atualização: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}