'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Users, Plus, Calendar, Star, Phone, Mail, X, LogOut, RefreshCw } from 'lucide-react';

const ProfessionalDashboard = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [professionals, setProfessionals] = useState([]);
  const [planLimits, setPlanLimits] = useState({ current: 0, max: 1, plan: 'BASIC' });
  const [stats, setStats] = useState({
    totalProfessionals: 0,
    totalAppointments: 0,
    monthlyGrowth: 0
  });
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState('checking');
  const [userInfo, setUserInfo] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProfessional, setNewProfessional] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    google_calendar_email: '',
    bio: '',
    hourly_rate: ''
  });

  // Verificar autenticação
  useEffect(() => {
    checkAuth();
  }, []);

  // Verificar se voltou do login após um pequeno delay
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkRedirectAfterLogin = () => {
      const shouldRedirect = localStorage.getItem('redirectAfterLogin');
      const timestamp = localStorage.getItem('redirectAfterLoginTimestamp');
      
      if (shouldRedirect === '/professionals' && pathname !== '/professionals' && timestamp) {
        const timeSinceRedirect = Date.now() - parseInt(timestamp);
        
        if (timeSinceRedirect < 30000) {
          console.log('🔄 Redirecionando para professionals após login...');
          localStorage.removeItem('redirectAfterLogin');
          localStorage.removeItem('redirectAfterLoginTimestamp');
          router.push('/professionals');
          return;
        }
      }
      
      if (timestamp && (Date.now() - parseInt(timestamp)) > 30000) {
        localStorage.removeItem('redirectAfterLogin');
        localStorage.removeItem('redirectAfterLoginTimestamp');
      }
    };

    const timeout = setTimeout(checkRedirectAfterLogin, 1000);
    return () => clearTimeout(timeout);
  }, [pathname, router]);

  const checkAuth = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const token = localStorage.getItem('token');
    
    if (!token) {
      setAuthStatus('missing');
      setLoading(false);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = new Date() > new Date(payload.exp * 1000);
      
      if (isExpired) {
        setAuthStatus('expired');
        setLoading(false);
        return;
      }

      setUserInfo({
        email: payload.email || 'Usuário',
        exp: new Date(payload.exp * 1000).toLocaleString()
      });
      setAuthStatus('authenticated');
      
      if (pathname !== '/professionals') {
        console.log('🔄 Token válido, redirecionando para professionals...');
        router.push('/professionals');
        return;
      }
      
      loadData();
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      setAuthStatus('expired');
      setLoading(false);
    }
  };

  const handleTokenExpired = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    setAuthStatus('expired');
    router.push('/login');
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    router.push('/login');
  };

  const handleLogin = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('redirectAfterLogin', '/professionals');
      localStorage.setItem('redirectAfterLoginTimestamp', Date.now().toString());
    }
    router.push('/login');
  };

  const makeAuthenticatedRequest = async (url, options = {}) => {
    if (typeof window === 'undefined') {
      throw new Error('Não é possível fazer requisições no servidor');
    }

    const token = localStorage.getItem('token');
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (response.status === 401 || response.status === 403) {
      handleTokenExpired();
      throw new Error('Token expirado');
    }

    return response;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProfessionals(),
        loadPlanLimits(),
        loadAppointmentStats()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
    setLoading(false);
  };

  const loadProfessionals = async () => {
    try {
      const response = await makeAuthenticatedRequest('http://localhost:3001/api/professionals');
      const data = await response.json();
      setProfessionals(data.data || []);
      setStats(prev => ({ ...prev, totalProfessionals: data.data?.length || 0 }));
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
    }
  };

  const loadPlanLimits = async () => {
    try {
      const response = await makeAuthenticatedRequest('http://localhost:3001/api/subscription/limits');
      const data = await response.json();
      if (data.success) {
        setPlanLimits({
          current: data.current,
          max: data.max,
          plan: data.plan
        });
      }
    } catch (error) {
      console.error('Erro ao carregar limites:', error);
    }
  };

  const loadAppointmentStats = async () => {
    try {
      const response = await makeAuthenticatedRequest('http://localhost:3001/api/appointments/stats');
      if (response.ok) {
        const appointmentsData = await response.json();
        setStats(prev => ({
          ...prev,
          totalAppointments: appointmentsData.total_this_month || 0,
          monthlyGrowth: appointmentsData.growth_percentage || 0
        }));
      }
    } catch (error) {
      console.log('📊 Sem dados de appointments disponíveis');
    }
  };

  const handleAddProfessional = async (e) => {
    e.preventDefault();
    try {
      const response = await makeAuthenticatedRequest('http://localhost:3001/api/professionals', {
        method: 'POST',
        body: JSON.stringify(newProfessional)
      });

      if (response.ok) {
        await loadData();
        setShowAddModal(false);
        setNewProfessional({
          name: '', email: '', phone: '', specialty: '', 
          google_calendar_email: '', bio: '', hourly_rate: ''
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao adicionar profissional');
      }
    } catch (error) {
      console.error('Erro ao adicionar profissional:', error);
      alert('Erro ao adicionar profissional');
    }
  };

  // Estilos Premium (baseado no MultiChannelDashboard)
  const styles = {
    container: { 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      padding: '24px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh'
    },
    header: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '24px' 
    },
    title: { 
      fontSize: '28px', 
      fontWeight: 'bold', 
      color: 'white', 
      textShadow: '0 2px 4px rgba(0,0,0,0.1)',
      margin: 0
    },
    subtitle: {
      fontSize: '16px',
      color: 'rgba(255, 255, 255, 0.8)',
      marginTop: '4px'
    },
    authBanner: {
      background: 'rgba(255, 255, 255, 0.95)', 
      padding: '16px 24px', 
      borderRadius: '16px', 
      marginBottom: '20px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    planBanner: {
      background: 'rgba(255, 255, 255, 0.95)', 
      padding: '16px 24px', 
      borderRadius: '16px', 
      marginBottom: '20px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.3)'
    },
    metricsGrid: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
      gap: '24px', 
      marginBottom: '30px' 
    },
    metricCard: { 
      background: 'rgba(255, 255, 255, 0.95)', 
      padding: '24px', 
      borderRadius: '20px', 
      boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.3)'
    },
    metricLabel: { 
      fontSize: '13px', 
      color: '#6b7280', 
      fontWeight: '600', 
      textTransform: 'uppercase', 
      marginBottom: '12px',
      margin: 0
    },
    metricValue: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start', 
      fontSize: '36px', 
      fontWeight: 'bold', 
      color: '#111827', 
      marginBottom: '8px' 
    },
    metricIcon: { 
      fontSize: '24px', 
      color: '#9ca3af' 
    },
    metricGrowth: { 
      fontSize: '13px', 
      color: '#10b981', 
      fontWeight: '500',
      margin: 0
    },
    sectionCard: { 
      background: 'rgba(255, 255, 255, 0.95)', 
      borderRadius: '20px', 
      marginBottom: '24px', 
      boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.3)'
    },
    sectionHeader: { 
      padding: '20px 24px', 
      borderBottom: '1px solid #f3f4f6',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    sectionTitle: { 
      margin: 0, 
      fontSize: '18px', 
      fontWeight: '600', 
      color: '#111827' 
    },
    addButton: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      padding: '12px 20px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
      transition: 'all 0.2s ease'
    },
    professionalsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: '20px',
      padding: '24px'
    },
    professionalCard: {
      background: '#f9fafb',
      padding: '20px',
      borderRadius: '16px',
      border: '1px solid #f3f4f6',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    professionalHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '16px'
    },
    professionalAvatar: {
      width: '50px',
      height: '50px',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '20px',
      fontWeight: 'bold',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    },
    professionalName: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1f2937',
      margin: 0
    },
    professionalSpecialty: {
      fontSize: '14px',
      color: '#6366f1',
      fontWeight: '500',
      margin: 0
    },
    professionalDetails: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    detailItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      color: '#6b7280'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 24px',
      color: '#9ca3af'
    },
    emptyIcon: {
      fontSize: '48px',
      marginBottom: '16px'
    },
    emptyTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px'
    },
    emptySubtitle: {
      fontSize: '16px',
      color: '#6b7280',
      marginBottom: '24px'
    },
    loadingContainer: { 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      width: '100%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    spinner: { 
      width: '50px', 
      height: '50px', 
      border: '5px solid rgba(255, 255, 255, 0.3)', 
      borderTopColor: '#fff', 
      borderRadius: '50%', 
      animation: 'spin 1s linear infinite' 
    }
  };

  // Componente de status de autenticação
  const AuthStatusBanner = () => {
    if (authStatus === 'authenticated' && pathname && pathname.includes('/dashboard/multicanal')) {
      return (
        <div style={{...styles.authBanner, background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{width: '12px', height: '12px', background: '#f59e0b', borderRadius: '50%', animation: 'pulse 2s infinite'}}></div>
            <div>
              <div style={{fontWeight: '600', color: '#92400e'}}>🔄 Redirecionando...</div>
              <div style={{fontSize: '14px', color: '#a16207'}}>Você será redirecionado para o dashboard de profissionais</div>
            </div>
          </div>
          <button
            onClick={() => router.push('/professionals')}
            style={{...styles.addButton, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}}
          >
            Ir Agora
          </button>
        </div>
      );
    }

    if (authStatus === 'checking') {
      return (
        <div style={{...styles.authBanner, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <RefreshCw style={{width: '20px', height: '20px', color: '#3b82f6', animation: 'spin 2s linear infinite'}} />
            <span style={{color: '#1e40af', fontWeight: '500'}}>Verificando autenticação...</span>
          </div>
        </div>
      );
    }

    if (authStatus === 'authenticated') {
      return (
        <div style={{...styles.authBanner, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{width: '12px', height: '12px', background: '#10b981', borderRadius: '50%'}}></div>
            <div>
              <div style={{fontWeight: '600', color: '#065f46'}}>✅ Logado como: {userInfo?.email}</div>
              <div style={{fontSize: '12px', color: '#047857'}}>Token válido até: {userInfo?.exp}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#065f46',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <LogOut style={{width: '16px', height: '16px'}} />
            Sair
          </button>
        </div>
      );
    }

    if (authStatus === 'expired') {
      return (
        <div style={{...styles.authBanner, background: 'rgba(251, 146, 60, 0.1)', border: '1px solid rgba(251, 146, 60, 0.3)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{width: '12px', height: '12px', background: '#f97316', borderRadius: '50%'}}></div>
            <div>
              <div style={{fontWeight: '600', color: '#9a3412'}}>⏰ Sessão expirada</div>
              <div style={{fontSize: '14px', color: '#c2410c'}}>Faça login novamente para continuar</div>
            </div>
          </div>
          <button onClick={handleLogin} style={{...styles.addButton, background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'}}>
            Fazer Login
          </button>
        </div>
      );
    }

    if (authStatus === 'missing') {
      return (
        <div style={{...styles.authBanner, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%'}}></div>
            <div>
              <div style={{fontWeight: '600', color: '#991b1b'}}>🔒 Não autenticado</div>
              <div style={{fontSize: '14px', color: '#dc2626'}}>Faça login para acessar o dashboard</div>
            </div>
          </div>
          <button onClick={handleLogin} style={{...styles.addButton, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'}}>
            Fazer Login
          </button>
        </div>
      );
    }
  };

  // Se não estiver autenticado, mostrar apenas header e banner de auth
  if (authStatus !== 'authenticated') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>👨‍⚕️ Gestão de Profissionais</h1>
            <p style={styles.subtitle}>Gerencie sua equipe de profissionais e suas agendas</p>
          </div>
        </div>
        <AuthStatusBanner />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <style jsx global>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style jsx global>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>👨‍⚕️ Gestão de Profissionais</h1>
          <p style={styles.subtitle}>Gerencie sua equipe de profissionais e suas agendas</p>
        </div>
      </div>

      {/* Auth Status Banner */}
      <AuthStatusBanner />

      {/* Plan Limits Banner */}
      <div style={styles.planBanner}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <Users style={{width: '20px', height: '20px', color: '#6366f1'}} />
            <div>
              <div style={{fontWeight: '600', color: '#1f2937'}}>
                Profissionais: {planLimits.current} de {planLimits.max === -1 ? '∞' : planLimits.max}
              </div>
              <div style={{fontSize: '14px', color: '#6b7280'}}>Plano {planLimits.plan} ativo</div>
            </div>
          </div>
          {planLimits.max !== -1 && planLimits.current >= planLimits.max && (
            <div style={{color: '#f59e0b', fontSize: '14px', fontWeight: '500'}}>Limite atingido</div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>TOTAL DE PROFISSIONAIS</p>
          <div style={styles.metricValue}>
            <span>{stats.totalProfessionals}</span>
            <span style={styles.metricIcon}>👥</span>
          </div>
          <p style={styles.metricGrowth}>↗️ Equipe ativa</p>
        </div>

        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>CONSULTAS ESTE MÊS</p>
          <div style={styles.metricValue}>
            <span>{stats.totalAppointments}</span>
            <span style={styles.metricIcon}>📅</span>
          </div>
          <p style={styles.metricGrowth}>↗️ {stats.monthlyGrowth > 0 ? '+' : ''}{stats.monthlyGrowth.toFixed(1)}% este mês</p>
        </div>

        <div style={styles.metricCard}>
          <p style={styles.metricLabel}>CRESCIMENTO</p>
          <div style={styles.metricValue}>
            <span>{stats.monthlyGrowth > 0 ? '+' : ''}{stats.monthlyGrowth.toFixed(1)}%</span>
            <span style={styles.metricIcon}>📊</span>
          </div>
          <p style={styles.metricGrowth}>↗️ Progresso mensal</p>
        </div>
      </div>

      {/* Professionals Section */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>👨‍⚕️ Profissionais ({professionals.length})</h3>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={planLimits.max !== -1 && planLimits.current >= planLimits.max}
            style={{
              ...styles.addButton,
              opacity: (planLimits.max !== -1 && planLimits.current >= planLimits.max) ? 0.5 : 1,
              cursor: (planLimits.max !== -1 && planLimits.current >= planLimits.max) ? 'not-allowed' : 'pointer'
            }}
          >
            <Plus style={{width: '16px', height: '16px'}} />
            Adicionar Profissional
          </button>
        </div>

        {/* Professionals Grid */}
        {professionals.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>👨‍⚕️</div>
            <h3 style={styles.emptyTitle}>Nenhum profissional cadastrado</h3>
            <p style={styles.emptySubtitle}>Comece adicionando seu primeiro profissional à equipe</p>
            <button
              onClick={() => setShowAddModal(true)}
              style={styles.addButton}
            >
              ➕ Adicionar Primeiro Profissional
            </button>
          </div>
        ) : (
          <div style={styles.professionalsGrid}>
            {professionals.map((professional) => (
              <div key={professional.id} style={styles.professionalCard}>
                <div style={styles.professionalHeader}>
                  <div style={styles.professionalAvatar}>
                    {professional.name.charAt(0)}
                  </div>
                  <div>
                    <h4 style={styles.professionalName}>{professional.name}</h4>
                    <p style={styles.professionalSpecialty}>{professional.specialty}</p>
                  </div>
                </div>
                <div style={styles.professionalDetails}>
                  <div style={styles.detailItem}>
                    <Mail style={{width: '16px', height: '16px'}} />
                    {professional.email}
                  </div>
                  <div style={styles.detailItem}>
                    <Phone style={{width: '16px', height: '16px'}} />
                    {professional.phone}
                  </div>
                  <div style={styles.detailItem}>
                    <Calendar style={{width: '16px', height: '16px'}} />
                    {professional.google_calendar_email}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Professional Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '24px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h3 style={{fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: 0}}>Adicionar Profissional</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '24px'
                }}
              >
                <X style={{width: '20px', height: '20px'}} />
              </button>
            </div>
            
            <form onSubmit={handleAddProfessional} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <div>
                <label style={{display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px'}}>Nome</label>
                <input
                  type="text"
                  required
                  value={newProfessional.name}
                  onChange={(e) => setNewProfessional({...newProfessional, name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Dr. João Silva"
                />
              </div>
              
              <div>
                <label style={{display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px'}}>Email</label>
                <input
                  type="email"
                  required
                  value={newProfessional.email}
                  onChange={(e) => setNewProfessional({...newProfessional, email: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="joao@clinica.com"
                />
              </div>
              
              <div>
                <label style={{display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px'}}>Telefone</label>
                <input
                  type="tel"
                  value={newProfessional.phone}
                  onChange={(e) => setNewProfessional({...newProfessional, phone: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="(11) 99999-9999"
                />
              </div>
              
              <div>
                <label style={{display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px'}}>Especialidade</label>
                <input
                  type="text"
                  value={newProfessional.specialty}
                  onChange={(e) => setNewProfessional({...newProfessional, specialty: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Dentista Geral"
                />
              </div>
              
              <div>
                <label style={{display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px'}}>Email Google Calendar</label>
                <input
                  type="email"
                  required
                  value={newProfessional.google_calendar_email}
                  onChange={(e) => setNewProfessional({...newProfessional, google_calendar_email: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="joao.calendar@gmail.com"
                />
              </div>
              
              <div style={{display: 'flex', gap: '12px', marginTop: '8px'}}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    background: 'white'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalDashboard;