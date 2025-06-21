import { useState } from 'react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email) return;
        
        setLoading(true);
        
        // Simular login
        setTimeout(() => {
            // Redirecionar para dashboard
            window.location.href = '/dashboard/multicanal';
        }, 1000);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-md">
                <div 
                    className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20"
                    style={{
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.15)'
                    }}
                >
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                            🚀
                        </div>
                        
                        <h1 className="text-3xl font-bold mb-2" style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            CRM Multicanal
                        </h1>
                        
                        <p className="text-gray-600 font-medium">
                            Acesse sua plataforma
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            FASE 5 - Frontend Dashboard
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">
                                📧 Email
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    placeholder="seu@email.com (qualquer um para demo)"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                                />
                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    ✨
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleLogin}
                            disabled={loading || !email}
                            className="w-full py-3 px-6 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:opacity-50"
                            style={{
                                background: loading 
                                    ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
                            }}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Entrando...</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center space-x-2">
                                    <span>Entrar</span>
                                    <span>→</span>
                                </div>
                            )}
                        </button>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-200/50">
                        <div className="text-center">
                            <p className="text-sm text-blue-600 font-medium mb-2">
                                🔧 Modo Demo
                            </p>
                            <p className="text-xs text-blue-500">
                                Digite qualquer email para acessar o dashboard
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-gray-500">
                            © 2025 CRM Inteligente • Proximidade Inteligente
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}