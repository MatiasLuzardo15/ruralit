import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Check, ArrowRight, TrendingUp, Milk, Sprout, LayoutGrid, Settings2, User } from 'lucide-react';
import db, { type TipoProduccion, inicializarCategorias } from '../db/database';
import { showToast } from './Toast';

interface Props {
    onComplete: () => void;
    initialName?: string;
}

export function ModalSetup({ onComplete, initialName = '' }: Props) {
    const [nombre, setNombre] = useState(initialName);
    const [tipo, setTipo] = useState<TipoProduccion>('Ganadería');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const tipos = [
        { id: 'Ganadería', label: 'Ganadería', icon: TrendingUp, desc: 'Cría y engorde de animales.' },
        { id: 'Lechería', label: 'Lechería', icon: Milk, desc: 'Producción de leche y tambo.' },
        { id: 'Agricultura', label: 'Agricultura', icon: Sprout, desc: 'Cultivos, granos y forrajes.' },
        { id: 'Contratista', label: 'Servicios', icon: Settings2, desc: 'Maquinaria y servicios rurales.' },
        { id: 'Ovina', label: 'Ovina', icon: User, desc: 'Producción de lana y corderos.' },
        { id: 'Mixto', label: 'Mixto', icon: LayoutGrid, desc: 'Varios rubros (Ganadería + Agro).' },
    ];

    const finalizar = async () => {
        if (!nombre.trim()) return showToast('Ingresá el nombre de tu establecimiento');
        setLoading(true);
        try {
            await db.config.put({ clave: 'nombreEstablecimiento', valor: nombre.trim() });
            await db.config.put({ clave: 'tipoProduccion', valor: tipo });
            
            // Inicializar las categorías sugeridas
            await inicializarCategorias(tipo, true);
            
            showToast('¡Configuración completada!');
            onComplete();
        } catch (e) {
            showToast('Error al guardar la configuración');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(12px)', padding: '20px' }}>
            <div style={{ background: 'var(--white)', borderRadius: '32px', width: '100%', maxWidth: '500px', padding: '40px', boxShadow: 'var(--shadow-lg)', position: 'relative' }}>
                
                {step === 1 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <Building2 size={32} color="var(--green-main)" />
                            </div>
                            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--t1)', marginBottom: '8px' }}>¡Bienvenido a Ruralit!</h2>
                            <p style={{ fontSize: '15px', color: 'var(--t3)', lineHeight: 1.5 }}>Comencemos configurando lo básico de tu establecimiento.</p>
                        </div>

                        <div style={{ marginTop: '12px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nombre del establecimiento</label>
                            <input 
                                type="text" 
                                value={nombre} 
                                onChange={e => setNombre(e.target.value)} 
                                placeholder="Ej: La Esperanza, El Trébol..." 
                                autoFocus
                                style={{ width: '100%', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--border)', fontSize: '16px', outline: 'none', background: 'var(--bg)', color: 'var(--t1)', transition: 'border 0.2s' }} 
                            />
                        </div>

                        <button 
                            onClick={() => nombre.trim() ? setStep(2) : showToast('Ingresá un nombre')}
                            style={{ width: '100%', padding: '18px', borderRadius: '20px', background: 'var(--t1)', color: 'white', fontSize: '16px', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: 'var(--shadow-md)' }}
                        >
                            Siguiente paso <ArrowRight size={18} />
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--t1)', marginBottom: '8px' }}>Tipo de Producción</h2>
                            <p style={{ fontSize: '15px', color: 'var(--t3)', lineHeight: 1.5 }}>Esto nos permite precargar las categorías más útiles para tu caso.</p>
                        </div>

                        <div className="custom-scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px', maxHeight: '45vh', overflowY: 'auto', paddingRight: '8px' }}>
                            {tipos.map(t => {
                                const selected = tipo === t.id;
                                return (
                                    <button 
                                        key={t.id}
                                        onClick={() => setTipo(t.id as TipoProduccion)}
                                        style={{ padding: '16px 12px', borderRadius: '20px', border: selected ? '2px solid var(--green-main)' : '1px solid var(--border-sm)', background: selected ? 'var(--green-light)' : 'var(--white)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center', position: 'relative' }}
                                    >
                                        <t.icon size={22} color={selected ? 'var(--green-main)' : 'var(--t3)'} />
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>{t.label}</p>
                                            <p style={{ fontSize: '10px', color: 'var(--t3)', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.desc}</p>
                                        </div>
                                        {selected && (
                                            <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--green-main)', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Check size={10} color="white" strokeWidth={4} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <button 
                                onClick={() => setStep(1)}
                                style={{ flex: 1, padding: '18px', borderRadius: '20px', background: 'var(--gray-100)', color: 'var(--t2)', fontSize: '16px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                            >
                                Atrás
                            </button>
                            <button 
                                onClick={finalizar}
                                disabled={loading}
                                style={{ flex: 2, padding: '18px', borderRadius: '20px', background: 'var(--green-main)', color: 'white', fontSize: '16px', fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-entrada)' }}
                            >
                                {loading ? 'Configurando...' : 'Finalizar'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
