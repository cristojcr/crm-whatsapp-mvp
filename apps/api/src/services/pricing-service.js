const supabase = require('../config/supabase');

class PricingService {
  
  constructor() {
    // Preços base do sistema (mínimos permitidos)
    this.basePrices = {
      basic: 87.00,    // R$ 87 - Plano Básico (WhatsApp apenas)
      pro: 149.00,     // R$ 149 - Plano Pro (1 canal extra)
      premium: 199.00  // R$ 199 - Plano Premium (todos os canais)
    };
  }
  
  // Obter preços base
  getBasePrices() {
    return this.basePrices;
  }
  
  // Obter preços do parceiro
  async getPartnerPricing(userEmail) {
    try {
      console.log('🔍 PricingService.getPartnerPricing chamado para:', userEmail);
      
      // Primeiro buscar o partner_id pelo email do usuário - SEM .single()
      const { data: partners, error: partnerError } = await supabase
        .from('partners')
        .select('id, email, business_name, status')
        .eq('email', userEmail);
      
      console.log('📊 Resultado da busca parceiro (pricing):');
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
      console.log('🎯 Partner ID encontrado (pricing):', partnerId);
      
      const { data, error } = await supabase
        .from('partner_pricing')
        .select('*')
        .eq('partner_id', partnerId);
      
      if (error) {
        console.error('❌ Erro ao buscar preços no banco:', error);
        throw new Error('Erro ao buscar preços: ' + error.message);
      }
      
      console.log('📋 Preços encontrados:', data);
      
      // Se não tem preços configurados, retornar preços base
      if (!data || data.length === 0) {
        console.log('📋 Nenhum preço configurado, retornando preços base');
        return Object.entries(this.basePrices).map(([planCode, price]) => ({
          plan_code: planCode,
          partner_price: price,
          base_price: price,
          margin: 0,
          commission: price
        }));
      }
      
      return data;
    } catch (error) {
      console.error('❌ Erro em getPartnerPricing:', error);
      throw new Error('Erro ao buscar preços: ' + error.message);
    }
  }
  
  // Definir preço do parceiro
  async setPartnerPrice(userEmail, planCode, partnerPrice) {
    try {
      console.log('💾 PricingService.setPartnerPrice chamado para:', userEmail);
      console.log('📄 Dados recebidos - Plan:', planCode, 'Price:', partnerPrice);
      
      // Primeiro buscar o partner_id pelo email do usuário - SEM .single()
      const { data: partners, error: partnerError } = await supabase
        .from('partners')
        .select('id, email, business_name, status')
        .eq('email', userEmail);
      
      console.log('📊 Resultado da busca parceiro (set price):');
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
      console.log('🎯 Partner ID para set price:', partnerId);
      
      const basePrice = this.basePrices[planCode];
      
      if (!basePrice) {
        throw new Error('Plano inválido. Planos disponíveis: basic, pro, premium');
      }
      
      if (partnerPrice < basePrice) {
        throw new Error(`Preço não pode ser menor que R$ ${basePrice.toFixed(2)} (preço base)`);
      }
      
      const margin = partnerPrice - basePrice;
      const commission = basePrice + (margin * 0.10); // 10% da margem
      
      const pricingData = {
        partner_id: partnerId,
        plan_code: planCode,
        base_price: basePrice,
        partner_price: partnerPrice,
        updated_at: new Date().toISOString()
      };
      
      console.log('💾 Dados para salvar (pricing):', pricingData);
      
      const { data, error } = await supabase
        .from('partner_pricing')
        .upsert(pricingData, { onConflict: 'partner_id,plan_code' })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erro no Supabase (pricing):', error);
        throw new Error('Erro ao salvar preço: ' + error.message);
      }
      
      console.log('✅ Preço salvo:', data);
      return data;
    } catch (error) {
      console.error('❌ Erro em setPartnerPrice:', error);
      throw new Error('Erro ao salvar preço: ' + error.message);
    }
  }
  
  // Simular comissão
  simulateCommission(planCode, partnerPrice) {
    const originalPrice = this.basePrices[planCode];
    
    if (!originalPrice) {
      throw new Error('Plano inválido');
    }
    
    if (partnerPrice < originalPrice) {
      throw new Error(`Preço não pode ser menor que R$ ${originalPrice.toFixed(2)}`);
    }
    
    const margin = partnerPrice - originalPrice;
    const commission = originalPrice + (margin * 0.10);
    
    return {
      plan_code: planCode,
      original_price: originalPrice,
      partner_price: partnerPrice,
      margin: margin,
      margin_percentage: ((margin / originalPrice) * 100).toFixed(1) + '%',
      commission: commission,
      profit: commission - originalPrice
    };
  }
  
  // Calcular preço final para cliente
  async calculateFinalPrice(userEmail, planCode) {
    try {
      // Primeiro buscar o partner_id pelo email do usuário - SEM .single()
      const { data: partners, error: partnerError } = await supabase
        .from('partners')
        .select('id')
        .eq('email', userEmail);
      
      if (partnerError || !partners || partners.length === 0) {
        // Se não é parceiro, usar preço base
        return this.basePrices[planCode];
      }
      
      // Pegar o primeiro parceiro ativo
      const partner = partners.find(p => p.status === 'active') || partners[0];
      const partnerId = partner.id;
      
      const { data, error } = await supabase
        .from('partner_pricing')
        .select('partner_price')
        .eq('partner_id', partnerId)
        .eq('plan_code', planCode)
        .single();
      
      if (error || !data) {
        // Se não tem preço personalizado, usar preço base
        return this.basePrices[planCode];
      }
      
      return data.partner_price;
    } catch (error) {
      console.error('Erro ao calcular preço final:', error);
      return this.basePrices[planCode]; // Fallback para preço base
    }
  }
}

module.exports = new PricingService();