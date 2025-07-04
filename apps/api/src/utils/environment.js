// apps/api/src/utils/environment.js
const isProduction = () => {
    return process.env.NODE_ENV === 'production';
};

const isDevelopment = () => {
    return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
};

const getWebhookBaseUrl = () => {
    if (isProduction()) {
        return process.env.WEBHOOK_BASE_URL || 'https://api.seudominio.com';
    }
    return process.env.WEBHOOK_BASE_URL || 'http://localhost:3001';
};

const shouldAutoConfigureWebhook = () => {
    const baseUrl = getWebhookBaseUrl();
    return baseUrl.startsWith('https://');
};

module.exports = {
    isProduction,
    isDevelopment,
    getWebhookBaseUrl,
    shouldAutoConfigureWebhook
};