import React, { useState, useEffect } from 'react';

// Componente Principal - Dashboard do Parceiro com design premium alinhado
const PartnerDashboard = ({ partnerId }) => {
    const [dashboardData, setDashboardData] = useState(null);
    const [recentReferrals, setRecentReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [affiliateLink, setAffiliateLink] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        loadDashboardData();
        generateAffiliateLink();
    }, [partnerId]);

    const loadDashboardData = async () => {
        try {
            // TODO: Substituir por chamada real da API
            const mockData = {
                id: partnerId,
                partner_code: 'PART12345',
                business_name: 'Consultoria Silva & Associados',
                commission_tier: 'silver',
                total_referrals: 25,
                total_conversions: 12,
                total_commission_earned: 1847.50,
                current_month_clicks: 89,
                current_month_registrations: 8,
                current_month_conversions: 5,
                pending_commissions: 485.00,
                confirmed_commissions: 1362.50,
                status: 'approved'
            };

            const mockReferrals = [
                {
                    id: 1,
                    referred_name: 'João Silva',
                    referred_email: 'joao@example.com',
                    status: 'subscribed',
                    commission_amount: 125.00,
                    created_at: '2024-06-20T10:00:00.000Z'
                },
                {
                    id: 2,
                    referred_name: 'Maria Santos',
                    referred_email: 'maria@example.com',
                    status: 'registered',
                    commission_amount: 0,
                    created_at: '2024-06-19T14:30:00.000Z'
                },
                {
                    id: 3,
                    referred_name: 'Pedro Costa',
                    referred_email: 'pedro@example.com',
                    status: 'clicked',
                    commission_amount: 0,
                    created_at: '2024-06-18T09:15:00.000Z'
                }
            ];

            setDashboardData(mockData);
            setRecentReferrals(mockReferrals);
            setLoading(false);
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            setLoading(false);
        }
    };

    const generateAffiliateLink = () => {
        const baseUrl = 'https://seucrm.com.br/registro';
        const code = 'PART12345';
        setAffiliateLink(`${baseUrl}?ref=${code}`);
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(affiliateLink);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Erro ao copiar:', err);
        }
    };

    const getStatusText = (status) => {
        const statusMap = {
            clicked: 'Clicou',
            registered: 'Registrou',
            subscribed: 'Assinante',
            cancelled: 'Cancelado'
        };
        return statusMap[status] || status;
    };

    const getStatusColor = (status) => {
        const colorMap = {
            clicked: '#6b7280',
            registered: '#f59e0b',
            subscribed: '#10b981',
            cancelled: '#ef4444'
        };
        return colorMap[status] || '#6b7280';
    };

    const getTierColor = (tier) => {
        const colors = {
            bronze: '#cd7f32',
            silver: '#c0c0c0',
            gold: '#ffd700'
        };
        return colors[tier] || '#6b7280';
    };

    const getTierIcon = (tier) => {
        const icons = {
            bronze: '🥉',
            silver: '🥈',
            gold: '🥇'
        };
        return icons[tier] || '🏆';
    };

    // Loading state
    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <style jsx global>{`
                    @keyframes spin { 
                        0% { transform: rotate(0deg); } 
                        100% { transform: rotate(360deg); } 
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>🤝 Dashboard do Parceiro</h1>
                    <p style={styles.subtitle}>
                        Bem-vindo, <strong>{dashboardData.business_name}</strong>
                    </p>
                </div>
                <div style={styles.headerInfo}>
                    <div style={{...styles.tierBadge, background: getTierColor(dashboardData.commission_tier)}}>
                        {getTierIcon(dashboardData.commission_tier)} {dashboardData.commission_tier.toUpperCase()}
                    </div>
                    {/* NOVO: Botão White Label */}
                    <button 
                        onClick={() => window.location.href = '/white-label'}
                        style={styles.whiteLabelButton}
                    >
                        🏷️ Configurar White Label
                    </button>
                </div>
            </div>

            {/* Cards de Métricas */}
            <div style={styles.metricsGrid}>
                <div style={styles.metricCard}>
                    <p style={styles.metricLabel}>TOTAL DE INDICAÇÕES</p>
                    <div style={styles.metricValue}>
                        <span>{dashboardData.total_referrals}</span>
                        <span style={styles.metricIcon}>👥</span>
                    </div>
                    <p style={styles.metricGrowth}>↗️ +{dashboardData.current_month_clicks} este mês</p>
                </div>

                <div style={styles.metricCard}>
                    <p style={styles.metricLabel}>CONVERSÕES</p>
                    <div style={styles.metricValue}>
                        <span>{dashboardData.total_conversions}</span>
                        <span style={styles.metricIcon}>🎯</span>
                    </div>
                    <p style={styles.metricGrowth}>↗️ +{dashboardData.current_month_conversions} este mês</p>
                </div>

                <div style={styles.metricCard}>
                    <p style={styles.metricLabel}>COMISSÃO TOTAL</p>
                    <div style={styles.metricValue}>
                        <span>R$ {dashboardData.total_commission_earned.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        <span style={styles.metricIcon}>💰</span>
                    </div>
                    <p style={styles.metricGrowth}>↗️ R$ {dashboardData.pending_commissions.toFixed(2)} pendente</p>
                </div>
            </div>

            {/* Layout de Duas Colunas */}
            <div style={styles.twoColumnLayout}>
                {/* Seção de Link de Afiliado */}
                <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                        <h3 style={styles.sectionTitle}>🔗 Seu Link de Afiliado</h3>
                    </div>
                    <div style={styles.sectionContent}>
                        <div style={styles.linkContainer}>
                            <input 
                                type="text" 
                                value={affiliateLink}
                                readOnly
                                style={styles.linkInput}
                            />
                            <button 
                                onClick={copyToClipboard}
                                style={styles.copyButton}
                            >
                                {copySuccess ? '✅ Copiado!' : '📋 Copiar'}
                            </button>
                        </div>
                        <p style={styles.linkDescription}>
                            Compartilhe este link para começar a receber comissões por cada assinatura gerada.
                        </p>
                        
                        {/* Métricas do Link */}
                        <div style={styles.linkMetrics}>
                            <div style={styles.linkMetricItem}>
                                <span style={styles.linkMetricValue}>{dashboardData.current_month_clicks}</span>
                                <span style={styles.linkMetricLabel}>Cliques este mês</span>
                            </div>
                            <div style={styles.linkMetricItem}>
                                <span style={styles.linkMetricValue}>{dashboardData.current_month_registrations}</span>
                                <span style={styles.linkMetricLabel}>Registros este mês</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seção de Indicações Recentes */}
                <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                        <h3 style={styles.sectionTitle}>📊 Indicações Recentes</h3>
                    </div>
                    <div style={styles.sectionContent}>
                        {recentReferrals.length > 0 ? (
                            <div style={styles.referralsList}>
                                {recentReferrals.map(referral => (
                                    <div key={referral.id} style={styles.referralItem}>
                                        <div style={styles.referralInfo}>
                                            <div>
                                                <p style={styles.referralName}>
                                                    {referral.referred_name || 'Nome não informado'}
                                                </p>
                                                <p style={styles.referralEmail}>{referral.referred_email}</p>
                                            </div>
                                        </div>
                                        <div style={styles.referralMeta}>
                                            <span 
                                                style={{
                                                    ...styles.statusBadge,
                                                    background: getStatusColor(referral.status),
                                                    color: 'white'
                                                }}
                                            >
                                                {getStatusText(referral.status)}
                                            </span>
                                            <p style={styles.referralDate}>
                                                {new Date(referral.created_at).toLocaleDateString('pt-BR')}
                                            </p>
                                            {referral.commission_amount > 0 && (
                                                <p style={styles.commissionAmount}>
                                                    R$ {referral.commission_amount.toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={styles.emptyState}>Nenhuma indicação ainda.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Seção de Resumo Financeiro */}
            <div style={styles.financialSummary}>
                <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                        <h3 style={styles.sectionTitle}>💳 Resumo Financeiro</h3>
                    </div>
                    <div style={styles.sectionContent}>
                        <div style={styles.financialGrid}>
                            <div style={styles.financialItem}>
                                <span style={styles.financialLabel}>Comissões Confirmadas</span>
                                <span style={{...styles.financialValue, color: '#10b981'}}>
                                    R$ {dashboardData.confirmed_commissions.toFixed(2)}
                                </span>
                            </div>
                            <div style={styles.financialItem}>
                                <span style={styles.financialLabel}>Comissões Pendentes</span>
                                <span style={{...styles.financialValue, color: '#f59e0b'}}>
                                    R$ {dashboardData.pending_commissions.toFixed(2)}
                                </span>
                            </div>
                            <div style={styles.financialItem}>
                                <span style={styles.financialLabel}>Taxa de Conversão</span>
                                <span style={styles.financialValue}>
                                    {((dashboardData.total_conversions / dashboardData.total_referrals) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Estilos Premium alinhados com o MultiChannelDashboard
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
        marginBottom: '24px' 
    },
    title: { 
        fontSize: '28px', 
        fontWeight: 'bold', 
        color: 'white', 
        textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        margin: 0
    },
    subtitle: {
        fontSize: '16px',
        color: 'rgba(255, 255, 255, 0.9)',
        margin: '4px 0 0 0'
    },
    headerInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    tierBadge: {
        padding: '8px 16px',
        borderRadius: '20px',
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold',
        textShadow: '0 1px 2px rgba(0,0,0,0.3)'
    },
    metricsGrid: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '24px', 
        marginBottom: '24px' 
    },
    twoColumnLayout: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '30px',
        marginBottom: '24px'
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
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
    },
    sectionHeader: { 
        padding: '20px 24px', 
        borderBottom: '1px solid #f3f4f6' 
    },
    sectionTitle: { 
        margin: 0, 
        fontSize: '18px', 
        fontWeight: '600', 
        color: '#111827' 
    },
    sectionContent: {
        padding: '24px'
    },
    linkContainer: {
        display: 'flex',
        gap: '12px',
        marginBottom: '16px'
    },
    linkInput: {
        flex: 1,
        padding: '12px 16px',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        fontSize: '14px',
        background: '#f9fafb'
    },
    copyButton: {
        padding: '12px 20px',
        background: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer'
    },
    linkDescription: {
        fontSize: '14px',
        color: '#6b7280',
        marginBottom: '20px',
        margin: '0 0 20px 0'
    },
    linkMetrics: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px'
    },
    linkMetricItem: {
        textAlign: 'center',
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '12px'
    },
    linkMetricValue: {
        display: 'block',
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#111827'
    },
    linkMetricLabel: {
        fontSize: '12px',
        color: '#6b7280',
        textTransform: 'uppercase',
        fontWeight: '500'
    },
    referralsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    referralItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #f3f4f6'
    },
    referralInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    referralName: {
        margin: 0,
        fontWeight: '600',
        color: '#111827'
    },
    referralEmail: {
        margin: 0,
        fontSize: '14px',
        color: '#6b7280'
    },
    referralMeta: {
        textAlign: 'right',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '4px'
    },
    statusBadge: {
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold'
    },
    referralDate: {
        fontSize: '12px',
        color: '#9ca3af',
        margin: 0
    },
    commissionAmount: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#10b981',
        margin: 0
    },
    financialSummary: {
        width: '100%'
    },
    financialGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
    },
    financialItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        background: '#f9fafb',
        borderRadius: '12px',
        textAlign: 'center'
    },
    financialLabel: {
        fontSize: '14px',
        color: '#6b7280',
        marginBottom: '8px',
        fontWeight: '500'
    },
    financialValue: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#111827'
    },
    emptyState: { 
        padding: '50px', 
        textAlign: 'center', 
        color: '#9ca3af',
        margin: 0
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
        width: '50px', 
        height: '50px', 
        border: '5px solid rgba(255, 255, 255, 0.3)', 
        borderTopColor: '#fff', 
        borderRadius: '50%', 
        animation: 'spin 1s linear infinite' 
    },
    // NOVO: Estilo do botão White Label
    whiteLabelButton: {
        padding: '12px 20px',
        background: 'rgba(255, 255, 255, 0.2)',
        color: 'white',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.2s ease',
        marginLeft: '16px'
    }
};

export default PartnerDashboard;