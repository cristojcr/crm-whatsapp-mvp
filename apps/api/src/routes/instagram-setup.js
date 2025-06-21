// src/routes/instagram-setup.js
// ID 2.12 - FUNCIONALIDADE EXTRA: API de Setup Instagram Business
// Rotas para configuração de Instagram Business Account
// Endpoints: POST /configure, GET /test, GET /stats, GET /account-info
const express = require('express');
const router = express.Router();
const InstagramBusinessCreator = require('../services/instagram-business-creator');
const InstagramProcessor = require('../services/instagram-processor');
const { supabase } = require('../config/supabase');

const instagramCreator = new InstagramBusinessCreator();
const instagramProcessor = new InstagramProcessor();

// Configurar Instagram Business (funcionalidade principal)
router.post('/configure', async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { 
            app_id, 
            app_secret, 
            page_access_token, 
            business_account_id,
            page_id 
        } = req.body;

        console.log(`📸 Solicitação de configuração Instagram para usuário: ${userId}`);

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!app_id || !app_secret || !page_access_token || !business_account_id) {
            return res.status(400).json({
                success: false,
                error: 'App ID, App Secret, Page Access Token e Business Account ID são obrigatórios',
                code: 'MISSING_FIELDS',
                required_fields: ['app_id', 'app_secret', 'page_access_token', 'business_account_id'],
                help: {
                    app_id: 'Encontre em Meta for Developers > Seu App > Configurações Básicas',
                    app_secret: 'Encontre em Meta for Developers > Seu App > Configurações Básicas',
                    page_access_token: 'Gere em Meta for Developers > Seu App > Messenger > Configurações',
                    business_account_id: 'ID da sua conta Instagram Business'
                }
            });
        }

        // Verificar se usuário já tem Instagram configurado
        const { data: existingChannel, error: checkError } = await supabase
            .from('user_channels')
            .select('id, channel_config')
            .eq('user_id', userId)
            .eq('channel_type', 'instagram')
            .eq('is_active', true)
            .single();

        if (existingChannel) {
            return res.status(409).json({
                success: false,
                error: 'Usuário já possui Instagram configurado',
                code: 'INSTAGRAM_ALREADY_EXISTS',
                existing_account: existingChannel.channel_config.account_info?.username,
                suggestion: 'Desative a configuração atual ou atualize as credenciais'
            });
        }

        // Verificar plano do usuário (validação de negócio)
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('plan')
            .eq('id', userId)
            .single();

        if (userError) {
            return res.status(500).json({
                success: false,
                error: 'Erro ao verificar plano do usuário',
                code: 'USER_PLAN_ERROR'
            });
        }

        if (user.plan === 'basic') {
            return res.status(403).json({
                success: false,
                error: 'Plano Básico não permite Instagram',
                code: 'PLAN_RESTRICTION',
                current_plan: 'basic',
                required_plan: 'pro',
                upgrade_url: '/dashboard/billing'
            });
        }

        // Para plano Pro, verificar se já tem outro canal ativo
        if (user.plan === 'pro') {
            const { data: activeChannels, error: channelsError } = await supabase
                .from('user_channels')
                .select('channel_type')
                .eq('user_id', userId)
                .eq('is_active', true);

            if (activeChannels && activeChannels.length >= 1) {
                return res.status(403).json({
                    success: false,
                    error: 'Plano Pro permite apenas 1 canal ativo',
                    code: 'PLAN_LIMIT_REACHED',
                    active_channels: activeChannels.map(ch => ch.channel_type),
                    suggestion: 'Desative outro canal ou faça upgrade para Premium'
                });
            }
        }

        // Tentar configurar Instagram
        const result = await instagramCreator.setupInstagramForUser(userId, {
            app_id,
            app_secret,
            page_access_token,
            business_account_id,
            page_id
        });

        // Log de sucesso
        console.log(`✅ Instagram configurado para usuário ${userId}: @${result.account_info.username}`);

        res.json({
            success: true,
            message: 'Instagram Business configurado com sucesso!',
            data: result,
            setup_complete: true
        });

    } catch (error) {
        console.error('Erro configurando Instagram:', error);
        
        // Tratamento de erros específicos
        if (error.message.includes('Token de acesso inválido')) {
            res.status(400).json({
                success: false,
                error: 'Page Access Token inválido ou expirado',
                code: 'INVALID_ACCESS_TOKEN',
                help: 'Gere um novo token em Meta for Developers'
            });
        } else if (error.message.includes('Business Account ID')) {
            res.status(400).json({
                success: false,
                error: 'Business Account ID inválido',
                code: 'INVALID_BUSINESS_ACCOUNT',
                help: 'Verifique se é uma conta Instagram Business válida'
            });
        } else if (error.message.includes('permissão')) {
            res.status(403).json({
                success: false,
                error: 'Sem permissão para acessar esta conta',
                code: 'ACCESS_DENIED',
                help: 'Verifique se o token tem as permissões necessárias'
            });
        } else {
            res.status(500).json({
                success: false,
                error: error.message,
                code: 'CONFIGURATION_FAILED'
            });
        }
    }
});

