// src/config/telegram-config.js
module.exports = {
    BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
    WEBHOOK_VERIFY_TOKEN: process.env.TELEGRAM_WEBHOOK_VERIFY_TOKEN,
    API_URL: 'https://api.telegram.org/bot',
    
    // Validar configuração
    validate() {
        const required = ['BOT_TOKEN', 'BOT_USERNAME'];
        
        for (const key of required) {
            if (!this[key]) {
                console.warn(`Telegram config missing: ${key}`);
                return false;
            }
        }
        return true;
    },
    
    // URL completa da API
    getApiUrl() {
        return `${this.API_URL}${this.BOT_TOKEN}`;
    }
};