// apps/api/src/routes/compliance.js
const express = require('express');
const router = express.Router();
const DataProtectionService = require('../services/data-protection-service');
const DataProtectionMiddleware = require('../middleware/data-protection-middleware');
const { authenticateToken } = require('../middleware/auth');

// ========================================
// APLICAR MIDDLEWARES GLOBAIS
// ========================================

// Todos os endpoints precisam de autenticação
router.use(authenticateToken);

// Middleware de auditoria para todas as rotas
router.use(DataProtectionMiddleware.auditMiddleware);

// Rate limiting específico para GDPR
router.use(DataProtectionMiddleware.gdprRateLimit());

// ========================================
// ROTAS DE SOLICITAÇÕES DOS TITULARES
// ========================================

// POST /api/compliance/data-subject-request/access
// Direito de Acesso (Art. 18 LGPD / Art. 15 GDPR)
router.post('/data-subject-request/access', 
    DataProtectionMiddleware.validateDataSubjectRequest,
    async (req, res) => {
        try {
            const { user_id, requester_email, requester_name } = req.body;
            
            console.log(`📋 Processando solicitação de acesso para usuário ${user_id}`);
            
            const result = await DataProtectionService.requestDataAccess(
                user_id || req.user.id,
                requester_email,
                requester_name
            );
            
            if (result.success) {
                res.status(201).json({
                    message: 'Solicitação de acesso aos dados registrada com sucesso',
                    request_id: result.request_id,
                    status: 'received',
                    estimated_response: '15 dias úteis',
                    regulation: 'LGPD Art. 18 / GDPR Art. 15'
                });
            } else {
                res.status(400).json({
                    error: 'Erro ao processar solicitação de acesso',
                    details: result.error
                });
            }
        } catch (error) {
            console.error('❌ Erro na rota de acesso aos dados:', error);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        }
    }
);

// POST /api/compliance/data-subject-request/rectification
// Direito de Retificação (Art. 18 LGPD / Art. 16 GDPR)
router.post('/data-subject-request/rectification',
    DataProtectionMiddleware.validateDataSubjectRequest,
    async (req, res) => {
        try {
            const { user_id, requester_email, data_categories, description } = req.body;
            
            console.log(`📋 Processando solicitação de retificação para usuário ${user_id}`);
            
            const result = await DataProtectionService.requestDataRectification(
                user_id || req.user.id,
                requester_email,
                data_categories,
                description
            );
            
            if (result.success) {
                res.status(201).json({
                    message: 'Solicitação de retificação registrada com sucesso',
                    request_id: result.request_id,
                    status: 'received',
                    estimated_response: '15 dias úteis',
                    regulation: 'LGPD Art. 18 / GDPR Art. 16'
                });
            } else {
                res.status(400).json({
                    error: 'Erro ao processar solicitação de retificação',
                    details: result.error
                });
            }
        } catch (error) {
            console.error('❌ Erro na rota de retificação:', error);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        }
    }
);

// POST /api/compliance/data-subject-request/erasure
// Direito de Exclusão (Art. 18 LGPD / Art. 17 GDPR)
router.post('/data-subject-request/erasure',
    DataProtectionMiddleware.validateDataSubjectRequest,
    async (req, res) => {
        try {
            const { user_id, requester_email, reason } = req.body;
            
            console.log(`📋 Processando solicitação de exclusão para usuário ${user_id}`);
            
            const result = await DataProtectionService.requestDataErasure(
                user_id || req.user.id,
                requester_email,
                reason
            );
            
            if (result.success) {
                res.status(201).json({
                    message: 'Solicitação de exclusão registrada com sucesso',
                    request_id: result.request_id,
                    status: 'received',
                    estimated_response: '15 dias úteis',
                    regulation: 'LGPD Art. 18 / GDPR Art. 17',
                    warning: 'Esta ação pode ser irreversível'
                });
            } else {
                res.status(400).json({
                    error: 'Erro ao processar solicitação de exclusão',
                    details: result.error
                });
            }
        } catch (error) {
            console.error('❌ Erro na rota de exclusão:', error);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        }
    }
);

// POST /api/compliance/data-subject-request/portability
// Direito de Portabilidade (Art. 18 LGPD / Art. 20 GDPR)
router.post('/data-subject-request/portability',
    DataProtectionMiddleware.validateDataSubjectRequest,
    async (req, res) => {
        try {
            const { user_id, requester_email, format = 'JSON' } = req.body;
            
            console.log(`📋 Processando solicitação de portabilidade para usuário ${user_id}`);
            
            const result = await DataProtectionService.requestDataPortability(
                user_id || req.user.id,
                requester_email,
                format
            );
            
            if (result.success) {
                res.status(201).json({
                    message: 'Solicitação de portabilidade registrada com sucesso',
                    request_id: result.request_id,
                    status: 'received',
                    estimated_response: '30 dias úteis',
                    format: format,
                    regulation: 'LGPD Art. 18 / GDPR Art. 20'
                });
            } else {
                res.status(400).json({
                    error: 'Erro ao processar solicitação de portabilidade',
                    details: result.error
                });
            }
        } catch (error) {
            console.error('❌ Erro na rota de portabilidade:', error);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        }
    }
);

// ========================================
// ROTAS DE CONSENTIMENTOS
// ========================================

