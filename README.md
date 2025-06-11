# 🚀 CRM WhatsApp MVP

Sistema inteligente de CRM para WhatsApp com automação de respostas e agendamentos.

## 📋 Estrutura do Projeto
crm-whatsapp-mvp/
├── apps/
│   ├── api/          # Backend Node.js + Express
│   └── web/          # Frontend Next.js
├── packages/
│   ├── database/     # Configurações Supabase
│   ├── shared-types/ # TypeScript types compartilhados
│   ├── ai-providers/ # Integrações OpenAI/DeepSeek
│   └── whatsapp-client/ # Cliente WhatsApp
├── docs/             # Documentação
├── scripts/          # Scripts de automação
└── configs/          # Configurações compartilhadas

## 🛠️ Desenvolvimento

### Pré-requisitos
- Node.js 18+
- npm 9+
- Conta Supabase
- Google Cloud Project (Calendar API)

### Instalação
```bash
# Instalar dependências
npm run install:all

# Iniciar desenvolvimento
npm run dev
URLs de Desenvolvimento

🌐 Frontend: http://localhost:3000
🔧 API: http://localhost:3001
📊 Supabase: https://supabase.com/dashboard

🚀 Deploy
Staging
bashnpm run build
npm run deploy:staging
Production
bashnpm run build
npm run deploy:production
📚 Documentação

📖 API Documentation
🎨 Frontend Guide
🚀 Deployment Guide

🤝 Contribuição

Clone o repositório
Crie uma branch: git checkout -b feature/nova-funcionalidade
Commit suas mudanças: git commit -m 'feat: adiciona nova funcionalidade'
Push para a branch: git push origin feature/nova-funcionalidade
Abra um Pull Request

📄 Licença
Proprietary - Todos os direitos reservados

---

## 📋 **PASSO 4: Configuração do Backend (API)**

### 4.1 Criar package.json do backend
**Navegue até `apps/api` e crie `package.json`:**

```json
{
  "name": "@crm-whatsapp/api",
  "version": "1.0.0",
  "description": "Backend API para CRM WhatsApp",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "@supabase/supabase-js": "^2.39.0",
    "googleapis": "^131.0.0",
    "openai": "^4.28.0",
    "axios": "^1.6.7",
    "joi": "^17.12.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.11.16",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/bcryptjs": "^2.4.6",
    "typescript": "^5.3.3",
    "nodemon": "^3.0.3",
    "ts-node": "^10.9.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.20.0",
    "@typescript-eslint/parser": "^6.20.0"
  }
}