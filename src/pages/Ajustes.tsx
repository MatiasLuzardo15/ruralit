import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Pencil, Trash2, Check, X, Settings2, Building2, Coins, LayoutGrid, AlertCircle } from 'lucide-react';
import type { Categoria, TipoMovimiento, Moneda } from '../types';
import db from '../db/database';
import { showToast } from '../components/Toast';
import { TopBar } from '../components/TopBar';
import { MONEDAS } from '../utils/helpers';

const EMOJIS_RURALES = [
    '🐄', '🐑', '🐖', '🐓', '🐇', '🐎', '🦙', '🐐', '🐟', '🦆',
    '🌾', '🌱', '🌿', '🍃', '🌻', '🌽', '🍎', '🍊', '🥛', '🌰',
    '🚜', '🔧', '🪣', '💡', '🚰', '🏗️', '⛽', '🔩', '🪚', '⚙️',
    '💉', '🐾', '📋', '🏪', '🤝', '💰', '📦', '🛖', '🌡️', '🫘',
];

interface CatForm { nombre: string; tipo: TipoMovimiento; icono: string; }

// ── Modals ──────────────────────────────────────────────────
function CatModal({ mode, initData, onClose, onSave }: { mode: 'add' | 'edit', initData?: CatForm, onClose: () => void, onSave: (data: CatForm) => Promise<void> }) {
    const [form, setForm] = useState<CatForm>(initData || { nombre: '', tipo: 'ingreso', icono: '🐄' });
    
    return createPortal(
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-panel" style={{ borderRadius: '32px', padding: '32px', width: '100%', maxWidth: '440px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)' }}>{mode === 'add' ? 'Añadir Categoría' : 'Editar Categoría'}</h3>
                    <button onClick={onClose} style={{ background: 'var(--gray-100)', borderRadius: '50%', padding: '8px', display: 'flex', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {mode === 'add' && (
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t2)', marginBottom: '8px', display: 'block' }}>Clasificación</label>
                            <div style={{ display: 'flex', gap: '8px', background: 'var(--gray-100)', padding: '6px', borderRadius: '16px' }}>
                                <button
                                    onClick={() => setForm(f => ({ ...f, tipo: 'ingreso' }))}
                                    style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s', background: form.tipo === 'ingreso' ? 'var(--white)' : 'transparent', color: form.tipo === 'ingreso' ? 'var(--green-main)' : 'var(--t3)', boxShadow: form.tipo === 'ingreso' ? 'var(--shadow-xs)' : 'none', border: 'none', cursor: 'pointer' }}>
                                    Entrada
                                </button>
                                <button
                                    onClick={() => setForm(f => ({ ...f, tipo: 'gasto' }))}
                                    style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s', background: form.tipo === 'gasto' ? 'var(--white)' : 'transparent', color: form.tipo === 'gasto' ? 'var(--red-soft)' : 'var(--t3)', boxShadow: form.tipo === 'gasto' ? 'var(--shadow-xs)' : 'none', border: 'none', cursor: 'pointer' }}>
                                    Salida
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t2)', marginBottom: '8px', display: 'block' }}>Nombre</label>
                        <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Vaca, Soja, Tractor" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border)', fontSize: '15px', outline: 'none', transition: 'border 0.2s' }} />
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t2)', marginBottom: '8px', display: 'block' }}>Ícono Visual</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
                            {EMOJIS_RURALES.map(e => (
                                <button key={e} onClick={() => setForm(f => ({ ...f, icono: e }))} style={{ fontSize: '24px', padding: '8px', borderRadius: '12px', background: form.icono === e ? 'var(--green-light)' : 'var(--gray-50)', border: form.icono === e ? '2px solid var(--green-main)' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s' }}>
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={() => onSave(form)}
                        style={{ width: '100%', padding: '16px', borderRadius: '16px', background: form.tipo === 'ingreso' ? 'var(--green-main)' : 'var(--red-soft)', color: 'white', fontSize: '15px', fontWeight: 700, marginTop: '8px', border: 'none', cursor: 'pointer', boxShadow: form.tipo === 'ingreso' ? 'var(--shadow-entrada)' : 'var(--shadow-salida)' }}>
                        Guardar Categoría
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function CurrencyModal({ current, onClose, onSave }: { current: Moneda[], onClose: () => void, onSave: (codes: Moneda[]) => Promise<void> }) {
    const [selected, setSelected] = useState<Moneda[]>(current);

    const toggle = (code: Moneda) => {
        if (selected.includes(code)) {
            if (selected.length === 1) return showToast('Mínimo 1 moneda obligatoria.');
            setSelected(selected.filter(c => c !== code));
        } else {
            if (selected.length >= 2) return showToast('Máximo 2 monedas permitidas.');
            setSelected([...selected, code]);
        }
    };

    return createPortal(
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-panel" style={{ borderRadius: '32px', padding: '32px', width: '100%', maxWidth: '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)' }}>Configurar Divisas</h3>
                    <button onClick={onClose} style={{ background: 'var(--gray-100)', borderRadius: '50%', padding: '8px', display: 'flex', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--t3)', marginBottom: '24px' }}>Seleccioná hasta 2 monedas en las que quieres gestionar tu negocio.</p>
                
                <div className="custom-scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '32px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '8px', paddingBottom: '8px' }}>
                    {(Object.keys(MONEDAS) as Moneda[]).map(code => {
                        const active = selected.includes(code);
                        return (
                            <div key={code} onClick={() => toggle(code)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '16px', border: active ? '2px solid var(--green-main)' : '1px solid var(--border)', background: active ? 'var(--green-light)' : 'var(--white)', cursor: 'pointer', transition: 'all 0.2s', minWidth: '0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '0' }}>
                                    <span style={{ fontSize: '24px', flexShrink: 0 }}>{MONEDAS[code].flag}</span>
                                    <div style={{ minWidth: '0', overflow: 'hidden' }}>
                                        <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{MONEDAS[code].label}</p>
                                        <p style={{ fontSize: '13px', color: 'var(--t3)', display: 'flex', gap: '6px' }}><strong>{code}</strong> <span>{MONEDAS[code].simbolo}</span></p>
                                    </div>
                                </div>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: active ? 'none' : '2px solid var(--gray-200)', background: active ? 'var(--green-main)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {active && <Check size={14} color="white" strokeWidth={3} />}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button onClick={() => onSave(selected)} style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'var(--t1)', color: 'white', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-md)' }}>Aplicar Cambios</button>
            </div>
        </div>,
        document.body
    );
}

// ── Components ─────────────────────────────────────────────
type TabKey = 'establecimiento' | 'divisas' | 'entradas' | 'salidas' | 'sistema';

export function Ajustes() {
    const [cats, setCats] = useState<Categoria[]>([]);
    const [nombreEstab, setNombre] = useState('');
    const [nombreUsuario, setNombreUsuario] = useState('');
    const [monedasActivas, setMonedasActivas] = useState<Moneda[]>(['ARS']);
    const [activeTab, setActiveTab] = useState<TabKey>('establecimiento');
    
    // Modals state
    const [showCatModal, setShowCatModal] = useState<'add' | 'edit' | false>(false);
    const [editCatData, setEditCatData] = useState<Categoria | undefined>();
    const [showCurModal, setShowCurModal] = useState(false);

    const cargar = async () => {
        setCats(await db.categorias.orderBy('nombre').toArray());
        const n = await db.config.get('nombreEstablecimiento');
        if (n) setNombre(n.valor as string);
        const u = await db.config.get('nombreUsuario');
        if (u) setNombreUsuario(u.valor as string);
        const m = await db.config.get('monedasActivas');
        if (m && Array.isArray(m.valor)) setMonedasActivas(m.valor as Moneda[]);
    };

    useEffect(() => { void cargar(); }, []);

    const guardarNombre = async () => {
        await db.config.put({ clave: 'nombreEstablecimiento', valor: nombreEstab });
        await db.config.put({ clave: 'nombreUsuario', valor: nombreUsuario });
        try {
            const activeId = localStorage.getItem('activeEstDB') || 'RuralitDB';
            const estabs = JSON.parse(localStorage.getItem('ruralit_establecimientos') || '[]');
            const updated = estabs.map((e: any) => e.id === activeId ? { ...e, nombre: nombreEstab } : e);
            localStorage.setItem('ruralit_establecimientos', JSON.stringify(updated));
        } catch (e) {}
        showToast('Datos actualizados');
    };

    const handleSaveCat = async (data: CatForm) => {
        if (!data.nombre.trim()) return showToast('Escribí un nombre');
        
        if (showCatModal === 'edit' && editCatData) {
            await db.categorias.update(editCatData.id!, { nombre: data.nombre.trim(), icono: data.icono });
            showToast('Categoría actualizada');
        } else {
            await db.categorias.add({
                nombre: data.nombre.trim(), tipo: data.tipo, icono: data.icono,
                color: data.tipo === 'ingreso' ? '#16a34a' : '#dc2626', esPredefinida: false,
            });
            showToast('Categoría creada');
        }
        setShowCatModal(false);
        void cargar();
    };

    const handleSaveCur = async (selected: Moneda[]) => {
        setMonedasActivas(selected);
        await db.config.put({ clave: 'monedasActivas', valor: selected });
        showToast('Divisas actualizadas');
        setShowCurModal(false);
    };

    const eliminarCat = async (cat: Categoria) => {
        const usos = await db.movimientos.where('categoriaId').equals(cat.id!).count();
        if (usos > 0) return showToast(`Usada en ${usos} movimientos, no se puede eliminar`);
        await db.categorias.delete(cat.id!);
        showToast('Eliminada'); 
        void cargar();
    };

    let estabsList = [{ id: 'RuralitDB', nombre: 'Mi Establecimiento' }];
    try { estabsList = JSON.parse(localStorage.getItem('ruralit_establecimientos') || '[]'); } catch(e){}
    const activeEstId = localStorage.getItem('activeEstDB') || 'RuralitDB';

    const cambiarEstablecimiento = (id: string) => {
        if (id === activeEstId) return;
        localStorage.setItem('activeEstDB', id);
        window.location.reload();
    };

    const crearNuevoEstablecimiento = () => {
        const nuevoNombre = prompt('Ingresá el nombre del nuevo establecimiento:');
        if (!nuevoNombre || !nuevoNombre.trim()) return;
        
        const newId = 'RuralitDB_' + Date.now();
        const nuevaLista = [...estabsList, { id: newId, nombre: nuevoNombre.trim() }];
        localStorage.setItem('ruralit_establecimientos', JSON.stringify(nuevaLista));
        
        localStorage.setItem('activeEstDB', newId);
        window.location.reload();
    };

    const renderNav = () => {
        const NAV_ITEMS: { id: TabKey, label: string }[] = [
            { id: 'establecimiento', label: 'Establecimiento' },
            { id: 'divisas', label: 'Monedas' },
            { id: 'entradas', label: 'Entradas' },
            { id: 'salidas', label: 'Salidas' },
            { id: 'sistema', label: 'Sistema' }
        ];

        return (
            <div className="settings-nav">
                {NAV_ITEMS.map(item => (
                    <button 
                        key={item.id} 
                        onClick={() => setActiveTab(item.id)}
                        className={`settings-nav-item ${activeTab === item.id ? 'active' : ''}`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
        );
    };

    const renderContent = () => {
        const entradas = cats.filter(c => c.tipo === 'ingreso');
        const salidas = cats.filter(c => c.tipo === 'gasto');

        const catRow = (cat: Categoria, mainColor: string, isIngreso: boolean) => (
            <div key={cat.id} className="settings-table-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="settings-table-icon" style={{ background: mainColor }}>
                        <span style={{ filter: 'grayscale(0.5) contrast(1.2)' }}>{cat.icono}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)' }}>{cat.nombre}</p>
                        {cat.esPredefinida && <span className="badge-system">Sistema</span>}
                    </div>
                </div>
                <div className="settings-row-actions">
                    <button onClick={() => { setEditCatData(cat); setShowCatModal('edit'); }} title="Editar">
                        <Pencil size={14} />
                    </button>
                    {!cat.esPredefinida && (
                        <button onClick={() => eliminarCat(cat)} style={{ color: 'var(--red-soft)' }} title="Eliminar">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>
        );

        if (activeTab === 'establecimiento') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="settings-grid-row">
                        <div className="settings-row-info">
                            <h3>Información del Perfil</h3>
                            <p>Actualiza la información pública de tu cuenta.</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                            <input type="text" value={nombreUsuario} onChange={e => setNombreUsuario(e.target.value)} placeholder="Tu Nombre (Ej: Matías)" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', background: 'var(--white)' }} />
                            <input type="text" value={nombreEstab} onChange={e => setNombre(e.target.value)} placeholder="Nombre Comercial (Ej: La Esmeralda)" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', background: 'var(--white)' }} />
                        </div>
                    </div>

                    <div className="settings-grid-row">
                        <div className="settings-row-info">
                            <h3>Cambio de Establecimiento</h3>
                            <p>Cambia entre tus diferentes unidades de negocio o crea una nueva.</p>
                        </div>
                        <div>
                            <div className="settings-visual-grid">
                                {estabsList.map(est => (
                                    <div 
                                        key={est.id} 
                                        onClick={() => cambiarEstablecimiento(est.id)}
                                        className={`settings-visual-card ${est.id === activeEstId ? 'active' : ''}`}
                                    >
                                        <div className="settings-visual-img">
                                            <Building2 size={32} color={est.id === activeEstId ? 'var(--green-main)' : 'var(--t3)'} strokeWidth={1.5} />
                                            {est.id === activeEstId && (
                                                <div className="settings-visual-check">
                                                    <Check size={12} color="white" strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="settings-visual-info">
                                            <h4>{est.nombre}</h4>
                                            <p>{est.id === activeEstId ? 'Activo actualmente' : 'Presiona para entrar'}</p>
                                        </div>
                                    </div>
                                ))}
                                <div 
                                    onClick={crearNuevoEstablecimiento}
                                    className="settings-visual-card"
                                    style={{ borderStyle: 'dashed' }}
                                >
                                    <div className="settings-visual-img">
                                        <Plus size={32} color="var(--t3)" strokeWidth={1.5} />
                                    </div>
                                    <div className="settings-visual-info">
                                        <h4>Nuevo</h4>
                                        <p>Crear establecimiento</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="settings-actions">
                        <button className="btn-secondary">Cancelar</button>
                        <button className="btn-primary" onClick={guardarNombre}>Guardar Cambios</button>
                    </div>
                </div>
            );
        }

        if (activeTab === 'divisas') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="settings-grid-row">
                        <div className="settings-row-info">
                            <h3>Monedas del Negocio</h3>
                            <p>Configura las divisas principales para tus registros y reportes.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {monedasActivas.map((code, index) => (
                                    <div key={code} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'var(--white)', borderRadius: '8px', border: '1px solid var(--border-sm)', minWidth: '140px' }}>
                                        <div style={{ fontSize: '20px', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {MONEDAS[code].flag}
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', lineHeight: 1.2 }}>{code}</p>
                                            <p style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 500 }}>{index === 0 ? 'Principal' : 'Secundaria'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setShowCurModal(true)}>
                                    <Pencil size={14} /> Cambiar Divisas
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeTab === 'entradas' || activeTab === 'salidas') {
            const isIngreso = activeTab === 'entradas';
            const list = isIngreso ? entradas : salidas;
            const mainColor = isIngreso ? 'var(--green-light)' : 'var(--red-light)';
            
            return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="settings-grid-row" style={{ gridTemplateColumns: '1fr', paddingBottom: '0', borderBottom: 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                            <div className="settings-row-info">
                                <h3>Categorías de {isIngreso ? 'Ingresos' : 'Egresos'}</h3>
                                <p>Organiza tus movimientos con etiquetas personalizadas.</p>
                            </div>
                            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => { setEditCatData({ nombre: '', tipo: isIngreso ? 'ingreso' : 'gasto', icono: '🐄' } as Categoria); setShowCatModal('add'); }}>
                                <Plus size={14} /> Añadir Categoría
                            </button>
                        </div>
                    </div>
                    
                    <div style={{ border: '1px solid var(--border-sm)', borderRadius: '12px', overflow: 'hidden', background: 'var(--white)', marginBottom: '24px' }}>
                        {list.length === 0 ? (
                            <div style={{ padding: '60px 40px', textAlign: 'center', background: 'var(--white)' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                    <LayoutGrid size={20} color="var(--t3)" />
                                </div>
                                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--t1)', marginBottom: '4px' }}>No hay categorías</h4>
                                <p style={{ fontSize: '13px', color: 'var(--t3)', marginBottom: '20px' }}>Comienza creando tu primera etiqueta para organizar tus finanzas.</p>
                                <button className="btn-secondary" onClick={() => { setEditCatData({ nombre: '', tipo: isIngreso ? 'ingreso' : 'gasto', icono: '🐄' } as Categoria); setShowCatModal('add'); }}>
                                    Crear Categoría
                                </button>
                            </div>
                        ) : (
                            list.map(c => catRow(c, mainColor, isIngreso))
                        )}
                    </div>
                </div>
            );
        }

        if (activeTab === 'sistema') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="settings-grid-row">
                        <div className="settings-row-info">
                            <h3>Configuración del Sistema</h3>
                            <p>Gestión avanzada y próximas funcionalidades del núcleo.</p>
                        </div>
                        <div style={{ background: 'var(--bg)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-sm)' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Settings2 size={16} /> RoadMap de Desarrollo</h4>
                            <p style={{ fontSize: '14px', color: 'var(--t3)', lineHeight: 1.6, marginBottom: '12px' }}>Ruralit utiliza el motor IndexedDB para ofrecer una experiencia offline fluida.</p>
                            <ul style={{ fontSize: '13px', color: 'var(--t3)', paddingLeft: '20px', lineHeight: 1.8 }}>
                                <li>Nube y Sincronización Multi-dispositivo</li>
                                <li>Adjuntos Fotográficos en Tickets</li>
                                <li>Exportación de Reportes Tributarios</li>
                            </ul>
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: '40px' }}>
            <TopBar 
                title="" 
                heading="Ajustes Generales" 
                subtitle="Gestión de preferencias del sistema"
                hideCurrencyToggle={true}
            />
            <div className="page-content" style={{ margin: '0 auto', width: '100%', paddingTop: '0' }}>
                <div className="settings-card" style={{ paddingTop: '16px' }}>
                    {renderNav()}
                    {renderContent()}
                </div>
            </div>

            {/* Modals */}
            {showCatModal && <CatModal mode={showCatModal} initData={editCatData as CatForm} onClose={() => setShowCatModal(false)} onSave={handleSaveCat} />}
            {showCurModal && <CurrencyModal current={monedasActivas} onClose={() => setShowCurModal(false)} onSave={handleSaveCur} />}
        </div>
    );
}
