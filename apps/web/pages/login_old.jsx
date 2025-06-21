// apps/web/pages/login.jsx
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        // Simular login (só para teste)
        setTimeout(() => {
            router.push('/dashboard/multicanal');
        }, 1000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        CRM Multicanal - Demo
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        FASE 5 - Frontend Dashboard
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div>
                        <input
                            type="email"
                            placeholder="Email (qualquer um para demo)"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Entrando...' : 'Entrar (Demo)'}
                    </button>
                </form>
            </div>
        </div>
    );
}