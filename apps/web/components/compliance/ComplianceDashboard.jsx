// apps/web/components/compliance/ComplianceDashboard.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ComplianceDashboard = ({ userId }) => {
    const [stats, setStats] = useState(null);
    const [windows, setWindows] = useState([]);
    const [queue, setQueue] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadComplianceData();
        const interval = setInterval(loadComplianceData, 30000); // Atualizar a cada 30s
        return () => clearInterval(interval);
    }, [userId]);

    const loadComplianceData = async () => {
        try {
            // Buscar estatísticas
            const statsResponse = await fetch('/api/compliance/stats');
            const statsData = await statsResponse.json();
            
            // Buscar janelas ativas
            const windowsResponse = await fetch('/api/compliance/windows');
            const windowsData = await windowsResponse.json();
            
            // Buscar fila
            const queueResponse = await fetch('/api/compliance/queue');
            const queueData = await queueResponse.json();
            
            // Buscar templates WhatsApp
            const templatesResponse = await fetch('/api/templates?channel_type=whatsapp');
            const templatesData = await templatesResponse.json();
            
            setStats(statsData.stats);
            setWindows(windowsData.windows || []);
            setQueue(queueData.queue || []);
            setTemplates(templatesData.templates || []);
            
        } catch (error) {
            console.error('Erro ao carregar dados de compliance:', error);
        } finally {
            setLoading(false);
        }
    };

    const syncTemplates = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/templates/sync/whatsapp', {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                alert(`✅ ${data.count} templates sincronizados!`);
                await loadComplianceData();
            } else {
                alert('❌ Erro ao sincronizar templates');
            }
        } catch (error) {
            alert('❌ Erro ao sincronizar templates');
        } finally {
            setLoading(false);
        }
    };

    const processQueue = async () => {
        try {
            const response = await fetch('/api/compliance/process-queue', {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                alert('✅ Fila processada!');
                await loadComplianceData();
            }
        } catch (error) {
            alert('❌ Erro ao processar fila');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Carregando dados de compliance...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">🚨 Compliance Dashboard</h1>
                <div className="flex gap-2">
                    <button
                        onClick={syncTemplates}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        🔄 Sincronizar Templates
                    </button>
                    <button
                        onClick={processQueue}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                        ⚡ Processar Fila
                    </button>
                </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                    <h3 className="text-lg font-semibold text-gray-700">Janelas Ativas</h3>
                    <p className="text-3xl font-bold text-green-600">{stats?.activeWindows || 0}</p>
                    <p className="text-sm text-gray-500">Conversas que podem receber mensagens</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
                    <h3 className="text-lg font-semibold text-gray-700">Mensagens na Fila</h3>
                    <p className="text-3xl font-bold text-yellow-600">{stats?.queuedMessages || 0}</p>
                    <p className="text-sm text-gray-500">Aguardando janela ou template</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                    <h3 className="text-lg font-semibold text-gray-700">Templates Enviados</h3>
                    <p className="text-3xl font-bold text-blue-600">{stats?.templateMessagesSent || 0}</p>
                    <p className="text-sm text-gray-500">Últimos 7 dias</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                    <h3 className="text-lg font-semibold text-gray-700">Taxa de Compliance</h3>
                    <p className="text-3xl font-bold text-purple-600">{stats?.complianceRate || 'N/A'}</p>
                    <p className="text-sm text-gray-500">Sempre 100% com o sistema</p>
                </div>
            </div>

            {/* Janelas Ativas */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">🔥 Janelas Ativas (24h)</h2>
                {windows.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhuma janela ativa no momento</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-2 text-left">Contato</th>
                                    <th className="px-4 py-2 text-left">Canal</th>
                                    <th className="px-4 py-2 text-left">Tempo Restante</th>
                                    <th className="px-4 py-2 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {windows.map((window) => (
                                    <tr key={window.id} className="border-t">
                                        <td className="px-4 py-2">
                                            {window.conversations?.contact_name || window.contact_phone}
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                window.channel_type === 'whatsapp' ? 'bg-green-100 text-green-800' :
                                                window.channel_type === 'instagram' ? 'bg-pink-100 text-pink-800' :
                                                'bg-blue-100 text-blue-800'
                                            }`}>
                                                {window.channel_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`font-semibold ${
                                                window.expires_soon ? 'text-red-600' : 'text-green-600'
                                            }`}>
                                                {window.remaining_hours?.toFixed(1)}h restantes
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            {window.expires_soon ? (
                                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                                                    ⚠️ Expira em breve
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                                    ✅ Ativa
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Fila de Mensagens */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">📋 Fila de Mensagens</h2>
                {queue.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhuma mensagem na fila</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-2 text-left">Contato</th>
                                    <th className="px-4 py-2 text-left">Canal</th>
                                    <th className="px-4 py-2 text-left">Tipo</th>
                                    <th className="px-4 py-2 text-left">Status</th>
                                    <th className="px-4 py-2 text-left">Criado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {queue.map((message) => (
                                    <tr key={message.id} className="border-t">
                                        <td className="px-4 py-2">
                                            {message.conversations?.contact_name || message.recipient_phone}
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                message.channel_type === 'whatsapp' ? 'bg-green-100 text-green-800' :
                                                message.channel_type === 'instagram' ? 'bg-pink-100 text-pink-800' :
                                                'bg-blue-100 text-blue-800'
                                            }`}>
                                                {message.channel_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">{message.message_type}</td>
                                        <td className="px-4 py-2">
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                                {message.queue_status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-500">
                                            {new Date(message.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Templates Aprovados */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">📨 Templates Aprovados</h2>
                {templates.length === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-gray-500 mb-4">Nenhum template aprovado encontrado</p>
                        <button
                            onClick={syncTemplates}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            🔄 Sincronizar Templates da Meta
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map((template) => (
                            <div key={template.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-gray-900">{template.template_name}</h3>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                        template.template_category === 'MARKETING' ? 'bg-purple-100 text-purple-800' :
                                        template.template_category === 'UTILITY' ? 'bg-blue-100 text-blue-800' :
                                        'bg-green-100 text-green-800'
                                    }`}>
                                        {template.template_category}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{template.body_text}</p>
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span>{template.template_language}</span>
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                        {template.template_status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComplianceDashboard;