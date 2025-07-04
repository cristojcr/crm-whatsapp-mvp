// 🎨 PÁGINA DE CONSENTIMENTOS PREMIUM
// 📁 CRIE: C:\Users\crist\crm-whatsapp-mvp\apps\web\pages\onboarding\consentimentos.js

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import ConsentFormInline from '../../components/compliance/ConsentFormInline';

// Configuração Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ConsentimentosPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUserFromToken();
    }, []);

    const loadUserFromToken = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
                // Buscar perfil completo do usuário
                const { data: profile, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', session.user.email)
                    .single();

                if (profile) {
                    setUser(profile);
                } else {
                    // Se não encontrar perfil, usar dados básicos da sessão
                    setUser({
                        id: session.user.id,
                        email: session.user.email,
                        name: session.user.user_metadata?.name || ''
                    });
                }
            } else {
                router.push('/login');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar usuário:', error);
            router.push('/login');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = () => {
        // Redirecionar para o dashboard multicanal
        router.push('/dashboard/multicanal');
    };

    const handleSkip = () => {
        // Permitir pular os consentimentos
        const confirmSkip = confirm(
            '⚠️ Tem certeza que deseja pular os consentimentos?\n\n' +
            'Você pode configurá-los depois clicando no botão "🔒 Privacidade" no dashboard.'
        );
        
        if (confirmSkip) {
            router.push('/dashboard/multicanal');
        }
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingCard}>
                    <div style={styles.spinner}></div>
                    <h2 style={styles.loadingTitle}>🔒 Carregando Consentimentos</h2>
                    <p style={styles.loadingText}>Preparando suas opções de privacidade...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div style={styles.container}>
                <div style={styles.errorCard}>
                    <h2 style={styles.errorTitle}>🚫 Acesso Negado</h2>
                    <p style={styles.errorText}>Você precisa estar logado para acessar esta página</p>
                    <button onClick={() => router.push('/login')} style={styles.loginButton}>
                        🔐 Fazer Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header Premium */}
            <div style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.logoSection}>
                        <div style={styles.logoIcon}>🔒</div>
                        <div>
                            <h1 style={styles.logoTitle}>Consentimentos LGPD/GDPR</h1>
                            <p style={styles.logoSubtitle}>Configure suas preferências de privacidade</p>
                        </div>
                    </div>
                    
                    <div style={styles.progressSection}>
                        <div style={styles.progressBar}>
                            <div style={styles.progressFill}></div>
                        </div>
                        <span style={styles.progressText}>Etapa Final</span>
                    </div>
                </div>
            </div>

            {/* Cartões Informativos */}
            <div style={styles.infoCardsContainer}>
                <div style={styles.infoCard}>
                    <div style={styles.cardIcon}>🇧🇷</div>
                    <h3 style={styles.cardTitle}>LGPD Brasil</h3>
                    <p style={styles.cardText}>
                        Compliance total com a Lei Geral de Proteção de Dados brasileira
                    </p>
                </div>
                
                <div style={styles.infoCard}>
                    <div style={styles.cardIcon}>🇪🇺</div>
                    <h3 style={styles.cardTitle}>GDPR Europa</h3>
                    <p style={styles.cardText}>
                        Adequação completa ao regulamento europeu de proteção de dados
                    </p>
                </div>
                
                <div style={styles.infoCard}>
                    <div style={styles.cardIcon}>⚡</div>
                    <h3 style={styles.cardTitle}>Rápido e Fácil</h3>
                    <p style={styles.cardText}>
                        Processo simplificado - todas as opções já estão marcadas para você
                    </p>
                </div>
            </div>

            {/* Formulário de Consentimentos */}
            <div style={styles.formContainer}>
                <ConsentFormInline onComplete={handleComplete} />
            </div>

            {/* Ações Inferiores */}
            <div style={styles.actionsContainer}>
                <button onClick={handleSkip} style={styles.skipButton}>
                    ⏭️ Pular por Agora
                </button>
                <p style={styles.skipText}>
                    Você pode configurar seus consentimentos depois no dashboard
                </p>
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
                
                @keyframes progressPulse {
                    0%, 100% { transform: scaleX(1); }
                    50% { transform: scaleX(1.05); }
                }
            `}</style>
        </div>
    );
}

// 🎨 ESTILOS PREMIUM (similar ao multicanal.tsx)
const styles = {
    container: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    
    // Loading States
    loadingCard: {
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '40px',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        maxWidth: '400px',
        margin: '50vh auto',
        transform: 'translateY(-50%)',
        animation: 'fadeIn 0.5s ease-out'
    },
    loadingTitle: {
        color: 'white',
        fontSize: '24px',
        fontWeight: '700',
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
    
    // Error States
    errorCard: {
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '40px',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        maxWidth: '400px',
        margin: '50vh auto',
        transform: 'translateY(-50%)'
    },
    errorTitle: {
        color: 'white',
        fontSize: '24px',
        fontWeight: '700',
        margin: '0 0 20px 0'
    },
    errorText: {
        color: 'rgba(255, 255, 255, 0.8)',
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
    
    // Header Premium
    header: {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '20px 30px'
    },
    headerContent: {
        maxWidth: '1200px',
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
        padding: '12px',
        fontSize: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    logoTitle: {
        color: 'white',
        fontSize: '24px',
        fontWeight: '800',
        margin: 0,
        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    logoSubtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '14px',
        margin: 0
    },
    progressSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
    },
    progressBar: {
        width: '200px',
        height: '8px',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '4px',
        overflow: 'hidden'
    },
    progressFill: {
        width: '90%',
        height: '100%',
        background: 'linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%)',
        borderRadius: '4px',
        animation: 'progressPulse 2s ease-in-out infinite'
    },
    progressText: {
        color: 'white',
        fontSize: '14px',
        fontWeight: '500'
    },
    
    // Info Cards
    infoCardsContainer: {
        maxWidth: '1200px',
        margin: '40px auto',
        padding: '0 30px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
    },
    infoCard: {
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '30px',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        transition: 'transform 0.3s ease',
        animation: 'fadeIn 0.6s ease-out'
    },
    cardIcon: {
        fontSize: '48px',
        marginBottom: '20px'
    },
    cardTitle: {
        color: 'white',
        fontSize: '18px',
        fontWeight: '700',
        margin: '0 0 15px 0'
    },
    cardText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '14px',
        lineHeight: '1.5',
        margin: 0
    },
    
    // Form Container
    formContainer: {
        maxWidth: '800px',
        margin: '40px auto',
        padding: '0 30px',
        animation: 'fadeIn 0.8s ease-out'
    },
    
    // Actions
    actionsContainer: {
        maxWidth: '800px',
        margin: '40px auto 60px',
        padding: '0 30px',
        textAlign: 'center'
    },
    skipButton: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '12px',
        padding: '12px 24px',
        color: 'white',
        fontSize: '16px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        marginBottom: '15px'
    },
    skipText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '14px',
        margin: 0
    }
};