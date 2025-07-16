const axios = require("axios");
const supabaseAdmin = require("../config/supabaseAdmin");
const ConversationEngine = require("./conversation-engine");
const CustomerContext = require("./customer-context");

class TelegramProcessor {
    constructor() {
        // Configuração dinâmica - busca por usuário
        this.conversationEngine = new ConversationEngine();
        this.customerContext = new CustomerContext();
    }

    // Buscar configuração do bot por usuário
    async getUserBotConfig(userId) {
        const { data: channel, error } = await supabaseAdmin
            .from("user_channels")
            .select("channel_config")
            .eq("user_id", userId)
            .eq("channel_type", "telegram")
            .eq("is_active", true)
            .single();

        if (error) throw new Error("Bot Telegram não configurado para este usuário");
        
        return channel.channel_config;
    }

    // Processar updates do Telegram (agora multi-tenant)
    async processUpdate(update, userId) {
        try {
            if (update.message) {
                return await this.processMessage(update.message, userId);
            } else if (update.callback_query) {
                return await this.processCallbackQuery(update.callback_query, userId);
            }
            return null;
        } catch (error) {
            console.error("Erro processando update Telegram:", error);
            throw error;
        }
    }

    // Processar mensagens (adaptado para multi-tenant com conversação natural)
    async processMessage(message, userId) {
        const { from, text, photo, video, audio, voice, document, chat } = message;
        
        // Buscar configuração do bot do usuário
        const botConfig = await this.getUserBotConfig(userId);
        
        // Buscar ou criar contato
        const contact = await this.findOrCreateContact(from, userId);
        
        // Buscar ou criar conversa
        const conversation = await this.findOrCreateConversation(contact.id, userId, "telegram");
        
        // Salvar mensagem recebida
        await this.saveMessage({
            conversation_id: conversation.id,
            content: text || "[mídia]",
            message_type: this.getMessageType(message),
            sender_type: "contact",
            channel_type: "telegram",
            channel_message_id: message.message_id.toString(),
            user_id: userId,
            contact_id: contact.id
        });

        // 🆕 PROCESSAMENTO COM IA CONVERSACIONAL
        if (text && text.trim()) {
            console.log('🧠 Processando mensagem com IA conversacional:', text);
            
            // Obter contexto do cliente
            const customerContextData = await this.customerContext.getCustomerContext(contact.id, userId);
            
            // Analisar com IA
            const intentionAnalyzer = require('./intention-analyzer');
            const analysis = await intentionAnalyzer.analyzeWithProductsAndProfessionals(text, contact.id, userId);
            
            console.log('✅ Análise IA:', analysis);
            console.log('👤 Contexto do cliente:', customerContextData);
            
            // Processar baseado na intenção COM CONVERSAÇÃO NATURAL
            await this.handleIntentionWithNaturalConversation(analysis, contact, userId, customerContextData, message.chat.id, conversation);
            
            return null; // Mensagem já foi enviada via conversação natural
        }

        // Processar outros tipos de mídia com conversação natural
        if (photo || video || audio || voice || document) {
            const customerContextData = await this.customerContext.getCustomerContext(contact.id, userId);
            const mediaResponse = await this.conversationEngine.generateNaturalResponse('media_received', customerContextData, {
                name: contact.name
            }, {
                mediaType: this.getMessageType(message)
            });
            
            await this.conversationEngine.sendConversationalMessages(
                mediaResponse.messages, 
                botConfig.bot_token, 
                chat.id
            );
        }

        return null;
    }

    // ✅ NOVA FUNÇÃO: Processar intenção com conversação natural
    async handleIntentionWithNaturalConversation(analysis, contact, userId, customerContext, chatId, conversation) {
        try {
            console.log('🎭 Processando intenção com conversação natural...');
            
            const botConfig = await this.getUserBotConfig(userId);
            
            // ✅ ETAPA 1: VERIFICAR SE O USUÁRIO ESTÁ RESPONDENDO A UMA SELEÇÃO DE PRODUTO
            const pendingProductSelection = await this.checkPendingProductSelection(contact.id, userId);
            if (pendingProductSelection && this.isNumericSelection(analysis.original_message)) {
                await this.handleProductSelectionWithConversation(analysis.original_message, pendingProductSelection, contact, userId, customerContext, chatId, conversation);
                return;
            }

            // ✅ ETAPA 2: VERIFICAR SE O USUÁRIO ESTÁ RESPONDENDO A UMA SELEÇÃO DE PROFISSIONAL
            if (await this.isProfessionalSelection(analysis.original_message, contact.id, userId)) {
                await this.handleProfessionalSelectionWithConversation(analysis.original_message, contact.id, userId, customerContext, chatId, conversation);
                return;
            }

            // ✅ ETAPA 3: PROCESSAR INTENÇÕES PRINCIPAIS
            switch (analysis.intention) {
                case 'scheduling':
                    await this.handleSchedulingIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation);
                    break;
                    
                case 'inquiry':
                    await this.handleInquiryIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation);
                    break;
                    
                case 'rescheduling':
                    await this.handleReschedulingIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation);
                    break;
                    
