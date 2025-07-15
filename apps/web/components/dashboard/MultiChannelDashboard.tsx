import React, { useState, useEffect } from 'react';
import { Users, Plus, Calendar, Phone, Mail, X, Edit3, Trash2, Clock, MapPin, Star, Settings, User, Shield, LogOut } from 'lucide-react';
import ProductDashboard from '../products/ProductDashboard';
import ChannelSettings from '../settings/ChannelSettings';
import ProfessionalDashboard from '../professionals/ProfessionalDashboard';
import ConsentFormDashboard from '../consent/ConsentFormDashboard';
import { supabase } from '../../lib/supabase'; // ✅ Ajustar caminho se necessário

// Nomes e Cores para cada canal
const getChannelName = (type) => {
    const names = { 
        whatsapp: 'WhatsApp', 
        instagram: 'Instagram', 
        telegram: 'Telegram' 
    };
    return names[type] || type;
};

const getChannelColor = (type) => {
    const colors = { 
        whatsapp: '#25D366', 
        instagram: '#E1306C', 
        telegram: '#0088CC' 
    };
    return colors[type] || '#6c757d';
};

// Ícones para cada canal
const ChannelIcon = ({ type }) => {
    const icons = {
        whatsapp: '📱',
        instagram: '📸',
        telegram: '✈️'
    };
    return <span style={{ fontSize: '20px', lineHeight: 1 }}>{icons[type] || '💬'}</span>;
};

