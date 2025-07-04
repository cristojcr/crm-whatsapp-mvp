const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const ProfessionalManager = require('../services/professional-manager');

// ===============================================
// GESTÃO DE PROFISSIONAIS - VERSÃO CORRIGIDA
// ===============================================

// GET /api/professionals - Listar profissionais da empresa
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 DEBUG COMPLETO:');
        console.log('  req.user:', JSON.stringify(req.user, null, 2));
        console.log('  req.user.id:', req.user.id);
        
        // ✅ CORREÇÃO: Buscar ou criar perfil automaticamente
        let profile = null;
        let company_id = null;
        
        // TENTATIVA 1: Buscar user_profile existente
        const { data: existingProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('company_id, role')
            .eq('user_id', req.user.id)
            .single();

        if (existingProfile) {
            console.log('✅ Perfil encontrado:', existingProfile);
            profile = existingProfile;
            company_id = existingProfile.company_id;
        } else {
            console.log('⚠️ Perfil não encontrado, tentando métodos alternativos...');
            
            // TENTATIVA 2: Buscar company_id na tabela users
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('company_id, id')
                .eq('id', req.user.id)
                .single();
                
            if (userData && userData.company_id) {
                console.log('✅ Company_id encontrado na tabela users:', userData.company_id);
                company_id = userData.company_id;
                
                // Criar perfil básico automaticamente
                const { data: newProfile } = await supabase
                    .from('user_profiles')
                    .insert({
                        user_id: req.user.id,
                        company_id: userData.company_id,
                        role: 'OWNER' // Default para primeiro usuário
                    })
                    .select()
                    .single();
                    
                if (newProfile) {
                    console.log('✅ Perfil criado automaticamente:', newProfile);
                    profile = newProfile;
                }
            } else {
                // TENTATIVA 3: Usar o user_id como company_id (usuário individual)
                console.log('⚠️ Usando user_id como company_id (usuário individual)');
                company_id = req.user.id;
                
                // Criar perfil individual
                const { data: individualProfile } = await supabase
                    .from('user_profiles')
                    .insert({
                        user_id: req.user.id,
                        company_id: req.user.id,
                        role: 'OWNER'
                    })
                    .select()
                    .single();
                    
                if (individualProfile) {
                    console.log('✅ Perfil individual criado:', individualProfile);
                    profile = individualProfile;
                }
            }
        }
        
        // ✅ VERIFICAÇÃO FINAL
        if (!company_id) {
            console.log('❌ Não foi possível determinar company_id');
            return res.status(500).json({
                error: 'Erro na configuração da conta',
                message: 'Entre em contato com o suporte'
            });
        }
        
        console.log('🎯 Company_id final:', company_id);
        
        // Buscar profissionais da empresa
        const result = await ProfessionalManager.getProfessionalsByCompany(company_id);
        
        if (!result.success) {
            return res.status(400).json({
                error: result.error
            });
        }
        
        res.json({
            data: result.professionals || [],
            total: result.professionals?.length || 0,
            company_id: company_id // Para debug
        });
        
    } catch (error) {
        console.error('❌ Erro ao listar profissionais:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

// POST /api/professionals - Criar novo profissional
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, email, phone, specialty, google_calendar_email, bio, hourly_rate } = req.body;
        
        // Validações obrigatórias
        if (!name || !email || !google_calendar_email) {
            return res.status(400).json({
                error: 'Nome, email e email do Google Calendar são obrigatórios'
            });
        }
        
        // ✅ CORREÇÃO: Mesmo sistema de busca de perfil
        let profile = null;
        let company_id = null;
        
        // Buscar perfil existente
        const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('company_id, role')
            .eq('user_id', req.user.id)
            .single();

        if (existingProfile) {
            profile = existingProfile;
            company_id = existingProfile.company_id;
        } else {
            // Fallback: usar user_id como company_id
            company_id = req.user.id;
            
            // Criar perfil se não existir
            const { data: newProfile } = await supabase
                .from('user_profiles')
                .insert({
                    user_id: req.user.id,
                    company_id: req.user.id,
                    role: 'OWNER'
                })
                .select()
                .single();
                
            profile = newProfile || { role: 'OWNER' };
        }
        
        // Verificar permissões (mais flexível)
        if (profile && !['OWNER', 'ADMIN', 'MANAGER'].includes(profile.role)) {
            return res.status(403).json({
                error: 'Sem permissão para criar profissionais'
            });
        }
        
        const professionalData = {
            company_id: company_id,
            name,
            email: email.toLowerCase(),
            phone,
            specialty,
            google_calendar_email: google_calendar_email.toLowerCase(),
            bio,
            hourly_rate: hourly_rate ? parseFloat(hourly_rate) : null
        };
        
        const result = await ProfessionalManager.createProfessional(professionalData);
        
        if (!result.success) {
            return res.status(400).json({
                error: result.error
            });
        }
        
        res.status(201).json({
            professional: result.professional,
            message: 'Profissional criado com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao criar profissional:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

// ✅ NOVA ROTA: Debug de usuário
router.get('/debug/user', authenticateToken, async (req, res) => {
    try {
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', req.user.id)
            .single();
            
        const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', req.user.id)
            .single();
            
        res.json({
            auth_user: req.user,
            user_profile: profile,
            user_data: userData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// GET /api/professionals/:id - Buscar profissional específico (mantido igual)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: professional, error } = await supabase
            .from('professionals')
            .select(`
                *,
                appointments(
                    id,
                    scheduled_at,
                    status,
                    contacts(name, phone)
                )
            `)
            .eq('id', id)
            .single();
        
        if (error || !professional) {
            return res.status(404).json({
                error: 'Profissional não encontrado'
            });
        }
        
        res.json(professional);
        
    } catch (error) {
        console.error('Erro ao buscar profissional:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});

// PUT /api/professionals/:id - Atualizar profissional
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, specialty, google_calendar_email, bio, hourly_rate } = req.body;
        
        console.log('✏️ ATUALIZANDO PROFISSIONAL:', { id, name, email });
        
        // Validações obrigatórias
        if (!name || !email || !google_calendar_email) {
            return res.status(400).json({
                error: 'Nome, email e email do Google Calendar são obrigatórios'
            });
        }
        
        // Buscar o profissional para verificar permissões
        const { data: existingProfessional, error: fetchError } = await supabase
            .from('professionals')
            .select('id, company_id, name')
            .eq('id', id)
            .single();
            
        if (fetchError || !existingProfessional) {
            console.log('❌ Profissional não encontrado:', id);
            return res.status(404).json({
                error: 'Profissional não encontrado'
            });
        }
        
        // Verificar company_id do usuário
        let company_id = null;
        const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('company_id, role')
            .eq('user_id', req.user.id)
            .single();
            
        if (userProfile) {
            company_id = userProfile.company_id;
        } else {
            company_id = req.user.id;
        }
        
        if (existingProfessional.company_id !== company_id) {
            return res.status(403).json({
                error: 'Sem permissão para editar este profissional'
            });
        }
        
        // Atualizar diretamente no Supabase (evita validações de limite)
        const updateData = {
            name,
            email: email.toLowerCase(),
            phone,
            specialty,
            google_calendar_email: google_calendar_email.toLowerCase(),
            bio,
            hourly_rate: hourly_rate ? parseFloat(hourly_rate) : null,
            updated_at: new Date().toISOString()
        };
        
        const { data: updatedProfessional, error: updateError } = await supabase
            .from('professionals')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
            
        if (updateError) {
            console.error('❌ Erro ao atualizar:', updateError);
            return res.status(400).json({
                error: 'Erro ao atualizar profissional',
                details: updateError.message
            });
        }
        
        console.log('✅ Profissional atualizado:', updatedProfessional.name);
        
        res.json({
            professional: updatedProfessional,
            message: 'Profissional atualizado com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

// DELETE /api/professionals/:id - Deletar profissional
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🗑️ DELETANDO PROFISSIONAL ID:', id);
        console.log('🔑 Usuário autenticado:', req.user.email);
        
        // Buscar o profissional para verificar permissões
        const { data: existingProfessional, error: fetchError } = await supabase
            .from('professionals')
            .select('id, company_id, name, email')
            .eq('id', id)
            .single();
            
        if (fetchError || !existingProfessional) {
            console.log('❌ Profissional não encontrado:', id);
            return res.status(404).json({
                error: 'Profissional não encontrado'
            });
        }
        
        console.log('📋 Profissional encontrado:', {
            id: existingProfessional.id,
            name: existingProfessional.name,
            company_id: existingProfessional.company_id
        });
        
        // Verificar company_id do usuário
        let company_id = null;
        const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('company_id, role')
            .eq('user_id', req.user.id)
            .single();
            
        if (userProfile) {
            company_id = userProfile.company_id;
            console.log('✅ Company_id do usuário (via profile):', company_id);
        } else {
            company_id = req.user.id;
            console.log('⚠️ Company_id do usuário (fallback):', company_id);
        }
        
        if (existingProfessional.company_id !== company_id) {
            console.log('❌ PERMISSÃO NEGADA:');
            console.log('  Profissional company_id:', existingProfessional.company_id);
            console.log('  Usuário company_id:', company_id);
            return res.status(403).json({
                error: 'Sem permissão para deletar este profissional'
            });
        }
        
        // Verificar agendamentos futuros
        const { data: futureAppointments } = await supabase
            .from('appointments')
            .select('id')
            .eq('professional_id', id)
            .gte('scheduled_at', new Date().toISOString())
            .limit(1);
            
        if (futureAppointments && futureAppointments.length > 0) {
            return res.status(400).json({
                error: 'Não é possível deletar profissional com agendamentos futuros',
                message: 'Cancele ou reassine os agendamentos primeiro'
            });
        }
        
        // Deletar profissional
        const { error: deleteError } = await supabase
            .from('professionals')
            .delete()
            .eq('id', id);
            
        if (deleteError) {
            console.error('❌ Erro ao deletar:', deleteError);
            return res.status(400).json({
                error: 'Erro ao deletar profissional',
                details: deleteError.message
            });
        }
        
        console.log('✅ Profissional deletado:', existingProfessional.name);
        
        res.json({
            message: 'Profissional removido com sucesso',
            deleted_professional: {
                id: existingProfessional.id,
                name: existingProfessional.name
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao deletar:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

module.exports = router;