// POST /api/compliance/consent
// Registrar consentimento
router.post('/consent', async (req, res) => {
    try {
        const { consent_type, consent_given, purpose, legal_basis = 'consent' } = req.body;
        
        if (!consent_type || typeof consent_given !== 'boolean') {
            return res.status(400).json({
                error: 'Tipo de consentimento e valor são obrigatórios',
                required_fields: ['consent_type', 'consent_given', 'purpose']
            });
        }
        
        console.log(`📝 Registrando consentimento: ${consent_type} = ${consent_given}`);
        
        const result = await DataProtectionService.recordConsent(
            req.user.id,
            consent_type,
            consent_given,
            purpose,
            legal_basis
        );
        
        if (result.success) {
            res.status(201).json({
                message: 'Consentimento registrado com sucesso',
                consent_id: result.consent_id,
                consent_type: consent_type,
                consent_given: consent_given,
                legal_basis: legal_basis
            });
        } else {
            res.status(400).json({
                error: 'Erro ao registrar consentimento',
                details: result.error
            });
        }
    } catch (error) {
        console.error('❌ Erro na rota de consentimento:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/compliance/consent/:consent_type
// Verificar consentimento
router.get('/consent/:consent_type', async (req, res) => {
    try {
        const { consent_type } = req.params;
        
        console.log(`🔍 Verificando consentimento: ${consent_type} para usuário ${req.user.id}`);
        
        const consent = await DataProtectionService.checkConsent(req.user.id, consent_type);
        
        res.json({
            consent_type: consent_type,
            consent_given: consent ? consent.consent_given : false,
            consent_date: consent ? consent.consent_date : null,
            legal_basis: consent ? consent.legal_basis : null,
            version: consent ? consent.version : null
        });
    } catch (error) {
        console.error('❌ Erro ao verificar consentimento:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// POST /api/compliance/consent/:consent_type/withdraw
// Revogar consentimento
router.post('/consent/:consent_type/withdraw', async (req, res) => {
    try {
        const { consent_type } = req.params;
        const { reason } = req.body;
        
        if (!reason) {
            return res.status(400).json({
                error: 'Motivo da revogação é obrigatório',
                required_fields: ['reason']
            });
        }
        
        console.log(`🚫 Revogando consentimento: ${consent_type} para usuário ${req.user.id}`);
        
        const result = await DataProtectionService.withdrawConsent(
            req.user.id,
            consent_type,
            reason
        );
        
        if (result.success) {
            res.json({
                message: 'Consentimento revogado com sucesso',
                withdrawal_id: result.withdrawal_id,
                consent_type: consent_type,
                withdrawal_date: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                error: 'Erro ao revogar consentimento',
                details: result.error
            });
        }
    } catch (error) {
        console.error('❌ Erro ao revogar consentimento:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// ========================================
// ROTAS ADMINISTRATIVAS (COMPLIANCE OFFICERS)
// ========================================

// POST /api/compliance/data-breach
// Reportar violação de dados
router.post('/data-breach',
    DataProtectionMiddleware.gdprAccessControl('COMPLIANCE_OFFICER'),
    async (req, res) => {
        try {
            const { title, description, severity, data_categories_affected, estimated_affected_subjects } = req.body;
            
            if (!title || !description || !severity) {
                return res.status(400).json({
                    error: 'Campos obrigatórios ausentes',
                    required_fields: ['title', 'description', 'severity'],
                    valid_severities: ['low', 'medium', 'high', 'critical']
                });
            }
            
            console.log(`🚨 Reportando violação de dados: ${title}`);
            
            const result = await DataProtectionService.reportDataBreach({
                title,
                description,
                severity,
                data_categories_affected,
                estimated_affected_subjects,
                reported_by: req.user.id
            });
            
            if (result.success) {
                res.status(201).json({
                    message: 'Violação de dados reportada com sucesso',
                    incident_id: result.incident_id,
                    incident_code: result.incident_code,
                    severity: severity,
                    next_steps: severity === 'high' || severity === 'critical' ? 
                        'Notificação das autoridades será agendada' : 
                        'Investigação interna iniciada'
                });
            } else {
                res.status(400).json({
                    error: 'Erro ao reportar violação',
                    details: result.error
                });
            }
        } catch (error) {
            console.error('❌ Erro ao reportar violação:', error);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        }
    }
);

// GET /api/compliance/stats
// Estatísticas de compliance
router.get('/stats',
    DataProtectionMiddleware.gdprAccessControl('COMPLIANCE_OFFICER'),
    async (req, res) => {
        try {
            console.log(`📊 Buscando estatísticas de compliance`);
            
            const stats = await DataProtectionService.getComplianceStats();
            
            if (stats) {
                res.json({
                    message: 'Estatísticas de compliance',
                    timestamp: new Date().toISOString(),
                    data: stats
                });
            } else {
                res.status(500).json({
                    error: 'Erro ao obter estatísticas'
                });
            }
        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas:', error);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        }
    }
);

// ========================================
// ROTAS DE TESTE/HEALTH CHECK
// ========================================

// GET /api/compliance/health
// Health check do sistema de compliance
router.get('/health', async (req, res) => {
    try {
        res.json({
            status: 'healthy',
            message: 'Sistema de compliance LGPD/GDPR operacional',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            regulations: ['LGPD', 'GDPR'],
            features: [
                'data_subject_requests',
                'consent_management',
                'data_breach_reporting',
                'audit_logging',
                'retention_policies'
            ]
        });
    } catch (error) {
        console.error('❌ Erro no health check:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: 'Sistema de compliance com problemas'
        });
    }
});

module.exports = router;