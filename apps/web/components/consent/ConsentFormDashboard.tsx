// 🔒 COMPONENTE DE CONSENTIMENTOS INTEGRADO AO DASHBOARD - VERSÃO PREMIUM CORRIGIDA
// 📁 SUBSTITUA COMPLETAMENTE: C:\Users\crist\crm-whatsapp-mvp\apps\web\components\consent\ConsentFormDashboard.tsx

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configuração Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ConsentFormDashboardProps {
    onComplete?: () => void;
    onSkip?: () => void;
}

const ConsentFormDashboard: React.FC<ConsentFormDashboardProps> = ({ 
    onComplete, 
    onSkip 
}) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // 🔒 ESTADOS DOS CONSENTIMENTOS (todos marcados por padrão para UX)
    const [consents, setConsents] = useState({
        marketing: true,       // ← Já marcado por padrão (verde)
        analytics: true,       // ← Já marcado por padrão (verde)
        cookies: true,         // ← Obrigatório, sempre true (cinza)
        data_processing: true, // ← Obrigatório, sempre true (cinza)
        communication: true,   // ← Já marcado por padrão (verde)
        third_party: true      // ← Já marcado por padrão (verde)
    });

    useEffect(() => {
        loadUserAndConsents();
        
        // ✨ INJETAR CSS CUSTOMIZADO PARA CHECKBOXES PREMIUM
        const customCSS = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes checkboxPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            .consent-checkbox {
                appearance: none;
                width: 18px;
                height: 18px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 4px;
                background: rgba(255, 255, 255, 0.08);
                cursor: pointer;
                position: relative;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .consent-checkbox:hover:not(:disabled) {
                border-color: #6D4AFF;
                background: rgba(109, 74, 255, 0.1);
                animation: checkboxPulse 0.3s ease;
            }
            
            .consent-checkbox:checked {
                background: linear-gradient(135deg, #6D4AFF 0%, #00A693 100%);
                border-color: #6D4AFF;
                box-shadow: 0 2px 8px rgba(109, 74, 255, 0.3);
            }
            
            .consent-checkbox:checked::after {
                content: '✓';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 12px;
                font-weight: bold;
            }
            
            .consent-checkbox:disabled {
                cursor: not-allowed;
                opacity: 0.8;
                background: rgba(255, 255, 255, 0.15) !important;
                border-color: rgba(255, 255, 255, 0.3) !important;
                box-shadow: none !important;
            }
            
            .consent-checkbox:disabled::after {
                content: '✓';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: rgba(255, 255, 255, 0.7);
                font-size: 12px;
                font-weight: bold;
            }
        `;
        
        const styleElement = document.createElement('style');
        styleElement.textContent = customCSS;
        document.head.appendChild(styleElement);
        
        return () => {
            if (document.head.contains(styleElement)) {
                document.head.removeChild(styleElement);
            }
        };
    }, []);

    // 🔒 FUNÇÃO PARA CARREGAR USUÁRIO E CONSENTIMENTOS DO BANCO
    const loadUserAndConsents = async () => {
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
                    console.log('✅ Usuário carregado:', profile.email);
                    
                    // 🔍 Carregar consentimentos existentes do banco
                    await loadExistingConsents(profile.id);
                } else {
                    // Se não encontrar perfil, usar dados básicos da sessão
                    const basicUser = {
                        id: session.user.id,
                        email: session.user.email,
                        name: session.user.user_metadata?.name || ''
                    };
                    setUser(basicUser);
                    await loadExistingConsents(basicUser.id);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao carregar usuário:', error);
        } finally {
            setLoading(false);
        }
    };

    // 🔍 FUNÇÃO PARA CARREGAR CONSENTIMENTOS EXISTENTES
    const loadExistingConsents = async (userId) => {
        try {
            console.log('🔍 Carregando consentimentos existentes para:', userId);
            
            const response = await fetch(`http://localhost:3001/api/consent-bulk/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data.consents) {
                    console.log('✅ Consentimentos carregados do banco:', data.data.consents);
                    
                    // Transformar array em objeto para o estado (mantendo padrão "todos marcados")
                    const loadedConsents = {
                        marketing: true,       // Padrão marcado
                        analytics: true,       // Padrão marcado
                        cookies: true,         // Sempre obrigatório
                        data_processing: true, // Sempre obrigatório
                        communication: true,   // Padrão marcado
                        third_party: true      // Padrão marcado
                    };

                    // Aplicar consentimentos do banco (se existirem)
                    data.data.consents.forEach(consent => {
                        if (consent.consent_type === 'marketing') {
                            loadedConsents.marketing = consent.consent_given;
                        } else if (consent.consent_type === 'analytics') {
                            loadedConsents.analytics = consent.consent_given;
                        } else if (consent.consent_type === 'communication') {
                            loadedConsents.communication = consent.consent_given;
                        } else if (consent.consent_type === 'third_party_sharing') {
                            loadedConsents.third_party = consent.consent_given;
                        }
                        // cookies e data_processing sempre ficam true (obrigatórios)
                    });

                    setConsents(loadedConsents);
                    console.log('✅ Estados dos consentimentos aplicados:', loadedConsents);
                } else {
                    console.log('ℹ️ Nenhum consentimento encontrado, usando padrões');
                }
            } else {
                console.warn('⚠️ API não disponível, usando consentimentos padrão');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar consentimentos:', error);
            console.log('ℹ️ Usando consentimentos padrão devido ao erro');
        }
    };

    // 🔄 FUNÇÃO PARA ALTERAR CONSENTIMENTOS (apenas os não-obrigatórios)
    const handleConsentChange = (consentType, value) => {
        // Bloquear alteração dos obrigatórios
        if (consentType === 'cookies' || consentType === 'data_processing') {
            console.log('⚠️ Consentimento obrigatório não pode ser alterado:', consentType);
            return;
        }

        setConsents(prev => ({
            ...prev,
            [consentType]: value
        }));
        
        console.log(`✅ Consentimento ${consentType} alterado para:`, value);
    };

    // 💾 FUNÇÃO PARA SALVAR CONSENTIMENTOS NO BANCO
    const handleComplete = async () => {
        if (!user?.id) {
            console.error('❌ Usuário não identificado');
            return;
        }

        setSaving(true);
        
        try {
            console.log('💾 Salvando consentimentos para usuário:', user.email);
            
            // Preparar dados para envio
            const consentsToSave = [
                {
                    consent_type: 'marketing',
                    consent_given: consents.marketing,
                    purpose: 'Receber ofertas, promoções e novidades'
                },
                {
                    consent_type: 'analytics', 
                    consent_given: consents.analytics,
                    purpose: 'Análise de uso da plataforma para melhorar a experiência'
                },
                {
                    consent_type: 'cookies',
                    consent_given: true, // Sempre true (obrigatório)
                    purpose: 'Cookies necessários para o funcionamento da plataforma'
                },
                {
                    consent_type: 'data_processing',
                    consent_given: true, // Sempre true (obrigatório)
                    purpose: 'Processamento dos dados para prestação dos serviços'
                },
                {
                    consent_type: 'communication',
                    consent_given: consents.communication,
                    purpose: 'Receber notificações importantes sobre conta e serviços'
                },
                {
                    consent_type: 'third_party_sharing',
                    consent_given: consents.third_party,
                    purpose: 'Compartilhar dados com parceiros para melhorar os serviços'
                }
            ];

            // Enviar para API
            const response = await fetch('http://localhost:3001/api/consent-bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user.id,
                    consents: consentsToSave,
                    user_info: {
                        name: user.name,
                        email: user.email,
                        phone: user.phone
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log('✅ Consentimentos salvos com sucesso no banco!');
                    
                    // Feedback visual de sucesso
                    alert('✅ Consentimentos salvos com sucesso!');
                    
                    if (onComplete) {
                        onComplete();
                    }
                } else {
                    throw new Error(data.error || 'Erro ao salvar consentimentos');
                }
            } else {
                throw new Error('Erro na comunicação com servidor');
            }

        } catch (error) {
            console.error('❌ Erro ao salvar consentimentos:', error);
            alert('❌ Erro ao salvar consentimentos. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    const handleSkip = () => {
        const confirmSkip = confirm(
            '⚠️ Tem certeza que deseja pular os consentimentos?\n\n' +
            'Você pode configurá-los depois clicando no botão "🔒 Privacidade" no dashboard.'
        );
        
        if (confirmSkip) {
            console.log('⏭️ Consentimentos pulados');
            if (onSkip) {
                onSkip();
            }
        }
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingSection}>
                    <div style={styles.spinner}></div>
                    <h3 style={styles.loadingTitle}>🔒 Carregando Consentimentos</h3>
                    <p style={styles.loadingText}>Preparando suas opções de privacidade...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div style={styles.container}>
                <div style={styles.errorSection}>
                    <h3 style={styles.errorTitle}>🚫 Usuário não encontrado</h3>
                    <p style={styles.errorText}>Não foi possível carregar as informações do usuário</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* ✅ SEÇÃO 1: INFORMAÇÕES PESSOAIS (PRIMEIRO) */}
            <div style={styles.personalInfoSection}>
                <div style={styles.sectionHeader}>
                    <div style={styles.sectionIcon}>👤</div>
                    <h3 style={styles.sectionTitle}>Informações Pessoais</h3>
                </div>
                
                <div style={styles.userInfoCard}>
                    <div style={styles.userInfoGrid}>
                        <div style={styles.userInfoItem}>
                            <span style={styles.userInfoLabel}>Nome Completo</span>
                            <span style={styles.userInfoValue}>{user?.name || 'Não informado'}</span>
                        </div>
                        <div style={styles.userInfoItem}>
                            <span style={styles.userInfoLabel}>E-mail</span>
                            <span style={styles.userInfoValue}>{user?.email || 'Não informado'}</span>
                        </div>
                        <div style={styles.userInfoItem}>
                            <span style={styles.userInfoLabel}>Telefone</span>
                            <span style={styles.userInfoValue}>{user?.phone || '+47 75053 1630'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ✅ SEÇÃO 2: CARTÕES INFORMATIVOS - BANDEIRAS REAIS */}
            <div style={styles.infoCardsContainer}>
                <div 
                    style={styles.infoCard}
                    onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.12)';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 4px 16px rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    <div style={styles.cardIcon}>
                        <img 
                            src="/BR_flag.png" 
                            alt="Bandeira do Brasil" 
                            style={styles.flagImage}
                            onError={(e) => {
                                console.log('❌ Erro ao carregar bandeira Brasil:', e);
                                e.target.style.display = 'none';
                                e.target.parentNode.innerHTML = '🇧🇷';
                            }}
                        />
                    </div>
                    <h4 style={styles.cardTitle}>LGPD</h4>
                    <p style={styles.cardText}>
                        Compliance total com a Lei Geral de Proteção de Dados brasileira
                    </p>
                </div>
                
                <div 
                    style={styles.infoCard}
                    onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.12)';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 4px 16px rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    <div style={styles.cardIcon}>
                        <img 
                            src="/EU_flag.png" 
                            alt="Bandeira da União Europeia" 
                            style={styles.flagImage}
                            onError={(e) => {
                                console.log('❌ Erro ao carregar bandeira UE:', e);
                                e.target.style.display = 'none';
                                e.target.parentNode.innerHTML = '🇪🇺';
                            }}
                        />
                    </div>
                    <h4 style={styles.cardTitle}>GDPR</h4>
                    <p style={styles.cardText}>
                        Adequação completa ao regulamento europeu de proteção de dados
                    </p>
                </div>
                
                <div 
                    style={styles.infoCard}
                    onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.12)';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 4px 16px rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    <div style={styles.cardIcon}>⚡</div>
                    <h4 style={styles.cardTitle}>Rápido e Fácil</h4>
                    <p style={styles.cardText}>
                        Processo simplificado - todas as opções já vêm marcadas para sua conveniência
                    </p>
                </div>
            </div>

            {/* ✅ SEÇÃO 3: CONSENTIMENTOS - CHECKBOXES CORRIGIDOS */}
            <div style={styles.consentsSection}>
                <div style={styles.sectionHeader}>
                    <div style={styles.sectionIcon}>🔒</div>
                    <h3 style={styles.sectionTitle}>Seus Consentimentos</h3>
                    <p style={styles.sectionSubtitle}>Todas as opções já estão marcadas para sua conveniência. Desmarque apenas o que não desejar. Itens em cinza são obrigatórios.</p>
                </div>
                
                <div style={styles.consentsContainer}>
                    {/* Marketing e Comunicação - EDITÁVEL */}
                    <div 
                        style={styles.consentItem}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={styles.consentHeader}>
                            <input 
                                type="checkbox" 
                                checked={consents.marketing}
                                onChange={(e) => handleConsentChange('marketing', e.target.checked)}
                                className="consent-checkbox" 
                            />
                            <span style={styles.consentTitle}>📧 Marketing e Comunicação</span>
                        </div>
                        <p style={styles.consentDescription}>
                            Receber ofertas, promoções e novidades por email, SMS ou WhatsApp
                        </p>
                    </div>

                    {/* Analytics e Melhorias - EDITÁVEL */}
                    <div 
                        style={styles.consentItem}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={styles.consentHeader}>
                            <input 
                                type="checkbox" 
                                checked={consents.analytics}
                                onChange={(e) => handleConsentChange('analytics', e.target.checked)}
                                className="consent-checkbox" 
                            />
                            <span style={styles.consentTitle}>📊 Analytics e Melhorias</span>
                        </div>
                        <p style={styles.consentDescription}>
                            Análise de uso da plataforma para melhorar a experiência
                        </p>
                    </div>

                    {/* Cookies Funcionais - OBRIGATÓRIO (DISABLED) */}
                    <div 
                        style={styles.consentItem}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={styles.consentHeader}>
                            <input 
                                type="checkbox" 
                                checked={true}
                                disabled={true}
                                className="consent-checkbox" 
                            />
                            <span style={styles.consentTitle}>🍪 Cookies Funcionais*</span>
                        </div>
                        <p style={styles.consentDescription}>
                            Cookies necessários para o funcionamento da plataforma
                        </p>
                        <span style={styles.requiredLabel}>* Obrigatório para funcionamento</span>
                    </div>

                    {/* Processamento de Dados - OBRIGATÓRIO (DISABLED) */}
                    <div 
                        style={styles.consentItem}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={styles.consentHeader}>
                            <input 
                                type="checkbox" 
                                checked={true}
                                disabled={true}
                                className="consent-checkbox" 
                            />
                            <span style={styles.consentTitle}>⚙️ Processamento de Dados*</span>
                        </div>
                        <p style={styles.consentDescription}>
                            Processamento dos seus dados para prestação dos serviços
                        </p>
                        <span style={styles.requiredLabel}>* Obrigatório para funcionamento</span>
                    </div>

                    {/* Comunicação de Serviço - EDITÁVEL */}
                    <div 
                        style={styles.consentItem}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={styles.consentHeader}>
                            <input 
                                type="checkbox" 
                                checked={consents.communication}
                                onChange={(e) => handleConsentChange('communication', e.target.checked)}
                                className="consent-checkbox" 
                            />
                            <span style={styles.consentTitle}>📱 Comunicação de Serviço</span>
                        </div>
                        <p style={styles.consentDescription}>
                            Receber notificações importantes sobre sua conta e serviços
                        </p>
                    </div>

                    {/* Compartilhamento com Terceiros - EDITÁVEL */}
                    <div 
                        style={styles.consentItem}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={styles.consentHeader}>
                            <input 
                                type="checkbox" 
                                checked={consents.third_party}
                                onChange={(e) => handleConsentChange('third_party', e.target.checked)}
                                className="consent-checkbox" 
                            />
                            <span style={styles.consentTitle}>🤝 Compartilhamento com Terceiros</span>
                        </div>
                        <p style={styles.consentDescription}>
                            Compartilhar dados com parceiros para melhorar os serviços
                        </p>
                    </div>
                </div>
            </div>

            {/* ✅ SEÇÃO 4: AÇÕES - BOTÃO COM ESTADO DE LOADING */}
            <div style={styles.actionsSection}>
                <button 
                    onClick={handleComplete} 
                    disabled={saving}
                    style={{
                        ...styles.confirmButton,
                        ...(saving ? {
                            background: 'rgba(109, 74, 255, 0.6)',
                            cursor: 'not-allowed'
                        } : {})
                    }}
                    onMouseEnter={(e) => {
                        if (!saving) {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 8px 25px rgba(109, 74, 255, 0.4)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!saving) {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 12px rgba(109, 74, 255, 0.3)';
                        }
                    }}
                >
                    {saving ? '💾 Salvando...' : '✅ Confirmar e Continuar'}
                </button>
                <button 
                    onClick={handleSkip} 
                    disabled={saving}
                    style={{
                        ...styles.skipButton,
                        ...(saving ? {
                            opacity: 0.5,
                            cursor: 'not-allowed'
                        } : {})
                    }}
                    onMouseEnter={(e) => {
                        if (!saving) {
                            e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                            e.target.style.color = 'rgba(255, 255, 255, 0.95)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!saving) {
                            e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            e.target.style.color = 'rgba(255, 255, 255, 0.8)';
                        }
                    }}
                >
                    ⏭️ Pular por Agora
                </button>
                <p style={styles.helpText}>
                    Você pode alterar essas configurações a qualquer momento acessando esta seção novamente
                </p>
            </div>
        </div>
    );
};

