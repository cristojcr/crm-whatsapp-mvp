import { useState } from 'react';
import { useRouter } from 'next/router';
// ✅ 1. Importar o cliente Supabase real
import { supabase } from '../lib/supabase'; 

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState(''); // Adicionar estado para senha
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null); // Adicionar estado para erros
    const router = useRouter();

    // ✅ 2. Função de login real com Supabase
    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            // Sucesso! Redirecionar para o dashboard
            router.push('/dashboard/multicanal');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <div style={styles.container}>
            {/* Elementos decorativos de fundo */}
            <div style={styles.backgroundElements}>
                <div style={{...styles.floatingElement, ...styles.element1}}></div>
                <div style={{...styles.floatingElement, ...styles.element2}}></div>
                <div style={{...styles.floatingElement, ...styles.element3}}></div>
                <div style={{...styles.floatingElement, ...styles.element4}}></div>
            </div>
            
            {/* Card de Login Principal */}
            <div style={styles.loginCard}>
                
                {/* Header com Logo */}
                <div style={styles.loginHeader}>
                    <div style={styles.logoContainer}>
                        <div style={styles.logoIcon}>
                            🚀
                        </div>
                        <div style={styles.logoRings}>
                            <div style={styles.ring1}></div>
                            <div style={styles.ring2}></div>
                        </div>
                    </div>
                    
                    <h1 style={styles.welcomeTitle}>
                        Bem-vindo de volta!
                    </h1>
                    <p style={styles.welcomeSubtitle}>
                        Acesse sua plataforma de comunicação multicanal
                    </p>
                </div>

                {/* Formulário */}
                <div onSubmit={handleLogin} style={styles.loginForm}>
                    
                    {/* Campo Email */}
                    <div style={styles.inputGroup}>
                        <div style={styles.inputIcon}>📧</div>
                        <input
                            type="email"
                            placeholder="Seu melhor email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyPress={handleKeyPress}
                            style={styles.input}
                            required
                            onFocus={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.2)';
                            }}
                            onBlur={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                            }}
                        />
                    </div>

                    {/* Campo Senha */}
                    <div style={styles.inputGroup}>
                        <div style={styles.inputIcon}>🔐</div>
                        <input
                            type="password"
                            placeholder="Sua senha secreta"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={handleKeyPress}
                            style={styles.input}
                            required
                            onFocus={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.2)';
                            }}
                            onBlur={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                            }}
                        />
                    </div>

                    {/* Mensagem de Erro */}
                    {error && (
                        <div style={styles.errorMessage}>
                            <span style={styles.errorIcon}>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Botão de Login */}
                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        style={{
                            ...styles.loginButton,
                            ...(loading ? styles.loginButtonLoading : {})
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.target.style.transform = 'translateY(-3px)';
                                e.target.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.3)';
                            }
                        }}
                    >
                        {loading ? (
                            <>
                                <div style={styles.spinner}></div>
                                <span>Conectando...</span>
                            </>
                        ) : (
                            <>
                                <span>🚀</span>
                                <span>Acessar Plataforma</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Footer */}
                <div style={styles.loginFooter}>
                    <div style={styles.securityBadge}>
                        <span style={styles.securityIcon}>🔒</span>
                        <span style={styles.securityText}>Conexão Segura</span>
                    </div>
                </div>
            </div>

            {/* Partículas animadas */}
            <div style={styles.particles}>
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        style={{
                            ...styles.particle,
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${3 + Math.random() * 2}s`
                        }}
                    ></div>
                ))}
            </div>

            <style jsx global>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    33% { transform: translateY(-20px) rotate(5deg); }
                    66% { transform: translateY(-10px) rotate(-3deg); }
                }
                
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 0.7; }
                    50% { transform: scale(1.1); opacity: 1; }
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes particleFloat {
                    0% { transform: translateY(100vh) scale(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(-100vh) scale(1); opacity: 0; }
                }
                
                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                
                @keyframes glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.3); }
                    50% { box-shadow: 0 0 40px rgba(102, 126, 234, 0.6); }
                }
            `}</style>
        </div>
    );
}

