import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { ChevronLeft, ChevronRight, ChevronDown, X, BarChart2, TrendingUp, TrendingDown, Divide, AlertTriangle, CheckCircle, Info, Calendar } from 'lucide-react';
import db from '../db/database';
import type { Movimiento, Categoria, TipoMovimiento } from '../types';
import { formatMonto, formatMesLabel, calcularBalance, formatFechaCorta } from '../utils/helpers';
import { TopBar } from '../components/TopBar';
import { ModalRegistrar } from '../components/ModalRegistrar';
import { useMonedas } from '../utils/useMoneda';

const PAL_E = ['#cddc39', '#8bc34a', '#4caf50', '#009688'];
const PAL_S = ['#f44336', '#ff9800', '#ff5722', '#795548'];

interface CatItem { cat: Categoria; monto: number; pct: number; }

// ── Horizontal category bars ──────────────
function HorzBars({ items, palette, onCatClick }: { items: CatItem[]; palette: string[]; onCatClick: (cat: Categoria) => void }) {
    const { moneda } = useMonedas();
    if (!items.length) return <p style={{ fontSize: '14px', color: 'var(--t3)', textAlign: 'center', padding: '24px 0' }}>Faltan datos para mostrar.</p>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.slice(0, 5).map((item, i) => {
                const bgClr = palette[i % palette.length];
                return (
                    <div key={item.cat.id ?? i} onClick={() => onCatClick(item.cat)} style={{ cursor: 'pointer', padding: '16px 20px', borderRadius: '24px', transition: 'background 0.2s', display: 'flex', flexDirection: 'column', gap: '14px' }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: bgClr, flexShrink: 0 }} />
                                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--t1)' }}>{item.cat.nombre}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.5px' }}>{formatMonto(item.monto, moneda)}</span>
                                <span style={{ fontSize: '13px', color: 'var(--t3)', fontWeight: 600, minWidth: '40px', textAlign: 'right' }}>{item.pct.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div style={{ height: '6px', background: 'var(--gray-100)', borderRadius: '6px', width: '100%', overflow: 'hidden' }}>
                            <div style={{ width: `${item.pct}%`, height: '100%', background: bgClr, borderRadius: '6px' }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Category drill-down modal ────────────────────────────────
function CatDetailModal({ cat, movs, onClose, onEdit }: { cat: Categoria; movs: Movimiento[]; onClose: () => void; onEdit: (m: Movimiento) => void }) {
    const { moneda } = useMonedas();
    const ing = cat.tipo === 'ingreso';
    const total = movs.reduce((s, m) => s + m.monto, 0);
    return createPortal(
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-panel" style={{ borderRadius: '32px', padding: '32px', width: '100%', maxWidth: '440px' }}>
                <div style={{ borderBottom: '1px solid var(--border-sm)', paddingBottom: '20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <p style={{ fontWeight: 800, fontSize: '20px', color: 'var(--t1)', marginBottom: '4px' }}>{cat.nombre}</p>
                        <p style={{ fontSize: '14px', color: 'var(--t3)', fontWeight: 500 }}>Acumulado: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.5px' }}>{formatMonto(total, moneda)}</span></p>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--gray-100)', borderRadius: '50%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                </div>
                <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
                    {movs.map(mov => (
                        <div key={mov.id} onClick={() => { onEdit(mov); onClose(); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border-sm)', cursor: 'pointer', transition: 'background 0.1s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <div>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)' }}>{mov.nota || 'Registro Rápido'}</p>
                                <p style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '4px', fontWeight: 500 }}>{formatFechaCorta(mov.fecha)}</p>
                            </div>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: ing ? 'var(--green-main)' : 'var(--t1)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.5px' }}>
                                {ing ? '+' : '–'}{formatMonto(mov.monto, moneda)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
}

// ── KPI Card Component ───────────────────────────────────────
const KPICard = ({ title, value, sub, icon, trend }: any) => (
    <div style={{ background: 'var(--white)', borderRadius: '32px', padding: '32px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {icon} {title}
        </p>
        <p style={{ fontSize: '36px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-1.5px', fontFamily: 'var(--font-mono)' }}>{value}</p>
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {trend && <span style={{ padding: '4px 8px', borderRadius: '8px', background: trend.up ? 'var(--green-light)' : 'var(--gray-100)', color: trend.up ? 'var(--green-main)' : 'var(--t2)', fontSize: '12px', fontWeight: 700 }}>{trend.label}</span>}
            {sub && <span style={{ fontSize: '13px', color: 'var(--t3)', fontWeight: 500 }}>{sub}</span>}
        </div>
    </div>
);

// ── Main Balance ─────────────────────────────────────────────
type Vista = 'mensual' | 'anual';

export function Balance() {
    const [vista, setVista] = useState<Vista>('mensual');
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth());
    const [movsMes, setMovsMes] = useState<Movimiento[]>([]);
    const [movsPrev, setMovsPrev] = useState<Movimiento[]>([]);
    const [movsAnio, setMovsAnio] = useState<Movimiento[]>([]);

    const [catModal, setCatModal] = useState<{ cat: Categoria; movs: Movimiento[] } | null>(null);
    const [editMov, setEditMov] = useState<{ mov: Movimiento; tipo: TipoMovimiento } | null>(null);
    const [key, setKey] = useState(0);

    const categorias = useLiveQuery(() => db.categorias.toArray(), []) ?? [];
    const catMap = new Map<number, Categoria>(categorias.map(c => [c.id!, c]));
    const { moneda, monedasActivas, changeMoneda } = useMonedas();

    const cargarData = useCallback(async () => {
        if (vista === 'mensual') {
            const ini = new Date(anio, mes, 1).toISOString().split('T')[0];
            const fin = new Date(anio, mes + 1, 0).toISOString().split('T')[0];
            const mesRows = await db.movimientos.where('fecha').between(ini, fin, true, true).toArray();
            setMovsMes(mesRows);

            let pm = mes - 1, pa = anio;
            if (pm < 0) { pm = 11; pa--; }
            const pIni = new Date(pa, pm, 1).toISOString().split('T')[0];
            const pFin = new Date(pa, pm + 1, 0).toISOString().split('T')[0];
            const prevRows = await db.movimientos.where('fecha').between(pIni, pFin, true, true).toArray();
            setMovsPrev(prevRows);
        } else {
            const ini = new Date(anio, 0, 1).toISOString().split('T')[0];
            const fin = new Date(anio, 11, 31).toISOString().split('T')[0];
            const anioRows = await db.movimientos.where('fecha').between(ini, fin, true, true).toArray();
            setMovsAnio(anioRows);
        }
    }, [anio, mes, vista, key]);

    useEffect(() => { void cargarData(); }, [cargarData]);

    const navMes = (d: -1 | 1) => { let m = mes + d, a = anio; if (m < 0) { m = 11; a--; } if (m > 11) { m = 0; a++; } setMes(m); setAnio(a); };

    const buildCatItems = (tipo: 'ingreso' | 'gasto', dataset: Movimiento[]): CatItem[] => {
        const fil = dataset.filter(m => m.tipo === tipo), total = fil.reduce((s, m) => s + m.monto, 0);
        const bc = new Map<number, number>();
        fil.forEach(m => bc.set(m.categoriaId, (bc.get(m.categoriaId) ?? 0) + m.monto));
        return [...bc.entries()].map(([id, t]) => ({
            cat: catMap.get(id) ?? { id, nombre: 'Sin cat.', tipo, icono: '📦', esPredefinida: false, color: '' },
            monto: t, pct: total > 0 ? (t / total) * 100 : 0,
        })).sort((a, b) => b.monto - a.monto);
    };

    const openCat = (cat: Categoria, dataset: Movimiento[]) => setCatModal({ cat, movs: dataset.filter(m => m.categoriaId === cat.id) });

    const topbarActions = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '14px', padding: '4px', display: 'flex' }}>
                <button style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', background: vista === 'mensual' ? 'var(--white)' : 'transparent', fontWeight: vista === 'mensual' ? 700 : 500, color: vista === 'mensual' ? 'var(--t1)' : 'var(--t3)', boxShadow: vista === 'mensual' ? 'var(--shadow-sm)' : 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setVista('mensual')}>Mensual</button>
                <button style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', background: vista === 'anual' ? 'var(--white)' : 'transparent', fontWeight: vista === 'anual' ? 700 : 500, color: vista === 'anual' ? 'var(--t1)' : 'var(--t3)', boxShadow: vista === 'anual' ? 'var(--shadow-sm)' : 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setVista('anual')}>Anual</button>
            </div>
            {vista === 'mensual' ? (
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
                    <button style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t2)' }} onClick={() => navMes(-1)}><ChevronLeft size={16} /></button>
                    <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '110px', textAlign: 'center', color: 'var(--t1)' }}>{formatMesLabel(anio, mes)}</span>
                    <button style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t2)' }} onClick={() => navMes(1)}><ChevronRight size={16} /></button>
                </div>
            ) : (
                <div style={{ position: 'relative' }}>
                    <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} style={{ padding: '10px 36px 10px 16px', borderRadius: '14px', border: '1px solid var(--border)', fontSize: '13px', fontWeight: 700, color: 'var(--t1)', outline: 'none', appearance: 'none', background: 'var(--white)', cursor: 'pointer', boxShadow: 'var(--shadow-xs)' }}>
                        {[anio - 2, anio - 1, anio, anio + 1].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--t3)', pointerEvents: 'none' }} />
                </div>
            )}
        </div>
    );

    // ── Render Mensual ───────────────────────────────────────
    const renderMensual = () => {
        const movsMesMoneda = movsMes.filter(m => (m.moneda || 'ARS') === moneda);
        const movsPrevMoneda = movsPrev.filter(m => (m.moneda || 'ARS') === moneda);
        const balMoneda = calcularBalance(movsMesMoneda);
        const balPrevMoneda = calcularBalance(movsPrevMoneda);
        
        const daysInMonth = new Date(anio, mes + 1, 0).getDate();
        const today = new Date();
        const isCurrent = today.getFullYear() === anio && today.getMonth() === mes;
        const dayToday = isCurrent ? today.getDate() : daysInMonth;

        const byDay = new Map<number, { e: number; s: number }>();
        movsMesMoneda.forEach(m => {
            const d = parseInt(m.fecha.slice(8, 10));
            const c = byDay.get(d) ?? { e: 0, s: 0 };
            if (m.tipo === 'ingreso') c.e += m.monto; else c.s += m.monto;
            byDay.set(d, c);
        });

        let accE = 0, accS = 0;
        const chartData = Array.from({ length: dayToday }, (_, i) => {
            const d = i + 1, rec = byDay.get(d);
            accE += (rec?.e ?? 0);
            accS += (rec?.s ?? 0);
            return { name: d.toString(), Ingresos: accE, Gastos: accS };
        });

        const eItems = buildCatItems('ingreso', movsMesMoneda);
        const sItems = buildCatItems('gasto', movsMesMoneda);

        const CurrencyTabs = () => (
            <div style={{ display: 'flex', gap: '4px', background: '#F1F1F1', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
                {monedasActivas.map(mnd => (
                    <button 
                        key={mnd} 
                        onClick={() => changeMoneda(mnd)}
                        style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: mnd === moneda ? '#FFFFFF' : 'transparent', color: mnd === moneda ? 'var(--t1)' : '#888888', fontWeight: mnd === moneda ? 600 : 500, fontSize: '13px', cursor: 'pointer', boxShadow: mnd === moneda ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        {mnd === 'USD' ? '🇺🇸' : mnd === 'UYU' ? '🇺🇾' : '🇦🇷'} {mnd}
                    </button>
                ))}
            </div>
        );

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* BIG HERO REPORT */}
                <div style={{ background: 'var(--white)', borderRadius: '32px', padding: '40px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '48px', alignItems: 'center' }}>

                        {/* Saldo Principal */}
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '220px' }}>
                            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--t2)', marginBottom: '8px' }}>Tu Saldo del Mes</p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                                {monedasActivas.map((mnd, idx) => {
                                    const mvs = movsMes.filter(m => (m.moneda || 'ARS') === mnd);
                                    const pv = movsPrev.filter(m => (m.moneda || 'ARS') === mnd);
                                    const b = calcularBalance(mvs);
                                    const bP = calcularBalance(pv);
                                    const dp = b.neto - bP.neto;
                                    const mgn = b.ingresos > 0 ? ((b.neto / b.ingresos) * 100).toFixed(1) : '0.0';

                                    return (
                                        <div key={mnd} style={{ borderBottom: idx < monedasActivas.length - 1 ? '1px solid var(--border-sm)' : 'none', paddingBottom: idx < monedasActivas.length - 1 ? '16px' : '0' }}>
                                            <p style={{ fontSize: '32px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-1.5px', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
                                                {formatMonto(b.neto, mnd)}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                                                <p style={{ fontSize: '11px', color: '#999999' }}>
                                                    <span style={{fontWeight: 500}}>{mnd === 'USD' ? '🇺🇸 USD' : mnd === 'UYU' ? '🇺🇾 UYU' : '🇦🇷 ARS'}</span> {dp !== 0 ? `(${dp >= 0 ? '+' : ''}${formatMonto(dp, mnd)})` : ''}
                                                </p>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--blue-main)', background: 'var(--blue-light)', padding: '4px 8px', borderRadius: '8px' }}>
                                                    Margen {mgn}%
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div style={{ width: '100%', height: '300px', flex: 2, minWidth: '320px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Evolución Mensual</p>
                                <CurrencyTabs />
                            </div>
                            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorIngreso" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--green-main)" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="var(--green-main)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#A3A3A3', fontWeight: 400 }} dy={10} minTickGap={20} />
                                        <Tooltip formatter={(value: any) => formatMonto(value, moneda)} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-md)', fontSize: '13px', fontWeight: 600, padding: '12px 16px' }} labelStyle={{ color: 'var(--t3)', marginBottom: '8px', fontSize: '12px', fontWeight: 500 }} />
                                        <Area type="monotone" dataKey="Ingresos" stroke="var(--green-main)" strokeWidth={3} fillOpacity={1} fill="url(#colorIngreso)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Secondary Stats */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', minWidth: '180px' }}>
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Ingresos Totales</h3>
                                <p style={{ fontSize: '32px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)', letterSpacing: '-1.5px' }}>{formatMonto(balMoneda.ingresos, moneda)}</p>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Gastos Totales</h3>
                                <p style={{ fontSize: '32px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)', letterSpacing: '-1.5px' }}>{formatMonto(balMoneda.gastos, moneda)}</p>
                                <p style={{ fontSize: '12px', color: '#999999', marginTop: '8px', fontWeight: 500 }}>
                                    {balMoneda.ingresos > 0 ? `${((balMoneda.gastos / balMoneda.ingresos) * 100).toFixed(1)}% de salidas en base a ingresos` : 'Sin gastos'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Análisis de Resultados para el Productor */}
                {balMoneda.ingresos > 0 || balMoneda.gastos > 0 ? (
                    (() => {
                        type InsightType = { type: 'warning' | 'success' | 'info', text: string };
                        const insights: InsightType[] = [];

                        // 1. Concentración de Gastos
                        if (sItems.length > 0 && sItems[0].pct > 40) {
                            insights.push({
                                type: 'warning',
                                text: `Tus egresos están concentrados. El ${sItems[0].pct.toFixed(0)}% del total es en "${sItems[0].cat.nombre}". Monitorear esto es clave para tus costos productivos.`
                            });
                        }

                        // 2. Comparativa con mes anterior
                        if (balPrevMoneda.gastos > 0) {
                            const varG = ((balMoneda.gastos - balPrevMoneda.gastos) / balPrevMoneda.gastos) * 100;
                            if (varG > 15) {
                                insights.push({
                                    type: 'warning',
                                    text: `Los costos aumentaron un ${varG.toFixed(0)}% vs cierre anterior. Revisalo si fue imprevisto o planificado en el ciclo productivo.`
                                });
                            } else if (varG < -15) {
                                insights.push({
                                    type: 'success',
                                    text: `Tus costos bajaron un ${Math.abs(varG).toFixed(0)}% frente al cierre anterior. Buen control de caja este periodo.`
                                });
                            }
                        }

                        // 3. Situación de Ingresos
                        if (balMoneda.ingresos > balMoneda.gastos * 1.5) {
                            insights.push({
                                type: 'success',
                                text: `Flujo altamente positivo. Asegura reinvertir este margen o crear un fondo sólido para etapas de sequía o meses de baja venta.`
                            });
                        } else if (balMoneda.ingresos === 0 && balMoneda.gastos > 0) {
                            insights.push({
                                type: 'info',
                                text: `Mes de salida con 0 facturación (común en etapas de engorde o cultivo). Asegura tu capital de trabajo para no descapitalizarte.`
                            });
                        } else if (balMoneda.gastos > balMoneda.ingresos) {
                            insights.push({
                                type: 'warning',
                                text: `Estás operando en rojo neto temporal (${formatMonto(balMoneda.neto, moneda)}). Prevé ajustar la estructura si esto no corresponde a una inversión normal de temporada.`
                            });
                        }
                        
                        // 4. Dependencia de un ingreso
                        if (eItems.length > 0 && eItems[0].pct > 85 && eItems.length === 1) {
                            insights.push({
                                type: 'info',
                                text: `Giro focalizado: dependes 100% de la venta de "${eItems[0].cat.nombre}". Diversificar giros en el predio suele mejorar la fluidez mensual de caja.`
                            });
                        }

                        if (insights.length === 0) return null;

                        const topGasto = movsMesMoneda.filter(m => m.tipo === 'gasto').sort((a,b)=>b.monto - a.monto)[0];
                        const topIngreso = movsMesMoneda.filter(m => m.tipo === 'ingreso').sort((a,b)=>b.monto - a.monto)[0];
                        const qtyIngreso = movsMesMoneda.filter(m => m.tipo === 'ingreso').length;
                        const avgGastoDay = dayToday > 0 ? balMoneda.gastos / dayToday : 0;
                        const freeMargin = balMoneda.ingresos > 0 ? (balMoneda.neto / balMoneda.ingresos) * 100 : 0;

                        return (
                            <div style={{ background: 'var(--white)', borderRadius: '32px', padding: '32px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--blue-main)', letterSpacing: '-0.3px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        <TrendingUp size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span>Análisis de Resultados y Métricas Clave</span>
                                    </h3>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
                                    {/* Columna Izquierda: Mensajes Insight */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {insights.slice(0, 3).map((insight, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: `4px solid ${insight.type === 'warning' ? '#F57C00' : insight.type === 'success' ? '#388E3C' : '#1976D2'}`, boxShadow: 'var(--shadow-xs)' }}>
                                                <div style={{ marginTop: '2px', flexShrink: 0 }}>
                                                    {insight.type === 'warning' && <AlertTriangle size={16} color="#F57C00" strokeWidth={2} />}
                                                    {insight.type === 'success' && <CheckCircle size={16} color="#388E3C" strokeWidth={2} />}
                                                    {insight.type === 'info' && <Info size={16} color="#1976D2" strokeWidth={2} />}
                                                </div>
                                                <p style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.5, fontWeight: 500 }}>
                                                    {insight.text}
                                                </p>
                                            </div>
                                        ))}
                                        
                                        {/* Espacio para proyección o resumen de cierre */}
                                        {dayToday >= 5 && dayToday < daysInMonth ? (
                                            <div style={{ background: '#F8F9FA', padding: '16px', borderRadius: '16px', border: '1px dashed #DEE2E6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <p style={{ fontSize: '13px', color: '#495057', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Calendar size={16} color="#6C757D" /> Proyección a fin de mes
                                                </p>
                                                <p style={{ fontSize: '13px', color: '#495057', lineHeight: 1.5 }}>
                                                    Faltan <strong>{daysInMonth - dayToday} días</strong>. A este ritmo, el mes cerraría con egresos aprox. de <strong style={{color:'var(--red-soft)', fontFamily:'var(--font-mono)'}}>{formatMonto((balMoneda.gastos / dayToday) * daysInMonth, moneda)}</strong>.
                                                </p>
                                            </div>
                                        ) : dayToday === daysInMonth ? (
                                            <div style={{ background: '#e8faee', padding: '16px', borderRadius: '16px', border: '1px dashed #c8eccf', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <p style={{ fontSize: '13px', color: '#0d6728', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Calendar size={16} color="#0d6728" /> Mes trancado y cerrado
                                                </p>
                                                <p style={{ fontSize: '13px', color: '#0d6728', lineHeight: 1.5 }}>
                                                    Usa este historial para planificar la operativa de la próxima rotación de manera más eficiente.
                                                </p>
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Columna Derecha: KPI Data Complementaria */}
                                    <div style={{ background: 'var(--bg)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                             Métricas Operativas Breves
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
                                            <div>
                                                <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 600, marginBottom: '4px' }}>Gasto más grande</p>
                                                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.5px' }}>
                                                    {topGasto ? formatMonto(topGasto.monto, moneda) : formatMonto(0, moneda)}
                                                </p>
                                                <p style={{ fontSize: '12px', color: 'var(--red-soft)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {topGasto ? catMap.get(topGasto.categoriaId)?.nombre : '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 600, marginBottom: '4px' }}>Cobro más grande</p>
                                                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.5px' }}>
                                                    {topIngreso ? formatMonto(topIngreso.monto, moneda) : formatMonto(0, moneda)}
                                                </p>
                                                <p style={{ fontSize: '12px', color: 'var(--green-main)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {topIngreso ? catMap.get(topIngreso.categoriaId)?.nombre : '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 600, marginBottom: '4px' }}>Gasto diario aprox.</p>
                                                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.5px' }}>
                                                    {formatMonto(avgGastoDay, moneda)}
                                                </p>
                                                <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 500 }}>
                                                    En {dayToday} días transcurridos
                                                </p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 600, marginBottom: '4px' }}>Cobros o Ventas</p>
                                                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.5px' }}>
                                                    {qtyIngreso} {qtyIngreso === 1 ? 'vez' : 'veces'}
                                                </p>
                                                <p style={{ fontSize: '12px', color: 'var(--green-main)', fontWeight: 600 }}>
                                                    entró plata al campo
                                                </p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 600, marginBottom: '4px' }}>Margen Libre</p>
                                                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.5px' }}>
                                                    {balMoneda.ingresos > 0 ? `${freeMargin.toFixed(1)}%` : '0%'}
                                                </p>
                                                <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 500 }}>
                                                    {freeMargin > 0 ? 'ganancia sobre ventas' : 'operando a pérdida'}
                                                </p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 600, marginBottom: '4px' }}>Movimientos Totales</p>
                                                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.5px' }}>
                                                    {movsMesMoneda.length} {movsMesMoneda.length === 1 ? 'anotación' : 'anotaciones'}
                                                </p>
                                                <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 500 }}>
                                                    hechas en el mes
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()
                ) : null}

                {/* LOWER SECTION GRID */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                    <div style={{ background: 'var(--white)', borderRadius: '32px', padding: '40px', boxShadow: 'var(--shadow-sm)' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--t1)', marginBottom: '32px', letterSpacing: '-0.5px' }}>Ingresos por Categoría</h3>
                        <HorzBars items={eItems} palette={PAL_E} onCatClick={(cat) => openCat(cat, movsMesMoneda)} />
                    </div>
                    <div style={{ background: 'var(--white)', borderRadius: '32px', padding: '40px', boxShadow: 'var(--shadow-sm)' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--t1)', marginBottom: '32px', letterSpacing: '-0.5px' }}>Gastos por Categoría</h3>
                        <HorzBars items={sItems} palette={PAL_S} onCatClick={(cat) => openCat(cat, movsMesMoneda)} />
                    </div>
                </div>
            </div>
        );
    };

    // ── Render Anual ───────────────────────────────────────
    const renderAnual = () => {
        const aMovesMoneda = movsAnio.filter(m => (m.moneda || 'ARS') === moneda);

        const balAnual = calcularBalance(aMovesMoneda);
        const margenAnual = balAnual.ingresos > 0 ? ((balAnual.neto / balAnual.ingresos) * 100).toFixed(1) : '0.0';

        const mesesLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthlyData = Array.from({ length: 12 }, (_, i) => ({ name: mesesLabels[i], Ingresos: 0, Gastos: 0, Margen: 0, Neto: 0 }));

        aMovesMoneda.forEach(m => {
            const mth = parseInt(m.fecha.slice(5, 7)) - 1;
            if (m.tipo === 'ingreso') monthlyData[mth].Ingresos += m.monto;
            else monthlyData[mth].Gastos += m.monto;
        });

        let highestMargin = 0;
        monthlyData.forEach(d => {
            d.Neto = d.Ingresos - d.Gastos;
            d.Margen = d.Ingresos > 0 ? (d.Neto / d.Ingresos) * 100 : 0;
            if (d.Margen > highestMargin) highestMargin = d.Margen;
        });

        const eItemsAnual = buildCatItems('ingreso', aMovesMoneda);
        const sItemsAnual = buildCatItems('gasto', aMovesMoneda);

        const CurrencyTabs = () => (
            <div style={{ display: 'flex', gap: '8px', background: 'var(--bg)', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
                {monedasActivas.map(mnd => (
                    <button 
                        key={mnd} 
                        onClick={() => changeMoneda(mnd)}
                        style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', background: mnd === moneda ? 'var(--white)' : 'transparent', color: mnd === moneda ? 'var(--t1)' : 'var(--t3)', fontWeight: mnd === moneda ? 700 : 500, fontSize: '13px', cursor: 'pointer', boxShadow: mnd === moneda ? 'var(--shadow-xs)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        {mnd === 'USD' ? '🇺🇸' : mnd === 'UYU' ? '🇺🇾' : '🇦🇷'} {mnd}
                    </button>
                ))}
            </div>
        );

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.5px' }}>Análisis por Moneda</h2>
                    <CurrencyTabs />
                </div>

                {/* 1. KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                    
                    <div style={{ background: 'var(--white)', borderRadius: '32px', padding: '32px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart2 size={18} color="var(--t1)" /> Balance Neto Anual
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {monedasActivas.map((mnd, idx) => {
                                const mvAn = movsAnio.filter(m => (m.moneda || 'ARS') === mnd);
                                const bld = calcularBalance(mvAn);
                                return (
                                    <div key={mnd} style={{ borderBottom: idx < monedasActivas.length - 1 ? '1px solid var(--border-sm)' : 'none', paddingBottom: idx < monedasActivas.length - 1 ? '12px' : '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t2)' }}>{mnd === 'USD' ? '🇺🇸' : mnd === 'UYU' ? '🇺🇾' : '🇦🇷'} {mnd}</span>
                                        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)', letterSpacing: '-1px' }}>{formatMonto(bld.neto, mnd)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <KPICard title="Total Ingresos Anual" value={formatMonto(balAnual.ingresos, moneda)} icon={<TrendingUp size={18} color="var(--green-main)" />} trend={balAnual.ingresos > 0 ? { up: true, label: '+ Activo' } : undefined} sub={`Acumulado de ${anio}`} />
                    <KPICard title="Total Gastos Anual" value={formatMonto(balAnual.gastos, moneda)} icon={<TrendingDown size={18} color="var(--red-soft)" />} sub="Salidas operativas" />
                    <KPICard title="Margen Promedio" value={`${margenAnual}%`} icon={<Divide size={18} color="var(--blue-500)" />} trend={parseFloat(margenAnual) > 30 ? { up: true, label: 'Saludable' } : { up: false, label: 'Crítico' }} />
                </div>

                {/* 2. Charts */}
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    {/* Bar Chart Comparativo */}
                    <div style={{ background: 'var(--white)', borderRadius: '32px', padding: '40px', boxShadow: 'var(--shadow-sm)', flex: '2 1 600px', minWidth: '400px' }}>
                        <div style={{ marginBottom: '32px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.5px' }}>Ingresos vs Gastos {anio}</h3>
                            <p style={{ fontSize: '14px', color: 'var(--t3)', fontWeight: 500, marginTop: '4px' }}>Comparativa interanual agrupada mensual</p>
                        </div>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={monthlyData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barGap={6} barSize={16}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-sm)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: 'var(--t3)', fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--t3)', fontWeight: 500 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                <Tooltip cursor={{ fill: 'var(--gray-50)' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: 'var(--shadow-lg)', fontSize: '14px', fontWeight: 600, padding: '16px 20px' }} formatter={(value: any) => formatMonto(value, moneda)} />
                                <Legend wrapperStyle={{ paddingTop: '24px', fontSize: '14px', fontWeight: 600, color: 'var(--t2)' }} iconType="circle" />
                                <Bar dataKey="Ingresos" fill="var(--green-main)" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="Gastos" fill="var(--red-soft)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Area Chart Margen */}
                    <div style={{ background: 'var(--white)', borderRadius: '32px', padding: '40px', boxShadow: 'var(--shadow-sm)', flex: '1 1 400px', minWidth: '320px' }}>
                        <div style={{ marginBottom: '32px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.5px' }}>Tendencia de Margen (%)</h3>
                            <p style={{ fontSize: '14px', color: 'var(--t3)', fontWeight: 500, marginTop: '4px' }}>Fluctuación del rendimiento mensual</p>
                        </div>
                        <ResponsiveContainer width="100%" height={320}>
                            <AreaChart data={monthlyData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorMargen" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--t1)" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="var(--t1)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-sm)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--t3)', fontWeight: 600 }} dy={10} minTickGap={20} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--t3)', fontWeight: 500 }} tickFormatter={v => `${v.toFixed(0)}%`} domain={[0, highestMargin > 100 ? 'auto' : 100]} />
                                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: 'var(--shadow-lg)', fontSize: '14px', fontWeight: 600, padding: '16px 20px' }} formatter={(value: any) => `${value.toFixed(1)}%`} />
                                <Area type="monotone" dataKey="Margen" stroke="var(--t1)" strokeWidth={4} fillOpacity={1} fill="url(#colorMargen)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Distribution Categories */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                    <div style={{ background: 'var(--white)', borderRadius: '32px', padding: '40px', boxShadow: 'var(--shadow-sm)' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', marginBottom: '32px', letterSpacing: '-0.5px' }}>Distribución de Ingresos {anio}</h3>
                        <HorzBars items={eItemsAnual} palette={PAL_E} onCatClick={(cat) => openCat(cat, aMovesMoneda)} />
                    </div>
                    <div style={{ background: 'var(--white)', borderRadius: '32px', padding: '40px', boxShadow: 'var(--shadow-sm)' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', marginBottom: '32px', letterSpacing: '-0.5px' }}>Distribución de Gastos {anio}</h3>
                        <HorzBars items={sItemsAnual} palette={PAL_S} onCatClick={(cat) => openCat(cat, aMovesMoneda)} />
                    </div>
                </div>

            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: '40px' }}>
            <TopBar
                title="Finanzas"
                heading="Balance del Establecimiento"
                subtitle="Visualiza tus KPIs del negocio"
                actions={topbarActions}
                hideCurrencyToggle={true}
            />
            <div className="page-content" style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', paddingTop: '24px' }}>
                {vista === 'mensual' ? renderMensual() : renderAnual()}
            </div>

            {catModal && <CatDetailModal cat={catModal.cat} movs={catModal.movs} onClose={() => setCatModal(null)} onEdit={mov => { setEditMov({ mov, tipo: mov.tipo }); }} />}
            {editMov && <ModalRegistrar tipoInicial={editMov.tipo} movimientoEditar={editMov.mov} onClose={() => setEditMov(null)} onGuardado={() => { setKey(k => k + 1); setEditMov(null); }} />}
        </div>
    );
}
