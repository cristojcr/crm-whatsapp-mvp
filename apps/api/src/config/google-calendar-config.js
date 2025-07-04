const { google } = require('googleapis');
const { supabase } = require('./supabase');

class GoogleCalendarService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/oauth2callback'
        );
        
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    }

    // Gerar URL de autorização
    getAuthUrl(professionalId) {
        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
        ];

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            state: professionalId, // Para identificar qual profissional
            prompt: 'consent' // Força refresh_token
        });
    }

    // Trocar código por tokens
    async exchangeCodeForTokens(code) {
        try {
            const { tokens } = await this.oauth2Client.getAccessToken(code);
            return tokens;
        } catch (error) {
            console.error('❌ Erro ao trocar código:', error);
            throw error;
        }
    }

    // Configurar tokens para requests
    setTokens(tokens) {
        this.oauth2Client.setCredentials(tokens);
    }

    // Buscar calendários do usuário
    async getCalendars() {
        try {
            const response = await this.calendar.calendarList.list();
            return response.data.items;
        } catch (error) {
            console.error('❌ Erro ao buscar calendários:', error);
            throw error;
        }
    }

    // Buscar eventos
    async getEvents(calendarId, timeMin, timeMax) {
        try {
            const response = await this.calendar.events.list({
                calendarId: calendarId,
                timeMin: timeMin,
                timeMax: timeMax,
                singleEvents: true,
                orderBy: 'startTime'
            });
            return response.data.items;
        } catch (error) {
            console.error('❌ Erro ao buscar eventos:', error);
            throw error;
        }
    }

    // Criar evento
    async createEvent(calendarId, eventData) {
        try {
            const response = await this.calendar.events.insert({
                calendarId: calendarId,
                resource: eventData
            });
            return response.data;
        } catch (error) {
            console.error('❌ Erro ao criar evento:', error);
            throw error;
        }
    }

    // Atualizar tokens no banco
    async updateProfessionalTokens(professionalId, tokens) {
        const expiresAt = new Date(tokens.expiry_date);
        
        const { error } = await supabase
            .from('professionals')
            .update({
                google_access_token: tokens.access_token,
                google_refresh_token: tokens.refresh_token,
                google_token_expires_at: expiresAt.toISOString(),
                calendar_connected: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', professionalId);

        if (error) {
            console.error('❌ Erro ao salvar tokens:', error);
            throw error;
        }
    }

    // Carregar tokens do banco
    async loadProfessionalTokens(professionalId) {
        const { data: professional, error } = await supabase
            .from('professionals')
            .select('google_access_token, google_refresh_token, google_token_expires_at')
            .eq('id', professionalId)
            .single();

        if (error || !professional) {
            throw new Error('Profissional não encontrado');
        }

        if (!professional.google_access_token) {
            throw new Error('Profissional não conectado ao Google Calendar');
        }

        const tokens = {
            access_token: professional.google_access_token,
            refresh_token: professional.google_refresh_token,
            expiry_date: new Date(professional.google_token_expires_at).getTime()
        };

        this.setTokens(tokens);
        return tokens;
    }
}

module.exports = GoogleCalendarService;