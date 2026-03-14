import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { createPortal } from 'react-dom';
import { Plus, Pencil, Trash2, Check, X, Settings2, Building2, Coins, LayoutGrid, AlertCircle, ChevronRight, ArrowLeft, ArrowUpRight, ArrowDownLeft, User, HelpCircle, Moon, Sun, Cloud, CloudOff, LogOut, Loader2, TrendingUp, Milk, Sprout, Download, FileText } from 'lucide-react';
import { exportarACSV, exportarAPDF } from '../utils/exportUtils';
import type { Categoria, TipoMovimiento, Moneda, Establecimiento } from '../types';
import { MONEDAS } from '../utils/helpers';
import { dataService } from '../lib/dataService';
import { useMonedas } from '../utils/useMoneda';
import { type TipoProduccion, inicializarCategorias } from '../db/database';
import { showToast } from '../components/Toast';
import { TopBar } from '../components/TopBar';
import { ModalNuevoEstablecimiento } from '../components/ModalNuevoEstablecimiento';

const CATEGORY_ICONS = [
    '🐄', '🌾', '🚜', '💰', '📉', '📈', '📦', '🛒', '🔧', '⛽',
    '🌽', '🍎', '🥛', '🧀', '🥩', '🐑', '🐖', '🐓', '🐎', '🌳',
    '🏠', '🛖', '🏗️', '🛠️', '⚙️', '🖇️', '📋', '📅', '💡', '🤝'
];

