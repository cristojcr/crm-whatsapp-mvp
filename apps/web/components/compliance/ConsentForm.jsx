// 🚀 ConsentForm.jsx - CONECTADO COM APIS SUPABASE (PASSO 4.3)
// 📍 Arquivo: apps/web/components/compliance/ConsentForm.jsx

import React, { useState, useEffect } from 'react';

const ConsentForm = ({ isOpen, onClose, userEmail, userName, userPhone }) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loadingExisting, setLoadingExisting] = useState(false);
    const [alert, setAlert] = useState(null);
    const [formData, setFormData] = useState({
        name: userName || '',
        email: userEmail || '',
        phone: userPhone || ''
    });

    // Estado dos consentimentos
    const [consents, setConsents] = useState({
        marketing: { given: false, observations: '' },
        analytics: { given: false, observations: '' },
        cookies: { given: true, observations: '' }, // Obrigatório por padrão
        data_processing: { given: true, observations: '' }, // Obrigatório por padrão
        data_sharing: { given: false, observations: '' },
        profiling: { given: false, observations: '' }
    });

    // Configuração dos tipos de consentimento
    const consentTypes = {
        marketing: {
            label: 'Marketing e Comunicações',
            description: 'Receber ofertas, promoções e newsletters por email, SMS ou WhatsApp',
            required: false,
            legalBasis: 'consent',
            badge: 'Opcional',
            badgeColor: 'bg-blue-100 text-blue-800'
        },
        analytics: {
            label: 'Análise e Métricas',
            description: 'Análise de comportamento para melhorar nossos serviços',
            required: false,
            legalBasis: 'legitimate_interest',
            badge: 'Opcional',
            badgeColor: 'bg-green-100 text-green-800'
        },
        cookies: {
            label: 'Cookies Essenciais',
            description: 'Cookies necessários para funcionamento básico da plataforma',
            required: true,
            legalBasis: 'legitimate_interest',
            badge: 'Obrigatório',
            badgeColor: 'bg-red-100 text-red-800'
        },
        data_processing: {
            label: 'Processamento de Dados',
            description: 'Processar seus dados para prestação dos serviços contratados',
            required: true,
            legalBasis: 'contract',
            badge: 'Obrigatório',
            badgeColor: 'bg-red-100 text-red-800'
        },
        data_sharing: {
            label: 'Compartilhamento de Dados',
            description: 'Compartilhar dados com parceiros para melhorar a experiência',
            required: false,
            legalBasis: 'consent',
            badge: 'Opcional',
            badgeColor: 'bg-yellow-100 text-yellow-800'
        },
        profiling: {
            label: 'Perfilização e Segmentação',
            description: 'Criar perfis personalizados baseados no seu comportamento',
            required: false,
            legalBasis: 'consent',
            badge: 'Opcional',
            badgeColor: 'bg-purple-100 text-purple-800'
        }
    };

    // 🔄 CARREGAR CONSENTIMENTOS EXISTENTES
    const loadExistingConsents = async () => {
        if (!formData.email) return;

        setLoadingExisting(true);
        try {
            const response = await fetch(`http://localhost:3001/api/consent-form/user/${encodeURIComponent(formData.email)}`);
            const data = await response.json();

            if (response.ok && data.consents && data.consents.length > 0) {
                console.log('✅ Consentimentos existentes carregados:', data.consents);
                
                // Atualizar estado com consentimentos existentes
                const updatedConsents = { ...consents };
                data.consents.forEach(consent => {
                    if (updatedConsents[consent.consent_type]) {
                        updatedConsents[consent.consent_type] = {
                            given: consent.consent_given,
                            observations: consent.additional_data?.observations || ''
                        };
                    }
                });
                setConsents(updatedConsents);
                
                setAlert({
                    type: 'info',
                    message: `✅ Carregados ${data.consents.length} consentimentos existentes`
                });
            }
        } catch (error) {
            console.error('❌ Erro ao carregar consentimentos:', error);
            setAlert({
                type: 'warning',
                message: '⚠️ Não foi possível carregar consentimentos existentes'
            });
        } finally {
            setLoadingExisting(false);
        }
    };

    // 🚀 SALVAR CONSENTIMENTOS VIA API
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validação
        if (!formData.name || !formData.email) {
            setAlert({
                type: 'error',
                message: '❌ Nome e email são obrigatórios'
            });
            return;
        }

        // Verificar consentimentos obrigatórios
        const requiredConsents = Object.keys(consentTypes).filter(key => consentTypes[key].required);
        const missingRequired = requiredConsents.filter(key => !consents[key].given);
        
        if (missingRequired.length > 0) {
            setAlert({
                type: 'error',
                message: '❌ Consentimentos obrigatórios devem ser aceitos'
            });
            return;
        }

        setSubmitting(true);
        setAlert(null);

        try {
            // Preparar dados para envio
            const payload = {
                user_info: {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone
                },
                consents: Object.entries(consents).map(([type, data]) => ({
                    consent_type: type,
                    consent_given: data.given,
                    purpose: consentTypes[type].description,
                    legal_basis: consentTypes[type].legalBasis,
                    additional_data: {
                        observations: data.observations
                    }
                }))
            };

            console.log('📤 Enviando consentimentos via API:', payload);

            const response = await fetch('http://localhost:3001/api/consent-form/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                console.log('✅ Consentimentos salvos no Supabase:', result);
                setAlert({
                    type: 'success',
                    message: `✅ ${result.consents_saved} consentimentos salvos com sucesso no banco de dados!`
                });

                // Fechar modal após 2 segundos
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                throw new Error(result.error || 'Erro ao salvar consentimentos');
            }

        } catch (error) {
            console.error('❌ Erro ao salvar consentimentos:', error);
            setAlert({
                type: 'error',
                message: `❌ Erro: ${error.message}`
            });
        } finally {
            setSubmitting(false);
        }
    };

    // 🚫 REVOGAR TODOS OS CONSENTIMENTOS
    const handleRevokeAll = async () => {
        if (!formData.email) {
            setAlert({
                type: 'error',
                message: '❌ Email é obrigatório para revogar consentimentos'
            });
            return;
        }

        const reason = prompt('Motivo da revogação (opcional):');
        
        setSubmitting(true);
        try {
            const response = await fetch(`http://localhost:3001/api/consent-form/user/${encodeURIComponent(formData.email)}/revoke-all`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            const result = await response.json();

            if (response.ok) {
                console.log('✅ Consentimentos revogados:', result);
                
                // Atualizar estado local
                const revokedConsents = { ...consents };
                Object.keys(revokedConsents).forEach(key => {
                    if (!consentTypes[key].required) {
                        revokedConsents[key].given = false;
                    }
                });
                setConsents(revokedConsents);

                setAlert({
                    type: 'success',
                    message: `✅ ${result.revoked_consents} consentimentos revogados`
                });
            } else {
                throw new Error(result.error || 'Erro ao revogar consentimentos');
            }

        } catch (error) {
            console.error('❌ Erro ao revogar consentimentos:', error);
            setAlert({
                type: 'error',
                message: `❌ Erro: ${error.message}`
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Carregar consentimentos existentes quando email mudar
    useEffect(() => {
        if (formData.email && formData.email.includes('@')) {
            loadExistingConsents();
        }
    }, [formData.email]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
                    <h2 className="text-2xl font-bold mb-2">🔒 Consentimentos LGPD/GDPR</h2>
                    <p className="text-blue-100">
                        Gerencie seus consentimentos de dados pessoais conforme LGPD (Brasil) e GDPR (Europa)
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {/* Informações do Usuário */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">📋 Informações Pessoais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome Completo *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                {loadingExisting && (
                                    <p className="text-sm text-blue-600 mt-1">🔄 Carregando consentimentos...</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Telefone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Alertas */}
                    {alert && (
                        <div className={`mb-4 p-4 rounded-md ${
                            alert.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                            alert.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                            alert.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                            'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                            {alert.message}
                        </div>
                    )}

                    {/* Consentimentos */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">✅ Consentimentos</h3>
                        <div className="space-y-4">
                            {Object.entries(consentTypes).map(([key, config]) => (
                                <div key={key} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                                    <div className="flex items-start space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={consents[key].given}
                                            onChange={(e) => setConsents({
                                                ...consents,
                                                [key]: { ...consents[key], given: e.target.checked }
                                            })}
                                            disabled={config.required}
                                            className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium text-gray-900">{config.label}</h4>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.badgeColor}`}>
                                                    {config.badge}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">{config.description}</p>
                                            <p className="text-xs text-gray-500">
                                                Base legal: {config.legalBasis === 'consent' ? 'Consentimento (LGPD Art. 7º, I)' : 
                                                            config.legalBasis === 'contract' ? 'Execução de contrato (LGPD Art. 7º, V)' :
                                                            'Interesse legítimo (LGPD Art. 7º, IX)'}
                                            </p>
                                            
                                            {/* Campo de observações */}
                                            <textarea
                                                value={consents[key].observations}
                                                onChange={(e) => setConsents({
                                                    ...consents,
                                                    [key]: { ...consents[key], observations: e.target.value }
                                                })}
                                                placeholder="Observações ou condições específicas (opcional)"
                                                className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                                rows="2"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Informações Legais */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">⚖️ Seus Direitos (LGPD/GDPR)</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• <strong>Acesso:</strong> Solicitar cópia dos seus dados</li>
                            <li>• <strong>Correção:</strong> Corrigir dados incompletos ou incorretos</li>
                            <li>• <strong>Exclusão:</strong> Solicitar apagamento dos seus dados</li>
                            <li>• <strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
                            <li>• <strong>Revogação:</strong> Retirar consentimento a qualquer momento</li>
                        </ul>
                    </div>

                    {/* Botões */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-md hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {submitting ? '🔄 Salvando...' : '✅ Salvar Consentimentos'}
                        </button>
                        
                        <button
                            type="button"
                            onClick={handleRevokeAll}
                            disabled={submitting}
                            className="bg-red-600 text-white py-3 px-6 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            🚫 Revogar Todos
                        </button>
                        
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="bg-gray-500 text-white py-3 px-6 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            ❌ Cancelar
                        </button>
                    </div>

                    {/* Status da Conexão */}
                    <div className="mt-4 text-center">
                        <p className="text-sm text-gray-500">
                            🔐 Dados protegidos e salvos no banco Supabase com criptografia
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ConsentForm;