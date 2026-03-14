import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { ChevronLeft, ChevronRight, ChevronDown, X, BarChart2, TrendingUp, TrendingDown, Divide, AlertTriangle, CheckCircle, Info, Calendar, Download, Printer } from 'lucide-react';
import type { Movimiento, Categoria, TipoMovimiento } from '../types';
import { formatMonto, formatMesLabel, calcularBalance, formatFechaCorta, getTrimestreInfo } from '../utils/helpers';
import { TopBar } from '../components/TopBar';
import { ModalRegistrar } from '../components/ModalRegistrar';
import { dataService } from '../lib/dataService';
import { useMonedas } from '../utils/useMoneda';

const PAL_E = ['#cddc39', '#8bc34a', '#4caf50', '#009688'];
const PAL_S = ['#f44336', '#ff9800', '#ff5722', '#795548'];

interface CatItem { cat: Partial<Categoria> & { id: string | number }; monto: number; pct: number; }

// ── Horizontal category bars ──────────────
function HorzBars({ items, palette, onCatClick }: { items: CatItem[]; palette: string[]; onCatClick: (cat: any) => void }) {
    const { moneda } = useMonedas();
    if (!items.length) return <p style={{ fontSize: '14px', color: 'var(--t3)', textAlign: 'center', padding: '24px 0' }}>Faltan datos para mostrar.</p>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.slice(0, 5).map((item, i) => {
                const bgClr = palette[i % palette.length];
                return (
                    <div key={item.cat.id ?? i} onClick={() => onCatClick(item.cat)} style={{ cursor: 'pointer', padding: '12px 16px', borderRadius: '16px', transition: 'background 0.2s', display: 'flex', flexDirection: 'column', gap: '10px' }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: bgClr, flexShrink: 0 }} />
                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)' }}>{item.cat.nombre}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.3px' }}>{formatMonto(item.monto, moneda)}</span>
                                <span style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 600, minWidth: '38px', textAlign: 'right' }}>{item.pct.toFixed(0)}%</span>
                            </div>
                        </div>
                        <div style={{ height: '5px', background: 'var(--gray-100)', borderRadius: '6px', width: '100%', overflow: 'hidden' }}>
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

