import { useState, useEffect } from 'react';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
import { syncService } from '../lib/sync';

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
        if (!email || !password) return showToast('Completa todos los campos');

        setLoading(true);
        try {
            if (view === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                showToast('¡Bienvenido de nuevo!');
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                showToast('Cuenta creada. Revisa tu email.');
            }
            syncService.syncEverything();
        } catch (error: any) {
            showToast(error.message || 'Ocurrió un error');
        } finally {
            setLoading(false);
        }
    };

    if (isMobile) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                background: '#162b16',
                padding: '40px 24px',
                position: 'relative'
            }}>
                <div style={{ marginBottom: '40px' }}>
                    <span style={{ 
                        fontFamily: '"Orbitron", sans-serif', fontSize: '28px', 
                        fontWeight: 700, color: 'white', letterSpacing: '-1px'
                    }}>
                        ruralit<span style={{ color: 'var(--logo-dot)' }}>.</span>
                    </span>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'white', marginBottom: '16px', lineHeight: 1.1 }}>
                        Gestiona tu establecimiento profesionalmente.
                    </h1>
                    <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', marginBottom: '40px' }}>
                        Toda tu información en un solo lugar, segura y accesible.
                    </p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <input
                            type="email" value={email} onChange={e => setEmail(e.target.value)}
                            placeholder="Email"
                            style={{
                                width: '100%', padding: '18px 20px', borderRadius: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.1)', 
                                background: 'rgba(255, 255, 255, 0.05)', color: 'white',
                                fontSize: '16px', outline: 'none'
                            }}
                        />
                        <input
                            type="password" value={password} onChange={e => setPassword(e.target.value)}
                            placeholder="Contraseña"
                            style={{
                                width: '100%', padding: '18px 20px', borderRadius: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.1)', 
                                background: 'rgba(255, 255, 255, 0.05)', color: 'white',
                                fontSize: '16px', outline: 'none'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '18px', borderRadius: '12px', 
                                background: 'var(--logo-dot)', color: '#162b16', 
                                fontWeight: 800, border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                marginTop: '12px', fontSize: '16px'
                            }}
                        >
                            {loading ? <Loader2 className="spinning" size={20} /> : (
                                <>
                                    {view === 'login' ? 'Entrar ahora' : 'Registrarse'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div style={{ marginTop: '32px', textAlign: 'center' }}>
                        <button
                            onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                            style={{
                                background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
                                fontSize: '14px', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            {view === 'login' ? '¿No tienes cuenta? Registrate' : '¿Ya tienes cuenta? Entrar'}
                        </button>
                    </div>
                </div>

                <p style={{ marginTop: 'auto', color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 700, letterSpacing: '1px' }}>
                    RURALIT V1 BETA
                </p>
            </div>
        );
    }

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            background: '#162b16',
            overflow: 'hidden'
        }}>
            {/* Form Section */}
            <div style={{
                width: '480px',
                padding: '40px 60px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                zIndex: 2,
                boxShadow: '20px 0 60px rgba(0,0,0,0.3)',
                flexShrink: 0
            }}>
                <div style={{ marginBottom: '60px' }}>
                    <span style={{ 
                        fontFamily: '"Orbitron", sans-serif', fontSize: '28px', 
                        fontWeight: 700, color: 'white', letterSpacing: '-1.2px'
                    }}>
                        ruralit<span style={{ color: 'var(--logo-dot)' }}>.</span>
                    </span>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h1 style={{ 
                        fontSize: '42px', fontWeight: 900, color: 'white', 
                        marginBottom: '20px', lineHeight: 1.1, letterSpacing: '-1.5px' 
                    }}>
                        Gestiona tu establecimiento profesionalmente.
                    </h1>
                    <p style={{ 
                        fontSize: '16px', color: 'rgba(255,255,255,0.5)', 
                        marginBottom: '40px', lineHeight: 1.6, maxWidth: '320px' 
                    }}>
                        Administra tus entradas, salidas y categorías con la herramienta definitiva para el campo.
                    </p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <input
                            type="email" value={email} onChange={e => setEmail(e.target.value)}
                            placeholder="Email"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
                            style={{
                                width: '100%', padding: '18px 24px', borderRadius: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.1)', 
                                background: 'rgba(255, 255, 255, 0.05)', color: 'white',
                                fontSize: '15px', outline: 'none'
                            }}
                        />
                        <input
                            type="password" value={password} onChange={e => setPassword(e.target.value)}
                            placeholder="Contraseña"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
                            style={{
                                width: '100%', padding: '18px 24px', borderRadius: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.1)', 
                                background: 'rgba(255, 255, 255, 0.05)', color: 'white',
                                fontSize: '15px', outline: 'none'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '18px', borderRadius: '12px', 
                                background: 'var(--logo-dot)', color: '#162b16', 
                                fontWeight: 900, border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                marginTop: '10px', fontSize: '16px'
                            }}
                        >
                            {loading ? <Loader2 className="spinning" size={24} /> : (
                                <>
                                    {view === 'login' ? 'Entrar ahora' : 'Registrarse'}
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div style={{ marginTop: '32px' }}>
                        <button
                            onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                            style={{
                                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                                fontSize: '14px', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            {view === 'login' ? '¿No tienes una cuenta? Regístrate' : '¿Ya eres miembro? Inicia sesión'}
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: '60px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontWeight: 800, letterSpacing: '2px' }}>
                        RURALIT V1 BETA
                    </span>
                </div>
            </div>

            {/* Image Section */}
            <div style={{
                flex: 1,
                position: 'relative',
                background: '#162b16'
            }}>
                <img 
                    src="/rural_login_real.png"
                    alt="Rural Life"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                    }}
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to right, #162b16 0%, rgba(22, 43, 22, 0.2) 20%, transparent 40%)'
                }} />
            </div>
        </div>
    );
}
