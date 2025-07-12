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

    // 🔒 NOVOS ESTADOS PARA VERIFICAÇÃO DE CONSENTIMENTOS
    const [checkingConsents, setCheckingConsents] = useState(false);
    const [consentsChecked, setConsentsChecked] = useState(false);
    const [consentsStatus, setConsentsStatus] = useState(null);

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

    // 🔒 NOVO: VERIFICAÇÃO OPCIONAL DE CONSENTIMENTOS LGPD/GDPR
    useEffect(() => {
        const checkUserConsents = async () => {
            // Só verificar se usuário está carregado e ainda não verificamos os consentimentos
            if (user?.email && !consentsChecked && !checkingConsents) {
                setCheckingConsents(true);
                
                try {
                    console.log('🔍 Verificando consentimentos LGPD/GDPR para usuário:', user.email);
                    
                    // 🔧 CORREÇÃO: usar EMAIL em vez de ID
                    const response = await fetch(`http://localhost:3001/api/consent-form/user/${encodeURIComponent(user.email)}`, {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('📋 Consentimentos encontrados:', data.consents?.length || 0);
                        
                        // Verificar se tem consentimentos obrigatórios
                        const requiredConsentTypes = ['data_processing', 'cookies'];
                        const hasRequiredConsents = data.consents?.some(consent => 
                            requiredConsentTypes.includes(consent.consent_type) && consent.consent_given
                        );
                        
                        // 🎯 NOVA LÓGICA: NÃO FORÇAR, APENAS INFORMAR
                        if (!hasRequiredConsents) {
                            console.log('ℹ️ Consentimentos opcionais não preenchidos - mostrando banner');
                            setConsentsStatus('missing');
                            // ❌ REMOVIDO: router.push('/onboarding/consentimentos');
                        } else {
                            console.log('✅ Consentimentos encontrados - usuário completo');
                            setConsentsStatus('complete');
                        }
                    } else {
                        console.log('ℹ️ API de consentimentos não disponível - prosseguindo normalmente');
                        setConsentsStatus('api_unavailable');
                    }
                    
                } catch (error) {
                    console.error('❌ Erro ao verificar consentimentos:', error);
                    setConsentsStatus('error');
                } finally {
                    setCheckingConsents(false);
                    setConsentsChecked(true);
                }
            }
        };
        
        checkUserConsents();
    }, [user, consentsChecked, checkingConsents]);

    // ✅ EFEITO PARA BUSCAR OS CANAIS QUANDO O USUÁRIO FOR DEFINIDO E CONSENTIMENTOS VERIFICADOS
    // ✅ EFEITO PARA BUSCAR OS CANAIS (SEM DEPENDÊNCIA DE CONSENTIMENTOS)
    useEffect(() => {
        const loadChannels = async () => {
            if (user?.id) {
                setChannelsLoading(true);
                const { data, error } = await supabase
                    .from('user_channels')
                    .select('*')
                    .eq('user_id', user.id);
                
                if (error) {
                    console.error('❌ Erro ao carregar canais:', error);
                } else {
                    console.log('✅ Canais carregados:', data);
                    setChannels(data || []);
                }
                setChannelsLoading(false);
            }
        };
        
        loadChannels();
    }, [user]);

    // ✅ FUNÇÃO PARA ATUALIZAR CANAIS (CALLBACK PARA O CHANNELSETTINGS)
    const handleChannelsUpdate = (updatedChannels) => {
        console.log('🔄 Atualizando canais no estado pai:', updatedChannels);
        setChannels(updatedChannels);
    };

    // Função de logout
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    // ✅ ESTILOS REDESENHADOS PARA TELA INTEIRA - PROTON VPN
    const styles = {
        // Container principal - TELA INTEIRA
        container: {
            minHeight: '100vh',
            width: '100vw',
            margin: 0,
            padding: 0,
            background: 'linear-gradient(135deg, #8B5CF6 0%, #6D4AFF 25%, #1C1B1F 75%, #16213e 100%)',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            position: 'fixed',
            top: 0,
            left: 0,
            overflow: 'hidden'
        },

        // Loading screen
        loadingContainer: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #6D4AFF 25%, #1C1B1F 75%, #16213e 100%)'
        },
        loadingCard: {
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            padding: '40px',
            textAlign: 'center',
            color: 'white'
        },
        loadingTitle: {
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '16px',
            margin: '0 0 16px 0'
        },
        loadingText: {
            color: 'rgba(255, 255, 255, 0.8)',
            margin: 0
        },

        // Login prompt
        loginPrompt: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #6D4AFF 25%, #1C1B1F 75%, #16213e 100%)'
        },
        loginCard: {
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%'
        },
        loginTitle: {
            color: 'white',
            fontSize: '28px',
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
            background: 'linear-gradient(135deg, #6D4AFF 0%, #00A693 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 20px rgba(109, 74, 255, 0.3)'
        }
    };

    // 🔒 COMPONENTE BANNER DE CONSENTIMENTOS (OPCIONAL)
    const ConsentBanner = ({ status, onGoToConsents, onDismiss }) => (
        <div style={{
            background: 'rgba(76, 175, 80, 0.1)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            borderRadius: '15px',
            margin: '20px',
            padding: '20px',
            backdropFilter: 'blur(10px)',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '24px' }}>🔒</span>
                    <div>
                        <h3 style={{ color: 'white', margin: '0 0 5px 0', fontSize: '16px' }}>
                            Consentimentos LGPD/GDPR
                        </h3>
                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0, fontSize: '14px' }}>
                            Complete seus consentimentos para uma experiência personalizada
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={onGoToConsents}
                        style={{
                            background: 'rgba(76, 175, 80, 0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Completar
                    </button>
                    <button 
                        onClick={onDismiss}
                        style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Depois
                    </button>
                </div>
            </div>
        </div>
    );

    // Loading state
    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingCard}>
                    <h2 style={styles.loadingTitle}>🚀 Carregando Scalabots</h2>
                    <p style={styles.loadingText}>Preparando seu dashboard...</p>
                </div>
            </div>
        );
    }

    // Not authenticated
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

    // ✅ RENDERIZAÇÃO PRINCIPAL - SEM LIMITAÇÕES DE CONTAINER
    return (
        <div style={styles.container}>
            {/* 🔒 BANNER OPCIONAL DE CONSENTIMENTOS */}
            {consentsStatus === 'missing' && (
                <ConsentBanner 
                    status={consentsStatus}
                    onGoToConsents={() => router.push('/onboarding/consentimentos')}
                    onDismiss={() => setConsentsStatus('dismissed')}
                />
            )}
            
            {/* ✅ CONTEÚDO DAS ABAS AGORA SEM LIMITAÇÕES DE CONTAINER */}
            {activeTab === 'dashboard' && (
                <MultiChannelDashboard 
                    channels={channels} 
                    loading={channelsLoading}
                    user={user}
                    onLogout={handleLogout}
                    onChannelsUpdate={handleChannelsUpdate}
                />
            )}
            
            {activeTab === 'settings' && (
                <ChannelSettings 
                    initialChannels={channels}
                    onUpdate={handleChannelsUpdate}
                    userId={user?.id}
                    userPlan={user?.plan || 'premium'}
                />
            )}
        </div>
    );
}

