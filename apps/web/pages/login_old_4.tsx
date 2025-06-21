// apps/web/pages/login.jsx
import { useState } from 'react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email) return;
        
        setLoading(true);
        
        // Simular login
        setTimeout(() => {
            // Redirecionar para dashboard
            window.location.href = '/dashboard/multicanal';
        }, 1000);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    const styles = {
        container: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: 'relative',
            overflow: 'hidden'
        },
        
        backgroundDecorative: {
            position: 'absolute',
            inset: '0',
            overflow: 'hidden',
            pointerEvents: 'none'
        },
        
        bgCircle1: {
            position: 'absolute',
            top: '25%',
            left: '25%',
            width: '384px',
            height: '384px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%',
            filter: 'blur(60px)'
        },
        
        bgCircle2: {
            position: 'absolute',
            bottom: '25%',
            right: '25%',
            width: '384px',
            height: '384px',
            background: 'rgba(147, 51, 234, 0.1)',
            borderRadius: '50%',
            filter: 'blur(60px)'
        },

        cardContainer: {
            position: 'relative',
            width: '100%',
            maxWidth: '520px',
            zIndex: 10
        },

        card: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '28px',
            padding: '50px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
        },

        header: {
            textAlign: 'center',
            marginBottom: '40px'
        },

        logo: {
            width: '88px',
            height: '88px',
            margin: '0 auto 28px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
            borderRadius: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            fontWeight: 'bold',
            color: 'white',
            boxShadow: '0 12px 35px rgba(139, 92, 246, 0.3)',
            cursor: 'pointer',
            transition: 'transform 0.3s ease',
        },

        logoHover: {
            transform: 'scale(1.05)'
        },

        title: {
            fontSize: '36px',
            fontWeight: 'bold',
            marginBottom: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
        },

        subtitle: {
            color: '#4b5563',
            fontWeight: '500',
            fontSize: '18px',
            marginBottom: '6px'
        },

        subtext: {
            fontSize: '15px',
            color: '#6b7280'
        },

        formContainer: {
            marginBottom: '28px'
        },

        fieldContainer: {
            marginBottom: '28px'
        },

        label: {
            display: 'block',
            fontSize: '15px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '10px'
        },

        inputContainer: {
            position: 'relative'
        },

        input: {
            width: '100%',
            padding: '16px 20px',
            paddingRight: '52px',
            background: 'rgba(255, 255, 255, 0.5)',
            border: '1px solid #d1d5db',
            borderRadius: '14px',
            fontSize: '16px',
            outline: 'none',
            transition: 'all 0.3s ease',
            boxSizing: 'border-box'
        },

        inputFocus: {
            borderColor: '#8b5cf6',
            boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.1)'
        },

        inputIcon: {
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af',
            fontSize: '18px'
        },

        button: {
            width: '100%',
            padding: '16px 28px',
            color: 'white',
            fontWeight: '600',
            borderRadius: '14px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '17px',
            transition: 'all 0.3s ease',
            transform: 'scale(1)',
            background: loading 
                ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: loading 
                ? 'none'
                : '0 12px 35px rgba(102, 126, 234, 0.3)',
            opacity: (loading || !email) ? 0.5 : 1
        },

        buttonHover: {
            transform: 'scale(1.02)',
            boxShadow: '0 15px 40px rgba(102, 126, 234, 0.4)'
        },

        buttonContent: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
        },

        spinner: {
            width: '22px',
            height: '22px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        },

        demoCard: {
            marginTop: '28px',
            padding: '22px',
            background: 'rgba(16, 185, 129, 0.05)',
            borderRadius: '16px',
            border: '1px solid rgba(16, 185, 129, 0.1)',
            textAlign: 'center'
        },

        demoTitle: {
            fontSize: '15px',
            color: '#059669',
            fontWeight: '600',
            marginBottom: '8px'
        },

        demoText: {
            fontSize: '13px',
            color: '#047857'
        },

        footer: {
            marginTop: '36px',
            textAlign: 'center'
        },

        footerText: {
            fontSize: '13px',
            color: '#6b7280'
        }
    };

    return (
        <div style={styles.container}>
            {/* Background Decorativo */}
            <div style={styles.backgroundDecorative}>
                <div style={styles.bgCircle1}></div>
                <div style={styles.bgCircle2}></div>
            </div>

            {/* Container Principal */}
            <div style={styles.cardContainer}>
                {/* Card do Login */}
                <div style={styles.card}>
                    {/* Header */}
                    <div style={styles.header}>
                        {/* Logo */}
                        <div 
                            style={styles.logo}
                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        >
                            🚀
                        </div>
                        
                        {/* Título */}
                        <h1 style={styles.title}>
                            CRM Inteligente
                        </h1>
                        
                        {/* Subtítulo */}
                        <p style={styles.subtitle}>
                            Acesse seu Escalabots
                        </p>
                        <p style={styles.subtext}>
                            Sistema de gestão multicanal
                        </p>
                    </div>

                    {/* Formulário */}
                    <div style={styles.formContainer}>
                        {/* Campo Email */}
                        <div style={styles.fieldContainer}>
                            <label style={styles.label}>
                                📧 Insira seu e-mail:
                            </label>
                            <div style={styles.inputContainer}>
                                <input
                                    type="email"
                                    placeholder="Digite seu email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    style={styles.input}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#8b5cf6';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#d1d5db';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                <div style={styles.inputIcon}>
                                    ✨
                                </div>
                            </div>
                        </div>

                        {/* Botão Login */}
                        <button
                            onClick={handleLogin}
                            disabled={loading || !email}
                            style={styles.button}
                            onMouseEnter={(e) => {
                                if (!loading && email) {
                                    e.target.style.transform = 'scale(1.02)';
                                    e.target.style.boxShadow = '0 18px 45px rgba(102, 126, 234, 0.4)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'scale(1)';
                                e.target.style.boxShadow = loading ? 'none' : '0 12px 35px rgba(102, 126, 234, 0.3)';
                            }}
                        >
                            <div style={styles.buttonContent}>
                                {loading ? (
                                    <>
                                        <div style={styles.spinner}></div>
                                        <span>Entrando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Entrar</span>
                                        <span>→</span>
                                    </>
                                )}
                            </div>
                        </button>
                    </div>

                    {/* Informações de Acesso */}
                    <div style={styles.demoCard}>
                        <p style={styles.demoTitle}>
                            🔐 Acesso Seguro
                        </p>
                        <p style={styles.demoText}>
                            Entre com suas credenciais para acessar o sistema
                        </p>
                    </div>

                    {/* Footer */}
                    <div style={styles.footer}>
                        <p style={styles.footerText}>
                            © 2025 CRM Inteligente • Proximidade Inteligente
                        </p>
                    </div>
                </div>
            </div>

            {/* CSS Animation */}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}