const express = require("express");
const { google } = require("googleapis");
const { supabase } = require("../config/supabase");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");

// Configuração do Google Calendar
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/calendar/oauth2callback"
);

// Middleware de autenticação unificado
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Token de autorização necessário" });
        }

        const token = authHeader.split(" ")[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: "Token inválido" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("❌ Erro de autenticação:", error);
        res.status(401).json({ error: "Falha na autenticação" });
    }
};

// Função para limpar tokens expirados
const clearExpiredTokens = async (professionalId) => {
    try {
        await supabase
            .from("professionals")
            .update({ 
                calendar_connected: false,
                google_access_token: null,
                google_refresh_token: null,
                google_token_expires_at: null,
                last_sync_at: null
            })
            .eq("id", professionalId);
        
        console.log("🧹 Tokens expirados limpos para profissional:", professionalId);
    } catch (error) {
        console.error("❌ Erro ao limpar tokens:", error);
    }
};

// GET /api/calendar/test - Rota de teste
router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "Calendar routes working",
        timestamp: new Date().toISOString(),
        routes: [
            "GET /test",
            "GET /status/:professionalId",
            "POST /connect/:professionalId",
            "GET /oauth2callback",
            "GET /events/:professionalId",
            "POST /create/:professionalId",
            "POST /disconnect/:professionalId"
        ]
    });
});

