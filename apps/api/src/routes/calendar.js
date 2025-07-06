const express = require('express');
const { google } = require('googleapis');
const { supabase } = require('../config/supabase');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Configuração do Google Calendar
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/oauth2callback'
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Middleware de autenticação
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token de autorização necessário' });
        }

        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('❌ Erro de autenticação:', error);
        res.status(401).json({ error: 'Falha na autenticação' });
    }
};

// GET /api/calendar/test - Rota de teste
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Calendar routes working',
        timestamp: new Date().toISOString()
    });
});

// GET /api/calendar/status/:professionalId - Status da conexão
router.get('/status/:professionalId', authenticateUser, async (req, res) => {
    try {
        const { professionalId } = req.params;
        
        console.log('📊 Buscando status do calendar para profissional:', professionalId);

        // Buscar profissional no banco
        const { data: professional, error } = await supabase
            .from('professionals')
            .select('*')
            .eq('id', professionalId)
            .single();

        if (error || !professional) {
            console.log('❌ Profissional não encontrado:', professionalId);
            return res.status(404).json({ error: 'Profissional não encontrado' });
        }

        // Verificar se tem tokens salvos
        const connected = !!(professional.google_access_token && professional.calendar_connected);
        
        console.log('✅ Status do calendar:', { connected, last_sync: professional.last_sync_at });

        res.json({
            success: true,
            professional: {
                id: professional.id,
                name: professional.name,
                connected: connected,
                last_sync: professional.last_sync_at
            }
        });

    } catch (error) {
        console.error('❌ Erro ao buscar status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/calendar/connect/:professionalId - Conectar Google Calendar
router.post('/connect/:professionalId', authenticateUser, async (req, res) => {
    try {
        const { professionalId } = req.params;
        
        console.log('🔗 Conectando Google Calendar para profissional:', professionalId);

        // Verificar se profissional existe
        const { data: professional, error: profError } = await supabase
            .from('professionals')
            .select('*')
            .eq('id', professionalId)
            .single();

        if (profError || !professional) {
            console.log('❌ Profissional não encontrado:', professionalId);
            return res.status(404).json({ error: 'Profissional não encontrado' });
        }

        // Gerar URL de autorização do Google
        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
        ];

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            state: professionalId, // Para identificar qual profissional
            prompt: 'consent' // Força refresh_token
        });

        console.log('✅ URL de autorização gerada para:', professional.name);

        res.json({
            success: true,
            auth_url: authUrl,
            professional: {
                id: professional.id,
                name: professional.name
            }
        });

    } catch (error) {
        console.error('❌ Erro ao gerar URL de autorização:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

// GET /api/calendar/oauth2callback - Callback do OAuth2 (VERSÃO CORRIGIDA)
router.get('/oauth2callback', async (req, res) => {
    try {
        const { code, state: professionalId, error: oauthError } = req.query;

        console.log('📥 Callback OAuth2 recebido:', { 
            professionalId, 
            hasCode: !!code,
            error: oauthError 
        });

        if (oauthError) {
            console.error('❌ Erro OAuth2:', oauthError);
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard?calendar_error=${oauthError}`);
        }

        if (!code || !professionalId) {
            console.error('❌ Código ou professionalId ausente');
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard?calendar_error=missing_params`);
        }

        // ✅ NOVA CORREÇÃO: Criar cliente OAuth2 específico para este callback
        const callbackOAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/oauth2callback'
        );

        console.log('🔄 Trocando código por tokens com nova abordagem...');
        
        try {
            // ✅ MÉTODO CORRIGIDO: Usar getToken ao invés de getAccessToken
            const { tokens } = await callbackOAuth2Client.getToken(code);
            
            console.log('✅ Tokens obtidos com sucesso:', {
                hasAccessToken: !!tokens.access_token,
                hasRefreshToken: !!tokens.refresh_token,
                expiryDate: tokens.expiry_date,
                tokenType: tokens.token_type,
                scope: tokens.scope
            });

            // Verificar se temos access token
            if (!tokens.access_token) {
                console.error('❌ Access token não encontrado nos tokens');
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard?calendar_error=no_access_token`);
            }

            // Salvar tokens no banco
            console.log('💾 Salvando tokens no banco...');
            
            const updateData = {
                google_access_token: tokens.access_token,
                calendar_connected: true,
                last_sync_at: new Date().toISOString()
            };

            // Adicionar refresh token se existir
            if (tokens.refresh_token) {
                updateData.google_refresh_token = tokens.refresh_token;
                console.log('✅ Refresh token também salvo');
            } else {
                console.log('⚠️ Refresh token não presente (pode ser normal em reconexões)');
            }

            // Adicionar data de expiração se existir
            if (tokens.expiry_date) {
                updateData.google_token_expires_at = new Date(tokens.expiry_date).toISOString();
                console.log('✅ Data de expiração salva:', new Date(tokens.expiry_date));
            }

            // Atualizar no Supabase
            const { error: updateError } = await supabase
                .from('professionals')
                .update(updateData)
                .eq('id', professionalId);

            if (updateError) {
                console.error('❌ Erro ao salvar tokens no Supabase:', updateError);
                return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard?calendar_error=database_error`);
            }

            console.log('✅ Tokens salvos no banco para profissional:', professionalId);

            // Testar se o token funciona fazendo uma requisição simples
            try {
                callbackOAuth2Client.setCredentials(tokens);
                const testCalendar = google.calendar({ version: 'v3', auth: callbackOAuth2Client });
                
                console.log('🧪 Testando conexão com Google Calendar...');
                const testResponse = await testCalendar.calendarList.list({ maxResults: 1 });
                console.log('✅ Teste de conexão bem-sucedido!', {
                    calendarsFound: testResponse.data.items?.length || 0
                });
            } catch (testError) {
                console.log('⚠️ Aviso: Erro no teste de conexão (mas tokens foram salvos):', testError.message);
            }

            // Redirecionar para o frontend com sucesso
            const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard?calendar_success=true&professional=${professionalId}`;
            console.log('🔄 Redirecionando para:', redirectUrl);
            
            res.redirect(redirectUrl);

        } catch (tokenError) {
            console.error('❌ Erro específico ao obter tokens:', {
                message: tokenError.message,
                code: tokenError.code,
                status: tokenError.status
            });

            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard?calendar_error=token_exchange_failed&details=${encodeURIComponent(tokenError.message)}`);
        }

    } catch (error) {
        console.error('❌ Erro geral no callback OAuth2:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard?calendar_error=callback_failed&details=${encodeURIComponent(error.message)}`);
    }
});

// GET /api/calendar/events/:professionalId - Buscar eventos do calendário
router.get('/events/:professionalId', authenticateUser, async (req, res) => {
    try {
        const { professionalId } = req.params;
        
        console.log('📅 Buscando eventos para profissional:', professionalId);

        // Buscar profissional e tokens
        const { data: professional, error } = await supabase
            .from('professionals')
            .select('*')
            .eq('id', professionalId)
            .single();

        if (error || !professional) {
            return res.status(404).json({ error: 'Profissional não encontrado' });
        }

        if (!professional.google_access_token || !professional.calendar_connected) {
            return res.status(400).json({ error: 'Google Calendar não conectado' });
        }

        // Configurar tokens no cliente OAuth2
        oauth2Client.setCredentials({
            access_token: professional.google_access_token,
            refresh_token: professional.google_refresh_token
        });

        // Buscar eventos dos próximos 30 dias EM TODOS OS CALENDÁRIOS
        const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 dias atrás
        const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        console.log('🔍 Buscando todos os calendários disponíveis...');

        // Primeiro buscar todos os calendários
        const calendarsResponse = await calendar.calendarList.list();
        const calendars = calendarsResponse.data.items || [];

        console.log('📅 Calendários encontrados:', calendars.length);
        calendars.forEach((cal, index) => {
            console.log(`${index + 1}. "${cal.summary}" (${cal.id}) - Primary: ${cal.primary}`);
        });

        // Buscar eventos de TODOS os calendários
        let allEvents = [];

        for (const calendarItem of calendars) {
            try {
                console.log(`🔍 Buscando eventos em: ${calendarItem.summary}`);
                
                const eventsResponse = await calendar.events.list({
                    calendarId: calendarItem.id,
                    timeMin: timeMin,
                    timeMax: timeMax,
                    maxResults: 50,
                    singleEvents: true,
                    orderBy: 'startTime',
                });

                const events = eventsResponse.data.items || [];
                console.log(`📊 ${events.length} evento(s) encontrado(s) em "${calendarItem.summary}"`);
                
                // Adicionar identificação do calendário aos eventos
                const eventsWithCalendar = events.map(event => ({
                    ...event,
                    calendarName: calendarItem.summary,
                    calendarId: calendarItem.id
                }));
                
                allEvents = allEvents.concat(eventsWithCalendar);
                
            } catch (error) {
                console.log(`⚠️ Erro ao buscar eventos em "${calendarItem.summary}":`, error.message);
            }
        }

        console.log(`📊 TOTAL: ${allEvents.length} evento(s) encontrado(s) em todos os calendários`);
        
        console.log(`✅ ${allEvents.length} eventos encontrados`);

        // Formatar eventos
        const formattedEvents = allEvents.map(event => ({
            id: event.id,
            title: event.summary || 'Sem título',
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            description: event.description,
            location: event.location,
            attendees: event.attendees?.length || 0
        }));

        res.json({
            success: true,
            events: formattedEvents,
            professional: {
                id: professional.id,
                name: professional.name
            }
        });

    } catch (error) {
        console.error('❌ Erro ao buscar eventos:', error);
        
        if (error.code === 401) {
            // Token expirado - limpar conexão
            await supabase
                .from('professionals')
                .update({ 
                    calendar_connected: false,
                    google_access_token: null,
                    google_refresh_token: null
                })
                .eq('id', professionalId);
                
            return res.status(401).json({ error: 'Token expirado. Conecte novamente.' });
        }

        res.status(500).json({ error: 'Erro ao buscar eventos do calendário' });
    }
});

// POST /api/calendar/disconnect/:professionalId - Desconectar Google Calendar
router.post('/disconnect/:professionalId', authenticateUser, async (req, res) => {
    try {
        const { professionalId } = req.params;
        
        console.log('🔌 Desconectando Google Calendar para profissional:', professionalId);

        // Limpar tokens do banco
        const { error } = await supabase
            .from('professionals')
            .update({
                google_access_token: null,
                google_refresh_token: null,
                google_token_expires_at: null,
                calendar_connected: false,
                last_sync_at: null
            })
            .eq('id', professionalId);

        if (error) {
            console.error('❌ Erro ao desconectar:', error);
            return res.status(500).json({ error: 'Erro ao desconectar calendário' });
        }

        console.log('✅ Google Calendar desconectado com sucesso');

        res.json({
            success: true,
            message: 'Google Calendar desconectado com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro ao desconectar calendário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/calendar/create/:professionalId - Criar evento no calendário
router.post('/create/:professionalId', async (req, res) => {
    try {
        const { professionalId } = req.params;
        const { title, description, startDateTime, endDateTime, attendeeEmail } = req.body;

        console.log(`📅 Criando evento para profissional: ${professionalId}`);

        // Buscar profissional e verificar se tem calendar conectado
        const { data: professional, error: profError } = await supabase
            .from('professionals')
            .select('*')
            .eq('id', professionalId)
            .single();

        if (profError || !professional) {
            return res.status(404).json({ error: 'Profissional não encontrado' });
        }

        if (!professional.google_access_token || !professional.calendar_connected) {
            return res.status(400).json({ error: 'Google Calendar não conectado para este profissional' });
        }

        // Configurar tokens no cliente OAuth2
        oauth2Client.setCredentials({
            access_token: professional.google_access_token,
            refresh_token: professional.google_refresh_token
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // Criar evento
        const event = {
            summary: title || 'Consulta Agendada',
            description: description || 'Agendamento feito via IA do CRM',
            start: {
                dateTime: startDateTime,
                timeZone: 'America/Sao_Paulo'
            },
            end: {
                dateTime: endDateTime,
                timeZone: 'America/Sao_Paulo'
            },
            attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 }, // 1 dia antes
                    { method: 'popup', minutes: 30 }       // 30 min antes
                ]
            }
        };

        console.log('📅 Criando evento:', event.summary);
        
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event
        });

        console.log('✅ Evento criado com sucesso:', response.data.id);

        res.json({
            success: true,
            event: {
                id: response.data.id,
                title: response.data.summary,
                start: response.data.start.dateTime,
                end: response.data.end.dateTime,
                htmlLink: response.data.htmlLink
            }
        });

    } catch (error) {
        console.error('❌ Erro ao criar evento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/calendar/create/:professionalId - Criar evento no calendário
router.post('/create/:professionalId', authenticateToken, async (req, res) => {
    try {
        const { professionalId } = req.params;
        const { title, description, startDateTime, endDateTime, attendeeEmail } = req.body;

        console.log(`📅 Criando evento para profissional: ${professionalId}`);

        // Buscar profissional e verificar se tem calendar conectado
        const { data: professional, error: profError } = await supabase
            .from('professionals')
            .select('*')
            .eq('id', professionalId)
            .single();

        if (profError || !professional) {
            return res.status(404).json({ error: 'Profissional não encontrado' });
        }

        if (!professional.google_access_token || !professional.calendar_connected) {
            return res.status(400).json({ error: 'Google Calendar não conectado para este profissional' });
        }

        // Configurar tokens no cliente OAuth2
        oauth2Client.setCredentials({
            access_token: professional.google_access_token,
            refresh_token: professional.google_refresh_token
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // 🔧 SEM CONVERSÃO - DEIXAR GOOGLE CALENDAR GERENCIAR
        console.log('🇧🇷 Horário Brasília recebido:', startDateTime);
        console.log('🇧🇷 Horário final enviado:', endDateTime);

        // Converter para UTC (adicionar 3 horas)
        const utcStartDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));
        const utcEndDate = new Date(endDate.getTime() + (3 * 60 * 60 * 1000));

        console.log('🇧🇷 Horário Brasília recebido:', startDateTime);
        console.log('🌍 Horário UTC calculado:', utcStartDate.toISOString());
        console.log('📅 Enviando para Google Calendar como UTC');

        // Criar evento
        const event = {
            summary: title || 'Consulta Agendada',
            description: description || 'Agendamento feito via IA do CRM',
            start: {
                dateTime: startDateTime,
                timeZone: 'America/Sao_Paulo'
            },
            end: {
                dateTime: endDateTime,
                timeZone: 'America/Sao_Paulo'
            },
            attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 }, // 1 dia antes
                    { method: 'popup', minutes: 30 }       // 30 min antes
                ]
            }
        };

        console.log('📅 Criando evento:', event.summary);
        
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event
        });

        console.log('✅ Evento criado com sucesso:', response.data.id);

        res.json({
            success: true,
            event: {
                id: response.data.id,
                title: response.data.summary,
                start: response.data.start.dateTime,
                end: response.data.end.dateTime,
                htmlLink: response.data.htmlLink
            }
        });

    } catch (error) {
        console.error('❌ Erro ao criar evento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;