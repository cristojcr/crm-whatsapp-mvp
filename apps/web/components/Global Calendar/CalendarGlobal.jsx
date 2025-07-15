'use client';
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Settings, 
  Plus, 
  Lock, 
  Users, 
  TrendingUp, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight,
  X,
  Save,
  Trash2,
  Edit3,
  AlertCircle,
  CheckCircle,
  Building,
  Globe
} from 'lucide-react';

const CalendarGlobal = ({ showNotification }) => {
  // ✅ ESTADOS PRINCIPAIS
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ ESTADOS DE CONFIGURAÇÃO GLOBAL
  const [companyBusinessHours, setCompanyBusinessHours] = useState({
    monday: { enabled: true, start: '08:00', end: '17:00', lunch_start: '12:00', lunch_end: '13:00' },
    tuesday: { enabled: true, start: '08:00', end: '17:00', lunch_start: '12:00', lunch_end: '13:00' },
    wednesday: { enabled: true, start: '08:00', end: '17:00', lunch_start: '12:00', lunch_end: '13:00' },
    thursday: { enabled: true, start: '08:00', end: '17:00', lunch_start: '12:00', lunch_end: '13:00' },
    friday: { enabled: true, start: '08:00', end: '17:00', lunch_start: '12:00', lunch_end: '13:00' },
    saturday: { enabled: false, start: '08:00', end: '12:00', lunch_start: '', lunch_end: '' },
    sunday: { enabled: false, start: '08:00', end: '12:00', lunch_start: '', lunch_end: '' }
  });
  
  // ✅ ESTADOS DE BLOQUEIOS
  const [globalBlockedTimes, setGlobalBlockedTimes] = useState([]);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockFormData, setBlockFormData] = useState({
    title: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    is_recurring: false,
    recurrence_type: 'weekly', // weekly, daily
    reason: ''
  });
  
  // ✅ ESTADOS DE AGENDAMENTOS E PROFISSIONAIS
  const [allAppointments, setAllAppointments] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [selectedProfessionals, setSelectedProfessionals] = useState([]);
  
  // ✅ ESTADOS DE DASHBOARDS
  const [dashboardMetrics, setDashboardMetrics] = useState({
    totalAppointments: 0,
    appointmentsToday: 0,
    appointmentsThisWeek: 0,
    appointmentsThisMonth: 0,
    averageAppointmentsPerDay: 0,
    busyHours: [],
    professionalUtilization: []
  });
  
  // ✅ ESTADOS DE MODAIS
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  
  // ✅ CORES DO TEMA PROTON
  const protonColors = {
    purple: '#6D4AFF',
    green: '#00A693',
    darkBg: '#1C1B1F',
    glassWhite: 'rgba(255, 255, 255, 0.15)',
    glassBorder: 'rgba(255, 255, 255, 0.2)',
    scalabotsPurple: '#8B5CF6'
  };
  
  // ✅ ESTILOS CONSISTENTES COM O TEMA
  const styles = {
    container: {
      padding: '0',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    title: {
      color: 'white',
      fontSize: '28px',
      fontWeight: '600',
      margin: 0,
      letterSpacing: '-0.02em'
    },
    card: {
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '20px'
    },
    button: {
      background: `linear-gradient(135deg, ${protonColors.purple} 0%, ${protonColors.green} 100%)`,
      border: 'none',
      borderRadius: '12px',
      padding: '12px 20px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 16px rgba(109, 74, 255, 0.3)'
    },
    secondaryButton: {
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '12px',
      padding: '12px 20px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s ease'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modalContent: {
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      padding: '32px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflowY: 'auto',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '8px',
      background: 'rgba(255, 255, 255, 0.1)',
      color: '#2c2c2c',
      fontSize: '14px',
      marginBottom: '16px',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '8px',
      background: 'rgba(255, 255, 255, 0.9)',
      color: '#2c2c2c',
      fontSize: '14px',
      marginBottom: '16px',
      boxSizing: 'border-box'
    }
  };
  
  // ✅ FUNÇÕES DE AUTENTICAÇÃO
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
    return null;
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
  
  // ✅ FUNÇÕES DE CARREGAMENTO DE DADOS
  const loadCompanyBusinessHours = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;
      
      const response = await makeAuthenticatedRequest(
        `http://localhost:3001/api/calendar/business-hours/company/${userId}`
      );
      
      if (response && response.ok) {
        const data = await response.json();
        if (data.success && data.businessHours) {
          setCompanyBusinessHours(data.businessHours);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar horário comercial:', error);
    }
  };
  
  const loadGlobalBlockedTimes = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;
      
      const response = await makeAuthenticatedRequest(
        `http://localhost:3001/api/calendar/blocked-times/global/${userId}`
      );
      
      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          setGlobalBlockedTimes(data.blockedTimes || []);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar bloqueios globais:', error);
    }
  };
  
  const loadProfessionals = async () => {
    try {
      const response = await makeAuthenticatedRequest('http://localhost:3001/api/professionals');
      
      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          setProfessionals(data.professionals || []);
          setSelectedProfessionals(data.professionals?.map(p => p.id) || []);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar profissionais:', error);
    }
  };
  
  const loadAllAppointments = async () => {
    try {
      const response = await makeAuthenticatedRequest('http://localhost:3001/api/appointments/all');
      
      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          setAllAppointments(data.appointments || []);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar agendamentos:', error);
    }
  };
  
  const calculateDashboardMetrics = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const appointmentsToday = allAppointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_at);
      return aptDate >= today && aptDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }).length;
    
    const appointmentsThisWeek = allAppointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_at);
      return aptDate >= thisWeekStart;
    }).length;
    
    const appointmentsThisMonth = allAppointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_at);
      return aptDate >= thisMonthStart;
    }).length;
    
    // Calcular horários mais movimentados
    const hourCounts = {};
    allAppointments.forEach(apt => {
      const hour = new Date(apt.scheduled_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const busyHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }));
    
    // Calcular utilização por profissional
    const professionalCounts = {};
    allAppointments.forEach(apt => {
      const profId = apt.professional_id;
      professionalCounts[profId] = (professionalCounts[profId] || 0) + 1;
    });
    
    const professionalUtilization = professionals.map(prof => ({
      id: prof.id,
      name: prof.name,
      appointments: professionalCounts[prof.id] || 0
    })).sort((a, b) => b.appointments - a.appointments);
    
    setDashboardMetrics({
      totalAppointments: allAppointments.length,
      appointmentsToday,
      appointmentsThisWeek,
      appointmentsThisMonth,
      averageAppointmentsPerDay: appointmentsThisMonth / now.getDate(),
      busyHours,
      professionalUtilization
    });
  };
  
  // ✅ FUNÇÕES DE SALVAMENTO
  const saveCompanyBusinessHours = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;
      
      const response = await makeAuthenticatedRequest(
        `http://localhost:3001/api/calendar/business-hours/company/${userId}`,
        {
          method: 'POST',
          body: JSON.stringify({ businessHours: companyBusinessHours })
        }
      );
      
      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          showNotification('Horário comercial salvo com sucesso! ⏰', 'success');
          setShowBusinessHoursModal(false);
        } else {
          showNotification('Erro ao salvar horário comercial', 'error');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao salvar horário comercial:', error);
      showNotification('Erro ao salvar horário comercial', 'error');
    }
  };
  
  const saveGlobalBlockedTime = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;
      
      if (!blockFormData.title || !blockFormData.start_date || !blockFormData.start_time) {
        showNotification('Preencha todos os campos obrigatórios', 'warning');
        return;
      }
      
      const response = await makeAuthenticatedRequest(
        `http://localhost:3001/api/calendar/blocked-times/global/${userId}`,
        {
          method: 'POST',
          body: JSON.stringify(blockFormData)
        }
      );
      
      if (response && response.ok) {
        const data = await response.json();
        if (data.success) {
          showNotification('Bloqueio criado com sucesso! 🔒', 'success');
          setShowBlockModal(false);
          setBlockFormData({
            title: '',
            start_date: '',
            end_date: '',
            start_time: '',
            end_time: '',
            is_recurring: false,
            recurrence_type: 'weekly',
            reason: ''
          });
          loadGlobalBlockedTimes();
        } else {
          showNotification('Erro ao criar bloqueio', 'error');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao salvar bloqueio:', error);
      showNotification('Erro ao salvar bloqueio', 'error');
    }
  };
  
  // ✅ FUNÇÕES DE NAVEGAÇÃO DO CALENDÁRIO
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };
  
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
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
  
  const getAppointmentsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return allAppointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_at).toISOString().split('T')[0];
      return aptDate === dateStr && selectedProfessionals.includes(apt.professional_id);
    });
  };
  
  const isDateBlocked = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return globalBlockedTimes.some(block => {
      const blockStart = block.start_date;
      const blockEnd = block.end_date || blockStart;
      return dateStr >= blockStart && dateStr <= blockEnd;
    });
  };
  
  // ✅ CARREGAMENTO INICIAL
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadCompanyBusinessHours(),
          loadGlobalBlockedTimes(),
          loadProfessionals(),
          loadAllAppointments()
        ]);
      } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // ✅ RECALCULAR MÉTRICAS QUANDO DADOS MUDAREM
  useEffect(() => {
    if (allAppointments.length > 0 && professionals.length > 0) {
      calculateDashboardMetrics();
    }
  }, [allAppointments, professionals]);
  
  // ✅ RENDERIZAÇÃO DO CALENDÁRIO
  const renderCalendar = () => {
    const days = getDaysInMonth();
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    return (
      <div style={styles.card}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px' 
        }}>
          <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '600', margin: 0 }}>
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              style={styles.secondaryButton}
              onClick={() => navigateMonth(-1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              style={styles.secondaryButton}
              onClick={() => navigateMonth(1)}
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
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: '1px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {days.map((dayObj, index) => {
            const appointments = getAppointmentsForDate(dayObj.date);
            const isBlocked = isDateBlocked(dayObj.date);
            const isToday = dayObj.date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                style={{
                  minHeight: '80px',
                  padding: '8px',
                  background: dayObj.isCurrentMonth 
                    ? (isToday ? 'rgba(109, 74, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)')
                    : 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer',
                  position: 'relative',
                  border: isBlocked ? '2px solid rgba(255, 99, 99, 0.5)' : 'none'
                }}
                onClick={() => setSelectedDate(dayObj.date)}
              >
                <div style={{
                  color: dayObj.isCurrentMonth 
                    ? (isToday ? '#6D4AFF' : 'white') 
                    : 'rgba(255, 255, 255, 0.3)',
                  fontSize: '14px',
                  fontWeight: isToday ? '700' : '500',
                  marginBottom: '4px'
                }}>
                  {dayObj.date.getDate()}
                </div>
                
                {/* Indicadores de agendamentos */}
                {appointments.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    bottom: '4px',
                    left: '4px',
                    right: '4px',
                    display: 'flex',
                    gap: '2px',
                    flexWrap: 'wrap'
                  }}>
                    {appointments.slice(0, 3).map((apt, i) => (
                      <div
                        key={i}
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#00A693'
                        }}
                      />
                    ))}
                    {appointments.length > 3 && (
                      <div style={{
                        fontSize: '10px',
                        color: '#00A693',
                        fontWeight: '600'
                      }}>
                        +{appointments.length - 3}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Indicador de bloqueio */}
                {isBlocked && (
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px'
                  }}>
                    <Lock size={12} color="#FF6B6B" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // ✅ RENDERIZAÇÃO DOS DASHBOARDS
  const renderDashboards = () => (
    <div style={styles.card}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '600', margin: 0 }}>
          📊 Métricas de Agendamento
        </h3>
        <button
          style={styles.secondaryButton}
          onClick={() => setShowDashboardModal(true)}
        >
          <BarChart3 size={16} />
          Ver Detalhes
        </button>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#6D4AFF', marginBottom: '8px' }}>
            {dashboardMetrics.totalAppointments}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
            Total de Agendamentos
          </div>
        </div>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#00A693', marginBottom: '8px' }}>
            {dashboardMetrics.appointmentsToday}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
            Agendamentos Hoje
          </div>
        </div>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#FFB020', marginBottom: '8px' }}>
            {dashboardMetrics.appointmentsThisWeek}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
            Esta Semana
          </div>
        </div>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#FF6B6B', marginBottom: '8px' }}>
            {Math.round(dashboardMetrics.averageAppointmentsPerDay)}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
            Média por Dia
          </div>
        </div>
      </div>
      
      {/* Horários mais movimentados */}
      {dashboardMetrics.busyHours.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            🕐 Horários Mais Movimentados
          </h4>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {dashboardMetrics.busyHours.map((hour, index) => (
              <div key={index} style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Clock size={16} color="#00A693" />
                <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
                  {hour.hour}:00 ({hour.count} agendamentos)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
  
  // ✅ RENDERIZAÇÃO PRINCIPAL
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ color: 'white', fontSize: '18px' }}>Carregando calendário...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📅 Calendário Global da Empresa</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            style={styles.secondaryButton}
            onClick={() => setShowBusinessHoursModal(true)}
          >
            <Settings size={16} />
            Horário Comercial
          </button>
          <button
            style={styles.button}
            onClick={() => setShowBlockModal(true)}
          >
            <Plus size={16} />
            Bloquear Horário
          </button>
        </div>
      </div>
      
      {/* Filtro de Profissionais */}
      <div style={styles.card}>
        <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          👥 Filtrar por Profissionais
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            style={{
              ...styles.secondaryButton,
              background: selectedProfessionals.length === professionals.length 
                ? `linear-gradient(135deg, ${protonColors.purple} 0%, ${protonColors.green} 100%)`
                : 'rgba(255, 255, 255, 0.1)'
            }}
            onClick={() => setSelectedProfessionals(
              selectedProfessionals.length === professionals.length 
                ? [] 
                : professionals.map(p => p.id)
            )}
          >
            <Users size={16} />
            Todos ({professionals.length})
          </button>
          {professionals.map(prof => (
            <button
              key={prof.id}
              style={{
                ...styles.secondaryButton,
                background: selectedProfessionals.includes(prof.id)
                  ? 'rgba(0, 166, 147, 0.3)'
                  : 'rgba(255, 255, 255, 0.1)'
              }}
              onClick={() => {
                setSelectedProfessionals(prev => 
                  prev.includes(prof.id)
                    ? prev.filter(id => id !== prof.id)
                    : [...prev, prof.id]
                );
              }}
            >
              {prof.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Calendário */}
      {renderCalendar()}
      
      {/* Dashboards */}
      {renderDashboards()}
      
      {/* Modal de Horário Comercial */}
      {showBusinessHoursModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '24px' 
            }}>
              <h2 style={{ color: '#2c2c2c', fontSize: '24px', fontWeight: '600', margin: 0 }}>
                ⏰ Horário Comercial da Empresa
              </h2>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setShowBusinessHoursModal(false)}
              >
                <X size={24} color="#666" />
              </button>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              {Object.entries(companyBusinessHours).map(([day, hours]) => (
                <div key={day} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  marginBottom: '16px',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: '8px'
                }}>
                  <input
                    type="checkbox"
                    checked={hours.enabled}
                    onChange={(e) => setCompanyBusinessHours(prev => ({
                      ...prev,
                      [day]: { ...prev[day], enabled: e.target.checked }
                    }))}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <div style={{ width: '80px', fontSize: '14px', fontWeight: '600', color: '#2c2c2c' }}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </div>
                  {hours.enabled && (
                    <>
                      <input
                        type="time"
                        value={hours.start}
                        onChange={(e) => setCompanyBusinessHours(prev => ({
                          ...prev,
                          [day]: { ...prev[day], start: e.target.value }
                        }))}
                        style={{ ...styles.input, width: '120px', marginBottom: 0 }}
                      />
                      <span style={{ color: '#666' }}>às</span>
                      <input
                        type="time"
                        value={hours.end}
                        onChange={(e) => setCompanyBusinessHours(prev => ({
                          ...prev,
                          [day]: { ...prev[day], end: e.target.value }
                        }))}
                        style={{ ...styles.input, width: '120px', marginBottom: 0 }}
                      />
                      <span style={{ color: '#666' }}>Almoço:</span>
                      <input
                        type="time"
                        value={hours.lunch_start}
                        onChange={(e) => setCompanyBusinessHours(prev => ({
                          ...prev,
                          [day]: { ...prev[day], lunch_start: e.target.value }
                        }))}
                        style={{ ...styles.input, width: '120px', marginBottom: 0 }}
                      />
                      <span style={{ color: '#666' }}>às</span>
                      <input
                        type="time"
                        value={hours.lunch_end}
                        onChange={(e) => setCompanyBusinessHours(prev => ({
                          ...prev,
                          [day]: { ...prev[day], lunch_end: e.target.value }
                        }))}
                        style={{ ...styles.input, width: '120px', marginBottom: 0 }}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                style={styles.secondaryButton}
                onClick={() => setShowBusinessHoursModal(false)}
              >
                Cancelar
              </button>
              <button
                style={styles.button}
                onClick={saveCompanyBusinessHours}
              >
                <Save size={16} />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Bloqueio de Horário */}
      {showBlockModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '24px' 
            }}>
              <h2 style={{ color: '#2c2c2c', fontSize: '24px', fontWeight: '600', margin: 0 }}>
                🔒 Bloquear Horário Global
              </h2>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setShowBlockModal(false)}
              >
                <X size={24} color="#666" />
              </button>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#2c2c2c', fontWeight: '600' }}>
                Título do Bloqueio *
              </label>
              <input
                type="text"
                value={blockFormData.title}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Feriado Nacional, Reunião Geral..."
                style={styles.input}
              />
              
              <label style={{ display: 'block', marginBottom: '8px', color: '#2c2c2c', fontWeight: '600' }}>
                Data de Início *
              </label>
              <input
                type="date"
                value={blockFormData.start_date}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, start_date: e.target.value }))}
                style={styles.input}
              />
              
              <label style={{ display: 'block', marginBottom: '8px', color: '#2c2c2c', fontWeight: '600' }}>
                Data de Fim (opcional)
              </label>
              <input
                type="date"
                value={blockFormData.end_date}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, end_date: e.target.value }))}
                style={styles.input}
              />
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#2c2c2c', fontWeight: '600' }}>
                    Hora de Início *
                  </label>
                  <input
                    type="time"
                    value={blockFormData.start_time}
                    onChange={(e) => setBlockFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    style={styles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#2c2c2c', fontWeight: '600' }}>
                    Hora de Fim
                  </label>
                  <input
                    type="time"
                    value={blockFormData.end_time}
                    onChange={(e) => setBlockFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    style={styles.input}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2c2c2c' }}>
                  <input
                    type="checkbox"
                    checked={blockFormData.is_recurring}
                    onChange={(e) => setBlockFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                  />
                  Bloqueio recorrente
                </label>
              </div>
              
              {blockFormData.is_recurring && (
                <>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#2c2c2c', fontWeight: '600' }}>
                    Tipo de Recorrência
                  </label>
                  <select
                    value={blockFormData.recurrence_type}
                    onChange={(e) => setBlockFormData(prev => ({ ...prev, recurrence_type: e.target.value }))}
                    style={styles.select}
                  >
                    <option value="weekly">Semanal</option>
                    <option value="daily">Diário</option>
                  </select>
                </>
              )}
              
              <label style={{ display: 'block', marginBottom: '8px', color: '#2c2c2c', fontWeight: '600' }}>
                Motivo (opcional)
              </label>
              <textarea
                value={blockFormData.reason}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Descreva o motivo do bloqueio..."
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                style={styles.secondaryButton}
                onClick={() => setShowBlockModal(false)}
              >
                Cancelar
              </button>
              <button
                style={styles.button}
                onClick={saveGlobalBlockedTime}
              >
                <Save size={16} />
                Criar Bloqueio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarGlobal;