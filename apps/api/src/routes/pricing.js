const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pricingService = require('../services/pricing-service');

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// Obter preços configurados pelo parceiro
router.get('/', async (req, res) => {
  try {
    console.log('🔍 GET /pricing - User autenticado:', req.user?.email);
    
    const userEmail = req.user.email;  // ✅ CORRIGIDO: usar email
    const pricing = await pricingService.getPartnerPricing(userEmail);
    res.json(pricing);
  } catch (error) {
    console.error('❌ Erro em GET /pricing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Configurar preços personalizados
router.post('/', async (req, res) => {
  try {
    console.log('🔍 POST /pricing - User autenticado:', req.user?.email);
    console.log('🔍 Body recebido:', req.body);
    
    const userEmail = req.user.email;  // ✅ CORRIGIDO: usar email
    const { plan_code, price } = req.body;
    
    if (!plan_code || !price) {
      return res.status(400).json({ 
        error: 'plan_code e price são obrigatórios' 
      });
    }

    const pricing = await pricingService.setPartnerPrice(userEmail, plan_code, price);
    res.json(pricing);
  } catch (error) {
    console.error('❌ Erro em POST /pricing:', error);
    res.status(400).json({ error: error.message });
  }
});

// Simular comissão
router.post('/simulate', async (req, res) => {
  try {
    console.log('🔍 POST /pricing/simulate - Body:', req.body);
    
    const { plan_code, partner_price } = req.body;
    
    if (!plan_code || !partner_price) {
      return res.status(400).json({ 
        error: 'plan_code e partner_price são obrigatórios' 
      });
    }

    const simulation = pricingService.simulateCommission(plan_code, partner_price);
    res.json(simulation);
  } catch (error) {
    console.error('❌ Erro em POST /pricing/simulate:', error);
    res.status(400).json({ error: error.message });
  }
});

// Obter preços base do sistema
router.get('/base-prices', (req, res) => {
  try {
    console.log('🔍 GET /pricing/base-prices');
    
    const basePrices = pricingService.getBasePrices();
    res.json(basePrices);
  } catch (error) {
    console.error('❌ Erro em GET /pricing/base-prices:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;