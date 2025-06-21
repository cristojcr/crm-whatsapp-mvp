const nodemailer = require('nodemailer');
const axios = require('axios');

const handlebars = require('handlebars');
const moment = require('moment');
const { createClient } = require('@supabase/supabase-js');

class NotificationSystem {
    constructor() {
        this.emailTransporter = null;
        this.setupEmailTransporter();
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        // Configurar templates de appointments
        this.setupAppointmentTemplates();
    }

    setupEmailTransporter() {
        // Configurar transporter de email (Gmail, Outlook, etc.)
        if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
            this.emailTransporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT || 587,
                secure: false, // true para 465, false para outras portas
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            console.log('✅ Sistema de email configurado');
        } else {
            console.log('⚠️ Email não configurado (variáveis faltando)');
        }
    }

    async sendSlackNotification(message, channel = '#alerts') {
        try {
            const webhookUrl = process.env.SLACK_WEBHOOK_URL;
            if (!webhookUrl) {
                console.log('⚠️ Slack webhook não configurado');
                return false;
            }

            const payload = {
                channel,
                username: 'CRM Monitor',
                icon_emoji: ':warning:',
                text: typeof message === 'string' ? message : message.text,
                attachments: message.attachments || []
            };

            await axios.post(webhookUrl, payload);
            console.log('✅ Notificação Slack enviada com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao enviar notificação Slack:', error.message);
            return false;
        }
    }

    async sendEmailNotification(to, subject, html, text) {
        try {
            if (!this.emailTransporter) {
                console.log('⚠️ Email não configurado');
                return false;
            }

            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to,
                subject,
                html,
                text
            };

            const info = await this.emailTransporter.sendMail(mailOptions);
            console.log('✅ Email enviado:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Erro ao enviar email:', error.message);
            return false;
        }
    }

    async sendCriticalAlert(alert) {
        console.log(`🚨 Enviando alerta crítico: ${alert.message}`);

        const promises = [];

        // Enviar para Slack
        const slackMessage = {
            text: `🚨 ALERTA CRÍTICO: ${alert.message}`,
            attachments: [
                {
                    color: alert.level === 'CRITICAL' ? 'danger' : 'warning',
                    fields: [
                        {
                            title: 'Nível',
                            value: alert.level,
                            short: true
                        },
                        {
                            title: 'Timestamp',
                            value: alert.timestamp,
                            short: true
                        },
                        {
                            title: 'Detalhes',
                            value: JSON.stringify(alert.details, null, 2),
                            short: false
                        }
                    ]
                }
            ]
        };
        promises.push(this.sendSlackNotification(slackMessage));

        // Enviar email para admins
        const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
        if (adminEmails.length > 0) {
            const emailSubject = `🚨 CRM Alert ${alert.level}: ${alert.message}`;
            const emailHtml = this.generateEmailHTML(alert);
            const emailText = `ALERTA ${alert.level}: ${alert.message}\n\nTimestamp: ${alert.timestamp}\n\nDetalhes: ${JSON.stringify(alert.details, null, 2)}`;

            adminEmails.forEach(email => {
                promises.push(this.sendEmailNotification(email.trim(), emailSubject, emailHtml, emailText));
            });
        }

        // Executar todas as notificações
        const results = await Promise.allSettled(promises);
        
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
        const totalCount = results.length;

        console.log(`📊 Notificações enviadas: ${successCount}/${totalCount}`);
        return { successCount, totalCount, results };
    }

    async sendWarningAlert(alert) {
        console.log(`⚠️ Enviando alerta de warning: ${alert.message}`);

        // Para warnings, enviar apenas para Slack (menos invasivo)
        const slackMessage = {
            text: `⚠️ Warning: ${alert.message}`,
            attachments: [
                {
                    color: 'warning',
                    fields: [
                        {
                            title: 'Timestamp',
                            value: alert.timestamp,
                            short: true
                        },
                        {
                            title: 'Detalhes',
                            value: JSON.stringify(alert.details, null, 2),
                            short: false
                        }
                    ]
                }
            ]
        };

        return await this.sendSlackNotification(slackMessage);
    }

    async sendDailyReport(report) {
        console.log('📊 Enviando relatório diário...');

        const summary = report.summary;
        const slackMessage = {
            text: '📊 Relatório Diário do CRM WhatsApp',
            attachments: [
                {
                    color: summary.successRate > 95 ? 'good' : 
                           summary.successRate > 90 ? 'warning' : 'danger',
                    fields: [
                        {
                            title: 'Total Requests',
                            value: summary.totalRequests.toString(),
                            short: true
                        },
                        {
                            title: 'Taxa de Sucesso',
                            value: `${summary.successRate.toFixed(1)}%`,
                            short: true
                        },
                        {
                            title: 'Tempo Médio',
                            value: `${summary.avgResponseTime.toFixed(0)}ms`,
                            short: true
                        },
                        {
                            title: 'Uptime',
                            value: `${summary.uptime.toFixed(1)}%`,
                            short: true
                        }
                    ]
                }
            ]
        };

        return await this.sendSlackNotification(slackMessage, '#reports');
    }

    generateEmailHTML(alert) {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .alert-box { background: #f8f9fa; border-left: 4px solid #dc3545; padding: 20px; margin: 20px 0; }
        .critical { border-color: #dc3545; background: #f8d7da; }
        .warning { border-color: #ffc107; background: #fff3cd; }
        .details { background: #f1f3f4; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .button { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <h2>🚨 Alerta CRM WhatsApp</h2>
    <div class="alert-box ${alert.level.toLowerCase()}">
        <h3>${alert.level}: ${alert.message}</h3>
        <p><strong>Timestamp:</strong> ${alert.timestamp}</p>
        <div class="details">
            <h4>Detalhes:</h4>
            <pre>${JSON.stringify(alert.details, null, 2)}</pre>
        </div>
        <p>
            <a href="${process.env.DASHBOARD_URL || 'http://localhost:3001/admin-dashboard'}" class="button">
                Ver Dashboard
            </a>
        </p>
    </div>
    <p><small>Este é um alerta automático do sistema CRM WhatsApp.</small></p>
</body>
</html>
        `;
    }

    async testNotifications() {
        console.log('🧪 Testando sistema de notificações...');

        const results = {
            slack: false,
            email: false,
            emailConfigured: !!this.emailTransporter,
            slackConfigured: !!process.env.SLACK_WEBHOOK_URL
        };

        // Teste Slack
        if (process.env.SLACK_WEBHOOK_URL) {
            results.slack = await this.sendSlackNotification('🧪 Teste de notificação CRM WhatsApp - Sistema funcionando!');
        }

        // Teste Email
        const testEmails = process.env.ADMIN_EMAILS?.split(',') || [];
        if (testEmails.length > 0 && this.emailTransporter) {
            results.email = await this.sendEmailNotification(
                testEmails[0].trim(),
                '🧪 Teste CRM WhatsApp',
                '<h3>Teste de notificação por email</h3><p>Sistema funcionando perfeitamente! ✅</p>',
                'Teste de notificação por email - Sistema funcionando perfeitamente!'
            );
        }

        console.log('📋 Resultados do teste:', results);
        return results;
    }

    getStatus() {
        return {
            email: {
                configured: !!this.emailTransporter,
                host: process.env.EMAIL_HOST || 'not configured',
                user: process.env.EMAIL_USER || 'not configured'
            },
            slack: {
                configured: !!process.env.SLACK_WEBHOOK_URL,
                webhook: process.env.SLACK_WEBHOOK_URL ? 'configured' : 'not configured'
            },
            adminEmails: process.env.ADMIN_EMAILS?.split(',') || []
        };
    }
    // 📝 Configurar templates específicos de appointments
    setupAppointmentTemplates() {
        this.appointmentTemplates = {
            reminder24h: handlebars.compile(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; background: #f9f9f9; }
                        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
                        .content { padding: 30px; }
                        .appointment-info { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
                        .footer { background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px; }
                        .btn { background: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🕐 Lembrete de Agendamento</h1>
                            <p>Seu agendamento é amanhã!</p>
                        </div>
                        <div class="content">
                            <p>Olá <strong>{{clientName}}</strong>,</p>
                            <p>Este é um lembrete de que você tem um agendamento marcado para amanhã.</p>
                            <div class="appointment-info">
                                <h3>📅 Detalhes do Agendamento</h3>
                                <p><strong>📍 Data:</strong> {{appointmentDate}}</p>
                                <p><strong>🕒 Horário:</strong> {{appointmentTime}}</p>
                                <p><strong>🔧 Serviço:</strong> {{serviceName}}</p>
                                <p><strong>📍 Local:</strong> {{location}}</p>
                                {{#if customerNotes}}<p><strong>📝 Observações:</strong> {{customerNotes}}</p>{{/if}}
                            </div>
                            <p>Se precisar reagendar ou cancelar, entre em contato conosco o quanto antes.</p>
                            <p>Aguardamos você!</p>
                        </div>
                        <div class="footer">
                            <p>{{companyName}} | Este é um lembrete automático</p>
                        </div>
                    </div>
                </body>
                </html>
            `),
            
            reminder2h: handlebars.compile(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; background: #f9f9f9; }
                        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .header { background: #ffc107; color: #212529; padding: 20px; text-align: center; }
                        .content { padding: 30px; }
                        .appointment-info { background: #fff3cd; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107; }
                        .footer { background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px; }
                        .urgent { color: #dc3545; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>⏰ Lembrete Urgente!</h1>
                            <p class="urgent">Seu agendamento é em 2 horas!</p>
                        </div>
                        <div class="content">
                            <p>Olá <strong>{{clientName}}</strong>,</p>
                            <p>Seu agendamento está chegando!</p>
                            <div class="appointment-info">
                                <h3>📅 Agendamento HOJE</h3>
                                <p><strong>🕒 Horário:</strong> {{appointmentTime}}</p>
                                <p><strong>🔧 Serviço:</strong> {{serviceName}}</p>
                                <p><strong>📍 Local:</strong> {{location}}</p>
                            </div>
                            <p><strong>Nos vemos em breve!</strong></p>
                        </div>
                        <div class="footer">
                            <p>{{companyName}} | Lembrete automático</p>
                        </div>
                    </div>
                </body>
                </html>
            `),
            
            confirmation: handlebars.compile(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; background: #f9f9f9; }
                        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .header { background: #28a745; color: white; padding: 20px; text-align: center; }
                        .content { padding: 30px; }
                        .appointment-info { background: #d4edda; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745; }
                        .footer { background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px; }
                        .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>✅ Agendamento Confirmado!</h1>
                        </div>
                        <div class="content">
                            <div class="success-icon">🎉</div>
                            <p>Olá <strong>{{clientName}}</strong>,</p>
                            <p>Seu agendamento foi <strong>confirmado com sucesso!</strong></p>
                            <div class="appointment-info">
                                <h3>📅 Detalhes Confirmados</h3>
                                <p><strong>📍 Data:</strong> {{appointmentDate}}</p>
                                <p><strong>🕒 Horário:</strong> {{appointmentTime}}</p>
                                <p><strong>🔧 Serviço:</strong> {{serviceName}}</p>
                                <p><strong>📍 Local:</strong> {{location}}</p>
                                <p><strong>⏱️ Duração:</strong> {{duration}} minutos</p>
                                {{#if customerNotes}}<p><strong>📝 Suas Observações:</strong> {{customerNotes}}</p>{{/if}}
                            </div>
                            <p>Você receberá lembretes automáticos antes do agendamento.</p>
                            <p><strong>Aguardamos você!</strong></p>
                        </div>
                        <div class="footer">
                            <p>{{companyName}} | Confirmação automática</p>
                        </div>
                    </div>
                </body>
                </html>
            `)
        };
        
        console.log('✅ Templates de appointments configurados');
    }

    // 📅 Enviar lembrete de appointment
    async sendAppointmentReminder(appointmentId, reminderType = '24h') {
        try {
            console.log(`📧 Enviando lembrete ${reminderType} para appointment:`, appointmentId);
            
            // Buscar dados completos do appointment
            const { data: appointment, error } = await this.supabase
                .from('appointments')
                .select(`
                    *,
                    contacts(name, email, phone),
                    users(business_name, email),
                    services(name, duration_minutes)
                `)
                .eq('id', appointmentId)
                .single();

            if (error || !appointment) {
                console.error('❌ Appointment não encontrado:', appointmentId, error);
                return false;
            }

            if (!appointment.contacts?.email) {
                console.error('❌ Email do contato não encontrado para appointment:', appointmentId);
                return false;
            }

            // Selecionar template apropriado
            const template = reminderType === '24h' ? 
                this.appointmentTemplates.reminder24h : 
                this.appointmentTemplates.reminder2h;

            // Preparar dados para o template
            const appointmentDate = moment(appointment.scheduled_at).format('DD/MM/YYYY');
            const appointmentTime = moment(appointment.scheduled_at).format('HH:mm');
            
            const emailData = {
                clientName: appointment.contacts.name,
                appointmentDate,
                appointmentTime,
                serviceName: appointment.services?.name || appointment.title || 'Serviço',
                location: appointment.location || 'Local a definir',
                companyName: appointment.users?.business_name || 'Nossa empresa',
                customerNotes: appointment.customer_notes
            };

            // Gerar HTML do email
            const emailHtml = template(emailData);
            
            // Enviar email
            const subject = `🕐 Lembrete: Agendamento ${reminderType === '24h' ? 'amanhã' : 'em 2 horas'}`;
            const emailSent = await this.sendEmailNotification(
                appointment.contacts.email,
                subject,
                emailHtml,
                `Lembrete: Você tem um agendamento em ${appointmentDate} às ${appointmentTime}`
            );

            if (emailSent) {
                // Atualizar status no banco
                const updateField = reminderType === '24h' ? 'reminder_sent_24h' : 'reminder_sent_2h';
                await this.supabase
                    .from('appointments')
                    .update({ [updateField]: true })
                    .eq('id', appointmentId);
                    
                console.log(`✅ Lembrete ${reminderType} enviado para:`, appointment.contacts.email);
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ Erro ao enviar lembrete de appointment:', error.message);
            return false;
        }
    }

    // ✉️ Enviar confirmação de agendamento
    async sendAppointmentConfirmation(appointmentId) {
        try {
            console.log('📧 Enviando confirmação para appointment:', appointmentId);
            
            // Buscar dados completos do appointment
            const { data: appointment, error } = await this.supabase
                .from('appointments')
                .select(`
                    *,
                    contacts(name, email, phone),
                    users(business_name, email),
                    services(name, duration_minutes)
                `)
                .eq('id', appointmentId)
                .single();

            if (error || !appointment) {
                console.error('❌ Appointment não encontrado:', appointmentId, error);
                return false;
            }

            if (!appointment.contacts?.email) {
                console.error('❌ Email do contato não encontrado');
                return false;
            }

            // Preparar dados para o template
            const emailData = {
                clientName: appointment.contacts.name,
                appointmentDate: moment(appointment.scheduled_at).format('DD/MM/YYYY'),
                appointmentTime: moment(appointment.scheduled_at).format('HH:mm'),
                serviceName: appointment.services?.name || appointment.title || 'Serviço',
                location: appointment.location || 'Local a definir',
                duration: appointment.duration_minutes || appointment.services?.duration_minutes || 60,
                companyName: appointment.users?.business_name || 'Nossa empresa',
                customerNotes: appointment.customer_notes
            };

            // Gerar HTML do email
            const emailHtml = this.appointmentTemplates.confirmation(emailData);
            
            // Enviar email
            const emailSent = await this.sendEmailNotification(
                appointment.contacts.email,
                '✅ Agendamento Confirmado!',
                emailHtml,
                `Seu agendamento foi confirmado para ${emailData.appointmentDate} às ${emailData.appointmentTime}`
            );

            if (emailSent) {
                // Marcar confirmação como enviada
                await this.supabase
                    .from('appointments')
                    .update({ confirmation_sent: true })
                    .eq('id', appointmentId);
                    
                console.log('✅ Confirmação enviada para:', appointment.contacts.email);
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ Erro ao enviar confirmação:', error.message);
            return false;
        }
    }

    // 🔍 Buscar appointments que precisam de lembrete
    async findAppointmentsNeedingReminders() {
        try {
            const now = new Date();
            
            // Janela para lembretes de 24h (entre 23h e 25h antes)
            const tomorrow24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
            const tomorrow24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
            
            // Janela para lembretes de 2h (entre 1h30 e 2h30 antes) 
            const in2hStart = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
            const in2hEnd = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);

            // Buscar appointments que precisam de lembrete de 24h
            const { data: appointments24h } = await this.supabase
                .from('appointments')
                .select('id, scheduled_at, reminder_sent_24h, title')
                .eq('status', 'confirmed')
                .eq('reminder_sent_24h', false)
                .gte('scheduled_at', tomorrow24hStart.toISOString())
                .lte('scheduled_at', tomorrow24hEnd.toISOString());

            // Buscar appointments que precisam de lembrete de 2h
            const { data: appointments2h } = await this.supabase
                .from('appointments')
                .select('id, scheduled_at, reminder_sent_2h, title')
                .eq('status', 'confirmed')
                .eq('reminder_sent_2h', false)
                .gte('scheduled_at', in2hStart.toISOString())
                .lte('scheduled_at', in2hEnd.toISOString());

            console.log(`🔍 Encontrados: ${appointments24h?.length || 0} lembretes 24h, ${appointments2h?.length || 0} lembretes 2h`);

            return {
                reminders24h: appointments24h || [],
                reminders2h: appointments2h || []
            };

        } catch (error) {
            console.error('❌ Erro ao buscar appointments para lembrete:', error.message);
            return { reminders24h: [], reminders2h: [] };
        }
    }

    // 🤖 Processar lembretes automáticos
    async processAutomaticReminders() {
        try {
            console.log('🤖 Iniciando processamento automático de lembretes...');
            
            const { reminders24h, reminders2h } = await this.findAppointmentsNeedingReminders();
            let successCount = 0;
            let errorCount = 0;

            // Processar lembretes de 24h
            for (const appointment of reminders24h) {
                const success = await this.sendAppointmentReminder(appointment.id, '24h');
                if (success) successCount++;
                else errorCount++;
                
                // Pequena pausa entre emails para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Processar lembretes de 2h
            for (const appointment of reminders2h) {
                const success = await this.sendAppointmentReminder(appointment.id, '2h');
                if (success) successCount++;
                else errorCount++;
                
                // Pequena pausa entre emails
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const result = {
                processed24h: reminders24h.length,
                processed2h: reminders2h.length,
                totalSuccess: successCount,
                totalErrors: errorCount,
                timestamp: new Date().toISOString()
            };

            console.log(`✅ Processamento concluído: ${successCount} sucessos, ${errorCount} erros`);
            
            return result;

        } catch (error) {
            console.error('❌ Erro no processamento automático:', error.message);
            return { 
                processed24h: 0, 
                processed2h: 0, 
                totalSuccess: 0, 
                totalErrors: 1,
                error: error.message 
            };
        }
    }

    // 📊 Status específico do sistema de appointments
    async getAppointmentNotificationStatus() {
        try {
            const { reminders24h, reminders2h } = await this.findAppointmentsNeedingReminders();
            
            // Estatísticas adicionais
            const { data: totalConfirmed } = await this.supabase
                .from('appointments')
                .select('id', { count: 'exact' })
                .eq('status', 'confirmed')
                .gte('scheduled_at', new Date().toISOString());

            return {
                status: 'active',
                pendingReminders: {
                    reminders24h: reminders24h.length,
                    reminders2h: reminders2h.length,
                    total: reminders24h.length + reminders2h.length
                },
                totalUpcomingAppointments: totalConfirmed?.length || 0,
                systemHealth: {
                    email: !!this.emailTransporter,
                    supabase: !!this.supabase,
                    templates: !!this.appointmentTemplates
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Erro ao obter status:', error.message);
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

}

module.exports = NotificationSystem;