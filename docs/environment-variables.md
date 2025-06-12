# 🔧 Environment Variables Documentation

Este documento detalha todas as variáveis de ambiente utilizadas no CRM WhatsApp MVP.

## 📋 Estrutura de Ambientes

| Ambiente | Arquivo | Descrição |
|----------|---------|-----------|
| Development | `.env.local` | Desenvolvimento local |
| Staging | `.env.staging` | Testes na nuvem |
| Production | `.env.production` | Produção |
| Template | `.env.example` | Template público |

## 🗄️ Database (Supabase)

### Obrigatórias:
- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Chave pública do Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Chave privada do Supabase
- `DATABASE_URL`: String de conexão PostgreSQL

### Como obter:
1. Acesse https://supabase.com/dashboard
2. Vá em Settings → API
3. Copie as credenciais

## 📅 Google Calendar API

### Obrigatórias:
- `GOOGLE_CLIENT_ID`: ID do cliente OAuth2
- `GOOGLE_CLIENT_SECRET`: Secret do cliente OAuth2
- `GOOGLE_REDIRECT_URI`: URL de callback

### Como obter:
1. Google Cloud Console → APIs & Services → Credentials
2. Crie OAuth 2.0 Client ID
3. Configure redirect URIs

## 🤖 AI Providers

### OpenAI:
- `OPENAI_API_KEY`: Chave da API OpenAI
- `OPENAI_MODEL`: Modelo a usar (gpt-4, gpt-3.5-turbo)

### DeepSeek (Recomendado):
- `DEEPSEEK_API_KEY`: Chave da API DeepSeek
- `DEEPSEEK_BASE_URL`: URL base da API

### Como obter:
- OpenAI: https://platform.openai.com/api-keys
- DeepSeek: https://platform.deepseek.com/api_keys

## 📱 WhatsApp API

### Meta Business:
- `WHATSAPP_API_TOKEN`: Token de acesso
- `WHATSAPP_PHONE_NUMBER_ID`: ID do número
- `WHATSAPP_BUSINESS_ACCOUNT_ID`: ID da conta business

### Como obter:
1. Meta for Developers → WhatsApp Business Platform
2. Crie uma aplicação
3. Configure webhook

## 💳 Stripe (Billing)

### Obrigatórias:
- `STRIPE_PUBLISHABLE_KEY`: Chave pública
- `STRIPE_SECRET_KEY`: Chave secreta
- `STRIPE_WEBHOOK_SECRET`: Secret do webhook

### Como obter:
1. Dashboard Stripe → Developers → API keys
2. Configure webhooks para pagamentos

## 🔐 Security

### JWT:
- `JWT_SECRET`: Secret para assinar tokens (mín. 32 chars)
- `JWT_EXPIRES_IN`: Tempo de expiração (24h, 7d, etc)

### Encryption:
- `ENCRYPTION_KEY`: Chave para criptografia (32+ chars)

## 📧 Email & Notifications

### Resend (Recomendado):
- `RESEND_API_KEY`: Chave da API Resend

### SendGrid (Alternativa):
- `SENDGRID_API_KEY`: Chave da API SendGrid
- `SENDGRID_FROM_EMAIL`: Email remetente verificado

## 📊 Monitoring

### Sentry:
- `SENTRY_DSN`: URL para error tracking

### PostHog:
- `POSTHOG_API_KEY`: Chave para analytics

## ⚠️ Segurança

### ❌ NUNCA faça:
- Commit de arquivos .env com credenciais reais
- Compartilhar chaves de produção
- Usar mesmas chaves em dev/prod

### ✅ SEMPRE faça:
- Use .env.example como template
- Mantenha chaves diferentes por ambiente
- Use GitHub Secrets para CI/CD
- Rotacione chaves periodicamente

## 🔄 Como Configurar

### 1. Development:
```bash
cp .env.example .env.local
# Edite .env.local com suas credenciais
2. Staging/Production:

Configure via GitHub Secrets
Use variáveis de ambiente do deploy
Mantenha backups seguros das chaves

🚨 Troubleshooting
Erro "Supabase not configured":

Verifique NEXT_PUBLIC_SUPABASE_URL
Confirme SUPABASE_SERVICE_ROLE_KEY

Erro "Google Calendar unauthorized":

Confirme GOOGLE_CLIENT_ID/SECRET
Verifique redirect URI configurado

Erro "WhatsApp webhook failed":

Valide WHATSAPP_WEBHOOK_VERIFY_TOKEN
Confirme URL do webhook


---

## 📋 **PASSO 7: Atualizar .gitignore**

### **7.1 Adicionar proteção para arquivos de ambiente:**

**Abra `.gitignore` e adicione no topo:**

```gitignore
# ================================================================
# 🔐 ENVIRONMENT VARIABLES (CRITICAL - NEVER COMMIT!)
# ================================================================

# Environment files with real credentials
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.staging
.env.production

# Backup files
.env.backup
.env.*.backup

# ================================================================
# Resto do arquivo .gitignore...