// Testar configuração existente do Instagram
router.get('/test', async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        console.log(`🧪 Testando Instagram do usuário: ${userId}`);

        const result = await instagramCreator.testUserInstagram(userId);

        if (result.success) {
            res.json({
                success: true,
                message: 'Instagram está funcionando perfeitamente!',
                data: result
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error,
                code: 'INSTAGRAM_TEST_FAILED',
                last_test: result.last_test
            });
        }

    } catch (error) {
        console.error('Erro testando Instagram:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'TEST_ERROR'
        });
    }
});

// Obter informações da conta Instagram Business
router.get('/account-info', async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const accountInfo = await instagramProcessor.getAccountInfo(userId);
        
        res.json({
            success: true,
            account_info: accountInfo
        });

    } catch (error) {
        console.error('Erro obtendo info da conta Instagram:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'ACCOUNT_INFO_ERROR'
        });
    }
});

// Obter estatísticas da conta Instagram
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user?.id || req.query.user_id;
        const days = parseInt(req.query.days) || 30;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        if (days < 1 || days > 365) {
            return res.status(400).json({
                success: false,
                error: 'Período deve ser entre 1 e 365 dias',
                code: 'INVALID_PERIOD'
            });
        }

        const stats = await instagramCreator.getAccountStats(userId, days);
        
        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Erro obtendo estatísticas Instagram:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'STATS_ERROR'
        });
    }
});

// Atualizar token de acesso (tokens Instagram expiram periodicamente)
router.post('/refresh-token', async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { new_page_access_token } = req.body;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        if (!new_page_access_token) {
            return res.status(400).json({
                success: false,
                error: 'Novo Page Access Token é obrigatório',
                code: 'MISSING_NEW_TOKEN'
            });
        }

        const result = await instagramCreator.refreshAccessToken(userId, new_page_access_token);

        res.json({
            success: true,
            message: 'Token atualizado com sucesso!',
            data: result
        });

    } catch (error) {
        console.error('Erro atualizando token:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'TOKEN_REFRESH_FAILED'
        });
    }
});

// Enviar mensagem de teste via Instagram
router.post('/send-test-message', async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { recipient_id, custom_message } = req.body;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        if (!recipient_id) {
            return res.status(400).json({
                success: false,
                error: 'Recipient ID é obrigatório',
                code: 'MISSING_RECIPIENT',
                help: 'Use o Instagram ID de um usuário que já enviou mensagem'
            });
        }

        const testMessage = custom_message || `📸 Teste do CRM\n\nSeu Instagram Business está funcionando!\n\n✅ Status: Ativo\n📅 Data: ${new Date().toLocaleString('pt-BR')}\n\nAgora seus clientes podem enviar mensagens diretas! 🎉`;
        
        const result = await instagramProcessor.sendMessage(
            userId,
            recipient_id,
            testMessage,
            'text'
        );

        res.json({
            success: true,
            message: 'Mensagem de teste enviada com sucesso!',
            data: result
        });

    } catch (error) {
        console.error('Erro enviando mensagem de teste:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'SEND_TEST_FAILED'
        });
    }
});

