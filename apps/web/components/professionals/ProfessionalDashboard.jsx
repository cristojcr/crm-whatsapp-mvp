'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Calendar, RefreshCw, Users, TrendingUp, Clock, X, Save, Lock, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

const ProfessionalDashboard = ({ showNotification }) => {
  // ✅ ESTADOS PRINCIPAIS
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  
  // ✅ ESTADOS DE LIMITES DE PLANO
  const [planLimits, setPlanLimits] = useState({ current: 0, max: 1, plan: 'BASIC' });
  
  // ✅ ESTADOS DE ESTATÍSTICAS
  const [professionalStats, setProfessionalStats] = useState({
    totalProfessionals: 0,
    totalAppointments: 0,
    monthlyGrowth: 0
  });

  // ✅ ESTADOS DO GOOGLE CALENDAR
  const [calendarStatus, setCalendarStatus] = useState({});
  const [calendarLoading, setCalendarLoading] = useState({});
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [selectedProfessional, setSelectedProfessional] = useState(null);

  // ✅ ESTADOS DO FORMULÁRIO COM TODOS OS CAMPOS
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
    display_order: 0,
    default_appointment_duration_minutes: 60, // NOVO: Duração padrão do agendamento
    has_individual_business_hours: false // NOVO: Se tem horário comercial individual
  });

  // ✅ ESTADOS PARA CALENDÁRIO INDIVIDUAL
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [professionalBusinessHours, setProfessionalBusinessHours] = useState({});
  const [professionalBlockedTimes, setProfessionalBlockedTimes] = useState([]);
  const [showIndividualBusinessHoursModal, setShowIndividualBusinessHoursModal] = useState(false);
  const [showIndividualBlockModal, setShowIndividualBlockModal] = useState(false);
  const [individualBlockFormData, setIndividualBlockFormData] = useState({
    title: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    is_recurring: false,
    recurrence_type: 'weekly',
    reason: ''
  });

  // ✅ CORES DO TEMA PROTON (duplicado para consistência)
  const protonColors = {
    purple: '#6D4AFF',
    green: '#00A693',
    darkBg: '#1C1B1F',
    glassWhite: 'rgba(255, 255, 255, 0.15)',
    glassBorder: 'rgba(255, 255, 255, 0.2)',
    scalabotsPurple: '#8B5CF6'
  };

  // ✅ ESTILOS ATUALIZADOS - CARDS MENORES E LADO A LADO
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
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '32px'
    },
    statCard: {
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
    },
    statNumber: {
      fontSize: '32px',
      fontWeight: '700',
      margin: '0 0 8px 0'
    },
    statNumber1: { color: '#6D4AFF' },
    statNumber2: { color: '#00A693' },
    statNumber3: { color: '#FF6B6B' },
    statLabel: {
      fontSize: '14px',
      color: '#2c2c2c',
      margin: 0,
      fontWeight: '600'
    },
    // ✅ GRID DOS PROFISSIONAIS - CARDS MENORES E LADO A LADO
    professionalsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', // Cards menores
      gap: '16px', // Gap menor
      marginBottom: '32px'
    },
    professionalCard: {
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '12px', // Bordas menores
      padding: '16px', // Padding menor
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      minHeight: '180px' // Altura mínima menor
    },
    professionalCardHover: {
      background: 'rgba(255, 255, 255, 0.75)',
      backdropFilter: 'blur(20px)',
      boxShadow: `
        inset 0 1px 0 rgba(255, 255, 255, 0.4),
        inset 0 -1px 0 rgba(255, 255, 255, 0.2),
        0 4px 20px rgba(255, 255, 255, 0.1)
      `
    },
    professionalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '12px' // Margem menor
    },
    professionalName: {
      fontSize: '16px', // Fonte menor
      fontWeight: '600',
      margin: '0 0 4px 0',
      transition: 'color 0.2s ease'
    },
    professionalSpecialty: {
      fontSize: '13px', // Fonte menor
      margin: 0,
      transition: 'color 0.2s ease'
    },
    professionalInfo: {
      marginBottom: '12px' // Margem menor
    },
    professionalDetail: {
      fontSize: '12px', // Fonte menor
      margin: '3px 0', // Margem menor
      display: 'flex',
      alignItems: 'center',
      gap: '6px', // Gap menor
      transition: 'color 0.2s ease'
    },
    actionButton: {
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '6px', // Bordas menores
      width: '28px', // Botões menores
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      color: 'rgba(255, 255, 255, 0.8)'
    },
    actionButtonsContainer: {
      display: 'flex',
      gap: '6px' // Gap menor entre botões
    },
    editButton: {
      background: 'rgba(52, 152, 219, 0.1)',
      border: '1px solid rgba(54, 152, 219, 0.2)',
      borderColor: 'rgba(52, 152, 219, 0.3)',
      color: 'rgba(52, 152, 219, 0.9)'
    },
    editButtonHover: {
      background: '#3498db',
      color: 'white',
      borderColor: '#3498db',
      boxShadow: '0 4px 15px rgba(52, 152, 219, 0.4)', // Sombra menor
      transform: 'scale(1.05) translateY(-1px)' // Transformação menor
    },
    calendarButtonHover: {
      background: '#00A693',
      color: 'white',
      borderColor: '#00A693',
      boxShadow: '0 4px 15px rgba(0, 166, 147, 0.4)',
      transform: 'scale(1.05) translateY(-1px)'
    },
    calendarButtonDisconnectedHover: {
      background: '#ffc107',
      color: 'white',
      borderColor: '#ffc107',
      boxShadow: '0 4px 15px rgba(255, 193, 7, 0.4)',
      transform: 'scale(1.05) translateY(-1px)'
    },
    deleteButtonHover: {
      background: '#e74c3c',
      color: 'white',
      borderColor: '#e74c3c',
      boxShadow: '0 4px 15px rgba(231, 76, 60, 0.4)',
      transform: 'scale(1.05) translateY(-1px)'
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
      maxWidth: '900px', // Modal maior para o calendário
      maxHeight: '90vh',
      overflow: 'auto'
    },
    // ✅ ESTILOS PARA O CALENDÁRIO INDIVIDUAL
    calendarGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '1px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '20px'
    },
    calendarDay: {
      minHeight: '60px', // Altura menor para os dias
      padding: '6px',
      background: 'rgba(255, 255, 255, 0.05)',
      cursor: 'pointer',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    },
    calendarDayNumber: {
      fontSize: '12px',
      fontWeight: '500',
      color: 'white'
    },
    // ✅ ESTILOS PARA EVENTOS NO CALENDÁRIO - APENAS NOME
    eventInDay: {
      background: '#00A693',
      borderRadius: '3px',
      padding: '2px 4px',
      fontSize: '10px',
      color: 'white',
      marginTop: '2px',
      cursor: 'pointer',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: '100%'
    },
    // ✅ POPUP PEQUENO PARA DETALHES DO EVENTO
    eventPopup: {
      position: 'absolute',
      background: 'rgba(28, 27, 31, 0.98)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '8px',
      padding: '12px',
      zIndex: 1001,
      minWidth: '200px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      color: 'white'
    },
    eventPopupTitle: {
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '8px',
      color: 'white'
    },
    eventPopupDetail: {
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: '4px'
    },
    button: {
      background: 'linear-gradient(135deg, #6D4AFF 0%, #00A693 100%)',
      border: 'none',
      borderRadius: '8px',
      padding: '8px 16px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    secondaryButton: {
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '8px',
      padding: '8px 16px',
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }
  };

  // ✅ ESTADO PARA POPUP DE EVENTO
  const [eventPopup, setEventPopup] = useState(null);

  // ✅ TODAS AS FUNÇÕES MANTIDAS IGUAIS (getAuthToken, isAuthenticated, etc.)
  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    const allKeys = Object.keys(localStorage);
    const supabaseKey = allKeys.find(key => 
      key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    if (supabaseKey) {
      const stored = localStorage.getItem(supabaseKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return parsed.access_token || stored;
        } catch {
          return stored;
        }
      }
    }
    const fallbackKeys = ['access_token', 'token', 'auth_token', 'user_token'];
    for (const key of fallbackKeys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return parsed.access_token || stored;
        } catch {
          return stored;
        }
      }
    }
    return null;
  };

  const isAuthenticated = () => {
    const token = getAuthToken();
    return !!token;
  };

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
    return null;
  };
  
  const makeAuthenticatedRequest = async (url, options = {}) => {
    if (!isAuthenticated()) {
      console.error('❌ Usuário não autenticado - bloqueando requisição');
      return null;
    }
    const token = getAuthToken();
    if (!token) {
      console.error('❌ Token não disponível - bloqueando requisição');
      return null;
    }
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      };
      const response = await fetch(url, {
        ...options,
        headers
      });
      return response;
    } catch (error) {
      console.error('❌ Erro de rede na requisição:', error);
      return null;
    }
  };

  const loadPlanLimits = async () => {
    try {
      const response = await makeAuthenticatedRequest('http://localhost:3001/api/subscription/limits');
      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          setPlanLimits({
            current: data.current || 0,
            max: data.max || 1,
            plan: data.plan || 'BASIC'
          });
        }
      } else {
        setPlanLimits({ current: 0, max: 1, plan: 'BASIC' });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar limites:', error);
      setPlanLimits({ current: 0, max: 1, plan: 'BASIC' });
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await makeAuthenticatedRequest('http://localhost:3001/api/statistics/appointments');
      if (response && response.ok) {
        const data = await response.json();
        setProfessionalStats(prev => ({
          ...prev,
          totalAppointments: data.totalAppointments || 0,
          monthlyGrowth: data.monthlyGrowth || 0
        }));
      } else {
        setProfessionalStats(prev => ({
          ...prev,
          totalAppointments: 0,
          monthlyGrowth: 0
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error);
    }
  };

  const loadProfessionalsOptimized = async () => {
    try {
      const response = await makeAuthenticatedRequest('http://localhost:3001/api/professionals?active_only=true');
      if (response && response.ok) {
        const data = await response.json();
        const professionalsData = data.data || [];
        setProfessionals(professionalsData);
        setProfessionalStats(prev => ({ 
          ...prev, 
          totalProfessionals: professionalsData.length
        }));
        return professionalsData;
      } else {
        setProfessionals([]);
        return [];
      }
    } catch (error) {
      console.error('❌ Erro de rede:', error);
      setProfessionals([]);
      return [];
    }
  };

  const loadCalendarStatusBatch = async (professionalsData) => {
    try {
      const calendarPromises = professionalsData.map(async (prof) => {
        try {
          const response = await makeAuthenticatedRequest(`http://localhost:3001/api/calendar/status/${prof.id}`);
          if (response && response.ok) {
            const data = await response.json();
            return {
              professionalId: prof.id,
              connected: data.professional?.connected || false,
              last_sync: data.professional?.last_sync
            };
          } else {
            return {
              professionalId: prof.id,
              connected: false,
              last_sync: null
            };
          }
        } catch (error) {
          console.error(`❌ Erro calendar ${prof.id}:`, error);
          return {
            professionalId: prof.id,
            connected: false,
            last_sync: null
          };
        }
      });
      const calendarResults = await Promise.all(calendarPromises);
      const newCalendarStatus = {};
      calendarResults.forEach(result => {
        newCalendarStatus[result.professionalId] = {
          connected: result.connected,
          last_sync: result.last_sync
        };
      });
      setCalendarStatus(newCalendarStatus);
    } catch (error) {
      console.error('❌ Erro no carregamento batch de calendários:', error);
    }
  };

  const loadCalendarStatus = async (professionalId) => {
    try {
      const response = await makeAuthenticatedRequest(`http://localhost:3001/api/calendar/status/${professionalId}`);
      if (response && response.ok) {
        const data = await response.json();
        const isConnected = data.professional?.connected || false;
        setCalendarStatus(prev => ({
          ...prev,
          [professionalId]: {
            connected: isConnected,
            last_sync: data.professional?.last_sync
          }
        }));
      } else {
        setCalendarStatus(prev => ({
          ...prev,
          [professionalId]: {
            connected: false,
            last_sync: null
          }
        }));
      }
    } catch (error) {
      console.error(`❌ Erro ao carregar status do calendar para ${professionalId}:`, error);
      setCalendarStatus(prev => ({
        ...prev,
        [professionalId]: {
          connected: false,
          last_sync: null
        }
      }));
    }
  };

  const handleConnectCalendar = async (professional) => {
    try {
      setCalendarLoading(prev => ({ ...prev, [professional.id]: true }));
      const response = await makeAuthenticatedRequest(`http://localhost:3001/api/calendar/connect/${professional.id}`, {
        method: 'POST'
      });
      if (response && response.ok) {
        const data = await response.json();
        if (data.auth_url) {
          const popup = window.open(data.auth_url, 'google-auth', 'width=500,height=600');
          if (!popup) {
            showNotification('Por favor, permita popups para conectar o Google Calendar', 'warning');
            setCalendarLoading(prev => ({ ...prev, [professional.id]: false }));
            return;
          }
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              setTimeout(() => {
                loadCalendarStatus(professional.id);
                setCalendarLoading(prev => ({ ...prev, [professional.id]: false }));
              }, 3000);
            }
          }, 1000);
        } else {
          showNotification('Erro interno: URL de autorização não gerada', 'error');
          setCalendarLoading(prev => ({ ...prev, [professional.id]: false }));
        }
      } else {
        showNotification('Erro ao conectar com Google Calendar. Tente novamente.', 'error');
        setCalendarLoading(prev => ({ ...prev, [professional.id]: false }));
      }
    } catch (error) {
      showNotification('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
      setCalendarLoading(prev => ({ ...prev, [professional.id]: false }));
    }
  };

  const handleViewCalendar = async (professional, retryCount = 0) => {
      setSelectedProfessional(professional);
      setShowCalendarModal(true);
      setCalendarLoading(prev => ({ ...prev, [professional.id]: true }));
      
      try {
        // NOVO: Carregar horário comercial individual
        const businessHoursResponse = await makeAuthenticatedRequest(
          `http://localhost:3001/api/calendar/business-hours/professional/${professional.id}`
        );
        if (businessHoursResponse && businessHoursResponse.ok) {
          const data = await businessHoursResponse.json();
          if (data.success && data.businessHours) {
            setProfessionalBusinessHours(data.businessHours);
          }
        }

        // NOVO: Carregar bloqueios individuais
        const blockedTimesResponse = await makeAuthenticatedRequest(
          `http://localhost:3001/api/calendar/blocked-times/professional/${professional.id}`
        );
        if (blockedTimesResponse && blockedTimesResponse.ok) {
          const data = await blockedTimesResponse.json();
          if (data.success) {
            setProfessionalBlockedTimes(data.blockedTimes || []);
          }
        }

        const response = await makeAuthenticatedRequest(`http://localhost:3001/api/calendar/events/${professional.id}`);
        
        if (response && response.ok) {
          const data = await response.json();
          if (data.token_refreshed && retryCount < 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return handleViewCalendar(professional, retryCount + 1);
          }
          setCalendarEvents(data.events || []);
        } else {
          setCalendarEvents([]);
        }
      } catch (error) {
        setCalendarEvents([]);
      }
      
      setCalendarLoading(prev => ({ ...prev, [professional.id]: false }));
  };

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
      display_order: professionals.length,
      default_appointment_duration_minutes: 60,
      has_individual_business_hours: false
    });
    setShowModal(true);
  };

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
      display_order: professional.display_order || 0,
      default_appointment_duration_minutes: professional.default_appointment_duration_minutes || 60,
      has_individual_business_hours: professional.has_individual_business_hours || false
    });
    setShowModal(true);
  };

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
      display_order: 0,
      default_appointment_duration_minutes: 60,
      has_individual_business_hours: false
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.email || !formData.specialty) {
        showNotification('Preencha os campos obrigatórios: Nome, Email e Especialidade', 'warning');
        return;
      }

      if (!editingProfessional && planLimits.max !== -1 && professionals.length >= planLimits.max) {
        showNotification(`Plano ${planLimits.plan} permite apenas ${planLimits.max} profissional(is). Faça upgrade para adicionar mais.`, 'warning');
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
        display_order: formData.display_order,
        default_appointment_duration_minutes: parseInt(formData.default_appointment_duration_minutes),
        has_individual_business_hours: formData.has_individual_business_hours
      };

      let response;
      if (editingProfessional) {
        response = await makeAuthenticatedRequest(`http://localhost:3001/api/professionals/${editingProfessional.id}`, {
          method: 'PUT',
          body: JSON.stringify(professionalData)
        });
      } else {
        response = await makeAuthenticatedRequest('http://localhost:3001/api/professionals', {
          method: 'POST',
          body: JSON.stringify(professionalData)
        });
      }

      if (response && response.ok) {
        closeModal();
        await Promise.all([
          loadProfessionalsOptimized(),
          loadPlanLimits()
        ]);
        showNotification(editingProfessional ? 'Profissional atualizado com sucesso! 👨‍⚕️' : 'Profissional adicionado com sucesso! 👨‍⚕️', 'success');
      } else if (response) {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || 'Erro ao salvar profissional';
          showNotification(`Erro: ${errorMessage}`, 'error');
        } catch {
          showNotification(`Erro HTTP ${response.status}: Verifique os dados e tente novamente`, 'error');
        }
      } else {
        showNotification('Erro de autenticação. Faça login novamente.', 'error');
      }
    } catch (error) {
      showNotification('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
    }
  };

  const handleDelete = async (professional) => {
    if (!window.confirm(`Tem certeza que deseja remover ${professional.name}?`)) {
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(`http://localhost:3001/api/professionals/${professional.id}`, {
        method: 'DELETE'
      });

      if (response && response.ok) {
        await Promise.all([
          loadProfessionalsOptimized(),
          loadPlanLimits()
        ]);
      } else if (response) {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || 'Erro ao remover profissional';
          showNotification(`Erro: ${errorMessage}`, 'error');
        } catch {
          showNotification(`Erro HTTP ${response.status}: Verifique e tente novamente`, 'error');
        }
      } else {
        showNotification('Erro de autenticação. Faça login novamente.', 'error');
      }
    } catch (error) {
      showNotification('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
    }
  };

  // ✅ FUNÇÕES DE NAVEGAÇÃO DO CALENDÁRIO INDIVIDUAL
  const navigateIndividualMonth = (direction) => {
    const newDate = new Date(currentCalendarDate);
    newDate.setMonth(currentCalendarDate.getMonth() + direction);
    setCurrentCalendarDate(newDate);
  };
  
  const getDaysInIndividualMonth = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Dias do mês anterior
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({ date, isCurrentMonth: true });
    }
    
    // Dias do próximo mês para completar a grade
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({ date: nextDate, isCurrentMonth: false });
    }
    
    return days;
  };
  
  const getAppointmentsForIndividualDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return calendarEvents.filter(apt => {
      const aptDate = new Date(apt.start?.dateTime || apt.start).toISOString().split('T')[0];
      return aptDate === dateStr;
    });
  };
  
  const isIndividualDateBlocked = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return professionalBlockedTimes.some(block => {
      const blockStart = block.start_date;
      const blockEnd = block.end_date || blockStart;
      return dateStr >= blockStart && dateStr <= blockEnd;
    });
  };

  // ✅ FUNÇÃO PARA MOSTRAR POPUP DE EVENTO
  const showEventPopup = (event, mouseEvent) => {
    const rect = mouseEvent.target.getBoundingClientRect();
    setEventPopup({
      event,
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY + 5
    });
  };

  // ✅ RENDERIZAÇÃO DO CALENDÁRIO INDIVIDUAL COM EVENTOS APENAS COMO NOME
  const renderIndividualCalendar = () => {
    const days = getDaysInIndividualMonth();
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px' 
        }}>
          <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '600', margin: 0 }}>
            {currentCalendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              style={styles.secondaryButton}
              onClick={() => navigateIndividualMonth(-1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              style={styles.secondaryButton}
              onClick={() => navigateIndividualMonth(1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        
        {/* Cabeçalho dos dias da semana */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: '1px',
          marginBottom: '8px'
        }}>
          {weekDays.map(day => (
            <div key={day} style={{
              padding: '12px 8px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {day}
            </div>
          ))}
        </div>
        
        {/* Grade do calendário */}
        <div style={styles.calendarGrid}>
          {days.map((dayObj, index) => {
            const appointments = getAppointmentsForIndividualDate(dayObj.date);
            const isBlocked = isIndividualDateBlocked(dayObj.date);
            const isToday = dayObj.date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                style={{
                  ...styles.calendarDay,
                  background: dayObj.isCurrentMonth 
                    ? (isToday ? 'rgba(109, 74, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)')
                    : 'rgba(255, 255, 255, 0.02)',
                  border: isBlocked ? '2px solid rgba(255, 99, 99, 0.5)' : 'none'
                }}
              >
                <div style={{
                  ...styles.calendarDayNumber,
                  color: dayObj.isCurrentMonth 
                    ? (isToday ? '#6D4AFF' : 'white') 
                    : 'rgba(255, 255, 255, 0.3)',
                  fontWeight: isToday ? '700' : '500'
                }}>
                  {dayObj.date.getDate()}
                </div>
                
                {/* Eventos como pequenos blocos com apenas o nome */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {appointments.slice(0, 2).map((apt, i) => {
                    // Extrair apenas o primeiro nome do summary
                    const eventName = (apt.summary || apt.title || 'Evento')
                      .split(' ')[0] // Pegar apenas a primeira palavra
                      .substring(0, 8); // Limitar a 8 caracteres
                    
                    return (
                      <div
                        key={i}
                        style={styles.eventInDay}
                        onClick={(e) => showEventPopup(apt, e)}
                        title={apt.summary || apt.title || 'Evento sem título'}
                      >
                        {eventName}
                      </div>
                    );
                  })}
                  {appointments.length > 2 && (
                    <div style={{
                      ...styles.eventInDay,
                      background: 'rgba(255, 255, 255, 0.3)',
                      textAlign: 'center'
                    }}>
                      +{appointments.length - 2}
                    </div>
                  )}
                </div>
                
                {/* Indicador de bloqueio */}
                {isBlocked && (
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px'
                  }}>
                    <Lock size={10} color="#FF6B6B" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  useEffect(() => {
    const loadDataOptimized = async () => {
      setLoading(true);
      try {
        const [professionalsResult] = await Promise.all([
          loadProfessionalsOptimized(),
          loadPlanLimits(),
          loadStatistics()
        ]);
        setLoading(false);
        if (professionalsResult && professionalsResult.length > 0) {
          loadCalendarStatusBatch(professionalsResult);
        }
      } catch (error) {
        setLoading(false);
      }
    };
    loadDataOptimized();
  }, []);

  // ✅ FECHAR POPUP AO CLICAR FORA
  useEffect(() => {
    const handleClickOutside = () => {
      setEventPopup(null);
    };
    
    if (eventPopup) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [eventPopup]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <RefreshCw size={32} style={{ 
            animation: 'spin 1s linear infinite', 
            color: '#6D4AFF', 
            marginBottom: '16px' 
          }} />
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.7)', 
            fontSize: '16px',
            marginBottom: '8px'
          }}>
            Carregando profissionais...
          </p>
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.5)', 
            fontSize: '12px'
          }}>
            ⚡ Otimizado para carregamento rápido
          </p>
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

      {/* ESTATÍSTICAS ATUALIZADAS */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h3 style={{...styles.statNumber, ...styles.statNumber1}}>{professionalStats.totalProfessionals}</h3>
          <p style={styles.statLabel}>Total de Profissionais</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={{...styles.statNumber, ...styles.statNumber2}}>{professionalStats.totalAppointments}</h3>
          <p style={styles.statLabel}>Consultas Este Mês</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={{...styles.statNumber, ...styles.statNumber3}}>{professionalStats.monthlyGrowth.toFixed(1)}%</h3>
          <p style={styles.statLabel}>Crescimento Mensal</p>
        </div>
      </div>

      {/* LISTA DE PROFISSIONAIS ATUALIZADA - CARDS MENORES E LADO A LADO */}
      {professionals.length === 0 ? (
        <div style={styles.emptyState}>
          <Users size={48} style={styles.emptyIcon} />
          <h3 style={styles.emptyText}>Nenhum profissional cadastrado</h3>
          <p style={styles.emptySubtext}>Adicione seu primeiro profissional para começar</p>
        </div>
      ) : (
        <div style={styles.professionalsGrid}>
          {professionals.map((professional) => {
            const isHovered = hoveredCard === professional.id;
            return (
              <div 
                key={professional.id} 
                style={{
                  ...styles.professionalCard,
                  ...(isHovered ? styles.professionalCardHover : {})
                }}
                onMouseEnter={() => setHoveredCard(professional.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div style={styles.professionalHeader}>
                  <div>
                    <h3 style={{
                      ...styles.professionalName,
                      color: isHovered ? '#2c2c2c' : 'rgba(255, 255, 255, 0.95)'
                    }}>
                      {professional.name}
                    </h3>
                    <p style={{
                      ...styles.professionalSpecialty,
                      color: isHovered ? '#4a4a4a' : 'rgba(255, 255, 255, 0.7)'
                    }}>
                      {professional.specialty}
                    </p>
                  </div>
                  <div style={styles.actionButtonsContainer}>
                    {/* Botão Google Calendar */}
                    <button 
                      style={{
                        ...styles.actionButton,
                        background: calendarStatus[professional.id]?.connected 
                          ? 'rgba(0, 166, 147, 0.2)' 
                          : 'rgba(255, 193, 7, 0.15)',
                        borderColor: calendarStatus[professional.id]?.connected 
                          ? 'rgba(0, 166, 147, 0.4)' 
                          : 'rgba(255, 193, 7, 0.3)',
                        color: calendarStatus[professional.id]?.connected 
                          ? '#00A693' 
                          : 'rgba(255, 193, 7, 0.9)',
                        cursor: calendarLoading[professional.id] ? 'wait' : 'pointer',
                        ...(isHovered && calendarStatus[professional.id]?.connected ? styles.calendarButtonHover : {}),
                        ...(isHovered && !calendarStatus[professional.id]?.connected ? styles.calendarButtonDisconnectedHover : {})
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
                        <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Calendar size={14} />
                      )}
                    </button>
                    
                    {/* Botão Editar AZUL */}
                    <button 
                      style={{
                        ...styles.actionButton,
                        ...styles.editButton,
                        ...(isHovered ? styles.editButtonHover : {})
                      }}
                      onClick={() => openEditModal(professional)}
                      title="Editar profissional"
                    >
                      <Edit3 size={14} />
                    </button>
                    
                    {/* Botão Deletar */}
                    <button 
                      style={{
                        ...styles.actionButton,
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        color: 'rgba(239, 68, 68, 0.8)',
                        ...(isHovered ? styles.deleteButtonHover : {})
                      }}
                      onClick={() => handleDelete(professional)}
                      title="Remover profissional"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={styles.professionalInfo}>
                  {professional.email && (
                    <div style={{
                      ...styles.professionalDetail,
                      color: isHovered ? '#4a4a4a' : 'rgba(255, 255, 255, 0.6)'
                    }}>
                      📧 {professional.email}
                    </div>
                  )}
                  {professional.phone && (
                    <div style={{
                      ...styles.professionalDetail,
                      color: isHovered ? '#4a4a4a' : 'rgba(255, 255, 255, 0.6)'
                    }}>
                      📱 {professional.phone}
                    </div>
                  )}
                  {professional.hourly_rate && (
                    <div style={{
                      ...styles.professionalDetail,
                      color: isHovered ? '#4a4a4a' : 'rgba(255, 255, 255, 0.6)'
                    }}>
                      💰 R$ {professional.hourly_rate}/hora
                    </div>
                  )}
                  {calendarStatus[professional.id]?.connected && (
                    <div style={{
                      ...styles.professionalDetail,
                      color: isHovered ? '#4a4a4a' : 'rgba(255, 255, 255, 0.6)'
                    }}>
                      ✅ Google Calendar conectado
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* POPUP DE DETALHES DO EVENTO */}
      {eventPopup && (
        <div 
          style={{
            ...styles.eventPopup,
            left: eventPopup.x,
            top: eventPopup.y
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={styles.eventPopupTitle}>
            {eventPopup.event.summary || eventPopup.event.title || 'Evento sem título'}
          </div>
          <div style={styles.eventPopupDetail}>
            📅 {eventPopup.event.start?.dateTime 
              ? new Date(eventPopup.event.start.dateTime).toLocaleString('pt-BR') 
              : eventPopup.event.start 
              ? new Date(eventPopup.event.start).toLocaleString('pt-BR')
              : 'Horário não definido'}
          </div>
          {eventPopup.event.description && (
            <div style={styles.eventPopupDetail}>
              📝 {eventPopup.event.description.substring(0, 100)}...
            </div>
          )}
          <div style={styles.eventPopupDetail}>
            📞 Agendado via Telegram
          </div>
        </div>
      )}

      {/* Modal do Google Calendar - ATUALIZADO */}
      {showCalendarModal && selectedProfessional && (
        <div style={styles.modal}>
          <div style={styles.calendarModalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                📅 Agenda de {selectedProfessional.name}
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  style={styles.closeButton}
                  onClick={() => {
                    setShowCalendarModal(false);
                    setSelectedProfessional(null);
                    setCalendarEvents([]);
                    setProfessionalBusinessHours({});
                    setProfessionalBlockedTimes([]);
                    setEventPopup(null); // Fechar popup também
                  }}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* NOVO: Renderização do Calendário Individual */}
            {renderIndividualCalendar()}
          </div>
        </div>
      )}

      {/* MODAIS DE FORMULÁRIO (mantidos iguais) */}
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

              {/* NOVO: Duração Padrão do Agendamento */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Duração Padrão do Agendamento (minutos)</label>
                <input
                  style={styles.input}
                  type="number"
                  value={formData.default_appointment_duration_minutes}
                  onChange={(e) => setFormData({...formData, default_appointment_duration_minutes: e.target.value})}
                  placeholder="60"
                />
              </div>

              {/* NOVO: Horário Comercial Individual */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Horário Comercial Individual</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.has_individual_business_hours}
                    onChange={(e) => setFormData({...formData, has_individual_business_hours: e.target.checked})}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Usar horário individual</span>
                </div>
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

    </div>
  );
};

export default ProfessionalDashboard;