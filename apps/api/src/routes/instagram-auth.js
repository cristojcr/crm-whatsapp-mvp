const express = require('express');
const axios = require('axios');
const supabase = require('../config/supabase');
const router = express.Router();

// Callback do Instagram OAuth
router.get('/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        
        if (!code) {
            return res.status(400).json({ error: 'Authorization code not provided' });
        }

        // Trocar code por access_token
        const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', {
            client_id: process.env.FACEBOOK_APP_ID,
            client_secret: process.env.FACEBOOK_APP_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: process.env.REDIRECT_URI,
            code: code
        });

        const { access_token, user_id } = tokenResponse.data;

        // Buscar informações do usuário
        const userInfo = await axios.get(`https://graph.instagram.com/me?fields=id,username&access_token=${access_token}`);

        // Salvar no banco (decode userId do state)
        const userId = state; // userId passado no state
        
        const { error } = await supabase
            .from('user_channels')
            .upsert({
                user_id: userId,
                channel_type: 'instagram',
                channel_config: {
                    access_token: access_token,
                    instagram_user_id: user_id,
                    username: userInfo.data.username
                },
                is_active: true,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error('Erro salvando no banco:', error);
            return res.status(500).json({ error: 'Erro interno' });
        }

        // Fechar popup e notificar parent
        res.send(`
            <script>
                window.opener.postMessage({
                    type: 'instagram_auth_success',
                    data: {
                        username: '${userInfo.data.username}',
                        user_id: '${user_id}'
                    }
                }, '*');
                window.close();
            </script>
        `);

    } catch (error) {
        console.error('Erro no OAuth:', error);
        res.status(500).json({ error: 'Erro na autorização' });
    }
});

module.exports = router;