const supabase = require('../config/supabase');
const fs = require('fs');
const path = require('path');

class WhiteLabelService {
  
  // Obter configurações do parceiro
  async getSettings(userEmail) {
    try {
      console.log('🔍 WhiteLabelService.getSettings chamado para:', userEmail);
      
      // Primeiro buscar o partner_id pelo email do usuário - SEM .single()
      const { data: partners, error: partnerError } = await supabase
        .from('partners')
        .select('id')
        .eq('email', userEmail);
      
      console.log('📊 Resultado da busca parceiro (white label):');
      console.log('   Data:', partners);
      console.log('   Error:', partnerError);
      console.log('   Total encontrados:', partners?.length || 0);
      
      if (partnerError || !partners || partners.length === 0) {
        console.log('Partner não encontrado para email:', userEmail);
        return this.getDefaultSettings();
      }
      
      if (partners.length > 1) {
        console.log('⚠️ Múltiplos parceiros encontrados, usando o primeiro');
      }
      
      const partner = partners[0];
      const partnerId = partner.id;
      console.log('🎯 Partner ID encontrado:', partnerId);
      
      // Buscar configurações white label
      const { data, error } = await supabase
        .from('white_label_settings')
        .select('*')
        .eq('partner_id', partnerId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw new Error('Erro ao buscar configurações: ' + error.message);
      }
      
      if (!data) {
        console.log('Configurações não encontradas, retornando defaults');
        return { 
          ...this.getDefaultSettings(),
          partner_id: partnerId 
        };
      }
      
      console.log('✅ Configurações encontradas:', data);
      return data;
    } catch (error) {
      console.error('❌ Erro em getSettings:', error);
      throw new Error('Erro ao buscar configurações: ' + error.message);
    }
  }
  
  // Configurações padrão
  getDefaultSettings() {
    return {
      company_name: '',
      subdomain: '',
      logo_url: null,
      favicon_url: null,
      primary_color: '#6366f1',
      secondary_color: '#8b5cf6',
      accent_color: '#06b6d4',
      custom_domain: null,
      currency: 'BRL',
      timezone: 'America/Sao_Paulo',
      language: 'pt-BR',
      support_email: '',
      support_phone: '',
      is_active: false,
      setup_completed: false
    };
  }
  