const AVATAR_OPTIONS = [
    '👨‍🌾', '👩‍🌾', '🤠', '🧔', '👩', '👨', '🧑‍🌾', '👷', '👨‍🔧', '🕵️',
    '🌵', '🌊', '🏔️', '🏕️', '🧉', '🐕', '🏇', '🦊', '🦉', '✨',
    '👔', '🧑‍💼', '👩‍💼', '🧥', '🧢', '🕶️', '🏠', '🚀', '⭐', '🚜'
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
                            {CATEGORY_ICONS.map(e => (
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
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0, color: 'var(--t2)' }}>{code}</div>
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
type TabKey = 'perfil' | 'establecimiento' | 'divisas' | 'entradas' | 'salidas' | 'seguridad' | 'sistema';

interface AjustesProps {
    user?: SupabaseUser | null;
}

export function Ajustes({ user }: AjustesProps) {
    const [cats, setCats] = useState<Categoria[]>([]);
    const [nombreEstab, setNombre] = useState('');
    const [nombreUsuario, setNombreUsuario] = useState('');
    const [avatarEmoji, setAvatarEmoji] = useState('👨‍🌾');
    const [monedasActivas, setMonedasActivas] = useState<Moneda[]>(['UYU']);
    const [tipoProduccion, setTipoProduccion] = useState<TipoProduccion>('Ganadería');
    const [activeTab, setActiveTab] = useState<TabKey>('establecimiento');
    const [saving, setSaving] = useState(false);

    // States for multi-establishment
    const [activeEstId, setActiveEstId] = useState<string | null>(localStorage.getItem('activeEstDB_uuid'));
    const [estabsList, setEstabsList] = useState<Establecimiento[]>([]);

    // Modals state
    const [showCatModal, setShowCatModal] = useState<'add' | 'edit' | false>(false);
    const [editCatData, setEditCatData] = useState<Categoria | undefined>();
    const [showCurModal, setShowCurModal] = useState(false);

    // Mobile Navigation state
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [mobileView, setMobileView] = useState<'menu' | 'detail'>('menu');
    const [mobileDetailType, setMobileDetailType] = useState<string | null>(null);

    const [showNewEstabModal, setShowNewEstabModal] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [loadingData, setLoadingData] = useState(true);

    const cargar = async () => {
        let activeId = localStorage.getItem('activeEstDB_uuid');

        // Si no hay ID en localStorage, intentamos obtenerlo de Supabase
        if (!activeId) {
            const activeEstab = await dataService.getEstablecimientoActivo();
            if (activeEstab) {
                activeId = String(activeEstab.id);
            }
        }

        if (!activeId) {
            setLoadingData(false);
            return;
        }
        setActiveEstId(activeId);

        try {
            // Limpiamos estados antes de cargar para evitar "fantasmas"
            setNombre('');
            setTipoProduccion('Ganadería');

            const [catsData, prof, estab, monedas, allEstabs] = await Promise.all([
                dataService.getCategorias(activeId),
                dataService.getProfile(),
                dataService.getEstablecimientoActivo(),
                dataService.getMonedasActivas(activeId),
                dataService.getEstablecimientos()
            ]);

            setCats(catsData);
            setEstabsList(allEstabs);
            if (prof) {
                setNombreUsuario(prof.username || '');
                setAvatarEmoji(prof.avatar_url || '👨‍🌾');
            }
            if (estab) {
                setNombre(estab.nombre);
                // Aseguramos que el tipo coincida exactamente con las opciones o sea Ganadería
                const tipoValidado = (estab.tipo_produccion || 'Ganadería') as TipoProduccion;
                setTipoProduccion(tipoValidado);
            }
            if (monedas) {
                setMonedasActivas(monedas);
            }
        } catch (e) {
            console.error('Error cargando ajustes:', e);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        void cargar();

        const handleProfileUpdate = () => {
            void cargar();
        };
        window.addEventListener('ruralit_profile_updated', handleProfileUpdate);
        return () => window.removeEventListener('ruralit_profile_updated', handleProfileUpdate);
    }, []);

    const logout = async () => {
        if (confirm('¿Cerrar sesión? Se limpiará la memoria local.')) {
            setSaving(true);
            try {
                await supabase.auth.signOut();
                localStorage.removeItem('activeEstDB_uuid');
                showToast('Sesión cerrada');
                setTimeout(() => { window.location.href = '/'; }, 1000);
            } catch (error) {
                showToast('Error al cerrar sesión');
            } finally {
                setSaving(false);
            }
        }
    };

    const guardarPerfil = async () => {
        setSaving(true);
        try {
            await dataService.updateProfile(nombreUsuario, avatarEmoji);
            showToast('Perfil actualizado');
        } catch (e) {
            showToast('Error al guardar perfil');
        } finally {
            setSaving(false);
        }
    };

    const guardarEstablecimiento = async () => {
        setSaving(true);
        const activeId = localStorage.getItem('activeEstDB_uuid');
        if (!activeId) return;

        try {
            await dataService.updateEstablecimiento(activeId, {
                nombre: nombreEstab,
                tipo_produccion: tipoProduccion
            });
            showToast('Establecimiento actualizado');
            // Recargamos los datos para asegurar sincronía
            void cargar();
        } catch (e) {
            showToast('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveCat = async (data: CatForm) => {
        if (!data.nombre.trim()) return showToast('Escribí un nombre');
        const activeId = localStorage.getItem('activeEstDB_uuid');
        if (!activeId) return;

        if (showCatModal === 'edit' && editCatData) {
            await dataService.updateCategoria(String(editCatData.id), {
                nombre: data.nombre.trim(),
                icono: data.icono
            });
            showToast('Categoría actualizada');
        } else {
            await dataService.addCategoria(activeId, {
                nombre: data.nombre.trim(),
                tipo: data.tipo,
                icono: data.icono,
                color: data.tipo === 'ingreso' ? '#16a34a' : '#dc2626',
                esPredefinida: false
            });
            showToast('Categoría creada');
        }
        setShowCatModal(false);
        void cargar();
    };

    const handleSaveCur = async (selected: Moneda[]) => {
        const activeId = localStorage.getItem('activeEstDB_uuid');
        if (!activeId) return;

        setSaving(true);
        try {
            await dataService.updateMonedasActivas(activeId, selected);
            setMonedasActivas(selected);
            showToast('Divisas actualizadas');
            setShowCurModal(false);

            const currentView = localStorage.getItem('ruralia_moneda_view') as Moneda;
            if (!selected.includes(currentView)) {
                localStorage.setItem('ruralia_moneda_view', selected[0]);
                window.dispatchEvent(new CustomEvent('moneda_changed', { detail: selected[0] }));
            }
        } catch (e) {
            showToast('Error al actualizar divisas');
        } finally {
            setSaving(false);
        }
    };

    const eliminarCat = async (cat: Categoria) => {
        if (confirm('¿Deseas eliminar esta categoría?')) {
            await dataService.deleteCategoria(String(cat.id || ''));
            showToast('Eliminada');
            void cargar();
        }
    };

    const cambiarEstablecimiento = (id: string) => {
        if (id === activeEstId) return;
        dataService.clearCache();
        localStorage.setItem('activeEstDB_uuid', id);
        setActiveEstId(id);
        void cargar();
    };

    const crearNuevoEstablecimiento = () => {
        setShowNewEstabModal(true);
    };

    const handleNewEstabSuccess = (id: string) => {
        setShowNewEstabModal(false);
        dataService.clearCache();
        localStorage.setItem('activeEstDB_uuid', id);
        window.location.reload();
    };

    const eliminarEstablecimiento = async (id: string, nombre: string) => {
        if (id === activeEstId) return showToast('No puedes eliminar el activo');
        if (!confirm(`¿Seguro que deseas eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;

        setSaving(true);
        try {
            await dataService.deleteEstablecimiento(id);
            showToast('Eliminado');
            void cargar();
        } catch (error) {
            showToast('Error al eliminar');
        } finally {
            setSaving(false);
        }
    };

    const toggleTema = () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const nuevo = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', nuevo);
        localStorage.setItem('ruralit_theme', nuevo);
        void dataService.updateTheme(nuevo);
        showToast(`Modo ${nuevo === 'dark' ? 'oscuro' : 'claro'} activado`);
    };

    const renderNav = () => {
        const tabs: { id: TabKey, label: string, icon: any }[] = [
            { id: 'perfil', label: 'Mi Perfil', icon: User },
            { id: 'establecimiento', label: 'Establecimiento', icon: Building2 },
            { id: 'divisas', label: 'Divisas', icon: Coins },
            { id: 'entradas', label: 'Entradas', icon: ArrowUpRight },
            { id: 'salidas', label: 'Salidas', icon: ArrowDownLeft },
            { id: 'sistema', label: 'Sistema', icon: Settings2 },
        ];

        return (
            <div className="settings-nav">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        className={`settings-nav-item ${activeTab === t.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(t.id)}
                    >
                        <t.icon size={20} />
                        <span>{t.label}</span>
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

        if (activeTab === 'perfil') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="settings-grid-row">
                        <div className="settings-row-info">
                            <h3>Gestión de Perfil</h3>
                            <p>Actualiza tu identidad y los datos vinculados a tu cuenta en la nube.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                            <div>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t2)', marginBottom: '8px', display: 'block' }}>Nombre de Usuario</label>
                                <input type="text" value={nombreUsuario} onChange={e => setNombreUsuario(e.target.value)} placeholder="Ej: Matías" style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--t1)' }} />
                            </div>
                            <div style={{ marginTop: '8px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t2)', marginBottom: '8px', display: 'block' }}>Avatar (Emoji)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))', gap: '4px', padding: '8px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                                    {AVATAR_OPTIONS.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => setAvatarEmoji(emoji)}
                                            style={{
                                                fontSize: '16px', padding: '4px', borderRadius: '6px', border: 'none',
                                                background: avatarEmoji === emoji ? 'var(--green-light)' : 'transparent',
                                                boxShadow: avatarEmoji === emoji ? '0 0 0 1.5px var(--green-main)' : 'none',
                                                cursor: 'pointer', transition: 'all 0.1s'
                                            }}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {user && (
                                <div style={{ background: 'var(--gray-50)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                    <p style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '4px', textTransform: 'uppercase' }}>Sesión activa en</p>
                                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)' }}>{user.email}</p>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn-primary" onClick={guardarPerfil} disabled={saving} style={{ flex: 1 }}>
                                    {saving ? 'Guardando...' : 'Guardar Perfil'}
                                </button>
                                {user && (
                                    <button onClick={logout} disabled={saving} style={{ padding: '12px 20px', borderRadius: '14px', border: '1px solid var(--red-soft)', background: 'transparent', color: 'var(--red-soft)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <LogOut size={16} /> Salir
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="settings-grid-row">
                        <div className="settings-row-info">
                            <h3>Apariencia</h3>
                            <p>Elegí como ver Ruralit hoy.</p>
                        </div>
                        <button
                            onClick={toggleTema}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 24px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 700, color: 'var(--t1)', width: 'fit-content' }}
                        >
                            {typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark' ? (
                                <><Sun size={18} /> Modo Claro</>
                            ) : (
                                <><Moon size={18} /> Modo Oscuro</>
                            )}
                        </button>
                    </div>
                </div>
            );
        }

        if (activeTab === 'establecimiento') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="settings-grid-row">
                        <div className="settings-row-info">
                            <h3>Nombre Comercial</h3>
                            <p>Este es el nombre principal que aparece en todos tus reportes.</p>
                        </div>
                        <div style={{ width: '100%' }}>
                            <input
                                type="text"
                                value={nombreEstab}
                                onChange={e => setNombre(e.target.value)}
                                placeholder="Nombre del Establecimiento"
                                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--t1)' }}
                            />
                        </div>
                    </div>


                    <div className="settings-grid-row">
                        <div className="settings-row-info">
                            <h3>Tipo de Producción</h3>
                            <p>Define el rubro principal para sugerir categorías apropiadas.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                                {[
                                    { id: 'Ganadería', icon: TrendingUp },
                                    { id: 'Lechería', icon: Milk },
                                    { id: 'Agricultura', icon: Sprout },
                                    { id: 'Contratista', icon: Settings2, label: 'Servicios' },
                                    { id: 'Ovina', icon: User },
                                    { id: 'Mixto', icon: LayoutGrid }
                                ].map(t => {
                                    const Icon = t.icon;
                                    const label = t.label || t.id;
                                    const selected = tipoProduccion === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => setTipoProduccion(t.id as TipoProduccion)}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '16px 8px',
                                                borderRadius: '16px',
                                                border: selected ? '2px solid var(--green-main)' : '1px solid var(--border)',
                                                background: selected ? 'var(--green-light)' : 'var(--white)',
                                                color: selected ? 'var(--green-main)' : 'var(--t1)',
                                                fontSize: '13px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Icon size={18} strokeWidth={selected ? 2.5 : 2} style={{ opacity: selected ? 1 : 0.6 }} />
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginTop: '4px' }}>
                                <button
                                    className="btn-secondary"
                                    style={{ fontSize: '12px', background: '#FFFFFF', color: '#1A1A1A', border: '1px solid #E5E7EB', padding: '10px 16px' }}
                                    onClick={async () => {
                                        if (confirm('¿Deseas combinar las categorías sugeridas? Esto agregará las categorías faltantes del nuevo rubro sin borrar tus registros actuales.')) {
                                            await inicializarCategorias(tipoProduccion, true);
                                            showToast('Categorías combinadas correctamente');
                                            cargar();
                                        }
                                    }}
                                >
                                    Combinar categorías sugeridas
                                </button>
                            </div>
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
                                        key={String(est.id)}
                                        onClick={() => cambiarEstablecimiento(String(est.id))}
                                        className={`settings-visual-card ${String(est.id) === activeEstId ? 'active' : ''}`}
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
                                        {est.id !== activeEstId && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); eliminarEstablecimiento(String(est.id), est.nombre); }}
                                                style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--red-light)', color: 'var(--red-soft)', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', display: 'flex' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
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
                        <button className="btn-secondary" onClick={() => setActiveTab('perfil')}>Volver</button>
                        <button className="btn-primary" onClick={guardarEstablecimiento} disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
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
                                        <div style={{ fontSize: '11px', fontWeight: 800, width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)' }}>
                                            {code}
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
                            <h3>Estado de la Cuenta</h3>
                            <p>Información técnica y conectividad.</p>
                        </div>
                        <div>
                            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)' }}>{user ? 'Cuenta en la Nube' : 'Modo Offline'}</p>
                                        <p style={{ fontSize: '12px', color: 'var(--t3)' }}>{user ? user.email : 'Tus datos solo viven en este navegador'}</p>
                                    </div>
                                    {user && (
                                        <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--red-soft)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Salir</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

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
                            <h3>Reportes y Exportación</h3>
                            <p>Descargá tus datos para contabilidad o análisis externo.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <button
                                onClick={exportarACSV}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 24px', borderRadius: '16px', background: 'var(--white)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 700, color: 'var(--t1)', transition: 'all 0.2s' }}
                                onMouseOver={e=>e.currentTarget.style.background='var(--bg)'}
                                onMouseOut={e=>e.currentTarget.style.background='var(--white)'}
                            >
                                <Download size={18} color="var(--green-main)" /> Exportar CSV (Excel)
                            </button>
                            <button
                                onClick={exportarAPDF}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 24px', borderRadius: '16px', background: 'var(--white)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 700, color: 'var(--t1)', transition: 'all 0.2s' }}
                                onMouseOver={e=>e.currentTarget.style.background='var(--bg)'}
                                onMouseOut={e=>e.currentTarget.style.background='var(--white)'}
                            >
                                <FileText size={18} color="var(--red-soft)" /> Generar Informe PDF
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
                                <li>Sincronización Multi-dispositivo en tiempo real</li>
                                <li>Adjuntos Fotográficos en Tickets</li>
                                <li>Integración con API de Planillas Externas</li>
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
                title: 'MI CUENTA',
                items: [
                    { id: 'perfil', label: 'Datos del Perfil', icon: User, tab: 'perfil' as TabKey },
                    { id: 'produccion', label: 'Rubros y Producción', icon: LayoutGrid, tab: 'establecimiento' as TabKey },
                ]
            },
            {
                title: 'ADMINISTRACIÓN',
                items: [
                    { id: 'cambio', label: 'Mis Establecimientos', icon: Building2, tab: 'establecimiento' as TabKey },
                    { id: 'divisas', label: 'Gestión de Monedas', icon: Coins, tab: 'divisas' as TabKey },
                ]
            },
            {
                title: 'CONTENIDO',
                items: [
                    { id: 'entradas', label: 'Categorías Entradas', icon: ArrowUpRight, tab: 'entradas' as TabKey },
                    { id: 'salidas', label: 'Categorías Salidas', icon: ArrowDownLeft, tab: 'salidas' as TabKey }
                ]
            },
            {
                title: 'APLICACIÓN',
                items: [
                    { id: 'sistema', label: 'Sistema y Núcleo', icon: Settings2, tab: 'sistema' as TabKey }
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

                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--t3)', marginTop: '40px', fontWeight: 600 }}>Ruralit v1 beta</p>
            </div>
        );
    };

    if (loadingData) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
                <Loader2 className="spinning" size={32} color="var(--green-main)" />
            </div>
        );
    }

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
                            mobileDetailType === 'produccion' ? 'Producción' :
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
                        {isMobile && activeTab === 'perfil' ? (
                            <div className="settings-grid-row" style={{ gridTemplateColumns: '1fr', border: 'none' }}>
                                <div className="settings-row-info">
                                    <h3>Información Personal</h3>
                                    <p>Tus datos de acceso y perfil público.</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t3)', marginBottom: '8px', display: 'block' }}>TU NOMBRE</label>
                                        <input type="text" value={nombreUsuario} onChange={e => setNombreUsuario(e.target.value)} placeholder="Ej: Matias" style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '15px', background: 'var(--bg-input)', color: 'var(--t1)' }} />
                                    </div>
                                    <div style={{ marginTop: '4px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', marginBottom: '6px', display: 'block' }}>TU AVATAR</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                                            {AVATAR_OPTIONS.map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => setAvatarEmoji(emoji)}
                                                    style={{
                                                        fontSize: '18px', padding: '4px', borderRadius: '8px', border: 'none',
                                                        background: avatarEmoji === emoji ? 'var(--green-light)' : 'transparent',
                                                        boxShadow: avatarEmoji === emoji ? '0 0 0 1.5px var(--green-main)' : 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button className="btn-primary" onClick={guardarPerfil} disabled={saving} style={{ padding: '18px', borderRadius: '14px' }}>
                                        {saving ? 'Guardando...' : 'Actualizar Perfil'}
                                    </button>
                                </div>
                            </div>
                        ) : isMobile && activeTab === 'establecimiento' ? (
                            mobileDetailType === 'perfil' ? (
                                <div className="settings-grid-row" style={{ gridTemplateColumns: '1fr', border: 'none' }}>
                                    <div className="settings-row-info">
                                        <h3>Nombre del Establecimiento</h3>
                                        <p>Actualiza el nombre comercial de tu campo.</p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                        <input type="text" value={nombreEstab} onChange={e => setNombre(e.target.value)} placeholder="Nombre Comercial" style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '15px', background: 'var(--bg-input)', color: 'var(--t1)' }} />
                                        <button className="btn-primary" onClick={guardarEstablecimiento} disabled={saving} style={{ padding: '18px', borderRadius: '14px' }}>
                                            {saving ? 'Guardando...' : 'Guardar Nombre'}
                                        </button>
                                    </div>
                                </div>
                            ) : mobileDetailType === 'produccion' ? (
                                <div className="settings-grid-row" style={{ gridTemplateColumns: '1fr', border: 'none' }}>
                                    <div className="settings-row-info">
                                        <h3>Tipo de Producción</h3>
                                        <p>Elegí tu rubro principal para tener las categorías adecuadas.</p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            {[
                                                { id: 'Ganadería', icon: TrendingUp },
                                                { id: 'Lechería', icon: Milk },
                                                { id: 'Agricultura', icon: Sprout },
                                                { id: 'Contratista', icon: Settings2, label: 'Servicios' },
                                                { id: 'Ovina', icon: User },
                                                { id: 'Mixto', icon: LayoutGrid }
                                            ].map(t => {
                                                const Icon = t.icon;
                                                const label = t.label || t.id;
                                                const selected = tipoProduccion === t.id;
                                                return (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => setTipoProduccion(t.id as TipoProduccion)}
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            padding: '16px 8px',
                                                            borderRadius: '16px',
                                                            border: selected ? '2px solid var(--green-main)' : '1px solid var(--border)',
                                                            background: selected ? 'var(--green-light)' : 'var(--bg-card)',
                                                            color: selected ? 'var(--green-main)' : 'var(--t1)',
                                                            fontSize: '13px',
                                                            fontWeight: 800,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <Icon size={18} strokeWidth={selected ? 2.5 : 2} style={{ opacity: selected ? 1 : 0.6 }} />
                                                        {label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            className="btn-primary"
                                            onClick={guardarEstablecimiento}
                                            style={{ padding: '16px', borderRadius: '14px' }}
                                        >
                                            Guardar Rubro
                                        </button>
                                        <button
                                            className="btn-secondary"
                                            style={{ fontSize: '13px', padding: '14px', marginTop: '8px' }}
                                            onClick={async () => {
                                                if(confirm('¿Deseas sincronizar las categorías sugeridas?')) {
                                                    await inicializarCategorias(tipoProduccion, true);
                                                    showToast('Categorías sincronizadas');
                                                    cargar();
                                                }
                                            }}
                                        >
                                            Sincronizar Sugeridas
                                        </button>
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
                                                key={String(est.id)}
                                                onClick={() => cambiarEstablecimiento(String(est.id))}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '16px', border: String(est.id) === activeEstId ? '2px solid var(--green-main)' : '1px solid var(--border)', background: String(est.id) === activeEstId ? 'var(--green-light)' : 'var(--bg-card)' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <Building2 size={20} color={est.id === activeEstId ? 'var(--green-main)' : 'var(--t3)'} />
                                                    <span style={{ fontWeight: 700, color: 'var(--t1)' }}>{est.nombre}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {est.id !== activeEstId && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); eliminarEstablecimiento(String(est.id), est.nombre); }}
                                                            style={{ background: 'var(--red-light)', color: 'var(--red-soft)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex' }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                    {String(est.id) === activeEstId && <Check size={16} color="var(--green-main)" />}
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={crearNuevoEstablecimiento} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', borderRadius: '16px', border: '1px dashed var(--t3)', background: 'transparent', color: 'var(--t2)', fontWeight: 600, justifyContent: 'center' }}>
                                            <Plus size={16} /> Nuevo Establecimiento
                                        </button>
                                    </div>
                                </div>
                            )
                        ) : renderContent()}
                    </div>
                </div>
            </div>

            {/* Modals outside scrollable area */}
            {showCatModal && <CatModal mode={showCatModal} initData={editCatData as CatForm} onClose={() => setShowCatModal(false)} onSave={handleSaveCat} />}
            {showCurModal && <CurrencyModal current={monedasActivas} onClose={() => setShowCurModal(false)} onSave={handleSaveCur} />}
            {showNewEstabModal && <ModalNuevoEstablecimiento onClose={() => setShowNewEstabModal(false)} onSuccess={handleNewEstabSuccess} />}
        </div>
    );
}
