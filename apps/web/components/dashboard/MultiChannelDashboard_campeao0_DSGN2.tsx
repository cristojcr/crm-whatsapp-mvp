import React, { useState, useEffect } from 'react';
import { Users, Plus, Calendar, Phone, Mail, X, Edit3, Trash2, Clock, MapPin, Star, Settings, User, Shield, LogOut } from 'lucide-react';
import ProductDashboard from '../products/ProductDashboard';
import ChannelSettings from '../settings/ChannelSettings';
import ProfessionalDashboard from '../professionals/ProfessionalDashboard';

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

// ✅ COMPONENTE PRINCIPAL REDESENHADO - ESTILO PROTON VPN
const MultiChannelDashboard = ({ channels = [], loading = false, user = null, onLogout = null, onChannelsUpdate = null }) => {
    // Estados do dashboard
    const [selectedChannel, setSelectedChannel] = useState('all');
    const [activeTab, setActiveTab] = useState('multicanal'); // Inicia na aba Dashboard

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
    
    // Estados do Google Calendar
    const [calendarStatus, setCalendarStatus] = useState({});
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    
    // Estado para controle de conexão
    const [connectionStatus, setConnectionStatus] = useState('checking');
    
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

    // ✅ SISTEMA DE CORES PROTON VPN
    const protonColors = {
        purple: '#6D4AFF',
        green: '#00A693',
        darkBg: '#1C1B1F',
        glassWhite: 'rgba(255, 255, 255, 0.15)',
        glassBorder: 'rgba(255, 255, 255, 0.2)',
        scalabotsPurple: '#8B5CF6' // Roxo atual do Scalabots
    };

    // ✅ ESTILOS PROTON VPN
    const protonStyles = {
        // Container principal com gradiente
        mainContainer: {
            minHeight: '100vh',
            background: `linear-gradient(135deg, ${protonColors.scalabotsPurple} 0%, ${protonColors.purple} 25%, ${protonColors.darkBg} 75%, #16213e 100%)`,
            display: 'flex',
            padding: '20px',
            gap: '20px',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            position: 'relative',
            overflow: 'hidden'
        },

        // Background overlay sutil
        backgroundOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.1,
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
            pointerEvents: 'none'
        },

        // Card lateral esquerdo - Navegação
        leftSidebar: {
            width: '280px',
            background: protonColors.glassWhite,
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: `1px solid ${protonColors.glassBorder}`,
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative',
            zIndex: 10
        },

        // Card principal - Conteúdo
        mainContent: {
            flex: 1,
            background: protonColors.glassWhite,
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: `1px solid ${protonColors.glassBorder}`,
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            padding: '32px',
            position: 'relative',
            zIndex: 10,
            overflow: 'auto'
        },

        // Card lateral direito - Perfil e configurações
        rightSidebar: {
            width: '80px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'relative',
            zIndex: 10
        },

        // Botões da navegação lateral
        navButton: {
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${protonColors.glassBorder}`,
            borderRadius: '12px',
            padding: '16px',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            fontWeight: '500',
            textAlign: 'left',
            width: '100%'
        },

        navButtonActive: {
            background: `linear-gradient(135deg, ${protonColors.purple} 0%, ${protonColors.green} 100%)`,
            boxShadow: `0 4px 20px rgba(109, 74, 255, 0.3)`,
            transform: 'translateY(-1px)'
        },

        navButtonHover: {
            background: 'rgba(255, 255, 255, 0.18)',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
        },

        // Botões da barra lateral direita
        sidebarButton: {
            width: '48px',
            height: '48px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${protonColors.glassBorder}`,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            color: 'white'
        },

        sidebarButtonHover: {
            background: 'rgba(255, 255, 255, 0.18)',
            transform: 'translateX(-2px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
        },

        // Título da seção
        sectionTitle: {
            color: 'white',
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '24px',
            letterSpacing: '-0.02em'
        },

        // Cards de conteúdo interno
        contentCard: {
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid rgba(255, 255, 255, 0.15)`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px'
        }
    };

    // Função para obter token de autenticação (mantida do código original)
    const getAuthToken = () => {
        if (typeof window === 'undefined') return null;
        
        console.log('🔍 Buscando token...');
        
        const allKeys = Object.keys(localStorage);
        console.log('🔑 Todas as chaves:', allKeys);
        
        const supabaseKey = allKeys.find(key => 
            key.startsWith('sb-') && key.endsWith('-auth-token')
        );
        
        console.log('🎯 Chave do Supabase encontrada:', supabaseKey);
        
        if (supabaseKey) {
            const stored = localStorage.getItem(supabaseKey);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.access_token) {
                        console.log('✅ Token extraído com sucesso');
                        return parsed.access_token;
                    }
                } catch (error) {
                    console.log('📝 Token é string simples, retornando diretamente');
                    return stored;
                }
            }
        }
        
        console.log('❌ Token não encontrado');
        return null;
    };

    // Função para renderizar o conteúdo baseado na aba ativa
    const renderContent = () => {
        switch (activeTab) {
            case 'multicanal':
                return renderMulticanalContent();
            case 'professionals':
                return renderProfessionalsContent();
            case 'products':
                return <ProductDashboard />;
            case 'settings':
                return renderSettingsContent();
            case 'privacy':
                return renderPrivacyContent();
            default:
                return renderMulticanalContent();
        }
    };

    // Renderizar configurações de canais
    const renderSettingsContent = () => (
        <div>
            <h2 style={protonStyles.sectionTitle}>Configurações de Canais</h2>
            <ChannelSettings 
                initialChannels={channels}
                onUpdate={onChannelsUpdate}
                userId={user?.id}
                userPlan={user?.plan || 'premium'}
            />
        </div>
    );

    // Renderizar página de privacidade/consentimentos
    const renderPrivacyContent = () => (
        <div>
            <h2 style={protonStyles.sectionTitle}>Privacidade e Consentimentos</h2>
            <div style={protonStyles.contentCard}>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0 }}>
                    Página de consentimentos LGPD/GDPR será carregada aqui...
                </p>
                <button 
                    onClick={() => window.open('/onboarding/consentimentos', '_blank')}
                    style={{
                        background: `linear-gradient(135deg, ${protonColors.purple} 0%, ${protonColors.green} 100%)`,
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        marginTop: '16px',
                        boxShadow: `0 4px 20px rgba(109, 74, 255, 0.3)`
                    }}
                >
                    Abrir Página de Consentimentos
                </button>
            </div>
        </div>
    );

    // Função para logout
    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        } else {
            // Fallback se não tiver função de logout passada
            if (typeof window !== 'undefined') {
                localStorage.clear();
                window.location.href = '/login';
            }
        }
    };

    // Renderizar conteúdo do multicanal (simplificado para o exemplo)
    const renderMulticanalContent = () => (
        <div>
            <h2 style={protonStyles.sectionTitle}>Dashboard Principal</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div style={protonStyles.contentCard}>
                    <h3 style={{ color: 'white', marginBottom: '12px' }}>Mensagens Totais</h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '32px', fontWeight: 'bold', margin: 0 }}>
                        {metrics.totalMessages}
                    </p>
                </div>
                <div style={protonStyles.contentCard}>
                    <h3 style={{ color: 'white', marginBottom: '12px' }}>Conversas Ativas</h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '32px', fontWeight: 'bold', margin: 0 }}>
                        {metrics.activeConversations}
                    </p>
                </div>
                <div style={protonStyles.contentCard}>
                    <h3 style={{ color: 'white', marginBottom: '12px' }}>Taxa de Resposta</h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '32px', fontWeight: 'bold', margin: 0 }}>
                        {metrics.responseRate}%
                    </p>
                </div>
            </div>
        </div>
    );

    // Renderizar conteúdo dos profissionais
    const renderProfessionalsContent = () => (
        <div>
            <h2 style={protonStyles.sectionTitle}>Profissionais</h2>
            <div style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <ProfessionalDashboard />
            </div>
        </div>
    );

    // ✅ RENDERIZAÇÃO PRINCIPAL
    return (
        <div style={protonStyles.mainContainer}>
            {/* Background overlay */}
            <div style={protonStyles.backgroundOverlay}></div>
            
            {/* Card Lateral Esquerdo - Navegação */}
            <div style={protonStyles.leftSidebar}>
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{ color: 'white', fontSize: '20px', fontWeight: '600', margin: 0 }}>
                        Scalabots
                    </h1>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', margin: '4px 0 0 0' }}>
                        Dashboard Principal
                    </p>
                </div>

                {/* Botões de Navegação */}
                <button
                    style={{
                        ...protonStyles.navButton,
                        ...(activeTab === 'multicanal' ? protonStyles.navButtonActive : {})
                    }}
                    onClick={() => setActiveTab('multicanal')}
                    onMouseEnter={(e) => {
                        if (activeTab !== 'multicanal') {
                            Object.assign(e.target.style, protonStyles.navButtonHover);
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeTab !== 'multicanal') {
                            Object.assign(e.target.style, protonStyles.navButton);
                        }
                    }}
                >
                    <Calendar size={20} />
                    Dashboard
                </button>

                <button
                    style={{
                        ...protonStyles.navButton,
                        ...(activeTab === 'professionals' ? protonStyles.navButtonActive : {})
                    }}
                    onClick={() => setActiveTab('professionals')}
                    onMouseEnter={(e) => {
                        if (activeTab !== 'professionals') {
                            Object.assign(e.target.style, protonStyles.navButtonHover);
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeTab !== 'professionals') {
                            Object.assign(e.target.style, protonStyles.navButton);
                        }
                    }}
                >
                    <Users size={20} />
                    Profissionais
                </button>

                <button
                    style={{
                        ...protonStyles.navButton,
                        ...(activeTab === 'products' ? protonStyles.navButtonActive : {})
                    }}
                    onClick={() => setActiveTab('products')}
                    onMouseEnter={(e) => {
                        if (activeTab !== 'products') {
                            Object.assign(e.target.style, protonStyles.navButtonHover);
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeTab !== 'products') {
                            Object.assign(e.target.style, protonStyles.navButton);
                        }
                    }}
                >
                    <Star size={20} />
                    Produtos
                </button>
            </div>

            {/* Card Principal - Conteúdo */}
            <div style={protonStyles.mainContent}>
                {renderContent()}
            </div>

            {/* Card Lateral Direito - Perfil e Configurações */}
            <div style={protonStyles.rightSidebar}>
                {/* Perfil do usuário */}
                <div
                    style={{
                        ...protonStyles.sidebarButton,
                        ...(activeTab === 'profile' ? { background: `linear-gradient(135deg, ${protonColors.purple} 0%, ${protonColors.green} 100%)` } : {})
                    }}
                    title={`${user?.name || 'Usuário'} - ${user?.email || ''}`}
                    onClick={() => setActiveTab('profile')}
                    onMouseEnter={(e) => {
                        if (activeTab !== 'profile') {
                            Object.assign(e.target.style, protonStyles.sidebarButtonHover);
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeTab !== 'profile') {
                            Object.assign(e.target.style, protonStyles.sidebarButton);
                        }
                    }}
                >
                    <User size={24} />
                </div>

                {/* Configurações */}
                <div
                    style={{
                        ...protonStyles.sidebarButton,
                        ...(activeTab === 'settings' ? { background: `linear-gradient(135deg, ${protonColors.purple} 0%, ${protonColors.green} 100%)` } : {})
                    }}
                    title="Configurações de Canais"
                    onClick={() => setActiveTab('settings')}
                    onMouseEnter={(e) => {
                        if (activeTab !== 'settings') {
                            Object.assign(e.target.style, protonStyles.sidebarButtonHover);
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeTab !== 'settings') {
                            Object.assign(e.target.style, protonStyles.sidebarButton);
                        }
                    }}
                >
                    <Settings size={24} />
                </div>

                {/* Privacidade */}
                <div
                    style={{
                        ...protonStyles.sidebarButton,
                        ...(activeTab === 'privacy' ? { background: `linear-gradient(135deg, ${protonColors.purple} 0%, ${protonColors.green} 100%)` } : {})
                    }}
                    title="Privacidade e Consentimentos"
                    onClick={() => setActiveTab('privacy')}
                    onMouseEnter={(e) => {
                        if (activeTab !== 'privacy') {
                            Object.assign(e.target.style, protonStyles.sidebarButtonHover);
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeTab !== 'privacy') {
                            Object.assign(e.target.style, protonStyles.sidebarButton);
                        }
                    }}
                >
                    <Shield size={24} />
                </div>

                {/* Logout */}
                <div
                    style={{
                        ...protonStyles.sidebarButton,
                        marginTop: '20px', // Separar um pouco do resto
                        background: 'rgba(255, 99, 99, 0.1)', // Cor vermelha sutil
                        borderColor: 'rgba(255, 99, 99, 0.3)'
                    }}
                    title="Sair do Sistema"
                    onClick={handleLogout}
                    onMouseEnter={(e) => {
                        Object.assign(e.target.style, {
                            ...protonStyles.sidebarButtonHover,
                            background: 'rgba(255, 99, 99, 0.2)',
                            borderColor: 'rgba(255, 99, 99, 0.5)'
                        });
                    }}
                    onMouseLeave={(e) => {
                        Object.assign(e.target.style, {
                            ...protonStyles.sidebarButton,
                            marginTop: '20px',
                            background: 'rgba(255, 99, 99, 0.1)',
                            borderColor: 'rgba(255, 99, 99, 0.3)'
                        });
                    }}
                >
                    <LogOut size={24} />
                </div>
            </div>
        </div>
    );
};

export default MultiChannelDashboard;