// 🎨 ESTILOS PREMIUM ADAPTADOS PARA O DASHBOARD GLASSMORPHISM
const styles = {
    container: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '32px',
        padding: '8px 0'
    },
    
    // Loading States
    loadingSection: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '20px'
    },
    loadingTitle: {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: '20px',
        fontWeight: '600',
        margin: '0'
    },
    loadingText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '14px',
        margin: '0',
        textAlign: 'center' as const
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255, 255, 255, 0.2)',
        borderTop: '3px solid #6D4AFF',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    
    // Error States
    errorSection: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        gap: '16px'
    },
    errorTitle: {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: '18px',
        fontWeight: '600',
        margin: '0'
    },
    errorText: {
        color: 'rgba(255, 255, 255, 0.7)',
        margin: '0',
        textAlign: 'center' as const
    },

    // ✅ SEÇÃO 1: INFORMAÇÕES PESSOAIS
    personalInfoSection: {
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '16px',
        padding: '24px'
    },
    
    sectionHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px'
    },
    
    sectionIcon: {
        background: 'linear-gradient(135deg, #6D4AFF 0%, #00A693 100%)',
        borderRadius: '10px',
        padding: '8px',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '36px',
        minHeight: '36px'
    },
    
    sectionTitle: {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: '18px',
        fontWeight: '600',
        margin: '0',
        letterSpacing: '-0.01em'
    },
    
    sectionSubtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '14px',
        margin: '0',
        marginLeft: '48px'
    },
    
    userInfoCard: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '20px'
    },
    
    userInfoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
    },
    
    userInfoItem: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '4px'
    },
    
    userInfoLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '12px',
        fontWeight: '500',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em'
    },
    
    userInfoValue: {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: '14px',
        fontWeight: '600'
    },

    // ✅ SEÇÃO 2: INFO CARDS (MELHORADOS)
    infoCardsContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
    },
    infoCard: {
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center' as const,
        transition: 'all 0.3s ease'
    },
    cardIcon: {
        fontSize: '28px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '48px'
    },
    
    // Estilo para as imagens das bandeiras
    flagImage: {
        width: '36px',
        height: '24px',
        objectFit: 'cover',
        borderRadius: '2px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
    },
    cardTitle: {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: '14px',
        fontWeight: '600',
        margin: '0 0 8px 0'
    },
    cardText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '12px',
        lineHeight: '1.4',
        margin: '0'
    },

    // ✅ SEÇÃO 3: CONSENTIMENTOS (NOVO LAYOUT)
    consentsSection: {
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '16px',
        padding: '24px'
    },
    
    consentsContainer: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '20px'
    },
    
    consentItem: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        transition: 'all 0.3s ease'
    },
    
    consentHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '8px'
    },
    
    consentTitle: {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: '14px',
        fontWeight: '600',
        margin: '0'
    },
    
    consentDescription: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '13px',
        lineHeight: '1.4',
        margin: '0 0 4px 30px' // 18px checkbox + 12px gap = 30px
    },
    
    requiredLabel: {
        color: 'rgba(0, 166, 147, 0.8)',
        fontSize: '11px',
        fontWeight: '500',
        margin: '0 0 0 30px', // Alinhado com a descrição
        fontStyle: 'italic'
    },

    // ✅ SEÇÃO 4: AÇÕES (BOTÕES PREMIUM)
    actionsSection: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '16px',
        padding: '20px 0'
    },
    
    confirmButton: {
        background: 'linear-gradient(135deg, #6D4AFF 0%, #00A693 100%)', // ✨ MESMO GRADIENTE DO PRODUCTDASHBOARD
        border: 'none',
        borderRadius: '12px',
        padding: '14px 32px',
        color: 'white',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 12px rgba(109, 74, 255, 0.3)', // ✨ MESMA SOMBRA
        minWidth: '200px',
        letterSpacing: '-0.01em'
    },
    
    skipButton: {
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        padding: '12px 24px',
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
    },
    
    helpText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '12px',
        margin: '0',
        textAlign: 'center' as const,
        maxWidth: '400px',
        lineHeight: '1.4'
    }
};

export default ConsentFormDashboard;