// ── Feedback Header Component (Smart Summary) ──────────────
function FeedbackHeader({ bal, type, periodLabel, moneda, itemsE, itemsS }: { bal: any, type: string, periodLabel: string, moneda: string, itemsE: CatItem[], itemsS: CatItem[] }) {
    const margin = bal.ingresos > 0 ? (bal.neto / bal.ingresos) * 100 : (bal.gastos > 0 ? -100 : 0);
    const concentration = itemsS.length > 0 ? itemsS[0].pct : 0;

    let status = 'neutral';
    if (bal.ingresos > 0) {
        if (margin > 35) status = 'excelente';
        else if (margin > 4) status = 'estable';
        else if (margin > -15) status = 'ajustado';
        else status = 'critico';
    } else if (bal.gastos > 0) {
        status = 'inversion';
    } else {
        status = 'vacio';
    }

    const messages: Record<string, string[]> = {
        excelente: [
            `Rendimiento sobresaliente (${margin.toFixed(0)}%). El establecimiento en ${periodLabel} supera los índices estándar de rentabilidad.`,
            `Salud financiera robusta. La gestión de ${periodLabel} refleja una gran capacidad de generación de valor.`,
            `Excedente de caja extraordinario (${margin.toFixed(0)}%). Posición de solidez ideal para el crecimiento.`
        ],
        estable: [
            `Marcha operativa equilibrada (${margin.toFixed(0)}%). En ${periodLabel} sostienes un margen que permite mantener el capital de giro.`,
            `Resultados consistentes. El balance de ${periodLabel} es positivo; buen escenario para planificar mejoras.`,
            `Estabilidad productiva. Los ingresos de ${periodLabel} compensan los egresos, fortaleciendo la resiliencia.`
        ],
        ajustado: [
            `Alerta de rentabilidad. En ${periodLabel}, el ${(bal.gastos / bal.ingresos * 100).toFixed(0)}% de ingresos van a costos. Margen acotado.`,
            `Presión sobre el capital. El margen del ${margin.toFixed(0)}% en ${periodLabel} obliga a una gestión fina de insumos.`,
            `Punto de equilibrio cercano. ${periodLabel} cierra con excedente mínimo. Auditar eficiencia es clave.`
        ],
        critico: [
            `Déficit operativo detectado. El neto de ${periodLabel} cierra en rojo (${formatMonto(bal.neto, moneda)}). Riesgo de descapitalización.`,
            `Situación financiera de riesgo. Egresos superaron la generación de ${periodLabel}. Urge revisar estrategia de ventas.`,
            `Descapitalización temporal. Pérdidas significativas en ${periodLabel}. Se requiere análisis de viabilidad profundo.`
        ],
        inversion: [
            `Fase de implantación y cuidados. Sin ventas en ${periodLabel}, el flujo es de salida para inversión productiva.`,
            `Periodo de acumulación. Los gastos en ${periodLabel} son el combustible para la zafra futura. Cuida la liquidez.`,
            `Etapa de fondeo operativo. Ciclos largos: en ${periodLabel} toca controlar el presupuesto para llegar con aire a la venta.`
        ],
        vacio: [
            `Faltan registros de actividad. Completa los movimientos de ${periodLabel} para diagnosticar la salud financiera.`,
            `Sin datos de gestión. Anota tus ventas o compras de insumos para obtener el análisis técnico de ${periodLabel}.`,
            `Tablero en blanco. La potencia de Ruralit se activa con tus datos. Registra la actividad de ${periodLabel}.`
        ]
    };

    const recommendations: Record<string, string[]> = {
        excelente: ["Ideal para crear un fondo de reserva o adelantar compra de insumos."],
        estable: ["Mantén el foco en optimizar costos variables para saltar de margen."],
        ajustado: ["Identifica el gasto principal y busca alternativas para recuperar aire."],
        critico: ["Reduce gastos no operativos y evalúa venta de activos improductivos."],
        inversion: ["Asegura que el costo por hectárea se mantenga dentro de lo previsto."],
        vacio: ["Registrar gastos hormiga ayuda a ver fugas invisibles de capital."]
    };

    const strForHash = periodLabel + type + (bal.ingresos + bal.gastos).toString();
    let hash = 0;
    for (let i = 0; i < strForHash.length; i++) hash = ((hash << 5) - hash) + strForHash.charCodeAt(i);
    const msg = messages[status][Math.abs(hash) % messages[status].length];
    const rec = recommendations[status][Math.abs(hash * 3) % recommendations[status].length];

    const colors: Record<string, string> = {
        excelente: 'var(--green-main)',
        estable: 'var(--blue-main)',
        ajustado: '#F57C00',
        critico: 'var(--red-soft)',
        inversion: '#607D8B',
        vacio: 'var(--t3)'
    };

    return (
        <div style={{
            background: 'var(--white)',
            borderRadius: '24px',
            padding: '20px 24px',
            border: '1px solid var(--border-sm)',
            borderLeft: `6px solid ${colors[status]}`,
            marginBottom: '24px',
            boxShadow: 'var(--shadow-xs)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: `${colors[status]}12`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors[status],
                    flexShrink: 0
                }}>
                    {status === 'excelente' && <TrendingUp size={20} />}
                    {status === 'estable' && <CheckCircle size={20} />}
                    {status === 'ajustado' && <AlertTriangle size={20} />}
                    {status === 'critico' && <AlertTriangle size={20} />}
                    {status === 'inversion' && <Calendar size={20} />}
                    {status === 'vacio' && <Info size={20} />}
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 900, color: colors[status], textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            {type === 'mensual' ? 'Mes' : type === 'trimestral' ? 'Trimestral' : 'Anual'} — {periodLabel}
                        </span>
                    </div>

                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', lineHeight: 1.4 }}>
                        {msg} <span style={{ fontWeight: 500, color: 'var(--t3)', marginLeft: '4px' }}>{rec}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Analysis Section Component ──────────────
interface AnalysisData {
    bal: any;
    prevBal?: any;
    itemsE: CatItem[];
    itemsS: CatItem[];
    movs: Movimiento[];
    type: 'mensual' | 'trimestral' | 'anual';
    moneda: string;
    catMap: Map<string, Categoria>;
    periodLabel: string;
}

function AnalysisSection({ bal, prevBal, itemsE, itemsS, movs, type, moneda, catMap, periodLabel }: AnalysisData) {
    type InsightType = { type: 'warning' | 'success' | 'info', text: string };
    const insights: InsightType[] = [];

    // 1. Concentration
    if (itemsS.length > 0 && itemsS[0].pct > 40) {
        insights.push({
            type: 'warning',
            text: `Tus egresos están concentrados. El ${itemsS[0].pct.toFixed(0)}% del total es en "${itemsS[0].cat.nombre || 'Sin categoría'}". Monitorear esto es clave para tus costos productivos.`
        });
    }

    // 2. Comparison
    if (prevBal && prevBal.gastos > 0) {
        const varG = ((bal.gastos - prevBal.gastos) / prevBal.gastos) * 100;
        if (varG > 15) {
            insights.push({
                type: 'warning',
                text: `Los costos aumentaron un ${varG.toFixed(0)}% vs el ${type === 'mensual' ? 'mes' : 'periodo'} anterior. Revisalo si fue imprevisto o planificado.`
            });
        } else if (varG < -15) {
            insights.push({
                type: 'success',
                text: `Tus costos bajaron un ${Math.abs(varG).toFixed(0)}% frente al ${type === 'mensual' ? 'mes' : 'periodo'} anterior. Buen control de caja.`
            });
        }
    }

    // 3. Status
    if (bal.ingresos > bal.gastos * 1.5) {
        insights.push({
            type: 'success',
            text: `Flujo altamente positivo. Asegura reinvertir este margen o crear un fondo sólido para etapas de sequía o meses de baja venta.`
        });
    } else if (bal.ingresos === 0 && bal.gastos > 0) {
        insights.push({
            type: 'info',
            text: `${type === 'mensual' ? 'Mes' : 'Periodo'} de salida con 0 facturación. Asegura tu capital de trabajo para no descapitalizarte.`
        });
    } else if (bal.gastos > bal.ingresos) {
        insights.push({
            type: 'warning',
            text: `Operación en rojo neto temporal (${formatMonto(bal.neto, moneda)}). Prevé ajustar la estructura si esto no corresponde a una inversión normal.`
        });
    }

    if (insights.length === 0 && type !== 'anual') return null;

    const qtyIngreso = movs.filter(m => m.tipo === 'ingreso').length;
    const freeMargin = bal.ingresos > 0 ? (bal.neto / bal.ingresos) * 100 : 0;

    return (
        <div style={{ background: 'var(--white)', borderRadius: '28px', padding: '24px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--blue-main)', letterSpacing: '-0.3px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <TrendingUp size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>Análisis de Resultados y Métricas Clave ({type === 'mensual' ? 'Mes' : type === 'trimestral' ? 'Trimestral' : 'Anual'})</span>
                </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {insights.slice(0, 3).map((insight, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: `4px solid ${insight.type === 'warning' ? '#F57C00' : insight.type === 'success' ? '#388E3C' : '#1976D2'}`, boxShadow: 'var(--shadow-xs)' }}>
                            <div style={{ marginTop: '2px', flexShrink: 0 }}>
                                {insight.type === 'warning' && <AlertTriangle size={14} color="#F57C00" strokeWidth={2.5} />}
                                {insight.type === 'success' && <CheckCircle size={14} color="#388E3C" strokeWidth={2.5} />}
                                {insight.type === 'info' && <Info size={14} color="#1976D2" strokeWidth={2.5} />}
                            </div>
                            <p style={{ fontSize: '12.5px', color: 'var(--t1)', lineHeight: 1.45, fontWeight: 500 }}>{insight.text}</p>
                        </div>
                    ))}
                    {type === 'anual' && (
                        <div style={{ background: 'var(--gray-50)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            <p style={{ fontSize: '13px', color: 'var(--t2)', fontWeight: 700, marginBottom: '8px' }}>Rendimiento Anual Detallado</p>
                            <p style={{ fontSize: '13px', color: 'var(--t1)', lineHeight: 1.5 }}>
                                Análisis consolidado del ejercicio {periodLabel}. Se observa una {freeMargin > 0 ? 'rentabilidad positiva' : 'necesidad de ajuste'} con {qtyIngreso} eventos de ingreso detectados.
                            </p>
                        </div>
                    )}
                </div>

                <div style={{ background: 'var(--bg)', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Indicadores de Desempeño</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
                        <div>
                            <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 600, marginBottom: '4px' }}>Top Gasto</p>
                            <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)' }}>{itemsS.length > 0 ? formatMonto(itemsS[0].monto, moneda) : '-'}</p>
                            <p style={{ fontSize: '12px', color: 'var(--red-soft)', fontWeight: 600 }}>{itemsS.length > 0 ? (itemsS[0].cat.nombre || 'Sin categoría') : '-'}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 600, marginBottom: '4px' }}>Top Ingreso</p>
                            <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)' }}>{itemsE.length > 0 ? formatMonto(itemsE[0].monto, moneda) : '-'}</p>
                            <p style={{ fontSize: '12px', color: 'var(--green-main)', fontWeight: 600 }}>{itemsE.length > 0 ? (itemsE[0].cat.nombre || 'Sin categoría') : '-'}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 600, marginBottom: '4px' }}>Margen Libre</p>
                            <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)' }}>{freeMargin.toFixed(1)}%</p>
                            <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 500 }}>{freeMargin > 0 ? 'Global' : 'A pérdida'}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 600, marginBottom: '4px' }}>Eventos Ingreso</p>
                            <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)' }}>{qtyIngreso}</p>
                            <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 500 }}>{type === 'anual' ? 'en el año' : 'en el ciclo'}</p>
                        </div>
                        {type === 'anual' && (
                            <>
                                <div>
                                    <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 600, marginBottom: '4px' }}>Promedio Mensual</p>
                                    <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)' }}>{formatMonto(bal.ingresos / 12, moneda)}</p>
                                    <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 500 }}>Ingresos Brutos</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 600, marginBottom: '4px' }}>Eficiencia Gasto</p>
                                    <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)' }}>{bal.ingresos > 0 ? ((bal.gastos / bal.ingresos) * 100).toFixed(0) : 0}%</p>
                                    <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 500 }}>Costos vs Ventas</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 600, marginBottom: '4px' }}>Periodos con Venta</p>
                                    <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)' }}>{qtyIngreso}</p>
                                    <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 500 }}>Hitos de Comercialización</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 600, marginBottom: '4px' }}>Resultado Operativo</p>
                                    <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--green-main)', fontFamily: 'var(--font-mono)' }}>{formatMonto(bal.neto, moneda)}</p>
                                    <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 500 }}>Balance Final {periodLabel}</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── KPI Card Component ───────────────────────────────────────
