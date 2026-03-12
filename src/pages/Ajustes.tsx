import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Pencil, Trash2, Check, X, Settings2, Building2, Coins, LayoutGrid, AlertCircle, ChevronRight, ArrowLeft, User, HelpCircle, Moon, Sun } from 'lucide-react';
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
                        <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Vaca, Soja, Tractor" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border)', fontSize: '15px', outline: 'none', transition: 'border 0.2s', background: 'var(--white)', color: 'var(--t1)' }} />
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

                <button onClick={() => onSave(selected)} style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'var(--green-main)', color: 'var(--white)', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-md)' }}>Aplicar Cambios</button>
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
    const [monedasActivas, setMonedasActivas] = useState<Moneda[]>(['UYU']);
    const [activeTab, setActiveTab] = useState<TabKey>('establecimiento');
    
    // Modals state
    const [showCatModal, setShowCatModal] = useState<'add' | 'edit' | false>(false);
    const [editCatData, setEditCatData] = useState<Categoria | undefined>();
    const [showCurModal, setShowCurModal] = useState(false);

    // Mobile Navigation state
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [mobileView, setMobileView] = useState<'menu' | 'detail'>('menu');
    const [mobileDetailType, setMobileDetailType] = useState<string | null>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const cargar = async () => {
        setCats(await db.categorias.orderBy('nombre').toArray());
        const n = await db.config.get('nombreEstablecimiento');
        if (n) setNombre(n.valor as string);
        const u = await db.config.get('nombreUsuario');
        if (u) setNombreUsuario(u.valor as string);
        const m = await db.config.get('monedasActivas');
        if (m && Array.isArray(m.valor)) setMonedasActivas(m.valor as Moneda[]);
        const t = await db.config.get('tema');
        if (t?.valor === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
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

    const toggleTema = async () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const nuevo = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', nuevo);
        await db.config.put({ clave: 'tema', valor: nuevo });
        showToast(`Modo ${nuevo === 'dark' ? 'oscuro' : 'claro'} activado`);
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
                            <input type="text" value={nombreUsuario} onChange={e => setNombreUsuario(e.target.value)} placeholder="Tu Nombre (Ej: Matías)" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', background: 'var(--white)', color: 'var(--t1)' }} />
                            <input type="text" value={nombreEstab} onChange={e => setNombre(e.target.value)} placeholder="Nombre Comercial (Ej: La Esmeralda)" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', background: 'var(--white)', color: 'var(--t1)' }} />
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
                            <h3>Apariencia</h3>
                            <p>Elegí el estilo visual que más te guste.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={toggleTema}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', borderRadius: '16px', background: 'var(--white)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 700, color: 'var(--t1)' }}
                            >
                                {typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark' ? (
                                    <><Sun size={18} /> Cambiar a Modo Claro</>
                                ) : (
                                    <><Moon size={18} /> Cambiar a Modo Oscuro</>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="settings-grid-row">
                        <div className="settings-row-info">
                            <h3>Configuración del Sistema</h3>
                            <p>Gestión avanzada y próximas funcionalidades del núcleo.</p>
                        </div>
                        <div style={{ background: 'var(--bg)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-sm)', width: '100%' }}>
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

    const renderMobileMenu = () => {
        const groups = [
            {
                title: 'CUENTA',
                items: [
                    { id: 'perfil', label: 'Información del Perfil', icon: User, tab: 'establecimiento' as TabKey },
                    { id: 'cambio', label: 'Cambio de Establecimiento', icon: Building2, tab: 'establecimiento' as TabKey }
                ]
            },
            {
                title: 'PREFERENCIAS',
                items: [
                    { id: 'divisas', label: 'Monedas y Divisas', icon: Coins, tab: 'divisas' as TabKey },
                    { id: 'entradas', label: 'Categorías de Entradas', icon: LayoutGrid, tab: 'entradas' as TabKey },
                    { id: 'salidas', label: 'Categorías de Salidas', icon: LayoutGrid, tab: 'salidas' as TabKey }
                ]
            },
            {
                title: 'SOPORTE',
                items: [
                    { id: 'sistema', label: 'Sistema', icon: Settings2, tab: 'sistema' as TabKey },
                    { id: 'ayuda', label: 'Centro de Ayuda', icon: HelpCircle, tab: 'sistema' as TabKey }
                ]
            }
        ];

        return (
            <div style={{ padding: '0 24px 100px', background: 'var(--beige-bg)', minHeight: '100vh' }}>
                <div style={{ padding: '40px 0 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--t1)', letterSpacing: '-1px' }}>Ajustes Generales</h1>
                </div>

                {groups.map(group => (
                    <div key={group.title} style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--t3)', letterSpacing: '0.8px', marginBottom: '16px', paddingLeft: '8px' }}>{group.title}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {group.items.map((item, idx) => (
                                <div key={item.id}>
                                    <button 
                                        onClick={() => {
                                            setActiveTab(item.tab!);
                                            setMobileDetailType(item.id);
                                            setMobileView('detail');
                                        }}
                                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <item.icon size={20} color="var(--t1)" strokeWidth={1.5} />
                                            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--t1)' }}>{item.label}</span>
                                        </div>
                                        <ChevronRight size={18} color="var(--t3)" strokeWidth={2.5} />
                                    </button>
                                    {idx < group.items.length - 1 && (
                                        <div style={{ height: '1px', background: 'var(--border-rgba)', margin: '0 8px' }}></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div style={{ marginTop: '20px', padding: '0 8px' }}>
                    <button 
                        onClick={guardarNombre}
                        style={{ width: '100%', padding: '18px', borderRadius: '40px', background: 'var(--bg-card)', color: 'var(--t1)', border: '2px solid var(--t1)', fontSize: '15px', fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                        Guardar Cambios
                    </button>
                    <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--t3)', marginTop: '20px', fontWeight: 600 }}>Ruralit v5.2.0 • Agro Edition</p>
                </div>
            </div>
        );
    };

    if (isMobile && mobileView === 'menu') {
        return (
            <div style={{ background: 'var(--beige-bg)', minHeight: '100vh' }}>
                {renderMobileMenu()}
                {/* Modals */}
                {showCatModal && <CatModal mode={showCatModal} initData={editCatData as CatForm} onClose={() => setShowCatModal(false)} onSave={handleSaveCat} />}
                {showCurModal && <CurrencyModal current={monedasActivas} onClose={() => setShowCurModal(false)} onSave={handleSaveCur} />}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: '40px', background: isMobile ? 'var(--beige-bg)' : 'transparent' }}>
            {isMobile ? (
                <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--beige-bg)' }}>
                    <button onClick={() => setMobileView('menu')} style={{ background: 'var(--bg-card)', borderRadius: '50%', padding: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowLeft size={18} color="var(--t1)" />
                    </button>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--t1)' }}>
                        {mobileDetailType === 'perfil' ? 'Perfil' : 
                         mobileDetailType === 'cambio' ? 'Establecimientos' :
                         mobileDetailType === 'divisas' ? 'Monedas' :
                         activeTab === 'entradas' ? 'Categorías' :
                         activeTab === 'salidas' ? 'Categorías' : 'Ajustes'}
                    </h2>
                </div>
            ) : (
                <TopBar 
                    title="" 
                    heading="Ajustes Generales" 
                    subtitle="Gestión de preferencias del sistema"
                    hideCurrencyToggle={true}
                />
            )}
            
            <div className="page-content" style={{ margin: '0 auto', width: '100%', paddingTop: isMobile ? '16px' : '0' }}>
                <div className={isMobile ? "" : "settings-card"} style={{ paddingTop: isMobile ? '0' : '16px' }}>
                    {!isMobile && renderNav()}
                    <div style={{ padding: isMobile ? '0 8px' : '0' }}>
                        {/* If mobile, we might want to filter what we show within establishment tab */}
                        {isMobile && activeTab === 'establecimiento' ? (
                            mobileDetailType === 'perfil' ? (
                                <div className="settings-grid-row" style={{ gridTemplateColumns: '1fr', border: 'none' }}>
                                    <div className="settings-row-info">
                                        <h3>Información del Perfil</h3>
                                        <p>Actualiza tu nombre y comercio.</p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                        <input type="text" value={nombreUsuario} onChange={e => setNombreUsuario(e.target.value)} placeholder="Tu Nombre" style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '15px', background: 'var(--white)', color: 'var(--t1)' }} />
                                        <input type="text" value={nombreEstab} onChange={e => setNombre(e.target.value)} placeholder="Nombre Comercial" style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '15px', background: 'var(--white)', color: 'var(--t1)' }} />
                                        <button className="btn-primary" onClick={guardarNombre} style={{ marginTop: '12px', padding: '16px', borderRadius: '14px' }}>Actualizar Perfil</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="settings-grid-row" style={{ gridTemplateColumns: '1fr', border: 'none' }}>
                                    <div className="settings-row-info">
                                        <h3>Establecimiento Activo</h3>
                                        <p>Cambia o crea uno nuevo.</p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {estabsList.map(est => (
                                            <div 
                                                key={est.id} 
                                                onClick={() => cambiarEstablecimiento(est.id)}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '16px', border: est.id === activeEstId ? '2px solid var(--green-main)' : '1px solid var(--border)', background: 'white' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <Building2 size={20} color={est.id === activeEstId ? 'var(--green-main)' : 'var(--t3)'} />
                                                    <span style={{ fontWeight: 700, color: 'var(--t1)' }}>{est.nombre}</span>
                                                </div>
                                                {est.id === activeEstId && <Check size={16} color="var(--green-main)" />}
                                            </div>
                                        ))}
                                        <button onClick={crearNuevoEstablecimiento} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', borderRadius: '16px', border: '1px dashed var(--t3)', background: 'transparent', color: 'var(--t3)', fontWeight: 600, justifyContent: 'center' }}>
                                            <Plus size={16} /> Nuevo Establecimiento
                                        </button>
                                    </div>
                                </div>
                            )
                        ) : renderContent()}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showCatModal && <CatModal mode={showCatModal} initData={editCatData as CatForm} onClose={() => setShowCatModal(false)} onSave={handleSaveCat} />}
            {showCurModal && <CurrencyModal current={monedasActivas} onClose={() => setShowCurModal(false)} onSave={handleSaveCur} />}
        </div>
    );
}
