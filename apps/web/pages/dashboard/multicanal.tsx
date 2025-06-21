import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

import MultiChannelDashboard from '../../components/dashboard/MultiChannelDashboard';
import ChannelSettings from '../../components/settings/ChannelSettings';

export default function MultiCanalPage() {
    const router = useRouter();
    // Estados da página
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    
    // ✅ ESTADO CENTRALIZADO PARA OS CANAIS (A FONTE DA VERDADE)
    const [channels, setChannels] = useState([]);
    const [channelsLoading, setChannelsLoading] = useState(true);

    // Efeito para autenticação
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: userProfile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
                setUser(userProfile || session.user);
            } else {
                router.push('/login');
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    // ✅ EFEITO PARA BUSCAR OS CANAIS QUANDO O USUÁRIO FOR DEFINIDO
    useEffect(() => {
        const loadChannels = async () => {
            if (user?.id) {
                setChannelsLoading(true);
                const { data, error } = await supabase
                    .from('user_channels')
                    .select('*')
                    .eq('user_id', user.id);
                
                if (data) setChannels(data);
                
                setChannelsLoading(false);
            }
        };
        loadChannels();
    }, [user]); // Roda sempre que o 'user' mudar

    // Função para logout
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };
    
    // ✅ FUNÇÃO PARA OS FILHOS ATUALIZAREM O ESTADO DO PAI
    const handleChannelsUpdate = (updatedChannels) => {
        setChannels(updatedChannels);
    };

    // Renderização condicional de Loading e Acesso
    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingCard}>
                    <div style={styles.spinner}></div>
                    <h2 style={styles.loadingTitle}>🚀 Sistema Multicanal</h2>
                    <p style={styles.loadingText}>Carregando sua conta...</p>
                </div>
            </div>
        );
    }
    
    if (!user) {
        return (
            <div style={styles.loginPrompt}>
                <div style={styles.loginCard}>
                    <h2 style={styles.loginTitle}>🔐 Acesso Negado</h2>
                    <p style={styles.loginText}>Você precisa estar logado para acessar o dashboard</p>
                    <button onClick={() => router.push('/login')} style={styles.loginButton}>
                        Fazer Login
                    </button>
                </div>
            </div>
        );
    }

    // Renderização principal
    return (
        <div style={styles.container}>
            {/* Top Bar Premium */}
            <div style={styles.topBar}>
                <div style={styles.topBarContent}>
                    {/* Logo */}
                    <div style={styles.logoSection}>
                        <div style={styles.logoIcon}>
                            <span style={styles.logoEmoji}>🚀</span>
                        </div>
                        <div>
                            <h1 style={styles.logoTitle}>Sistema Multicanal</h1>
                            <p style={styles.logoSubtitle}>Gestão Unificada de Comunicação</p>
                        </div>
                    </div>

                    {/* User Info */}
                    <div style={styles.userSection}>
                        <div style={styles.userInfo}>
                            <div style={styles.userAvatar}>
                                <span style={styles.userAvatarText}>
                                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                </span>
                            </div>
                            <div>
                                <p style={styles.userName}>{user.name || 'Usuário'}</p>
                                <p style={styles.userEmail}>{user.email}</p>
                            </div>
                        </div>
                        
                        <button onClick={handleLogout} style={styles.logoutButton}>
                            🚪 Sair
                        </button>
                    </div>
                </div>
            </div>

            {/* Navegação por Abas Premium */}
            <div style={styles.tabNavigationWrapper}>
                <div style={styles.tabNavigation}>
                    <button 
                        onClick={() => setActiveTab('dashboard')} 
                        style={{
                            ...styles.tabButton,
                            ...(activeTab === 'dashboard' ? styles.tabButtonActive : styles.tabButtonInactive)
                        }}
                    >
                        <span style={styles.tabIcon}>📊</span>
                        <span>Dashboard</span>
                    </button>
                    
                    <button 
                        onClick={() => setActiveTab('settings')} 
                        style={{
                            ...styles.tabButton,
                            ...(activeTab === 'settings' ? styles.tabButtonActive : styles.tabButtonInactive)
                        }}
                    >
                        <span style={styles.tabIcon}>⚙️</span>
                        <span>Configurações</span>
                    </button>
                </div>
            </div>

            {/* ✅ CONTEÚDO DAS ABAS AGORA CORRETAMENTE CONECTADO */}
            <div style={styles.dashboardContainer}>
                {activeTab === 'dashboard' && (
                    <MultiChannelDashboard 
                        channels={channels} 
                        loading={channelsLoading} 
                    />
                )}
                {activeTab === 'settings' && (
                    <ChannelSettings 
                        initialChannels={channels} 
                        onUpdate={handleChannelsUpdate} 
                        userId={user.id}
                        userPlan={user.plan}
                    />
                )}
            </div>
            
            <style jsx global>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

// ✅ ESTILOS PREMIUM COM GRADIENTE ROXO
const styles = {
    container: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    
    // Loading States
    loadingContainer: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    loadingCard: {
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '40px',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        maxWidth: '400px',
        animation: 'fadeIn 0.5s ease-out'
    },
    loadingTitle: {
        color: 'white',
        fontSize: '24px',
        fontWeight: '700',
        marginBottom: '10px',
        margin: '20px 0 10px 0'
    },
    loadingText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '16px',
        margin: 0
    },
    spinner: {
        width: '60px',
        height: '60px',
        border: '4px solid rgba(255, 255, 255, 0.3)',
        borderTop: '4px solid #fff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto'
    },
    
    // Login Prompt
    loginPrompt: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    loginCard: {
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '40px',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        maxWidth: '400px'
    },
    loginTitle: {
        color: 'white',
        fontSize: '24px',
        fontWeight: '700',
        marginBottom: '20px',
        margin: '0 0 20px 0'
    },
    loginText: {
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: '30px',
        margin: '0 0 30px 0'
    },
    loginButton: {
        background: 'rgba(255, 255, 255, 0.9)',
        color: '#667eea',
        border: 'none',
        borderRadius: '12px',
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
    },
    
    // Top Bar
    topBar: {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '15px 30px'
    },
    topBarContent: {
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    logoSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
    },
    logoIcon: {
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '12px',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    logoEmoji: {
        fontSize: '24px'
    },
    logoTitle: {
        color: 'white',
        fontSize: '20px',
        fontWeight: '800',
        margin: 0,
        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    logoSubtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '12px',
        margin: 0
    },
    userSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
    },
    userInfo: {
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '8px 15px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    userAvatar: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.2)',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    userAvatarText: {
        color: 'white',
        fontSize: '14px',
        fontWeight: '600'
    },
    userName: {
        color: 'white',
        fontSize: '14px',
        fontWeight: '600',
        margin: 0
    },
    userEmail: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '12px',
        margin: 0
    },
    logoutButton: {
        background: 'rgba(255, 255, 255, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '10px',
        padding: '8px 12px',
        color: 'white',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
    },
    
    // Tab Navigation Premium
    tabNavigationWrapper: {
        padding: '40px 30px',
        display: 'flex',
        justifyContent: 'center'
    },
    tabNavigation: {
        background: 'rgba(255, 255, 255, 0.15)',
        borderRadius: '25px',
        padding: '12px',
        display: 'flex',
        gap: '12px',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
    },
    tabButton: {
        padding: '16px 32px',
        borderRadius: '18px',
        border: 'none',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        outline: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: '150px',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
    },
    tabButtonActive: {
        background: 'rgba(255, 255, 255, 0.95)',
        color: '#667eea',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        transform: 'translateY(-2px)'
    },
    tabButtonInactive: {
        background: 'rgba(255, 255, 255, 0.1)',
        color: 'white',
        backdropFilter: 'blur(10px)'
    },
    tabIcon: {
        fontSize: '20px',
        transition: 'transform 0.3s ease'
    },
    
    // Content
    dashboardContainer: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 30px 40px'
    }
};