const KPICard = ({ title, value, sub, icon, trend }: any) => (
    <div style={{ background: 'var(--white)', borderRadius: '24px', padding: '24px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {icon} {title}
        </p>
        <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-1.2px', fontFamily: 'var(--font-mono)' }}>{value}</p>
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {trend && <span style={{ padding: '3px 8px', borderRadius: '6px', background: trend.up ? 'var(--green-light)' : 'var(--gray-100)', color: trend.up ? 'var(--green-main)' : 'var(--t2)', fontSize: '11px', fontWeight: 700 }}>{trend.label}</span>}
            {sub && <span style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 500 }}>{sub}</span>}
        </div>
    </div>
);

// ── Main Balance ─────────────────────────────────────────────
type Vista = 'mensual' | 'trimestral' | 'anual';

export function Balance() {
    const [vista, setVista] = useState<Vista>('mensual');
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth());
    const [movsMes, setMovsMes] = useState<Movimiento[]>([]);
    const [movsTrim, setMovsTrim] = useState<Movimiento[]>([]);
    const [movsPrev, setMovsPrev] = useState<Movimiento[]>([]);
    const [movsAnio, setMovsAnio] = useState<Movimiento[]>([]);

    const [catModal, setCatModal] = useState<{ cat: Categoria; movs: Movimiento[] } | null>(null);
    const [editMov, setEditMov] = useState<{ mov: Movimiento; tipo: TipoMovimiento } | null>(null);
    const [key, setKey] = useState(0);

    const [categorias, setCats] = useState<Categoria[]>([]);
    const catMap = new Map<string, Categoria>(categorias.map(c => [String(c.id), c]));
    const { moneda, monedasActivas, changeMoneda } = useMonedas();

    const CurrencyTabs = () => (
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-sm)', width: 'fit-content' }}>
            {monedasActivas.map(mnd => (
                <button
                    key={mnd}
                    onClick={() => changeMoneda(mnd)}
                    style={{
                        padding: '4px 10px', borderRadius: '7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        background: mnd === moneda ? 'var(--white)' : 'transparent',
                        color: mnd === moneda ? 'var(--t1)' : 'var(--t3)',
                        border: 'none',
                        boxShadow: mnd === moneda ? 'var(--shadow-xs)' : 'none'
                    }}
                >
                    {mnd}
                </button>
            ))}
        </div>
    );

    const cargarData = useCallback(async () => {
        const activeId = localStorage.getItem('activeEstDB_uuid');
        if (!activeId) return;

        // Load categories if not loaded
        if (categorias.length === 0) {
            const c = await dataService.getCategorias(activeId);
            setCats(c);
        }

        if (vista === 'mensual') {
            const ini = new Date(anio, mes, 1).toISOString().split('T')[0];
            const fin = new Date(anio, mes + 1, 0).toISOString().split('T')[0];
            const mesRows = await dataService.getMovimientos(activeId, { from: ini, to: fin });
            setMovsMes(mesRows);

            let pm = mes - 1, pa = anio;
            if (pm < 0) { pm = 11; pa--; }
            const pIni = new Date(pa, pm, 1).toISOString().split('T')[0];
            const pFin = new Date(pa, pm + 1, 0).toISOString().split('T')[0];
            const prevRows = await dataService.getMovimientos(activeId, { from: pIni, to: pFin });
            setMovsPrev(prevRows);
        } else if (vista === 'trimestral') {
            const { inicio, fin } = getTrimestreInfo(new Date(anio, mes, 1));
            const trimRows = await dataService.getMovimientos(activeId, { from: inicio, to: fin });
            setMovsTrim(trimRows);
        } else {
            const ini = new Date(anio, 0, 1).toISOString().split('T')[0];
            const fin = new Date(anio, 11, 31).toISOString().split('T')[0];
            const anioRows = await dataService.getMovimientos(activeId, { from: ini, to: fin });
            setMovsAnio(anioRows);
        }
    }, [anio, mes, vista, key, categorias.length]);

    useEffect(() => { 
        void cargarData(); 

        const handleRefresh = () => {
            setKey(k => k + 1); // Trigger re-load through dependency
        };
        window.addEventListener('ruralit_data_changed', handleRefresh);
        window.addEventListener('ruralit_estab_changed', handleRefresh);
        
        return () => {
            window.removeEventListener('ruralit_data_changed', handleRefresh);
            window.removeEventListener('ruralit_estab_changed', handleRefresh);
        };
    }, [cargarData]);

    const navMes = (d: -1 | 1) => { let m = mes + d, a = anio; if (m < 0) { m = 11; a--; } if (m > 11) { m = 0; a++; } setMes(m); setAnio(a); };
    const navTrim = (d: -1 | 1) => { let m = mes + (d * 3), a = anio; if (m < 0) { m = 9; a--; } if (m > 11) { m = 0; a++; } setMes(m); setAnio(a); };

    const buildCatItems = (tipo: 'ingreso' | 'gasto', dataset: Movimiento[]): CatItem[] => {
        const fil = dataset.filter(m => m.tipo === tipo && (m.moneda || 'UYU') === moneda), total = fil.reduce((s, m) => s + m.monto, 0);
        const dict = new Map<string, number>();
        fil.forEach(m => dict.set(String(m.categoriaId), (dict.get(String(m.categoriaId)) ?? 0) + m.monto));
        return [...dict.entries()].map(([id, t]) => ({
            cat: (catMap.get(id) as any) ?? { id, nombre: 'Sin cat.', tipo, icono: '📦', esPredefinida: false, color: '' },
            monto: t, pct: total > 0 ? (t / total) * 100 : 0,
        })).sort((a, b) => b.monto - a.monto);
    };

    const openCat = (cat: Categoria, dataset: Movimiento[]) => setCatModal({ cat, movs: dataset.filter(m => String(m.categoriaId) === String(cat.id)) });

    const topbarActions = (
        <div className="balance-selectors-wrap">
            {/* Unified Dropdown for Desktop and Mobile */}
            <div className="year-select-minimal" style={{ flexShrink: 0, minWidth: '100px' }}>
                <select value={vista} onChange={(e) => setVista(e.target.value as any)}>
                    <option value="mensual">Mensual</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="anual">Anual</option>
                </select>
                <ChevronDown size={14} className="select-arrow" />
            </div>
            {vista === 'mensual' ? (
                <div className="date-nav-minimal" style={{ minWidth: '120px', flexShrink: 0 }}>
                    <button className="nav-arrow" style={{ padding: '8px 6px' }} onClick={() => navMes(-1)}><ChevronLeft size={16} /></button>
                    <span className="nav-label" style={{ fontSize: '12px', padding: '0 4px' }}>{formatMesLabel(anio, mes)}</span>
                    <button className="nav-arrow" style={{ padding: '8px 6px' }} onClick={() => navMes(1)}><ChevronRight size={16} /></button>
                </div>
            ) : vista === 'trimestral' ? (
                <div className="date-nav-minimal" style={{ minWidth: '120px', flexShrink: 0 }}>
                    <button className="nav-arrow" style={{ padding: '8px 6px' }} onClick={() => navTrim(-1)}><ChevronLeft size={16} /></button>
                    <span className="nav-label" style={{ fontSize: '12px', padding: '0 4px' }}>{getTrimestreInfo(new Date(anio, mes, 1)).label}</span>
                    <button className="nav-arrow" style={{ padding: '8px 6px' }} onClick={() => navTrim(1)}><ChevronRight size={16} /></button>
                </div>
            ) : (
                <div className="year-select-minimal" style={{ minWidth: '80px', flexShrink: 0 }}>
                    <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} style={{ padding: '8px 24px 8px 10px', fontSize: '12px' }}>
                        {[anio - 2, anio - 1, anio, anio + 1].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <ChevronDown size={12} className="select-arrow" style={{ right: '8px' }} />
                </div>
            )}
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button
                    onClick={() => {
                        const currentMovs = vista === 'mensual' ? movsMes : vista === 'trimestral' ? movsTrim : movsAnio;
                        if (currentMovs.length === 0) {
                            alert('No hay datos para exportar en este periodo');
                            return;
                        }
                        const label = vista === 'mensual' ? formatMesLabel(anio, mes) : vista === 'trimestral' ? getTrimestreInfo(new Date(anio, mes, 1)).label : `Año ${anio}`;
                        import('../utils/exportUtils').then(mod => {
                            mod.exportBalanceFullCSV(currentMovs, catMap, label);
                        });
                    }}
                    className="nav-arrow"
                    style={{ background: 'var(--gray-100)', color: 'var(--t2)' }}
                    title="Exportar CSV"
                >
                    <Download size={16} />
                </button>
                <button
                    onClick={() => window.print()}
                    className="nav-arrow"
                    style={{ background: 'var(--blue-light)', color: 'var(--blue-main)' }}
                    title="Imprimir Reporte (PDF)"
                >
                    <Printer size={16} />
                </button>
            </div>
        </div>
    );

    // ── Render Mensual ───────────────────────────────────────
    const renderMensual = () => {
        const movsMesMoneda = movsMes.filter(m => (m.moneda || 'UYU') === moneda);
        const movsPrevMoneda = movsPrev.filter(m => (m.moneda || 'UYU') === moneda);
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
            <div className="no-print" style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-sm)', width: 'fit-content' }}>
                {monedasActivas.map(mnd => (
                    <button
                        key={mnd}
                        onClick={() => changeMoneda(mnd)}
                        style={{
                            padding: '4px 10px', borderRadius: '7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                            background: mnd === moneda ? 'var(--white)' : 'transparent',
                            color: mnd === moneda ? 'var(--t1)' : 'var(--t3)',
                            border: 'none',
                            boxShadow: mnd === moneda ? 'var(--shadow-xs)' : 'none'
                        }}
                    >
                        {mnd}
                    </button>
                ))}
            </div>
        );

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <FeedbackHeader
                    bal={balMoneda}
                    type="mensual"
                    periodLabel={formatMesLabel(anio, mes)}
                    moneda={moneda}
                    itemsE={eItems}
                    itemsS={sItems}
                />
                {/* BIG HERO REPORT */}
                <div className="print-section" style={{ background: 'var(--white)', borderRadius: '28px', padding: '24px 28px', boxShadow: 'var(--shadow-sm)' }}>
                    <div className="print-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', alignItems: 'center' }}>

                        {/* Saldo Principal */}
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '220px' }}>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t2)', marginBottom: '4px' }}>Tu Saldo del Mes</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                                {monedasActivas.map((mnd, idx) => {
                                    const mvs = movsMes.filter(m => (m.moneda || 'UYU') === mnd);
                                    const pv = movsPrev.filter(m => (m.moneda || 'UYU') === mnd);
                                    const b = calcularBalance(mvs);
                                    const bP = calcularBalance(pv);
                                    const dp = b.neto - bP.neto;
                                    const mgn = b.ingresos > 0 ? ((b.neto / b.ingresos) * 100).toFixed(1) : '0.0';

                                    return (
                                        <div key={mnd} style={{ borderBottom: idx < monedasActivas.length - 1 ? '1px solid var(--border-sm)' : 'none', paddingBottom: idx < monedasActivas.length - 1 ? '12px' : '0' }}>
                                            <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-1.2px', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
                                                {formatMonto(b.neto, mnd)}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                                                <p style={{ fontSize: '11px', color: '#999999' }}>
                                                    <span style={{ fontWeight: 600 }}>{mnd}</span> {dp !== 0 ? `(${dp >= 0 ? '+' : ''}${formatMonto(dp, mnd)})` : ''}
                                                </p>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--blue-main)', background: 'var(--blue-light)', padding: '3px 6px', borderRadius: '6px' }}>
                                                    {mgn}%
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div style={{ width: '100%', height: '260px', flex: 2, minWidth: '320px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Evolución Mensual</p>
                                <CurrencyTabs />
                            </div>
                            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorIngreso" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--green-main)" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="var(--green-main)" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorGasto" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--red-soft)" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="var(--red-soft)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--t3)', fontWeight: 400 }} dy={10} minTickGap={20} />
                                        <Tooltip
                                            formatter={(value: any) => formatMonto(value, moneda)}
                                            contentStyle={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', fontSize: '13px', fontWeight: 600, padding: '12px 16px' }}
                                            itemStyle={{ color: 'var(--t1)' }}
                                            labelStyle={{ color: 'var(--t3)', marginBottom: '8px', fontSize: '12px', fontWeight: 500 }}
                                        />
                                        <Area type="monotone" dataKey="Ingresos" stroke="var(--green-main)" strokeWidth={3} fillOpacity={1} fill="url(#colorIngreso)" dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                                        <Area type="monotone" dataKey="Gastos" stroke="var(--red-soft)" strokeWidth={3} fillOpacity={1} fill="url(#colorGasto)" dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Secondary Stats */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '180px' }}>
                            <div>
                                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Ingresos Totales</h3>
                                <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)', letterSpacing: '-1.2px' }}>{formatMonto(balMoneda.ingresos, moneda)}</p>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Gastos Totales</h3>
                                <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)', letterSpacing: '-1.2px' }}>{formatMonto(balMoneda.gastos, moneda)}</p>
                                <p style={{ fontSize: '11px', color: '#999999', marginTop: '6px', fontWeight: 500 }}>
                                    {balMoneda.ingresos > 0 ? `${((balMoneda.gastos / balMoneda.ingresos) * 100).toFixed(0)}% de salidas` : 'Sin gastos'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="print-section">
                    <AnalysisSection
                        bal={balMoneda}
                        prevBal={balPrevMoneda}
                        itemsE={eItems}
                        itemsS={sItems}
                        movs={movsMesMoneda}
                        type="mensual"
                        moneda={moneda}
                        catMap={catMap}
                        periodLabel={formatMesLabel(anio, mes)}
                    />
                </div>

                {/* LOWER SECTION GRID */}
                <div className="print-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
                    <div className="avoid-break" style={{ background: 'var(--white)', borderRadius: '28px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', marginBottom: '20px', letterSpacing: '-0.3px' }}>Ingresos por Categoría</h3>
                        <HorzBars items={eItems} palette={PAL_E} onCatClick={(cat) => openCat(cat, movsMesMoneda)} />
                    </div>
                    <div className="avoid-break" style={{ background: 'var(--white)', borderRadius: '28px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', marginBottom: '20px', letterSpacing: '-0.3px' }}>Gastos por Categoría</h3>
                        <HorzBars items={sItems} palette={PAL_S} onCatClick={(cat) => openCat(cat, movsMesMoneda)} />
                    </div>
                </div>
            </div>
        );
    };

    // ── Render Trimestral ───────────────────────────────────────
    const renderTrimestral = () => {
        const tMovesMoneda = movsTrim.filter(m => (m.moneda || 'UYU') === moneda);
        const balTrim = calcularBalance(tMovesMoneda);
        const margenTrim = balTrim.ingresos > 0 ? ((balTrim.neto / balTrim.ingresos) * 100).toFixed(1) : '0.0';

        const { inicio, fin } = getTrimestreInfo(new Date(anio, mes, 1));
        const mesIni = parseInt(inicio.slice(5, 7));
        const mesesLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        const chartData = Array.from({ length: 3 }, (_, i) => {
            const mIdx = (mesIni - 1) + i;
            return { name: mesesLabels[mIdx], Ingresos: 0, Gastos: 0, Margen: 0, Neto: 0 };
        });

        tMovesMoneda.forEach(m => {
            const mth = parseInt(m.fecha.slice(5, 7)) - 1;
            const idx = mth - (mesIni - 1);
            if (idx >= 0 && idx < 3) {
                if (m.tipo === 'ingreso') chartData[idx].Ingresos += m.monto;
                else chartData[idx].Gastos += m.monto;
            }
        });

        let highestMargin = 0;
        chartData.forEach(d => {
            d.Neto = d.Ingresos - d.Gastos;
            d.Margen = d.Ingresos > 0 ? (d.Neto / d.Ingresos) * 100 : 0;
            if (d.Margen > highestMargin) highestMargin = d.Margen;
        });

        const eItems = buildCatItems('ingreso', tMovesMoneda);
        const sItems = buildCatItems('gasto', tMovesMoneda);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <FeedbackHeader
                    bal={balTrim}
                    type="trimestral"
                    periodLabel={getTrimestreInfo(new Date(anio, mes, 1)).label}
                    moneda={moneda}
                    itemsE={eItems}
                    itemsS={sItems}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: -8 }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.5px' }}>Análisis por Moneda</h2>
                    <CurrencyTabs />
                </div>

                <div className="print-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                    <div className="avoid-break" style={{ background: 'var(--white)', borderRadius: '32px', padding: '32px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart2 size={18} color="var(--t1)" /> Balance Neto Trimestral
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {monedasActivas.map((mnd, idx) => {
                                const mvTr = movsTrim.filter(m => (m.moneda || 'UYU') === mnd);
                                const bld = calcularBalance(mvTr);
                                return (
                                    <div key={mnd} style={{ borderBottom: idx < monedasActivas.length - 1 ? '1px solid var(--border-sm)' : 'none', paddingBottom: idx < monedasActivas.length - 1 ? '12px' : '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t2)' }}>{mnd}</span>
                                        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)', letterSpacing: '-1px' }}>{formatMonto(bld.neto, mnd)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="avoid-break"><KPICard title="Ingresos del Trimestre" value={formatMonto(balTrim.ingresos, moneda)} icon={<TrendingUp size={18} color="var(--green-main)" />} sub={`Periodo ${mesesLabels[mesIni - 1]} - ${mesesLabels[mesIni + 1]}`} /></div>
                    <div className="avoid-break"><KPICard title="Gastos del Trimestre" value={formatMonto(balTrim.gastos, moneda)} icon={<TrendingDown size={18} color="var(--red-soft)" />} sub="Salidas operativas" /></div>
                    <div className="avoid-break"><KPICard title="Margen Bruto" value={`${margenTrim}%`} icon={<Divide size={18} color="var(--blue-500)" />} trend={parseFloat(margenTrim) > 30 ? { up: true, label: 'Saludable' } : { up: false, label: 'Bajo' }} /></div>
                </div>

                <div className="print-section">
                    <AnalysisSection
                        bal={balTrim}
                        itemsE={eItems}
                        itemsS={sItems}
                        movs={tMovesMoneda}
                        type="trimestral"
                        moneda={moneda}
                        catMap={catMap}
                        periodLabel={getTrimestreInfo(new Date(anio, mes, 1)).label}
                    />
                </div>

                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <div style={{ background: 'var(--white)', borderRadius: '32px', padding: '40px', boxShadow: 'var(--shadow-sm)', flex: '1 1 500px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', marginBottom: '32px' }}>Evolución Mensual</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-sm)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: 'var(--t3)', fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--t3)', fontWeight: 500 }} />
                                <Tooltip
                                    cursor={{ fill: 'var(--gray-50)', opacity: 0.1 }}
                                    contentStyle={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', padding: '12px 16px' }}
                                    itemStyle={{ color: 'var(--t1)', fontSize: '14px', fontWeight: 600 }}
                                    labelStyle={{ color: 'var(--t3)', fontSize: '12px', marginBottom: '4px' }}
                                    formatter={(v: any) => formatMonto(v, moneda)}
                                />
                                <Bar dataKey="Ingresos" fill="var(--green-main)" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="Gastos" fill="var(--red-soft)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="print-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                    <div className="avoid-break" style={{ background: 'var(--white)', borderRadius: '28px', padding: '28px', boxShadow: 'var(--shadow-sm)' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--t1)', marginBottom: '32px' }}>Mayores Ingresos</h3>
                        <HorzBars items={eItems} palette={PAL_E} onCatClick={(cat) => openCat(cat, tMovesMoneda)} />
                    </div>
                    <div className="avoid-break" style={{ background: 'var(--white)', borderRadius: '28px', padding: '28px', boxShadow: 'var(--shadow-sm)' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--t1)', marginBottom: '32px' }}>Mayores Gastos</h3>
                        <HorzBars items={sItems} palette={PAL_S} onCatClick={(cat) => openCat(cat, tMovesMoneda)} />
                    </div>
                </div>
            </div>
        );
    };

    const renderAnual = () => {
        const aMovesMoneda = movsAnio.filter(m => (m.moneda || 'UYU') === moneda);

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


        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <FeedbackHeader
                    bal={balAnual}
                    type="anual"
                    periodLabel={anio.toString()}
                    moneda={moneda}
                    itemsE={eItemsAnual}
                    itemsS={sItemsAnual}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.5px' }}>Análisis por Moneda</h2>
                    <CurrencyTabs />
                </div>

                {/* 1. KPIs */}
                <div className="print-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>

                    <div className="avoid-break" style={{ background: 'var(--white)', borderRadius: '32px', padding: '32px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart2 size={18} color="var(--t1)" /> Balance Neto Anual
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {monedasActivas.map((mnd, idx) => {
                                const mvAn = movsAnio.filter(m => (m.moneda || 'UYU') === mnd);
                                const bld = calcularBalance(mvAn);
                                return (
                                    <div key={mnd} style={{ borderBottom: idx < monedasActivas.length - 1 ? '1px solid var(--border-sm)' : 'none', paddingBottom: idx < monedasActivas.length - 1 ? '12px' : '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t2)' }}>{mnd}</span>
                                        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--t1)', fontFamily: 'var(--font-mono)', letterSpacing: '-1px' }}>{formatMonto(bld.neto, mnd)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="avoid-break"><KPICard title="Total Ingresos Anual" value={formatMonto(balAnual.ingresos, moneda)} icon={<TrendingUp size={18} color="var(--green-main)" />} trend={balAnual.ingresos > 0 ? { up: true, label: '+ Activo' } : undefined} sub={`Acumulado de ${anio}`} /></div>
                    <div className="avoid-break"><KPICard title="Total Gastos Anual" value={formatMonto(balAnual.gastos, moneda)} icon={<TrendingDown size={18} color="var(--red-soft)" />} sub="Salidas operativas" /></div>
                    <div className="avoid-break"><KPICard title="Margen Promedio" value={`${margenAnual}%`} icon={<Divide size={18} color="var(--blue-500)" />} trend={parseFloat(margenAnual) > 30 ? { up: true, label: 'Saludable' } : { up: false, label: 'Crítico' }} /></div>
                </div>

                {/* 2. Charts */}
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    {/* Bar Chart Comparativo */}
                    <div style={{ background: 'var(--white)', borderRadius: '28px', padding: '32px', boxShadow: 'var(--shadow-sm)', flex: '2 1 600px', minWidth: '400px' }}>
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.3px' }}>Ingresos vs Gastos {anio}</h3>
                            <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 500, marginTop: '2px' }}>Comparativa interanual agrupada mensual</p>
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={monthlyData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barGap={6} barSize={16}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-sm)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: 'var(--t3)', fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--t3)', fontWeight: 500 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    cursor={{ fill: 'var(--gray-50)', opacity: 0.1 }}
                                    contentStyle={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', fontSize: '14px', fontWeight: 600, padding: '12px 16px' }}
                                    itemStyle={{ color: 'var(--t1)' }}
                                    labelStyle={{ color: 'var(--t3)', fontSize: '12px', marginBottom: '4px' }}
                                    formatter={(value: any) => formatMonto(value, moneda)}
                                />
                                <Legend wrapperStyle={{ paddingTop: '24px', fontSize: '14px', fontWeight: 600, color: 'var(--t2)' }} iconType="circle" />
                                <Bar dataKey="Ingresos" fill="var(--green-main)" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="Gastos" fill="var(--red-soft)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Area Chart Margen */}
                    <div style={{ background: 'var(--white)', borderRadius: '28px', padding: '32px', boxShadow: 'var(--shadow-sm)', flex: '1 1 400px', minWidth: '320px' }}>
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.3px' }}>Tendencia de Margen (%)</h3>
                            <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 500, marginTop: '4px' }}>Fluctuación del rendimiento mensual</p>
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
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
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', fontSize: '14px', fontWeight: 600, padding: '12px 16px' }}
                                    itemStyle={{ color: 'var(--t1)' }}
                                    labelStyle={{ color: 'var(--t3)', fontSize: '12px', marginBottom: '4px' }}
                                    formatter={(value: any) => `${value.toFixed(1)}%`}
                                />
                                <Area type="monotone" dataKey="Margen" stroke="var(--t1)" strokeWidth={4} fillOpacity={1} fill="url(#colorMargen)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="print-section">
                    <AnalysisSection
                        bal={balAnual}
                        itemsE={eItemsAnual}
                        itemsS={sItemsAnual}
                        movs={aMovesMoneda}
                        type="anual"
                        moneda={moneda}
                        catMap={catMap}
                        periodLabel={anio.toString()}
                    />
                </div>

                {/* 3. Distribution Categories */}
                <div className="print-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
                    <div className="avoid-break" style={{ background: 'var(--white)', borderRadius: '28px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', marginBottom: '20px', letterSpacing: '-0.3px' }}>Distribución de Ingresos {anio}</h3>
                        <HorzBars items={eItemsAnual} palette={PAL_E} onCatClick={(cat) => openCat(cat, aMovesMoneda)} />
                    </div>
                    <div className="avoid-break" style={{ background: 'var(--white)', borderRadius: '28px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', marginBottom: '20px', letterSpacing: '-0.3px' }}>Distribución de Gastos {anio}</h3>
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
                {vista === 'mensual' ? renderMensual() : vista === 'trimestral' ? renderTrimestral() : renderAnual()}
            </div>

            {catModal && <CatDetailModal cat={catModal.cat} movs={catModal.movs} onClose={() => setCatModal(null)} onEdit={mov => { setEditMov({ mov, tipo: mov.tipo }); }} />}
            {editMov && <ModalRegistrar tipoInicial={editMov.tipo} movimientoEditar={editMov.mov} onClose={() => setEditMov(null)} onGuardado={() => { setKey(k => k + 1); setEditMov(null); }} />}
        </div>
    );
}
