// apps/api/src/middleware/compliance-middleware.js
const ComplianceService = require('../services/compliance-service');

// Middleware para verificar compliance antes de enviar mensagem
const checkCompliance = async (req, res, next) => {
    try {
        const { channel_type, conversation_id } = req.body;
        const userId = req.user.id;
        
        // Verificar compliance apenas para WhatsApp e Instagram
        if (channel_type === 'whatsapp' || channel_type === 'instagram') {
            const complianceCheck = await ComplianceService.canSendMessage(
                conversation_id,
                channel_type,
                userId
            );
            
            if (!complianceCheck.canSend) {
                // Adicionar à fila automaticamente
                await ComplianceService.addToQueue(
                    conversation_id,
                    userId,
                    channel_type,
                    req.body.recipient_phone,
                    req.body.message,
                    req.body.message_type || 'text'
                );
                
                return res.status(202).json({
                    success: false,
                    compliance_blocked: true,
                    reason: complianceCheck.reason,
                    message: complianceCheck.message,
                    queued: true,
                    queue_info: 'Mensagem adicionada à fila - será enviada quando janela abrir'
                });
            }
            
            // Anexar info de compliance para logs
            req.complianceInfo = complianceCheck;
        }
        
        next();
        
    } catch (error) {
        console.error('❌ Erro no middleware de compliance:', error);
        // Em caso de erro, permitir envio (fail-safe)
        next();
    }
};

module.exports = {
    checkCompliance
};