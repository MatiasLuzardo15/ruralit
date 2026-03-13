import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, ChevronDown, Download, MoreHorizontal, Pencil, Trash2, Filter, ChevronLeft, ChevronRight, Printer, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Movimiento, Categoria, TipoMovimiento } from '../types';
import { formatMonto, formatFechaCorta, formatMesLabel } from '../utils/helpers';
import { ModalRegistrar } from '../components/ModalRegistrar';
import { TopBar } from '../components/TopBar';
import { showToast } from '../components/Toast';
import { dataService } from '../lib/dataService';
import { useMonedas } from '../utils/useMoneda';

/* ─── Context menu ⋮ ─────────────────────────────────────── */
interface CtxMenuProps { onEditar: () => void; onEliminar: () => void; onClose: () => void; }

function ContextMenu({ onEditar, onEliminar, onClose }: CtxMenuProps) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, [onClose]);

    return (
        <div ref={ref} style={{ position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', padding: '6px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px' }}>
            <button onClick={(e) => { e.stopPropagation(); onEditar(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--t2)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}><Pencil size={14} /> Editar</button>
            <button onClick={(e) => { e.stopPropagation(); onEliminar(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--red-soft)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--red-light)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}><Trash2 size={14} /> Eliminar</button>
        </div>
    );
}

/* ─── Libreta ─────────────────────────────────────────────── */
export function Libreta() {
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth());
    const [movimientos, setMov] = useState<Movimiento[]>([]);

    // Filtros
    const [busqueda, setBusy] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [filtroCat, setFiltroCat] = useState('todas');

    const [movEditar, setMovEd] = useState<Movimiento | undefined>();
    const [tipoModal, setTipo] = useState<TipoMovimiento | null>(null);
    const [key, setKey] = useState(0);
    const [ctxOpen, setCtxOpen] = useState<number | string | null>(null);
    const { moneda, monedasActivas } = useMonedas();

    // Mobile Detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [categorias, setCats] = useState<Categoria[]>([]);
    const catMap = new Map<string, Categoria>(categorias.map(c => [String(c.id), c]));
    const [loading, setLoading] = useState(true);

    const cargar = useCallback(async (force: boolean = false) => {
        setLoading(true);
        try {
            const activeId = localStorage.getItem('activeEstDB_uuid');
            if (!activeId) return;

            const [catsData, movsData] = await Promise.all([
                dataService.getCategorias(activeId, force),
                dataService.getMovimientos(activeId, {
                    from: new Date(anio, mes, 1).toISOString().split('T')[0],
                    to: new Date(anio, mes + 1, 0).toISOString().split('T')[0]
                }, force)
            ]);

            setCats(catsData);
            setMov(movsData); // No filtramos por moneda, queremos ver TODO
        } catch (e) {
            console.error('Error cargando Libreta:', e);
        } finally {
            setLoading(false);
        }
    }, [anio, mes, moneda]);

    useEffect(() => { 
        void cargar(); 

        const handleDataChange = () => void cargar(true);
        window.addEventListener('ruralit_data_changed', handleDataChange);
        return () => window.removeEventListener('ruralit_data_changed', handleDataChange);
    }, [cargar]);

    const filtrados = movimientos.filter(mov => {
        if (filtroTipo !== 'todos' && mov.tipo !== filtroTipo) return false;
        if (filtroCat !== 'todas' && String(mov.categoriaId) !== filtroCat) return false;

        if (!busqueda.trim()) return true;
        const q = busqueda.toLowerCase().trim();
        const cat = catMap.get(String(mov.categoriaId));
        return cat?.nombre.toLowerCase().includes(q) || mov.nota?.toLowerCase().includes(q) || String(mov.monto).includes(q);
    });

    // Cálculos unificados por divisa
    const totalesPorMoneda = (monedasActivas as string[]).map(m => {
        const porDivisa = filtrados.filter(mov => (mov.moneda || 'UYU') === m);
        return {
            moneda: m,
            ingresos: porDivisa.filter(mov => mov.tipo === 'ingreso').reduce((s, mov) => s + mov.monto, 0),
            gastos: porDivisa.filter(mov => mov.tipo === 'gasto').reduce((s, mov) => s + mov.monto, 0)
        };
    });

    const cerrar = () => { setTipo(null); setMovEd(undefined); };

    const eliminar = async (mov: Movimiento) => {
        if (mov.id !== undefined) {
            await dataService.deleteMovimiento(String(mov.id));
            showToast('Movimiento eliminado');
            setKey(k => k + 1);
        }
    };

    const navMes = (d: -1 | 1) => {
        let m = mes + d; let a = anio;
        if (m < 0) { m = 11; a--; }
        if (m > 11) { m = 0; a++; }
        setMes(m); setAnio(a);
    };

    const topbarActions = (
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--shadow-xs)', height: '42px' }}>
            <button style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t2)' }} onClick={() => navMes(-1)}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '110px', textAlign: 'center', color: 'var(--t1)' }}>{formatMesLabel(anio, mes)}</span>
            <button style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t2)' }} onClick={() => navMes(1)}><ChevronRight size={16} /></button>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: '40px' }}>
            <TopBar
                title="Libreta de Movimientos"
                heading="Reporte General"
                subtitle="Visualizá y modificá todo el historial"
                actions={topbarActions}
                hideCurrencyToggle={true}
            />

            <div className="page-content" style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>

                {/* ── BIG FLOATING CARD ── */}
                <div style={{ background: 'var(--white)', borderRadius: '32px', padding: isMobile ? '24px 20px' : '40px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: isMobile ? '24px' : '32px' }}>

                    {/* CABECERA DE RESUMEN: ADAPTATIVA (Desktop Espacioso / Móvil Ultra-Compacto) */}
                    <div style={{ background: 'var(--bg)', borderRadius: '24px', padding: isMobile ? '20px' : '24px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isMobile ? '16px' : '24px' }}>
                            <Wallet size={16} color="var(--green-main)" strokeWidth={2.5} />
                            <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '1px' }}>Resumen de Operaciones</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '20px' }}>
                            {totalesPorMoneda.map((t: any, idx: number) => {
                                const balance = t.ingresos - t.gastos;
                                const isPos = balance >= 0;

                                if (isMobile) {
                                    /* ─── DISEÑO MÓVIL: RURAL COMPACT ─── */
                                    return (
                                        <div key={t.moneda} style={{ 
                                            display: 'flex', flexDirection: 'column', gap: '12px',
                                            paddingTop: idx > 0 ? '16px' : '0',
                                            borderTop: idx > 0 ? '1px solid var(--border)' : 'none'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--white)', background: 'var(--t1)', padding: '3px 10px', borderRadius: '8px' }}>{t.moneda}</span>
                                                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--t2)', textTransform: 'uppercase' }}>Neto</span>
                                                </div>
                                                <p style={{ fontSize: '18px', fontWeight: 800, color: isPos ? 'var(--green-main)' : 'var(--red-soft)', letterSpacing: '-0.5px', fontFamily: 'var(--font-mono)' }}>
                                                    {isPos ? '+' : ''}{formatMonto(balance, t.moneda)}
                                                </p>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--white)', borderRadius: '16px', padding: '12px 16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase' }}>Ventas</span>
                                                    <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--t1)' }}>{formatMonto(t.ingresos, t.moneda)}</p>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', paddingLeft: '12px' }}>
                                                    <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase' }}>Compras</span>
                                                    <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--red-soft)' }}>{formatMonto(t.gastos, t.moneda)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                /* ─── DISEÑO DESKTOP: PRO DASHBOARD (ANCHO) ─── */
                                return (
                                    <div key={t.moneda} style={{ 
                                        display: 'grid', gridTemplateColumns: '120px repeat(3, 1fr)', gap: '24px', alignItems: 'center',
                                        paddingTop: idx > 0 ? '20px' : '0',
                                        borderTop: idx > 0 ? '1px solid var(--border)' : 'none'
                                    }}>
                                        <div>
                                            <span style={{ fontSize: '14px', fontWeight: 900, color: 'var(--t1)', background: 'var(--white)', padding: '6px 14px', borderRadius: '10px', boxShadow: 'var(--shadow-xs)', border: '1px solid var(--border-sm)' }}>
                                                {t.moneda}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ingresos (Ventas)</span>
                                            <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--green-main)', letterSpacing: '-0.5px', fontFamily: 'var(--font-mono)' }}>{formatMonto(t.ingresos, t.moneda)}</p>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gastos (Compras)</span>
                                            <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--red-soft)', letterSpacing: '-0.5px', fontFamily: 'var(--font-mono)' }}>{formatMonto(t.gastos, t.moneda)}</p>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Balance Neto</span>
                                            <p style={{ fontSize: '22px', fontWeight: 800, color: isPos ? 'var(--t1)' : 'var(--red-soft)', letterSpacing: '-0.5px', fontFamily: 'var(--font-mono)' }}>
                                                {isPos ? '+' : ''}{formatMonto(balance, t.moneda)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SISTEMA DE FILTROS MODERNOS */}
                    <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'var(--bg-card)', marginTop: '8px' }}>
                        <div style={{ position: 'relative' }}>
                            <label style={{ position: 'absolute', top: '-8px', left: '12px', background: 'var(--bg-card)', padding: '0 4px', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase' }}>Búsqueda Rápida</label>
                            <Search size={16} strokeWidth={2.5} style={{ position: 'absolute', top: '16px', left: '16px', color: 'var(--t3)' }} />
                            <input type="text" placeholder="Leche, ración..." value={busqueda} onChange={e => setBusy(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', background: 'var(--bg-input)', color: 'var(--t1)' }} />
                        </div>

                        <div style={{ position: 'relative' }}>
                            <label style={{ position: 'absolute', top: '-8px', left: '12px', background: 'var(--bg-card)', padding: '0 4px', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase' }}>Flujo Monetario</label>
                            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', appearance: 'none', background: 'var(--bg-input)', color: 'var(--t1)', cursor: 'pointer' }}>
                                <option value="todos">Ventas y Compras</option>
                                <option value="ingreso">Solo Ingresos / Ventas</option>
                                <option value="gasto">Solo Gastos / Compras</option>
                            </select>
                            <ChevronDown size={16} style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--t3)', pointerEvents: 'none' }} />
                        </div>

                        <div style={{ position: 'relative' }}>
                            <label style={{ position: 'absolute', top: '-8px', left: '12px', background: 'var(--bg-card)', padding: '0 4px', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase' }}>Clasificación</label>
                            <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', appearance: 'none', background: 'var(--bg-input)', color: 'var(--t1)', cursor: 'pointer' }}>
                                <option value="todas">Cualquier Categoría</option>
                                {categorias.filter(c => filtroTipo === 'todos' || c.tipo === filtroTipo).map(c => (
                                    <option key={String(c.id)} value={String(c.id)}>{c.nombre}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--t3)', pointerEvents: 'none' }} />
                        </div>
                    </div>

                    {/* EXPORT ROW */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-sm)', paddingBottom: '16px' }}>
                        <p className="no-print" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: '8px' }}><Filter size={16} /> Mostrando {filtrados.length} resultados</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => {
                                    if (filtrados.length === 0) {
                                        showToast('No hay datos para exportar');
                                        return;
                                    }
                                    import('../utils/exportUtils').then(mod => {
                                        mod.exportMovimientosCSV(filtrados, catMap, formatMesLabel(anio, mes));
                                        showToast('Reporte exportado con éxito');
                                    });
                                }}
                                style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 16px', transition: 'all 0.2s', boxShadow: 'var(--shadow-xs)' }}
                            >
                                <Download size={14} /> CSV
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="nav-arrow"
                                style={{ width: '38px', height: '38px', color: 'var(--t1)', padding: 0 }}
                                title="Imprimir PDF"
                            >
                                <Printer size={20} />
                            </button>
                        </div>
                    </div>

                    {/* DATA GRID ESTILO INVENTORY 360 */}
                    {filtrados.length === 0 ? (
                        <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                            <div style={{ background: 'var(--gray-100)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Search size={24} color="var(--t3)" />
                            </div>
                            <p style={{ fontWeight: 700, fontSize: '18px', color: 'var(--t1)', marginBottom: '8px' }}>El reporte está vacío</p>
                            <p style={{ color: 'var(--t3)', fontSize: '15px', fontWeight: 500 }}>Modifica los filtros o inicia un nuevo registro.</p>
                        </div>
                    ) : (
                        /* RESPONSIVE DATA DISPLAY */
                        !isMobile ? (
                            <div style={{ overflowX: 'auto', margin: '0 -16px', padding: '0 16px' }}>
                                <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: '0 16px 16px', color: 'var(--t3)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>Clasificación</th>
                                            <th style={{ padding: '0 16px 16px', color: 'var(--t3)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>Nota / Detalle</th>
                                            <th style={{ padding: '0 16px 16px', color: 'var(--t3)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>Fecha de Registro</th>
                                            <th style={{ padding: '0 16px 16px', color: 'var(--t3)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Monto Operación</th>
                                            <th style={{ width: '40px', borderBottom: '1px solid var(--border)' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtrados.map((mov, i) => {
                                            const cat = catMap.get(String(mov.categoriaId));
                                            const ing = mov.tipo === 'ingreso';
                                            const isCtxOpen = ctxOpen === mov.id;
                                            return (
                                                <tr key={mov.id} onClick={() => !isCtxOpen && setCtxOpen(null)} style={{ borderBottom: i === filtrados.length - 1 ? 'none' : '1px solid var(--border-sm)', transition: 'background 0.1s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding: '20px 16px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: ing ? 'var(--green-light)' : 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                                                                {cat?.icono ?? '📦'}
                                                            </div>
                                                            <div>
                                                                <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--t1)' }}>{cat?.nombre ?? 'Sin categoría'}</p>
                                                                <p style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '2px', fontWeight: 500 }}>{ing ? 'Venta' : 'Compra'}</p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td style={{ padding: '20px 16px', color: 'var(--t2)', fontSize: '14px' }}>
                                                        {mov.nota ? mov.nota : <span style={{ color: 'var(--t3)' }}>Sin observaciones</span>}
                                                    </td>

                                                    <td style={{ padding: '20px 16px', color: 'var(--t2)', fontSize: '14px', fontWeight: 500 }}>
                                                        {formatFechaCorta(mov.fecha)}
                                                    </td>

                                                    <td style={{ padding: '20px 16px', textAlign: 'right' }}>
                                                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '15px', color: ing ? 'var(--green-main)' : 'var(--t1)', letterSpacing: '-0.5px' }}>
                                                            {ing ? '' : '-'}{formatMonto(mov.monto, mov.moneda)}
                                                        </span>
                                                    </td>

                                                    <td style={{ padding: '20px 16px', position: 'relative', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                                                        <button onClick={() => setCtxOpen(isCtxOpen ? null : (mov.id ?? null))} style={{ padding: '6px', borderRadius: '8px', color: 'var(--t2)', background: 'transparent', border: 'none', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                                            <MoreHorizontal size={18} />
                                                        </button>
                                                        {isCtxOpen && (
                                                            <ContextMenu
                                                                onClose={() => setCtxOpen(null)}
                                                                onEditar={() => { setMovEd(mov); setTipo(mov.tipo); setCtxOpen(null); }}
                                                                onEliminar={() => { setCtxOpen(null); void eliminar(mov); }}
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {filtrados.map((mov) => {
                                    const cat = catMap.get(String(mov.categoriaId));
                                    const ing = mov.tipo === 'ingreso';
                                    const isCtxOpen = ctxOpen === mov.id;

                                    return (
                                        <div 
                                            key={mov.id} 
                                            onClick={() => !isCtxOpen && setCtxOpen(null)}
                                            style={{ 
                                                background: 'var(--white)', 
                                                borderRadius: '20px', 
                                                border: '1px solid var(--border-sm)', 
                                                padding: '20px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '16px',
                                                position: 'relative'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: ing ? 'var(--green-light)' : 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                                                        {cat?.icono ?? '📦'}
                                                    </div>
                                                    <div>
                                                        <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--t1)' }}>{cat?.nombre ?? 'Sin categoría'}</p>
                                                        <p style={{ fontSize: '13px', color: 'var(--t3)', fontWeight: 600 }}>{formatFechaCorta(mov.fecha)}</p>
                                                    </div>
                                                </div>
                                                
                                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '18px', color: ing ? 'var(--green-main)' : 'var(--t1)', letterSpacing: '-0.5px' }}>
                                                        {ing ? '+' : '-'}{formatMonto(mov.monto, mov.moneda)}
                                                    </span>
                                                    <button onClick={(e) => { e.stopPropagation(); setCtxOpen(isCtxOpen ? null : (mov.id ?? null)); }} style={{ padding: '8px', borderRadius: '10px', color: 'var(--t3)', background: 'var(--gray-50)', border: 'none', cursor: 'pointer' }}>
                                                        <MoreHorizontal size={18} />
                                                    </button>
                                                    {isCtxOpen && (
                                                        <ContextMenu
                                                            onClose={() => setCtxOpen(null)}
                                                            onEditar={() => { setMovEd(mov); setTipo(mov.tipo); setCtxOpen(null); }}
                                                            onEliminar={() => { setCtxOpen(null); void eliminar(mov); }}
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {mov.nota && (
                                                <div style={{ borderTop: '1px solid var(--gray-50)', paddingTop: '12px' }}>
                                                    <p style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.4, fontWeight: 500 }}>
                                                        {mov.nota}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>
            </div>

            {tipoModal && (
                <ModalRegistrar
                    tipoInicial={tipoModal}
                    onClose={cerrar}
                    movimientoEditar={movEditar}
                    onGuardado={() => setKey(k => k + 1)}
                />
            )}
        </div>
    );
}
