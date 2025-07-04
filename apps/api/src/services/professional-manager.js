const { supabase } = require('../config/supabase');
// Adicionar esta linha:
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class ProfessionalManager {
    // ===============================================
    // GESTÃO DE PROFISSIONAIS
    // ===============================================
    
    static async createProfessional(professionalData) {
        try {
            console.log('📝 Criando novo profissional:', professionalData.name);
            
            const { company_id } = professionalData;
            
            // Verificar limite do plano
            const { data: limitCheck, error: limitError } = await supabaseAdmin
                .rpc('check_professional_limit', { company_id_param: company_id });
            
            if (limitError) throw limitError;
            
            if (!limitCheck) {
                return {
                    success: false,
                    error: 'Limite de profissionais atingido para seu plano atual'
                };
            }
            
            // Criar profissional
            const { data: professional, error } = await supabase
                .from('professionals')
                .insert(professionalData)
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ Profissional criado:', professional.id);
            return {
                success: true,
                professional
            };
            
        } catch (error) {
            console.error('❌ Erro ao criar profissional:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    static async getProfessionalsByCompany(companyId) {
        try {
            console.log('🔍 DEBUG getProfessionalsByCompany - companyId recebido:', companyId);
            const { data: professionals, error } = await supabaseAdmin
                .from('professionals')
                .select('*')  // ✅ Query simples, sem JOINs problemáticos
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('display_order', { ascending: true });

            console.log('🔍 DEBUG - Query executada');
            console.log('🔍 DEBUG - Error:', error);
            console.log('🔍 DEBUG - Data:', professionals);
            console.log('🔍 DEBUG - Data length:', professionals?.length);
            
            if (error) throw error;
            
            return {
                success: true,
                professionals
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar profissionais:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    static async updateProfessional(professionalId, updateData) {
        try {
            const { data: professional, error } = await supabase
                .from('professionals')
                .update(updateData)
                .eq('id', professionalId)
                .select()
                .single();
            
            if (error) throw error;
            
            return {
                success: true,
                professional
            };
            
        } catch (error) {
            console.error('❌ Erro ao atualizar profissional:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // ===============================================
    // GESTÃO DE DISPONIBILIDADE
    // ===============================================
    
    static async setProfessionalAvailability(professionalId, availabilityData) {
        try {
            console.log('📅 Configurando disponibilidade para profissional:', professionalId);
            
            // Remover disponibilidade antiga (se existir)
            await supabase
                .from('professional_availability')
                .delete()
                .eq('professional_id', professionalId)
                .is('effective_until', null);
            
            // Inserir nova disponibilidade
            const availabilityRecords = availabilityData.map(day => ({
                professional_id: professionalId,
                ...day
            }));
            
            const { data: availability, error } = await supabase
                .from('professional_availability')
                .insert(availabilityRecords)
                .select();
            
            if (error) throw error;
            
            return {
                success: true,
                availability
            };
            
        } catch (error) {
            console.error('❌ Erro ao configurar disponibilidade:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    static async getProfessionalAvailability(professionalId, date = null) {
        try {
            let query = supabase
                .from('professional_availability')
                .select('*')
                .eq('professional_id', professionalId)
                .eq('is_available', true);
            
            if (date) {
                query = query
                    .or(`effective_from.is.null,effective_from.lte.${date}`)
                    .or(`effective_until.is.null,effective_until.gte.${date}`);
            }
            
            const { data: availability, error } = await query
                .order('day_of_week');
            
            if (error) throw error;
            
            return {
                success: true,
                availability
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar disponibilidade:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // ===============================================
    // PREFERÊNCIAS DE CLIENTES
    // ===============================================
    
    static async updateClientPreference(contactId, companyId, professionalId, appointmentData = {}) {
        try {
            console.log('💝 Atualizando preferência do cliente:', contactId);
            
            // Buscar preferência existente
            const { data: existingPref } = await supabase
                .from('client_preferences')
                .select('*')
                .eq('contact_id', contactId)
                .eq('company_id', companyId)
                .single();
            
            if (existingPref) {
                // Atualizar preferência existente
                const updateData = {
                    last_professional_id: professionalId,
                    appointment_count: existingPref.appointment_count + 1,
                    last_appointment_date: new Date().toISOString()
                };
                
                // Se é o mesmo profissional, aumentar força da preferência
                if (existingPref.preferred_professional_id === professionalId) {
                    updateData.preference_strength = Math.min(3, existingPref.preference_strength + 1);
                } else if (existingPref.appointment_count >= 2) {
                    // Se cliente teve 2+ atendimentos com outro profissional, mudar preferência
                    updateData.preferred_professional_id = professionalId;
                    updateData.preference_strength = 2;
                }
                
                const { data: preference, error } = await supabase
                    .from('client_preferences')
                    .update(updateData)
                    .eq('id', existingPref.id)
                    .select()
                    .single();
                
                return { success: true, preference };
                
            } else {
                // Criar nova preferência
                const { data: preference, error } = await supabase
                    .from('client_preferences')
                    .insert({
                        contact_id: contactId,
                        company_id: companyId,
                        preferred_professional_id: professionalId,
                        last_professional_id: professionalId,
                        preference_strength: 1,
                        appointment_count: 1,
                        last_appointment_date: new Date().toISOString()
                    })
                    .select()
                    .single();
                
                return { success: true, preference };
            }
            
        } catch (error) {
            console.error('❌ Erro ao atualizar preferência:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    static async getClientPreference(contactId, companyId) {
        try {
            const { data: preference, error } = await supabase
                .from('client_preferences')
                .select(`
                    *,
                    preferred_professional:professionals!client_preferences_preferred_professional_id_fkey(*),
                    last_professional:professionals!client_preferences_last_professional_id_fkey(*)
                `)
                .eq('contact_id', contactId)
                .eq('company_id', companyId)
                .single();
            
            return {
                success: true,
                preference: preference || null
            };
            
        } catch (error) {
            return {
                success: true,
                preference: null
            };
        }
    }
    
    // ===============================================
    // LÓGICA DE ATRIBUIÇÃO INTELIGENTE
    // ===============================================
    
    static async suggestBestProfessional(companyId, contactId, requestedDate, serviceId = null, specialtyNeeded = null) {
        try {
            console.log('🤖 Sugerindo melhor profissional para:', contactId);
            
            // Buscar profissionais da empresa
            const { data: professionals } = await supabase
                .from('professionals')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true);
            
            if (!professionals?.length) {
                return {
                    success: false,
                    error: 'Nenhum profissional disponível'
                };
            }
            
            // Buscar preferência do cliente
            const { preference } = await this.getClientPreference(contactId, companyId);
            
            let bestProfessional = null;
            let reason = '';
            
            // PRIORIDADE 1: Especialidade específica solicitada
            if (specialtyNeeded) {
                const specialist = professionals.find(p => 
                    p.specialty?.toLowerCase().includes(specialtyNeeded.toLowerCase())
                );
                if (specialist) {
                    bestProfessional = specialist;
                    reason = `Especialista em ${specialtyNeeded}`;
                }
            }
            
            // PRIORIDADE 2: Preferência forte do cliente (3+ atendimentos)
            if (!bestProfessional && preference?.preference_strength >= 3) {
                bestProfessional = professionals.find(p => p.id === preference.preferred_professional_id);
                if (bestProfessional) {
                    reason = `Cliente sempre atendido por ${bestProfessional.name}`;
                }
            }
            
            // PRIORIDADE 3: Último profissional que atendeu (se foi recente)
            if (!bestProfessional && preference?.last_professional_id) {
                const lastAppointment = new Date(preference.last_appointment_date);
                const daysSinceLastAppointment = (new Date() - lastAppointment) / (1000 * 60 * 60 * 24);
                
                if (daysSinceLastAppointment <= 30) { // Últimos 30 dias
                    bestProfessional = professionals.find(p => p.id === preference.last_professional_id);
                    if (bestProfessional) {
                        reason = `Continuidade com ${bestProfessional.name}`;
                    }
                }
            }
            
            // PRIORIDADE 4: Profissional com menor agenda (balanceamento)
            if (!bestProfessional) {
                // Contar agendamentos futuros de cada profissional
                const professionalsWithLoad = await Promise.all(
                    professionals.map(async (prof) => {
                        const { count } = await supabase
                            .from('appointments')
                            .select('*', { count: 'exact', head: true })
                            .eq('professional_id', prof.id)
                            .gte('scheduled_at', new Date().toISOString())
                            .eq('status', 'CONFIRMED');
                        
                        return { ...prof, appointmentLoad: count || 0 };
                    })
                );
                
                bestProfessional = professionalsWithLoad
                    .sort((a, b) => a.appointmentLoad - b.appointmentLoad)[0];
                reason = 'Balanceamento automático de agenda';
            }
            
            return {
                success: true,
                professional: bestProfessional,
                reason,
                preference
            };
            
        } catch (error) {
            console.error('❌ Erro ao sugerir profissional:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ProfessionalManager;