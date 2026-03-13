import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, ArrowRight, TrendingUp, Milk, Sprout, LayoutGrid, Settings2, User, Loader2, Sparkles, X } from 'lucide-react';
import { type TipoProduccion, inicializarCategorias } from '../db/database';
import { showToast } from './Toast';
import { dataService } from '../lib/dataService';

interface Props {
    onClose: () => void;
    onSuccess: (id: string) => void;
}

export function ModalNuevoEstablecimiento({ onClose, onSuccess }: Props) {
    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState<TipoProduccion | null>(null);
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
        
        setLoading(true);
        try {
            // 1. Crear el establecimiento en Supabase
            const nuevo = await dataService.addEstablecimiento(nombre.trim(), tipo);
            const id = String(nuevo.id);

            // 2. Limpiar caché para forzar recarga de datos del nuevo establecimiento
            dataService.clearCache();
            
            // 3. Establecer como activo temporalmente para inicializar categorías
            // Guardamos el actual por si acaso, aunque usualmente vamos a cambiar al nuevo
            const prevActive = localStorage.getItem('activeEstDB_uuid');
            localStorage.setItem('activeEstDB_uuid', id);

            // 4. Inicializar categorías sugeridas según el rubro
            await inicializarCategorias(tipo, true);
            
            showToast('¡Establecimiento creado!');
            onSuccess(id);
        } catch (e) {
            console.error(e);
            showToast('Error al crear establecimiento');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div style={{ 
            position: 'fixed', inset: 0, zIndex: 10000, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            background: 'rgba(12, 14, 16, 0.85)', backdropFilter: 'blur(10px)', 
            padding: '20px' 
        }}>
            <div style={{ 
                background: 'var(--bg-card)', 
                borderRadius: '32px', width: '100%', maxWidth: '500px', 
                padding: '40px', border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg)', 
                position: 'relative', overflow: 'hidden',
                color: 'var(--t1)'
            }}>
                
                <button 
                    onClick={onClose}
                    style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--gray-100)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: 'var(--t3)' }}
                >
                    <X size={18} />
                </button>

                {/* Progress Mini Bar */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '32px' }}>
                    <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= 1 ? 'var(--green-main)' : 'var(--gray-100)', transition: 'all 0.3s' }} />
                    <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= 2 ? 'var(--green-main)' : 'var(--gray-100)', transition: 'all 0.3s' }} />
                </div>
                
                {step === 1 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        <div>
                            <div style={{ 
                                width: '64px', height: '64px', borderRadius: '20px', 
                                background: 'var(--green-light)', display: 'flex', 
                                alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
                            }}>
                                <Building2 size={28} color="var(--green-main)" />
                            </div>
                            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: 'var(--t1)' }}>Nuevo Establecimiento</h2>
                            <p style={{ fontSize: '15px', color: 'var(--t3)', lineHeight: 1.5 }}>Comienza un nuevo proyecto de gestión rural.</p>
                        </div>

                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--t3)', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>¿Qué nombre tiene?</label>
                            <input 
                                type="text" 
                                value={nombre} 
                                onChange={e => setNombre(e.target.value)} 
                                placeholder="Ej: Estancia El Ceibo" 
                                autoFocus
                                style={{ 
                                    width: '100%', padding: '16px 20px', borderRadius: '16px', 
                                    border: '1px solid var(--border)', fontSize: '16px', 
                                    outline: 'none', background: 'var(--bg-input)', color: 'var(--t1)', 
                                    transition: 'all 0.2s' 
                                }} 
                            />
                        </div>

                        <button 
                            onClick={() => nombre.trim() ? setStep(2) : showToast('Escribí un nombre')}
                            style={{ 
                                width: '100%', padding: '18px', borderRadius: '18px', 
                                background: 'var(--green-main)', color: 'white', fontSize: '16px', 
                                fontWeight: 800, border: 'none', cursor: 'pointer', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                gap: '10px', boxShadow: 'var(--shadow-entrada)'
                            }}
                        >
                            Siguiente paso <ArrowRight size={20} />
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        <div>
                            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', color: 'var(--t1)' }}>¿Cuál es el rubro?</h2>
                            <p style={{ fontSize: '14px', color: 'var(--t3)', lineHeight: 1.5 }}>Elegir el rubro es obligatorio para configurar tus categorías de {nombre}.</p>
                        </div>

                        <div className="custom-scroll" style={{ 
                            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', 
                            gap: '10px', maxHeight: '350px', overflowY: 'auto', 
                            paddingRight: '4px' 
                        }}>
                            {tipos.map(t => {
                                const selected = tipo === t.id;
                                return (
                                    <button 
                                        key={t.id}
                                        onClick={() => setTipo(t.id as TipoProduccion)}
                                        style={{ 
                                            padding: '16px 12px', borderRadius: '20px', 
                                            border: '2px solid',
                                            borderColor: selected ? 'var(--green-main)' : 'var(--border)', 
                                            background: selected ? 'var(--green-light)' : 'var(--white)', 
                                            display: 'flex', flexDirection: 'column', 
                                            alignItems: 'center', gap: '8px', cursor: 'pointer', 
                                            transition: 'all 0.2s', textAlign: 'center', position: 'relative' 
                                        }}
                                    >
                                        <div style={{ 
                                            padding: '8px', borderRadius: '12px', 
                                            background: selected ? 'var(--green-main)' : 'var(--gray-50)',
                                            color: selected ? 'white' : 'var(--t2)'
                                        }}>
                                            <t.icon size={18} />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>{t.label}</p>
                                            <p style={{ fontSize: '10px', color: 'var(--t3)', lineHeight: 1.1 }}>{t.desc}</p>
                                        </div>
                                        {selected && (
                                            <div style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--green-main)' }}>
                                                <Sparkles size={12} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => setStep(1)}
                                style={{ 
                                    flex: 1, padding: '16px', borderRadius: '16px', 
                                    background: 'var(--gray-100)', color: 'var(--t2)', 
                                    fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer' 
                                }}
                            >
                                Atrás
                            </button>
                            <button 
                                onClick={finalizar}
                                disabled={loading || !tipo}
                                style={{ 
                                    flex: 2, padding: '16px', borderRadius: '16px', 
                                    background: tipo ? 'var(--green-main)' : 'var(--gray-200)', 
                                    color: 'white', 
                                    fontSize: '16px', fontWeight: 800, border: 'none', 
                                    cursor: tipo ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    boxShadow: tipo ? 'var(--shadow-entrada)' : 'none'
                                }}
                            >
                                {loading ? <Loader2 className="spinning" size={20} /> : (
                                    <>
                                        Crear proyecto <Sparkles size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
