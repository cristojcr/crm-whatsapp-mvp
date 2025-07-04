import React, { useState, useEffect } from 'react';

// Ícones (simulados já que não temos lucide-react no ambiente)
const IconComponent = ({ type, size = "16px" }) => {
    const icons = {
        settings: '⚙️',
        save: '💾',
        refreshCw: '🔄',
        dollarSign: '💰',
        percent: '%',
        calendar: '📅',
        users: '👥',
        target: '🎯',
        award: '🏆',
        alertCircle: '⚠️',
        plus: '➕',
        trash: '🗑️',
        check: '✅',
        x: '❌'
    };
    
    return (
        <span style={{ 
            fontSize: size, 
            lineHeight: 1, 
            display: 'inline-block',
            width: size,
            textAlign: 'center'
        }}>
            {icons[type] || '⚙️'}
        </span>
    );
};

const PartnerSettings = () => {
    const [settings, setSettings] = useState({
        commission_rates: {
            bronze: 10,
            silver: 15,
            gold: 20
        },
        auto_approval: {
            enabled: false,
            min_requirements: {
                business_type: ['contador', 'associacao']
            }
        },
        payment_schedule: {
            frequency: 'monthly',
            minimum_amount: 100,
            payment_day: 15
        },
        tier_requirements: {
            silver: {
                min_referrals: 10,
                min_conversions: 5
            },
            gold: {
                min_referrals: 50,
                min_conversions: 25
            }
        },
        bonus_targets: [
            {
                metric: 'conversions',
                target: 20,
                bonus_amount: 500,
                period: 'monthly'
            }
        ],
        marketing_materials: {
            enabled: true,
            custom_landing_pages: true,
            branded_links: true
        }
    });

    const [loading, setLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            // TODO: Implementar carregamento real das configurações
            // const response = await fetch('/api/admin/partner-settings');
            // const data = await response.json();
            // setSettings(data);
            
            // Simulação de carregamento
            setTimeout(() => {
                setLoading(false);
            }, 1000);
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            
            // TODO: Implementar salvamento real
            // await fetch('/api/admin/partner-settings', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(settings)
            // });
            
            // Simulação de salvamento
            setTimeout(() => {
                setLoading(false);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }, 1000);
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            setLoading(false);
        }
    };

    const updateCommissionRate = (tier, value) => {
        setSettings({
            ...settings,
            commission_rates: {
                ...settings.commission_rates,
                [tier]: parseFloat(value) || 0
            }
        });
    };

    const updatePaymentSchedule = (field, value) => {
        setSettings({
            ...settings,
            payment_schedule: {
                ...settings.payment_schedule,
                [field]: field === 'minimum_amount' || field === 'payment_day' ? parseInt(value) || 0 : value
            }
        });
    };

    const updateTierRequirement = (tier, field, value) => {
        setSettings({
            ...settings,
            tier_requirements: {
                ...settings.tier_requirements,
                [tier]: {
                    ...settings.tier_requirements[tier],
                    [field]: parseInt(value) || 0
                }
            }
        });
    };

    const addBonusTarget = () => {
        setSettings({
            ...settings,
            bonus_targets: [
                ...settings.bonus_targets,
                {
                    metric: 'conversions',
                    target: 0,
                    bonus_amount: 0,
                    period: 'monthly'
                }
            ]
        });
    };

    const updateBonusTarget = (index, field, value) => {
        const newTargets = [...settings.bonus_targets];
        newTargets[index] = {
            ...newTargets[index],
            [field]: ['target', 'bonus_amount'].includes(field) ? parseFloat(value) || 0 : value
        };
        setSettings({
            ...settings,
            bonus_targets: newTargets
        });
    };

    const removeBonusTarget = (index) => {
        setSettings({
            ...settings,
            bonus_targets: settings.bonus_targets.filter((_, i) => i !== index)
        });
    };

    const toggleAutoApproval = () => {
        setSettings({
            ...settings,
            auto_approval: {
                ...settings.auto_approval,
                enabled: !settings.auto_approval.enabled
            }
        });
    };

    const toggleMarketingFeature = (feature) => {
        setSettings({
            ...settings,
            marketing_materials: {
                ...settings.marketing_materials,
                [feature]: !settings.marketing_materials[feature]
            }
        });
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>
                        <IconComponent type="settings" size="28px" />
                        Configurações de Parcerias
                    </h1>
                    <p style={styles.subtitle}>Configure comissões, aprovações e regras de negócio</p>
                </div>
                <div style={styles.headerActions}>
                    <button 
                        onClick={loadSettings}
                        style={styles.headerButton}
                        disabled={loading}
                    >
                        <IconComponent type="refreshCw" size="16px" />
                        <span>Recarregar</span>
                    </button>
                    <button 
                        onClick={handleSave}
                        style={{...styles.headerButton, ...styles.saveButton}}
                        disabled={loading}
                    >
                        <IconComponent type="save" size="16px" />
                        <span>{loading ? 'Salvando...' : 'Salvar'}</span>
                    </button>
                </div>
            </div>

            {/* Mensagem de Sucesso */}
            {saveSuccess && (
                <div style={styles.successMessage}>
                    <IconComponent type="check" size="16px" />
                    <span>Configurações salvas com sucesso!</span>
                </div>
            )}

            {/* Layout de Configurações */}
            <div style={styles.settingsLayout}>
                
                {/* Seção: Taxas de Comissão */}
                <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                        <h3 style={styles.sectionTitle}>
                            <IconComponent type="percent" size="20px" />
                            Taxas de Comissão por Tier
                        </h3>
                        <p style={styles.sectionDescription}>
                            Configure as porcentagens de comissão para cada nível de parceiro
                        </p>
                    </div>
                    <div style={styles.sectionContent}>
                        <div style={styles.tiersGrid}>
                            {Object.entries(settings.commission_rates).map(([tier, rate]) => (
                                <div key={tier} style={styles.tierItem}>
                                    <div style={styles.tierHeader}>
                                        <span style={styles.tierIcon}>
                                            {tier === 'bronze' ? '🥉' : tier === 'silver' ? '🥈' : '🥇'}
                                        </span>
                                        <span style={styles.tierName}>
                                            {tier.charAt(0).toUpperCase() + tier.slice(1)}
                                        </span>
                                    </div>
                                    <div style={styles.tierInputGroup}>
                                        <input
                                            type="number"
                                            value={rate}
                                            onChange={(e) => updateCommissionRate(tier, e.target.value)}
                                            style={styles.tierInput}
                                            min="0"
                                            max="100"
                                            step="0.1"
                                        />
                                        <span style={styles.tierInputSuffix}>%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Seção: Cronograma de Pagamentos */}
                <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                        <h3 style={styles.sectionTitle}>
                            <IconComponent type="calendar" size="20px" />
                            Cronograma de Pagamentos
                        </h3>
                        <p style={styles.sectionDescription}>
                            Configure quando e como as comissões são pagas
                        </p>
                    </div>
                    <div style={styles.sectionContent}>
                        <div style={styles.formGrid}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Frequência:</label>
                                <select
                                    value={settings.payment_schedule.frequency}
                                    onChange={(e) => updatePaymentSchedule('frequency', e.target.value)}
                                    style={styles.formSelect}
                                >
                                    <option value="monthly">Mensal</option>
                                    <option value="quarterly">Trimestral</option>
                                    <option value="annually">Anual</option>
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Valor Mínimo (R$):</label>
                                <input
                                    type="number"
                                    value={settings.payment_schedule.minimum_amount}
                                    onChange={(e) => updatePaymentSchedule('minimum_amount', e.target.value)}
                                    style={styles.formInput}
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Dia do Pagamento:</label>
                                <input
                                    type="number"
                                    value={settings.payment_schedule.payment_day}
                                    onChange={(e) => updatePaymentSchedule('payment_day', e.target.value)}
                                    style={styles.formInput}
                                    min="1"
                                    max="31"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seção: Requisitos para Upgrade */}
                <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                        <h3 style={styles.sectionTitle}>
                            <IconComponent type="award" size="20px" />
                            Requisitos para Upgrade de Tier
                        </h3>
                        <p style={styles.sectionDescription}>
                            Defina quantas indicações e conversões são necessárias para cada tier
                        </p>
                    </div>
                    <div style={styles.sectionContent}>
                        <div style={styles.upgradeGrid}>
                            {Object.entries(settings.tier_requirements).map(([tier, requirements]) => (
                                <div key={tier} style={styles.upgradeItem}>
                                    <div style={styles.upgradeHeader}>
                                        <span style={styles.tierIcon}>
                                            {tier === 'silver' ? '🥈' : '🥇'}
                                        </span>
                                        <span style={styles.tierName}>
                                            {tier.charAt(0).toUpperCase() + tier.slice(1)}
                                        </span>
                                    </div>
                                    <div style={styles.upgradeRequirements}>
                                        <div style={styles.requirementItem}>
                                            <label style={styles.requirementLabel}>Indicações:</label>
                                            <input
                                                type="number"
                                                value={requirements.min_referrals}
                                                onChange={(e) => updateTierRequirement(tier, 'min_referrals', e.target.value)}
                                                style={styles.requirementInput}
                                                min="0"
                                            />
                                        </div>
                                        <div style={styles.requirementItem}>
                                            <label style={styles.requirementLabel}>Conversões:</label>
                                            <input
                                                type="number"
                                                value={requirements.min_conversions}
                                                onChange={(e) => updateTierRequirement(tier, 'min_conversions', e.target.value)}
                                                style={styles.requirementInput}
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Seção: Metas de Bônus */}
                <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                        <h3 style={styles.sectionTitle}>
                            <IconComponent type="target" size="20px" />
                            Metas de Bônus
                        </h3>
                        <p style={styles.sectionDescription}>
                            Configure bônus especiais por performance
                        </p>
                        <button onClick={addBonusTarget} style={styles.addButton}>
                            <IconComponent type="plus" size="16px" />
                            Adicionar Meta
                        </button>
                    </div>
                    <div style={styles.sectionContent}>
                        {settings.bonus_targets.map((target, index) => (
                            <div key={index} style={styles.bonusItem}>
                                <div style={styles.bonusGrid}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Métrica:</label>
                                        <select
                                            value={target.metric}
                                            onChange={(e) => updateBonusTarget(index, 'metric', e.target.value)}
                                            style={styles.formSelect}
                                        >
                                            <option value="conversions">Conversões</option>
                                            <option value="referrals">Indicações</option>
                                            <option value="revenue">Receita</option>
                                        </select>
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Meta:</label>
                                        <input
                                            type="number"
                                            value={target.target}
                                            onChange={(e) => updateBonusTarget(index, 'target', e.target.value)}
                                            style={styles.formInput}
                                            min="0"
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Bônus (R$):</label>
                                        <input
                                            type="number"
                                            value={target.bonus_amount}
                                            onChange={(e) => updateBonusTarget(index, 'bonus_amount', e.target.value)}
                                            style={styles.formInput}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Período:</label>
                                        <select
                                            value={target.period}
                                            onChange={(e) => updateBonusTarget(index, 'period', e.target.value)}
                                            style={styles.formSelect}
                                        >
                                            <option value="monthly">Mensal</option>
                                            <option value="quarterly">Trimestral</option>
                                            <option value="annually">Anual</option>
                                        </select>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => removeBonusTarget(index)}
                                    style={styles.removeButton}
                                >
                                    <IconComponent type="trash" size="16px" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Seção: Configurações Gerais */}
                <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                        <h3 style={styles.sectionTitle}>
                            <IconComponent type="settings" size="20px" />
                            Configurações Gerais
                        </h3>
                        <p style={styles.sectionDescription}>
                            Configurações adicionais do sistema de parcerias
                        </p>
                    </div>
                    <div style={styles.sectionContent}>
                        <div style={styles.toggleGrid}>
                            <div style={styles.toggleItem}>
                                <div style={styles.toggleContent}>
                                    <h4 style={styles.toggleTitle}>Aprovação Automática</h4>
                                    <p style={styles.toggleDescription}>
                                        Aprovar automaticamente contadores e associações
                                    </p>
                                </div>
                                <button
                                    onClick={toggleAutoApproval}
                                    style={{
                                        ...styles.toggleButton,
                                        background: settings.auto_approval.enabled ? '#10b981' : '#e5e7eb'
                                    }}
                                >
                                    <div style={{
                                        ...styles.toggleSlider,
                                        transform: settings.auto_approval.enabled ? 'translateX(24px)' : 'translateX(2px)'
                                    }} />
                                </button>
                            </div>

                            <div style={styles.toggleItem}>
                                <div style={styles.toggleContent}>
                                    <h4 style={styles.toggleTitle}>Landing Pages Personalizadas</h4>
                                    <p style={styles.toggleDescription}>
                                        Permitir criação de páginas personalizadas por parceiro
                                    </p>
                                </div>
                                <button
                                    onClick={() => toggleMarketingFeature('custom_landing_pages')}
                                    style={{
                                        ...styles.toggleButton,
                                        background: settings.marketing_materials.custom_landing_pages ? '#10b981' : '#e5e7eb'
                                    }}
                                >
                                    <div style={{
                                        ...styles.toggleSlider,
                                        transform: settings.marketing_materials.custom_landing_pages ? 'translateX(24px)' : 'translateX(2px)'
                                    }} />
                                </button>
                            </div>

                            <div style={styles.toggleItem}>
                                <div style={styles.toggleContent}>
                                    <h4 style={styles.toggleTitle}>Links com Marca</h4>
                                    <p style={styles.toggleDescription}>
                                        Permitir links de afiliado personalizados
                                    </p>
                                </div>
                                <button
                                    onClick={() => toggleMarketingFeature('branded_links')}
                                    style={{
                                        ...styles.toggleButton,
                                        background: settings.marketing_materials.branded_links ? '#10b981' : '#e5e7eb'
                                    }}
                                >
                                    <div style={{
                                        ...styles.toggleSlider,
                                        transform: settings.marketing_materials.branded_links ? 'translateX(24px)' : 'translateX(2px)'
                                    }} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Estilos Premium alinhados com o design dos outros dashboards
// Estilos otimizados para modal
const styles = {
    container: { 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
        padding: '0',
        background: 'transparent',
        minHeight: 'auto'
    },
    header: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        padding: '0 0 20px 0',
        borderBottom: '2px solid #f3f4f6'
    },
    title: { 
        fontSize: '24px', 
        fontWeight: 'bold', 
        color: '#111827', 
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    subtitle: {
        fontSize: '14px',
        color: '#6b7280',
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
        padding: '8px 16px',
        background: '#f3f4f6',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
        color: '#374151',
        transition: 'all 0.2s ease'
    },
    saveButton: {
        background: '#10b981',
        color: 'white',
        border: '1px solid #10b981'
    },
    successMessage: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        background: '#dcfce7',
        color: '#16a34a',
        borderRadius: '8px',
        marginBottom: '20px',
        fontWeight: '500',
        fontSize: '14px'
    },
    settingsLayout: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    sectionCard: { 
        background: '#ffffff', 
        borderRadius: '12px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
    },
    sectionHeader: { 
        padding: '16px 20px 12px 20px', 
        borderBottom: '1px solid #f3f4f6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    sectionTitle: { 
        margin: 0, 
        fontSize: '16px', 
        fontWeight: '600', 
        color: '#111827',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    sectionDescription: {
        fontSize: '13px',
        color: '#6b7280',
        margin: '4px 0 0 0'
    },
    sectionContent: {
        padding: '20px'
    },
    addButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer'
    },
    tiersGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px'
    },
    tierItem: {
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #f3f4f6'
    },
    tierHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
    },
    tierIcon: {
        fontSize: '20px'
    },
    tierName: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#111827'
    },
    tierInputGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    tierInput: {
        flex: 1,
        padding: '6px 10px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 'bold',
        textAlign: 'center'
    },
    tierInputSuffix: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#6b7280'
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px'
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    },
    formLabel: {
        fontSize: '13px',
        fontWeight: '500',
        color: '#374151'
    },
    formInput: {
        padding: '8px 10px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '13px'
    },
    formSelect: {
        padding: '8px 10px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '13px',
        background: 'white'
    },
    upgradeGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
    },
    upgradeItem: {
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #f3f4f6'
    },
    upgradeHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
    },
    upgradeRequirements: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px'
    },
    requirementItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    },
    requirementLabel: {
        fontSize: '13px',
        fontWeight: '500',
        color: '#374151'
    },
    requirementInput: {
        padding: '6px 10px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '13px'
    },
    bonusItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #f3f4f6',
        marginBottom: '12px'
    },
    bonusGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '12px',
        flex: 1
    },
    removeButton: {
        padding: '6px',
        background: '#fee2e2',
        color: '#dc2626',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '12px'
    },
    toggleGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    toggleItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #f3f4f6'
    },
    toggleContent: {
        flex: 1
    },
    toggleTitle: {
        margin: '0 0 4px 0',
        fontSize: '14px',
        fontWeight: '600',
        color: '#111827'
    },
    toggleDescription: {
        margin: 0,
        fontSize: '13px',
        color: '#6b7280'
    },
    toggleButton: {
        position: 'relative',
        width: '44px',
        height: '22px',
        borderRadius: '11px',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.2s'
    },
    toggleSlider: {
        position: 'absolute',
        top: '2px',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: 'white',
        transition: 'transform 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
    }
};

export default PartnerSettings;