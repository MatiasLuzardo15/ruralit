import { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
import { LoadingScreen } from '../components/LoadingScreen';
import loginBg from '../assets/login-bg.png';

export function Login() {
    const [view, setView] = useState<'login' | 'signup'>('login');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return showToast('Completa todos los campos', 'warning');

        setLoading(true);
        try {
            if (view === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                showToast('¡Bienvenido de nuevo!', 'success');
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                showToast('Cuenta creada. Revisa tu email.', 'info');
            }
        } catch (error: any) {
            showToast(error.message || 'Ocurrió un error', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingScreen splash message={view === 'login' ? 'Iniciando sesión…' : 'Creando cuenta…'} />;

    return (
        <div className="ruralit-login-container">
            {/* Background Decorations */}
            <div className="ruralit-login-blob blob-1" />
            <div className="ruralit-login-blob blob-2" />
            
            {/* Sidebar Form */}
            <div className="ruralit-login-sidebar">
                <div className="ruralit-login-brand">
                    <span className="ruralit-login-brand-text">
                        ruralit<span className="ruralit-login-brand-dot">.</span>
                    </span>
                </div>

                <div className="ruralit-login-form-wrap">
                    <h1 className="ruralit-login-title">
                        Gestiona tu establecimiento con Ruralit.
                    </h1>
                    <p className="ruralit-login-subtitle">
                        La herramienta definitiva para el control total de tus entradas, salidas y métricas.
                    </p>

                    <form onSubmit={handleSubmit} className="ruralit-login-input-group">
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="Email"
                            className="ruralit-login-input"
                            autoComplete="email"
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Contraseña"
                            className="ruralit-login-input"
                            autoComplete="current-password"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="ruralit-login-button"
                        >
                            {view === 'login' ? 'Entrar ahora' : 'Registrarse'}
                            <ArrowRight size={20} />
                        </button>
                    </form>

                    <button
                        onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                        className="ruralit-login-switch"
                    >
                        {view === 'login' ? '¿No tienes una cuenta? Regístrate' : '¿Ya eres miembro? Inicia sesión'}
                    </button>
                </div>

                <div className="ruralit-login-v-tag">
                    RURALIT V1 BETA
                </div>
            </div>

            {/* Cinematic Background Section */}
            {!isMobile && (
                <div 
                    className="ruralit-login-bg"
                    style={{ backgroundImage: `url(${loginBg})` }}
                >
                    <div className="ruralit-login-overlay" />
                </div>
            )}
        </div>
    );
}

