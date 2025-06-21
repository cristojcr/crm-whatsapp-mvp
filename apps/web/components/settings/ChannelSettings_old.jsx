// apps/web/components/settings/ChannelSettings.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ChannelSettings = ({ userId }) => {
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
            const { data, error } = await supabase
                .from('user_channels')
                .select('*')
                .eq('user_id', userId);

            if (!error && data) {
                setChannels(data);
                if (data.length > 0 && !selectedChannel) {
                    setSelectedChannel(data[0]);
                    setConfig(data[0].channel_config || {});
                }
            }
        } catch (error) {
            console.error('Erro carregando canais:', error);
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
                // Atualizar o canal local
                const updatedChannels = channels.map(ch => 
                    ch.id === selectedChannel.id 
                        ? { ...ch, channel_config: config }
                        : ch
                );
                setChannels(updatedChannels);
                setSelectedChannel({ ...selectedChannel, channel_config: config });
                
                // Feedback visual
                alert('Configurações salvas com sucesso!');
            } else {
                alert('Erro ao salvar configurações');
            }
        } catch (error) {
            console.error('Erro salvando configurações:', error);
            alert('Erro ao salvar configurações');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleChannel = async (channelId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('user_channels')
                .update({ 
                    is_active: !currentStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', channelId);

            if (!error) {
                loadUserChannels(); // Recarregar lista
            }
        } catch (error) {
            console.error('Erro atualizando status do canal:', error);
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

    const renderChannelSpecificConfig = () => {
        if (!selectedChannel) return null;

        const { channel_type } = selectedChannel;

        switch (channel_type) {
            case 'telegram':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Token do Bot
                            </label>
                            <input
                                type="password"
                                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                                value={config.bot_token || ''}
                                onChange={(e) => handleChange('bot_token', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Obtido do @BotFather no Telegram
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Username do Bot
                            </label>
                            <input
                                type="text"
                                placeholder="@meubot"
                                value={config.bot_username || ''}
                                onChange={(e) => handleChange('bot_username', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Webhook URL
                            </label>
                            <input
                                type="text"
                                value={`${process.env.NEXT_PUBLIC_API_URL}/api/webhook/telegram/${userId}`}
                                readOnly
                                className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Configure esta URL no seu bot Telegram
                            </p>
                        </div>
                    </div>
                );

            case 'instagram':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Access Token
                            </label>
                            <input
                                type="password"
                                placeholder="EAABwz..."
                                value={config.access_token || ''}
                                onChange={(e) => handleChange('access_token', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Token de acesso do Instagram Business API
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Instagram Business Account ID
                            </label>
                            <input
                                type="text"
                                placeholder="17841405793..."
                                value={config.business_account_id || ''}
                                onChange={(e) => handleChange('business_account_id', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Webhook URL
                            </label>
                            <input
                                type="text"
                                value={`${process.env.NEXT_PUBLIC_API_URL}/api/webhook/instagram/${userId}`}
                                readOnly
                                className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Configure esta URL no Facebook Developer Console
                            </p>
                        </div>
                    </div>
                );

            case 'whatsapp':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                WhatsApp Business Account ID
                            </label>
                            <input
                                type="text"
                                placeholder="123456789"
                                value={config.business_account_id || ''}
                                onChange={(e) => handleChange('business_account_id', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Access Token
                            </label>
                            <input
                                type="password"
                                placeholder="EAABwz..."
                                value={config.access_token || ''}
                                onChange={(e) => handleChange('access_token', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone Number ID
                            </label>
                            <input
                                type="text"
                                placeholder="123456789"
                                value={config.phone_number_id || ''}
                                onChange={(e) => handleChange('phone_number_id', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Webhook URL
                            </label>
                            <input
                                type="text"
                                value={`${process.env.NEXT_PUBLIC_API_URL}/api/webhook/whatsapp/${userId}`}
                                readOnly
                                className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Configure esta URL no Meta Business Manager
                            </p>
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="text-center py-8 text-gray-500">
                        Configurações específicas para este canal não disponíveis.
                    </div>
                );
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Configurações de Canais</h2>
                <p className="text-gray-600 mt-1">
                    Gerencie suas integrações com diferentes plataformas de messaging.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lista de canais */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">Meus Canais</h3>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {channels.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">
                                    Nenhum canal configurado
                                </div>
                            ) : (
                                channels.map(channel => (
                                    <div
                                        key={channel.id}
                                        className={`p-4 cursor-pointer hover:bg-gray-50 ${
                                            selectedChannel?.id === channel.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                                        }`}
                                        onClick={() => handleChannelSelect(channel)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-xl">
                                                    {getChannelIcon(channel.channel_type)}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {getChannelName(channel.channel_type)}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {channel.is_active ? 'Ativo' : 'Inativo'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleChannel(channel.id, channel.is_active);
                                                    }}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                        channel.is_active ? 'bg-blue-600' : 'bg-gray-200'
                                                    }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                            channel.is_active ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Configurações do canal selecionado */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow">
                        {selectedChannel ? (
                            <>
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">
                                            {getChannelIcon(selectedChannel.channel_type)}
                                        </span>
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900">
                                                {getChannelName(selectedChannel.channel_type)}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                Configure as credenciais e configurações específicas
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {renderChannelSpecificConfig()}

                                    <div className="mt-6 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setConfig(selectedChannel.channel_config || {})}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {saving ? 'Salvando...' : 'Salvar Configurações'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="p-6 text-center text-gray-500">
                                Selecione um canal para configurar
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChannelSettings;