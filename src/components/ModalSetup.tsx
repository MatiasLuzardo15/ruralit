import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, ArrowRight, TrendingUp, Milk, Sprout, LayoutGrid, Settings2, User, Loader2, Sparkles } from 'lucide-react';
import { type TipoProduccion, inicializarCategorias } from '../db/database';
import { showToast } from './Toast';
import { supabase } from '../lib/supabase';
import { dataService } from '../lib/dataService';
import { MONEDAS } from '../utils/helpers';
import type { Moneda } from '../types';
import { Check, Coins } from 'lucide-react';
import { LoadingScreen } from './LoadingScreen';

interface Props {
    onComplete: () => void;
    initialName?: string;
}

export function ModalSetup({ onComplete, initialName = '' }: Props) {
    const [nombre, setNombre] = useState(initialName);
    const [tipo, setTipo] = useState<TipoProduccion | null>(null);
    const [monedas, setMonedas] = useState<Moneda[]>(['UYU']);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const tipos = [
        { id: 'Ganadería', label: 'Ganadería', icon: TrendingUp, desc: 'Engorde y cría general.' },
        { id: 'Lechería', label: 'Lechería', icon: Milk, desc: 'Tambo y derivados.' },
        { id: 'Agricultura', label: 'Agricultura', icon: Sprout, desc: 'Cosecha y cultivos.' },
        { id: 'Contratista', label: 'Servicios', icon: Settings2, desc: 'Maquinaria pesada.' },
        { id: 'Ovina', label: 'Ovina', icon: User, desc: 'Lana y corderos.' },
        { id: 'Mixto', label: 'Mixto', icon: LayoutGrid, desc: 'Varios rubros.' },
    ];

    const finalizar = async () => {
        if (!nombre.trim()) return showToast('Ingresá el nombre');
        if (!tipo) return showToast('Seleccioná el rubro');
        if (monedas.length === 0) return showToast('Seleccioná al menos una moneda');
        setLoading(true);
        try {
            let id = localStorage.getItem('activeEstDB_uuid');
            
            if (id) {
                // Actualizar existente
                await dataService.updateEstablecimiento(id, {
                    nombre: nombre.trim(),
                    tipo_produccion: tipo,
                    monedas_activas: monedas
                });
            } else {
                // Crear nuevo (para usuarios nuevos)
                const nuevo = await dataService.addEstablecimiento(nombre.trim(), tipo, monedas);
                id = String(nuevo.id);
                localStorage.setItem('activeEstDB_uuid', id);
            }

            // Inicializar categorías sugeridas en la nube
            if (id) {
                await inicializarCategorias(tipo, true);
            }
            
            showToast('¡Configuración lista!');
            onComplete();
        } catch (e) {
            console.error(e);
            showToast('Error al configurar');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div style={{ 
            position: 'fixed', inset: 0, zIndex: 10000, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            background: 'rgba(12, 14, 16, 0.85)', backdropFilter: 'blur(20px)', 
            padding: '20px' 
        }}>
            <div style={{ 
                background: 'rgba(255, 255, 255, 0.03)', 
                backdropFilter: 'blur(30px) saturate(150%)',
                WebkitBackdropFilter: 'blur(30px) saturate(150%)',
                borderRadius: '40px', width: '100%', maxWidth: '640px', 
                padding: '48px', border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 40px 100px rgba(0,0,0,0.6)', 
                position: 'relative', overflow: 'hidden',
                color: 'white'
            }}>
                
                {/* Branding Decor */}
                <div style={{ position: 'absolute', top: '24px', left: '24px' }}>
                    <span style={{ fontFamily: '"Orbitron", sans-serif', fontSize: '14px', fontWeight: 700, opacity: 0.4 }}>
                        ruralit<span style={{ color: 'var(--logo-dot)' }}>.</span>
                    </span>
                </div>

                {/* Progress Dots */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '40px' }}>
                    <div style={{ width: '32px', height: '4px', borderRadius: '2px', background: step >= 1 ? 'var(--logo-dot)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
                    <div style={{ width: '32px', height: '4px', borderRadius: '2px', background: step >= 2 ? 'var(--logo-dot)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
                    <div style={{ width: '32px', height: '4px', borderRadius: '2px', background: step >= 3 ? 'var(--logo-dot)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
                </div>
                
                {step === 1 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                                width: '80px', height: '80px', borderRadius: '28px', 
                                background: 'rgba(255,255,255,0.05)', display: 'flex', 
                                alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <Building2 size={36} color="var(--logo-dot)" />
                            </div>
                            <h2 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '12px', letterSpacing: '-1px' }}>¡Bienvenido!</h2>
                            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>Empecemos configurando el nombre de tu establecimiento principal.</p>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '2px' }}>NOMBRE</label>
                            <input 
                                type="text" 
                                value={nombre} 
                                onChange={e => setNombre(e.target.value)} 
                                placeholder="Ej: La Esperanza" 
                                autoFocus
                                style={{ 
                                    width: '100%', padding: '20px 24px', borderRadius: '20px', 
                                    border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '18px', 
                                    outline: 'none', background: 'rgba(255,255,255,0.05)', color: 'white', 
                                    transition: 'all 0.2s' 
                                }} 
                            />
                        </div>

                        <button 
                            onClick={() => nombre.trim() ? setStep(2) : showToast('Ingresá un nombre')}
                            style={{ 
                                width: '100%', padding: '20px', borderRadius: '20px', 
                                background: 'white', color: '#0c0e10', fontSize: '17px', 
                                fontWeight: 800, border: 'none', cursor: 'pointer', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                gap: '12px', transition: 'all 0.2s' 
                            }}
                        >
                            Continuar <ArrowRight size={20} />
                        </button>
                    </div>
                ) : step === 2 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '12px', letterSpacing: '-1px' }}>Tipo de Rubro</h2>
                            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>Esto cargará automáticamente las categorías más inteligentes para tu gestión.</p>
                        </div>

                        <div className="custom-scroll" style={{ 
                            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', 
                            gap: '12px', maxHeight: '40vh', overflowY: 'auto', 
                            paddingRight: '4px' 
                        }}>
                            {tipos.map(t => {
                                const selected = tipo === t.id;
                                return (
                                    <button 
                                        key={t.id}
                                        onClick={() => setTipo(t.id as TipoProduccion)}
                                        style={{ 
                                            padding: '20px 16px', borderRadius: '24px', 
                                            border: '1px solid',
                                            borderColor: selected ? 'var(--logo-dot)' : 'rgba(255,255,255,0.1)', 
                                            background: selected ? 'rgba(212, 255, 85, 0.05)' : 'rgba(255,255,255,0.03)', 
                                            display: 'flex', flexDirection: 'column', 
                                            alignItems: 'center', gap: '10px', cursor: 'pointer', 
                                            transition: 'all 0.2s', textAlign: 'center', position: 'relative' 
                                        }}
                                    >
                                        <div style={{ 
                                            padding: '10px', borderRadius: '14px', 
                                            background: selected ? 'var(--logo-dot)' : 'rgba(255,255,255,0.05)',
                                            color: selected ? '#0c0e10' : 'white'
                                        }}>
                                            <t.icon size={20} />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ fontSize: '14px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>{t.label}</p>
                                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.2 }}>{t.desc}</p>
                                        </div>
                                        {selected && (
                                            <div style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--logo-dot)' }}>
                                                <Sparkles size={14} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                            <button 
                                onClick={() => setStep(1)}
                                style={{ 
                                    flex: 1, padding: '20px', borderRadius: '20px', 
                                    background: 'rgba(255,255,255,0.05)', color: 'white', 
                                    fontSize: '16px', fontWeight: 800, border: 'none', cursor: 'pointer' 
                                }}
                            >
                                Atrás
                            </button>
                            <button 
                                onClick={() => setStep(3)}
                                disabled={!tipo}
                                style={{ 
                                    flex: 2, padding: '20px', borderRadius: '20px', 
                                    background: tipo ? 'var(--logo-dot)' : 'rgba(255,255,255,0.1)', 
                                    color: tipo ? '#0c0e10' : 'rgba(255,255,255,0.3)', 
                                    fontSize: '17px', fontWeight: 900, border: 'none', 
                                    cursor: tipo ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                }}
                            >
                                Continuar <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '12px', letterSpacing: '-1px' }}>Divisas Activas</h2>
                            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>Selecciona las monedas con las que operará {nombre}.</p>
                        </div>

                        <div className="custom-scroll" style={{ 
                            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', 
                            gap: '12px', maxHeight: '40vh', overflowY: 'auto', 
                            paddingRight: '4px' 
                        }}>
                            {(Object.keys(MONEDAS) as Moneda[]).map(m => {
                                const info = MONEDAS[m];
                                const selected = monedas.includes(m);
                                return (
                                    <button 
                                        key={m}
                                        onClick={() => {
                                            if (selected) {
                                                if (monedas.length > 1) setMonedas(monedas.filter(curr => curr !== m));
                                                else showToast('Al menos una moneda activa');
                                            } else {
                                                setMonedas([...monedas, m]);
                                            }
                                        }}
                                        style={{ 
                                            padding: '20px 16px', borderRadius: '24px', 
                                            border: '1px solid',
                                            borderColor: selected ? 'var(--logo-dot)' : 'rgba(255,255,255,0.1)', 
                                            background: selected ? 'rgba(212, 255, 85, 0.05)' : 'rgba(255,255,255,0.03)', 
                                            display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', 
                                            transition: 'all 0.2s', textAlign: 'left', position: 'relative' 
                                        }}
                                    >
                                        <div style={{ fontSize: '24px', opacity: selected ? 1 : 0.7 }}>{info.flag}</div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '15px', fontWeight: 800, color: 'white' }}>{m}</p>
                                            <p style={{ fontSize: '11px', color: selected ? 'var(--logo-dot)' : 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{info.label}</p>
                                        </div>
                                        {selected && (
                                            <div style={{ color: 'var(--logo-dot)' }}>
                                                <Check size={18} strokeWidth={3} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                            <button 
                                onClick={() => setStep(2)}
                                style={{ 
                                    flex: 1, padding: '20px', borderRadius: '20px', 
                                    background: 'rgba(255,255,255,0.05)', color: 'white', 
                                    fontSize: '16px', fontWeight: 800, border: 'none', cursor: 'pointer' 
                                }}
                            >
                                Atrás
                            </button>
                            <button 
                                onClick={finalizar}
                                disabled={loading || monedas.length === 0}
                                style={{ 
                                    flex: 2, padding: '20px', borderRadius: '20px', 
                                    background: monedas.length > 0 ? 'var(--logo-dot)' : 'rgba(255,255,255,0.1)', 
                                    color: monedas.length > 0 ? '#0c0e10' : 'rgba(255,255,255,0.3)', 
                                    fontSize: '17px', fontWeight: 900, border: 'none', 
                                    cursor: monedas.length > 0 ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                }}
                            >
                                ¡Empieza ahora! <Sparkles size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {loading && (
                    <div style={{ 
                        position: 'absolute', inset: 0, zIndex: 10,
                        background: 'rgba(12, 14, 16, 0.95)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '40px', gap: '16px'
                    }}>
                        <Loader2 className="spinning" size={32} color="var(--logo-dot)" />
                        <p style={{ color: 'white', fontSize: '14px', fontWeight: 600, opacity: 0.8 }}>Personalizando tu experiencia…</p>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