// ✅ COMPONENTE PRINCIPAL
const MultiChannelDashboard = ({ channels = [], loading = false, user = null, onLogout = null, onChannelsUpdate = null }) => {
    // Estados do dashboard
    const [selectedChannel, setSelectedChannel] = useState('all');
    const [activeTab, setActiveTab] = useState('multicanal');
    const [previousTab, setPreviousTab] = useState('multicanal');

    // ✨ NOVO: Estado para notificações
    const [notifications, setNotifications] = useState([]);

    // Estados dos profissionais
    const [professionals, setProfessionals] = useState([]);
    const [planLimits, setPlanLimits] = useState({ current: 0, max: 1, plan: 'BASIC' });
    const [professionalStats, setProfessionalStats] = useState({
        totalProfessionals: 0,
        totalAppointments: 0,
        monthlyGrowth: 0
    });
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [professionalsLoading, setProfessionalsLoading] = useState(false);
    const [selectedProfessional, setSelectedProfessional] = useState(null);
    
    // Estados do Google Calendar
    const [calendarStatus, setCalendarStatus] = useState({});
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    
    // Estado para controle de conexão
    const [connectionStatus, setConnectionStatus] = useState('checking');
    
    const [newProfessional, setNewProfessional] = useState({
        name: '',
        email: '',
        phone: '',
        specialty: '',
        google_calendar_email: '',
        bio: '',
        hourly_rate: ''
    });

    // ✅ MÉTRICAS REAIS DO SUPABASE (ÚNICA DEFINIÇÃO)
    const [metrics, setMetrics] = useState({
        totalMessages: 0,        
        activeConversations: 0,  
        responseRate: 0         
    });

    const [conversations, setConversations] = useState([
        { id: 1, name: 'João Silva', message: 'Olá, preciso agendar uma consulta', channel: 'whatsapp', unread: 2, date: '20/06/2025' },
        { id: 2, name: 'Maria Santos', message: 'Qual o valor do tratamento?', channel: 'instagram', unread: 1, date: '20/06/2025' },
        { id: 3, name: 'Pedro Costa', message: 'Obrigado pelo atendimento!', channel: 'telegram', unread: 0, date: '20/06/2025' },
    ]);

    // ✨ NOVO: FUNÇÕES DO SISTEMA DE NOTIFICAÇÃO
    const addNotification = (message, type = 'success') => {
        const id = Date.now();
        const notification = {
            id,
            message,
            type, // 'success', 'error', 'warning', 'info'
            timestamp: Date.now()
        };
        
        setNotifications(prev => [...prev, notification]);
        
        // Auto-remover após 4 segundos
        setTimeout(() => {
            removeNotification(id);
        }, 4000);
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
    };

    // ✨ NOVO: COMPONENTE DE NOTIFICAÇÃO INDIVIDUAL
    const NotificationItem = ({ notification, onRemove }) => {
        const getNotificationColor = (type) => {
            const colors = {
                success: '#00A693', // Verde do tema
                error: '#FF6B6B',   // Vermelho
                warning: '#FFB020', // Amarelo
                info: '#6D4AFF'     // Roxo do tema
            };
            return colors[type] || colors.info;
        };

        const getNotificationIcon = (type) => {
            const icons = {
                success: '✅',
                error: '❌', 
                warning: '⚠️',
                info: 'ℹ️'
            };
            return icons[type] || icons.info;
        };

        return (
            <div style={{
                background: 'rgba(255, 255, 255, 0.85)', // Glass morphism como os cards
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${getNotificationColor(notification.type)}`,
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: `
                    inset 0 1px 0 rgba(255, 255, 255, 0.4),
                    0 4px 20px rgba(0, 0, 0, 0.1)
                `,
                animation: 'slideInFromRight 0.3s ease-out',
                maxWidth: '400px',
                minWidth: '280px'
            }}>
                {/* Ícone */}
                <div style={{
                    fontSize: '16px',
                    flexShrink: 0
                }}>
                    {getNotificationIcon(notification.type)}
                </div>
                
                {/* Mensagem */}
                <div style={{
                    flex: 1,
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#2c2c2c',
                    lineHeight: '1.3'
                }}>
                    {notification.message}
                </div>
                
                {/* Botão fechar */}
                <button
                    onClick={() => onRemove(notification.id)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#666',
                        fontSize: '18px',
                        padding: '0',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(0, 0, 0, 0.1)';
                        e.target.style.color = '#333';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'none';
                        e.target.style.color = '#666';
                    }}
                >
                    ×
                </button>
            </div>
        );
    };

    // ✨ NOVO: CONTAINER DE NOTIFICAÇÕES
    const NotificationContainer = ({ notifications, onRemove }) => {
        if (notifications.length === 0) return null;

        return (
            <div style={{
            position: 'fixed',
            top: '50%',           // ← MEIO VERTICAL
            left: '50%',          // ← MEIO HORIZONTAL  
            transform: 'translate(-50%, -50%)', // ← CENTRALIZAR
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'  // ← CENTRALIZADO
            }}>
                {notifications.map(notification => (
                    <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onRemove={onRemove}
                    />
                ))}
            </div>
        );
    };

    // ✅ SISTEMA DE CORES PROTON VPN
    const protonColors = {
        purple: '#6D4AFF',
        green: '#00A693',
        darkBg: '#1C1B1F',
        glassWhite: 'rgba(255, 255, 255, 0.15)',
        glassBorder: 'rgba(255, 255, 255, 0.2)',
        scalabotsPurple: '#8B5CF6'
    };

    // ✅ ESTILOS PROTON VPN
    const protonStyles = {
        mainContainer: {
            minHeight: '100vh',
            background: `linear-gradient(135deg, ${protonColors.scalabotsPurple} 0%, ${protonColors.purple} 25%, ${protonColors.darkBg} 75%, #16213e 100%)`,
            display: 'flex',
            flexDirection: 'column',
            padding: '10px 20px 20x 20px', // ✨ PADDING BOTTOM MAIOR (era 20px)
            gap: '16px',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            position: 'relative',
            overflow: 'hidden'
        },
        headerContainer: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '0px',
            zIndex: 10
        },
        contentContainer: {
            display: 'flex',
            gap: '16px',
            flex: 1,
            maxHeight: 'calc(100vh - 89px)', // ✨ ALTURA MÁXIMA LIMITADA
            minHeight: '500px' // ✨ ALTURA MÍNIMA PARA GARANTIR ESPAÇO
        },
        backgroundOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.1,
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
            pointerEvents: 'none'
        },
        leftSidebar: {
            width: '280px',
            background: protonColors.glassWhite,
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: `1px solid ${protonColors.glassBorder}`,
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'relative',
            zIndex: 10,
            boxSizing: 'border-box',
            overflowY: 'auto',
            overflowX: 'hidden',
            // ✨ CHAVES PARA MOSTRAR BORDAS INFERIORES:
            maxHeight: '100%', // ✨ NÃO ULTRAPASSAR O CONTAINER PAI
            paddingBottom: '28px' // ✨ ESPAÇO INTERNO EXTRA EMBAIXO
        },
        mainContent: {
            flex: 1,
            background: protonColors.glassWhite,
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: `1px solid ${protonColors.glassBorder}`,
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            padding: '32px',
            position: 'relative',
            zIndex: 10,
            boxSizing: 'border-box',
            overflowY: 'auto',
            overflowX: 'hidden',
            // ✨ CHAVES PARA MOSTRAR BORDAS INFERIORES:
            maxHeight: '100%', // ✨ NÃO ULTRAPASSAR O CONTAINER PAI
            paddingBottom: '36px' // ✨ ESPAÇO INTERNO EXTRA EMBAIXO
        },
        rightSidebar: {
            width: '80px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            position: 'relative',
            zIndex: 10
        },
        navButton: {
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${protonColors.glassBorder}`,
            borderRadius: '12px',
            padding: '16px',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            fontWeight: '500',
            textAlign: 'left',
            width: '100%'
        },
        navButtonActive: {
            background: `linear-gradient(135deg, ${protonColors.purple} 0%, ${protonColors.green} 100%)`,
            boxShadow: `0 4px 20px rgba(109, 74, 255, 0.3)`,
            transform: 'translateY(-1px)'
        },
        navButtonHover: {
            background: 'rgba(255, 255, 255, 0.18)',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
        },
        sidebarButton: {
            width: '48px',
            height: '48px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${protonColors.glassBorder}`,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            color: 'white'
        },
        sidebarButtonHover: {
            background: 'rgba(255, 255, 255, 0.18)',
            transform: 'translateX(-2px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
        },
        sectionTitle: {
            color: 'white',
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '24px',
            letterSpacing: '-0.02em'
        },
        contentCard: {
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid rgba(255, 255, 255, 0.15)`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px'
        },
        planBanner: {
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid rgba(255, 255, 255, 0.3)`,
            borderRadius: '14px',
            padding: '16px 20px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 16px rgba(255, 255, 255, 0.1)'
        },
        planInfo: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        planText: {
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.98)',
            fontSize: '14px'
        },
        planSubtext: {
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.8)',
            marginTop: '2px'
        }
    };

    // ✅ FUNÇÕES DO SUPABASE
    const getCurrentUserId = () => {
        const token = getAuthToken();
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.sub || payload.user_id;
            } catch (error) {
                console.error('❌ Erro ao extrair user_id do token:', error);
            }
        }
        console.warn('⚠️ User ID não encontrado');
        return null;
    };

    const loadTotalMessages = async () => {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                console.warn('⚠️ User ID não encontrado para carregar mensagens');
                return 0;
            }

            console.log('📊 Buscando total de mensagens para user:', userId);
            
            const { count, error } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (error) {
                console.error('❌ Erro ao buscar mensagens:', error);
                return 0;
            }

            console.log('✅ Total de mensagens encontradas:', count);
            return count || 0;

        } catch (error) {
            console.error('❌ Erro inesperado ao carregar mensagens:', error);
            return 0;
        }
    };

    const loadActiveConversations = async () => {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                console.warn('⚠️ User ID não encontrado para carregar conversas');
                return 0;
            }

            console.log('💬 Buscando conversas ativas para user:', userId);
            
            const { count, error } = await supabase
                .from('conversations')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'active');

            if (error) {
                console.error('❌ Erro ao buscar conversas ativas:', error);
                return 0;
            }

            console.log('✅ Conversas ativas encontradas:', count);
            return count || 0;

        } catch (error) {
            console.error('❌ Erro inesperado ao carregar conversas:', error);
            return 0;
        }
    };

    const loadResponseRate = async () => {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                console.warn('⚠️ User ID não encontrado para calcular taxa de resposta');
                return 0;
            }

            console.log('📈 Calculando taxa de resposta para user:', userId);

            // ✅ CONTAR MENSAGENS DE CONTATOS (RECEBIDAS)
            const { count: contactMessages } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('sender_type', 'contact');

            // ✅ CONTAR MENSAGENS DE ASSISTENTE (ENVIADAS)
            const { count: assistantMessages } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('sender_type', 'assistant');

            console.log(`📨 Mensagens recebidas (contact): ${contactMessages}`);
            console.log(`🤖 Mensagens enviadas (assistant): ${assistantMessages}`);

            // ✅ CALCULAR TAXA CORRETA
            if (!contactMessages || contactMessages === 0) {
                console.log('📊 Nenhuma mensagem de contato, taxa = 0%');
                return 0;
            }

            const responseRate = Math.round((assistantMessages / contactMessages) * 100);
            console.log('✅ Taxa de resposta calculada:', responseRate + '%');
            
            return responseRate;

        } catch (error) {
            console.error('❌ Erro inesperado ao calcular taxa de resposta:', error);
            return 0;
        }
    };

    // ✅ ADICIONAR ESTAS FUNÇÕES DE DEBUG NO MULTICHANNELDASHBOARD.TSX
    // COLAR ANTES DA FUNÇÃO loadRealMetrics()

    // 🔍 FUNÇÃO DE DEBUG COMPLETO
    const debugSupabaseData = async () => {
        console.log('🔍 =================== DEBUG SUPABASE ===================');
        
        // 1. VERIFICAR USER ID
        const userId = getCurrentUserId();
        console.log('👤 [DEBUG] User ID encontrado:', userId);
        
        if (!userId) {
            console.log('❌ [DEBUG] SEM USER ID - VERIFICANDO TOKEN...');
            const token = getAuthToken();
            console.log('🔑 [DEBUG] Token encontrado:', token ? 'SIM' : 'NÃO');
            
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    console.log('📋 [DEBUG] Payload do token:', payload);
                    console.log('🆔 [DEBUG] Possíveis user_id no token:');
                    console.log('   - payload.sub:', payload.sub);
                    console.log('   - payload.user_id:', payload.user_id);
                    console.log('   - payload.id:', payload.id);
                } catch (error) {
                    console.log('❌ [DEBUG] Erro ao decodificar token:', error);
                }
            }
            return;
        }

        // 2. VERIFICAR TODAS AS MENSAGENS NA TABELA (SEM FILTRO)
        console.log('\n📊 [DEBUG] VERIFICANDO TABELA MESSAGES...');
        
        try {
            const { data: allMessages, error: allError, count: totalCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact' })
                .limit(10); // Apenas primeiras 10 para debug

            if (allError) {
                console.log('❌ [DEBUG] Erro ao buscar mensagens:', allError);
                return;
            }

            console.log('📈 [DEBUG] Total de mensagens na tabela:', totalCount);
            console.log('📋 [DEBUG] Primeiras 10 mensagens:', allMessages);

            if (allMessages && allMessages.length > 0) {
                console.log('\n🔍 [DEBUG] ANALISANDO PRIMEIRAS MENSAGENS:');
                allMessages.forEach((msg, index) => {
                    console.log(`   Mensagem ${index + 1}:`);
                    console.log(`     - ID: ${msg.id}`);
                    console.log(`     - User ID: ${msg.user_id}`);
                    console.log(`     - Conteúdo: ${msg.content?.substring(0, 50)}...`);
                    console.log(`     - Canal: ${msg.channel_type}`);
                    console.log(`     - Data: ${msg.created_at}`);
                    console.log(`     - Sender: ${msg.sender_type}`);
                    console.log('     ---');
                });
            }

            // 3. VERIFICAR MENSAGENS DO SEU USER ID
            console.log('\n👤 [DEBUG] VERIFICANDO MENSAGENS DO SEU USER ID...');
            
            const { data: userMessages, error: userError, count: userCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact' })
                .eq('user_id', userId)
                .limit(5);

            if (userError) {
                console.log('❌ [DEBUG] Erro ao buscar mensagens do usuário:', userError);
            } else {
                console.log('📊 [DEBUG] Mensagens do seu user_id:', userCount);
                console.log('📋 [DEBUG] Suas mensagens:', userMessages);
            }

            // 4. VERIFICAR MENSAGENS POR CANAL
            console.log('\n📱 [DEBUG] VERIFICANDO MENSAGENS POR CANAL...');
            
            for (const channel of ['telegram', 'whatsapp', 'instagram']) {
                const { count: channelCount } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('channel_type', channel);
                    
                console.log(`   ${channel}: ${channelCount || 0} mensagens`);
            }

            // 5. VERIFICAR USER_IDS ÚNICOS
            console.log('\n🆔 [DEBUG] VERIFICANDO USER_IDS ÚNICOS NA TABELA...');
            
            const { data: uniqueUsers } = await supabase
                .from('messages')
                .select('user_id')
                .limit(20);
                
            if (uniqueUsers) {
                const userIds = [...new Set(uniqueUsers.map(m => m.user_id))];
                console.log('👥 [DEBUG] User IDs encontrados na tabela:', userIds);
                console.log('🎯 [DEBUG] Seu user_id está na lista?', userIds.includes(userId) ? 'SIM ✅' : 'NÃO ❌');
            }

        } catch (error) {
            console.log('❌ [DEBUG] Erro geral no debug:', error);
        }

        console.log('🔍 ================= FIM DEBUG SUPABASE =================\n');
    };

    // 🔍 FUNÇÃO DE DEBUG ESPECÍFICA PARA CONVERSAS
    const debugConversations = async () => {
        console.log('💬 =================== DEBUG CONVERSAS ===================');
        
        const userId = getCurrentUserId();
        if (!userId) {
            console.log('❌ [DEBUG] Sem user ID para debug de conversas');
            return;
        }

        try {
            // Verificar todas as conversas
            const { data: allConversations, count: totalConversations } = await supabase
                .from('conversations')
                .select('*', { count: 'exact' })
                .limit(10);

            console.log('📊 [DEBUG] Total de conversas na tabela:', totalConversations);
            console.log('📋 [DEBUG] Primeiras conversas:', allConversations);

            // Verificar conversas do usuário
            const { data: userConversations, count: userConversationsCount } = await supabase
                .from('conversations')
                .select('*', { count: 'exact' })
                .eq('user_id', userId);

            console.log('👤 [DEBUG] Conversas do seu user_id:', userConversationsCount);
            console.log('📋 [DEBUG] Suas conversas:', userConversations);

            // Verificar status das conversas
            if (userConversations && userConversations.length > 0) {
                console.log('\n📈 [DEBUG] STATUS DAS SUAS CONVERSAS:');
                const statusCounts = {};
                userConversations.forEach(conv => {
                    statusCounts[conv.status] = (statusCounts[conv.status] || 0) + 1;
                });
                console.log('📊 [DEBUG] Status counts:', statusCounts);
            }

        } catch (error) {
            console.log('❌ [DEBUG] Erro no debug de conversas:', error);
        }

        console.log('💬 ================= FIM DEBUG CONVERSAS =================\n');
    };

    // ✅ MODIFICAR A FUNÇÃO loadRealMetrics PARA INCLUIR DEBUG
    const loadRealMetricsWithDebug = async () => {
        console.log('🚀 [MÉTRICAS] Iniciando carregamento com DEBUG...');
        
        // ✨ EXECUTAR DEBUG PRIMEIRO
        await debugSupabaseData();
        await debugConversations();
        
        // Depois executar carregamento normal
        try {
            const [totalMessages, activeConversations, responseRate] = await Promise.all([
                loadTotalMessages(),
                loadActiveConversations(), 
                loadResponseRate()
            ]);

            const realMetrics = {
                totalMessages,
                activeConversations,
                responseRate
            };

            console.log('✅ [MÉTRICAS] Dados reais carregados:', realMetrics);
            setMetrics(realMetrics);
            
            return realMetrics;

        } catch (error) {
            console.error('❌ [MÉTRICAS] Erro ao carregar métricas reais:', error);
            const fallbackMetrics = { totalMessages: 0, activeConversations: 0, responseRate: 0 };
            setMetrics(fallbackMetrics);
            return fallbackMetrics;
        }
    };

    async function debugResponseRate() {
    try {
        console.log('🔍 =================== DEBUG TAXA DE RESPOSTA ===================');
        
        const userId = await getCurrentUserId();
        console.log('👤 [DEBUG] User ID:', userId);

        // 1. CONTAR MENSAGENS POR SENDER_TYPE
        const { data: messagesByType, error: typesError } = await supabase
            .from('messages')
            .select('sender_type')
            .eq('user_id', userId);

        if (typesError) {
            console.error('❌ Erro buscando tipos:', typesError);
            return;
        }

        // Agrupar por sender_type
        const typeCounts = {};
        messagesByType.forEach(msg => {
            const type = msg.sender_type || 'unknown';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        console.log('📊 [DEBUG] Mensagens por tipo:', typeCounts);

        // 2. CONTAR MENSAGENS DE CONTATOS (RECEBIDAS)
        const { count: contactMessages } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('sender_type', 'contact');

        console.log('📨 [DEBUG] Mensagens de contatos (recebidas):', contactMessages);

        // 3. CONTAR MENSAGENS DE ASSISTENTE (ENVIADAS)
        const { count: assistantMessages } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('sender_type', 'assistant');

        console.log('🤖 [DEBUG] Mensagens de assistente (enviadas):', assistantMessages);

        // 4. VERIFICAR SE HÁ OUTROS SENDER_TYPES
        const { data: allTypes, error: allTypesError } = await supabase
            .from('messages')
            .select('sender_type')
            .eq('user_id', userId)
            .not('sender_type', 'is', null);

        if (!allTypesError) {
            const uniqueTypes = [...new Set(allTypes.map(m => m.sender_type))];
            console.log('🏷️ [DEBUG] Todos os sender_types encontrados:', uniqueTypes);
        }

        // 5. CALCULAR TAXA DE RESPOSTA
        let responseRate = 0;
        if (contactMessages > 0) {
            responseRate = Math.round((assistantMessages / contactMessages) * 100);
        }

        console.log('📈 [DEBUG] CÁLCULO TAXA DE RESPOSTA:');
        console.log(`   Mensagens enviadas (assistant): ${assistantMessages}`);
        console.log(`   Mensagens recebidas (contact): ${contactMessages}`);
        console.log(`   Fórmula: (${assistantMessages} / ${contactMessages}) * 100`);
        console.log(`   Resultado: ${responseRate}%`);

        // 6. VERIFICAR MENSAGENS RECENTES
        const { data: recentMessages, error: recentError } = await supabase
            .from('messages')
            .select('content, sender_type, created_at, channel_type')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (!recentError) {
            console.log('📝 [DEBUG] Últimas 10 mensagens:');
            recentMessages.forEach((msg, i) => {
                console.log(`   ${i+1}. [${msg.sender_type}] ${msg.content?.substring(0, 50)}... (${msg.created_at})`);
            });
        }

        console.log('🔍 ================= FIM DEBUG TAXA DE RESPOSTA =================');

    } catch (error) {
        console.error('💥 Erro no debug da taxa de resposta:', error);
    }
}

    

    // ✅ SUBSTITUIR NO useEffect:
    // TROCAR loadRealMetrics() POR loadRealMetricsWithDebug()

    useEffect(() => {
        const loadData = async () => {
            console.log('🚀 [DEBUG] Iniciando carregamento de dados iniciais...');
            
            try {
                await Promise.all([
                    loadPlanLimits(),
                    loadRealMetricsWithDebug(), // ← ✨ MUDANÇA AQUI
                    debugResponseRate()
                    
                ]);
                console.log('✅ [DEBUG] Todos os dados iniciais carregados com sucesso');
            } catch (error) {
                console.error('❌ [DEBUG] Erro ao carregar dados iniciais:', error);
            }
        };

        loadData();
    }, []);

    // ✅ ADICIONAR ESTA FUNÇÃO DE DEBUG ESPECÍFICO NO MULTICHANNELDASHBOARD.TSX

    // 🔍 FUNÇÃO PARA INVESTIGAR MENSAGENS COM USER_ID NULL
    const debugMessagesWithNullUserId = async () => {
        console.log('🔍 =============== DEBUG MENSAGENS NULL USER_ID ===============');
        
        try {
            // 1. BUSCAR TODAS AS MENSAGENS (incluindo as com user_id = null)
            const { data: allMessages, count: totalMessages } = await supabase
                .from('messages')
                .select('*', { count: 'exact' })
                .limit(20);

            console.log('📊 [DEBUG] Total de mensagens na tabela:', totalMessages);
            
            if (allMessages && allMessages.length > 0) {
                console.log('📋 [DEBUG] Primeiras mensagens encontradas:');
                
                allMessages.forEach((msg, index) => {
                    console.log(`\n   🔹 Mensagem ${index + 1}:`);
                    console.log(`     📝 Conteúdo: "${msg.content?.substring(0, 100)}..."`);
                    console.log(`     👤 User ID: ${msg.user_id || 'NULL ❌'}`);
                    console.log(`     📱 Canal: ${msg.channel_type || 'N/A'}`);
                    console.log(`     📅 Data: ${msg.created_at}`);
                    console.log(`     🔄 Sender: ${msg.sender_type || 'N/A'}`);
                    console.log(`     🆔 Message ID: ${msg.id}`);
                    console.log(`     🤖 IA Ativa: ${msg.is_automated || false}`);
                });
            }

            // 2. CONTAR MENSAGENS COM USER_ID NULL
            const { count: nullUserIdMessages } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .is('user_id', null);

            console.log(`\n❌ [DEBUG] Mensagens com user_id = NULL: ${nullUserIdMessages}`);

            // 3. BUSCAR MENSAGENS RECENTES DO TELEGRAM
            const { data: telegramMessages, count: telegramCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact' })
                .eq('channel_type', 'telegram')
                .order('created_at', { ascending: false })
                .limit(10);

            console.log(`\n📱 [DEBUG] Mensagens do Telegram: ${telegramCount}`);
            
            if (telegramMessages && telegramMessages.length > 0) {
                console.log('📋 [DEBUG] Mensagens recentes do Telegram:');
                telegramMessages.forEach((msg, index) => {
                    console.log(`\n   🔸 Telegram ${index + 1}:`);
                    console.log(`     📝 "${msg.content?.substring(0, 80)}..."`);
                    console.log(`     👤 User ID: ${msg.user_id || 'NULL ❌'}`);
                    console.log(`     📅 ${msg.created_at}`);
                    console.log(`     📞 Telegram ID: ${msg.channel_message_id || 'N/A'}`);
                });
            }

            // 4. VERIFICAR SE EXISTE ALGUMA MENSAGEM COM SEU USER_ID
            const { data: yourMessages, count: yourMessagesCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact' })
                .eq('user_id', 'e685ebf4-62b3-42fd-b165-f72329cb5fda');

            console.log(`\n🎯 [DEBUG] Mensagens com SEU user_id: ${yourMessagesCount}`);
            
            if (yourMessages && yourMessages.length > 0) {
                console.log('✅ [DEBUG] Suas mensagens encontradas:', yourMessages);
            }

            // 5. BUSCAR CONVERSATION_IDs DAS SUAS CONVERSAS
            const { data: yourConversations } = await supabase
                .from('conversations')
                .select('id, status, channel_type')
                .eq('user_id', 'e685ebf4-62b3-42fd-b165-f72329cb5fda');

            if (yourConversations && yourConversations.length > 0) {
                console.log('\n💬 [DEBUG] IDs das suas conversas:', yourConversations.map(c => c.id));
                
                // 6. BUSCAR MENSAGENS POR CONVERSATION_ID
                for (const conv of yourConversations) {
                    const { data: convMessages, count: convCount } = await supabase
                        .from('messages')
                        .select('*', { count: 'exact' })
                        .eq('conversation_id', conv.id)
                        .limit(5);

                    console.log(`\n🔗 [DEBUG] Conversa ${conv.id} (${conv.channel_type}):`);
                    console.log(`     📊 Total mensagens: ${convCount}`);
                    
                    if (convMessages && convMessages.length > 0) {
                        convMessages.forEach((msg, index) => {
                            console.log(`     📝 Msg ${index + 1}: "${msg.content?.substring(0, 50)}..." | User ID: ${msg.user_id || 'NULL ❌'}`);
                        });
                    }
                }
            }

        } catch (error) {
            console.error('❌ [DEBUG] Erro no debug de mensagens:', error);
        }

        console.log('\n🔍 ============== FIM DEBUG MENSAGENS NULL USER_ID ==============');
    };

    // ✅ MODIFICAR A FUNÇÃO debugSupabaseData PARA INCLUIR O NOVO DEBUG
    // SUBSTITUIR A FUNÇÃO debugSupabaseData POR ESTA VERSÃO ATUALIZADA:

    const debugSupabaseDataComplete = async () => {
        console.log('🔍 =================== DEBUG SUPABASE COMPLETO ===================');
        
        const userId = getCurrentUserId();
        console.log('👤 [DEBUG] User ID encontrado:', userId);
        
        if (!userId) {
            console.log('❌ [DEBUG] SEM USER ID - ENCERRANDO DEBUG');
            return;
        }

        // EXECUTAR O DEBUG ESPECÍFICO DE MENSAGENS NULL
        await debugMessagesWithNullUserId();

        console.log('🔍 ================= FIM DEBUG SUPABASE COMPLETO =================\n');
    };

    // ✅ NOVA FUNÇÃO loadRealMetricsWithCompleteDebug
    const loadRealMetricsWithCompleteDebug = async () => {
        console.log('🚀 [MÉTRICAS] Iniciando carregamento com DEBUG COMPLETO...');
        
        // ✨ EXECUTAR DEBUG COMPLETO
        await debugSupabaseDataComplete();
        await debugConversations();
        
        // Depois executar carregamento normal
        try {
            const [totalMessages, activeConversations, responseRate] = await Promise.all([
                loadTotalMessages(),
                loadActiveConversations(), 
                loadResponseRate()
            ]);

            const realMetrics = {
                totalMessages,
                activeConversations,
                responseRate
            };

            console.log('✅ [MÉTRICAS] Dados reais carregados:', realMetrics);
            setMetrics(realMetrics);
            
            return realMetrics;

        } catch (error) {
            console.error('❌ [MÉTRICAS] Erro ao carregar métricas reais:', error);
            const fallbackMetrics = { totalMessages: 0, activeConversations: 0, responseRate: 0 };
            setMetrics(fallbackMetrics);
            return fallbackMetrics;
        }
    };

    const loadRealMetrics = async () => {
        console.log('🚀 [MÉTRICAS] Iniciando carregamento de dados reais do Supabase...');
        
        try {
            const [totalMessages, activeConversations, responseRate] = await Promise.all([
                loadTotalMessages(),
                loadActiveConversations(), 
                loadResponseRate()
            ]);

            const realMetrics = {
                totalMessages,
                activeConversations,
                responseRate
            };

            console.log('✅ [MÉTRICAS] Dados reais carregados:', realMetrics);
            setMetrics(realMetrics);
            
            return realMetrics;

        } catch (error) {
            console.error('❌ [MÉTRICAS] Erro ao carregar métricas reais:', error);
            const fallbackMetrics = { totalMessages: 0, activeConversations: 0, responseRate: 0 };
            setMetrics(fallbackMetrics);
            return fallbackMetrics;
        }
    };

    // ✅ OUTRAS FUNÇÕES
    const makeAuthenticatedRequest = async (url, options = {}) => {
        const token = getAuthToken();
        if (!token) {
            console.error('❌ Token não encontrado');
            return null;
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, { ...options, ...defaultOptions });
            return response;
        } catch (error) {
            console.error('❌ Erro na requisição autenticada:', error);
            return null;
        }
    };

    const loadPlanLimits = async () => {
        try {
            console.log('📊 [DEBUG] Carregando limites do plano...');
            const response = await makeAuthenticatedRequest('http://localhost:3001/api/subscription/limits');
            
            if (response && response.ok) {
                const data = await response.json();
                console.log('✅ [DEBUG] Limites carregados:', data);
                if (data.success) {
                    setPlanLimits({
                        current: data.current || 0,
                        max: data.max || 1,
                        plan: data.plan || 'BASIC'
                    });
                }
            } else {
                console.warn('⚠️ [DEBUG] Usando limites padrão devido a erro na API');
                setPlanLimits({ current: 0, max: 1, plan: 'BASIC' });
            }
        } catch (error) {
            console.error('❌ [DEBUG] Erro ao carregar limites:', error);
            setPlanLimits({ current: 0, max: 1, plan: 'BASIC' });
        }
    };

    const getAuthToken = () => {
        if (typeof window === 'undefined') return null;
        
        console.log('🔍 Buscando token...');
        
        const allKeys = Object.keys(localStorage);
        console.log('🔑 Todas as chaves:', allKeys);
        
        const supabaseKey = allKeys.find(key => 
            key.startsWith('sb-') && key.endsWith('-auth-token')
        );
        
        console.log('🎯 Chave do Supabase encontrada:', supabaseKey);
        
        if (supabaseKey) {
            const stored = localStorage.getItem(supabaseKey);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.access_token) {
                        console.log('✅ Token extraído com sucesso');
                        return parsed.access_token;
                    }
                } catch (error) {
                    console.log('📝 Token é string simples, retornando diretamente');
                    return stored;
                }
            }
        }
        
        console.log('❌ Token não encontrado');
        return null;
    };

    // ✅ CARREGAMENTO INICIAL
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes slideInFromRight {
                0% {
                    transform: translateX(100%);
                    opacity: 0;
                }
                100% {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            /* ✨ SCROLLBAR CUSTOMIZADA PARA WEBKIT */
            .scrollable-content::-webkit-scrollbar {
                width: 6px;
            }
            
            .scrollable-content::-webkit-scrollbar-track {
                background: transparent;
            }
            
            .scrollable-content::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.3);
                border-radius: 3px;
            }
            
            .scrollable-content::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.5);
            }
        `;
        document.head.appendChild(style);
        
        return () => {
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        };
    }, []);


    useEffect(() => {
        const loadData = async () => {
            console.log('🚀 [DEBUG] Iniciando carregamento de dados iniciais...');
            
            try {
                await Promise.all([
                    loadPlanLimits(),
                    loadRealMetricsWithCompleteDebug()
                ]);
                console.log('✅ [DEBUG] Todos os dados iniciais carregados com sucesso');
            } catch (error) {
                console.error('❌ [DEBUG] Erro ao carregar dados iniciais:', error);
            }
        };

        loadData();
    }, []);

    // ✅ FUNÇÕES DE RENDERIZAÇÃO
    const renderContent = () => {
        switch (activeTab) {
            case 'multicanal':
                return renderMulticanalContent();
            case 'professionals':
                return renderProfessionalsContent();
            case 'products':
                return <ProductDashboard showNotification={addNotification} />; // ✨ PASSAR FUNÇÃO
            case 'settings':
                return renderSettingsContent();
            case 'privacy':
                return renderPrivacyContent();
            default:
                return renderMulticanalContent();
        }
    };

    const renderSettingsContent = () => (
        <div>
            <h2 style={protonStyles.sectionTitle}>🚀Canais de Atendimento</h2>
            <ChannelSettings 
                initialChannels={channels}
                onUpdate={onChannelsUpdate}
                userId={user?.id}
                userPlan={user?.plan || 'premium'}
                showNotification={addNotification} // ✨ PASSAR FUNÇÃO
            />
        </div>
    );

    const renderPrivacyContent = () => {
        const handleConsentComplete = () => {
            console.log('✅ Consentimentos aceitos - voltando para', previousTab);
            // ✨ USAR NOTIFICAÇÃO EM VEZ DE ALERT
            addNotification('Consentimentos aceitos com sucesso! 🛡️', 'success');
            setActiveTab(previousTab);
        };

        const handleConsentSkip = () => {
            console.log('⏭️ Consentimentos pulados - voltando para', previousTab);
            // ✨ USAR NOTIFICAÇÃO EM VEZ DE ALERT
            addNotification('Consentimentos ignorados', 'warning');
            setActiveTab(previousTab);
        };

        return (
            <div>
                <ConsentFormDashboard 
                    onComplete={handleConsentComplete}
                    onSkip={handleConsentSkip}
                    showNotification={addNotification} // ✨ PASSAR FUNÇÃO
                />
            </div>
        );
    };

    const handleLogout = () => {
        // ✨ USAR NOTIFICAÇÃO EM VEZ DE ALERT
        addNotification('Saindo do sistema... 👋', 'info');
        
        if (onLogout) {
            onLogout();
        } else {
            if (typeof window !== 'undefined') {
                setTimeout(() => {
                    localStorage.clear();
                    window.location.href = '/login';
                }, 1000); // Aguardar 1 segundo para mostrar a notificação
            }
        }
    };

    const renderMulticanalContent = () => (
        <div>
            <h2 style={protonStyles.sectionTitle}>Panorama Geral</h2>
            
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '20px',
                marginBottom: '32px'
            }}>
                {/* Card 1 - Mensagens Totais */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.75)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    borderRadius: '16px',
                    padding: '24px',
                    textAlign: 'center',
                    boxShadow: `
                        inset 0 1px 0 rgba(255, 255, 255, 0.4),
                        inset 0 -1px 0 rgba(255, 255, 255, 0.2),
                        0 4px 20px rgba(255, 255, 255, 0.1)
                    `
                }}>
                    <h3 style={{ 
                        fontSize: '32px',
                        fontWeight: '700',
                        margin: '0 0 8px 0',
                        color: '#6D4AFF'
                    }}>
                        {metrics.totalMessages}
                    </h3>
                    <p style={{ 
                        fontSize: '14px',
                        color: '#2c2c2c',
                        margin: 0,
                        fontWeight: '600'
                    }}>
                        Mensagens Totais
                    </p>
                </div>

                {/* Card 2 - Conversas Ativas */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.75)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    borderRadius: '16px',
                    padding: '24px',
                    textAlign: 'center',
                    boxShadow: `
                        inset 0 1px 0 rgba(255, 255, 255, 0.4),
                        inset 0 -1px 0 rgba(255, 255, 255, 0.2),
                        0 4px 20px rgba(255, 255, 255, 0.1)
                    `
                }}>
                    <h3 style={{ 
                        fontSize: '32px',
                        fontWeight: '700',
                        margin: '0 0 8px 0',
                        color: '#00A693'
                    }}>
                        {metrics.activeConversations}
                    </h3>
                    <p style={{ 
                        fontSize: '14px',
                        color: '#2c2c2c',
                        margin: 0,
                        fontWeight: '600'
                    }}>
                        Conversas Ativas
                    </p>
                </div>

                {/* Card 3 - Taxa de Resposta */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.75)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    borderRadius: '16px',
                    padding: '24px',
                    textAlign: 'center',
                    boxShadow: `
                        inset 0 1px 0 rgba(255, 255, 255, 0.4),
                        inset 0 -1px 0 rgba(255, 255, 255, 0.2),
                        0 4px 20px rgba(255, 255, 255, 0.1)
                    `
                }}>
                    <h3 style={{ 
                        fontSize: '32px',
                        fontWeight: '700',
                        margin: '0 0 8px 0',
                        color: '#FF6B6B'
                    }}>
                        {metrics.responseRate}%
                    </h3>
                    <p style={{ 
                        fontSize: '14px',
                        color: '#2c2c2c',
                        margin: 0,
                        fontWeight: '600'
                    }}>
                        Taxa de Resposta
                    </p>
                </div>
            </div>
        </div>
    );

    const renderProfessionalsContent = () => (
        <div>
            <h2 style={protonStyles.sectionTitle}>Profissionais</h2>
            <div style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <ProfessionalDashboard showNotification={addNotification} /> {/* ✨ PASSAR FUNÇÃO */}
            </div>
        </div>
    );

    // ✅ RENDERIZAÇÃO PRINCIPAL
    return (
        <div style={protonStyles.mainContainer}>
            <div style={protonStyles.backgroundOverlay}></div>
            
            <div style={protonStyles.headerContainer}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    backgroundColor: protonColors.scalabotsPurple,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img 
                        src="/logo.png"
                        alt="Escalabots Logo" 
                        style={{ 
                            width: '100%', 
                            height: '100%',
                            objectFit: 'contain',
                            borderRadius: '0 !important',
                            border: 'none !important',
                            clipPath: 'none !important',
                            display: 'block'
                        }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            console.log('❌ Logo não encontrado em /logo.png');
                        }}
                    />
                </div>
                <h1 style={{ 
                    color: 'white', 
                    fontSize: '24px', 
                    fontWeight: '600', 
                    margin: 0,
                    letterSpacing: '-0.02em'
                }}>
                    Escalabots
                </h1>
            </div>

            <div style={protonStyles.contentContainer}>
                <div style={protonStyles.leftSidebar}>
                    <div style={protonStyles.planBanner}>
                        <div style={protonStyles.planInfo}>
                            <Users size={18} style={{ color: '#8B5CF6', flexShrink: 0 }} />
                            <div>
                                <div style={protonStyles.planText}>
                                    Plano {planLimits.plan} ativo
                                </div>
                                <div style={protonStyles.planSubtext}>
                                    {planLimits.current} de {planLimits.max === -1 ? '∞' : planLimits.max} profissionais
                                </div>
                            </div>
                        </div>
                        {planLimits.max !== -1 && planLimits.current >= planLimits.max && (
                            <div style={{ color: '#fbbf24', fontSize: '12px', fontWeight: '500' }}>
                                Limite atingido
                            </div>
                        )}
                    </div>

                    <button
                        style={{
                            ...protonStyles.navButton,
                            ...(activeTab === 'multicanal' ? protonStyles.navButtonActive : {})
                        }}
                        onClick={() => setActiveTab('multicanal')}
                    >
                        <Calendar size={20} />
                        Dashboard
                    </button>

                    <button
                        style={{
                            ...protonStyles.navButton,
                            ...(activeTab === 'professionals' ? protonStyles.navButtonActive : {})
                        }}
                        onClick={() => setActiveTab('professionals')}
                    >
                        <Users size={20} />
                        Profissionais
                    </button>

                    <button
                        style={{
                            ...protonStyles.navButton,
                            ...(activeTab === 'products' ? protonStyles.navButtonActive : {})
                        }}
                        onClick={() => setActiveTab('products')}
                    >
                        <Star size={20} />
                        Produtos
                    </button>
                </div>

                <div style={protonStyles.mainContent}>
                    {renderContent()}
                </div>

                <div style={protonStyles.rightSidebar}>
                    <div
                        style={{
                            ...protonStyles.sidebarButton,
                            ...(activeTab === 'profile' ? { background: `linear-gradient(135deg, ${protonColors.purple} 0%, ${protonColors.green} 100%)` } : {})
                        }}
                        title={`${user?.name || 'Usuário'} - ${user?.email || ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <User size={24} />
                    </div>

                    <div
                        style={{
                            ...protonStyles.sidebarButton,
                            ...(activeTab === 'settings' ? { background: `linear-gradient(135deg, ${protonColors.purple} 0%, ${protonColors.green} 100%)` } : {})
                        }}
                        title="Configurações de Canais"
                        onClick={() => setActiveTab('settings')}
                    >
                        <Settings size={24} />
                    </div>

                    <div
                        style={{
                            ...protonStyles.sidebarButton,
                            ...(activeTab === 'privacy' ? { background: `linear-gradient(135deg, ${protonColors.purple} 0%, ${protonColors.green} 100%)` } : {})
                        }}
                        title="Privacidade e Consentimentos"
                        onClick={() => {
                            setPreviousTab(activeTab);
                            setActiveTab('privacy');
                        }}
                    >
                        <Shield size={24} />
                    </div>

                    <div
                        style={{
                            ...protonStyles.sidebarButton,
                            marginTop: '16px',
                            background: 'rgba(255, 99, 99, 0.1)',
                            borderColor: 'rgba(255, 99, 99, 0.3)'
                        }}
                        title="Sair do Sistema"
                        onClick={handleLogout}
                    >
                        <LogOut size={24} />
                    </div>
                </div>
            </div>

            {/* ✨ SISTEMA DE NOTIFICAÇÕES */}
            <NotificationContainer 
                notifications={notifications}
                onRemove={removeNotification}
            />
        </div>
    );
};

export default MultiChannelDashboard;