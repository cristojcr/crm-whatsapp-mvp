const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const whiteLabelService = require('../services/white-label-service');

// Configurar multer para upload de logo
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'), false);
    }
  }
});

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// Obter configurações white label do parceiro
router.get('/settings', async (req, res) => {
  try {
    console.log('🔍 GET /white-label/settings - User autenticado:', req.user?.email);
    
    const userEmail = req.user.email;  // ✅ PADRONIZADO: usar email diretamente
    
    if (!userEmail) {
      console.log('❌ Email não encontrado no token');
      return res.status(400).json({ 
        error: 'Email do usuário não encontrado no token de autenticação'
      });
    }
    
    const settings = await whiteLabelService.getSettings(userEmail);
    res.json(settings);
  } catch (error) {
    console.error('❌ Erro ao buscar configurações white label:', error);
    res.status(500).json({ error: error.message });
  }
});

// Criar/atualizar configurações white label
router.post('/settings', async (req, res) => {
  try {
    console.log('🔍 POST /white-label/settings - User autenticado:', req.user?.email);
    console.log('🔍 Body recebido:', req.body);
    
    const userEmail = req.user.email;  // ✅ PADRONIZADO: usar email diretamente
    
    if (!userEmail) {
      console.log('❌ Email não encontrado no token');
      return res.status(400).json({ 
        error: 'Email do usuário não encontrado no token de autenticação'
      });
    }
    
    const settings = await whiteLabelService.updateSettings(userEmail, req.body);
    res.json(settings);
  } catch (error) {
    console.error('❌ Erro ao salvar configurações white label:', error);
    res.status(400).json({ error: error.message });
  }
});

// Upload de logo
router.post('/logo', upload.single('logo'), async (req, res) => {
  try {
    console.log('🔍 POST /white-label/logo - User autenticado:', req.user?.email);
    
    const userEmail = req.user.email;  // ✅ JÁ ESTAVA CORRETO
    
    if (!userEmail) {
      return res.status(400).json({ 
        error: 'Email do usuário não encontrado no token de autenticação'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de logo é obrigatório' });
    }

    const logoUrl = await whiteLabelService.uploadLogo(userEmail, req.file);
    res.json({ logo_url: logoUrl });
  } catch (error) {
    console.error('❌ Erro no upload do logo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validar configuração
router.get('/validate', async (req, res) => {
  try {
    console.log('🔍 GET /white-label/validate - User autenticado:', req.user?.email);
    
    const userEmail = req.user.email;  // ✅ JÁ ESTAVA CORRETO
    
    if (!userEmail) {
      return res.status(400).json({ 
        error: 'Email do usuário não encontrado no token de autenticação'
      });
    }
    
    const validation = await whiteLabelService.validateSetup(userEmail);
    res.json(validation);
  } catch (error) {
    console.error('❌ Erro na validação:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verificar disponibilidade de subdomínio (público)
router.get('/subdomain/check/:subdomain', async (req, res) => {
  try {
    console.log('🔍 GET /white-label/subdomain/check - Subdomain:', req.params.subdomain);
    
    const { subdomain } = req.params;
    const existing = await whiteLabelService.getBySubdomain(subdomain);
    res.json({ available: !existing });
  } catch (error) {
    console.error('❌ Erro ao verificar subdomínio:', error);
    res.json({ available: true }); // Em caso de erro, considerar disponível
  }
});

module.exports = router;