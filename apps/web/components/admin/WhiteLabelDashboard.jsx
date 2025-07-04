import React, { useState, useEffect } from 'react';

// Ícones premium - seguindo padrão do MultiChannelDashboard
const IconComponent = ({ type, size = "16px" }) => {
    const icons = {
        palette: '🎨',
        settings: '⚙️',
        eye: '👁️',
        upload: '📤',
        save: '💾',
        preview: '👀',
        dollarSign: '💰',
        users: '👥',
        check: '✅',
        edit: '✏️',
        refresh: '🔄',
        download: '📥',
        globe: '🌐',
        mail: '📧',
        phone: '📞',
        image: '🖼️',
        star: '⭐',
        trending: '📈',
        shield: '🛡️'
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

const WhiteLabelDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [settings, setSettings] = useState({
        company_name: '',
        subdomain: '',
        logo_url: null,
        primary_color: '#667eea',
        secondary_color: '#764ba2',
        accent_color: '#06b6d4',
        support_email: '',
        support_phone: '',
        is_active: false,
        setup_completed: false
    });
    const [pricing, setPricing] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [metrics, setMetrics] = useState({
        totalRevenue: 15420,
        activeClients: 12,
        conversionRate: 68
    });

    useEffect(() => {
        loadWhiteLabelData();
    }, []);

    const loadWhiteLabelData = async () => {
        try {
            setLoading(true);
            
            // Simular carregamento
            setTimeout(() => {
                setSettings({
                    ...settings,
                    company_name: 'Minha Empresa',
                    subdomain: 'minhaempresa',
                    setup_completed: true,
                    is_active: true
                });
                setPricing([
                    { plan_code: 'basic', partner_price: 97 },
                    { plan_code: 'pro', partner_price: 159 },
                    { plan_code: 'premium', partner_price: 219 }
                ]);
                setLoading(false);
            }, 1500);

        } catch (error) {
            console.error('Erro ao carregar dados white label:', error);
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            // Simular salvamento
            setTimeout(() => {
                setSaving(false);
                alert('✅ Configurações salvas com sucesso!');
            }, 1000);
        } catch (error) {
            console.error('Erro ao salvar:', error);
            setSaving(false);
        }
    };

    const handleSetPrice = async (planCode, price) => {
        try {
            // Simular configuração de preço
            const updatedPricing = pricing.map(p => 
                p.plan_code === planCode ? { ...p, partner_price: parseFloat(price) } : p
            );
            setPricing(updatedPricing);
            alert(`✅ Preço do plano ${planCode.toUpperCase()} configurado!`);
        } catch (error) {
            console.error('Erro ao configurar preço:', error);
        }
    };

    const tabs = [
        { id: 'overview', label: 'Dashboard', icon: 'trending' },
        { id: 'branding', label: 'Branding', icon: 'palette' },
        { id: 'pricing', label: 'Pricing', icon: 'dollarSign' },
        { id: 'customers', label: 'Clients', icon: 'users' },
        { id: 'settings', label: 'Settings', icon: 'settings' }
    ];

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
            {/* Header Premium */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>🚀 White Label System</h1>
                    <p style={styles.subtitle}>Transforme sua marca em uma plataforma completa</p>
                </div>
                <div style={styles.headerActions}>
                    <button style={styles.headerButton} onClick={loadWhiteLabelData}>
                        <IconComponent type="refresh" size="16px" />
                        <span>Sincronizar</span>
                    </button>
                    <button style={styles.previewButton} onClick={() => window.open(settings.subdomain ? `https://${settings.subdomain}.crm.com` : '#', '_blank')}>
                        <IconComponent type="globe" size="16px" />
                        <span>Preview Live</span>
                    </button>
                </div>
            </div>

            {/* Status Card Premium */}
            <div style={styles.statusCard}>
                <div style={styles.statusContent}>
                    <div style={styles.statusInfo}>
                        <div style={styles.statusHeader}>
                            <IconComponent type="shield" size="24px" />
                            <div>
                                <h3 style={styles.statusTitle}>Status da Plataforma</h3>
                                <p style={styles.statusText}>
                                    {settings.setup_completed ? '🟢 Sistema ativo e funcionando' : '🟡 Configuração pendente'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div style={styles.statusActions}>
                        {settings.subdomain && (
                            <div style={styles.subdomainInfo}>
                                <div style={styles.subdomainBadge}>
                                    <IconComponent type="globe" size="16px" />
                                    <span>{settings.subdomain}.crm.com</span>
                                </div>
                                <p style={styles.subdomainDescription}>Sua plataforma white label</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs Navigation Premium */}
            <div style={styles.tabsContainer}>
                <div style={styles.tabsNav}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                ...styles.tab,
                                ...(activeTab === tab.id ? styles.tabActive : {})
                            }}
                        >
                            <IconComponent type={tab.icon} size="18px" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div style={styles.tabContent}>
                {activeTab === 'overview' && <OverviewTab settings={settings} pricing={pricing} metrics={metrics} />}
                {activeTab === 'branding' && <BrandingTab settings={settings} setSettings={setSettings} onSave={handleSaveSettings} saving={saving} />}
                {activeTab === 'pricing' && <PricingTab pricing={pricing} onSetPrice={handleSetPrice} />}
                {activeTab === 'customers' && <CustomersTab />}
                {activeTab === 'settings' && <SettingsTab settings={settings} setSettings={setSettings} onSave={handleSaveSettings} saving={saving} />}
            </div>
        </div>
    );
};

// Componente Overview Tab Premium
const OverviewTab = ({ settings, pricing, metrics }) => (
    <div>
        {/* Métricas Premium */}
        <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
                <p style={styles.metricLabel}>RECEITA TOTAL</p>
                <div style={styles.metricValue}>
                    <span>R$ {metrics.totalRevenue.toLocaleString('pt-BR')}</span>
                    <span style={styles.metricIcon}>💰</span>
                </div>
                <p style={styles.metricGrowth}>↗️ +24.3% este mês</p>
            </div>
            <div style={styles.metricCard}>
                <p style={styles.metricLabel}>CLIENTES ATIVOS</p>
                <div style={styles.metricValue}>
                    <span>{metrics.activeClients}</span>
                    <span style={styles.metricIcon}>👥</span>
                </div>
                <p style={styles.metricGrowth}>↗️ +18.7% hoje</p>
            </div>
            <div style={styles.metricCard}>
                <p style={styles.metricLabel}>TAXA CONVERSÃO</p>
                <div style={styles.metricValue}>
                    <span>{metrics.conversionRate}%</span>
                    <span style={styles.metricIcon}>📊</span>
                </div>
                <p style={styles.metricGrowth}>↗️ +12.1% essa semana</p>
            </div>
        </div>

        {/* Layout Duas Colunas */}
        <div style={styles.twoColumnLayout}>
            <div style={styles.sectionCard}>
                <div style={styles.sectionHeader}>
                    <h3 style={styles.sectionTitle}>🎨 Configuração da Marca</h3>
                </div>
                <div style={styles.overviewContent}>
                    <div style={styles.overviewItem}>
                        <div style={styles.overviewIcon}>🏢</div>
                        <div>
                            <strong>Nome da Empresa</strong>
                            <p>{settings.company_name || 'Não configurado'}</p>
                        </div>
                        <div style={settings.company_name ? styles.statusActive : styles.statusInactive}>
                            {settings.company_name ? '✅' : '⚠️'}
                        </div>
                    </div>
                    <div style={styles.overviewItem}>
                        <div style={styles.overviewIcon}>🌐</div>
                        <div>
                            <strong>Subdomínio</strong>
                            <p>{settings.subdomain || 'Não configurado'}</p>
                        </div>
                        <div style={settings.subdomain ? styles.statusActive : styles.statusInactive}>
                            {settings.subdomain ? '✅' : '⚠️'}
                        </div>
                    </div>
                </div>
            </div>

            <div style={styles.sectionCard}>
                <div style={styles.sectionHeader}>
                    <h3 style={styles.sectionTitle}>💰 Planos Configurados</h3>
                </div>
                <div style={styles.overviewContent}>
                    {pricing.length > 0 ? pricing.map(plan => (
                        <div key={plan.plan_code} style={styles.planOverviewItem}>
                            <div style={styles.planInfo}>
                                <strong>{plan.plan_code.toUpperCase()}</strong>
                                <p>R$ {plan.partner_price}/mês</p>
                            </div>
                            <div style={styles.planBadge}>
                                <IconComponent type="check" size="16px" />
                            </div>
                        </div>
                    )) : (
                        <p style={styles.emptyState}>Nenhum plano configurado</p>
                    )}
                </div>
            </div>
        </div>
    </div>
);

// Componente Branding Tab Premium
const BrandingTab = ({ settings, setSettings, onSave, saving }) => (
    <div style={styles.twoColumnLayout}>
        <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>🎨 Identidade Visual</h3>
            </div>
            <div style={styles.formContent}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Nome da Empresa</label>
                    <input
                        type="text"
                        style={styles.input}
                        value={settings.company_name}
                        onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                        placeholder="Digite o nome da sua empresa"
                    />
                </div>
                
                <div style={styles.formGroup}>
                    <label style={styles.label}>Subdomínio Personalizado</label>
                    <div style={styles.inputGroup}>
                        <input
                            type="text"
                            style={styles.input}
                            value={settings.subdomain}
                            onChange={(e) => setSettings({...settings, subdomain: e.target.value.toLowerCase()})}
                            placeholder="minha-empresa"
                        />
                        <span style={styles.inputSuffix}>.crm.com</span>
                    </div>
                    <small style={styles.helpText}>Será acessível em: https://{settings.subdomain || 'minha-empresa'}.crm.com</small>
                </div>

                <div style={styles.colorSection}>
                    <h4 style={styles.colorSectionTitle}>Paleta de Cores</h4>
                    <div style={styles.colorGrid}>
                        <div style={styles.colorGroup}>
                            <label style={styles.colorLabel}>Primária</label>
                            <div style={styles.colorInputContainer}>
                                <input
                                    type="color"
                                    style={styles.colorInput}
                                    value={settings.primary_color}
                                    onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                                />
                                <span style={styles.colorCode}>{settings.primary_color}</span>
                            </div>
                        </div>
                        
                        <div style={styles.colorGroup}>
                            <label style={styles.colorLabel}>Secundária</label>
                            <div style={styles.colorInputContainer}>
                                <input
                                    type="color"
                                    style={styles.colorInput}
                                    value={settings.secondary_color}
                                    onChange={(e) => setSettings({...settings, secondary_color: e.target.value})}
                                />
                                <span style={styles.colorCode}>{settings.secondary_color}</span>
                            </div>
                        </div>
                        
                        <div style={styles.colorGroup}>
                            <label style={styles.colorLabel}>Destaque</label>
                            <div style={styles.colorInputContainer}>
                                <input
                                    type="color"
                                    style={styles.colorInput}
                                    value={settings.accent_color}
                                    onChange={(e) => setSettings({...settings, accent_color: e.target.value})}
                                />
                                <span style={styles.colorCode}>{settings.accent_color}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>👀 Preview em Tempo Real</h3>
            </div>
            <div style={styles.previewContent}>
                <div style={{
                    ...styles.previewContainer,
                    background: `linear-gradient(135deg, ${settings.primary_color} 0%, ${settings.secondary_color} 100%)`
                }}>
                    <div style={styles.previewHeader}>
                        <h3 style={styles.previewTitle}>{settings.company_name || 'Sua Empresa'}</h3>
                        <div style={{...styles.previewButton, background: settings.accent_color}}>
                            Acessar Plataforma
                        </div>
                    </div>
                    <div style={styles.previewCard}>
                        <p>Este é um preview de como sua plataforma aparecerá para os clientes</p>
                        <div style={{...styles.previewAccent, background: settings.accent_color}}></div>
                    </div>
                </div>
                
                <button 
                    onClick={onSave} 
                    disabled={saving}
                    style={{...styles.saveButton, opacity: saving ? 0.6 : 1}}
                >
                    <IconComponent type="save" size="18px" />
                    <span>{saving ? 'Salvando...' : 'Salvar Configurações'}</span>
                </button>
            </div>
        </div>
    </div>
);

// Componente Pricing Tab Premium
const PricingTab = ({ pricing, onSetPrice }) => {
    const [tempPrices, setTempPrices] = useState({
        basic: '',
        pro: '',
        premium: ''
    });

    const planDetails = { 
        basic: { name: 'BÁSICO', basePrice: 87, features: ['WhatsApp', 'IA Básica', '1000 mensagens'] },
        pro: { name: 'PRO', basePrice: 149, features: ['Multi-canal', 'IA Avançada', '5000 mensagens'] },
        premium: { name: 'PREMIUM', basePrice: 199, features: ['Tudo incluído', 'IA Premium', 'Ilimitado'] }
    };

    return (
        <div>
            <div style={styles.pricingHeader}>
                <h3 style={styles.pricingTitle}>💰 Configure Seus Preços</h3>
                <p style={styles.pricingSubtitle}>Defina sua margem de lucro para cada plano</p>
            </div>
            
            <div style={styles.pricingGrid}>
                {Object.entries(planDetails).map(([planCode, details]) => {
                    const configuredPrice = pricing.find(p => p.plan_code === planCode);
                    const isConfigured = !!configuredPrice;
                    
                    return (
                        <div key={planCode} style={{
                            ...styles.pricingCard,
                            border: isConfigured ? '2px solid #10b981' : '1px solid #e5e7eb'
                        }}>
                            <div style={styles.planHeader}>
                                <h4 style={styles.planName}>{details.name}</h4>
                                {isConfigured && <div style={styles.configuredBadge}>✅ Configurado</div>}
                            </div>
                            
                            <div style={styles.priceSection}>
                                <div style={styles.priceInfo}>
                                    <span style={styles.priceLabel}>Preço Base</span>
                                    <span style={styles.basePrice}>R$ {details.basePrice}</span>
                                </div>
                                <div style={styles.priceInfo}>
                                    <span style={styles.priceLabel}>Seu Preço</span>
                                    <span style={styles.yourPrice}>
                                        R$ {configuredPrice?.partner_price || details.basePrice}
                                    </span>
                                </div>
                                {configuredPrice && (
                                    <div style={styles.marginInfo}>
                                        Margem: R$ {configuredPrice.partner_price - details.basePrice}
                                    </div>
                                )}
                            </div>

                            <div style={styles.featuresList}>
                                {details.features.map((feature, idx) => (
                                    <div key={idx} style={styles.featureItem}>
                                        <IconComponent type="check" size="14px" />
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={styles.priceInputSection}>
                                <input
                                    type="number"
                                    style={styles.priceInput}
                                    placeholder={`Mín: R$ ${details.basePrice}`}
                                    value={tempPrices[planCode]}
                                    onChange={(e) => setTempPrices({...tempPrices, [planCode]: e.target.value})}
                                />
                                <button 
                                    onClick={() => {
                                        if (tempPrices[planCode] && parseFloat(tempPrices[planCode]) >= details.basePrice) {
                                            onSetPrice(planCode, tempPrices[planCode]);
                                            setTempPrices({...tempPrices, [planCode]: ''});
                                        } else {
                                            alert(`❌ Preço deve ser maior que R$ ${details.basePrice}`);
                                        }
                                    }}
                                    style={styles.setPriceButton}
                                >
                                    <IconComponent type="dollarSign" size="16px" />
                                    Definir
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Componente Customers Tab Premium
const CustomersTab = () => (
    <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>👥 Gestão de Clientes White Label</h3>
        </div>
        <div style={styles.comingSoonContent}>
            <div style={styles.comingSoonIcon}>🚀</div>
            <h4 style={styles.comingSoonTitle}>Em Desenvolvimento</h4>
            <p style={styles.comingSoonText}>
                A gestão completa de clientes white label estará disponível em breve.
                Aqui você poderá visualizar e gerenciar todos os seus clientes.
            </p>
            <div style={styles.comingSoonFeatures}>
                <div style={styles.featureItem}>
                    <IconComponent type="users" size="16px" />
                    <span>Lista de clientes ativos</span>
                </div>
                <div style={styles.featureItem}>
                    <IconComponent type="dollarSign" size="16px" />
                    <span>Receita por cliente</span>
                </div>
                <div style={styles.featureItem}>
                    <IconComponent type="trending" size="16px" />
                    <span>Analytics detalhados</span>
                </div>
            </div>
        </div>
    </div>
);

// Componente Settings Tab Premium
const SettingsTab = ({ settings, setSettings, onSave, saving }) => (
    <div style={styles.twoColumnLayout}>
        <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>📧 Configurações de Suporte</h3>
            </div>
            <div style={styles.formContent}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Email de Suporte</label>
                    <input
                        type="email"
                        style={styles.input}
                        value={settings.support_email}
                        onChange={(e) => setSettings({...settings, support_email: e.target.value})}
                        placeholder="suporte@suaempresa.com"
                    />
                </div>
                
                <div style={styles.formGroup}>
                    <label style={styles.label}>Telefone de Suporte</label>
                    <input
                        type="tel"
                        style={styles.input}
                        value={settings.support_phone}
                        onChange={(e) => setSettings({...settings, support_phone: e.target.value})}
                        placeholder="(11) 99999-9999"
                    />
                </div>

                <div style={styles.toggleGroup}>
                    <div style={styles.toggleContainer}>
                        <label style={styles.toggleLabel}>
                            <input
                                type="checkbox"
                                checked={settings.is_active}
                                onChange={(e) => setSettings({...settings, is_active: e.target.checked})}
                                style={styles.checkbox}
                            />
                            <div style={styles.toggleText}>
                                <strong>Sistema White Label Ativo</strong>
                                <p>Permite que clientes acessem sua plataforma personalizada</p>
                            </div>
                        </label>
                        <div style={{
                            ...styles.toggleIndicator,
                            background: settings.is_active ? '#10b981' : '#ef4444'
                        }}>
                            {settings.is_active ? '🟢' : '🔴'}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>🛡️ Status do Sistema</h3>
            </div>
            <div style={styles.statusContent}>
                <div style={styles.systemStatus}>
                    <div style={styles.statusItem}>
                        <IconComponent type="globe" size="20px" />
                        <div>
                            <strong>Subdomínio</strong>
                            <p>{settings.subdomain ? `${settings.subdomain}.crm.com` : 'Não configurado'}</p>
                        </div>
                        <div style={settings.subdomain ? styles.statusActive : styles.statusInactive}>
                            {settings.subdomain ? '✅' : '⚠️'}
                        </div>
                    </div>
                    
                    <div style={styles.statusItem}>
                        <IconComponent type="palette" size="20px" />
                        <div>
                            <strong>Branding</strong>
                            <p>{settings.company_name ? 'Configurado' : 'Pendente'}</p>
                        </div>
                        <div style={settings.company_name ? styles.statusActive : styles.statusInactive}>
                            {settings.company_name ? '✅' : '⚠️'}
                        </div>
                    </div>
                    
                    <div style={styles.statusItem}>
                        <IconComponent type="shield" size="20px" />
                        <div>
                            <strong>Sistema</strong>
                            <p>{settings.is_active ? 'Ativo' : 'Inativo'}</p>
                        </div>
                        <div style={settings.is_active ? styles.statusActive : styles.statusInactive}>
                            {settings.is_active ? '✅' : '❌'}
                        </div>
                    </div>
                </div>

                <button 
                    onClick={onSave} 
                    disabled={saving}
                    style={{...styles.saveButton, opacity: saving ? 0.6 : 1}}
                >
                    <IconComponent type="save" size="18px" />
                    <span>{saving ? 'Salvando...' : 'Salvar Todas Configurações'}</span>
                </button>
            </div>
        </div>
    </div>
);

// Estilos Premium - seguindo padrão do MultiChannelDashboard
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
        color: '#667eea',
        transition: 'all 0.2s ease'
    },
    previewButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        border: 'none',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        color: 'white',
        transition: 'all 0.2s ease'
    },
    statusCard: {
        background: 'rgba(255, 255, 255, 0.95)', 
        borderRadius: '20px', 
        marginBottom: '24px', 
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
    },
    statusContent: {
        padding: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    statusHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    statusTitle: {
        margin: '0 0 8px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#111827'
    },
    statusText: {
        margin: 0,
        fontSize: '14px',
        color: '#6b7280'
    },
    subdomainInfo: {
        textAlign: 'right'
    },
    subdomainBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '8px'
    },
    subdomainDescription: {
        margin: 0,
        fontSize: '12px',
        color: '#6b7280'
    },
    tabsContainer: {
        marginBottom: '24px'
    },
    tabsNav: {
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px',
        padding: '8px',
        gap: '4px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px)'
    },
    tab: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        background: 'transparent',
        border: 'none',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        color: '#6b7280',
        transition: 'all 0.2s ease'
    },
    tabActive: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
    },
    tabContent: {
        minHeight: '400px'
    },
    // Métricas Premium
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
        marginBottom: '8px',
        margin: '12px 0 8px 0'
    },
    metricIcon: { 
        fontSize: '24px', 
        color: '#9ca3af' 
    },
    metricGrowth: { 
        fontSize: '13px', 
        color: '#10b981', 
        fontWeight: '500',
        margin: 0
    },
    // Layout duas colunas
    twoColumnLayout: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '30px' 
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
    overviewContent: {
        padding: '24px'
    },
    overviewItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '12px',
        marginBottom: '16px'
    },
    overviewIcon: {
        fontSize: '24px',
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    statusActive: {
        color: '#10b981',
        fontSize: '20px'
    },
    statusInactive: {
        color: '#ef4444',
        fontSize: '20px'
    },
    planOverviewItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '12px',
        marginBottom: '12px'
    },
    planInfo: {
        display: 'flex',
        flexDirection: 'column'
    },
    planBadge: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: '#10b981',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
    },
    // Formulários
    formContent: {
        padding: '24px'
    },
    formGroup: {
        marginBottom: '20px'
    },
    label: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#374151',
        marginBottom: '8px',
        display: 'block'
    },
    input: {
        width: '100%',
        padding: '12px 16px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '14px',
        background: 'white',
        boxSizing: 'border-box'
    },
    inputGroup: {
        display: 'flex',
        alignItems: 'center'
    },
    inputSuffix: {
        padding: '12px 16px',
        background: '#f9fafb',
        border: '1px solid #d1d5db',
        borderLeft: 'none',
        borderRadius: '0 8px 8px 0',
        fontSize: '14px',
        color: '#6b7280'
    },
    helpText: {
        fontSize: '12px',
        color: '#6b7280',
        marginTop: '4px'
    },
    // Cores
    colorSection: {
        marginTop: '32px'
    },
    colorSectionTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#111827',
        marginBottom: '16px'
    },
    colorGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px'
    },
    colorGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    colorLabel: {
        fontSize: '12px',
        fontWeight: '500',
        color: '#6b7280',
        textTransform: 'uppercase'
    },
    colorInputContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    colorInput: {
        width: '100%',
        height: '40px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        cursor: 'pointer'
    },
    colorCode: {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#6b7280',
        textAlign: 'center'
    },
    // Preview
    previewContent: {
        padding: '24px'
    },
    previewContainer: {
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        color: 'white'
    },
    previewHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
    },
    previewTitle: {
        fontSize: '24px',
        fontWeight: 'bold',
        margin: 0
    },
    previewButton: {
        padding: '8px 16px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '14px',
        fontWeight: '500'
    },
    previewCard: {
        background: 'rgba(255, 255, 255, 0.9)',
        color: '#111827',
        padding: '20px',
        borderRadius: '12px',
        position: 'relative'
    },
    previewAccent: {
        width: '40px',
        height: '4px',
        borderRadius: '2px',
        marginTop: '12px'
    },
    // Pricing
    pricingHeader: {
        marginBottom: '32px',
        textAlign: 'center'
    },
    pricingTitle: {
        fontSize: '24px',
        fontWeight: '600',
        color: 'white',
        margin: '0 0 8px 0'
    },
    pricingSubtitle: {
        fontSize: '16px',
        color: 'rgba(255, 255, 255, 0.8)',
        margin: 0
    },
    pricingGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px'
    },
    pricingCard: {
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px)'
    },
    planHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
    },
    planName: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#111827',
        margin: 0
    },
    configuredBadge: {
        padding: '4px 12px',
        background: '#10b981',
        color: 'white',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500'
    },
    priceSection: {
        marginBottom: '20px'
    },
    priceInfo: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
    },
    priceLabel: {
        fontSize: '14px',
        color: '#6b7280'
    },
    basePrice: {
        fontSize: '16px',
        fontWeight: '500',
        color: '#9ca3af'
    },
    yourPrice: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#111827'
    },
    marginInfo: {
        padding: '8px 12px',
        background: '#f0fdf4',
        color: '#166534',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '500',
        textAlign: 'center'
    },
    featuresList: {
        marginBottom: '20px'
    },
    featureItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
        fontSize: '14px',
        color: '#6b7280'
    },
    priceInputSection: {
        display: 'flex',
        gap: '8px'
    },
    priceInput: {
        flex: 1,
        padding: '8px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '14px'
    },
    setPriceButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '500',
        cursor: 'pointer'
    },
    // Settings
    toggleGroup: {
        marginTop: '24px'
    },
    toggleContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '12px'
    },
    toggleLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer'
    },
    checkbox: {
        width: '16px',
        height: '16px'
    },
    toggleText: {
        display: 'flex',
        flexDirection: 'column'
    },
    toggleIndicator: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px'
    },
    systemStatus: {
        marginBottom: '24px'
    },
    statusItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '12px',
        marginBottom: '12px'
    },
    // Botões
    saveButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    },
    // Coming Soon
    comingSoonContent: {
        padding: '60px 24px',
        textAlign: 'center'
    },
    comingSoonIcon: {
        fontSize: '48px',
        marginBottom: '16px'
    },
    comingSoonTitle: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#111827',
        marginBottom: '8px'
    },
    comingSoonText: {
        fontSize: '14px',
        color: '#6b7280',
        marginBottom: '24px',
        maxWidth: '400px',
        margin: '0 auto 24px auto'
    },
    comingSoonFeatures: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '300px',
        margin: '0 auto'
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
    }
};

export default WhiteLabelDashboard;