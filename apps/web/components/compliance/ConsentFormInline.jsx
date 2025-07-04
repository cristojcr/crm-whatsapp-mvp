// 🚀 ConsentFormInline.jsx - VERSÃO CORRIGIDA (sem campos inexistentes)
// 📁 SUBSTITUA: C:\Users\crist\crm-whatsapp-mvp\apps\web\components\compliance\ConsentFormInline.jsx

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configuração Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ConsentFormInline = ({ onComplete }) => {
    // Estados do formulário
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });

    const [consents, setConsents] = useState({
        marketing: { checked: true, required: false },
        analytics: { checked: true, required: false },
        cookies: { checked: true, required: true },
        data_processing: { checked: true, required: true },
        communication: { checked: true, required: false },
        third_party_sharing: { checked: false, required: false }
    });

    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Carregar dados do usuário e consentimentos existentes
    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
                // Carregar perfil do usuário
                const { data: profile } = await supabase
                    .from('users')
                    .select('name, email, phone')
                    .eq('email', session.user.email)
                    .single();

                if (profile) {
                    setFormData({
                        name: profile.name || '',
                        email: profile.email || session.user.email,
                        phone: profile.phone || ''
                    });

                    // Carregar consentimentos existentes
                    if (profile.email) {
                        await loadExistingConsents(profile.email);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Erro ao carregar dados do usuário:', error);
        }
    };

    const loadExistingConsents = async (email) => {
        try {
            const response = await fetch(`http://localhost:3001/api/consent-form/user/${encodeURIComponent(email)}`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.consents.length > 0) {
                    console.log(`✅ Carregados ${data.consents.length} consentimentos existentes`);
                    
                    // Atualizar estado com consentimentos existentes
                    const updatedConsents = { ...consents };
                    data.consents.forEach(consent => {
                        if (updatedConsents[consent.consent_type]) {
                            updatedConsents[consent.consent_type].checked = consent.consent_given;
                        }
                    });
                    setConsents(updatedConsents);
                }
            }
        } catch (error) {
            console.log('⚠️ Erro ao carregar consentimentos existentes:', error);
            // Continuar com valores padrão se não conseguir carregar
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleConsentChange = (consentType) => {
        setConsents(prev => ({
            ...prev,
            [consentType]: {
                ...prev[consentType],
                checked: !prev[consentType].checked
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validações
            if (!formData.email) {
                alert('Email é obrigatório');
                setLoading(false);
                return;
            }

            // Verificar consentimentos obrigatórios
            const requiredConsents = Object.entries(consents)
                .filter(([_, consent]) => consent.required && !consent.checked);
            
            if (requiredConsents.length > 0) {
                alert('Alguns consentimentos obrigatórios não foram marcados.');
                setLoading(false);
                return;
            }

            // Preparar dados para API (APENAS CAMPOS QUE EXISTEM!)
            const consentData = {
                user_info: {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone
                },
                consents: Object.entries(consents).map(([consentType, consent]) => ({
                    consent_type: consentType,
                    consent_given: consent.checked
                    // ❌ REMOVIDOS: additional_data, metadata, version
                }))
            };

            console.log('📤 Enviando dados para API:', consentData);

            // Salvar via API
            const response = await fetch('http://localhost:3001/api/consent-form/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(consentData)
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ Consentimentos salvos com sucesso!');
                setSubmitted(true);
                
                // Aguardar 2 segundos e redirecionar
                setTimeout(() => {
                    if (onComplete) {
                        onComplete();
                    } else {
                        window.location.href = '/dashboard/multicanal';
                    }
                }, 2000);
            } else {
                throw new Error(result.error || 'Erro ao salvar consentimentos');
            }

        } catch (error) {
            console.error('❌ Erro ao salvar consentimentos:', error);
            alert('Erro ao salvar consentimentos. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // Definições dos tipos de consentimento
    const consentDefinitions = {
        marketing: {
            title: 'Marketing e Comunicação',
            description: 'Receber ofertas, promoções e novidades por email, SMS ou WhatsApp',
            icon: '📢'
        },
        analytics: {
            title: 'Analytics e Melhorias',
            description: 'Análise de uso da plataforma para melhorar a experiência',
            icon: '📊'
        },
        cookies: {
            title: 'Cookies Funcionais',
            description: 'Cookies necessários para o funcionamento da plataforma',
            icon: '🍪'
        },
        data_processing: {
            title: 'Processamento de Dados',
            description: 'Processamento dos seus dados para prestação dos serviços',
            icon: '⚙️'
        },
        communication: {
            title: 'Comunicação de Serviço',
            description: 'Receber notificações importantes sobre sua conta e serviços',
            icon: '📧'
        },
        third_party_sharing: {
            title: 'Compartilhamento com Terceiros',
            description: 'Compartilhar dados com parceiros para melhorar os serviços',
            icon: '🤝'
        }
    };

    if (submitted) {
        return (
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">
                    Consentimentos Salvos!
                </h2>
                <p className="text-gray-600 mb-4">
                    Seus consentimentos foram registrados com sucesso no banco de dados.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-green-700 text-sm">
                        🔒 Dados protegidos conforme LGPD e GDPR
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
                <h2 className="text-2xl font-bold mb-2">🔒 Consentimentos LGPD/GDPR</h2>
                <p className="text-blue-100">
                    Configure suas preferências de privacidade e consentimentos
                </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Informações do Usuário */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">📋 Suas Informações</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome Completo
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Seu nome completo"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email *
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                placeholder="seu@email.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Telefone
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="(11) 99999-9999"
                        />
                    </div>
                </div>

                {/* Dica UX */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-700 text-sm">
                        💡 <strong>Dica:</strong> Todas as opções já estão marcadas para sua conveniência. 
                        Desmarque apenas o que não desejar.
                    </p>
                </div>

                {/* Consentimentos */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">⚙️ Seus Consentimentos</h3>
                    
                    <div className="space-y-3">
                        {Object.entries(consents).map(([consentType, consent]) => {
                            const definition = consentDefinitions[consentType];
                            return (
                                <div 
                                    key={consentType}
                                    className={`border rounded-lg p-4 ${
                                        consent.required 
                                            ? 'border-orange-200 bg-orange-50' 
                                            : 'border-gray-200 bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-start space-x-3">
                                        <input
                                            type="checkbox"
                                            id={consentType}
                                            checked={consent.checked}
                                            onChange={() => handleConsentChange(consentType)}
                                            disabled={consent.required}
                                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <div className="flex-1">
                                            <label 
                                                htmlFor={consentType}
                                                className="block text-sm font-medium text-gray-900 cursor-pointer"
                                            >
                                                {definition.icon} {definition.title}
                                                {consent.required && (
                                                    <span className="text-orange-600 ml-1">*</span>
                                                )}
                                            </label>
                                            <p className="text-xs text-gray-600 mt-1">
                                                {definition.description}
                                            </p>
                                            {consent.required && (
                                                <p className="text-xs text-orange-600 mt-1">
                                                    ⚠️ Obrigatório para funcionamento
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Botão de Submissão */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 px-4 rounded-md font-medium text-white ${
                            loading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300'
                        } transition-colors`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Salvando...
                            </span>
                        ) : (
                            '🚀 Confirmar e Continuar'
                        )}
                    </button>
                </div>

                {/* Informações Legais */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-600 leading-relaxed">
                        🛡️ <strong>Seus direitos:</strong> Você pode acessar, corrigir, excluir ou transferir seus dados a qualquer momento. 
                        Para exercer esses direitos, entre em contato conosco. 
                        Processamos seus dados conforme LGPD (Brasil) e GDPR (Europa).
                    </p>
                </div>
            </form>
        </div>
    );
};

export default ConsentFormInline;