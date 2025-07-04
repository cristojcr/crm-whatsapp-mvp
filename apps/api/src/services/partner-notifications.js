// apps/api/src/services/partner-notifications.js
const { supabase } = require('../config/supabase');

class PartnerNotificationService {
  // Notificar nova indicação
  async notifyNewReferral(partnerId, referralData) {
    try {
      // Buscar dados do parceiro
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('email, contact_person, email_notifications')
        .eq('id', partnerId)
        .single();

      if (partnerError || !partner.email_notifications) return;

      // Criar notificação no banco
      await supabase
        .from('partner_notifications')
        .insert({
          partner_id: partnerId,
          type: 'new_referral',
          title: 'Nova Indicação Recebida!',
          message: `Você indicou um novo cliente: ${referralData.client_email}`,
          data: referralData,
          read: false
        });

      console.log('Notificação de nova indicação criada para parceiro:', partnerId);

    } catch (error) {
      console.error('Erro ao notificar nova indicação:', error);
    }
  }

  // Notificar conversão
  async notifyConversion(partnerId, conversionData) {
    try {
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('email, contact_person, email_notifications')
        .eq('id', partnerId)
        .single();

      if (partnerError || !partner.email_notifications) return;

      // Criar notificação no banco
      await supabase
        .from('partner_notifications')
        .insert({
          partner_id: partnerId,
          type: 'conversion',
          title: 'Conversão Realizada! 💰',
          message: `Cliente ${conversionData.client_email} converteu! Comissão: R$ ${conversionData.commission_amount}`,
          data: conversionData,
          read: false
        });

      console.log('Notificação de conversão criada para parceiro:', partnerId);

    } catch (error) {
      console.error('Erro ao notificar conversão:', error);
    }
  }

  // Notificar pagamento processado
  async notifyPaymentProcessed(partnerId, paymentData) {
    try {
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('email, contact_person, email_notifications')
        .eq('id', partnerId)
        .single();

      if (partnerError || !partner.email_notifications) return;

      // Criar notificação no banco
      await supabase
        .from('partner_notifications')
        .insert({
          partner_id: partnerId,
          type: 'payment_processed',
          title: 'Pagamento Processado! 🏦',
          message: `Comissão de R$ ${paymentData.amount} foi processada e estará disponível em 2-3 dias úteis`,
          data: paymentData,
          read: false
        });

      console.log('Notificação de pagamento criada para parceiro:', partnerId);

    } catch (error) {
      console.error('Erro ao notificar pagamento:', error);
    }
  }

  // Buscar notificações do parceiro
  async getNotifications(partnerId, limit = 20, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('partner_notifications')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return [];
    }
  }

  // Marcar notificação como lida
  async markAsRead(notificationId, partnerId) {
    try {
      const { error } = await supabase
        .from('partner_notifications')
        .update({ read: true, read_at: new Date() })
        .eq('id', notificationId)
        .eq('partner_id', partnerId);

      return !error;
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
      return false;
    }
  }

  // Marcar todas como lidas
  async markAllAsRead(partnerId) {
    try {
      const { error } = await supabase
        .from('partner_notifications')
        .update({ read: true, read_at: new Date() })
        .eq('partner_id', partnerId)
        .eq('read', false);

      return !error;
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      return false;
    }
  }

  // Contar notificações não lidas
  async getUnreadCount(partnerId) {
    try {
      const { count, error } = await supabase
        .from('partner_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Erro ao contar não lidas:', error);
      return 0;
    }
  }
}

module.exports = new PartnerNotificationService();