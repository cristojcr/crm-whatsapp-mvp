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
            
            {/* Header removido - renderizado dentro do mainContent */}
            
            {/* Layout dos boxes */}
            <div style={styles.contentLayout}>
                {/* Sidebar */}
            <div style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                    <h3 style={styles.sidebarTitle}>🌐 Meus Canais</h3>
                    <span style={styles.channelCount}>
                        {channels.length} {channels.length === 1 ? 'canal' : 'canais'} configurado{channels.length === 1 ? '' : 's'}
                    </span>
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
                                style={{...styles.toggleSwitch, background: channel.is_active ? '#00A693' : '#ccc'}}
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

// ✨ ESTILOS ATUALIZADOS PARA ALINHAR COM O DESIGN DA PLATAFORMA
const styles = {
    // ✅ NOVO: Container sem background próprio
    container: { 
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
        padding: '0',
        background: 'transparent', // ✨ Sem background próprio
        minHeight: 'auto' // ✨ Sem altura própria
    },
    
    // ✅ Layout principal atualizado
    contentLayout: {
        display: 'flex', 
        gap: '24px',
        height: '100%'
    },
    
    // ✅ Sidebar com glassmorphism moderno
    sidebar: { 
        flex: '0 0 320px', 
        background: 'rgba(255, 255, 255, 0.75)', // ✨ Glassmorphism como ProductDashboard
        backdropFilter: 'blur(20px)', // ✨ Mais blur
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '16px', // ✨ Bordas mais arredondadas
        boxShadow: `
            inset 0 1px 0 rgba(255, 255, 255, 0.4),
            inset 0 -1px 0 rgba(255, 255, 255, 0.2),
            0 4px 20px rgba(255, 255, 255, 0.1)
        `, // ✨ Sombra igual aos cards
        border: '1px solid rgba(255, 255, 255, 0.4)', // ✨ Borda sutil
        overflow: 'hidden',
        height: 'fit-content',
        maxHeight: '100%'
    },
    
    sidebarHeader: { 
        padding: '24px', 
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        background: 'linear-gradient(135deg, rgba(109, 74, 255, 0.1) 0%, rgba(0, 166, 147, 0.1) 100%)' // ✨ Cores Proton
    },
    
    sidebarTitle: { 
        margin: '0 0 8px 0', 
        fontSize: '18px', 
        fontWeight: '600',
        color: '#2c2c2c' // ✨ Roxo escuro
    },
    
    // ✅ NOVO: Contador de canais
    channelCount: {
        fontSize: '12px',
        fontWeight: '500',
        color: '#6D4AFF', // ✨ Cor Proton roxa
        background: 'rgba(109, 74, 255, 0.1)',
        padding: '4px 8px',
        borderRadius: '8px',
        border: '1px solid rgba(109, 74, 255, 0.2)'
    },
    
    channelsList: { 
        padding: '16px' 
    },
    
    // Channel Items atualizados
    channelItem: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 20px', 
        borderRadius: '12px', 
        cursor: 'pointer', 
        marginBottom: '8px', 
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: '1px solid transparent',
        background: 'rgba(255, 255, 255, 0.3)', // ✨ Fundo sutil
    },
    
    channelItemActive: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 20px', 
        borderRadius: '12px', 
        cursor: 'pointer', 
        marginBottom: '8px', 
        background: 'linear-gradient(135deg, rgba(109, 74, 255, 0.15) 0%, rgba(0, 166, 147, 0.15) 100%)', // ✨ Cores Proton
        border: '1px solid rgba(109, 74, 255, 0.3)',
        boxShadow: '0 4px 12px rgba(109, 74, 255, 0.2)',
        transform: 'translateY(-1px)'
    },
    
    channelInfo: { 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px' 
    },
    
    channelIconContainer: { 
        width: '40px', 
        height: '40px', 
        borderRadius: '10px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'white',
        boxShadow: '0 3px 8px rgba(0,0,0,0.15)'
    },
    
    channelName: { 
        fontWeight: '600',
        fontSize: '14px',
        color: '#2c2c2c' // ✨ Roxo escuro
    },
    
    // Toggle Switch com cor Proton
    toggleSwitch: { 
        width: '44px', 
        height: '24px', 
        borderRadius: '12px', 
        position: 'relative', 
        cursor: 'pointer', 
        transition: 'all 0.3s ease', 
        border: 'none',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
    },
    
    toggleKnob: { 
        width: '20px', 
        height: '20px', 
        background: 'white', 
        borderRadius: '50%', 
        position: 'absolute', 
        top: '2px', 
        left: '2px', 
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    
    // ✅ Main Content com glassmorphism
    mainContent: { 
        flex: 1, 
        background: 'rgba(255, 255, 255, 0.75)', // ✨ Glassmorphism como ProductDashboard
        backdropFilter: 'blur(20px)', // ✨ Mais blur
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '16px',
        boxShadow: `
            inset 0 1px 0 rgba(255, 255, 255, 0.4),
            inset 0 -1px 0 rgba(255, 255, 255, 0.2),
            0 4px 20px rgba(255, 255, 255, 0.1)
        `, // ✨ Sombra igual aos cards
        border: '1px solid rgba(255, 255, 255, 0.4)',
        height: 'fit-content',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column'
    },
    
    configHeader: { 
        padding: '24px 28px', 
        borderBottom: '1px solid rgba(0,0,0,0.05)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(109, 74, 255, 0.1) 0%, rgba(0, 166, 147, 0.1) 100%)' // ✨ Cores Proton
    },
    
    configTitle: { 
        margin: 0, 
        fontSize: '20px', 
        fontWeight: '600',
        color: '#2c2c2c' // ✨ Roxo escuro
    },
    
    planBadge: { 
        padding: '6px 12px', 
        borderRadius: '16px', 
        fontSize: '11px', 
        fontWeight: '600', 
        color: 'white', 
        background: 'linear-gradient(135deg, #6D4AFF 0%, #00A693 100%)', // ✨ Cores Proton
        boxShadow: '0 3px 8px rgba(109, 74, 255, 0.3)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    
    configFields: { 
        padding: '28px',
        flex: 1,
        overflow: 'auto'
    },
    
    // Form Fields atualizados
    fieldContainer: { 
        marginBottom: '20px' 
    },
    
    label: { 
        display: 'block', 
        fontWeight: '600', 
        marginBottom: '6px', 
        color: '#2c2c2c', // ✨ Roxo escuro
        fontSize: '13px'
    },
    
    input: { 
        width: '100%', 
        padding: '12px 14px', 
        border: '1px solid rgba(109, 74, 255, 0.2)', // ✨ Borda Proton
        borderRadius: '10px', 
        fontSize: '14px',
        transition: 'all 0.3s ease',
        background: 'rgba(255, 255, 255, 0.8)', // ✨ Fundo sutil
        fontFamily: 'inherit',
        outline: 'none',
        color: '#2c2c2c', // ✨ Roxo escuro
        boxSizing: 'border-box'
    },
    
    webhookInput: {
        width: '100%', 
        padding: '12px 14px', 
        border: '1px solid rgba(109, 74, 255, 0.2)', 
        borderRadius: '10px', 
        fontSize: '13px',
        background: 'rgba(109, 74, 255, 0.1)', // ✨ Fundo Proton
        cursor: 'copy',
        fontFamily: 'monospace',
        color: '#6D4AFF', // ✨ Cor Proton
        boxSizing: 'border-box'
    },
    
    helpText: { 
        fontSize: '12px', 
        color: '#666', 
        marginTop: '4px',
        fontStyle: 'italic'
    },
    
    // Actions atualizadas
    configActions: { 
        padding: '20px 28px', 
        borderTop: '1px solid rgba(0,0,0,0.05)', 
        display: 'flex', 
        justifyContent: 'flex-end',
        background: 'rgba(249, 250, 251, 0.3)'
    },
    
    saveButton: { 
        padding: '12px 24px', 
        background: 'linear-gradient(135deg, #6D4AFF 0%, #00A693 100%)', // ✨ Cores Proton
        color: 'white', 
        border: 'none', 
        borderRadius: '10px', 
        cursor: 'pointer', 
        fontWeight: '600',
        fontSize: '14px',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 12px rgba(109, 74, 255, 0.3)',
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
        width: '14px',
        height: '14px',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderTop: '2px solid white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    
    // Empty States atualizados
    emptyState: { 
        padding: '40px 30px', 
        textAlign: 'center', 
        color: '#666'
    },
    
    emptySidebar: { 
        padding: '30px 16px', 
        textAlign: 'center', 
        color: '#999'
    },
    
    emptyIcon: { 
        fontSize: '36px', 
        marginBottom: '12px',
        opacity: 0.6
    },
    
    emptyText: {
        fontSize: '14px',
        lineHeight: '1.4',
        color: '#666'
    },
    
    loadingText: {
        textAlign: 'center',
        color: '#999',
        fontStyle: 'italic',
        fontSize: '14px'
    },
    
    // Success Animation atualizada
    successAnimation: { 
        display: 'none', 
        position: 'fixed', 
        top: '24px', 
        right: '24px', 
        background: 'linear-gradient(135deg, #00A693 0%, #059669 100%)', // ✨ Verde Proton
        color: 'white', 
        padding: '12px 20px', 
        borderRadius: '12px', 
        zIndex: 1000,
        boxShadow: '0 6px 20px rgba(0, 166, 147, 0.3)',
        animation: 'slideIn 0.5s ease-out',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontWeight: '600',
        backdropFilter: 'blur(20px)'
    },
    
    successIcon: {
        fontSize: '16px'
    },

    // ✅ Estilos para OAuth automático atualizados
    autoConnectSection: {
        background: 'linear-gradient(135deg, rgba(109, 74, 255, 0.1) 0%, rgba(0, 166, 147, 0.1) 100%)', // ✨ Cores Proton
        border: '1px solid rgba(109, 74, 255, 0.2)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
    },

    autoConnectTitle: {
        margin: '0 0 12px 0',
        fontSize: '15px',
        fontWeight: '600',
        color: '#2c2c2c' // ✨ Roxo escuro
    },

    connectButton: {
        background: 'linear-gradient(135deg, #6D4AFF 0%, #00A693 100%)', // ✨ Cores Proton
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px',
        boxShadow: '0 4px 12px rgba(109, 74, 255, 0.3)'
    },

    connectButtonLoading: {
        opacity: 0.7,
        cursor: 'not-allowed'
    },

    spinner: {
        width: '14px',
        height: '14px',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderTop: '2px solid white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },

    manualConfig: {
        border: '1px solid rgba(109, 74, 255, 0.2)', // ✨ Borda Proton
        borderRadius: '10px',
        padding: '14px',
        background: 'rgba(255, 255, 255, 0.5)' // ✨ Fundo sutil
    },

    manualSummary: {
        fontWeight: '600',
        cursor: 'pointer',
        padding: '6px 0',
        color: '#2c2c2c', // ✨ Roxo escuro
        fontSize: '14px'
    },

    manualFields: {
        marginTop: '14px'
    }
};

export default ChannelSettings;