// 🎨 ESTILOS ÉPICOS DE NÍVEL BILIONÁRIO
const styles = {
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient 15s ease infinite',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overflow: 'hidden'
    },
    
    // Elementos decorativos flutuantes
    backgroundElements: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
    },
    
    floatingElement: {
        position: 'absolute',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.1)',
        animation: 'float 6s ease-in-out infinite'
    },
    
    element1: {
        width: '120px',
        height: '120px',
        top: '10%',
        left: '10%',
        animationDelay: '0s'
    },
    
    element2: {
        width: '80px',
        height: '80px',
        top: '20%',
        right: '15%',
        animationDelay: '2s'
    },
    
    element3: {
        width: '60px',
        height: '60px',
        bottom: '20%',
        left: '20%',
        animationDelay: '4s'
    },
    
    element4: {
        width: '100px',
        height: '100px',
        bottom: '15%',
        right: '10%',
        animationDelay: '1s'
    },
    
    // Card principal
    loginCard: {
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '48px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        position: 'relative',
        zIndex: 10,
        animation: 'fadeInUp 0.8s ease-out'
    },
    
    // Header do login
    loginHeader: {
        textAlign: 'center',
        marginBottom: '40px'
    },
    
    logoContainer: {
        position: 'relative',
        display: 'inline-block',
        marginBottom: '24px'
    },
    
    logoIcon: {
        fontSize: '48px',
        display: 'block',
        position: 'relative',
        zIndex: 2,
        animation: 'pulse 3s ease-in-out infinite'
    },
    
    logoRings: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
    },
    
    ring1: {
        width: '80px',
        height: '80px',
        border: '2px solid rgba(102, 126, 234, 0.3)',
        borderRadius: '50%',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'pulse 2s ease-in-out infinite'
    },
    
    ring2: {
        width: '100px',
        height: '100px',
        border: '1px solid rgba(118, 75, 162, 0.2)',
        borderRadius: '50%',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'pulse 2s ease-in-out infinite 0.5s'
    },
    
    welcomeTitle: {
        fontSize: '32px',
        fontWeight: '800',
        color: '#1f2937',
        marginBottom: '8px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
    },
    
    welcomeSubtitle: {
        fontSize: '16px',
        color: '#6b7280',
        fontWeight: '500',
        lineHeight: '1.5'
    },
    
    // Formulário
    loginForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
    },
    
    inputGroup: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
    },
    
    inputIcon: {
        position: 'absolute',
        left: '20px',
        fontSize: '20px',
        zIndex: 2,
        pointerEvents: 'none'
    },
    
    input: {
        width: '100%',
        padding: '18px 20px 18px 60px',
        fontSize: '16px',
        fontWeight: '500',
        border: '2px solid rgba(229, 231, 235, 0.8)',
        borderRadius: '16px',
        background: 'rgba(255, 255, 255, 0.9)',
        outline: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        fontFamily: 'inherit'
    },
    
    // Mensagem de erro
    errorMessage: {
        background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
        border: '1px solid #fecaca',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#dc2626',
        fontSize: '14px',
        fontWeight: '500',
        animation: 'fadeInUp 0.3s ease-out'
    },
    
    errorIcon: {
        fontSize: '18px'
    },
    
    // Botão de login
    loginButton: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '16px',
        padding: '18px 32px',
        fontSize: '16px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    
    loginButtonLoading: {
        cursor: 'not-allowed',
        transform: 'none !important',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2) !important'
    },
    
    spinner: {
        width: '20px',
        height: '20px',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderTop: '2px solid white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    
    // Footer
    loginFooter: {
        marginTop: '32px',
        display: 'flex',
        justifyContent: 'center'
    },
    
    securityBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#059669'
    },
    
    securityIcon: {
        fontSize: '16px'
    },
    
    securityText: {
        fontSize: '13px'
    },
    
    // Partículas
    particles: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
    },
    
    particle: {
        position: 'absolute',
        width: '4px',
        height: '4px',
        background: 'rgba(255, 255, 255, 0.6)',
        borderRadius: '50%',
        animation: 'particleFloat linear infinite'
    }
};