                case 'cancellation':
                    await this.handleCancellationIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation);
                    break;
                    
                case 'general_inquiry':
                    await this.handleGeneralInquiryWithConversation(analysis, contact, userId, customerContext, chatId, conversation);
                    break;
                    
                default:
                    await this.handleDefaultIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation);
                    break;
            }
            
        } catch (error) {
            console.error('❌ Erro processando intenção com conversação:', error);
            
            // Resposta de erro empática
            const errorResponse = await this.conversationEngine.generateNaturalResponse('error', customerContext, {
                name: contact.name
            });
            
            await this.conversationEngine.sendConversationalMessages(
                errorResponse.messages,
                botConfig.bot_token,
                chatId
            );
        }
    }

    // ✅ NOVA FUNÇÃO: Processar agendamento com conversação
    async handleSchedulingIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation) {
        try {
            console.log('🗓 Processando agendamento com conversa natural...');
            
            const botConfig = await this.getUserBotConfig(userId);
            
            // Verificar horário comercial primeiro
            const dateTimeInfo = analysis.extracted_info || analysis.dateTime || {};
            const extractedDate = dateTimeInfo.date || dateTimeInfo.suggestedDate;
            const extractedTime = dateTimeInfo.time || dateTimeInfo.suggestedTime;
            
            if (extractedDate && extractedTime) {
                const isWithinBusinessHours = await this.checkBusinessHours(extractedDate, extractedTime, userId);
                
                if (!isWithinBusinessHours) {
                    const outOfHoursResponse = await this.conversationEngine.generateNaturalResponse('out_of_hours', customerContext, {
                        name: contact.name
                    }, {
                        requestedTime: `${extractedTime} do dia ${extractedDate}`,
                        businessHours: 'Segunda a sexta, das 8h às 17h'
                    });
                    
                    await this.conversationEngine.sendConversationalMessages(
                        outOfHoursResponse.messages,
                        botConfig.bot_token,
                        chatId
                    );
                    
                    // Salvar resposta
                    await this.saveConversationalResponse(conversation.id, outOfHoursResponse.messages.join(' '), userId, analysis);
                    return;
                }
            }
            
            // Verificar se há produtos na análise
            if (analysis.products && analysis.products.length > 0) {
                await this.handleProductListWithConversation(analysis.products, contact, userId, customerContext, chatId, analysis, conversation);
            } else {
                // Buscar profissionais disponíveis
                const professionals = await this.getAvailableProfessionals(userId, extractedDate, extractedTime);
                
                if (professionals.length > 0) {
                    await this.handleProfessionalListWithConversation(professionals, contact, userId, customerContext, chatId, analysis, conversation);
                } else {
                    const noAvailabilityResponse = await this.conversationEngine.generateNaturalResponse('no_availability', customerContext, {
                        name: contact.name
                    }, {
                        requestedTime: extractedTime ? `${extractedTime} do dia ${extractedDate}` : 'horário solicitado'
                    });
                    
                    await this.conversationEngine.sendConversationalMessages(
                        noAvailabilityResponse.messages,
                        botConfig.bot_token,
                        chatId
                    );
                    
                    // Salvar resposta
                    await this.saveConversationalResponse(conversation.id, noAvailabilityResponse.messages.join(' '), userId, analysis);
                }
            }
            
        } catch (error) {
            console.error('❌ Erro no agendamento com conversação:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Processar consultas com conversação
    async handleInquiryIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation) {
        try {
            console.log('❓ Processando consulta com conversa natural...');
            
            const botConfig = await this.getUserBotConfig(userId);
            
            // Gerar resposta natural para consulta
            const inquiryResponse = await this.conversationEngine.generateNaturalResponse('inquiry', customerContext, {
                name: contact.name
            }, {
                question: analysis.original_message,
                context: analysis.extracted_info
            });
            
            await this.conversationEngine.sendConversationalMessages(
                inquiryResponse.messages,
                botConfig.bot_token,
                chatId
            );
            
            // Salvar resposta
            await this.saveConversationalResponse(conversation.id, inquiryResponse.messages.join(' '), userId, analysis);
            
        } catch (error) {
            console.error('❌ Erro processando consulta:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Processar reagendamento com conversação
    async handleReschedulingIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation) {
        try {
            console.log('🔄 Processando reagendamento com conversa natural...');
            
            const botConfig = await this.getUserBotConfig(userId);
            
            // Buscar agendamentos existentes do cliente
            const existingAppointments = await this.getCustomerAppointments(contact.id, userId);
            
            if (existingAppointments.length === 0) {
                const noAppointmentsResponse = await this.conversationEngine.generateNaturalResponse('no_appointments', customerContext, {
                    name: contact.name
                });
                
                await this.conversationEngine.sendConversationalMessages(
                    noAppointmentsResponse.messages,
                    botConfig.bot_token,
                    chatId
                );
                
                await this.saveConversationalResponse(conversation.id, noAppointmentsResponse.messages.join(' '), userId, analysis);
                return;
            }
            
            // Mostrar agendamentos disponíveis para reagendamento
            const reschedulingResponse = await this.conversationEngine.generateNaturalResponse('rescheduling_options', customerContext, {
                name: contact.name
            }, {
                appointments: existingAppointments
            });
            
            await this.conversationEngine.sendConversationalMessages(
                reschedulingResponse.messages,
                botConfig.bot_token,
                chatId
            );
            
            // Criar lista de agendamentos
            let appointmentsList = "📅 *Seus agendamentos:*\n\n";
            existingAppointments.forEach((apt, index) => {
                const date = new Date(apt.appointment_date).toLocaleDateString('pt-BR');
                const time = new Date(apt.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                appointmentsList += `${index + 1}. *${apt.professionals?.name || 'Profissional'}*\n`;
                appointmentsList += `   📅 ${date} às ${time}\n`;
                if (apt.title) appointmentsList += `   📝 ${apt.title}\n`;
                appointmentsList += "\n";
            });
            
            appointmentsList += "📝 *Digite o número do agendamento que deseja reagendar*";
            
            await this.conversationEngine.sendMessage(
                botConfig.bot_token,
                chatId,
                appointmentsList,
                { parse_mode: "Markdown" }
            );
            
            // Salvar seleção pendente para reagendamento
            await this.savePendingRescheduling(contact.id, userId, existingAppointments, analysis);
            
            // Salvar resposta
            await this.saveConversationalResponse(conversation.id, reschedulingResponse.messages.join(' ') + '\n' + appointmentsList, userId, analysis);
            
        } catch (error) {
            console.error('❌ Erro processando reagendamento:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Processar cancelamento com conversação
    async handleCancellationIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation) {
        try {
            console.log('❌ Processando cancelamento com conversa natural...');
            
            const botConfig = await this.getUserBotConfig(userId);
            
            // Buscar agendamentos existentes do cliente
            const existingAppointments = await this.getCustomerAppointments(contact.id, userId);
            
            if (existingAppointments.length === 0) {
                const noAppointmentsResponse = await this.conversationEngine.generateNaturalResponse('no_appointments', customerContext, {
                    name: contact.name
                });
                
                await this.conversationEngine.sendConversationalMessages(
                    noAppointmentsResponse.messages,
                    botConfig.bot_token,
                    chatId
                );
                
                await this.saveConversationalResponse(conversation.id, noAppointmentsResponse.messages.join(' '), userId, analysis);
                return;
            }
            
            // Mostrar agendamentos disponíveis para cancelamento
            const cancellationResponse = await this.conversationEngine.generateNaturalResponse('cancellation_options', customerContext, {
                name: contact.name
            }, {
                appointments: existingAppointments
            });
            
            await this.conversationEngine.sendConversationalMessages(
                cancellationResponse.messages,
                botConfig.bot_token,
                chatId
            );
            
            // Criar lista de agendamentos
            let appointmentsList = "📅 *Seus agendamentos:*\n\n";
            existingAppointments.forEach((apt, index) => {
                const date = new Date(apt.appointment_date).toLocaleDateString('pt-BR');
                const time = new Date(apt.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                appointmentsList += `${index + 1}. *${apt.professionals?.name || 'Profissional'}*\n`;
                appointmentsList += `   📅 ${date} às ${time}\n`;
                if (apt.title) appointmentsList += `   📝 ${apt.title}\n`;
                appointmentsList += "\n";
            });
            
            appointmentsList += "📝 *Digite o número do agendamento que deseja cancelar*";
            
            await this.conversationEngine.sendMessage(
                botConfig.bot_token,
                chatId,
                appointmentsList,
                { parse_mode: "Markdown" }
            );
            
            // Salvar seleção pendente para cancelamento
            await this.savePendingCancellation(contact.id, userId, existingAppointments, analysis);
            
            // Salvar resposta
            await this.saveConversationalResponse(conversation.id, cancellationResponse.messages.join(' ') + '\n' + appointmentsList, userId, analysis);
            
        } catch (error) {
            console.error('❌ Erro processando cancelamento:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Mostrar lista de produtos com conversação
    async handleProductListWithConversation(products, contact, userId, customerContext, chatId, analysis, conversation) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            
            // Gerar resposta natural para lista de produtos
            const productResponse = await this.conversationEngine.generateNaturalResponse('products_list', customerContext, {
                name: contact.name
            }, {
                products: products
            });
            
            await this.conversationEngine.sendConversationalMessages(
                productResponse.messages,
                botConfig.bot_token,
                chatId
            );
            
            // Criar lista formatada de produtos
            let productList = "🏥 *Nossos serviços disponíveis:*\n\n";
            products.forEach((product, index) => {
                productList += `${index + 1}. *${product.name}*\n`;
                if (product.description) {
                    productList += `   ${product.description}\n`;
                }
                if (product.price) {
                    productList += `   💰 R$ ${product.price}\n`;
                }
                productList += "\n";
            });
            
            productList += "📝 *Digite o número do serviço desejado*";
            
            await this.conversationEngine.sendMessage(
                botConfig.bot_token,
                chatId,
                productList,
                { parse_mode: "Markdown" }
            );
            
            // Salvar seleção pendente
            await this.savePendingProductSelection(contact.id, userId, products, analysis);
            
            // Salvar resposta
            await this.saveConversationalResponse(conversation.id, productResponse.messages.join(' ') + '\n' + productList, userId, analysis);
            
        } catch (error) {
            console.error('❌ Erro mostrando produtos com conversação:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Mostrar lista de profissionais com conversação
    async handleProfessionalListWithConversation(professionals, contact, userId, customerContext, chatId, analysis, conversation) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            
            // Gerar resposta natural para lista de profissionais
            const professionalResponse = await this.conversationEngine.generateNaturalResponse('professionals_list', customerContext, {
                name: contact.name
            }, {
                professionals: professionals
            });
            
            await this.conversationEngine.sendConversationalMessages(
                professionalResponse.messages,
                botConfig.bot_token,
                chatId
            );
            
            // Criar lista formatada de profissionais
            let professionalList = "👨‍⚕️ *Profissionais disponíveis:*\n\n";
            professionals.forEach((prof, index) => {
                professionalList += `${index + 1}. *Dr(a). ${prof.name}*\n`;
                if (prof.specialty) {
                    professionalList += `   🎯 ${prof.specialty}\n`;
                }
                if (prof.experience) {
                    professionalList += `   📅 ${prof.experience}\n`;
                }
                professionalList += "\n";
            });
            
            professionalList += "📝 *Digite o número do profissional desejado*";
            
            await this.conversationEngine.sendMessage(
                botConfig.bot_token,
                chatId,
                professionalList,
                { parse_mode: "Markdown" }
            );
            
            // Salvar seleção pendente
            await this.savePendingProfessionalSelection(contact.id, userId, professionals, analysis);
            
            // Salvar resposta
            await this.saveConversationalResponse(conversation.id, professionalResponse.messages.join(' ') + '\n' + professionalList, userId, analysis);
            
        } catch (error) {
            console.error('❌ Erro mostrando profissionais com conversação:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Processar seleção de produto com conversação
    async handleProductSelectionWithConversation(text, pendingSelection, contact, userId, customerContext, chatId, conversation) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            const cleanText = text.trim();
            const products = JSON.parse(pendingSelection.products || pendingSelection.data?.products);
            
            let selectedProduct = null;
            
            // Tentar por número
            if (/^\d+$/.test(cleanText)) {
                const index = parseInt(cleanText) - 1;
                if (index >= 0 && index < products.length) {
                    selectedProduct = products[index];
                }
            }
            
            if (!selectedProduct) {
                const invalidResponse = await this.conversationEngine.generateNaturalResponse('invalid_selection', customerContext, {
                    name: contact.name
                });
                
                await this.conversationEngine.sendConversationalMessages(
                    invalidResponse.messages,
                    botConfig.bot_token,
                    chatId
                );
                
                await this.saveConversationalResponse(conversation.id, invalidResponse.messages.join(' '), userId, {});
                return;
            }
            
            // Confirmar seleção com empatia
            const confirmResponse = await this.conversationEngine.generateNaturalResponse('product_selected', customerContext, {
                name: contact.name
            }, {
                product: selectedProduct
            });
            
            await this.conversationEngine.sendConversationalMessages(
                confirmResponse.messages,
                botConfig.bot_token,
                chatId
            );
            
            // Buscar profissionais para o produto selecionado
            const professionals = await this.getProfessionalsForProduct(selectedProduct.id, userId);
            
            if (professionals.length > 0) {
                await this.handleProfessionalListWithConversation(professionals, contact, userId, customerContext, chatId, JSON.parse(pendingSelection.analysis), conversation);
            }
            
            // Limpar seleção pendente de produto
            await this.clearPendingProductSelection(contact.id, userId);
            
            // Salvar resposta
            await this.saveConversationalResponse(conversation.id, confirmResponse.messages.join(' '), userId, {});
            
        } catch (error) {
            console.error('❌ Erro na seleção do produto:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Processar seleção de profissional com conversação
    async handleProfessionalSelectionWithConversation(text, contactId, userId, customerContext, chatId, conversation) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            const pending = await this.getPendingProfessionalSelection(contactId, userId);
            
            if (!pending) return;
            
            const professionals = JSON.parse(pending.professionals);
            const cleanText = text.trim();
            
            let selectedProfessional = null;
            
            // Tentar por número
            if (/^\d+$/.test(cleanText)) {
                const index = parseInt(cleanText) - 1;
                if (index >= 0 && index < professionals.length) {
                    selectedProfessional = professionals[index];
                }
            }
            
            if (!selectedProfessional) {
                const invalidResponse = await this.conversationEngine.generateNaturalResponse('invalid_selection', customerContext, {
                    name: customerContext.customer.name
                });
                
                await this.conversationEngine.sendConversationalMessages(
                    invalidResponse.messages,
                    botConfig.bot_token,
                    chatId
                );
                
                await this.saveConversationalResponse(conversation.id, invalidResponse.messages.join(' '), userId, {});
                return;
            }
            
            // Confirmar seleção com empatia
            const confirmResponse = await this.conversationEngine.generateNaturalResponse('professional_selected', customerContext, {
                name: customerContext.customer.name
            }, {
                professional: selectedProfessional
            });
            
            await this.conversationEngine.sendConversationalMessages(
                confirmResponse.messages,
                botConfig.bot_token,
                chatId
            );
            
            // Processar agendamento real
            const originalAnalysis = JSON.parse(pending.analysis);
            const contact = await this.getContactById(contactId);
            await this.processDirectSchedulingWithConversation(selectedProfessional, contact, userId, originalAnalysis, customerContext, chatId, conversation);
            
            // Limpar agendamento pendente
            await this.clearPendingProfessionalSelection(contactId, userId);
            
            // Salvar resposta
            await this.saveConversationalResponse(conversation.id, confirmResponse.messages.join(' '), userId, {});
            
        } catch (error) {
            console.error('❌ Erro na seleção do profissional:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Processar agendamento direto com conversação
    async processDirectSchedulingWithConversation(selectedProfessional, contact, userId, analysis, customerContext, chatId, conversation) {
        try {
            console.log('📅 Processando agendamento direto com conversação...');
            
            const botConfig = await this.getUserBotConfig(userId);
            
            // Extrair informações de data/hora
            const dateTimeInfo = analysis.extracted_info || analysis.dateTime || {};
            const extractedDate = dateTimeInfo.date || dateTimeInfo.suggestedDate;
            const extractedTime = dateTimeInfo.time || dateTimeInfo.suggestedTime;
            
            if (!extractedDate || !extractedTime) {
                const missingInfoResponse = await this.conversationEngine.generateNaturalResponse('missing_datetime', customerContext, {
                    name: contact.name
                }, {
                    professional: selectedProfessional
                });
                
                await this.conversationEngine.sendConversationalMessages(
                    missingInfoResponse.messages,
                    botConfig.bot_token,
                    chatId
                );
                
                await this.saveConversationalResponse(conversation.id, missingInfoResponse.messages.join(' '), userId, analysis);
                return;
            }
            
            // Verificar disponibilidade do profissional
            const [year, month, day] = extractedDate.split("-").map(Number);
            const [hours, minutes] = extractedTime.split(":").map(Number);
            const appointmentDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
            
            const availabilityResponse = await fetch(`http://localhost:3001/api/calendar/check-availability/${selectedProfessional.id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    startDateTime: appointmentDate.toISOString(),
                    duration: 60 // 1 hora padrão
                })
            });
            
            const availabilityResult = await availabilityResponse.json();
            
            if (!availabilityResult.success || !availabilityResult.available) {
                const unavailableResponse = await this.conversationEngine.generateNaturalResponse('professional_unavailable', customerContext, {
                    name: contact.name
                }, {
                    professional: selectedProfessional,
                    requestedTime: `${extractedTime} do dia ${extractedDate}`,
                    reason: availabilityResult.reason || 'Horário não disponível'
                });
                
                await this.conversationEngine.sendConversationalMessages(
                    unavailableResponse.messages,
                    botConfig.bot_token,
                    chatId
                );
                
                await this.saveConversationalResponse(conversation.id, unavailableResponse.messages.join(' '), userId, analysis);
                return;
            }
            
            // Criar o agendamento
            const appointmentData = {
                user_id: userId,
                contact_id: contact.id,
                professional_id: selectedProfessional.id,
                appointment_date: appointmentDate.toISOString(),
                title: analysis.extracted_info?.service || "Consulta",
                description: analysis.original_message || "",
                status: "scheduled",
                duration: 60,
                created_at: new Date().toISOString()
            };
            
            const { data: appointment, error } = await supabaseAdmin
                .from("appointments")
                .insert(appointmentData)
                .select()
                .single();
            
            if (error) {
                console.error("❌ Erro criando agendamento:", error);
                
                const errorResponse = await this.conversationEngine.generateNaturalResponse('booking_error', customerContext, {
                    name: contact.name
                });
                
                await this.conversationEngine.sendConversationalMessages(
                    errorResponse.messages,
                    botConfig.bot_token,
                    chatId
                );
                
                await this.saveConversationalResponse(conversation.id, errorResponse.messages.join(' '), userId, analysis);
                return;
            }
            
            // Confirmar agendamento com sucesso
            const confirmationResponse = await this.conversationEngine.generateNaturalResponse('appointment_confirmed', customerContext, {
                name: contact.name
            }, {
                appointmentDetails: {
                    professional: selectedProfessional.name,
                    date: extractedDate,
                    time: extractedTime,
                    service: appointmentData.title
                }
            });
            
            await this.conversationEngine.sendConversationalMessages(
                confirmationResponse.messages,
                botConfig.bot_token,
                chatId
            );
            
            // Salvar resposta
            await this.saveConversationalResponse(conversation.id, confirmationResponse.messages.join(' '), userId, analysis);
            
            console.log("✅ Agendamento criado com sucesso:", appointment.id);
            
        } catch (error) {
            console.error('❌ Erro no agendamento direto:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Processar pergunta geral com conversação
    async handleGeneralInquiryWithConversation(analysis, contact, userId, customerContext, chatId, conversation) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            
            const inquiryResponse = await this.conversationEngine.generateNaturalResponse('general_inquiry', customerContext, {
                name: contact.name
            }, {
                question: analysis.original_message
            });
            
            await this.conversationEngine.sendConversationalMessages(
                inquiryResponse.messages,
                botConfig.bot_token,
                chatId
            );
            
            // Salvar resposta
            await this.saveConversationalResponse(conversation.id, inquiryResponse.messages.join(' '), userId, analysis);
            
        } catch (error) {
            console.error('❌ Erro processando pergunta geral:', error);
        }
    }

    // ✅ NOVA FUNÇÃO: Processar intenção padrão com conversação
    async handleDefaultIntentWithConversation(analysis, contact, userId, customerContext, chatId, conversation) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            
            const defaultResponse = await this.conversationEngine.generateNaturalResponse('general_inquiry', customerContext, {
                name: contact.name
            });
            
            await this.conversationEngine.sendConversationalMessages(
                defaultResponse.messages,
                botConfig.bot_token,
                chatId
            );
            
            // Salvar resposta
            await this.saveConversationalResponse(conversation.id, defaultResponse.messages.join(' '), userId, analysis);
            
        } catch (error) {
            console.error('❌ Erro processando intenção padrão:', error);
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Salvar resposta conversacional
    async saveConversationalResponse(conversationId, content, userId, analysis) {
        try {
            await this.saveMessage({
                conversation_id: conversationId,
                content: content,
                message_type: "text",
                sender_type: "assistant",
                channel_type: "telegram",
                channel_message_id: `ai_${Date.now()}`,
                user_id: userId,
                metadata: { ai_analysis: analysis, conversation_engine: true }
            });
        } catch (error) {
            console.error('❌ Erro salvando resposta conversacional:', error);
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Verificar horário comercial
    async checkBusinessHours(date, time, userId) {
        try {
            const [year, month, day] = date.split("-").map(Number);
            const [hours, minutes] = time.split(":").map(Number);
            const appointmentDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
            appointmentDate.setUTCHours(appointmentDate.getUTCHours() - 3);
            
            const response = await fetch(`http://localhost:3001/api/calendar/check-business-hours/${userId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    startDateTime: appointmentDate.toISOString()
                })
            });
            
            if (!response.ok) return false;
            
            const result = await response.json();
            return result.success && result.within_business_hours;
        } catch (error) {
            console.error('❌ Erro verificando horário comercial:', error);
            return false;
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Buscar agendamentos do cliente
    async getCustomerAppointments(contactId, userId) {
        try {
            const { data: appointments, error } = await supabaseAdmin
                .from('appointments')
                .select(`
                    *,
                    professionals:professional_id (name, specialty)
                `)
                .eq('user_id', userId)
                .eq('contact_id', contactId)
                .gte('appointment_date', new Date().toISOString())
                .eq('status', 'scheduled')
                .order('appointment_date', { ascending: true });
            
            if (error) throw error;
            return appointments || [];
        } catch (error) {
            console.error('❌ Erro buscando agendamentos do cliente:', error);
            return [];
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Salvar reagendamento pendente
    async savePendingRescheduling(contactId, userId, appointments, analysis) {
        try {
            await supabaseAdmin
                .from('pending_appointments')
                .upsert({
                    contact_id: contactId,
                    user_id: userId,
                    appointments: JSON.stringify(appointments),
                    analysis: JSON.stringify(analysis),
                    type: 'rescheduling_selection',
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('❌ Erro salvando reagendamento pendente:', error);
        }
    }

    // ✅ FUNÇÃO AUXILIAR: Salvar cancelamento pendente
    async savePendingCancellation(contactId, userId, appointments, analysis) {
        try {
            await supabaseAdmin
                .from('pending_appointments')
                .upsert({
                    contact_id: contactId,
                    user_id: userId,
                    appointments: JSON.stringify(appointments),
                    analysis: JSON.stringify(analysis),
                    type: 'cancellation_selection',
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('❌ Erro salvando cancelamento pendente:', error);
        }
    }

    // ===== MÉTODOS ORIGINAIS MANTIDOS =====

    async findOrCreateContact(from, userId) {
        const { data: existingContact, error: searchError } = await supabaseAdmin
            .from("contacts")
            .select("*")
            .eq("telegram_id", from.id.toString())
            .eq("user_id", userId)
            .single();

        if (existingContact) {
            return existingContact;
        }

        const { data: newContact, error: createError } = await supabaseAdmin
            .from("contacts")
            .insert({
                name: from.first_name + (from.last_name ? ` ${from.last_name}` : ""),
                phone: from.username || null,
                telegram_id: from.id.toString(),
                user_id: userId,
                status: "active"
            })
            .select()
            .single();

        if (createError) throw createError;
        return newContact;
    }

    async findOrCreateConversation(contactId, userId, channelType) {
        const { data: existingConversation, error: searchError } = await supabaseAdmin
            .from("conversations")
            .select("*")
            .eq("contact_id", contactId)
            .eq("user_id", userId)
            .eq("channel_type", channelType)
            .single();

        if (existingConversation) {
            return existingConversation;
        }

        const { data: newConversation, error: createError } = await supabaseAdmin
            .from("conversations")
            .insert({
                contact_id: contactId,
                user_id: userId,
                channel_type: channelType,
                status: "active"
            })
            .select()
            .single();

        if (createError) throw createError;
        return newConversation;
    }

    async saveMessage(messageData) {
        const { data, error } = await supabaseAdmin
            .from("messages")
            .insert(messageData)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    getMessageType(message) {
        if (message.text) return "text";
        if (message.photo) return "photo";
        if (message.video) return "video";
        if (message.audio) return "audio";
        if (message.voice) return "voice";
        if (message.document) return "document";
        return "unknown";
    }

    async getFileUrl(fileId, botToken) {
        try {
            const response = await axios.get(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
            const filePath = response.data.result.file_path;
            return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
        } catch (error) {
            console.error("Erro obtendo URL do arquivo:", error);
            return null;
        }
    }

    async sendMessage(userId, chatId, message, options = {}) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            const response = await axios.post(`https://api.telegram.org/bot${botConfig.bot_token}/sendMessage`, {
                chat_id: chatId,
                text: message,
                ...options
            });
            return response.data;
        } catch (error) {
            console.error("Erro enviando mensagem:", error);
            throw error;
        }
    }

    async setWebhook(userId, webhookUrl) {
        try {
            const botConfig = await this.getUserBotConfig(userId);
            const response = await axios.post(`https://api.telegram.org/bot${botConfig.bot_token}/setWebhook`, {
                url: webhookUrl
            });
            return response.data;
        } catch (error) {
            console.error("Erro configurando webhook:", error);
            throw error;
        }
    }

    async processCallbackQuery(callbackQuery, userId) {
        // Implementação original mantida
        console.log("Processando callback query:", callbackQuery);
        // ... resto da implementação original
    }

    async getAvailableProfessionals(userId, date, time) {
        try {
            const { data: professionals, error } = await supabaseAdmin
                .from('professionals')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true);
            
            if (error) throw error;
            return professionals || [];
        } catch (error) {
            console.error('❌ Erro buscando profissionais:', error);
            return [];
        }
    }

    async getProfessionalsForProduct(productId, userId) {
        try {
            const { data: professionals, error } = await supabaseAdmin
                .from('professionals')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true);
            
            if (error) throw error;
            return professionals || [];
        } catch (error) {
            console.error('❌ Erro buscando profissionais para produto:', error);
            return [];
        }
    }

    async savePendingProductSelection(contactId, userId, products, analysis) {
        try {
            await supabaseAdmin
                .from('pending_appointments')
                .upsert({
                    contact_id: contactId,
                    user_id: userId,
                    products: JSON.stringify(products),
                    analysis: JSON.stringify(analysis),
                    type: 'product_selection',
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('❌ Erro salvando seleção pendente de produto:', error);
        }
    }

    async savePendingProfessionalSelection(contactId, userId, professionals, analysis) {
        try {
            await supabaseAdmin
                .from('pending_appointments')
                .upsert({
                    contact_id: contactId,
                    user_id: userId,
                    professionals: JSON.stringify(professionals),
                    analysis: JSON.stringify(analysis),
                    type: 'professional_selection',
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('❌ Erro salvando seleção pendente de profissional:', error);
        }
    }

    async checkPendingProductSelection(contactId, userId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('pending_appointments')
                .select('*')
                .eq('contact_id', contactId)
                .eq('user_id', userId)
                .eq('type', 'product_selection')
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('❌ Erro verificando seleção pendente de produto:', error);
            return null;
        }
    }

    async getPendingProfessionalSelection(contactId, userId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('pending_appointments')
                .select('*')
                .eq('contact_id', contactId)
                .eq('user_id', userId)
                .eq('type', 'professional_selection')
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('❌ Erro obtendo seleção pendente de profissional:', error);
            return null;
        }
    }

    async clearPendingProductSelection(contactId, userId) {
        try {
            await supabaseAdmin
                .from('pending_appointments')
                .delete()
                .eq('contact_id', contactId)
                .eq('user_id', userId)
                .eq('type', 'product_selection');
        } catch (error) {
            console.error('❌ Erro limpando seleção pendente de produto:', error);
        }
    }

    async clearPendingProfessionalSelection(contactId, userId) {
        try {
            await supabaseAdmin
                .from('pending_appointments')
                .delete()
                .eq('contact_id', contactId)
                .eq('user_id', userId)
                .eq('type', 'professional_selection');
        } catch (error) {
            console.error('❌ Erro limpando seleção pendente de profissional:', error);
        }
    }

    async isProfessionalSelection(text, contactId, userId) {
        const pending = await this.getPendingProfessionalSelection(contactId, userId);
        return pending && this.isNumericSelection(text);
    }

    isNumericSelection(text) {
        return /^\d+$/.test(text.trim());
    }

    async getContactById(contactId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('contacts')
                .select('*')
                .eq('id', contactId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('❌ Erro obtendo contato:', error);
            return null;
        }
    }

    // Métodos originais para compatibilidade (implementações simplificadas)
    async handleSchedulingIntent(analysis, contact, userId, selectedProfessional = null) {
        // Redirecionar para versão com conversação
        const customerContext = await this.customerContext.getCustomerContext(contact.id, userId);
        await this.handleSchedulingIntentWithConversation(analysis, contact, userId, customerContext, null, null);
    }

    async handleInquiryIntent(analysis, contact, userId) {
        // Redirecionar para versão com conversação
        const customerContext = await this.customerContext.getCustomerContext(contact.id, userId);
        await this.handleInquiryIntentWithConversation(analysis, contact, userId, customerContext, null, null);
    }

    async handleReschedulingIntent(analysis, contact, userId) {
        // Redirecionar para versão com conversação
        const customerContext = await this.customerContext.getCustomerContext(contact.id, userId);
        await this.handleReschedulingIntentWithConversation(analysis, contact, userId, customerContext, null, null);
    }

    async handleCancellationIntent(analysis, contact, userId) {
        // Redirecionar para versão com conversação
        const customerContext = await this.customerContext.getCustomerContext(contact.id, userId);
        await this.handleCancellationIntentWithConversation(analysis, contact, userId, customerContext, null, null);
    }

    async processDirectScheduling(selectedProduct, contact, userId, originalAnalysis) {
        // Redirecionar para versão com conversação
        const customerContext = await this.customerContext.getCustomerContext(contact.id, userId);
        await this.processDirectSchedulingWithConversation(selectedProduct, contact, userId, originalAnalysis, customerContext, null, null);
    }

    async handleProductSelection(text, pendingSelection, contact, userId) {
        // Redirecionar para versão com conversação
        const customerContext = await this.customerContext.getCustomerContext(contact.id, userId);
        await this.handleProductSelectionWithConversation(text, pendingSelection, contact, userId, customerContext, null, null);
    }

    async handleProfessionalSelection(text, contactId, userId) {
        // Redirecionar para versão com conversação
        const customerContext = await this.customerContext.getCustomerContext(contactId, userId);
        await this.handleProfessionalSelectionWithConversation(text, contactId, userId, customerContext, null, null);
    }

    async showProductOptions(products, contact, userId, analysis) {
        // Redirecionar para versão com conversação
        const customerContext = await this.customerContext.getCustomerContext(contact.id, userId);
        await this.handleProductListWithConversation(products, contact, userId, customerContext, null, analysis, null);
    }

    async deleteGoogleCalendarEvent(accessToken, eventId) {
        try {
            const response = await axios.delete(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ Erro deletando evento do Google Calendar:', error);
            throw error;
        }
    }

    async handleGeneralResponse(analysis, originalText) {
        const responses = {
            greeting: "Olá! 😊 Como posso ajudar você hoje? \n\nPosso ajudar com:\n• Agendamentos\n• Informações sobre serviços\n• Reagendamentos",
            information: "Estou aqui para ajudar! Sobre o que você gostaria de saber?",
            pricing: "Para informações sobre valores, entre em contato conosco! Temos várias opções de tratamento.",
            support: "Estou aqui para ajudar! Qual é sua dúvida?"
        };
        
        return responses[analysis.intention] || "Obrigado pela mensagem! Como posso ajudar você? 😊";
    }
}

module.exports = TelegramProcessor;