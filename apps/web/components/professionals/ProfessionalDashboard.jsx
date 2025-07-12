'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Calendar, RefreshCw, Users, TrendingUp, Clock, X } from 'lucide-react';

const ProfessionalDashboard = () => {
  // ✅ ESTADOS PRINCIPAIS
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState(null);
  
  // ✅ ESTADOS DE LIMITES DE PLANO (COMO NO ORIGINAL)
  const [planLimits, setPlanLimits] = useState({ current: 0, max: 1, plan: 'BASIC' });
  
  // ✅ ESTADOS DE ESTATÍSTICAS
  const [professionalStats, setProfessionalStats] = useState({
    totalProfessionals: 0,
    totalAppointments: 0,
    monthlyGrowth: 0
  });

  // ✅ ESTADOS DO GOOGLE CALENDAR (COMO NO ORIGINAL)
  const [calendarStatus, setCalendarStatus] = useState({});
  const [calendarLoading, setCalendarLoading] = useState({});
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [selectedProfessional, setSelectedProfessional] = useState(null);

  // ✅ ESTADO DO FORMULÁRIO COM TODOS OS CAMPOS
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    bio: '',
    profile_picture_url: '',
    hourly_rate: '',
    google_calendar_email: '',
    is_active: true,
    display_order: 0
  });

  // ✅ FUNÇÃO PARA OBTER TOKEN (COMO NO ORIGINAL)
  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    
    console.log('🔍 Buscando token...');
    
    // Buscar chave específica do Supabase (padrão: sb-*-auth-token)
    const allKeys = Object.keys(localStorage);
    console.log('🔑 Todas as chaves:', allKeys);
    
    const supabaseKey = allKeys.find(key => 
      key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    
    console.log('🎯 Chave do Supabase encontrada:', supabaseKey);
    
    if (supabaseKey) {
      const stored = localStorage.getItem(supabaseKey);
      console.log('📦 Dados armazenados:', stored ? 'EXISTE' : 'VAZIO');
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          console.log('✅ Token parsed com sucesso');
          
          if (parsed.access_token) {
            console.log('🔑 Access token encontrado:', parsed.access_token.substring(0, 50) + '...');
            return parsed.access_token;
          }
        } catch (error) {
          console.error('❌ Erro ao fazer parse do token:', error);
          return stored;
        }
      }
    }
    
    // Fallback para outras chaves
    const fallbackKeys = ['access_token', 'token', 'auth_token', 'user_token'];
    for (const key of fallbackKeys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        console.log('🔄 Tentando fallback key:', key);
        try {
          const parsed = JSON.parse(stored);
          return parsed.access_token || stored;
        } catch {
          return stored;
        }
      }
    }
    
    console.log('❌ Nenhum token encontrado');
    return null;
  };

  // ✅ FUNÇÃO DE AUTENTICAÇÃO (COMO NO ORIGINAL)
  const isAuthenticated = () => {
    const token = getAuthToken();
    if (!token) {
      console.warn('⚠️ Token não encontrado');
      return false;
    }
    
    console.log('✅ Token encontrado, considerando autenticado');
    return true;
  };

  // ✅ FUNÇÃO makeAuthenticatedRequest (COMO NO ORIGINAL)
  const makeAuthenticatedRequest = async (url, options = {}) => {
    console.log('🔧 makeAuthenticatedRequest chamada:', {
      url: url,
      method: options.method || 'GET'
    });

    if (!isAuthenticated()) {
      console.error('❌ Usuário não autenticado');
      return null;
    }

    const token = getAuthToken();
    
    if (!token) {
      console.error('❌ Token não encontrado - faça login novamente');
      return null;
    }

    console.log('🔑 Token obtido com sucesso (primeiros 20 chars):', token.substring(0, 20) + '...');

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      };

      console.log('📤 Fazendo requisição para:', url);
      console.log('🔧 Headers:', { ...headers, Authorization: 'Bearer [HIDDEN]' });

      const response = await fetch(url, {
        ...options,
        headers
      });

      console.log('📥 Resposta recebida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      return response;
    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      return null;
    }
  };

  // ✅ FUNÇÃO PARA CARREGAR LIMITES DO PLANO (COMO NO ORIGINAL)
  const loadPlanLimits = async () => {
    try {
      console.log('📊 Carregando limites do plano...');
      const response = await makeAuthenticatedRequest('http://localhost:3001/api/subscription/limits');
      
      if (response && response.ok) {
        const data = await response.json();
        console.log('✅ Limites carregados:', data);
        if (data.success) {
          setPlanLimits({
            current: data.current || 0,
            max: data.max || 1,
            plan: data.plan || 'BASIC'
          });
        }
      } else {
        console.warn('⚠️ Usando limites padrão');
        setPlanLimits({ current: 0, max: 1, plan: 'BASIC' });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar limites:', error);
      setPlanLimits({ current: 0, max: 1, plan: 'BASIC' });
    }
  };

  // ✅ FUNÇÃO PARA CARREGAR PROFISSIONAIS (COMO NO ORIGINAL)
  const loadProfessionals = async () => {
    try {
      console.log('👥 Carregando profissionais...');
      const response = await makeAuthenticatedRequest('http://localhost:3001/api/professionals?active_only=true');
      
      if (response && response.ok) {
        const data = await response.json();
        console.log('✅ Profissionais carregados:', data.data?.length || 0);
        setProfessionals(data.data || []);
        setProfessionalStats(prev => ({ 
          ...prev, 
          totalProfessionals: data.data?.length || 0 
        }));
        
        // Carregar status do calendar para cada profissional
        if (data.data && data.data.length > 0) {
          for (const prof of data.data) {
            await loadCalendarStatus(prof.id);
          }
        }
      } else {
        console.warn('⚠️ Erro ao carregar profissionais');
        setProfessionals([]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar profissionais:', error);
      setProfessionals([]);
    }
  };

  // ✅ FUNÇÃO PARA CARREGAR STATUS DO GOOGLE CALENDAR (COMO NO ORIGINAL)
  const loadCalendarStatus = async (professionalId) => {
    try {
      console.log(`🔄 Carregando status do Google Calendar para profissional ${professionalId}...`);
      
      const response = await makeAuthenticatedRequest(`http://localhost:3001/api/calendar/status/${professionalId}`);
      
      if (response && response.ok) {
        const data = await response.json();
        setCalendarStatus(prev => ({
          ...prev,
          [professionalId]: {
            connected: data.professional?.connected || false,
            last_sync: data.professional?.last_sync
          }
        }));
        console.log(`✅ Status carregado para profissional ${professionalId}:`, data.professional?.connected ? 'Conectado' : 'Desconectado');
      } else {
        // Fallback para status desconectado
        setCalendarStatus(prev => ({
          ...prev,
          [professionalId]: {
            connected: false,
            last_sync: null
          }
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao carregar status do calendar:', error);
      setCalendarStatus(prev => ({
        ...prev,
        [professionalId]: {
          connected: false,
          last_sync: null
        }
      }));
    }
  };

  // ✅ FUNÇÃO PARA CONECTAR GOOGLE CALENDAR (COMO NO ORIGINAL)
  const handleConnectCalendar = async (professional) => {
    try {
      setCalendarLoading(prev => ({ ...prev, [professional.id]: true }));
      console.log('🔗 Conectando Google Calendar para:', professional.name);
      
      const response = await makeAuthenticatedRequest(`http://localhost:3001/api/calendar/connect/${professional.id}`, {
        method: 'POST'
      });

      if (response && response.ok) {
        const data = await response.json();
        console.log('✅ URL de autorização gerada:', data.auth_url);
        
        // Abrir popup para autenticação OAuth2
        const popup = window.open(data.auth_url, 'google-auth', 'width=500,height=600');
        
        if (!popup) {
          alert('Por favor, permita popups para conectar o Google Calendar');
          setCalendarLoading(prev => ({ ...prev, [professional.id]: false }));
          return;
        }
        
        // Monitorar o popup
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            console.log('✅ Popup fechado - recarregando status do calendar');
            setTimeout(() => {
              loadCalendarStatus(professional.id);
              setCalendarLoading(prev => ({ ...prev, [professional.id]: false }));
            }, 3000);
          }
        }, 1000);
      } else {
        console.error('❌ Erro ao gerar URL de autorização');
        alert('Erro ao conectar com Google Calendar. Tente novamente.');
        setCalendarLoading(prev => ({ ...prev, [professional.id]: false }));
      }
    } catch (error) {
      console.error('❌ Erro ao conectar calendar:', error);
      alert('Erro de conexão. Tente novamente.');
      setCalendarLoading(prev => ({ ...prev, [professional.id]: false }));
    }
  };

  // ✅ FUNÇÃO PARA VISUALIZAR AGENDA (COMO NO ORIGINAL)
  const handleViewCalendar = async (professional) => {
    console.log('📅 Visualizando agenda de:', professional.name);
    setSelectedProfessional(professional);
    setShowCalendarModal(true);
    setCalendarLoading(prev => ({ ...prev, [professional.id]: true }));
    
    try {
      const response = await makeAuthenticatedRequest(`http://localhost:3001/api/calendar/events/${professional.id}`);
      
      if (response && response.ok) {
        const data = await response.json();
        setCalendarEvents(data.events || []);
        console.log('✅ Eventos carregados:', data.events?.length || 0);
      } else {
        console.error('❌ Erro ao buscar eventos');
        setCalendarEvents([]);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar eventos:', error);
      setCalendarEvents([]);
    }
    
    setCalendarLoading(prev => ({ ...prev, [professional.id]: false }));
  };

  // ✅ FUNÇÃO PARA ABRIR MODAL DE NOVO PROFISSIONAL
  const openNewModal = () => {
    setEditingProfessional(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      specialty: '',
      bio: '',
      profile_picture_url: '',
      hourly_rate: '',
      google_calendar_email: '',
      is_active: true,
      display_order: professionals.length
    });
    setShowModal(true);
  };

  // ✅ FUNÇÃO PARA ABRIR MODAL DE EDIÇÃO
  const openEditModal = (professional) => {
    setEditingProfessional(professional);
    setFormData({
      name: professional.name || '',
      email: professional.email || '',
      phone: professional.phone || '',
      specialty: professional.specialty || '',
      bio: professional.bio || '',
      profile_picture_url: professional.profile_picture_url || '',
      hourly_rate: professional.hourly_rate || '',
      google_calendar_email: professional.google_calendar_email || '',
      is_active: professional.is_active !== false,
      display_order: professional.display_order || 0
    });
    setShowModal(true);
  };

  // ✅ FUNÇÃO PARA FECHAR MODAL
  const closeModal = () => {
    setShowModal(false);
    setEditingProfessional(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      specialty: '',
      bio: '',
      profile_picture_url: '',
      hourly_rate: '',
      google_calendar_email: '',
      is_active: true,
      display_order: 0
    });
  };

  // ✅ FUNÇÃO PARA SALVAR PROFISSIONAL (COMO NO ORIGINAL)
  const handleSave = async () => {
    try {
      console.log('💾 Salvando profissional...');
      
      if (!formData.name || !formData.email || !formData.specialty) {
        alert('Por favor, preencha os campos obrigatórios: Nome, Email e Especialidade');
        return;
      }

      // ✅ VERIFICAÇÃO DE LIMITES (COMO NO ORIGINAL)
      if (!editingProfessional && planLimits.max !== -1 && professionals.length >= planLimits.max) {
        alert(`Plano ${planLimits.plan} permite apenas ${planLimits.max} profissional(is). Faça upgrade para adicionar mais.`);
        return;
      }

      const professionalData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        specialty: formData.specialty,
        bio: formData.bio,
        profile_picture_url: formData.profile_picture_url,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        google_calendar_email: formData.google_calendar_email,
        is_active: formData.is_active,
        display_order: formData.display_order
      };

      let response;
      if (editingProfessional) {
        // Atualizar profissional existente
        response = await makeAuthenticatedRequest(`http://localhost:3001/api/professionals/${editingProfessional.id}`, {
          method: 'PUT',
          body: JSON.stringify(professionalData)
        });
      } else {
        // Criar novo profissional
        response = await makeAuthenticatedRequest('http://localhost:3001/api/professionals', {
          method: 'POST',
          body: JSON.stringify(professionalData)
        });
      }

      if (response && response.ok) {
        console.log('✅ Profissional salvo com sucesso');
        closeModal();
        await loadProfessionals();
        await loadPlanLimits();
        alert(editingProfessional ? 'Profissional atualizado com sucesso!' : 'Profissional adicionado com sucesso!');
      } else if (response) {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || 'Erro ao salvar profissional';
          console.error('❌ Erro da API:', errorMessage);
          alert(`Erro: ${errorMessage}`);
        } catch {
          console.error('❌ Erro HTTP:', response.status);
          alert(`Erro HTTP ${response.status}: Verifique os dados e tente novamente`);
        }
      } else {
        console.error('❌ Problema de autenticação');
        alert('Erro de autenticação. Faça login novamente.');
      }
    } catch (error) {
      console.error('❌ Erro de rede:', error.message);
      alert('Erro de conexão. Verifique sua internet e tente novamente.');
    }
  };

  // ✅ FUNÇÃO PARA DELETAR PROFISSIONAL (COMO NO ORIGINAL)
  const handleDelete = async (professional) => {
    if (!confirm(`Tem certeza que deseja remover ${professional.name}?`)) {
      return;
    }

    try {
      console.log('🗑️ Removendo profissional...');
      
      const response = await makeAuthenticatedRequest(`http://localhost:3001/api/professionals/${professional.id}`, {
        method: 'DELETE'
      });

      if (response && response.ok) {
        console.log('✅ Profissional removido com sucesso');
        await loadProfessionals();
        await loadPlanLimits();
        alert('Profissional removido com sucesso!');
      } else if (response) {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || 'Erro ao remover profissional';
          console.error('❌ Erro da API:', errorMessage);
          alert(`Erro: ${errorMessage}`);
        } catch {
          console.error('❌ Erro HTTP:', response.status);
          alert(`Erro HTTP ${response.status}: Verifique e tente novamente`);
        }
      } else {
        console.error('❌ Problema de autenticação');
        alert('Erro de autenticação. Faça login novamente.');
      }
    } catch (error) {
      console.error('❌ Erro de rede:', error.message);
      alert('Erro de conexão. Verifique sua internet e tente novamente.');
    }
  };

  // ✅ CARREGAR DADOS INICIAIS
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadProfessionals(),
          loadPlanLimits()
        ]);
      } catch (error) {
        console.error('❌ Erro ao carregar dados iniciais:', error);
      }
      setLoading(false);
    };

    loadData();
  }, []);

  // ✅ ESTILOS PROTON VPN
  const styles = {
    container: {
      padding: '24px',
      background: 'transparent',
      minHeight: '100%',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '32px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.95)',
      margin: 0,
      letterSpacing: '-0.02em'
    },
    addButton: {
      background: 'linear-gradient(135deg, #6D4AFF 0%, #00A693 100%)',
      border: 'none',
      borderRadius: '12px',
      padding: '12px 24px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 12px rgba(109, 74, 255, 0.3)'
    },
    planBanner: {
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '16px',
      padding: '20px 24px',
      marginBottom: '24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    planInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    planText: {
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.95)',
      fontSize: '16px'
    },
    planSubtext: {
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.7)',
      marginTop: '4px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '32px'
    },
    statCard: {
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '16px',
      padding: '24px',
      textAlign: 'center'
    },
    statNumber: {
      fontSize: '32px',
      fontWeight: '700',
      color: '#00A693',
      margin: '0 0 8px 0'
    },
    statLabel: {
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.7)',
      margin: 0
    },
    professionalsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '20px'
    },
    professionalCard: {
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '16px',
      padding: '24px',
      transition: 'all 0.2s ease'
    },
    professionalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '16px'
    },
    professionalName: {
      fontSize: '18px',
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.95)',
      margin: '0 0 4px 0'
    },
    professionalSpecialty: {
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.7)',
      margin: 0
    },
    professionalInfo: {
      marginBottom: '16px'
    },
    professionalDetail: {
      fontSize: '13px',
      color: 'rgba(255, 255, 255, 0.6)',
      margin: '4px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    actionButton: {
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '8px',
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      color: 'rgba(255, 255, 255, 0.8)'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modalContent: {
      background: 'rgba(28, 27, 31, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '20px',
      padding: '32px',
      width: '100%',
      maxWidth: '600px',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    modalTitle: {
      fontSize: '24px',
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.95)',
      margin: 0
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: 'rgba(255, 255, 255, 0.7)',
      cursor: 'pointer',
      padding: '8px'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '24px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: 'rgba(255, 255, 255, 0.9)',
      marginBottom: '8px'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '12px',
      color: 'rgba(255, 255, 255, 0.95)',
      fontSize: '14px',
      fontFamily: 'Inter, sans-serif',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box'
    },
    textarea: {
      width: '100%',
      padding: '12px 16px',
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '12px',
      color: 'rgba(255, 255, 255, 0.95)',
      fontSize: '14px',
      fontFamily: 'Inter, sans-serif',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box',
      minHeight: '80px',
      resize: 'vertical'
    },
    modalActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px'
    },
    cancelButton: {
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '12px',
      padding: '12px 24px',
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    saveButton: {
      background: 'linear-gradient(135deg, #6D4AFF 0%, #00A693 100%)',
      border: 'none',
      borderRadius: '12px',
      padding: '12px 24px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: 'rgba(255, 255, 255, 0.6)'
    },
    emptyIcon: {
      fontSize: '48px',
      marginBottom: '16px',
      opacity: 0.5
    },
    emptyText: {
      fontSize: '18px',
      marginBottom: '8px'
    },
    emptySubtext: {
      fontSize: '14px',
      opacity: 0.7
    },
    calendarModalContent: {
      background: 'rgba(28, 27, 31, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '20px',
      padding: '32px',
      width: '100%',
      maxWidth: '700px',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    eventItem: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px'
    },
    eventTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.95)',
      marginBottom: '8px'
    },
    eventTime: {
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.7)',
      marginBottom: '4px'
    },
    eventDescription: {
      fontSize: '13px',
      color: 'rgba(255, 255, 255, 0.6)'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#6D4AFF', marginBottom: '16px' }} />
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '16px' }}>Carregando profissionais...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Profissionais</h1>
        <button 
          style={{
            ...styles.addButton,
            opacity: (planLimits.max !== -1 && professionals.length >= planLimits.max) ? 0.5 : 1,
            cursor: (planLimits.max !== -1 && professionals.length >= planLimits.max) ? 'not-allowed' : 'pointer'
          }}
          onClick={openNewModal}
          disabled={planLimits.max !== -1 && professionals.length >= planLimits.max}
        >
          <Plus size={20} />
          Adicionar Profissional
        </button>
      </div>

      {/* Plan Limits Banner */}
      <div style={styles.planBanner}>
        <div style={styles.planInfo}>
          <Users size={20} style={{ color: '#6D4AFF' }} />
          <div>
            <div style={styles.planText}>
              Profissionais: {planLimits.current} de {planLimits.max === -1 ? '∞' : planLimits.max}
            </div>
            <div style={styles.planSubtext}>Plano {planLimits.plan} ativo</div>
          </div>
        </div>
        {planLimits.max !== -1 && planLimits.current >= planLimits.max && (
          <div style={{ color: '#f59e0b', fontSize: '14px', fontWeight: '500' }}>Limite atingido</div>
        )}
      </div>

      {/* Estatísticas */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{professionalStats.totalProfessionals}</h3>
          <p style={styles.statLabel}>Total de Profissionais</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{professionalStats.totalAppointments}</h3>
          <p style={styles.statLabel}>Consultas Este Mês</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{professionalStats.monthlyGrowth.toFixed(1)}%</h3>
          <p style={styles.statLabel}>Crescimento Mensal</p>
        </div>
      </div>

      {/* Lista de Profissionais */}
      {professionals.length === 0 ? (
        <div style={styles.emptyState}>
          <Users size={48} style={styles.emptyIcon} />
          <h3 style={styles.emptyText}>Nenhum profissional cadastrado</h3>
          <p style={styles.emptySubtext}>Adicione seu primeiro profissional para começar</p>
        </div>
      ) : (
        <div style={styles.professionalsGrid}>
          {professionals.map((professional) => (
            <div key={professional.id} style={styles.professionalCard}>
              <div style={styles.professionalHeader}>
                <div>
                  <h3 style={styles.professionalName}>{professional.name}</h3>
                  <p style={styles.professionalSpecialty}>{professional.specialty}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Ícone do Google Calendar */}
                  <button 
                    style={{
                      ...styles.actionButton,
                      background: calendarStatus[professional.id]?.connected 
                        ? 'rgba(0, 166, 147, 0.2)' 
                        : 'rgba(255, 255, 255, 0.1)',
                      borderColor: calendarStatus[professional.id]?.connected 
                        ? 'rgba(0, 166, 147, 0.4)' 
                        : 'rgba(255, 255, 255, 0.2)',
                      color: calendarStatus[professional.id]?.connected 
                        ? '#00A693' 
                        : 'rgba(255, 255, 255, 0.8)',
                      cursor: calendarLoading[professional.id] ? 'wait' : 'pointer'
                    }}
                    onClick={() => {
                      if (calendarStatus[professional.id]?.connected) {
                        handleViewCalendar(professional);
                      } else {
                        handleConnectCalendar(professional);
                      }
                    }}
                    disabled={calendarLoading[professional.id]}
                    title={calendarStatus[professional.id]?.connected 
                      ? `Ver agenda de ${professional.name}` 
                      : `Conectar Google Calendar de ${professional.name}`}
                  >
                    {calendarLoading[professional.id] ? (
                      <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Calendar size={16} />
                    )}
                  </button>
                  
                  <button 
                    style={styles.actionButton}
                    onClick={() => openEditModal(professional)}
                    title="Editar profissional"
                  >
                    <Edit3 size={16} />
                  </button>
                  
                  <button 
                    style={{
                      ...styles.actionButton,
                      color: 'rgba(239, 68, 68, 0.8)',
                      borderColor: 'rgba(239, 68, 68, 0.3)'
                    }}
                    onClick={() => handleDelete(professional)}
                    title="Remover profissional"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={styles.professionalInfo}>
                {professional.email && (
                  <div style={styles.professionalDetail}>
                    📧 {professional.email}
                  </div>
                )}
                {professional.phone && (
                  <div style={styles.professionalDetail}>
                    📱 {professional.phone}
                  </div>
                )}
                {professional.hourly_rate && (
                  <div style={styles.professionalDetail}>
                    💰 R$ {professional.hourly_rate}/hora
                  </div>
                )}
                {calendarStatus[professional.id]?.connected && (
                  <div style={styles.professionalDetail}>
                    ✅ Google Calendar conectado
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Adicionar/Editar */}
      {showModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingProfessional ? 'Editar Profissional' : 'Novo Profissional'}
              </h2>
              <button style={styles.closeButton} onClick={closeModal}>
                <X size={24} />
              </button>
            </div>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nome *</label>
                <input
                  style={styles.input}
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nome completo"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email *</label>
                <input
                  style={styles.input}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Telefone</label>
                <input
                  style={styles.input}
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Especialidade *</label>
                <input
                  style={styles.input}
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                  placeholder="Ex: Cardiologista, Dentista, etc."
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Valor por Hora</label>
                <input
                  style={styles.input}
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                  placeholder="150.00"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email do Google Calendar</label>
                <input
                  style={styles.input}
                  type="email"
                  value={formData.google_calendar_email}
                  onChange={(e) => setFormData({...formData, google_calendar_email: e.target.value})}
                  placeholder="calendario@gmail.com"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Biografia</label>
              <textarea
                style={styles.textarea}
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Breve descrição sobre o profissional..."
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>URL da Foto de Perfil</label>
              <input
                style={styles.input}
                type="url"
                value={formData.profile_picture_url}
                onChange={(e) => setFormData({...formData, profile_picture_url: e.target.value})}
                placeholder="https://exemplo.com/foto.jpg"
              />
            </div>

            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={closeModal}>
                Cancelar
              </button>
              <button style={styles.saveButton} onClick={handleSave}>
                {editingProfessional ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Google Calendar */}
      {showCalendarModal && selectedProfessional && (
        <div style={styles.modal}>
          <div style={styles.calendarModalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                📅 Agenda de {selectedProfessional.name}
              </h2>
              <button 
                style={styles.closeButton}
                onClick={() => {
                  setShowCalendarModal(false);
                  setSelectedProfessional(null);
                  setCalendarEvents([]);
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: '20px 0' }}>
              {calendarLoading[selectedProfessional.id] ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#6D4AFF', marginBottom: '16px' }} />
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Carregando eventos do Google Calendar...
                  </p>
                </div>
              ) : calendarEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                  <h4 style={{ margin: '0 0 8px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    Nenhum evento encontrado
                  </h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    A agenda está vazia ou não foi possível carregar os eventos.
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '20px' }}>
                    {calendarEvents.length} evento(s) encontrado(s)
                  </p>
                  {calendarEvents.map((event, index) => (
                    <div key={index} style={styles.eventItem}>
                      <div style={styles.eventTitle}>
                        {event.summary || 'Evento sem título'}
                      </div>
                      <div style={styles.eventTime}>
                        {event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString('pt-BR') : 'Horário não definido'}
                      </div>
                      {event.description && (
                        <div style={styles.eventDescription}>
                          {event.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalDashboard;

