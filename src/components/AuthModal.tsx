import { useState, useEffect } from 'react';
import { Mail, Lock, Loader2, ArrowRight, UserPlus, LogIn, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from './Toast';

interface Props {
  onSuccess: () => void;
}

export function AuthModal({ onSuccess }: Props) {
  const [view, setView] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
      onSuccess();
    } catch (error: any) {
      showToast(error.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 20000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        background: 'var(--white)', borderRadius: '32px', width: '100%', maxWidth: '420px',
        padding: '40px', boxShadow: 'var(--shadow-lg)', position: 'relative'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '18px', background: 'var(--green-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
          }}>
            {view === 'login' ? <LogIn color="var(--green-main)" /> : <UserPlus color="var(--green-main)" />}
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--t1)', marginBottom: '8px' }}>
            {view === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--t3)' }}>
            {view === 'login' 
              ? 'Sincroniza tus datos en la nube' 
              : 'Empieza a guardar tus registros online'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="var(--t3)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                style={{
                  width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px',
                  border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--t1)'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="var(--t3)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px',
                  border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--t1)'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '18px', borderRadius: '18px', background: 'var(--green-main)',
              color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              marginTop: '12px', boxShadow: 'var(--shadow-entrada)'
            }}
          >
            {loading ? <Loader2 className="spinning" size={20} /> : (
              <>
                {view === 'login' ? 'Entrar' : 'Registrarme'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            onClick={() => setView(view === 'login' ? 'signup' : 'login')}
            style={{
              background: 'none', border: 'none', color: 'var(--green-main)',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer'
            }}
          >
            {view === 'login' ? '¿No tienes cuenta? Crea una' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>

        <button 
          onClick={() => onSuccess()}
          style={{
            position: 'absolute', top: '24px', left: '24px', background: 'none', border: 'none',
            color: 'var(--t3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          <ChevronLeft size={16} /> <span style={{ fontSize: '12px', fontWeight: 600 }}>Cerrar</span>
        </button>
      </div>
    </div>
  );
}
