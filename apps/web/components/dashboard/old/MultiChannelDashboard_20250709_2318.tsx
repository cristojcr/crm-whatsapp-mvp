import React, { useState, useEffect } from 'react';
import { Users, Plus, Calendar, Phone, Mail, X, Edit3, Trash2, Clock, MapPin, Star } from 'lucide-react';
import ProductDashboard from './products/ProductDashboard';

// Nomes e Cores para cada canal
const getChannelName = (type) => {
    const names = { 
        whatsapp: 'WhatsApp', 
        instagram: 'Instagram', 
        telegram: 'Telegram' 
    };
    return names[type] || type;
};

const getChannelColor = (type) => {
    const colors = { 
        whatsapp: '#25D366', 
        instagram: '#E1306C', 
        telegram: '#0088CC' 
    };
    return colors[type] || '#6c757d';
};

// Ícones para cada canal
const ChannelIcon = ({ type }) => {
    const icons = {
        whatsapp: '📱',
        instagram: '📸',
        telegram: '✈️'
    };
    return <span style={{ fontSize: '20px', lineHeight: 1 }}>{icons[type] || '💬'}</span>;
};

// ✅ COMPONENTE PRINCIPAL CORRIGIDO - SEM CONFLITOS DE AUTH
const MultiChannelDashboard = ({ channels = [], loading = false, user = null }) => {
    // Estados do dashboard
    const [selectedChannel, setSelectedChannel] = useState('all');
    const [activeTab, setActiveTab] = useState('multicanais');

    // Estados dos profissionais
    const [professionals, setProfessionals] = useState([]);
    const [planLimits, setPlanLimits] = useState({ current: 0, max: 1, plan: 'BASIC' });
    const [professionalStats, setProfessionalStats] = useState({
        totalProfessionals: 0,
        totalAppointments: 0,
        monthlyGrowth: 0
    });
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [professionalsLoading, setProfessionalsLoading] = useState(false);
    const [selectedProfessional, setSelectedProfessional] = useState(null);
    // Estados do Google Calendar (ID 2.17.2)
    const [calendarStatus, setCalendarStatus] = useState({});
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    
    const [newProfessional, setNewProfessional] = useState({
        name: '',
        email: '',
        phone: '',
        specialty: '',
        google_calendar_email: '',
        bio: '',
        hourly_rate: ''
    });

    // Dados simulados para multicanal
    const [metrics, setMetrics] = useState({
        totalMessages: 2337,
        activeConversations: 3,
        responseRate: 46
    });
    const [conversations, setConversations] = useState([
        { id: 1, name: 'João Silva', message: 'Olá, preciso agendar uma consulta', channel: 'whatsapp', unread: 2, date: '20/06/2025' },
        { id: 2, name: 'Maria Santos', message: 'Qual o valor do tratamento?', channel: 'instagram', unread: 1, date: '20/06/2025' },
        { id: 3, name: 'Pedro Costa', message: 'Obrigado pelo atendimento!', channel: 'telegram', unread: 0, date: '20/06/2025' },
    ]);

    // ✅ FUNÇÃO CORRIGIDA - DETECÇÃO AUTOMÁTICA DA CHAVE SUPABASE
    const getAuthToken = () => {
        if (typeof window === 'undefined') return null;
        
        console.log('🔍 Buscando token...');
        
        // Buscar chave específica do Supabase (padrão: sb-*-auth-token)
        const allKeys = Object.keys(localStorage);
        console.log('🔑 Todas as chaves:', allKeys);
        
        const supabaseKey = allKeys.find(key => 
            key.startsWith('sb-') && key.endsWith('-auth-token')
        );
        
        console.log('🎯 Chave do Supabase encontrada:', supabaseKey);
        
        if (supabaseKey) {
            const stored = localStorage.getItem(supabaseKey);
            console.log('📦 Dados armazenados:', stored ? 'EXISTE' : 'VAZIO');
            
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    console.log('✅ Token parsed com sucesso');
                    
                    if (parsed.access_token) {
                        console.log('🔑 Access token encontrado:', parsed.access_token.substring(0, 50) + '...');
                        return parsed.access_token;
                    }
                } catch (error) {
                    console.error('❌ Erro ao fazer parse do token:', error);
                    return stored;
                }
            }
        }
        
        // Fallback para outras chaves
        const fallbackKeys = ['access_token', 'token', 'auth_token', 'user_token'];
        for (const key of fallbackKeys) {
            const stored = localStorage.getItem(key);
            if (stored) {
                console.log('🔄 Tentando fallback key:', key);
                try {
                    const parsed = JSON.parse(stored);
                    return parsed.access_token || stored;
                } catch {
                    return stored;
                }
            }
        }
        
        console.log('❌ Nenhum token encontrado');
        return null;
    };
        
    // ✅ NOVA FUNÇÃO - PROCESSAR CALLBACK OAUTH2
    const handleOAuth2Callback = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const calendarSuccess = urlParams.get('calendar_success');
        const professionalId = urlParams.get('professional');
        
        if (calendarSuccess === 'true' && professionalId) {
            console.log('✅ OAuth2 callback detectado! Recarregando dados...');
            
            // Mostrar notificação de sucesso
            setShowSuccessNotification(true);
            setTimeout(() => setShowSuccessNotification(false), 5000);
            
            // Ir para aba profissionais primeiro
            setActiveTab('profissionais');
            
            // Aguardar um pouco e recarregar dados
            setTimeout(async () => {
                await loadProfessionalsData();
                // Forçar atualização do status específico do profissional
                await loadCalendarStatus(professionalId);
            }, 1000);
            
            // Limpar parâmetros da URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    };

    // ✅ VERIFICAÇÃO SIMPLIFICADA - USA USER DO PAI
    const isAuthenticated = () => {
        // Verificar se tem token
        const token = getAuthToken();
        if (!token) {
            console.warn('⚠️ Token não encontrado');
            return false;
        }
        
        // Verificar se tem user (opcional)
        if (user && user.id) {
            return true;
        }
        
        // Se não tem user prop, mas tem token válido, considerar autenticado
        console.log('✅ Token encontrado, considerando autenticado');
        return true;
    };

    // ✅ NOVO USEEFFECT - DETECTAR CALLBACK OAUTH2
    useEffect(() => {
        handleOAuth2Callback();
    }, []); // Executa apenas uma vez ao carregar componente

    // Carregar dados dos profissionais quando trocar para aba
    useEffect(() => {
        if (activeTab === 'profissionais') {
            const token = getAuthToken();
            
            if (token) {
                console.log('✅ Token encontrado, carregando profissionais...');
                loadProfessionalsData();
            } else {
                console.warn('⚠️ Token não encontrado');
                // Ainda assim, tentar carregar para debug
                loadProfessionalsData();
            }
        }
    }, [activeTab]); // Remover dependência do 'user'

    // ✅ FUNÇÃO CORRIGIDA - VERSÃO COM LOGS DETALHADOS
    const makeAuthenticatedRequest = async (url, options = {}) => {
        console.log('🔧 makeAuthenticatedRequest chamada:', {
            url: url,
            method: options.method || 'GET'
        });

        if (!isAuthenticated()) {
            console.error('❌ Usuário não autenticado');
            return null;
        }

        const token = getAuthToken();
        
        if (!token) {
            console.error('❌ Token não encontrado - faça login novamente');
            return null;
        }

        console.log('🔑 Token obtido com sucesso (primeiros 20 chars):', token.substring(0, 20) + '...');

        try {
            console.log('📤 Fazendo fetch para:', url);
            console.log('📋 Options da requisição:', {
                method: options.method || 'GET',
                headers: {
                    'Authorization': 'Bearer [TOKEN]',
                    'Content-Type': 'application/json'
                }
            });

            const response = await fetch(url, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            console.log('📥 Resposta do fetch:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                url: response.url
            });

            if (response.status === 401) {
                console.error('❌ Status 401: Sessão expirada - faça login novamente');
                return null;
            }
            
            if (response.status === 403) {
                console.error('❌ Status 403: Sem permissão para esta operação');
                return null;
            }

            if (response.status === 404) {
                console.error('❌ Status 404: Rota não encontrada');
                return null;
            }

            console.log('✅ Fetch completado com sucesso');
            return response;
        } catch (error) {
            console.error('❌ ERRO DE CONEXÃO/FETCH:', {
                message: error.message,
                stack: error.stack,
                url: url
            });
            return null;
        }
    };

    const loadProfessionalsData = async () => {
        if (!isAuthenticated()) {
            return;
        }

        setProfessionalsLoading(true);
        try {
            await Promise.all([
                loadProfessionals(),
                loadPlanLimits(),
                loadAppointmentStats()
            ]);

            // Carregar status do calendar para todos os profissionais
            if (professionals.length > 0) {
                professionals.forEach(prof => {
                    loadCalendarStatus(prof.id);
                });
            }
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
        }
        setProfessionalsLoading(false);
    };

    const loadProfessionals = async () => {
        try {
            const response = await makeAuthenticatedRequest('http://localhost:3001/api/professionals');
            
            if (response && response.ok) {
                const data = await response.json();
                setProfessionals(data.data || []);
                setProfessionalStats(prev => ({ 
                    ...prev, 
                    totalProfessionals: data.data?.length || 0 
                }));
            }
        } catch (error) {
            console.error('❌ Erro ao carregar profissionais:', error);
        }
    };

    const loadPlanLimits = async () => {
        try {
            const response = await makeAuthenticatedRequest('http://localhost:3001/api/subscription/limits');
            
            if (response && response.ok) {
                const data = await response.json();
                if (data.success) {
                    setPlanLimits({
                        current: data.current || 0,
                        max: data.max || 1,
                        plan: data.plan || 'BASIC'
                    });
                }
            } else {
                setPlanLimits({ current: 0, max: 1, plan: 'BASIC' });
            }
        } catch (error) {
            setPlanLimits({ current: 0, max: 1, plan: 'BASIC' });
        }
    };

    const loadAppointmentStats = async () => {
        try {
            const response = await makeAuthenticatedRequest('http://localhost:3001/api/appointments/stats');
            
            if (response && response.ok) {
                const appointmentsData = await response.json();
                setProfessionalStats(prev => ({
                    ...prev,
                    totalAppointments: appointmentsData.total_this_month || 0,
                    monthlyGrowth: appointmentsData.growth_percentage || 0
                }));
            }
        } catch (error) {
            // Silently handle - stats are optional
        }
    };

    // ✅ NOVA FUNÇÃO - ABRIR MODAL DE EDIÇÃO
    const handleEditProfessional = (professional) => {
        setSelectedProfessional(professional);
        setNewProfessional({
            name: professional.name || '',
            email: professional.email || '',
            phone: professional.phone || '',
            specialty: professional.specialty || '',
            google_calendar_email: professional.google_calendar_email || '',
            bio: professional.bio || '',
            hourly_rate: professional.hourly_rate || ''
        });
        setShowEditModal(true);
    };

    // ✅ NOVA FUNÇÃO - ABRIR MODAL DE EXCLUSÃO COM LOGS
    const handleDeleteProfessional = (professional) => {
        console.log('🎯 handleDeleteProfessional chamada com:', {
            id: professional.id,
            name: professional.name,
            email: professional.email
        });
        
        setSelectedProfessional(professional);
        setShowDeleteModal(true);
        
        console.log('✅ Modal de delete configurado e aberto');
    };

    // ✅ NOVA FUNÇÃO - CONFIRMAR EXCLUSÃO COM LOGS DETALHADOS
    const confirmDeleteProfessional = async () => {
        console.log('🚀 INICIANDO DELETE - Função chamada');
        
        if (!selectedProfessional) {
            console.error('❌ ERRO: selectedProfessional é null/undefined');
            alert('Erro: Nenhum profissional selecionado');
            return;
        }

        console.log('🎯 Profissional selecionado:', {
            id: selectedProfessional.id,
            name: selectedProfessional.name,
            email: selectedProfessional.email
        });

        // Verificar autenticação
        const token = getAuthToken();
        console.log('🔑 Token encontrado:', token ? 'SIM' : 'NÃO');
        
        if (!token) {
            console.error('❌ ERRO: Token não encontrado');
            alert('Erro de autenticação. Faça login novamente.');
            return;
        }

        // Construir URL
        const deleteUrl = `http://localhost:3001/api/professionals/${selectedProfessional.id}`;
        console.log('🌐 URL da requisição:', deleteUrl);

        try {
            console.log('📤 Enviando requisição DELETE...');
            
            const response = await makeAuthenticatedRequest(deleteUrl, {
                method: 'DELETE'
            });

            console.log('📥 Resposta recebida:', {
                response: response ? 'RESPONSE OK' : 'RESPONSE NULL',
                status: response ? response.status : 'N/A',
                ok: response ? response.ok : 'N/A'
            });

            if (response && response.ok) {
                console.log('✅ DELETE SUCESSO! Status:', response.status);
                
                // Recarregar dados e fechar modal
                console.log('🔄 Recarregando dados...');
                await loadProfessionalsData();
                
                console.log('🚪 Fechando modal...');
                setShowDeleteModal(false);
                setSelectedProfessional(null);
                
                alert('Profissional removido com sucesso!');
            } else if (response) {
                console.log('❌ DELETE FALHOU! Status:', response.status);
                try {
                    const errorData = await response.json();
                    console.log('📄 Dados do erro:', errorData);
                    const errorMessage = errorData.error || 'Erro ao remover profissional';
                    console.error('❌ Erro da API:', errorMessage);
                    alert(`Erro: ${errorMessage}`);
                } catch (parseError) {
                    console.error('❌ Erro ao fazer parse da resposta:', parseError);
                    console.error('❌ Status HTTP:', response.status);
                    alert(`Erro HTTP ${response.status}: Não foi possível remover o profissional`);
                }
            } else {
                console.error('❌ RESPONSE É NULL - Problema de autenticação ou conexão');
                alert('Erro de autenticação. Faça login novamente.');
            }
        } catch (error) {
            console.error('❌ ERRO DE REDE/EXCEÇÃO:', {
                message: error.message,
                stack: error.stack
            });
            alert('Erro de conexão. Verifique sua internet e tente novamente.');
        }
    };

    // ✅ NOVA FUNÇÃO - SALVAR EDIÇÃO
    const handleUpdateProfessional = async () => {
        if (!selectedProfessional) return;
        
        // Validação de campos obrigatórios
        if (!newProfessional.name || !newProfessional.email || !newProfessional.google_calendar_email) {
            alert('Por favor, preencha todos os campos obrigatórios: Nome, Email e Email do Google Calendar');
            return;
        }
        
        try {
            console.log('✏️ Atualizando profissional:', selectedProfessional.id);
            
            const response = await makeAuthenticatedRequest(`http://localhost:3001/api/professionals/${selectedProfessional.id}`, {
                method: 'PUT',
                body: JSON.stringify(newProfessional)
            });

            if (response && response.ok) {
                console.log('✅ Profissional atualizado com sucesso!');
                
                // Recarregar dados e fechar modal
                await loadProfessionalsData();
                setShowEditModal(false);
                setSelectedProfessional(null);
                setNewProfessional({
                    name: '', email: '', phone: '', specialty: '', 
                    google_calendar_email: '', bio: '', hourly_rate: ''
                });
                
                alert('Profissional atualizado com sucesso!');
            } else if (response) {
                try {
                    const errorData = await response.json();
                    const errorMessage = errorData.error || 'Erro ao atualizar profissional';
                    console.error('❌ Erro da API:', errorMessage);
                    alert(`Erro: ${errorMessage}`);
                } catch {
                    console.error('❌ Erro HTTP:', response.status);
                    alert(`Erro HTTP ${response.status}: Verifique os dados e tente novamente`);
                }
            } else {
                console.error('❌ Problema de autenticação');
                alert('Erro de autenticação. Faça login novamente.');
            }
        } catch (error) {
            console.error('❌ Erro de rede:', error.message);
            alert('Erro de conexão. Verifique sua internet e tente novamente.');
        }
    };

    // ✅ NOVAS FUNÇÕES - GOOGLE CALENDAR (ID 2.17.2)
    const handleConnectCalendar = async (professional) => {
        console.log('🔗 Conectando Google Calendar para:', professional.name);
        
        try {
            const response = await makeAuthenticatedRequest(`http://localhost:3001/api/calendar/connect/${professional.id}`, {
                method: 'POST'
            });

            if (response && response.ok) {
                const data = await response.json();
                console.log('✅ URL de autorização gerada:', data.auth_url);
                
                // Abrir popup do Google OAuth2
                window.open(data.auth_url, 'google-auth', 'width=500,height=600');
                
                // Aguardar callback e recarregar status
                setTimeout(() => {
                    loadCalendarStatus(professional.id);
                }, 3000);
            } else {
                console.error('❌ Erro ao gerar URL de autorização');
                alert('Erro ao conectar com Google Calendar. Tente novamente.');
            }
        } catch (error) {
            console.error('❌ Erro ao conectar calendar:', error);
            alert('Erro de conexão. Tente novamente.');
        }
    };

    const handleViewCalendar = async (professional) => {
        console.log('📅 Visualizando agenda de:', professional.name);
        setSelectedProfessional(professional);
        setShowCalendarModal(true);
        setCalendarLoading(true);
        
        try {
            const response = await makeAuthenticatedRequest(`http://localhost:3001/api/calendar/events/${professional.id}`);
            
            if (response && response.ok) {
                const data = await response.json();
                setCalendarEvents(data.events || []);
            } else {
                console.error('❌ Erro ao buscar eventos');
                setCalendarEvents([]);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar eventos:', error);
            setCalendarEvents([]);
        }
        
        setCalendarLoading(false);
    };

    const loadCalendarStatus = async (professionalId) => {
        try {
            const response = await makeAuthenticatedRequest(`http://localhost:3001/api/calendar/status/${professionalId}`);
            
            if (response && response.ok) {
                const data = await response.json();
                setCalendarStatus(prev => ({
                    ...prev,
                    [professionalId]: {
                        connected: data.professional?.connected || false,
                        last_sync: data.professional?.last_sync
                    }
                }));
            }
        } catch (error) {
            console.error('❌ Erro ao carregar status do calendar:', error);
        }
    };

    const handleAddProfessional = async () => {
        // Validação de campos obrigatórios
        if (!newProfessional.name || !newProfessional.email || !newProfessional.google_calendar_email) {
            alert('Por favor, preencha todos os campos obrigatórios: Nome, Email e Email do Google Calendar');
            return;
        }
        
        // Validação de limite do plano
        if (planLimits.max !== -1 && professionals.length >= planLimits.max) {
            alert(`Plano ${planLimits.plan} permite apenas ${planLimits.max} profissional(is). Faça upgrade para adicionar mais.`);
            return;
        }
        
        try {
            console.log('📤 Adicionando profissional:', newProfessional.name);
            
            const response = await makeAuthenticatedRequest('http://localhost:3001/api/professionals', {
                method: 'POST',
                body: JSON.stringify(newProfessional)
            });

            if (response && response.ok) {
                console.log('✅ Profissional adicionado com sucesso!');
                
                // Recarregar dados e fechar modal
                await loadProfessionalsData();
                setShowAddModal(false);
                setNewProfessional({
                    name: '', email: '', phone: '', specialty: '', 
                    google_calendar_email: '', bio: '', hourly_rate: ''
                });
                
                alert('Profissional adicionado com sucesso!');
            } else if (response) {
                try {
                    const errorData = await response.json();
                    const errorMessage = errorData.error || 'Erro ao adicionar profissional';
                    console.error('❌ Erro da API:', errorMessage);
                    alert(`Erro: ${errorMessage}`);
                } catch {
                    console.error('❌ Erro HTTP:', response.status);
                    alert(`Erro HTTP ${response.status}: Verifique os dados e tente novamente`);
                }
            } else {
                console.error('❌ Problema de autenticação');
                alert('Erro de autenticação. Faça login novamente.');
            }
        } catch (error) {
            console.error('❌ Erro de rede:', error.message);
            alert('Erro de conexão. Verifique sua internet e tente novamente.');
        }
    };

    const handleCreateTelegramBot = async () => {
        try {
            console.log('🤖 Criando bot Telegram...');
            
            const response = await makeAuthenticatedRequest('http://localhost:3001/api/telegram-setup/create-bot', {
                method: 'POST',
                body: JSON.stringify(telegramData)
            });

            if (response && response.ok) {
                const result = await response.json();
                console.log('✅ Bot criado:', result);
                
                alert(`Bot criado com sucesso! 🎉\n\nBot: @${result.bot_info.username}\nEnvie /start para testar!`);
                
                setShowTelegramModal(false);
                setTelegramData({ email: '', password: '', botName: '', botUsername: '' });
                
                // Recarregar canais
                window.location.reload();
            } else {
                alert('Erro ao criar bot. Tente novamente.');
            }
        } catch (error) {
            console.error('❌ Erro:', error);
            alert('Erro de conexão. Verifique e tente novamente.');
        }
    };

    // ✅ CORREÇÃO DO LOADING - ESTRUTURA JSX CORRIGIDA
    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
            </div>
        );
    }

    // ✅ RETURN PRINCIPAL CORRIGIDO - ESTRUTURA JSX REORGANIZADA
    return (
        <div style={styles.container}>
            {/* ✅ NOTIFICAÇÃO DE SUCESSO OAUTH2 */}
            {showSuccessNotification && (
                <div style={styles.successNotification}>
                    <div style={styles.notificationContent}>
                        <span style={{fontSize: '20px', marginRight: '12px'}}>✅</span>
                        <div>
                            <strong>Google Calendar conectado com sucesso!</strong>
                            <br />
                            <span style={{fontSize: '14px', opacity: 0.8}}>
                                Agora você pode visualizar sua agenda.
                            </span>
                        </div>
                        <button 
                            onClick={() => setShowSuccessNotification(false)}
                            style={styles.notificationClose}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>🚀 Dashboard Principal</h1>
                <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                    {/* Sistema de Abas */}
                    <div style={styles.tabContainer}>
                        <button 
                            style={{
                                ...styles.tab,
                                ...(activeTab === 'multicanal' ? styles.activeTab : styles.inactiveTab)
                            }}
                            onClick={() => setActiveTab('multicanal')}
                        >
                            🌐 Multicanal
                        </button>
                        <button 
                            style={{
                                ...styles.tab,
                                ...(activeTab === 'profissionais' ? styles.activeTab : styles.inactiveTab)
                            }}
                            onClick={() => setActiveTab('profissionais')}
                        >
                            👨‍⚕️ Profissionais
                        </button>
                        <button
                            style={{
                                ...styles.tab,
                                ...(activeTab === 'produtos' ? styles.activeTab : styles.inactiveTab)
                            }}
                            onClick={() => setActiveTab('produtos')}
                        >
                            📦 Produtos
                        </button>
                    </div>
                    
                    {/* Dropdown de canais (só na aba multicanal) */}
                    {activeTab === 'multicanal' && (
                        <select 
                            style={styles.channelSelector}
                            value={selectedChannel}
                            onChange={(e) => setSelectedChannel(e.target.value)}
                        >
                            <option value="all">🌐 Todos os canais</option>
                            {channels.map(ch => (
                                <option key={ch.id} value={ch.channel_type}>{getChannelName(ch.channel_type)}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* ✅ CONTEÚDO BASEADO NA ABA ATIVA - ESTRUTURA CORRIGIDA */}
            {activeTab === 'multicanal' && (
                <>
                    {/* Cards de Métricas Multicanal */}
                    <div style={styles.metricsGrid}>
                         <div style={styles.metricCard}>
                            <p style={styles.metricLabel}>TOTAL DE MENSAGENS</p>
                            <div style={styles.metricValue}>
                                <span>{metrics.totalMessages.toLocaleString('pt-BR')}</span>
                                <span style={styles.metricIcon}>💬</span>
                            </div>
                            <p style={styles.metricGrowth}>↗️ +12.3% este mês</p>
                        </div>
                        <div style={styles.metricCard}>
                            <p style={styles.metricLabel}>CONVERSAS ATIVAS</p>
                             <div style={styles.metricValue}>
                                <span>{metrics.activeConversations}</span>
                                <span style={styles.metricIcon}>👥</span>
                            </div>
                            <p style={styles.metricGrowth}>↗️ +8.7% hoje</p>
                        </div>
                        <div style={styles.metricCard}>
                             <p style={styles.metricLabel}>TAXA DE RESPOSTA</p>
                             <div style={styles.metricValue}>
                                <span>{metrics.responseRate}%</span>
                                <span style={styles.metricIcon}>📊</span>
                            </div>
                            <p style={styles.metricGrowth}>↗️ +2.1% essa semana</p>
                        </div>
                    </div>

                    {/* Layout de Duas Colunas */}
                    <div style={styles.twoColumnLayout}>
                        {/* Seção de Canais Configurados */}
                        <div style={styles.sectionCard}>
                            <div style={styles.sectionHeader}>
                                <h3 style={styles.sectionTitle}>🌐 Canais Configurados</h3>
                            </div>
                            <div style={styles.channelsGrid}>
                                {channels.length > 0 ? channels.map(channel => (
                                    <div key={channel.id} style={styles.channelCard}>
                                        <div style={styles.channelInfo}>
                                            <div style={{...styles.channelIconContainer, background: getChannelColor(channel.channel_type)}}>
                                                <ChannelIcon type={channel.channel_type} />
                                            </div>
                                            <div>
                                                <p style={styles.channelName}>{getChannelName(channel.channel_type)}</p>
                                                <p style={{...styles.channelStatus, color: channel.is_active ? '#10b981' : '#ef4444' }}>{channel.is_active ? "Ativo" : "Inativo"}</p>
                                            </div>
                                        </div>
                                        <div style={{...styles.statusIndicator, background: channel.is_active ? '#10b981' : '#ef4444' }}></div>
                                    </div>
                                )) : <p style={styles.emptyState}>Nenhum canal configurado.</p>}
                            </div>
                        </div>
                        
                        {/* Seção de Conversas Recentes */}
                        <div style={styles.sectionCard}>
                            <div style={styles.sectionHeader}><h3 style={styles.sectionTitle}>💬 Conversas Recentes</h3></div>
                            <div>
                                {conversations.length > 0 ? conversations.map(conv => (
                                    <div key={conv.id} style={styles.conversationItem}>
                                        <div style={styles.conversationInfo}>
                                            <ChannelIcon type={conv.channel} />
                                            <div>
                                                <p style={styles.conversationName}>{conv.name}</p>
                                                <p style={styles.conversationMessage}>{conv.message}</p>
                                            </div>
                                        </div>
                                        <div style={styles.conversationMeta}>
                                            <p style={styles.conversationDate}>{conv.date}</p>
                                            {conv.unread > 0 && <span style={styles.unreadBadge}>{conv.unread}</span>}
                                        </div>
                                    </div>
                                )) : <p style={styles.emptyState}>Nenhuma conversa recente.</p>}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'profissionais' && (
                /* ✅ CONTEÚDO PROFISSIONAIS - COM BOTÕES EDITAR/DELETAR */
                <>
                    {/* Plan Limits Banner */}
                    <div style={styles.planBanner}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                <Users style={{width: '20px', height: '20px', color: '#6366f1'}} />
                                <div>
                                    <div style={{fontWeight: '600', color: '#1f2937'}}>
                                        Profissionais: {planLimits.current} de {planLimits.max === -1 ? '∞' : planLimits.max}
                                    </div>
                                    <div style={{fontSize: '14px', color: '#6b7280'}}>Plano {planLimits.plan} ativo</div>
                                </div>
                            </div>
                            {planLimits.max !== -1 && planLimits.current >= planLimits.max && (
                                <div style={{color: '#f59e0b', fontSize: '14px', fontWeight: '500'}}>Limite atingido</div>
                            )}
                        </div>
                    </div>

                    {/* Cards de Métricas Profissionais */}
                    <div style={styles.metricsGrid}>
                        <div style={styles.metricCard}>
                            <p style={styles.metricLabel}>TOTAL DE PROFISSIONAIS</p>
                            <div style={styles.metricValue}>
                                <span>{professionalStats.totalProfessionals}</span>
                                <span style={styles.metricIcon}>👥</span>
                            </div>
                            <p style={styles.metricGrowth}>↗️ Equipe ativa</p>
                        </div>

                        <div style={styles.metricCard}>
                            <p style={styles.metricLabel}>CONSULTAS ESTE MÊS</p>
                            <div style={styles.metricValue}>
                                <span>{professionalStats.totalAppointments}</span>
                                <span style={styles.metricIcon}>📅</span>
                            </div>
                            <p style={styles.metricGrowth}>↗️ {professionalStats.monthlyGrowth > 0 ? '+' : ''}{professionalStats.monthlyGrowth.toFixed(1)}% este mês</p>
                        </div>

                        <div style={styles.metricCard}>
                            <p style={styles.metricLabel}>CRESCIMENTO</p>
                            <div style={styles.metricValue}>
                                <span>{professionalStats.monthlyGrowth > 0 ? '+' : ''}{professionalStats.monthlyGrowth.toFixed(1)}%</span>
                                <span style={styles.metricIcon}>📊</span>
                            </div>
                            <p style={styles.metricGrowth}>↗️ Progresso mensal</p>
                        </div>
                    </div>

                    {/* Seção de Profissionais */}
                    <div style={styles.sectionCard}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>👨‍⚕️ Profissionais ({professionals.length})</h3>
                            {isAuthenticated() && (
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    disabled={planLimits.max !== -1 && professionals.length >= planLimits.max}
                                    style={{
                                        ...styles.addButton,
                                        opacity: (planLimits.max !== -1 && professionals.length >= planLimits.max) ? 0.5 : 1,
                                        cursor: (planLimits.max !== -1 && professionals.length >= planLimits.max) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <Plus style={{width: '16px', height: '16px'}} />
                                    Adicionar Profissional
                                </button>
                            )}
                        </div>

                        {/* Grid de Profissionais */}
                        {!isAuthenticated() ? (
                            <div style={styles.emptyState}>
                                <div style={styles.emptyIcon}>🔒</div>
                                <h3 style={styles.emptyTitle}>Login necessário</h3>
                                <p style={styles.emptySubtitle}>Faça login para gerenciar profissionais</p>
                            </div>
                        ) : professionalsLoading ? (
                            <div style={{padding: '40px', textAlign: 'center'}}>
                                <div style={styles.spinner}></div>
                                <p style={{marginTop: '12px', color: '#6b7280'}}>Carregando profissionais...</p>
                            </div>
                        ) : professionals.length === 0 ? (
                            <div style={styles.emptyState}>
                                <div style={styles.emptyIcon}>👨‍⚕️</div>
                                <h3 style={styles.emptyTitle}>Nenhum profissional cadastrado</h3>
                                <p style={styles.emptySubtitle}>Use o botão "Adicionar Profissional" acima para começar</p>
                            </div>
                        ) : (
                            <div style={styles.professionalsGrid}>
                                {professionals.map((professional) => (
                                    <div key={professional.id} style={styles.professionalCard}>
                                        {/* ✅ BOTÕES EDITAR E GOOGLE CALENDAR NO TOPO */}
                                        <div style={styles.cardActions}>
                                            <button
                                                onClick={() => handleEditProfessional(professional)}
                                                style={styles.editButton}
                                                title="Editar profissional"
                                            >
                                                <Edit3 style={{width: '16px', height: '16px'}} />
                                                Editar
                                            </button>
                                            
                                            {/* 🆕 BOTÃO GOOGLE CALENDAR */}
                                            {calendarStatus[professional.id]?.connected ? (
                                                <button
                                                    onClick={() => handleViewCalendar(professional)}
                                                    style={styles.calendarButton}
                                                    title="Ver agenda do Google Calendar"
                                                >
                                                    <Calendar style={{width: '16px', height: '16px'}} />
                                                    Ver Agenda
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleConnectCalendar(professional)}
                                                    style={styles.connectCalendarButton}
                                                    title="Conectar Google Calendar"
                                                >
                                                    <Calendar style={{width: '16px', height: '16px'}} />
                                                    Conectar Calendar
                                                </button>
                                            )}
                                        </div>

                                        <div style={styles.professionalHeader}>
                                            <div style={styles.professionalAvatar}>
                                                {professional.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 style={styles.professionalName}>{professional.name}</h4>
                                                <p style={styles.professionalSpecialty}>{professional.specialty}</p>
                                            </div>
                                        </div>
                                        <div style={styles.professionalDetails}>
                                            <div style={styles.detailItem}>
                                                <Mail style={{width: '16px', height: '16px'}} />
                                                {professional.email}
                                            </div>
                                            <div style={styles.detailItem}>
                                                <Phone style={{width: '16px', height: '16px'}} />
                                                {professional.phone}
                                            </div>
                                            <div style={styles.detailItem}>
                                                <Calendar style={{width: '16px', height: '16px'}} />
                                                {professional.google_calendar_email}
                                            </div>
                                        </div>

                                        {/* ✅ BOTÃO DELETAR EMBAIXO */}
                                        <div style={styles.cardBottomActions}>
                                            <button
                                                onClick={() => {
                                                    console.log('🗂️ BOTÃO REMOVER CLICADO! Profissional:', professional.name);
                                                    handleDeleteProfessional(professional);
                                                }}
                                                style={styles.deleteButton}
                                                title="Remover profissional"
                                            >
                                                <Trash2 style={{width: '16px', height: '16px'}} />
                                                Remover
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
            
            {/* ✅ NOVO BLOCO PARA PRODUTOS */}
            {activeTab === 'produtos' && (
                <ProductDashboard />
            )}

            {/* Modal de Adicionar Profissional */}
            {showAddModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Adicionar Profissional</h3>
                            <button 
                                onClick={() => setShowAddModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <X style={{width: '20px', height: '20px'}} />
                            </button>
                        </div>
                        
                        <div style={styles.modalForm}>
                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>Nome *</label>
                                <input
                                    type="text"
                                    required
                                    value={newProfessional.name}
                                    onChange={(e) => setNewProfessional({...newProfessional, name: e.target.value})}
                                    style={styles.input}
                                    placeholder="Dr. João Silva"
                                />
                            </div>
                            
                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={newProfessional.email}
                                    onChange={(e) => setNewProfessional({...newProfessional, email: e.target.value})}
                                    style={styles.input}
                                    placeholder="joao@clinica.com"
                                />
                            </div>
                            
                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>Telefone</label>
                                <input
                                    type="tel"
                                    value={newProfessional.phone}
                                    onChange={(e) => setNewProfessional({...newProfessional, phone: e.target.value})}
                                    style={styles.input}
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                            
                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>Especialidade</label>
                                <input
                                    type="text"
                                    value={newProfessional.specialty}
                                    onChange={(e) => setNewProfessional({...newProfessional, specialty: e.target.value})}
                                    style={styles.input}
                                    placeholder="Dentista Geral"
                                />
                            </div>
                            
                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>Email Google Calendar *</label>
                                <input
                                    type="email"
                                    required
                                    value={newProfessional.google_calendar_email}
                                    onChange={(e) => setNewProfessional({...newProfessional, google_calendar_email: e.target.value})}
                                    style={styles.input}
                                    placeholder="joao.calendar@gmail.com"
                                />
                            </div>
                            
                            <div style={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    style={styles.cancelButton}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddProfessional}
                                    style={styles.submitButton}
                                >
                                    Adicionar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ NOVO MODAL DE EDIÇÃO */}
            {showEditModal && selectedProfessional && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Editar Profissional</h3>
                            <button 
                                onClick={() => setShowEditModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <X style={{width: '20px', height: '20px'}} />
                            </button>
                        </div>
                        
                        <div style={styles.modalForm}>
                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>Nome *</label>
                                <input
                                    type="text"
                                    required
                                    value={newProfessional.name}
                                    onChange={(e) => setNewProfessional({...newProfessional, name: e.target.value})}
                                    style={styles.input}
                                    placeholder="Dr. João Silva"
                                />
                            </div>
                            
                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={newProfessional.email}
                                    onChange={(e) => setNewProfessional({...newProfessional, email: e.target.value})}
                                    style={styles.input}
                                    placeholder="joao@clinica.com"
                                />
                            </div>
                            
                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>Telefone</label>
                                <input
                                    type="tel"
                                    value={newProfessional.phone}
                                    onChange={(e) => setNewProfessional({...newProfessional, phone: e.target.value})}
                                    style={styles.input}
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                            
                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>Especialidade</label>
                                <input
                                    type="text"
                                    value={newProfessional.specialty}
                                    onChange={(e) => setNewProfessional({...newProfessional, specialty: e.target.value})}
                                    style={styles.input}
                                    placeholder="Dentista Geral"
                                />
                            </div>
                            
                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>Email Google Calendar *</label>
                                <input
                                    type="email"
                                    required
                                    value={newProfessional.google_calendar_email}
                                    onChange={(e) => setNewProfessional({...newProfessional, google_calendar_email: e.target.value})}
                                    style={styles.input}
                                    placeholder="joao.calendar@gmail.com"
                                />
                            </div>
                            
                            <div style={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    style={styles.cancelButton}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUpdateProfessional}
                                    style={styles.submitButton}
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ MODAL DE VISUALIZAÇÃO DO CALENDÁRIO */}
            {showCalendarModal && selectedProfessional && (
                <div style={styles.modalOverlay}>
                    <div style={{...styles.modalContent, maxWidth: '700px'}}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                📅 Agenda de {selectedProfessional.name}
                            </h3>
                            <button 
                                onClick={() => {
                                    setShowCalendarModal(false);
                                    setSelectedProfessional(null);
                                    setCalendarEvents([]);
                                }}
                                style={styles.modalCloseButton}
                            >
                                <X style={{width: '20px', height: '20px'}} />
                            </button>
                        </div>
                        
                        <div style={{padding: '20px 0'}}>
                            {calendarLoading ? (
                                <div style={{textAlign: 'center', padding: '40px'}}>
                                    <div style={styles.spinner}></div>
                                    <p style={{marginTop: '16px', color: '#6b7280'}}>
                                        Carregando eventos do Google Calendar...
                                    </p>
                                </div>
                            ) : calendarEvents.length === 0 ? (
                                <div style={{textAlign: 'center', padding: '40px'}}>
                                    <div style={{fontSize: '48px', marginBottom: '16px'}}>📅</div>
                                    <h4 style={{margin: '0 0 8px', color: '#1f2937'}}>
                                        Nenhum evento encontrado
                                    </h4>
                                    <p style={{margin: 0, color: '#6b7280'}}>
                                        Não há compromissos nos próximos 30 dias.
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <div style={{
                                        marginBottom: '16px', 
                                        padding: '12px 16px', 
                                        background: '#f3f4f6', 
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        color: '#6b7280'
                                    }}>
                                        📊 {calendarEvents.length} evento(s) encontrado(s) nos próximos 30 dias
                                    </div>
                                    
                                    <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                                        {calendarEvents.map((event, index) => (
                                            <div key={event.id || index} style={{
                                                padding: '16px',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                marginBottom: '12px',
                                                background: '#fafafa'
                                            }}>
                                                <div style={{
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'flex-start',
                                                    marginBottom: '8px'
                                                }}>
                                                    <h4 style={{
                                                        margin: 0, 
                                                        fontSize: '16px', 
                                                        color: '#1f2937',
                                                        fontWeight: '600'
                                                    }}>
                                                        {event.title}
                                                    </h4>
                                                    <span style={{
                                                        fontSize: '12px',
                                                        color: '#10b981',
                                                        background: '#ecfdf5',
                                                        padding: '4px 8px',
                                                        borderRadius: '12px'
                                                    }}>
                                                        Google Calendar
                                                    </span>
                                                </div>
                                                
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    fontSize: '14px',
                                                    color: '#6b7280',
                                                    marginBottom: '8px'
                                                }}>
                                                    <Clock style={{width: '16px', height: '16px'}} />
                                                    <span>
                                                        {new Date(event.start).toLocaleDateString('pt-BR')} - {' '}
                                                        {new Date(event.start).toLocaleTimeString('pt-BR', {
                                                            hour: '2-digit', 
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                
                                                {event.description && (
                                                    <p style={{
                                                        margin: '8px 0 0',
                                                        fontSize: '14px',
                                                        color: '#6b7280',
                                                        lineHeight: '1.4'
                                                    }}>
                                                        {event.description}
                                                    </p>
                                                )}
                                                
                                                {event.location && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        fontSize: '14px',
                                                        color: '#6b7280',
                                                        marginTop: '8px'
                                                    }}>
                                                        <MapPin style={{width: '16px', height: '16px'}} />
                                                        <span>{event.location}</span>
                                                    </div>
                                                )}
                                                
                                                {event.attendees > 0 && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        fontSize: '14px',
                                                        color: '#6b7280',
                                                        marginTop: '8px'
                                                    }}>
                                                        <Users style={{width: '16px', height: '16px'}} />
                                                        <span>{event.attendees} participante(s)</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div style={{
                                marginTop: '20px',
                                textAlign: 'center'
                            }}>
                                <button
                                    onClick={() => {
                                        setShowCalendarModal(false);
                                        setSelectedProfessional(null);
                                        setCalendarEvents([]);
                                    }}
                                    style={styles.cancelButton}
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* ✅ NOVO MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
            {showDeleteModal && selectedProfessional && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Confirmar Exclusão</h3>
                            <button 
                                onClick={() => setShowDeleteModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <X style={{width: '20px', height: '20px'}} />
                            </button>
                        </div>
                        
                        <div style={{padding: '20px 0'}}>
                            <div style={{textAlign: 'center', marginBottom: '20px'}}>
                                <div style={{fontSize: '48px', marginBottom: '16px'}}>⚠️</div>
                                <h4 style={{margin: '0 0 8px', color: '#1f2937'}}>
                                    Tem certeza que deseja remover este profissional?
                                </h4>
                                <p style={{margin: 0, color: '#6b7280'}}>
                                    <strong>{selectedProfessional.name}</strong>
                                    <br />
                                    Esta ação não pode ser desfeita.
                                </p>
                            </div>
                            
                            <div style={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(false)}
                                    style={styles.cancelButton}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        console.log('🗑️ BOTÃO DELETE CLICADO! Profissional:', selectedProfessional?.name);
                                        confirmDeleteProfessional();
                                    }}
                                    style={{
                                        ...styles.submitButton,
                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                    }}
                                >
                                    Sim, Remover
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
};

// ✅ ESTILOS PREMIUM + NOVOS ESTILOS PARA BOTÕES
const styles = {
    container: { 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
        padding: '24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh'
    },
    header: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
    },
    title: { 
        fontSize: '28px', 
        fontWeight: 'bold', 
        color: 'white', 
        textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        margin: 0
    },
    
    // Sistema de Abas
    tabContainer: {
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        padding: '4px',
        gap: '4px'
    },
    tab: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    },
    activeTab: {
        background: 'rgba(255, 255, 255, 0.95)',
        color: '#667eea',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
    },
    inactiveTab: {
        background: 'transparent',
        color: 'rgba(255, 255, 255, 0.8)'
    },

    channelSelector: { 
        padding: '10px 16px', 
        borderRadius: '12px', 
        border: '1px solid rgba(255, 255, 255, 0.3)', 
        background: 'rgba(255, 255, 255, 0.9)', 
        fontSize: '14px', 
        fontWeight: '500', 
        appearance: 'none', 
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
        color: '#667eea'
    },

    // Banners
    planBanner: {
        background: 'rgba(255, 255, 255, 0.95)', 
        padding: '16px 24px', 
        borderRadius: '16px', 
        marginBottom: '20px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
    },

    // Grids e Cards
    metricsGrid: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '24px', 
        marginBottom: '24px' 
    },
    twoColumnLayout: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '30px' 
    },
    metricCard: { 
        background: 'rgba(255, 255, 255, 0.95)', 
        padding: '24px', 
        borderRadius: '20px', 
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
    },
    metricLabel: { 
        fontSize: '13px', 
        color: '#6b7280', 
        fontWeight: '600', 
        textTransform: 'uppercase', 
        marginBottom: '12px',
        margin: 0
    },
    metricValue: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        fontSize: '36px', 
        fontWeight: 'bold', 
        color: '#111827', 
        marginBottom: '8px' 
    },
    metricIcon: { fontSize: '24px', color: '#9ca3af' },
    metricGrowth: { 
        fontSize: '13px', 
        color: '#10b981', 
        fontWeight: '500',
        margin: 0
    },
    sectionCard: { 
        background: 'rgba(255, 255, 255, 0.95)', 
        borderRadius: '20px', 
        marginBottom: '24px', 
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
    },
    sectionHeader: { 
        padding: '20px 24px', 
        borderBottom: '1px solid #f3f4f6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    sectionTitle: { 
        margin: 0, 
        fontSize: '18px', 
        fontWeight: '600', 
        color: '#111827' 
    },
    
    // Multicanal specific
    channelsGrid: { 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px', 
        padding: '24px' 
    },
    channelCard: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px', 
        background: '#f9fafb', 
        borderRadius: '14px', 
        border: '1px solid #f3f4f6' 
    },
    channelInfo: { 
        display: 'flex', 
        alignItems: 'center', 
        gap: '14px' 
    },
    channelIconContainer: { 
        width: '40px', 
        height: '40px', 
        borderRadius: '10px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'white', 
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)' 
    },
    channelName: { 
        margin: 0, 
        fontWeight: '600', 
        color: '#1f2937' 
    },
    channelStatus: { 
        margin: 0, 
        fontSize: '13px', 
        color: '#6b7280' 
    },
    statusIndicator: { 
        width: '10px', 
        height: '10px', 
        borderRadius: '50%', 
        boxShadow: '0 0 8px 1px' 
    },
    conversationItem: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 24px', 
        borderBottom: '1px solid #f3f4f6' 
    },
    conversationInfo: { 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px' 
    },
    conversationName: { 
        margin: 0, 
        fontWeight: '600' 
    },
    conversationMessage: { 
        margin: 0, 
        fontSize: '14px', 
        color: '#6b7280' 
    },
    conversationMeta: { 
        textAlign: 'right' 
    },
    conversationDate: { 
        fontSize: '12px', 
        color: '#9ca3af', 
        marginBottom: '4px' 
    },
    unreadBadge: { 
        background: '#3b82f6', 
        color: 'white', 
        fontSize: '11px', 
        fontWeight: 'bold', 
        padding: '3px 8px', 
        borderRadius: '12px' 
    },

    // Profissionais specific
    professionalsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '20px',
        padding: '24px'
    },
    professionalCard: {
        background: '#f9fafb',
        padding: '20px',
        borderRadius: '16px',
        border: '1px solid #f3f4f6',
        transition: 'all 0.3s ease',
        position: 'relative'
    },
    professionalHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '16px'
    },
    professionalAvatar: {
        width: '50px',
        height: '50px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '20px',
        fontWeight: 'bold',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    },
    professionalName: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#1f2937',
        margin: 0
    },
    professionalSpecialty: {
        fontSize: '14px',
        color: '#6366f1',
        fontWeight: '500',
        margin: 0
    },
    professionalDetails: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '16px'
    },
    detailItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#6b7280'
    },

    // ✅ NOVOS ESTILOS PARA AÇÕES DOS CARDS
    cardActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: '12px',
        gap: '8px'
    },
    cardBottomActions: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #e5e7eb'
    },
    editButton: {
        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
        transition: 'all 0.2s ease'
    },
    deleteButton: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
        transition: 'all 0.2s ease'
    },
    calendarButton: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
        transition: 'all 0.2s ease',
        marginLeft: '8px'
    },
    connectCalendarButton: {
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
        transition: 'all 0.2s ease',
        marginLeft: '8px'
    },

    // Botões
    addButton: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        padding: '12px 20px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        transition: 'all 0.2s ease'
    },

    // Estados vazios e loading
    emptyState: { 
        textAlign: 'center',
        padding: '60px 24px',
        color: '#9ca3af'
    },
    emptyIcon: {
        fontSize: '48px',
        marginBottom: '16px'
    },
    emptyTitle: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px'
    },
    emptySubtitle: {
        fontSize: '16px',
        color: '#6b7280',
        marginBottom: '24px'
    },
    loadingContainer: { 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        width: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    spinner: { 
        width: '30px', 
        height: '30px', 
        border: '3px solid rgba(255, 255, 255, 0.3)', 
        borderTopColor: '#fff', 
        borderRadius: '50%', 
        animation: 'spin 1s linear infinite',
        margin: '0 auto'
    },

    // Modal
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
        borderRadius: '20px',
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
    modalForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column'
    },
    inputLabel: {
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
        color: '#374151',
        marginBottom: '6px'
    },
    input: {
        width: '100%',
        padding: '12px 16px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '14px',
        boxSizing: 'border-box'
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
    // Estilos da notificação de sucesso
    successNotification: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
        minWidth: '320px',
        animation: 'slideIn 0.3s ease'
    },
    notificationContent: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px'
    },
    notificationClose: {
        background: 'rgba(255, 255, 255, 0.2)',
        border: 'none',
        color: 'white',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        cursor: 'pointer',
        fontSize: '16px',
        marginLeft: 'auto'
    },
    submitButton: {
        flex: 1,
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer'
    },
    telegramButton: {
        background: 'linear-gradient(135deg, #0088CC 0%, #005FA3 100%)',
        color: 'white',
        border: 'none',
        padding: '12px 20px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 15px rgba(0,136,204,0.3)',
        transition: 'all 0.2s ease'
    }
};

export default MultiChannelDashboard;

