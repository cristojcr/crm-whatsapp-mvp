import React, { useState } from 'react';

// Ícones para cada canal (Componente Visual)
const ChannelIcon = ({ type }) => {
    const icons = {
        whatsapp: '📱',
        instagram: '📸',
        telegram: '✈️'
    };
    return <span style={{ fontSize: '20px', lineHeight: 1 }}>{icons[type] || '💬'}</span>;
};

// Componente Principal - Recebe dados via props e tem o design premium
const MultiChannelDashboard = ({ channels = [], loading = false }) => {

    const [selectedChannel, setSelectedChannel] = useState('all');

    // Nomes e Cores para cada canal
    const getChannelName = (type) => ({ whatsapp: 'WhatsApp', instagram: 'Instagram', telegram: 'Telegram' }[type] || type);
    const getChannelColor = (type) => ({ whatsapp: '#25D366', instagram: '#E1306C', telegram: '#0088CC' }[type] || '#6c757d');

    // Dados simulados para as métricas e conversas (a lógica de busca real virá do componente pai)
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
    
    // Mostra um spinner elegante enquanto o pai carrega os dados
    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                 <style jsx global>{`
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header com Dropdown */}
            <div style={styles.header}>
                <h1 style={styles.title}>🚀 Dashboard Multicanal</h1>
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
            </div>

            {/* Cards de Métricas */}
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
                    <div style={styles.sectionHeader}><h3 style={styles.sectionTitle}>🌐 Canais Configurados</h3></div>
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
        </div>
    );
};

// Estilos Premium baseados no admin-dashboard.html
const styles = {
    container: { 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
        padding: '24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh'
    },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '28px', fontWeight: 'bold', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.1)' },
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
    metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' },
    twoColumnLayout: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' },
    metricCard: { 
        background: 'rgba(255, 255, 255, 0.95)', 
        padding: '24px', 
        borderRadius: '20px', 
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
    },
    metricLabel: { fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', marginBottom: '12px' },
    metricValue: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '36px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' },
    metricIcon: { fontSize: '24px', color: '#9ca3af' },
    metricGrowth: { fontSize: '13px', color: '#10b981', fontWeight: '500' },
    sectionCard: { 
        background: 'rgba(255, 255, 255, 0.95)', 
        borderRadius: '20px', 
        marginBottom: '24px', 
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
    },
    sectionHeader: { padding: '20px 24px', borderBottom: '1px solid #f3f4f6' },
    sectionTitle: { margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' },
    channelsGrid: { display: 'flex', flexDirection: 'column', gap: '15px', padding: '24px' },
    channelCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f9fafb', borderRadius: '14px', border: '1px solid #f3f4f6' },
    channelInfo: { display: 'flex', alignItems: 'center', gap: '14px' },
    channelIconContainer: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' },
    channelName: { margin: 0, fontWeight: '600', color: '#1f2937' },
    channelStatus: { margin: 0, fontSize: '13px', color: '#6b7280' },
    statusIndicator: { width: '10px', height: '10px', borderRadius: '50%', boxShadow: '0 0 8px 1px' },
    conversationItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #f3f4f6' },
    conversationInfo: { display: 'flex', alignItems: 'center', gap: '16px' },
    conversationName: { margin: 0, fontWeight: '600' },
    conversationMessage: { margin: 0, fontSize: '14px', color: '#6b7280' },
    conversationMeta: { textAlign: 'right' },
    conversationDate: { fontSize: '12px', color: '#9ca3af', marginBottom: '4px' },
    unreadBadge: { background: '#3b82f6', color: 'white', fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '12px' },
    emptyState: { padding: '50px', textAlign: 'center', color: '#9ca3af' },
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
};

export default MultiChannelDashboard;