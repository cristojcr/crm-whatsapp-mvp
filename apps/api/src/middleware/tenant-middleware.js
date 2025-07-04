const whiteLabelService = require('../services/white-label-service');

class TenantMiddleware {
  
  async resolveTenant(req, res, next) {
    try {
      // Extrair subdomínio do host
      const host = req.get('host');
      
      if (!host) {
        return next();
      }
      
      // Extrair subdomínio (ex: cliente.meucrm.com -> cliente)
      const hostParts = host.split('.');
      
      // Se tem pelo menos 3 partes e não é localhost
      if (hostParts.length >= 3 && !host.includes('localhost')) {
        const subdomain = hostParts[0];
        
        // Buscar configuração white label
        try {
          const whiteLabel = await whiteLabelService.getBySubdomain(subdomain);
          
          if (whiteLabel) {
            // Adicionar informações do tenant na requisição
            req.tenant = {
              partnerId: whiteLabel.partner_id,
              subdomain: whiteLabel.subdomain,
              branding: {
                company_name: whiteLabel.company_name,
                logo_url: whiteLabel.logo_url,
                primary_color: whiteLabel.primary_color,
                secondary_color: whiteLabel.secondary_color,
                accent_color: whiteLabel.accent_color
              },
              whiteLabel: true
            };
          }
        } catch (error) {
          console.error('Erro ao resolver tenant:', error);
          // Continuar sem tenant em caso de erro
        }
      }
      
      // Se não encontrou tenant, marcar como principal
      if (!req.tenant) {
        req.tenant = {
          whiteLabel: false,
          partnerId: null,
          subdomain: null
        };
      }
      
      next();
    } catch (error) {
      console.error('Erro no middleware de tenant:', error);
      next(); // Continuar mesmo com erro
    }
  }
}

module.exports = new TenantMiddleware();