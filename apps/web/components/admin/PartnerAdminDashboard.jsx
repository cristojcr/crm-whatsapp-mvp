import React, { useState, useEffect } from 'react';
import PartnerSettings from './PartnerSettings';
import DataProtectionDashboard from './DataProtectionDashboard';

// Ícones (simulados já que não temos lucide-react no ambiente)
const IconComponent = ({ type, size = "16px" }) => {
    const icons = {
        users: '👥',
        dollarSign: '💰',
        trendingUp: '📈',
        clock: '⏰',
        checkCircle: '✅',
        xCircle: '❌',
        settings: '⚙️',
        download: '📥',
        filter: '🔍',
        search: '🔍',
        eye: '👁️',
        edit: '✏️',
        moreVertical: '⋮'
    };
    
    return (
        <span style={{ 
            fontSize: size, 
            lineHeight: 1, 
            display: 'inline-block',
            width: size,
            textAlign: 'center'
        }}>
            {icons[type] || '📋'}
        </span>
    );
};

const PartnerAdminDashboard = () => {
    const [partners, setPartners] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'all',
        business_type: 'all',
        search: ''
    });
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showDataProtection, setShowDataProtection] = useState(false);

    useEffect(() => {
        loadAdminData();
    }, [filters]);

    const loadAdminData = async () => {
        try {
            // Mock data para demonstração
            const mockSummary = {
                total_partners: 156,
                approved_partners: 124,
                pending_partners: 32,
                total_referrals: 2847,
                total_conversions: 1423,
                total_commissions_paid: 48750.00,
                pending_commissions: 12340.00,
                avg_conversion_rate: 49.9,
                top_performers: 23
            };

            const mockPartners = [
                {
                    id: 1,
                    business_name: 'Consultoria Silva & Associados',
                    contact_person: 'João Silva',
                    email: 'joao@silva.com.br',
                    business_type: 'contador',
                    status: 'approved',
                    total_referrals: 45,
                    total_conversions: 23,
                    total_commission_earned: 2875.00,
                    commission_tier: 'gold',
                    created_at: '2024-05-15T10:00:00.000Z'
                },
                {
                    id: 2,
                    business_name: 'Associação dos Contadores RS',
                    contact_person: 'Maria Santos',
                    email: 'maria@contadores-rs.org.br',
                    business_type: 'associacao',
                    status: 'pending',
                    total_referrals: 12,
                    total_conversions: 5,
                    total_commission_earned: 625.00,
                    commission_tier: 'silver',
                    created_at: '2024-06-18T14:30:00.000Z'
                },
                {
                    id: 3,
                    business_name: 'Freelancer Pedro Costa',
                    contact_person: 'Pedro Costa',
                    email: 'pedro@costa.com',
                    business_type: 'consultor',
                    status: 'approved',
                    total_referrals: 18,
                    total_conversions: 9,
                    total_commission_earned: 1125.00,
                    commission_tier: 'bronze',
                    created_at: '2024-06-10T09:15:00.000Z'
                }
            ];

            setSummary(mockSummary);
            setPartners(mockPartners);
            setLoading(false);
        } catch (error) {
            console.error('Erro ao carregar dados admin:', error);
            setLoading(false);
        }
    };

    const handleApprovePartner = async (partnerId, action) => {
        try {
            // TODO: Implementar chamada da API
            console.log(`${action} partner ${partnerId}`);
            
            // Atualizar estado local
            setPartners(partners.map(partner => 
                partner.id === partnerId 
                    ? { ...partner, status: action === 'approve' ? 'approved' : 'rejected' }
                    : partner
            ));
        } catch (error) {
            console.error('Erro ao atualizar parceiro:', error);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            approved: '#10b981',
            pending: '#f59e0b',
            rejected: '#ef4444',
            suspended: '#6b7280'
        };
        return colors[status] || '#6b7280';
    };

    const getStatusText = (status) => {
        const texts = {
            approved: 'Aprovado',
            pending: 'Pendente',
            rejected: 'Rejeitado',
            suspended: 'Suspenso'
        };
        return texts[status] || status;
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

    const filteredPartners = partners.filter(partner => {
        const statusMatch = filters.status === 'all' || partner.status === filters.status;
        const typeMatch = filters.business_type === 'all' || partner.business_type === filters.business_type;
        const searchMatch = !filters.search || 
            partner.business_name.toLowerCase().includes(filters.search.toLowerCase()) ||
            partner.contact_person.toLowerCase().includes(filters.search.toLowerCase()) ||
            partner.email.toLowerCase().includes(filters.search.toLowerCase());
        
        return statusMatch && typeMatch && searchMatch;
    });

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
                    <h1 style={styles.title}>⚙️ Dashboard Administrativo</h1>
                    <p style={styles.subtitle}>Gestão de Parceiros e Sistema de Referências</p>
                </div>
                <div style={styles.headerActions}>
                    <button style={styles.headerButton}>
                        <IconComponent type="download" size="16px" />
                        <span>Exportar</span>
                    </button>
                    
                    <button 
                        onClick={() => {
                            // Abrir white label em nova aba
                            const whiteLabelUrl = window.location.origin + '/admin/white-label';
                            window.open(whiteLabelUrl, '_blank');
                        }}
                        style={{
                            ...styles.headerButton, 
                            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', 
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}
                        title="Configurar White Label"
                    >
                        <span>🎨</span>
                        <span>White Label</span>
                    </button>

                    <button 
                        onClick={() => setShowDataProtection(true)}
                        style={{
                            ...styles.headerButton, 
                            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', 
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}
                        title="Sistema de Proteção de Dados LGPD/GDPR"
                    >
                        <span>🔒</span>
                        <span>Data Protection</span>
                    </button>
                    
                    <button 
                        onClick={() => setShowSettings(true)}
                        style={styles.headerButton}
                    >
                        <IconComponent type="settings" size="16px" />
                        <span>Configurações</span>
                    </button>
                </div>
            </div>

            {/* Cards de Métricas Resumo */}
            <div style={styles.metricsGrid}>
                <div style={styles.metricCard}>
                    <p style={styles.metricLabel}>TOTAL DE PARCEIROS</p>
                    <div style={styles.metricValue}>
                        <span>{summary.total_partners}</span>
                        <IconComponent type="users" size="24px" />
                    </div>
                    <p style={styles.metricGrowth}>
                        {summary.approved_partners} aprovados • {summary.pending_partners} pendentes
                    </p>
                </div>

                <div style={styles.metricCard}>
                    <p style={styles.metricLabel}>TOTAL DE INDICAÇÕES</p>
                    <div style={styles.metricValue}>
                        <span>{summary.total_referrals.toLocaleString('pt-BR')}</span>
                        <IconComponent type="trendingUp" size="24px" />
                    </div>
                    <p style={styles.metricGrowth}>
                        {summary.total_conversions} conversões ({summary.avg_conversion_rate}%)
                    </p>
                </div>

                <div style={styles.metricCard}>
                    <p style={styles.metricLabel}>COMISSÕES TOTAIS</p>
                    <div style={styles.metricValue}>
                        <span>R$ {summary.total_commissions_paid.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        <IconComponent type="dollarSign" size="24px" />
                    </div>
                    <p style={styles.metricGrowth}>
                        R$ {summary.pending_commissions.toLocaleString('pt-BR', {minimumFractionDigits: 2})} pendentes
                    </p>
                </div>
            </div>

            {/* Filtros e Busca */}
            <div style={styles.filtersCard}>
                <div style={styles.filtersHeader}>
                    <h3 style={styles.filtersTitle}>
                        <IconComponent type="filter" size="18px" />
                        Filtros e Busca
                    </h3>
                </div>
                <div style={styles.filtersContent}>
                    <div style={styles.filtersRow}>
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Status:</label>
                            <select 
                                style={styles.filterSelect}
                                value={filters.status}
                                onChange={(e) => setFilters({...filters, status: e.target.value})}
                            >
                                <option value="all">Todos</option>
                                <option value="approved">Aprovados</option>
                                <option value="pending">Pendentes</option>
                                <option value="rejected">Rejeitados</option>
                                <option value="suspended">Suspensos</option>
                            </select>
                        </div>
                        
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Tipo:</label>
                            <select 
                                style={styles.filterSelect}
                                value={filters.business_type}
                                onChange={(e) => setFilters({...filters, business_type: e.target.value})}
                            >
                                <option value="all">Todos</option>
                                <option value="contador">Contador</option>
                                <option value="associacao">Associação</option>
                                <option value="consultor">Consultor</option>
                            </select>
                        </div>
                        
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Buscar:</label>
                            <input 
                                type="text"
                                style={styles.searchInput}
                                placeholder="Nome, email ou empresa..."
                                value={filters.search}
                                onChange={(e) => setFilters({...filters, search: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de Parceiros */}
            <div style={styles.partnersCard}>
                <div style={styles.partnersHeader}>
                    <h3 style={styles.partnersTitle}>
                        👥 Parceiros ({filteredPartners.length})
                    </h3>
                </div>
                <div style={styles.partnersContent}>
                    {filteredPartners.length > 0 ? (
                        <div style={styles.partnersList}>
                            {filteredPartners.map(partner => (
                                <div key={partner.id} style={styles.partnerItem}>
                                    <div style={styles.partnerMainInfo}>
                                        <div style={styles.partnerDetails}>
                                            <div style={styles.partnerHeader}>
                                                <h4 style={styles.partnerName}>{partner.business_name}</h4>
                                                <div style={styles.partnerBadges}>
                                                    <span style={{...styles.tierBadge, background: getTierColor(partner.commission_tier)}}>
                                                        {getTierIcon(partner.commission_tier)}
                                                    </span>
                                                    <span 
                                                        style={{
                                                            ...styles.statusBadge,
                                                            background: getStatusColor(partner.status)
                                                        }}
                                                    >
                                                        {getStatusText(partner.status)}
                                                    </span>
                                                </div>
                                            </div>
                                            <p style={styles.partnerContact}>
                                                {partner.contact_person} • {partner.email}
                                            </p>
                                            <p style={styles.partnerType}>
                                                {partner.business_type} • Criado em {new Date(partner.created_at).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                        
                                        <div style={styles.partnerMetrics}>
                                            <div style={styles.partnerMetric}>
                                                <span style={styles.metricNumber}>{partner.total_referrals}</span>
                                                <span style={styles.metricText}>Indicações</span>
                                            </div>
                                            <div style={styles.partnerMetric}>
                                                <span style={styles.metricNumber}>{partner.total_conversions}</span>
                                                <span style={styles.metricText}>Conversões</span>
                                            </div>
                                            <div style={styles.partnerMetric}>
                                                <span style={styles.metricNumber}>
                                                    R$ {partner.total_commission_earned.toFixed(0)}
                                                </span>
                                                <span style={styles.metricText}>Comissões</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={styles.partnerActions}>
                                        <button 
                                            style={styles.actionButton}
                                            title="Visualizar"
                                        >
                                            <IconComponent type="eye" size="16px" />
                                        </button>
                                        
                                        {partner.status === 'pending' && (
                                            <>
                                                <button 
                                                    style={{...styles.actionButton, ...styles.approveButton}}
                                                    onClick={() => handleApprovePartner(partner.id, 'approve')}
                                                    title="Aprovar"
                                                >
                                                    <IconComponent type="checkCircle" size="16px" />
                                                </button>
                                                <button 
                                                    style={{...styles.actionButton, ...styles.rejectButton}}
                                                    onClick={() => handleApprovePartner(partner.id, 'reject')}
                                                    title="Rejeitar"
                                                >
                                                    <IconComponent type="xCircle" size="16px" />
                                                </button>
                                            </>
                                        )}
                                        
                                        <button 
                                            style={styles.actionButton}
                                            title="Mais opções"
                                        >
                                            <IconComponent type="moreVertical" size="16px" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={styles.emptyState}>
                            Nenhum parceiro encontrado com os filtros aplicados.
                        </p>
                    )}
                </div>
            </div>

            {/* Modal de Configurações */}
            {showSettings && (
                <div style={styles.modal}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <button 
                                onClick={() => setShowSettings(false)}
                                style={styles.closeButton}
                                title="Fechar"
                            >
                                ×
                            </button>
                        </div>
                        <div style={styles.modalScrollArea}>
                            <PartnerSettings />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Data Protection */}
            {showDataProtection && (
                <div style={styles.modal}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <button 
                                onClick={() => setShowDataProtection(false)}
                                style={styles.closeButton}
                                title="Fechar"
                            >
                                ×
                            </button>
                        </div>
                        <div style={styles.modalScrollArea}>
                            <DataProtectionDashboard />
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
};

// Estilos Premium alinhados com o design do MultiChannelDashboard
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
    headerActions: {
        display: 'flex',
        gap: '12px'
    },
    headerButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        background: 'rgba(255, 255, 255, 0.9)',
        border: 'none',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        color: '#667eea'
    },
    metricsGrid: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '24px', 
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
    metricGrowth: { 
        fontSize: '13px', 
        color: '#6b7280', 
        fontWeight: '500',
        margin: 0
    },
    filtersCard: { 
        background: 'rgba(255, 255, 255, 0.95)', 
        borderRadius: '20px', 
        marginBottom: '24px', 
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
    },
    filtersHeader: { 
        padding: '20px 24px', 
        borderBottom: '1px solid #f3f4f6' 
    },
    filtersTitle: { 
        margin: 0, 
        fontSize: '18px', 
        fontWeight: '600', 
        color: '#111827',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    filtersContent: {
        padding: '24px'
    },
    filtersRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
    },
    filterGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    filterLabel: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#374151'
    },
    filterSelect: {
        padding: '10px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '14px',
        background: 'white'
    },
    searchInput: {
        padding: '10px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '14px'
    },
    partnersCard: { 
        background: 'rgba(255, 255, 255, 0.95)', 
        borderRadius: '20px', 
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
    },
    partnersHeader: { 
        padding: '20px 24px', 
        borderBottom: '1px solid #f3f4f6' 
    },
    partnersTitle: { 
        margin: 0, 
        fontSize: '18px', 
        fontWeight: '600', 
        color: '#111827' 
    },
    partnersContent: {
        padding: '24px'
    },
    partnersList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    partnerItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        background: '#f9fafb',
        borderRadius: '16px',
        border: '1px solid #f3f4f6'
    },
    partnerMainInfo: {
        display: 'flex',
        alignItems: 'center',
        flex: 1,
        gap: '24px'
    },
    partnerDetails: {
        flex: 1
    },
    partnerHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
    },
    partnerName: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '600',
        color: '#111827'
    },
    partnerBadges: {
        display: 'flex',
        gap: '8px'
    },
    tierBadge: {
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: 'white'
    },
    statusBadge: {
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
        color: 'white'
    },
    partnerContact: {
        margin: '0 0 4px 0',
        fontSize: '14px',
        color: '#6b7280'
    },
    partnerType: {
        margin: 0,
        fontSize: '13px',
        color: '#9ca3af',
        textTransform: 'capitalize'
    },
    partnerMetrics: {
        display: 'flex',
        gap: '24px'
    },
    partnerMetric: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
    },
    metricNumber: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#111827'
    },
    metricText: {
        fontSize: '11px',
        color: '#6b7280',
        textTransform: 'uppercase',
        fontWeight: '500'
    },
    partnerActions: {
        display: 'flex',
        gap: '8px'
    },
    actionButton: {
        padding: '8px',
        background: '#f3f4f6',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280'
    },
    approveButton: {
        background: '#dcfce7',
        color: '#16a34a'
    },
    rejectButton: {
        background: '#fee2e2',
        color: '#dc2626'
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
    modal: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px'
    },
    modalContent: {
        background: 'white',
        borderRadius: '24px',
        width: '95%',
        maxWidth: '1200px',
        height: '90vh',
        position: 'relative',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
    },
    modalScrollArea: {
        flex: 1,
        overflow: 'auto',
        padding: '60px 30px 30px 30px'
    },
    modalHeader: {
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 1001
    },
    closeButton: {
        width: '32px',
        height: '32px',
        background: 'rgba(239, 68, 68, 0.1)',
        color: '#ef4444',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '50%',
        cursor: 'pointer',
        fontSize: '18px',
        fontWeight: 'normal',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        padding: 0
    }
};

export default PartnerAdminDashboard;