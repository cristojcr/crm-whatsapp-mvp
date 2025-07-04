// apps/web/pages/auth/instagram/callback.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function InstagramCallback() {
    const router = useRouter();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const { code, state, error } = router.query;

                if (error) {
                    console.error('OAuth Error:', error);
                    window.opener?.postMessage({
                        type: 'instagram_auth_error',
                        error: error
                    }, '*');
                    window.close();
                    return;
                }

                if (code && state) {
                    // Enviar code para o backend processar
                    const response = await fetch(`http://localhost:3001/api/instagram/callback?code=${code}&state=${state}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Sucesso - enviar dados para o popup pai
                        window.opener?.postMessage({
                            type: 'instagram_auth_success',
                            data: result.data
                        }, '*');
                    } else {
                        // Erro - enviar erro para o popup pai
                        window.opener?.postMessage({
                            type: 'instagram_auth_error',
                            error: result.error
                        }, '*');
                    }
                } else {
                    throw new Error('Código de autorização não recebido');
                }

            } catch (error) {
                console.error('Erro no callback:', error);
                window.opener?.postMessage({
                    type: 'instagram_auth_error',
                    error: error.message
                }, '*');
            } finally {
                // Fechar popup em qualquer caso
                setTimeout(() => {
                    window.close();
                }, 1000);
            }
        };

        // Só executar se tiver os parâmetros da query
        if (router.isReady) {
            handleCallback();
        }
    }, [router.isReady, router.query]);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontFamily: 'Arial, sans-serif'
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid rgba(255,255,255,0.3)',
                    borderTop: '4px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                }}></div>
                <h2>Processando autorização...</h2>
                <p>Esta janela será fechada automaticamente.</p>
            </div>
            
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}