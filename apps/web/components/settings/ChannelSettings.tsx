import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Ícone para cada canal (Componente Visual)
const ChannelIcon = ({ type }) => {
    const icons = {
        whatsapp: '📱',
        instagram: '📸',
        telegram: '✈️'
    };
    return <span style={{ fontSize: '20px' }}>{icons[type] || '💬'}</span>;
};

// Componente Principal
const ChannelSettings = ({ initialChannels, onUpdate, userId, userPlan = 'premium' }) => {
    // Estados do componente
    const [channels, setChannels] = useState(initialChannels); // <-- MUDANÇA AQUI
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [config, setConfig] = useState({});
    const [connectingInstagram, setConnectingInstagram] = useState(false);

// ✅ NOVO useEffect para sincronizar com o pai
    useEffect(() => {
        setChannels(initialChannels);
        if (initialChannels.length > 0 && !selectedChannel) {
            handleChannelSelect(initialChannels[0]);
        }
        setLoading(false);
    }, [initialChannels]);

    // Funções de manipulação de estado e API
    const handleChannelSelect = (channel) => {
        setSelectedChannel(channel);
        setConfig(channel.channel_config || {});
    };

    const handleConfigChange = (e) => {
        setConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        if (!selectedChannel) return;
        setSaving(true);
        
        // Salvar no Supabase (código existente)
        const { error } = await supabase
            .from('user_channels')
            .update({ channel_config: config, updated_at: new Date().toISOString() })
            .eq('id', selectedChannel.id);

        if (error) {
            alert("Erro ao salvar: " + error.message);
        } else {
            // 🆕 CONFIGURAR WEBHOOK AUTOMATICAMENTE
            if (selectedChannel.channel_type === 'telegram' && config.bot_token) {
                try {
                    console.log('🔗 Configurando webhook Telegram...');
                    
                    const webhookResponse = await fetch('http://localhost:3001/api/telegram/setup-webhook', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            bot_token: config.bot_token,
                            user_id: userId
                        })
                    });

                    if (webhookResponse.ok) {
                        console.log('✅ Webhook configurado com sucesso!');
                    } else {
                        console.warn('⚠️ Erro configurando webhook');
                    }
                } catch (error) {
                    console.error('❌ Erro no webhook:', error);
                }
            }
            
            // Restante do código existente...
            const updatedChannels = channels.map(ch => 
                ch.id === selectedChannel.id ? { ...ch, channel_config: config } : ch
            );
            setChannels(updatedChannels);
            showSuccessAnimation();
        }
        setSaving(false);
    };

    const handleToggleChannel = async (channelId, currentStatus) => {
            const updatedChannels = channels.map(ch =>
                ch.id === channelId ? { ...ch, is_active: !currentStatus } : ch
            );
            setChannels(updatedChannels);
            onUpdate(updatedChannels); // <-- ✅ ADICIONE ESTA LINHA PARA AVISAR O PAI

        const { error } = await supabase
            .from('user_channels')
            .update({ is_active: !currentStatus })
            .eq('id', channelId);

        if (error) {
            alert("Erro ao atualizar status. Revertendo.");
            setChannels(channels); // Reverte a UI
        }
    };
    
    const showSuccessAnimation = () => {
        const successEl = document.getElementById('success-animation');
        if (successEl) {
            successEl.style.display = 'block';
            setTimeout(() => { successEl.style.display = 'none'; }, 2000);
        }
    };
    // Função para conectar Instagram automaticamente
    const handleInstagramConnect = () => {
        setConnectingInstagram(true);
        
        const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
            `client_id=${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}&` +
            `redirect_uri=${encodeURIComponent('http://localhost:3002/auth/instagram/callback')}&` +
            `scope=instagram_basic,pages_read_engagement,pages_manage_metadata&` +
            `response_type=code&` +
            `state=${userId}`;
        
        const popup = window.open(
            authUrl,
            'instagram-auth',
            'width=500,height=600,scrollbars=yes,resizable=yes'
        );
        
        // Listener para o retorno do popup
        const messageListener = (event) => {
            if (event.data.type === 'instagram_auth_success') {
                setConnectingInstagram(false);
                
                // Atualizar configuração com dados recebidos
                setConfig(prev => ({
                    ...prev,
                    instagram_user_id: event.data.data.user_id,
                    username: event.data.data.username,
                    connected_via_oauth: true
                }));
                
                // Atualizar lista de canais
                if (onUpdate) {
                    const updatedChannels = channels.map(ch =>
                        ch.id === selectedChannel.id 
                            ? { ...ch, is_active: true, channel_config: config }
                            : ch
                    );
                    onUpdate(updatedChannels);
                }
                
                showSuccessAnimation();
                popup.close();
                window.removeEventListener('message', messageListener);
            }
        };
        
        window.addEventListener('message', messageListener);
        
        // Timeout para fechar popup se demorar muito
        setTimeout(() => {
            if (popup && !popup.closed) {
                popup.close();
                setConnectingInstagram(false);
            }
            window.removeEventListener('message', messageListener);
        }, 300000); // 5 minutos
    };
    
    // Nomes e Cores para cada canal
    const getChannelName = (type) => ({ whatsapp: 'WhatsApp', instagram: 'Instagram', telegram: 'Telegram' }[type] || type);
    const getChannelColor = (type) => ({ whatsapp: '#25D366', instagram: '#E1306C', telegram: '#0088CC' }[type] || '#6c757d');
    
    // ✅ REINCORPORADO: A lógica completa dos formulários
    const renderChannelSpecificConfig = () => {
        if (!selectedChannel) {
            return (
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>⚙️</div>
                    <p style={styles.emptyText}>Selecione um canal à esquerda para configurar suas credenciais.</p>
                </div>
            );
        }

        const { channel_type } = selectedChannel;
        
        switch (channel_type) {
            case 'whatsapp':
                return (
                    <>
                        <div style={styles.fieldContainer}>
                            <label style={styles.label}>Business Account ID</label>
                            <input 
                                style={styles.input} 
                                type="text" 
                                name="business_account_id" 
                                value={config.business_account_id || ''} 
                                onChange={handleConfigChange} 
                                placeholder="Ex: 123456789012345"
                            />
                        </div>
                        <div style={styles.fieldContainer}>
                            <label style={styles.label}>Access Token</label>
                            <input 
                                style={styles.input} 
                                type="password" 
                                name="access_token" 
                                value={config.access_token || ''} 
                                onChange={handleConfigChange} 
                                placeholder="Token que começa com EAAB..."
                            />
                        </div>
                        <div style={styles.fieldContainer}>
                            <label style={styles.label}>Phone Number ID</label>
                            <input 
                                style={styles.input} 
                                type="text" 
                                name="phone_number_id" 
                                value={config.phone_number_id || ''} 
                                onChange={handleConfigChange} 
                                placeholder="ID do número de telefone"
                            />
                        </div>
                         <div style={styles.fieldContainer}>
                            <label style={styles.label}>🔗 Webhook URL (Somente Leitura)</label>
                            <input 
                                style={styles.webhookInput} 
                                type="text" 
                                value={`https://api.seucrm.com/api/webhook/whatsapp/${userId}`} 
                                readOnly
                            />
                             <p style={styles.helpText}>Configure esta URL no seu Meta Business Manager.</p>
                        </div>
                    </>
                );
            case 'instagram':
                return (
                    <>
                        {/* Botão de conexão automática */}
                        <div style={styles.autoConnectSection}>
                            <h4 style={styles.autoConnectTitle}>🚀 Conexão Automática (Recomendado)</h4>
                            <button
                                onClick={handleInstagramConnect}
                                disabled={connectingInstagram}
                                style={{
                                    ...styles.connectButton,
                                    ...(connectingInstagram ? styles.connectButtonLoading : {})
                                }}
                            >
                                {connectingInstagram ? (
                                    <>
                                        <div style={styles.spinner}></div>
                                        Conectando...
                                    </>
                                ) : (
                                    <>📸 Conectar Instagram</>
                                )}
                            </button>
                            <p style={styles.helpText}>
                                Clique para autorizar via Facebook e conectar automaticamente.
                            </p>
                        </div>

                        {/* Configuração manual (recolhida) */}
                        <details style={styles.manualConfig}>
                            <summary style={styles.manualSummary}>⚙️ Configuração Manual (Avançado)</summary>
                            <div style={styles.manualFields}>
                                <div style={styles.fieldContainer}>
                                    <label style={styles.label}>Business Account ID</label>
                                    <input 
                                        style={styles.input} 
                                        type="text" 
                                        name="business_account_id" 
                                        value={config.business_account_id || ''} 
                                        onChange={handleConfigChange} 
                                        placeholder="Ex: 17841405793..."
                                    />
                                </div>
                                <div style={styles.fieldContainer}>
                                    <label style={styles.label}>Access Token</label>
                                    <input 
                                        style={styles.input} 
                                        type="password" 
                                        name="access_token" 
                                        value={config.access_token || ''} 
                                        onChange={handleConfigChange} 
                                        placeholder="Token do Instagram Business API"
                                    />
                                </div>
                                <div style={styles.fieldContainer}>
                                    <label style={styles.label}>🔗 Webhook URL (Somente Leitura)</label>
                                    <input 
                                        style={styles.webhookInput} 
                                        type="text" 
                                        value={`https://api.seucrm.com/api/webhook/instagram/${userId}`} 
                                        readOnly
                                    />
                                    <p style={styles.helpText}>Configure esta URL no seu App do Facebook.</p>
                                </div>
                            </div>
                        </details>
                    </>
                );
            case 'telegram':
                return (
                    <>
                        <div style={styles.fieldContainer}>
                            <label style={styles.label}>Bot Token</label>
                            <input 
                                style={styles.input} 
                                type="password" 
                                name="bot_token" 
                                value={config.bot_token || ''} 
                                onChange={handleConfigChange} 
                                placeholder="Token obtido do @BotFather"
                            />
                        </div>
                        <div style={styles.fieldContainer}>
                            <label style={styles.label}>Bot Username</label>
                            <input 
                                style={styles.input} 
                                type="text" 
                                name="bot_username" 
                                value={config.bot_username || ''} 
                                onChange={handleConfigChange} 
                                placeholder="Ex: @minha_clinica_bot"
                            />
                        </div>
                         <div style={styles.fieldContainer}>
                            <label style={styles.label}>🔗 Webhook URL (Somente Leitura)</label>
                            <input 
                                style={styles.webhookInput} 
                                type="text" 
                                value={`https://api.seucrm.com/api/webhook/telegram/${userId}`} 
                                readOnly
                            />
                            <p style={styles.helpText}>Esta URL é configurada automaticamente.</p>
                        </div>
                    </>
                );
            default:
                return <p style={styles.emptyText}>Configurações para este canal não disponíveis.</p>;
        }
    };
    
    // Renderização do Componente
    return (
        <div style={styles.container}>
            <div id="success-animation" style={styles.successAnimation}>
                <span style={styles.successIcon}>✅</span>
                <span>Salvo com Sucesso!</span>
            </div>
            
            {/* Header igual ao Dashboard */}
            <div style={styles.pageHeader}>
                <h1 style={styles.pageTitle}>🚀 Dashboard Multicanal</h1>
                <div style={styles.headerInfo}>
                    <span style={styles.channelCount}>
                        {channels.length} {channels.length === 1 ? 'canal' : 'canais'} configurado{channels.length === 1 ? '' : 's'}
                    </span>
                </div>
            </div>
            
            {/* Layout dos boxes */}
            <div style={styles.contentLayout}>
                {/* Sidebar */}
            <div style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                    <h3 style={styles.sidebarTitle}>🌐 Meus Canais</h3>
                </div>
                <div style={styles.channelsList}>
                    {loading && <p style={styles.loadingText}>Carregando...</p>}
                    {!loading && channels.length === 0 && (
                         <div style={styles.emptySidebar}>
                            <span style={styles.emptyIcon}>🔌</span>
                            <p style={styles.emptyText}>Nenhum canal configurado</p>
                        </div>
                    )}
                    {channels.map(channel => (
                        <div key={channel.id} 
                             style={selectedChannel?.id === channel.id ? styles.channelItemActive : styles.channelItem}
                             onClick={() => handleChannelSelect(channel)}>
                            <div style={styles.channelInfo}>
                                <div style={{ ...styles.channelIconContainer, background: getChannelColor(channel.channel_type) }}>
                                    <ChannelIcon type={channel.channel_type} />
                                </div>
                                <span style={styles.channelName}>{getChannelName(channel.channel_type)}</span>
                            </div>
                            <button 
                                style={{...styles.toggleSwitch, background: channel.is_active ? '#28a745' : '#ccc'}}
                                onClick={(e) => { e.stopPropagation(); handleToggleChannel(channel.id, channel.is_active); }}
                            >
                                <div style={{...styles.toggleKnob, transform: channel.is_active ? 'translateX(20px)' : 'translateX(0)'}}></div>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Conteúdo Principal */}
            <div style={styles.mainContent}>
                 <div style={styles.configHeader}>
                     <h2 style={styles.configTitle}>Configurações do Canal</h2>
                     <span style={styles.planBadge}>{userPlan.toUpperCase()}</span>
                </div>
                <div style={styles.configFields}>
                    {renderChannelSpecificConfig()}
                </div>
                 {selectedChannel && (
                    <div style={styles.configActions}>
                        <button 
                            onClick={handleSave} 
                            disabled={saving} 
                            style={{
                                ...styles.saveButton,
                                ...(saving ? styles.saveButtonDisabled : {})
                            }}
                        >
                            {saving ? (
                                <>
                                    <span style={styles.buttonSpinner}></span>
                                    Salvando...
                                </>
                            ) : (
                                <>💾 Salvar Alterações</>
                            )}
                        </button>
                    </div>
                )}
            </div>
            
            </div> {/* Fecha contentLayout */}
            
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

// ✨ ESTILOS PREMIUM COM GRADIENTE ROXO E GLASSMORPHISM
const styles = {
    container: { 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
        padding: '24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh'
    },
    
    // Header igual ao Dashboard
    pageHeader: {
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px'
    },
    
    pageTitle: { 
        fontSize: '28px', 
        fontWeight: 'bold', 
        color: 'white', 
        textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        margin: 0
    },
    
    headerInfo: {
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '12px',
        padding: '10px 16px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
    },
    
    channelCount: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#667eea'
    },
    
    // Layout dos boxes alinhados
    contentLayout: {
        display: 'flex', 
        gap: '30px',
        maxHeight: 'calc(100vh - 180px)' // Altura controlada para alinhar com Dashboard
    },
    
    // Sidebar Premium
    sidebar: { 
        flex: '0 0 320px', 
        background: 'rgba(255, 255, 255, 0.95)', 
        borderRadius: '20px', 
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)', 
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        animation: 'fadeIn 0.5s ease-out',
        height: 'fit-content',
        maxHeight: '100%'
    },
    
    sidebarHeader: { 
        padding: '24px', 
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
    },
    
    sidebarTitle: { 
        margin: 0, 
        fontSize: '20px', 
        fontWeight: '700',
        color: '#1f2937',
        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
    },
    
    channelsList: { 
        padding: '16px' 
    },
    
    // Channel Items
    channelItem: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 20px', 
        borderRadius: '14px', 
        cursor: 'pointer', 
        marginBottom: '12px', 
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: '1px solid transparent'
    },
    
    channelItemActive: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 20px', 
        borderRadius: '14px', 
        cursor: 'pointer', 
        marginBottom: '12px', 
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
        border: '1px solid rgba(102, 126, 234, 0.3)',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)',
        transform: 'translateY(-2px)'
    },
    
    channelInfo: { 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px' 
    },
    
    channelIconContainer: { 
        width: '48px', 
        height: '48px', 
        borderRadius: '12px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    },
    
    channelName: { 
        fontWeight: '600',
        fontSize: '16px',
        color: '#1f2937'
    },
    
    // Toggle Switch Premium
    toggleSwitch: { 
        width: '50px', 
        height: '28px', 
        borderRadius: '14px', 
        position: 'relative', 
        cursor: 'pointer', 
        transition: 'all 0.3s ease', 
        border: 'none',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
    },
    
    toggleKnob: { 
        width: '24px', 
        height: '24px', 
        background: 'white', 
        borderRadius: '50%', 
        position: 'absolute', 
        top: '2px', 
        left: '2px', 
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
    },
    
    // Main Content Premium
    mainContent: { 
        flex: 1, 
        background: 'rgba(255, 255, 255, 0.95)', 
        borderRadius: '20px', 
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        animation: 'fadeIn 0.5s ease-out 0.1s both',
        height: 'fit-content',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column'
    },
    
    configHeader: { 
        padding: '28px 32px', 
        borderBottom: '1px solid rgba(0,0,0,0.05)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
    },
    
    configTitle: { 
        margin: 0, 
        fontSize: '24px', 
        fontWeight: '700',
        color: '#1f2937',
        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
    },
    
    planBadge: { 
        padding: '8px 16px', 
        borderRadius: '20px', 
        fontSize: '12px', 
        fontWeight: '700', 
        color: 'white', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    
    configFields: { 
        padding: '32px',
        flex: 1,
        overflow: 'auto'
    },
    
    // Form Fields Premium
    fieldContainer: { 
        marginBottom: '24px' 
    },
    
    label: { 
        display: 'block', 
        fontWeight: '600', 
        marginBottom: '8px', 
        color: '#374151',
        fontSize: '14px'
    },
    
    input: { 
        width: '100%', 
        padding: '14px 16px', 
        border: '2px solid #e5e7eb', 
        borderRadius: '12px', 
        fontSize: '15px',
        transition: 'all 0.3s ease',
        background: 'white',
        fontFamily: 'inherit',
        outline: 'none',
        '::placeholder': {
            color: '#9ca3af'
        }
    },
    
    webhookInput: {
        width: '100%', 
        padding: '14px 16px', 
        border: '2px solid #e5e7eb', 
        borderRadius: '12px', 
        fontSize: '15px',
        background: '#f9fafb', 
        cursor: 'copy',
        fontFamily: 'monospace',
        color: '#6b7280'
    },
    
    helpText: { 
        fontSize: '13px', 
        color: '#6b7280', 
        marginTop: '6px',
        fontStyle: 'italic'
    },
    
    // Actions
    configActions: { 
        padding: '24px 32px', 
        borderTop: '1px solid rgba(0,0,0,0.05)', 
        display: 'flex', 
        justifyContent: 'flex-end',
        background: 'rgba(249, 250, 251, 0.5)'
    },
    
    saveButton: { 
        padding: '14px 28px', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white', 
        border: 'none', 
        borderRadius: '12px', 
        cursor: 'pointer', 
        fontWeight: '600',
        fontSize: '15px',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    
    saveButtonDisabled: {
        opacity: 0.7,
        cursor: 'not-allowed',
        transform: 'none'
    },
    
    buttonSpinner: {
        width: '16px',
        height: '16px',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderTop: '2px solid white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    
    // Empty States
    emptyState: { 
        padding: '60px 40px', 
        textAlign: 'center', 
        color: '#6b7280'
    },
    
    emptySidebar: { 
        padding: '40px 20px', 
        textAlign: 'center', 
        color: '#9ca3af'
    },
    
    emptyIcon: { 
        fontSize: '48px', 
        marginBottom: '16px',
        opacity: 0.6
    },
    
    emptyText: {
        fontSize: '15px',
        lineHeight: '1.5',
        color: '#6b7280'
    },
    
    loadingText: {
        textAlign: 'center',
        color: '#6b7280',
        fontStyle: 'italic'
    },
    
    // Success Animation Premium
    successAnimation: { 
        display: 'none', 
        position: 'fixed', 
        top: '30px', 
        right: '30px', 
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
        color: 'white', 
        padding: '16px 24px', 
        borderRadius: '16px', 
        zIndex: 1000,
        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
        animation: 'slideIn 0.5s ease-out',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontWeight: '600',
        backdropFilter: 'blur(20px)'
    },
    
    successIcon: {
        fontSize: '18px'
    },

    // ✅ CORRIGIDO: Estilos para OAuth automático
    autoConnectSection: {
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
        border: '1px solid rgba(102, 126, 234, 0.2)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px'
    },

    autoConnectTitle: {
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#374151'
    },

    connectButton: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        padding: '14px 28px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
    },

    connectButtonLoading: {
        opacity: 0.7,
        cursor: 'not-allowed'
    },

    spinner: {
        width: '16px',
        height: '16px',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderTop: '2px solid white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },

    manualConfig: {
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px'
    },

    manualSummary: {
        fontWeight: '600',
        cursor: 'pointer',
        padding: '8px 0',
        color: '#6b7280'
    },

    manualFields: {
        marginTop: '16px'
    }
};

export default ChannelSettings;