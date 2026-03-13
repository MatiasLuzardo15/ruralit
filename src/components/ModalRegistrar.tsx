import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, ArrowDownRight, X, Calendar, Edit3, Trash2, ChevronDown, Check, Plus } from 'lucide-react';
import type { Movimiento, Categoria, TipoMovimiento, Moneda } from '../types';
import { dataService } from '../lib/dataService';
import { hoy, MONEDAS } from '../utils/helpers';
import { showToast } from './Toast';
import { useMonedas } from '../utils/useMoneda';

const EMOJIS_RURALES = [
    '🐄', '🐑', '🐖', '🐓', '🐇', '🐎', '🦙', '🐐', '🐟', '🦆',
    '🌾', '🌱', '🌿', '🍃', '🌻', '🌽', '🍎', '🍊', '🥛', '🌰',
    '🚜', '🔧', '🪣', '💡', '🚰', '🏗️', '⛽', '🔩', '🪚', '⚙️',
    '💉', '🐾', '📋', '🏪', '🤝', '💰', '📦', '🛖', '🌡️', '🫘',
];

interface Props {
    tipoInicial: TipoMovimiento;
    onClose: () => void;
    movimientoEditar?: Movimiento;
    onGuardado?: () => void;
}

// ── Currency Toggle Minimal ──
function CurSelector({ value, onChange, allowed }: { value: Moneda; onChange: (m: Moneda) => void; allowed: Moneda[] }) {
    if (allowed.length <= 1) return <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--t3)' }}>{MONEDAS[value].simbolo}</span>;
    return (
        <select value={value} onChange={e => onChange(e.target.value as Moneda)} style={{ appearance: 'none', background: 'transparent', border: 'none', fontSize: '20px', fontWeight: 600, color: 'var(--t2)', outline: 'none', cursor: 'pointer', paddingRight: '16px' }}>
            {allowed.map(c => <option key={c} value={c}>{MONEDAS[c].simbolo} ({c})</option>)}
        </select>
    );
}

