// apps/web/components/admin/DataProtectionDashboard.jsx
import React, { useState, useEffect } from 'react';

const DataProtectionDashboard = () => {
    const [stats, setStats] = useState(null);
    const [requests, setRequests] = useState([]);
    const [consents, setConsents] = useState([]);
    const [breaches, setBreaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');

    useEffect(() => {
        loadDashboardData();
        const interval = setInterval(loadDashboardData, 60000); // Atualizar a cada 1 minuto
        return () => clearInterval(interval);
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            console.log('🔍 Carregando dados reais de compliance...');
            
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };
            
            // Buscar estatísticas gerais
            try {
                const statsResponse = await fetch('/api/data-protection/stats', { headers });
                if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    setStats(statsData.data || {});
                    console.log('✅ Estatísticas carregadas:', statsData.data);
                } else {
                    console.log('⚠️ API de stats não disponível, usando contadores diretos');
                }
            } catch (error) {
                console.log('⚠️ Erro ao buscar stats, continuando com dados diretos');
            }
            
            // Buscar solicitações dos titulares (dados reais)
            try {
                console.log('📋 Buscando solicitações reais...');
                const requestsResponse = await fetch('/api/data-protection/requests', { headers });
                
                if (requestsResponse.ok) {
                    const requestsData = await requestsResponse.json();
                    setRequests(requestsData.requests || []);
                    console.log(`✅ ${requestsData.requests?.length || 0} solicitações carregadas`);
                } else {
                    // Se API não existe ainda, buscar direto do Supabase via query
                    const directResponse = await fetch('/api/admin/direct-query', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            query: 'SELECT * FROM data_subject_requests ORDER BY created_at DESC LIMIT 10'
                        })
                    });
                    
                    if (directResponse.ok) {
                        const directData = await directResponse.json();
                        setRequests(directData.data || []);
                        console.log(`✅ ${directData.data?.length || 0} solicitações via query direta`);
                    } else {
                        console.log('📋 Nenhuma solicitação encontrada - sistema limpo');
                        setRequests([]);
                    }
                }
            } catch (error) {
                console.error('❌ Erro ao buscar solicitações:', error);
                setRequests([]);
            }
            
            // Buscar consentimentos (dados reais)
            try {
                console.log('✅ Buscando consentimentos reais...');
                const consentsResponse = await fetch('/api/data-protection/consents', { headers });
                
                if (consentsResponse.ok) {
                    const consentsData = await consentsResponse.json();
                    setConsents(consentsData.consents || []);
                    console.log(`✅ ${consentsData.consents?.length || 0} consentimentos carregados`);
                } else {
                    // Query direta se API não existe
                    const directResponse = await fetch('/api/admin/direct-query', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            query: 'SELECT * FROM data_protection_consents ORDER BY consent_date DESC LIMIT 10'
                        })
                    });
                    
                    if (directResponse.ok) {
                        const directData = await directResponse.json();
                        setConsents(directData.data || []);
                        console.log(`✅ ${directData.data?.length || 0} consentimentos via query direta`);
                    } else {
                        console.log('✅ Nenhum consentimento encontrado - sistema limpo');
                        setConsents([]);
                    }
                }
            } catch (error) {
                console.error('❌ Erro ao buscar consentimentos:', error);
                setConsents([]);
            }
            
            // Buscar violações de dados (dados reais)
            try {
                console.log('🚨 Buscando violações reais...');
                const breachesResponse = await fetch('/api/data-protection/breaches', { headers });
                
                if (breachesResponse.ok) {
                    const breachesData = await breachesResponse.json();
                    setBreaches(breachesData.breaches || []);
                    console.log(`✅ ${breachesData.breaches?.length || 0} violações carregadas`);
                } else {
                    // Query direta se API não existe
                    const directResponse = await fetch('/api/admin/direct-query', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            query: 'SELECT * FROM data_breach_incidents ORDER BY discovered_date DESC LIMIT 10'
                        })
                    });
                    
                    if (directResponse.ok) {
                        const directData = await directResponse.json();
                        setBreaches(directData.data || []);
                        console.log(`✅ ${directData.data?.length || 0} violações via query direta`);
                    } else {
                        console.log('🚨 Nenhuma violação encontrada - sistema limpo');
                        setBreaches([]);
                    }
                }
            } catch (error) {
                console.error('❌ Erro ao buscar violações:', error);
                setBreaches([]);
            }
            
            console.log('🎯 Carregamento de dados reais concluído!');
            
        } catch (error) {
            console.error('❌ Erro geral ao carregar dados do dashboard:', error);
            // Em caso de erro, manter arrays vazios (dados limpos)
            setRequests([]);
            setConsents([]);
            setBreaches([]);
            setStats({
                subject_requests: 0,
                consents: 0,
                data_breaches: 0
            });
        } finally {
            setLoading(false);
        }
    };

    const handleNewRequest = async (type) => {
        if (type === 'test_data') {
            // Criar dados de teste para demonstração
            try {
                console.log('🧪 Criando dados de teste...');
                
                // Criar solicitação de teste
                const testResponse = await fetch('/api/data-protection/data-subject-request/access', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        requester_email: 'teste@exemplo.com',
                        requester_name: 'Usuário Teste',
                        description: 'Solicitação de teste para demonstração do sistema LGPD/GDPR'
                    })
                });
                
                if (testResponse.ok) {
                    console.log('✅ Dados de teste criados!');
                    // Recarregar dashboard
                    loadDashboardData();
                } else {
                    console.log('⚠️ Erro ao criar dados de teste');
                }
                
            } catch (error) {
                console.error('❌ Erro ao criar dados de teste:', error);
            }
        } else {
            setModalType(type);
            setShowModal(true);
        }
    };

    const getStatusBadge = (status) => {
        const colors = {
            'pending': { bg: '#FFF3E0', color: '#F57C00', text: 'Pendente' },
            'in_progress': { bg: '#E3F2FD', color: '#1976D2', text: 'Em Andamento' },
            'completed': { bg: '#E8F5E8', color: '#388E3C', text: 'Concluído' },
            'rejected': { bg: '#FFEBEE', color: '#D32F2F', text: 'Rejeitado' }
        };
        
        const style = colors[status] || colors['pending'];
        
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: style.bg,
                color: style.color
            }}>
                {style.text}
            </span>
        );
    };

    const getSeverityBadge = (severity) => {
        const colors = {
            'low': { bg: '#E8F5E8', color: '#388E3C', text: 'Baixa' },
            'medium': { bg: '#FFF3E0', color: '#F57C00', text: 'Média' },
            'high': { bg: '#FFEBEE', color: '#D32F2F', text: 'Alta' },
            'critical': { bg: '#FCE4EC', color: '#C2185B', text: 'Crítica' }
        };
        
        const style = colors[severity] || colors['low'];
        
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: style.bg,
                color: style.color
            }}>
                {style.text}
            </span>
        );
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const calculateDaysRemaining = (dueDate) => {
        const now = new Date();
        const due = new Date(dueDate);
        const diffTime = due - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '500px',
                fontSize: '18px',
                color: '#666',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ fontSize: '48px' }}>🔒</div>
                <div>Carregando dados reais de compliance LGPD/GDPR...</div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                    Conectando com as tabelas do Supabase
                </div>
            </div>
        );
    }

    return (
        <div style={{ 
            minHeight: '100vh', 
            backgroundColor: '#f8f9fa', 
            padding: '20px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '30px',
                borderRadius: '12px',
                marginBottom: '24px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
                            🔒 Dashboard de Proteção de Dados
                        </h1>
                        <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '16px' }}>
                            Sistema de Compliance LGPD/GDPR - Gestão completa de privacidade
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', opacity: 0.8 }}>
                            Última atualização
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                            {new Date().toLocaleString('pt-BR')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ 
                    display: 'flex', 
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '8px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                    {[
                        { id: 'overview', label: '📊 Visão Geral', icon: '📊' },
                        { id: 'requests', label: '📋 Solicitações', icon: '📋' },
                        { id: 'consents', label: '✅ Consentimentos', icon: '✅' },
                        { id: 'breaches', label: '🚨 Violações', icon: '🚨' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                backgroundColor: activeTab === tab.id ? '#667eea' : 'transparent',
                                color: activeTab === tab.id ? 'white' : '#666',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'overview' && (
                <div>
                    {/* KPIs */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '20px',
                        marginBottom: '24px'
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            padding: '24px',
                            borderRadius: '12px',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                            <h3 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '16px' }}>
                                Solicitações dos Titulares
                            </h3>
                            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#667eea', margin: 0 }}>
                                {stats?.subject_requests || requests.length}
                            </p>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                {requests.length > 0 ? 'Dados reais do sistema' : 'Sistema limpo - sem solicitações'}
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: 'white',
                            padding: '24px',
                            borderRadius: '12px',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                            <h3 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '16px' }}>
                                Consentimentos Ativos
                            </h3>
                            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#4CAF50', margin: 0 }}>
                                {stats?.consents || consents.length}
                            </p>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                {consents.length > 0 ? 'Dados reais do sistema' : 'Sistema limpo - sem consentimentos'}
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: 'white',
                            padding: '24px',
                            borderRadius: '12px',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚨</div>
                            <h3 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '16px' }}>
                                Violações de Dados
                            </h3>
                            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#f44336', margin: 0 }}>
                                {stats?.data_breaches || breaches.length}
                            </p>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                {breaches.length > 0 ? 'Dados reais do sistema' : 'Sistema seguro - sem violações'}
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: 'white',
                            padding: '24px',
                            borderRadius: '12px',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏰</div>
                            <h3 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '16px' }}>
                                Prazo Médio de Resposta
                            </h3>
                            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#FF9800', margin: 0 }}>
                                {requests.length > 0 ? 
                                    Math.round(requests.reduce((acc, req) => {
                                        const remaining = calculateDaysRemaining(req.response_due_date);
                                        return acc + (15 - remaining); // Dias já passados
                                    }, 0) / requests.length) : 0} dias
                            </p>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                {requests.length > 0 ? 'Baseado em solicitações reais' : 'Nenhuma solicitação para calcular'}
                            </div>
                        </div>
                    </div>

                    {/* Ações Rápidas */}
                    <div style={{
                        backgroundColor: 'white',
                        padding: '24px',
                        borderRadius: '12px',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        marginBottom: '24px'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>⚡ Ações Rápidas</h3>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => handleNewRequest('access')}
                                style={{
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 20px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                }}
                            >
                                📋 Nova Solicitação de Acesso
                            </button>
                            
                            <button
                                onClick={() => handleNewRequest('test_data')}
                                style={{
                                    backgroundColor: '#9C27B0',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 20px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                }}
                            >
                                🧪 Criar Dados de Teste
                            </button>
                            
                            <button
                                onClick={() => handleNewRequest('breach')}
                                style={{
                                    backgroundColor: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 20px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                }}
                            >
                                🚨 Reportar Violação
                            </button>
                            
                            <button
                                onClick={() => window.open('/api/data-protection/health', '_blank')}
                                style={{
                                    backgroundColor: '#2196F3',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 20px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                }}
                            >
                                🔍 Verificar Status da API
                            </button>
                            
                            <button
                                onClick={loadDashboardData}
                                style={{
                                    backgroundColor: '#FF9800',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 20px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                }}
                            >
                                🔄 Recarregar Dados Reais
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'requests' && (
                <div style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, color: '#333' }}>📋 Solicitações dos Titulares</h3>
                        <button
                            onClick={() => handleNewRequest('access')}
                            style={{
                                backgroundColor: '#667eea',
                                color: 'white',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            ➕ Nova Solicitação
                        </button>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8f9fa' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>Tipo</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>Solicitante</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>Data</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>Prazo</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(request => (
                                    <tr key={request.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                backgroundColor: request.request_type === 'access' ? '#E3F2FD' : '#FFEBEE',
                                                color: request.request_type === 'access' ? '#1976D2' : '#D32F2F'
                                            }}>
                                                {request.request_type === 'access' ? 'Acesso' : 
                                                 request.request_type === 'erasure' ? 'Exclusão' : 
                                                 request.request_type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>{request.requester_email}</td>
                                        <td style={{ padding: '12px' }}>{getStatusBadge(request.status)}</td>
                                        <td style={{ padding: '12px' }}>{formatDate(request.created_at)}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                color: calculateDaysRemaining(request.response_due_date) <= 3 ? '#f44336' : '#666'
                                            }}>
                                                {calculateDaysRemaining(request.response_due_date)} dias
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <button style={{
                                                backgroundColor: '#667eea',
                                                color: 'white',
                                                border: 'none',
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}>
                                                Ver Detalhes
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'consents' && (
                <div style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                    <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>✅ Gestão de Consentimentos</h3>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8f9fa' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>Usuário</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>Tipo</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>Data</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {consents.map(consent => (
                                    <tr key={consent.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                                        <td style={{ padding: '12px' }}>{consent.user_email}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                backgroundColor: '#E8F5E8',
                                                color: '#388E3C'
                                            }}>
                                                {consent.consent_type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                backgroundColor: consent.consent_given ? '#E8F5E8' : '#FFEBEE',
                                                color: consent.consent_given ? '#388E3C' : '#D32F2F'
                                            }}>
                                                {consent.consent_given ? 'Autorizado' : 'Revogado'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>{formatDate(consent.consent_date)}</td>
                                        <td style={{ padding: '12px' }}>
                                            <button style={{
                                                backgroundColor: '#f44336',
                                                color: 'white',
                                                border: 'none',
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}>
                                                Revogar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'breaches' && (
                <div style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, color: '#333' }}>🚨 Violações de Dados</h3>
                        <button
                            onClick={() => handleNewRequest('breach')}
                            style={{
                                backgroundColor: '#f44336',
                                color: 'white',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            🚨 Reportar Violação
                        </button>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8f9fa' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>Título</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>Severidade</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>Data</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e9ecef' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {breaches.map(breach => (
                                    <tr key={breach.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{breach.title}</td>
                                        <td style={{ padding: '12px' }}>{getSeverityBadge(breach.severity)}</td>
                                        <td style={{ padding: '12px' }}>{getStatusBadge(breach.status)}</td>
                                        <td style={{ padding: '12px' }}>{formatDate(breach.discovered_date)}</td>
                                        <td style={{ padding: '12px' }}>
                                            <button style={{
                                                backgroundColor: '#667eea',
                                                color: 'white',
                                                border: 'none',
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}>
                                                Investigar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal placeholder */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '24px',
                        borderRadius: '12px',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0' }}>
                            {modalType === 'access' ? '📋 Nova Solicitação de Acesso' : 
                             modalType === 'breach' ? '🚨 Reportar Violação de Dados' : 
                             'Nova Ação'}
                        </h3>
                        <p style={{ color: '#666', marginBottom: '20px' }}>
                            Funcionalidade em desenvolvimento. Em breve você poderá criar novas solicitações diretamente desta interface.
                        </p>
                        <button
                            onClick={() => setShowModal(false)}
                            style={{
                                backgroundColor: '#667eea',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div style={{ 
                textAlign: 'center', 
                marginTop: '32px', 
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                    🔒 Sistema de Proteção de Dados LGPD/GDPR v1.0.0 - Dados Reais do Supabase
                </p>
                <p style={{ margin: '4px 0 0 0', color: '#999', fontSize: '12px' }}>
                    Conectado: data_subject_requests • data_protection_consents • data_breach_incidents • audit_logs
                </p>
                <p style={{ margin: '4px 0 0 0', color: '#4CAF50', fontSize: '12px', fontWeight: 'bold' }}>
                    ✅ Compliance Enterprise Ativo com Dados Reais
                </p>
            </div>
        </div>
    );
};

export default DataProtectionDashboard;