// Remover Instagram do usuário
router.delete('/remove/:channelId', async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { channelId } = req.params;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não autenticado'
            });
        }

        const result = await instagramCreator.removeInstagramFromUser(userId, channelId);

        res.json({
            success: true,
            message: result.message,
            note: result.note
        });

    } catch (error) {
        console.error('Erro removendo Instagram:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Validar configuração Instagram em tempo real
router.post('/validate', async (req, res) => {
    try {
        const { app_id, app_secret, page_access_token, business_account_id } = req.body;

        if (!app_id || !app_secret || !page_access_token || !business_account_id) {
            return res.status(400).json({
                success: false,
                error: 'Todos os campos são obrigatórios para validação',
                code: 'MISSING_VALIDATION_FIELDS'
            });
        }

        // Tentar validar credenciais sem salvar
        const accountData = await instagramCreator.validateCredentials({
            app_id,
            app_secret, 
            page_access_token,
            business_account_id
        });

        res.json({
            success: true,
            message: 'Credenciais válidas!',
            account_preview: {
                username: accountData.username,
                name: accountData.name,
                account_type: accountData.account_type
            },
            validation_passed: true
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
            code: 'VALIDATION_FAILED',
            validation_passed: false
        });
    }
});

// Obter instruções de setup para usuários
router.get('/setup-instructions', (req, res) => {
    res.json({
        success: true,
        instructions: {
            title: "Como configurar Instagram Business",
            description: "Conecte sua conta Instagram Business ao CRM",
            requirements: [
                "Conta Instagram Business (não pessoal)",
                "Página do Facebook vinculada",
                "App criado no Meta for Developers"
            ],
            steps: [
                {
                    step: 1,
                    title: "Criar App no Meta for Developers",
                    details: [
                        "Acesse developers.facebook.com",
                        "Clique em 'Criar App'",
                        "Escolha 'Empresa' ou 'Outros'",
                        "Adicione o produto 'Messenger'"
                    ]
                },
                {
                    step: 2,
                    title: "Obter App ID e App Secret",
                    details: [
                        "No painel do app, vá em 'Configurações Básicas'",
                        "Copie o 'ID do App'",
                        "Copie a 'Chave Secreta do App'"
                    ]
                },
                {
                    step: 3,
                    title: "Gerar Page Access Token",
                    details: [
                        "Vá em Messenger > Configurações",
                        "Na seção 'Tokens de Acesso', gere um token",
                        "Selecione sua página do Facebook",
                        "Copie o token gerado"
                    ]
                },
                {
                    step: 4,
                    title: "Encontrar Business Account ID",
                    details: [
                        "No Instagram Business, vá em Configurações",
                        "Clique em 'Conta'",
                        "O ID aparece na URL ou nas informações da conta"
                    ]
                }
            ],
            time_estimate: "15-30 minutos",
            difficulty: "Médio",
            help_links: {
                meta_developers: "https://developers.facebook.com",
                instagram_business: "https://business.instagram.com",
                documentation: "https://developers.facebook.com/docs/messenger-platform"
            }
        },
        common_issues: [
            {
                issue: "Token inválido",
                solution: "Verifique se o token foi copiado completamente e se não expirou"
            },
            {
                issue: "Conta não é Business",
                solution: "Converta sua conta pessoal para Business no Instagram"
            },
            {
                issue: "Sem permissões",
                solution: "Certifique-se de ser admin da página do Facebook vinculada"
            }
        ]
    });
});

module.exports = router;