  // Atualizar configurações
  async updateSettings(userEmail, settings) {
    try {
      console.log('💾 WhiteLabelService.updateSettings chamado para:', userEmail);
      console.log('📄 Dados recebidos:', settings);
      
      // Primeiro buscar o partner_id pelo email do usuário - SEM .single()
      console.log('🔍 Buscando parceiro com email:', userEmail);
      const { data: partners, error: partnerError } = await supabase
        .from('partners')
        .select('id, email, business_name, status')
        .eq('email', userEmail);
      
      console.log('📊 Resultado da busca parceiro:');
      console.log('   Data:', partners);
      console.log('   Error:', partnerError);
      console.log('   Total encontrados:', partners?.length || 0);
      
      if (partnerError) {
        console.log('❌ Erro ao buscar parceiro:', partnerError.message);
        throw new Error('Erro ao buscar parceiro: ' + partnerError.message);
      }
      
      if (!partners || partners.length === 0) {
        console.log('❌ Nenhum parceiro encontrado para email:', userEmail);
        throw new Error('Usuário não é um parceiro válido - email não encontrado na tabela partners');
      }
      
      if (partners.length > 1) {
        console.log('⚠️ Múltiplos parceiros encontrados:', partners.length);
        console.log('   Usando o primeiro parceiro ativo');
      }
      
      // Pegar o primeiro parceiro ativo
      const partner = partners.find(p => p.status === 'active') || partners[0];
      
      if (partner.status !== 'active') {
        console.log('❌ Parceiro não está ativo. Status:', partner.status);
        throw new Error('Parceiro não está ativo. Status: ' + partner.status);
      }
      
      const partnerId = partner.id;
      console.log('🎯 Partner ID para update:', partnerId);
      console.log('🏢 Business name:', partner.business_name);
      
      // Validar dados obrigatórios
      if (!settings.company_name || settings.company_name.trim() === '') {
        throw new Error('Nome da empresa é obrigatório');
      }
      
      if (!settings.subdomain || settings.subdomain.trim() === '') {
        throw new Error('Subdomínio é obrigatório');
      }
      
      // Validar formato do subdomínio
      const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
      if (!subdomainRegex.test(settings.subdomain)) {
        throw new Error('Subdomínio deve conter apenas letras minúsculas, números e hífens');
      }
      
      // Verificar se subdomínio já existe (para outro parceiro) - SEM USAR COLUNA ACTIVE
      const existing = await this.getBySubdomain(settings.subdomain);
      if (existing && existing.partner_id !== partnerId) {
        throw new Error('Este subdomínio já está em uso');
      }
      
      const settingsData = {
        partner_id: partnerId,
        company_name: settings.company_name.trim(),
        subdomain: settings.subdomain.toLowerCase().trim(),
        logo_url: settings.logo_url || null,
        favicon_url: settings.favicon_url || null,
        primary_color: settings.primary_color || '#6366f1',
        secondary_color: settings.secondary_color || '#8b5cf6',
        accent_color: settings.accent_color || '#06b6d4',
        custom_domain: settings.custom_domain || null,
        currency: settings.currency || 'BRL',
        timezone: settings.timezone || 'America/Sao_Paulo',
        language: settings.language || 'pt-BR',
        support_email: settings.support_email || settings.contact_email || '',
        support_phone: settings.support_phone || settings.contact_phone || '',
        is_active: settings.is_active !== undefined ? settings.is_active : (settings.active !== undefined ? settings.active : false),
        setup_completed: true,
        updated_at: new Date().toISOString()
      };
      
      console.log('💾 Dados para salvar:', settingsData);
      
      const { data, error } = await supabase
        .from('white_label_settings')
        .upsert(settingsData, { onConflict: 'partner_id' })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erro no Supabase:', error);
        throw new Error('Erro ao salvar configurações: ' + error.message);
      }
      
      console.log('✅ Configurações salvas:', data);
      return data;
    } catch (error) {
      console.error('❌ Erro em updateSettings:', error);
      throw new Error('Erro ao salvar configurações: ' + error.message);
    }
  }
  
  // Upload de logo
  async uploadLogo(userEmail, file) {
    try {
      // Primeiro buscar o partner_id pelo email do usuário - SEM .single()
      const { data: partners, error: partnerError } = await supabase
        .from('partners')
        .select('id')
        .eq('email', userEmail);
      
      if (partnerError || !partners || partners.length === 0) {
        throw new Error('Usuário não é um parceiro válido');
      }
      
      const partner = partners[0];
      const partnerId = partner.id;
      
      // Criar diretório se não existir
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Gerar nome único
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `logo-${partnerId}-${uniqueSuffix}${path.extname(file.originalname)}`;
      const filepath = path.join(uploadDir, filename);
      
      // Mover arquivo
      fs.renameSync(file.path, filepath);
      
      // URL pública
      const logoUrl = `/uploads/${filename}`;
      
      // Atualizar no banco
      const { error } = await supabase
        .from('white_label_settings')
        .update({ 
          logo_url: logoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('partner_id', partnerId);
      
      if (error) {
        throw new Error('Erro ao salvar URL do logo: ' + error.message);
      }
      
      return logoUrl;
    } catch (error) {
      throw new Error('Erro no upload do logo: ' + error.message);
    }
  }
  
  // Buscar por subdomínio - REMOVIDO TOTALMENTE A COLUNA ACTIVE
  async getBySubdomain(subdomain) {
    console.log('🔍 getBySubdomain chamado para:', subdomain);
    
    const { data, error } = await supabase
      .from('white_label_settings')
      .select('*')
      .eq('subdomain', subdomain.toLowerCase())
      // REMOVIDO COMPLETAMENTE: .eq('active', true) ou .eq('is_active', true)
      .single();
    
    console.log('📊 Resultado getBySubdomain:');
    console.log('   Data:', data);
    console.log('   Error:', error);
    
    if (error && error.code !== 'PGRST116') {
      throw new Error('Erro ao buscar por subdomínio: ' + error.message);
    }
    
    return data;
  }
  
  // Validar configuração
  async validateSetup(userEmail) {
    try {
      const settings = await this.getSettings(userEmail);
      
      const validation = {
        valid: true,
        errors: [],
        warnings: []
      };
      
      // Verificações obrigatórias
      if (!settings.company_name) {
        validation.errors.push('Nome da empresa é obrigatório');
      }
      
      if (!settings.subdomain) {
        validation.errors.push('Subdomínio é obrigatório');
      }
      
      if (!settings.support_email) {
        validation.warnings.push('Email de contato recomendado');
      }
      
      if (!settings.logo_url) {
        validation.warnings.push('Logo recomendado para melhor branding');
      }
      
      validation.valid = validation.errors.length === 0;
      
      return validation;
    } catch (error) {
      console.error('Erro em validateSetup:', error);
      throw new Error('Erro ao validar configuração: ' + error.message);
    }
  }
}

// EXPORTAÇÃO CORRETA
module.exports = new WhiteLabelService();