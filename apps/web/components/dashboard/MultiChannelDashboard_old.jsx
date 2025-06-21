// apps/web/components/dashboard/MultiChannelDashboard.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const MultiChannelDashboard = () => {
    const [selectedChannel, setSelectedChannel] = useState('all');
    const [channels, setChannels] = useState({});
    const [metrics, setMetrics] = useState({});
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, [selectedChannel]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            
            // Buscar canais do usuário
            const { data: userChannels, error: channelsError } = await supabase
                .from('user_channels')
                .select('*')
                .eq('is_active', true);

            if (!channelsError && userChannels) {
                const channelsMap = {};
                userChannels.forEach(channel => {
                    channelsMap[channel.id] = {
                        id: channel.id,
                        name: getChannelDisplayName(channel.channel_type),
                        type: channel.channel_type,
                        status: channel.is_active ? 'Ativo' : 'Inativo'
                    };
                });
                setChannels(channelsMap);
            }

            // Buscar métricas por canal
            const { data: statsData, error: statsError } = await supabase
                .from('channel_daily_stats')
                .select('*')
                .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

            if (!statsError && statsData) {
                const metricsMap = {};
                statsData.forEach(stat => {
                    if (!metricsMap[stat.channel]) {
                        metricsMap[stat.channel] = {
                            total_messages: 0,
                            active_conversations: 0,
                            response_rate: 0
                        };
                    }
                    metricsMap[stat.channel].total_messages += (stat.incoming_messages || 0) + (stat.outgoing_messages || 0);
                });
                setMetrics(metricsMap);
            }

            // Buscar conversas baseado no canal selecionado
            let conversationsQuery = supabase
                .from('conversations')
                .select(`
                    *,
                    contacts(name, phone)
                `)
                .order('updated_at', { ascending: false })
                .limit(10);

            if (selectedChannel !== 'all') {
                conversationsQuery = conversationsQuery.eq('channel_type', selectedChannel);
            }

            const { data: conversationsData, error: conversationsError } = await conversationsQuery;

            if (!conversationsError && conversationsData) {
                const formattedConversations = conversationsData.map(conv => ({
                    id: conv.id,
                    contact_name: conv.contacts?.name || conv.contacts?.phone || 'Contato Anônimo',
                    last_message: conv.last_message || 'Sem mensagens',
                    updated_at: conv.updated_at,
                    channel_type: conv.channel_type,
                    unread_count: conv.unread_count || 0
                }));
                setConversations(formattedConversations);
            }

        } catch (error) {
            console.error('Erro carregando dados do dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getChannelDisplayName = (channelType) => {
        const names = {
            'whatsapp': 'WhatsApp',
            'instagram': 'Instagram',
            'telegram': 'Telegram'
        };
        return names[channelType] || channelType;
    };

    const getChannelMetrics = (channelId) => {
        if (channelId === 'all') {
            // Agregar métricas de todos os canais
            return Object.values(metrics).reduce((total, channelMetrics) => ({
                total_messages: (total.total_messages || 0) + (channelMetrics.total_messages || 0),
                active_conversations: (total.active_conversations || 0) + (channelMetrics.active_conversations || 0),
                response_rate: ((total.response_rate || 0) + (channelMetrics.response_rate || 0)) / 2
            }), {});
        }
        return metrics[channelId] || {};
    };

    const getChannelIcon = (channelType) => {
        const icons = {
            'whatsapp': '📱',
            'instagram': '📸', 
            'telegram': '✈️'
        };
        return icons[channelType] || '💬';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const currentMetrics = getChannelMetrics(selectedChannel);

    return (
        <div className="space-y-6">
            {/* Header com seletor de canal */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-gray-900">
                    Dashboard Multicanal
                </h1>
                <div className="mt-4 sm:mt-0">
                    <select
                        value={selectedChannel}
                        onChange={(e) => setSelectedChannel(e.target.value)}
                        className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">Todos os canais</option>
                        {Object.entries(channels).map(([id, channel]) => (
                            <option key={id} value={channel.type}>
                                {getChannelIcon(channel.type)} {channel.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Cards de métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total de Mensagens</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {currentMetrics.total_messages || 0}
                            </p>
                        </div>
                        <div className="text-blue-600">
                            💬
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Conversas Ativas</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {conversations.length}
                            </p>
                        </div>
                        <div className="text-green-600">
                            👥
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Taxa de Resposta</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {Math.round(currentMetrics.response_rate || 0)}%
                            </p>
                        </div>
                        <div className="text-yellow-600">
                            📊
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de canais ativos */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Canais Configurados</h3>
                </div>
                <div className="p-6">
                    {Object.keys(channels).length === 0 ? (
                        <p className="text-gray-500 text-center py-4">
                            Nenhum canal configurado ainda.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.values(channels).map(channel => (
                                <div key={channel.id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-2xl">
                                                {getChannelIcon(channel.type)}
                                            </span>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {channel.name}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {channel.status}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Lista de conversas recentes */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                        Conversas Recentes
                        {selectedChannel !== 'all' && (
                            <span className="text-sm font-normal text-gray-500 ml-2">
                                - {getChannelDisplayName(selectedChannel)}
                            </span>
                        )}
                    </h3>
                </div>
                <div className="divide-y divide-gray-200">
                    {conversations.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                            Nenhuma conversa encontrada.
                        </p>
                    ) : (
                        conversations.map(conversation => (
                            <div key={conversation.id} className="p-6 hover:bg-gray-50 cursor-pointer">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="text-xl">
                                            {getChannelIcon(conversation.channel_type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {conversation.contact_name}
                                            </p>
                                            <p className="text-sm text-gray-500 truncate max-w-xs">
                                                {conversation.last_message}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">
                                            {new Date(conversation.updated_at).toLocaleDateString('pt-BR')}
                                        </p>
                                        {conversation.unread_count > 0 && (
                                            <span className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                                {conversation.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default MultiChannelDashboard;