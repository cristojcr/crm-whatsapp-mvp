// apps/api/src/middleware/data-protection-middleware.js
const DataProtectionService = require('../services/data-protection-service');

class DataProtectionMiddleware {
    
    // ========================================
    // MIDDLEWARE PRINCIPAL DE AUDITORIA
    // ========================================
    
    static auditMiddleware(req, res, next) {
        // Capturar dados da requisição
        const originalSend = res.send;
        const startTime = Date.now();
        
        // Interceptar resposta
        res.send = function(data) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Log automático para operações sensíveis
            DataProtectionMiddleware.logSensitiveOperation(req, res, duration);
            
            // Restaurar função original e enviar resposta
            res.send = originalSend;
            return originalSend.call(this, data);
        };
        
        next();
    }
    
    // ========================================
    // MIDDLEWARE DE PROTEÇÃO DE DADOS
    // ========================================
    
    static async dataProtectionMiddleware(req, res, next) {
        try {
            const sensitiveOperations = ['POST', 'PUT', 'PATCH', 'DELETE'];
            const sensitiveEndpoints = [
                '/users', '/contacts', '/companies', '/messages', 
                '/conversations', '/appointments', '/user-profiles'
            ];
            
            const isSensitive = sensitiveOperations.includes(req.method) &&
                sensitiveEndpoints.some(endpoint => req.path.includes(endpoint));
            
            if (isSensitive) {
                console.log(`🔒 Operação sensível detectada: ${req.method} ${req.path}`);
                
                // Verificar consentimentos se necessário
                if (req.user?.id && req.method !== 'DELETE') {
                    const hasConsent = await DataProtectionService.checkConsent(
                        req.user.id,
                        'data_processing'
                    );
                    
                    if (!hasConsent && !req.path.includes('/consent')) {
                        return res.status(403).json({
                            error: 'Consentimento necessário para processamento de dados',
                            code: 'CONSENT_REQUIRED',
                            regulation: 'LGPD/GDPR',
                            action_required: 'Solicite consentimento do usuário'
                        });
                    }
                }
                
                // Marcar para auditoria específica
                req.auditEventType = 'data_modification';
                req.requiresCompliance = true;
            }
            
            next();
        } catch (error) {
            console.error('❌ Erro no middleware de proteção de dados:', error);
            next(); // Continuar mesmo com erro para não quebrar a aplicação
        }
    }
    
    // ========================================
    // MIDDLEWARE DE CONTROLE DE ACESSO GDPR
    // ========================================
    
    static gdprAccessControl(requiredRole = 'COMPLIANCE_OFFICER') {
        return async (req, res, next) => {
            try {
                // Verificar se usuário tem permissão para operações GDPR
                if (!req.user) {
                    return res.status(401).json({
                        error: 'Autenticação necessária',
                        code: 'AUTH_REQUIRED'
                    });
                }
                
                // Para admins, verificar role específica
                if (req.user.role && req.user.role !== requiredRole && req.user.role !== 'SUPER_ADMIN') {
                    return res.status(403).json({
                        error: 'Permissão insuficiente para operações GDPR/LGPD',
                        code: 'INSUFFICIENT_PERMISSIONS',
                        required_role: requiredRole
                    });
                }
                
                console.log(`✅ Acesso GDPR autorizado para usuário ${req.user.id}`);
                next();
            } catch (error) {
                console.error('❌ Erro no controle de acesso GDPR:', error);
                return res.status(500).json({
                    error: 'Erro interno na verificação de permissões'
                });
            }
        };
    }
    
    // ========================================
    // MIDDLEWARE DE VALIDAÇÃO DE SOLICITAÇÕES
    // ========================================
    
    static validateDataSubjectRequest(req, res, next) {
        try {
            const { request_type, requester_email, description } = req.body;
            
            // Validações obrigatórias
            if (!request_type) {
                return res.status(400).json({
                    error: 'Tipo de solicitação é obrigatório',
                    code: 'MISSING_REQUEST_TYPE',
                    valid_types: ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection']
                });
            }
            
            if (!requester_email) {
                return res.status(400).json({
                    error: 'Email do solicitante é obrigatório',
                    code: 'MISSING_REQUESTER_EMAIL'
                });
            }
            
            if (!description) {
                return res.status(400).json({
                    error: 'Descrição da solicitação é obrigatória',
                    code: 'MISSING_DESCRIPTION'
                });
            }
            
            // Validar formato do email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(requester_email)) {
                return res.status(400).json({
                    error: 'Formato de email inválido',
                    code: 'INVALID_EMAIL_FORMAT'
                });
            }
            
            // Validar tipo de solicitação
            const validTypes = ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection', 'consent_withdrawal'];
            if (!validTypes.includes(request_type)) {
                return res.status(400).json({
                    error: 'Tipo de solicitação inválido',
                    code: 'INVALID_REQUEST_TYPE',
                    valid_types: validTypes
                });
            }
            
            console.log(`✅ Solicitação GDPR validada: ${request_type} para ${requester_email}`);
            next();
        } catch (error) {
            console.error('❌ Erro na validação de solicitação:', error);
            return res.status(500).json({
                error: 'Erro interno na validação'
            });
        }
    }
    
    // ========================================
    // LOGGING E AUDITORIA
    // ========================================
    
    static async logSensitiveOperation(req, res, duration) {
        try {
            // Determinar se é operação que precisa de log detalhado
            const sensitiveOperations = ['POST', 'PUT', 'PATCH', 'DELETE'];
            const sensitiveEndpoints = [
                '/users', '/contacts', '/companies', '/messages',
                '/data-subject-requests', '/consent', '/data-breach'
            ];
            
            const isSensitive = sensitiveOperations.includes(req.method) &&
                sensitiveEndpoints.some(endpoint => req.path.includes(endpoint));
            
            if (isSensitive || req.requiresCompliance) {
                const logData = {
                    method: req.method,
                    path: req.path,
                    user_id: req.user?.id || null,
                    ip_address: req.ip,
                    user_agent: req.get('User-Agent'),
                    status_code: res.statusCode,
                    duration_ms: duration,
                    timestamp: new Date().toISOString()
                };
                
                // Não incluir dados sensíveis no log, apenas metadata
                if (req.body && !req.path.includes('/auth')) {
                    logData.has_body = true;
                    logData.body_keys = Object.keys(req.body);
                }
                
                await DataProtectionService.logComplianceEvent(
                    req.auditEventType || 'api_access',
                    logData,
                    req.user?.id
                );
            }
        } catch (error) {
            console.error('❌ Erro ao registrar log de operação:', error);
        }
    }
    
    // ========================================
    // MIDDLEWARE DE RATE LIMITING GDPR
    // ========================================
    
    static gdprRateLimit() {
        const requests = new Map();
        
        return (req, res, next) => {
            try {
                const identifier = req.user?.id || req.ip;
                const now = Date.now();
                const windowMs = 60 * 60 * 1000; // 1 hora
                const maxRequests = 10; // Máximo 10 solicitações GDPR por hora
                
                if (!requests.has(identifier)) {
                    requests.set(identifier, []);
                }
                
                const userRequests = requests.get(identifier);
                
                // Limpar requisições antigas
                const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
                requests.set(identifier, validRequests);
                
                if (validRequests.length >= maxRequests) {
                    return res.status(429).json({
                        error: 'Muitas solicitações GDPR/LGPD',
                        code: 'GDPR_RATE_LIMIT_EXCEEDED',
                        retry_after: '1 hour',
                        max_requests: maxRequests
                    });
                }
                
                // Adicionar esta requisição
                validRequests.push(now);
                requests.set(identifier, validRequests);
                
                next();
            } catch (error) {
                console.error('❌ Erro no rate limiting GDPR:', error);
                next(); // Continuar em caso de erro
            }
        };
    }
    
    // ========================================
    // UTILITÁRIOS
    // ========================================
    
    static sanitizeResponse(data) {
        // Remover campos sensíveis de respostas quando necessário
        if (typeof data === 'object' && data !== null) {
            const sanitized = { ...data };
            
            // Campos que nunca devem aparecer em respostas
            const sensitiveFields = ['password', 'password_hash', 'api_key_hash', 'two_factor_secret'];
            
            sensitiveFields.forEach(field => {
                if (field in sanitized) {
                    delete sanitized[field];
                }
            });
            
            return sanitized;
        }
        
        return data;
    }
}

module.exports = DataProtectionMiddleware;