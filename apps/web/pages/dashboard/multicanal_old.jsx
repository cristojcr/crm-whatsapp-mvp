// apps/web/pages/dashboard/multicanal.jsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MultiChannelDashboard from '@/components/dashboard/MultiChannelDashboard';
import ChannelSettings from '@/components/settings/ChannelSettings';
import { getCurrentUser, isAuthenticated } from '@/lib/supabase';

const MultiCanalPage = () => {
    const [currentView, setCurrentView] = useState('dashboard');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const authenticated = await isAuthenticated();
            if (!authenticated) {
                router.push('/login');
                return;
            }

            const currentUser = await getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            console.error('Erro verificando autenticação:', error);
            router.push('/login');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        return null; // Redirecionando...
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header de navegação */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <h1 className="text-xl font-bold text-gray-900">
                                    CRM Multicanal
                                </h1>
                            </div>
                            <div className="ml-6 flex space-x-8">
                                <button
                                    onClick={() => setCurrentView('dashboard')}
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                        currentView === 'dashboard'
                                            ? 'border-blue-500 text-gray-900'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    📊 Dashboard
                                </button>
                                <button
                                    onClick={() => setCurrentView('settings')}
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                        currentView === 'settings'
                                            ? 'border-blue-500 text-gray-900'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    ⚙️ Configurações
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <span className="text-sm text-gray-500">
                                    {user.email}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conteúdo principal */}
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    {currentView === 'dashboard' && <MultiChannelDashboard />}
                    {currentView === 'settings' && <ChannelSettings userId={user.id} />}
                </div>
            </div>

            {/* Footer informativo */}
            <div className="bg-white border-t">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            Sistema Multicanal - WhatsApp, Instagram, Telegram
                        </div>
                        <div className="text-sm text-gray-500">
                            ID 2.12 - FASE 5 Implementada ✅
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MultiCanalPage;