export function ModalRegistrar({ tipoInicial, onClose, movimientoEditar, onGuardado }: Props) {
    const { moneda: monedaGlobal, monedasActivas } = useMonedas();
    const [monto, setMonto] = useState('');
    const [moneda, setMoneda] = useState<Moneda>('UYU');

    useEffect(() => {
        if (movimientoEditar?.moneda) {
            setMoneda(movimientoEditar.moneda);
        } else if (monedasActivas.includes(monedaGlobal)) {
            setMoneda(monedaGlobal);
        } else if (monedasActivas.length > 0) {
            setMoneda(monedasActivas[0]);
        }
    }, [movimientoEditar, monedaGlobal, monedasActivas]);
    const [catId, setCatId] = useState<string | number | null>(null);
    const [nota, setNota] = useState('');
    const [fecha, setFecha] = useState(hoy());
    const [cats, setCats] = useState<Categoria[]>([]);
    
    const [saving, setSaving] = useState(false);
    const [showExtras, setShowExtras] = useState(false);
    const [creatingCat, setCreatingCat] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatIcon, setNewCatIcon] = useState('📦');

    const ing = tipoInicial === 'ingreso';
    const esEdit = !!movimientoEditar;
    const colorPrimario = ing ? 'var(--green-main)' : 'var(--red-soft)';

    useEffect(() => {
        const activeId = localStorage.getItem('activeEstDB_uuid');
        if (activeId) {
            dataService.getCategorias(activeId).then(all => {
                setCats(all.filter(c => c.tipo === tipoInicial));
            });
        }

        if (movimientoEditar) {
            setMonto(String(movimientoEditar.monto));
            setMoneda(movimientoEditar.moneda ?? monedaGlobal);
            setCatId(movimientoEditar.categoriaId);
            setNota(movimientoEditar.nota ?? '');
            setFecha(movimientoEditar.fecha);
        } else {
            setMonto('');
            setCatId(null);
        }
    }, [movimientoEditar, tipoInicial, monedaGlobal]);

    const guardar = async () => {
        const m = Number(monto);
        if (!m || catId === null) {
            showToast('Ingresa monto y categoría');
            return;
        }

        const activeId = localStorage.getItem('activeEstDB_uuid');
        if (!activeId) return;

        // ACCIÓN INSTANTÁNEA: Avisamos al usuario y cerramos el modal de inmediato
        const data: Omit<Movimiento, 'id'> = {
            tipo: tipoInicial, monto: m, moneda,
            categoriaId: catId, nota: nota.trim() || undefined,
            fecha, creado_en: new Date().toISOString(),
        };

        // Cerramos el modal primero para dar sensación de velocidad instantánea
        onGuardado?.(); 
        onClose();
        showToast(esEdit ? 'Actualizando...' : 'Registrando...');

        // Ejecutamos la promesa en segundo plano
        (async () => {
            try {
                if (esEdit && movimientoEditar?.id !== undefined) {
                    await dataService.updateMovimiento(String(movimientoEditar.id), data);
                    showToast('¡Listo! Actualizado');
                } else {
                    await dataService.addMovimiento(activeId, data);
                    showToast('¡Listo! Registrado');
                }
                // Notificamos de nuevo por si se necesita refrescar datos frescos
                onGuardado?.();
            } catch (e) {
                console.error(e);
                showToast('Error al guardar en la nube');
            }
        })();
    };

    const handleCreateCat = async () => {
        if (!newCatName.trim()) return;
        const activeId = localStorage.getItem('activeEstDB_uuid');
        if (!activeId) return;

        setSaving(true);
        try {
            const newCat = await dataService.addCategoria(activeId, {
                nombre: newCatName.trim(),
                tipo: tipoInicial,
                icono: newCatIcon,
                esPredefinida: false,
                color: '#999'
            });
            const all = await dataService.getCategorias(activeId);
            setCats(all.filter(c => c.tipo === tipoInicial));
            setCatId(newCat.id!);
            setCreatingCat(false);
            setNewCatName('');
        } catch (e) {
            showToast('Error al crear categoría');
        } finally { setSaving(false); }
    };

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)', padding: '16px' }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content-wide" style={{ background: 'var(--white)', borderRadius: '32px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
                
                {/* ── HEADER ── */}
                <div style={{ padding: '24px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg)', padding: '6px 14px', borderRadius: '16px' }}>
                        {ing ? <ArrowUpRight size={16} color="var(--green-main)" strokeWidth={3} /> : <ArrowDownRight size={16} color="var(--red-soft)" strokeWidth={3} />}
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {esEdit ? 'Editar ' : 'Nueva '}{ing ? 'Entrada' : 'Salida'}
                        </span>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--gray-100)', borderRadius: '50%', padding: '8px', display: 'flex', border: 'none', cursor: 'pointer', color: 'var(--t2)', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='var(--gray-200)'} onMouseOut={e=>e.currentTarget.style.background='var(--gray-100)'}>
                        <X size={16} strokeWidth={2.5} />
                    </button>
                </div>

                <div style={{ padding: '32px', overflowY: 'auto' }}>
                    <div className="modal-main-layout">
                        {/* ── PANEL IZQUIERDO: Datos de la operación ── */}
                        <div className="modal-side-panel">
                            {/* ── MONTO HERO ── */}
                            <div style={{ marginBottom: '40px' }}>
                                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Monto Operación</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', borderBottom: '2px solid var(--border-sm)', paddingBottom: '8px', transition: 'border 0.2s' }}>
                                    <CurSelector value={moneda} onChange={setMoneda} allowed={monedasActivas} />
                                    <input 
                                        type="number" 
                                        autoFocus
                                        value={monto} 
                                        onChange={e => setMonto(e.target.value)} 
                                        placeholder="0.00" 
                                        style={{ flex: 1, background: 'transparent', border: 'none', fontSize: '48px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)', outline: 'none', width: '100%', letterSpacing: '-2px', padding: 0 }} 
                                    />
                                </div>
                            </div>

                            {/* ── NOTA & FECHA FLOTANTE ── */}
                            {showExtras ? (
                                <div style={{ 
                                    background: 'var(--gray-50)', 
                                    borderRadius: '24px', 
                                    padding: '24px', 
                                    marginBottom: '16px',
                                    border: '1px solid var(--border-sm)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '20px'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <Calendar size={14} color="var(--green-main)" strokeWidth={3} />
                                            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha de Operación</label>
                                        </div>
                                        <input 
                                            type="date" 
                                            value={fecha} 
                                            onChange={e=>setFecha(e.target.value)} 
                                            style={{ 
                                                width: '100%', 
                                                border: '1px solid var(--border-sm)', 
                                                background: 'var(--white)', 
                                                borderRadius: '14px', 
                                                padding: '12px 16px', 
                                                fontSize: '14px', 
                                                fontWeight: 600, 
                                                color: 'var(--t1)', 
                                                outline: 'none',
                                                boxShadow: 'var(--shadow-xs)' 
                                            }} 
                                        />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <Edit3 size={14} color="var(--green-main)" strokeWidth={3} />
                                            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Observaciones</label>
                                        </div>
                                        <textarea 
                                            value={nota} 
                                            onChange={e=>setNota(e.target.value)} 
                                            rows={2} 
                                            placeholder="Detalles adicionales..." 
                                            style={{ 
                                                width: '100%', 
                                                border: '1px solid var(--border-sm)', 
                                                background: 'var(--white)', 
                                                borderRadius: '14px', 
                                                padding: '12px 16px', 
                                                fontSize: '14px', 
                                                fontFamily: 'var(--font)', 
                                                fontWeight: 500,
                                                color: 'var(--t1)', 
                                                outline: 'none', 
                                                resize: 'none',
                                                boxShadow: 'var(--shadow-xs)' 
                                            }} 
                                        />
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setShowExtras(true)} 
                                    style={{ 
                                        width: '100%', 
                                        padding: '14px', 
                                        borderRadius: '16px', 
                                        border: '1px solid var(--border-sm)', 
                                        background: 'var(--gray-50)', 
                                        color: 'var(--t2)', 
                                        fontSize: '12px', 
                                        fontWeight: 700, 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: '10px', 
                                        cursor: 'pointer', 
                                        marginBottom: '32px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ background: 'var(--white)', padding: '6px', borderRadius: '8px', display: 'flex', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                        <Plus size={14} color="var(--green-main)" strokeWidth={3} />
                                    </div>
                                    Agregar nota o cambiar fecha
                                </button>
                            )}
                        </div>

                        {/* ── PANEL DERECHO: Cuadrícula de categorías ── */}
                        <div style={{ marginBottom: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clasificación</p>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
                                {cats.map(cat => {
                                    const selected = String(catId) === String(cat.id);
                                    return (
                                        <button 
                                            key={cat.id} 
                                            onClick={() => setCatId(cat.id!)}
                                            style={{ padding: '12px 8px', borderRadius: '16px', border: selected ? `2px solid ${colorPrimario}` : '1px solid var(--border-sm)', background: selected ? (ing ? 'var(--green-light)' : 'var(--bg)') : 'var(--white)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.15s' }}>
                                            <span style={{ fontSize: '20px', filter: 'grayscale(100%)', opacity: selected ? 1 : 0.6 }}>{cat.icono}</span>
                                            <span style={{ fontSize: '12px', fontWeight: selected ? 700 : 600, color: selected ? 'var(--t1)' : 'var(--t2)', textAlign: 'center', lineHeight: 1.2 }}>{cat.nombre}</span>
                                        </button>
                                    );
                                })}
                                
                                {creatingCat ? (
                                    <div style={{ gridColumn: '1 / -1', padding: '16px', borderRadius: '20px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type="text" autoFocus value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="Nombre categoría..." style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-sm)', fontSize: '14px', outline: 'none' }} />
                                            <button onClick={handleCreateCat} style={{ padding: '0 20px', background: 'var(--t1)', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Crear</button>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                                            {EMOJIS_RURALES.map(em => (
                                                <button key={em} onClick={() => setNewCatIcon(em)} style={{ flexShrink: 0, width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', borderRadius: '10px', background: newCatIcon === em ? 'var(--white)' : 'transparent', border: newCatIcon === em ? '1px solid var(--border)' : '1px solid transparent', cursor: 'pointer', transition: 'all 0.15s' }}>
                                                    {em}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setCreatingCat(true)} style={{ padding: '12px 8px', borderRadius: '16px', border: '1px dashed var(--border)', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'background 0.15s' }} onMouseOver={e=>e.currentTarget.style.background='var(--gray-50)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                                        <Plus size={20} color="var(--t3)" />
                                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)' }}>Nueva</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── FOOTER DE ACCIONES ── */}
                <div style={{ padding: '24px 32px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-sm)' }}>
                    {esEdit ? (
                        <button onClick={async () => { if(confirm('¿Seguro que deseas eliminar el registro?')){ await dataService.deleteMovimiento(String(movimientoEditar.id!)); onGuardado?.(); onClose(); } }} style={{ padding: '12px', borderRadius: '12px', background: 'var(--red-light)', color: 'var(--red-soft)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={18} />
                        </button>
                    ) : <div/>}

                    <button onClick={guardar} disabled={saving || !monto || catId === null} style={{ padding: '18px 40px', borderRadius: '20px', background: colorPrimario, color: 'white', fontSize: '15px', fontWeight: 800, border: 'none', cursor: (!monto || catId===null) ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-md)', opacity: (!monto || catId===null) ? 0.5 : 1, transition: 'all 0.2s', width: esEdit ? 'auto' : '100%' }}>
                        {saving ? 'Procesando...' : (esEdit ? 'Guardar Cambios' : 'Confirmar Registro')}
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
}
