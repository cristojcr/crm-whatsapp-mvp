// apps/web/components/settings/ChannelSettings.jsx
import React, { useState, useEffect } from 'react';

// Simulação do supabase para funcionar sem dependências
import { supabase } from '@/lib/supabase';

const ChannelSettings = ({ userId = 'demo-user', userPlan = 'basic' }) => {
    const [channels, setChannels] = useState([]);
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [config, setConfig] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadUserChannels();
    }, [userId]);

    const loadUserChannels = async () => {
    try {
        setLoading(true);
        
        // USANDO DADOS REAIS DO SUPABASE
        const { data, error } = await supabase
            .from('user_channels')
            .select('*')
            .eq('user_id', '2f1603f7-2af4-49fc-ae9b-a95566384600a'); // ← UUID real do seu banco

        if (error) {
            console.error('Erro no Supabase:', error);
            // Fallback para dados simulados se der erro
            setChannels([]);
            return;
        }

        if (data && data.length > 0) {
            console.log('✅ Dados REAIS carregados do Supabase:', data);
            setChannels(data);
            setSelectedChannel(data[0]);
            setConfig(data[0].channel_config || {});
        } else {
            console.log('❌ Nenhum dado encontrado no Supabase');
            setChannels([]);
        }
        
    } catch (error) {
        console.error('Erro carregando canais:', error);
        setChannels([]);
    } finally {
        setLoading(false);
    }
};

    const handleChannelSelect = (channel) => {
        setSelectedChannel(channel);
        setConfig(channel.channel_config || {});
    };

    const handleChange = (field, value) => {
        setConfig(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        if (!selectedChannel) return;

        try {
            setSaving(true);
            const { error } = await supabase
                .from('user_channels')
                .update({ 
                    channel_config: config,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedChannel.id);

            if (!error) {
                const updatedChannels = channels.map(ch => 
                    ch.id === selectedChannel.id 
                        ? { ...ch, channel_config: config }
                        : ch
                );
                setChannels(updatedChannels);
                setSelectedChannel({ ...selectedChannel, channel_config: config });
                
                // Feedback visual animado
                showSuccessAnimation();
            }
        } catch (error) {
            console.error('Erro salvando configurações:', error);
        } finally {
            setSaving(false);
        }
    };

    const showSuccessAnimation = () => {
        const successEl = document.getElementById('success-animation');
        if (successEl) {
            successEl.style.display = 'block';
            successEl.style.animation = 'successPulse 2s ease-in-out';
            setTimeout(() => {
                successEl.style.display = 'none';
            }, 2000);
        }
    };

    const handleToggleChannel = async (channelId, currentStatus) => {
        // Validação de plano antes de ativar
        if (!currentStatus) { // Tentando ativar canal
            const activeChannels = channels.filter(ch => ch.is_active && ch.id !== channelId);
            
            if (userPlan === 'pro' && activeChannels.length >= 1) {
                alert('❌ Plano Pro permite apenas 1 canal ativo por vez!\n\n' +
                    '💡 Desative outro canal primeiro ou faça upgrade para Premium.');
                return;
            }
            
            if (userPlan === 'basic') {
                const channel = channels.find(ch => ch.id === channelId);
                if (channel?.channel_type !== 'whatsapp') {
                    alert('❌ Plano Básico permite apenas WhatsApp!\n\n' +
                        '💡 Faça upgrade para Pro ou Premium para usar outros canais.');
                    return;
                }
            }
        }
        try {
            // Atualizar estado local IMEDIATAMENTE para feedback visual
            const updatedChannels = channels.map(ch => 
                ch.id === channelId 
                    ? { ...ch, is_active: !currentStatus }
                    : ch
            );
            setChannels(updatedChannels);
            
            // Se o canal selecionado foi alterado, atualizar também
            if (selectedChannel && selectedChannel.id === channelId) {
                setSelectedChannel({ ...selectedChannel, is_active: !currentStatus });
            }

            // Simular chamada ao backend
            const { error } = await supabase
                .from('user_channels')
                .update({ 
                    is_active: !currentStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', channelId);

            if (error) {
                // Se der erro, reverter o estado
                setChannels(channels);
                if (selectedChannel && selectedChannel.id === channelId) {
                    setSelectedChannel(selectedChannel);
                }
            }
        } catch (error) {
            console.error('Erro atualizando status do canal:', error);
            // Reverter o estado em caso de erro
            setChannels(channels);
        }
    };

    const getChannelIcon = (channelType) => {
        const icons = {
            'whatsapp': '📱',
            'instagram': '📸',
            'telegram': '✈️'
        };
        return icons[channelType] || '💬';
    };

    const getChannelName = (channelType) => {
        const names = {
            'whatsapp': 'WhatsApp Business',
            'instagram': 'Instagram Business',
            'telegram': 'Telegram Bot'
        };
        return names[channelType] || channelType;
    };

    const getChannelColor = (channelType) => {
        const colors = {
            'whatsapp': 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
            'instagram': 'linear-gradient(135deg, #e1306c 0%, #833ab4 50%, #fd1d1d 100%)',
            'telegram': 'linear-gradient(135deg, #0088cc 0%, #005fa3 100%)'
        };
        return colors[channelType] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    };

    const renderChannelSpecificConfig = () => {
        if (!selectedChannel) return null;

        const { channel_type } = selectedChannel;

        const inputStyle = {
            width: '100%',
            padding: '14px 18px',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            fontSize: '16px',
            fontWeight: '500',
            outline: 'none',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        };

        const labelStyle = {
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        };

        const fieldContainerStyle = {
            marginBottom: '24px'
        };

        const helpTextStyle = {
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '6px',
            fontStyle: 'italic'
        };

        switch (channel_type) {
            case 'telegram':
                return (
                    <div>
                        <div style={fieldContainerStyle}>
                            <label style={labelStyle}>
                                🤖 Token do Bot
                            </label>
                            <input
                                type="password"
                                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                                value={config.bot_token || ''}
                                onChange={(e) => handleChange('bot_token', e.target.value)}
                                style={inputStyle}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#0088cc';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 136, 204, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                    e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
                                }}
                            />
                            <p style={helpTextStyle}>
                                🎯 Obtido do @BotFather no Telegram
                            </p>
                        </div>

                        <div style={fieldContainerStyle}>
                            <label style={labelStyle}>
                                📝 Username do Bot
                            </label>
                            <input
                                type="text"
                                placeholder="@meubot"
                                value={config.bot_username || ''}
                                onChange={(e) => handleChange('bot_username', e.target.value)}
                                style={inputStyle}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#0088cc';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 136, 204, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                    e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
                                }}
                            />
                        </div>

                        <div style={fieldContainerStyle}>
                            <label style={labelStyle}>
                                🔗 Webhook URL
                            </label>
                            <input
                                type="text"
                                value={`https://api.seucrm.com/api/webhook/telegram/${userId}`}
                                readOnly
                                style={{
                                    ...inputStyle,
                                    background: 'rgba(243, 244, 246, 0.8)',
                                    color: '#6b7280',
                                    cursor: 'not-allowed'
                                }}
                            />
                            <p style={helpTextStyle}>
                                🎯 Configure esta URL no seu bot Telegram
                            </p>
                        </div>
                    </div>
                );

            case 'instagram':
                return (
                    <div>
                        <div style={fieldContainerStyle}>
                            <label style={labelStyle}>
                                🔑 Access Token
                            </label>
                            <input
                                type="password"
                                placeholder="EAABwz..."
                                value={config.access_token || ''}
                                onChange={(e) => handleChange('access_token', e.target.value)}
                                style={inputStyle}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#e1306c';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(225, 48, 108, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                    e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
                                }}
                            />
                            <p style={helpTextStyle}>
                                🎯 Token de acesso do Instagram Business API
                            </p>
                        </div>

                        <div style={fieldContainerStyle}>
                            <label style={labelStyle}>
                                🏢 Business Account ID
                            </label>
                            <input
                                type="text"
                                placeholder="17841405793..."
                                value={config.business_account_id || ''}
                                onChange={(e) => handleChange('business_account_id', e.target.value)}
                                style={inputStyle}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#e1306c';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(225, 48, 108, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                    e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
                                }}
                            />
                        </div>

                        <div style={fieldContainerStyle}>
                            <label style={labelStyle}>
                                🔗 Webhook URL
                            </label>
                            <input
                                type="text"
                                value={`https://api.seucrm.com/api/webhook/instagram/${userId}`}
                                readOnly
                                style={{
                                    ...inputStyle,
                                    background: 'rgba(243, 244, 246, 0.8)',
                                    color: '#6b7280',
                                    cursor: 'not-allowed'
                                }}
                            />
                            <p style={helpTextStyle}>
                                🎯 Configure esta URL no Facebook Developer Console
                            </p>
                        </div>
                    </div>
                );

            case 'whatsapp':
                return (
                    <div>
                        <div style={fieldContainerStyle}>
                            <label style={labelStyle}>
                                🏢 Business Account ID
                            </label>
                            <input
                                type="text"
                                placeholder="123456789"
                                value={config.business_account_id || ''}
                                onChange={(e) => handleChange('business_account_id', e.target.value)}
                                style={inputStyle}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#25d366';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 211, 102, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                    e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
                                }}
                            />
                        </div>

                        <div style={fieldContainerStyle}>
                            <label style={labelStyle}>
                                🔑 Access Token
                            </label>
                            <input
                                type="password"
                                placeholder="EAABwz..."
                                value={config.access_token || ''}
                                onChange={(e) => handleChange('access_token', e.target.value)}
                                style={inputStyle}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#25d366';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 211, 102, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                    e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
                                }}
                            />
                        </div>

                        <div style={fieldContainerStyle}>
                            <label style={labelStyle}>
                                📞 Phone Number ID
                            </label>
                            <input
                                type="text"
                                placeholder="123456789"
                                value={config.phone_number_id || ''}
                                onChange={(e) => handleChange('phone_number_id', e.target.value)}
                                style={inputStyle}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#25d366';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 211, 102, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                    e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
                                }}
                            />
                        </div>

                        <div style={fieldContainerStyle}>
                            <label style={labelStyle}>
                                🔗 Webhook URL
                            </label>
                            <input
                                type="text"
                                value={`https://api.seucrm.com/api/webhook/whatsapp/${userId}`}
                                readOnly
                                style={{
                                    ...inputStyle,
                                    background: 'rgba(243, 244, 246, 0.8)',
                                    color: '#6b7280',
                                    cursor: 'not-allowed'
                                }}
                            />
                            <p style={helpTextStyle}>
                                🎯 Configure esta URL no Meta Business Manager
                            </p>
                        </div>
                    </div>
                );

            default:
                return (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 30px',
                        color: '#6b7280'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>⚙️</div>
                        <p>Configurações específicas para este canal não disponíveis.</p>
                    </div>
                );
        }
    };

    const styles = {
        container: {
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },

        header: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '30px',
            marginBottom: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
        },

        title: {
            fontSize: '32px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            marginBottom: '8px'
        },

        subtitle: {
            color: '#6b7280',
            fontSize: '16px',
            fontWeight: '400',
            margin: 0
        },

        mainGrid: {
            display: 'grid',
            gridTemplateColumns: '350px 1fr',
            gap: '24px',
            '@media (max-width: 1024px)': {
                gridTemplateColumns: '1fr',
                gap: '16px'
            }
        },

        sidebar: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            boxShadow: '0 15px 40px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            overflow: 'hidden'
        },

        sidebarHeader: {
            padding: '20px 24px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
            background: 'rgba(102, 126, 234, 0.02)'
        },

        sidebarTitle: {
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1f2937',
            margin: 0
        },

        channelsList: {
            maxHeight: '500px',
            overflowY: 'auto'
        },

        channelItem: {
            padding: '20px 24px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative'
        },

        channelItemActive: {
            background: 'rgba(102, 126, 234, 0.05)',
            borderRight: '3px solid #667eea'
        },

        channelItemContent: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        },

        channelInfo: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: 1
        },

        channelIconContainer: {
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            color: 'white',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        },

        channelDetails: {
            flex: 1
        },

        channelName: {
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0,
            marginBottom: '4px'
        },

        channelStatus: {
            fontSize: '14px',
            color: '#6b7280',
            margin: 0
        },

        toggleSwitch: {
            position: 'relative',
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            border: 'none',
            outline: 'none'
        },

        toggleSwitchActive: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
        },

        toggleSwitchInactive: {
            background: '#e5e7eb'
        },

        toggleKnob: {
            position: 'absolute',
            top: '2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'white',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        },

        toggleKnobActive: {
            left: '22px'
        },

        toggleKnobInactive: {
            left: '2px'
        },

        configPanel: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            boxShadow: '0 15px 40px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            overflow: 'hidden'
        },

        configHeader: {
            padding: '24px 30px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
            background: 'rgba(102, 126, 234, 0.02)'
        },

        configHeaderContent: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
        },

        configIconContainer: {
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: 'white',
            fontWeight: 'bold',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
        },

        configTitle: {
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1f2937',
            margin: 0,
            marginBottom: '4px'
        },

        configSubtitle: {
            fontSize: '14px',
            color: '#6b7280',
            margin: 0
        },

        configContent: {
            padding: '30px'
        },

        configActions: {
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid rgba(0, 0, 0, 0.05)'
        },

        cancelButton: {
            padding: '12px 24px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.7)',
            color: '#6b7280',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            outline: 'none'
        },

        saveButton: {
            padding: '12px 24px',
            border: 'none',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            outline: 'none',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
        },

        saveButtonDisabled: {
            opacity: 0.6,
            cursor: 'not-allowed'
        },

        emptyState: {
            textAlign: 'center',
            padding: '60px 30px',
            color: '#6b7280'
        },

        emptyIcon: {
            fontSize: '48px',
            marginBottom: '16px',
            opacity: 0.5
        },

        loadingContainer: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '400px'
        },

        spinner: {
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        },

        successAnimation: {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)',
            zIndex: 1000,
            display: 'none',
            fontWeight: '600'
        }
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingContainer}>
                    <div style={styles.spinner}></div>
                </div>
                <style jsx>{`
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
            {/* Success Animation */}
            <div id="success-animation" style={styles.successAnimation}>
                ✅ Configurações salvas com sucesso!
            </div>

            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>⚙️ Configurações de Canais</h1>
                <p style={styles.subtitle}>
                    Gerencie suas integrações com diferentes plataformas de messaging
                    <span style={{
                        marginLeft: '16px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: userPlan === 'premium' ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' : 
                                userPlan === 'pro' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 
                                'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                        color: 'white'
                    }}>
                        {userPlan.toUpperCase()}
                        {userPlan === 'pro' && ' (1 canal)'}
                        {userPlan === 'premium' && ' (Todos canais)'}
                    </span>
                </p>
            </div>

            {/* Main Content */}
            <div style={styles.mainGrid}>
                {/* Sidebar - Lista de canais */}
                <div style={styles.sidebar}>
                    <div style={styles.sidebarHeader}>
                        <h3 style={styles.sidebarTitle}>🌐 Meus Canais</h3>
                    </div>
                    
                    <div style={styles.channelsList}>
                        {channels.length === 0 ? (
                            <div style={styles.emptyState}>
                                <div style={styles.emptyIcon}>📱</div>
                                <p>Nenhum canal configurado</p>
                            </div>
                        ) : (
                            channels.map(channel => (
                                <div
                                    key={channel.id}
                                    style={{
                                        ...styles.channelItem,
                                        ...(selectedChannel?.id === channel.id ? styles.channelItemActive : {})
                                    }}
                                    onClick={() => handleChannelSelect(channel)}
                                    onMouseEnter={(e) => {
                                        if (selectedChannel?.id !== channel.id) {
                                            e.target.style.background = 'rgba(102, 126, 234, 0.02)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedChannel?.id !== channel.id) {
                                            e.target.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    <div style={styles.channelItemContent}>
                                        <div style={styles.channelInfo}>
                                            <div style={{
                                                ...styles.channelIconContainer,
                                                background: getChannelColor(channel.channel_type)
                                            }}>
                                                {getChannelIcon(channel.channel_type)}
                                            </div>
                                            <div style={styles.channelDetails}>
                                                <p style={styles.channelName}>
                                                    {getChannelName(channel.channel_type)}
                                                </p>
                                                <p style={styles.channelStatus}>
                                                    {channel.is_active ? '🟢 Ativo' : '🔴 Inativo'}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleChannel(channel.id, channel.is_active);
                                            }}
                                            style={{
                                                ...styles.toggleSwitch,
                                                ...(channel.is_active ? styles.toggleSwitchActive : styles.toggleSwitchInactive)
                                            }}
                                        >
                                            <div style={{
                                                ...styles.toggleKnob,
                                                ...(channel.is_active ? styles.toggleKnobActive : styles.toggleKnobInactive)
                                            }}></div>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Config Panel */}
                <div style={styles.configPanel}>
                    {selectedChannel ? (
                        <>
                            <div style={styles.configHeader}>
                                <div style={styles.configHeaderContent}>
                                    <div style={{
                                        ...styles.configIconContainer,
                                        background: getChannelColor(selectedChannel.channel_type)
                                    }}>
                                        {getChannelIcon(selectedChannel.channel_type)}
                                    </div>
                                    <div>
                                        <h3 style={styles.configTitle}>
                                            {getChannelName(selectedChannel.channel_type)}
                                        </h3>
                                        <p style={styles.configSubtitle}>
                                            Configure as credenciais e configurações específicas
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div style={styles.configContent}>
                                {renderChannelSpecificConfig()}

                                <div style={styles.configActions}>
                                    <button
                                        type="button"
                                        onClick={() => setConfig(selectedChannel.channel_config || {})}
                                        style={styles.cancelButton}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                                            e.target.style.borderColor = '#d1d5db';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = 'rgba(255, 255, 255, 0.7)';
                                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                                        }}
                                    >
                                        🔄 Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={saving}
                                        style={{
                                            ...styles.saveButton,
                                            ...(saving ? styles.saveButtonDisabled : {})
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!saving) {
                                                e.target.style.transform = 'translateY(-2px)';
                                                e.target.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.4)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!saving) {
                                                e.target.style.transform = 'translateY(0)';
                                                e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                                            }
                                        }}
                                    >
                                        {saving ? '⏳ Salvando...' : '💾 Salvar Configurações'}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={styles.emptyState}>
                            <div style={styles.emptyIcon}>⚙️</div>
                            <p>Selecione um canal para configurar</p>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes successPulse {
                    0% { transform: translateX(100%); opacity: 0; }
                    10% { transform: translateX(0); opacity: 1; }
                    90% { transform: translateX(0); opacity: 1; }
                    100% { transform: translateX(100%); opacity: 0; }
                }
                
                @media (max-width: 1024px) {
                    .main-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default ChannelSettings;