// GET /api/calendar/status/:professionalId - Status da conexão
router.get("/status/:professionalId", authenticateUser, async (req, res) => {
    try {
        const { professionalId } = req.params;
        
        console.log("📊 Buscando status do calendar para profissional:", professionalId);

        // Buscar profissional no banco
        const { data: professional, error } = await supabase
            .from("professionals")
            .select("*")
            .eq("id", professionalId)
            .single();

        if (error || !professional) {
            console.log("❌ Profissional não encontrado:", professionalId);
            return res.status(404).json({ error: "Profissional não encontrado" });
        }

        // Verificar se tem tokens salvos e não expirados
        const connected = !!(professional.google_access_token && professional.calendar_connected);
        
        console.log("✅ Status do calendar:", { connected, last_sync: professional.last_sync_at });

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
        console.error("❌ Erro ao buscar status:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// POST /api/calendar/connect/:professionalId - Conectar Google Calendar
router.post("/connect/:professionalId", authenticateUser, async (req, res) => {
    try {
        const { professionalId } = req.params;
        
        console.log("🔗 Conectando Google Calendar para profissional:", professionalId);

        // Verificar se profissional existe
        const { data: professional, error: profError } = await supabase
            .from("professionals")
            .select("*")
            .eq("id", professionalId)
            .single();

        if (profError || !professional) {
            console.log("❌ Profissional não encontrado:", professionalId);
            return res.status(404).json({ error: "Profissional não encontrado" });
        }

        // Gerar URL de autorização do Google
        const scopes = [
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events"
        ];

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: scopes,
            state: professionalId, // Para identificar qual profissional
            prompt: "consent" // Força refresh_token
        });

        console.log("✅ URL de autorização gerada para:", professional.name);

        res.json({
            success: true,
            auth_url: authUrl,
            professional: {
                id: professional.id,
                name: professional.name
            }
        });

    } catch (error) {
        console.error("❌ Erro ao gerar URL de autorização:", error);
        res.status(500).json({
            error: "Erro interno do servidor",
            details: error.message
        });
    }
});

// GET /api/calendar/oauth2callback - Callback do OAuth2
router.get("/oauth2callback", async (req, res) => {
    try {
        const { code, state: professionalId, error: oauthError } = req.query;

        console.log("📥 Callback OAuth2 recebido:", { 
            professionalId, 
            hasCode: !!code,
            error: oauthError 
        });

        if (oauthError) {
            console.error("❌ Erro OAuth2:", oauthError);
            return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3002"}/dashboard?calendar_error=${oauthError}`);
        }

        if (!code || !professionalId) {
            console.error("❌ Código ou professionalId ausente");
            return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3002"}/dashboard?calendar_error=missing_params`);
        }

        // Criar cliente OAuth2 específico para este callback
        const callbackOAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/calendar/oauth2callback"
        );

        console.log("🔄 Trocando código por tokens...");
        
        try {
            // Trocar código por tokens
            const { tokens } = await callbackOAuth2Client.getToken(code);
            
            console.log("✅ Tokens obtidos com sucesso:", {
                hasAccessToken: !!tokens.access_token,
                hasRefreshToken: !!tokens.refresh_token,
                expiryDate: tokens.expiry_date
            });

            // Verificar se temos access token
            if (!tokens.access_token) {
                console.error("❌ Access token não encontrado nos tokens");
                return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3002"}/dashboard?calendar_error=no_access_token`);
            }

            // Preparar dados para salvar
            const updateData = {
                google_access_token: tokens.access_token,
                calendar_connected: true,
                last_sync_at: new Date().toISOString()
            };

            // Adicionar refresh token se existir
            if (tokens.refresh_token) {
                updateData.google_refresh_token = tokens.refresh_token;
                console.log("✅ Refresh token incluído");
            }

            // Adicionar data de expiração se existir
            if (tokens.expiry_date) {
                updateData.google_token_expires_at = new Date(tokens.expiry_date).toISOString();
                console.log("✅ Data de expiração salva");
            }

            // Salvar tokens no banco
            console.log("💾 Salvando tokens no banco...");
            const { error: updateError } = await supabase
                .from("professionals")
                .update(updateData)
                .eq("id", professionalId);

            if (updateError) {
                console.error("❌ Erro ao salvar tokens no Supabase:", updateError);
                return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3002"}/dashboard?calendar_error=database_error`);
            }

            console.log("✅ Tokens salvos no banco para profissional:", professionalId);

            // Testar conexão
            try {
                callbackOAuth2Client.setCredentials(tokens);
                const testCalendar = google.calendar({ version: "v3", auth: callbackOAuth2Client });
                const testResponse = await testCalendar.calendarList.list({ maxResults: 1 });
                console.log("✅ Teste de conexão bem-sucedido!", {
                    calendarsFound: testResponse.data.items?.length || 0
                });
            } catch (testError) {
                console.log("⚠️ Aviso: Erro no teste de conexão (tokens salvos):", testError.message);
            }

            // Redirecionar com sucesso
            const redirectUrl = `${process.env.FRONTEND_URL || "http://localhost:3002"}/dashboard?calendar_success=true&professional=${professionalId}`;
            console.log("🔄 Redirecionando para:", redirectUrl);
            
            res.redirect(redirectUrl);

        } catch (tokenError) {
            console.error("❌ Erro ao obter tokens:", tokenError.message);
            return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3002"}/dashboard?calendar_error=token_exchange_failed`);
        }

    } catch (error) {
        console.error("❌ Erro geral no callback OAuth2:", error.message);
        res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3002"}/dashboard?calendar_error=callback_failed`);
    }
});

// Função para tentar renovar token automaticamente
const tryRefreshToken = async (professionalId, refreshToken) => {
    try {
        console.log("🔄 Tentando renovar token automaticamente...");
        
        const refreshClient = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        
        refreshClient.setCredentials({
            refresh_token: refreshToken
        });
        
        const { credentials } = await refreshClient.refreshAccessToken();
        
        if (credentials.access_token) {
            // Salvar novo token no banco
            const updateData = {
                google_access_token: credentials.access_token,
                last_sync_at: new Date().toISOString()
            };
            
            if (credentials.expiry_date) {
                updateData.google_token_expires_at = new Date(credentials.expiry_date).toISOString();
            }
            
            await supabase
                .from("professionals")
                .update(updateData)
                .eq("id", professionalId);
                
            console.log("✅ Token renovado automaticamente!");
            return credentials.access_token;
        }
        
        return null;
    } catch (error) {
        console.error("❌ Falha ao renovar token:", error.message);
        return null;
    }
};

// GET /api/calendar/events/:professionalId - Buscar eventos do calendário
router.get("/events/:professionalId", authenticateUser, async (req, res) => {
    const { professionalId } = req.params; // ✅ DEFINIR NO INÍCIO
    
    try {
        console.log("📅 Buscando eventos para profissional:", professionalId);

        // Buscar profissional e tokens
        const { data: professional, error } = await supabase
            .from("professionals")
            .select("*")
            .eq("id", professionalId)
            .single();

        if (error || !professional) {
            return res.status(404).json({ error: "Profissional não encontrado" });
        }

        if (!professional.google_access_token || !professional.calendar_connected) {
            return res.status(400).json({ error: "Google Calendar não conectado" });
        }

        // ✅ CONFIGURAR TOKENS COM RENOVAÇÃO AUTOMÁTICA
        let accessToken = professional.google_access_token;
        
        // Verificar se token está próximo do vencimento (renovar 5 min antes)
        if (professional.google_token_expires_at) {
            const expiryTime = new Date(professional.google_token_expires_at).getTime();
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;
            
            if (expiryTime - now <= fiveMinutes) {
                console.log("⏰ Token próximo do vencimento - renovando...");
                const newToken = await tryRefreshToken(professionalId, professional.google_refresh_token);
                if (newToken) {
                    accessToken = newToken;
                } else {
                    console.log("❌ Falha na renovação - token pode estar expirado");
                }
            }
        }

        // Configurar cliente OAuth2
        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: professional.google_refresh_token
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Definir período (60 dias: 30 passados + 30 futuros)
        const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        console.log("🔍 Buscando todos os calendários disponíveis...");

        // Buscar todos os calendários
        const calendarsResponse = await calendar.calendarList.list();
        const calendars = calendarsResponse.data.items || [];

        console.log("📅 Calendários encontrados:", calendars.length);
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
                    orderBy: "startTime",
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

        // Formatar eventos
        const formattedEvents = allEvents.map(event => ({
            id: event.id,
            title: event.summary || "Sem título",
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            description: event.description,
            location: event.location,
            attendees: event.attendees?.length || 0,
            calendarName: event.calendarName
        }));

        res.json({
            success: true,
            events: formattedEvents,
            professional: {
                id: professional.id,
                name: professional.name
            },
            totalEvents: allEvents.length,
            calendarsChecked: calendars.length
        });

    } catch (error) {
        console.error("❌ Erro ao buscar eventos:", error);
        
        // ✅ TRATAMENTO MELHORADO COM ESCOPO CORRETO
        if (error.message?.includes("invalid_grant") || 
            error.message?.includes("expired") ||
            error.message?.includes("Token has been") ||
            error.code === 401) {
            
            console.log("🔄 Token expirado detectado - tentando renovar...");
            
            // ✅ TENTAR RENOVAÇÃO ANTES DE LIMPAR
            try {
                const { data: prof } = await supabase
                    .from("professionals")
                    .select("google_refresh_token")
                    .eq("id", professionalId)
                    .single();
                    
                if (prof?.google_refresh_token) {
                    const newToken = await tryRefreshToken(professionalId, prof.google_refresh_token);
                    if (newToken) {
                        return res.status(200).json({ 
                            success: true,
                            message: "Token renovado automaticamente. Tente novamente.",
                            token_refreshed: true
                        });
                    }
                }
            } catch (refreshError) {
                console.log("❌ Erro na tentativa de renovação:", refreshError.message);
            }
            
            // Se renovação falhou, limpar tokens
            console.log("🧹 Limpando tokens expirados...");
            await clearExpiredTokens(professionalId);
            
            return res.status(401).json({ 
                error: "Token expirado. Conecte novamente.",
                reconnect_required: true 
            });
        }

        res.status(500).json({ 
            error: "Erro ao buscar eventos do calendário",
            details: error.message 
        });
    }
});

// POST /api/calendar/create/:professionalId - Criar evento no calendário
router.post("/create/:professionalId", async (req, res) => {
    const { professionalId } = req.params; // ✅ DEFINIR NO INÍCIO
    
    try {
        const { title, description, startDateTime, endDateTime, attendees } = req.body;

        console.log(`📅 Criando evento para profissional: ${professionalId}`);
        console.log("Corpo da requisição para criar evento:", JSON.stringify(req.body, null, 2));

        // Buscar profissional e verificar se tem calendar conectado
        const { data: professional, error: profError } = await supabase
            .from("professionals")
            .select("*")
            .eq("id", professionalId)
            .single();

        if (profError || !professional) {
            return res.status(404).json({ error: "Profissional não encontrado" });
        }

        if (!professional.google_access_token || !professional.calendar_connected) {
            return res.status(400).json({ error: "Google Calendar não conectado para este profissional" });
        }

        // ✅ VERIFICAR E RENOVAR TOKEN SE NECESSÁRIO
        let accessToken = professional.google_access_token;
        
        if (professional.google_token_expires_at) {
            const expiryTime = new Date(professional.google_token_expires_at).getTime();
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;
            
            if (expiryTime - now <= fiveMinutes) {
                console.log("⏰ Token próximo do vencimento ao criar evento - renovando...");
                const newToken = await tryRefreshToken(professionalId, professional.google_refresh_token);
                if (newToken) {
                    accessToken = newToken;
                }
            }
        }

        // Configurar tokens no cliente OAuth2
        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: professional.google_refresh_token
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Criar evento com timezone brasileiro
        const event = {
            summary: title || "Consulta Agendada",
            description: description || "Agendamento feito via IA do CRM",
            start: {
                dateTime: startDateTime,
                timeZone: "America/Sao_Paulo"
            },
            end: {
                dateTime: endDateTime,
                timeZone: "America/Sao_Paulo"
            },
            attendees: attendees || [], // Usar attendees do req.body
            reminders: {
                useDefault: false,
                overrides: [
                    { method: "email", minutes: 24 * 60 }, // 1 dia antes
                    { method: "popup", minutes: 30 }       // 30 min antes
                ]
            }
        };

        console.log("📅 Criando evento:", event.summary);
        console.log("🕒 Horário:", startDateTime, "→", endDateTime);
        
        const response = await calendar.events.insert({
            calendarId: "primary",
            resource: event
        });

        console.log("✅ Evento criado com sucesso:", response.data.id);

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
        console.error("❌ Erro ao criar evento:", error);
        
        // ✅ TRATAMENTO COM ESCOPO CORRETO E RENOVAÇÃO
        if (error.message?.includes("invalid_grant") || 
            error.message?.includes("expired") ||
            error.code === 401) {
            
            console.log("🔄 Token expirado ao criar evento - tentando renovar...");
            
            try {
                const { data: prof } = await supabase
                    .from("professionals")
                    .select("google_refresh_token")
                    .eq("id", professionalId)
                    .single();
                    
                if (prof?.google_refresh_token) {
                    const newToken = await tryRefreshToken(professionalId, prof.google_refresh_token);
                    if (newToken) {
                        return res.status(200).json({ 
                            success: false,
                            message: "Token renovado automaticamente. Tente criar evento novamente.",
                            token_refreshed: true
                        });
                    }
                }
            } catch (refreshError) {
                console.log("❌ Erro na renovação:", refreshError.message);
            }
            
            await clearExpiredTokens(professionalId);
            
            return res.status(401).json({ 
                error: "Token expirado. Conecte novamente.",
                reconnect_required: true 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: "Erro interno do servidor",
            details: error.message 
        });
    }
});

// POST /api/calendar/disconnect/:professionalId - Desconectar Google Calendar
router.post("/disconnect/:professionalId", authenticateUser, async (req, res) => {
    try {
        const { professionalId } = req.params;
        
        console.log("🔌 Desconectando Google Calendar para profissional:", professionalId);

        await clearExpiredTokens(professionalId);

        console.log("✅ Google Calendar desconectado com sucesso");

        res.json({
            success: true,
            message: "Google Calendar desconectado com sucesso"
        });

    } catch (error) {
        console.error("❌ Erro ao desconectar calendário:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// DELETE /api/calendar/delete/:professionalId/:eventId - Deletar evento
router.delete("/delete/:professionalId/:eventId", authenticateUser, async (req, res) => {
    const { professionalId, eventId } = req.params; // ✅ DEFINIR NO INÍCIO
    
    try {
        console.log(`🗑️ Deletando evento ${eventId} do profissional ${professionalId}`);

        // Buscar tokens do profissional
        const { data: professional, error } = await supabase
            .from("professionals")
            .select("*")
            .eq("id", professionalId)
            .single();

        if (error || !professional?.google_access_token) {
            return res.status(400).json({ 
                success: false, 
                error: "Profissional não tem Google Calendar conectado" 
            });
        }

        // ✅ VERIFICAR E RENOVAR TOKEN SE NECESSÁRIO
        let accessToken = professional.google_access_token;
        
        if (professional.google_token_expires_at) {
            const expiryTime = new Date(professional.google_token_expires_at).getTime();
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;
            
            if (expiryTime - now <= fiveMinutes) {
                console.log("⏰ Token próximo do vencimento ao deletar evento - renovando...");
                const newToken = await tryRefreshToken(professionalId, professional.google_refresh_token);
                if (newToken) {
                    accessToken = newToken;
                }
            }
        }

        // Configurar tokens
        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: professional.google_refresh_token
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Deletar evento
        await calendar.events.delete({
            calendarId: "primary",
            eventId: eventId
        });

        console.log("✅ Evento deletado com sucesso");

        res.json({ 
            success: true, 
            message: "Evento deletado com sucesso" 
        });

    } catch (error) {
        console.error("❌ Erro deletando evento:", error);
        
        // ✅ TRATAMENTO COM ESCOPO CORRETO
        if (error.message?.includes("invalid_grant") || error.code === 401) {
            console.log("🔄 Token expirado ao deletar evento - tentando renovar...");
            
            try {
                const { data: prof } = await supabase
                    .from("professionals")
                    .select("google_refresh_token")
                    .eq("id", professionalId)
                    .single();
                    
                if (prof?.google_refresh_token) {
                    const newToken = await tryRefreshToken(professionalId, prof.google_refresh_token);
                    if (newToken) {
                        return res.status(200).json({ 
                            success: false,
                            message: "Token renovado automaticamente. Tente deletar novamente.",
                            token_refreshed: true
                        });
                    }
                }
            } catch (refreshError) {
                console.log("❌ Erro na renovação:", refreshError.message);
            }
            
            await clearExpiredTokens(professionalId);
            
            return res.status(401).json({ 
                error: "Token expirado. Conecte novamente.",
                reconnect_required: true 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: "Erro interno do servidor",
            details: error.message 
        });
    }
});

module.exports = router;