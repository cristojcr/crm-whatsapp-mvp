// src/config/instagram-config.js
module.exports = {
    APP_ID: process.env.INSTAGRAM_APP_ID,
    APP_SECRET: process.env.INSTAGRAM_APP_SECRET,
    PAGE_ACCESS_TOKEN: process.env.INSTAGRAM_PAGE_ACCESS_TOKEN,
    BUSINESS_ACCOUNT_ID: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
    WEBHOOK_VERIFY_TOKEN: process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN,
    GRAPH_API_URL: 'https://graph.facebook.com/v18.0',
    
    // Validar configuração
    validate() {
        const required = [
            'APP_ID', 'APP_SECRET', 'PAGE_ACCESS_TOKEN', 
            'BUSINESS_ACCOUNT_ID', 'WEBHOOK_VERIFY_TOKEN'
        ];
        
        for (const key of required) {
            if (!this[key]) {
                console.warn(`Instagram config missing: ${key}`);
                return false;
            }
        }
        return true;
    }
};