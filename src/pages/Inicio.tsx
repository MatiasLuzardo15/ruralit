import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, BookOpen, Plus, Minus, Send, Search,
    Calculator, Clock, Printer
} from 'lucide-react';
import db from '../db/database';
import type { Movimiento, Categoria, TipoMovimiento } from '../types';
import { formatMonto, formatFechaCorta, formatMesLabel, parseRegistroRapido, hoy, MONEDAS } from '../utils/helpers';
import {  } from 'lucide-react';
import { ModalRegistrar } from '../components/ModalRegistrar';
import { TopBar } from '../components/TopBar';
import { useMonedas } from '../utils/useMoneda';

export function Inicio() {
    const [tipoModal, setTipo] = useState<TipoMovimiento | null>(null);
    const [movEditar, setMovEd] = useState<Movimiento | undefined>();
    const [ultimos, setUltimos] = useState<Movimiento[]>([]);
    const [key, setKey] = useState(0);
    const { moneda, monedasActivas, changeMoneda } = useMonedas();
    const [textoRapido, setTextoRapido] = useState('');

    const categorias = useLiveQuery(() => db.categorias.toArray(), []) ?? [];
    const catMap = new Map<number, Categoria>(categorias.map(c => [c.id!, c]));

    const nombreUsuario = useLiveQuery(
        () => db.config.get('nombreUsuario').then(r => (r?.valor as string) || 'Usuario'),
        []
    );

    const now = new Date();
    const iniMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const mesLabel = formatMesLabel(now.getFullYear(), now.getMonth());

    const mesActualRaw = useLiveQuery(
        () => db.movimientos.where('fecha').between(iniMes, finMes, true, true).toArray(),
        [key]
    ) ?? [];

    const mesActual = mesActualRaw.filter(m => (m.moneda || 'UYU') === moneda);

    const entradas = mesActual.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
    const salidas = mesActual.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);
    const saldo = entradas - salidas;
    const nMov = mesActual.length;

    const cargarUltimos = useCallback(async () => {
        const d = await db.movimientos.orderBy('creado_en').reverse().limit(100).toArray();
        setUltimos(d.filter(m => (m.moneda || 'UYU') === moneda).slice(0, 6));
    }, [key, moneda]);

    useEffect(() => { void cargarUltimos(); }, [cargarUltimos]);

    const onGuardado = () => {
        setKey(k => k + 1);
        setTextoRapido(''); // Limpiar si venía de texto rápido
    };

    const cerrar = () => { setTipo(null); setMovEd(undefined); };
    const editar = (m: Movimiento) => { setMovEd(m); setTipo(m.tipo); };

    const handleRegistroRapido = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = parseRegistroRapido(textoRapido, categorias);
        if (!parsed) {
            alert('No entendí el ingreso o gasto. Probá escribiendo: "gasté 500 en ración"');
            return;
        }

        // Guardar directo rápido (menos de 5 segs)
        const nMovimiento: Omit<Movimiento, 'id'> = {
            tipo: parsed.tipo,
            monto: parsed.monto,
            categoriaId: parsed.categoriaId || 0,
            fecha: hoy(),
            creado_en: new Date().toISOString(),
            nota: parsed.nota,
            moneda: moneda
        };
        await db.movimientos.add(nMovimiento as Movimiento);
        onGuardado();
    };

    const pctGastos = entradas > 0 ? Math.min((salidas / entradas) * 100, 100) : 0;

    // Análisis sin IA
    let catMayorIngreso = "";
    let catMayorGasto = "";

    const dicIngresos = new Map<number, number>();
    const dicGastos = new Map<number, number>();

    mesActual.forEach(m => {
        if (m.tipo === 'ingreso') dicIngresos.set(m.categoriaId, (dicIngresos.get(m.categoriaId) || 0) + m.monto);
        if (m.tipo === 'gasto') dicGastos.set(m.categoriaId, (dicGastos.get(m.categoriaId) || 0) + m.monto);
    });

    let maxI = 0, idMaxI = -1;
    dicIngresos.forEach((v, k) => { if (v > maxI) { maxI = v; idMaxI = k; } });
    if (idMaxI !== -1) catMayorIngreso = catMap.get(idMaxI)?.nombre || "ingreso";

    let maxG = 0, idMaxG = -1;
    dicGastos.forEach((v, k) => { if (v > maxG) { maxG = v; idMaxG = k; } });
    if (idMaxG !== -1) catMayorGasto = catMap.get(idMaxG)?.nombre || "gasto";

    let mensajeEstado = "Sin movimientos en el mes.";
    if (entradas > 0 || salidas > 0) {
        if (saldo > 0) mensajeEstado = "Mes positivo. Tus ingresos superan los gastos.";
        else if (saldo < 0) mensajeEstado = "Mes en negativo. Tus gastos superan los ingresos.";
        else mensajeEstado = "Mes empatado. Ingresos y gastos son iguales.";
    }

    let saludo = 'Hola';
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) saludo = 'Buenos días';
    else if (hora >= 12 && hora < 20) saludo = 'Buenas tardes';
    else saludo = 'Buenas noches';

    return (
        <div className="page-in">
            <TopBar
                title="Mi Establecimiento"
                heading={`${saludo}, ${nombreUsuario}`}
                subtitle={`Resumen financiero al ${formatFechaCorta(new Date().toISOString().split('T')[0])}`}
                hideCurrencyToggle
            />

            <div className="page-content" style={{ paddingBottom: 80 }}>
                {/* ── SECCIÓN DE REGISTRO RÁPIDO ── */}
                <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Anotación Directa</h3>

                    <form onSubmit={handleRegistroRapido} className="premium-input-group" style={{ marginBottom: 16, background: 'var(--bg-input)', border: '1px solid var(--border-sm)', boxShadow: 'var(--shadow-inset-input)' }}>
                        <Search size={16} color="var(--t-muted)" style={{ marginRight: 12 }} />
                        <input
                            type="text"
                            placeholder='¿Qué pasó hoy? Ej: "gasté 2000 en gasoil"'
                            value={textoRapido}
                            onChange={(e) => setTextoRapido(e.target.value)}
                            className="premium-input"
                            style={{ color: 'var(--t1)' }}
                        />
                        <button type="submit" className="premium-btn-anotar" style={{ background: 'var(--green-main)', padding: '10px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', boxShadow: 'none' }}>
                            <Send size={18} color="white" />
                        </button>
                    </form>

                    {/* BOTONES DE ACCIÓN PREPONDERANTES (ESTILO ACTION CARDS) */}
                    <div className="premium-actions-row">
                        <button onClick={() => setTipo('ingreso')} className="action-card-premium action-card-premium--in">
                            <div className="action-card-icon-circle action-card-icon-circle--in">
                                <Plus size={22} strokeWidth={2.5} />
                            </div>
                            <span className="action-card-text">Nueva Entrada</span>
                        </button>
                        <button onClick={() => setTipo('gasto')} className="action-card-premium action-card-premium--out">
                            <div className="action-card-icon-circle action-card-icon-circle--out">
                                <Minus size={22} strokeWidth={2.5} />
                            </div>
                            <span className="action-card-text">Nueva Salida</span>
                        </button>
                    </div>
                </div>

                {/* ── MÉTRICAS PRINCIPALES (CARDS) ── */}
                <div style={{ marginBottom: 32 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.5px', marginBottom: 20 }}>Balance Mensual <span style={{ color: 'var(--t3)', fontSize: 14, fontWeight: 600 }}>({mesLabel})</span></h2>

                    <div className="premium-card" style={{ padding: '0', overflow: 'hidden', position: 'relative' }}>
                        {monedasActivas.length > 1 && (
                            <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, background: 'var(--bg-input)', borderRadius: '10px', display: 'flex', padding: '3px', border: '1px solid var(--border-sm)' }}>
                                {monedasActivas.map(m => (
                                    <button 
                                        key={m} 
                                        onClick={() => changeMoneda(m)} 
                                        style={{ 
                                            padding: '4px 10px', borderRadius: '7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                            background: m === moneda ? 'var(--white)' : 'transparent',
                                            color: m === moneda ? 'var(--t1)' : 'var(--t3)',
                                            border: 'none',
                                            boxShadow: m === moneda ? 'var(--shadow-xs)' : 'none'
                                        }}>
                                        {m}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="balance-grid">
                            {/* SALDO TOTAL */}
                            <div className="res-mobile-stack balance-item-main">
                                <p className="premium-legend" style={{ marginBottom: 12, textTransform: 'uppercase', fontSize: '10px' }}>Cierre Actual</p>
                                <h4 className="premium-amount" style={{ fontSize: 36, color: saldo < 0 ? 'var(--red-soft)' : 'var(--charcoal)', marginBottom: 4, lineHeight: 1 }}>
                                    {saldo >= 0 ? '+' : ''}{formatMonto(saldo, moneda)}
                                </h4>
                                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: saldo >= 0 ? 'var(--green-main)' : 'var(--red-soft)', flexShrink: 0 }}></div>
                                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t2)', lineHeight: 1.3 }}>{mensajeEstado}</p>
                                </div>
                            </div>

                            {/* INGRESOS */}
                            <div className="res-mobile-stack metric-divider balance-item-income">
                                <p className="premium-legend" style={{ marginBottom: 12, textTransform: 'uppercase', color: 'var(--green-main)', fontSize: '10px' }}>Entradas</p>
                                <h4 className="premium-amount" style={{ fontSize: 28, marginBottom: 4 }}>
                                    {formatMonto(entradas, moneda)}
                                </h4>
                                <div style={{ marginTop: 8 }}>
                                    {catMayorIngreso ? (
                                        <p style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 500 }}>Principal: <strong style={{ color: 'var(--t1)' }}>{catMayorIngreso}</strong></p>
                                    ) : (
                                        <p style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 500 }}>Sin ventas</p>
                                    )}
                                </div>
                            </div>

                            {/* GASTOS */}
                            <div className="res-mobile-stack metric-divider">
                                <p className="premium-legend" style={{ marginBottom: 12, textTransform: 'uppercase', color: 'var(--red-soft)', fontSize: '10px' }}>Salidas</p>
                                <h4 className="premium-amount" style={{ fontSize: 28, marginBottom: 4 }}>
                                    {formatMonto(salidas, moneda)}
                                </h4>
                                <div style={{ marginTop: 8 }}>
                                    {catMayorGasto ? (
                                        <p style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 500 }}>Mayor: <strong style={{ color: 'var(--t1)' }}>{catMayorGasto}</strong></p>
                                    ) : (
                                        <p style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 500 }}>Sin gastos</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* BARRA DE FLUJO INTEGRADA */}
                        <div style={{ padding: '16px 32px 24px', background: 'transparent', borderTop: '1px solid var(--border-sm)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.2px' }}>Distribución de Flujo</h3>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <span className="premium-legend" style={{ color: 'var(--green-main)', fontWeight: 700 }}>{100 - Math.round(pctGastos)}% Ingreso</span>
                                    <span className="premium-legend" style={{ color: 'var(--red-soft)', fontWeight: 700 }}>{Math.round(pctGastos)}% Gasto</span>
                                </div>
                            </div>
                            <div className="premium-pill-bar" style={{ height: '8px', background: 'var(--bg-input)' }}>
                                <div className="premium-pill-fill-in" style={{ width: `${100 - pctGastos}%`, background: 'var(--green-main)', boxShadow: '0 0 10px rgba(116, 167, 143, 0.3)' }}></div>
                                <div className="premium-pill-fill-out" style={{ width: `${pctGastos}%`, background: 'var(--red-soft)', boxShadow: '0 0 10px rgba(214, 140, 122, 0.3)' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* ── ÚLTIMOS REGISTROS (NIVEL 3) ── */}
                <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.5px', marginBottom: 16 }}>Movimientos Recientes</h2>

                    {ultimos.length === 0 ? (
                        <div className="empty-state" style={{ background: 'var(--white)', borderRadius: 'var(--r-lg)' }}>
                            <div className="empty-icon-wrap"><BookOpen size={24} strokeWidth={1.5} color="var(--t3)" /></div>
                            <p className="empty-title">Aún no hay registros</p>
                            <p className="empty-desc">Escribí en el cuadro de arriba para agregar uno.</p>
                        </div>
                    ) : (
                        <div className="card-surface" style={{ padding: '8px 12px' }}>
                            {ultimos.map(mov => {
                                const cat = catMap.get(mov.categoriaId);
                                const ing = mov.tipo === 'ingreso';
                                return (
                                    <div key={mov.id} className="mobile-tx-row" onClick={() => editar(mov)} style={{ borderBottom: '1px solid var(--border-sm)' }}>
                                        <div className={`tx-emoji ${ing ? 'tx-emoji--ingreso' : 'tx-emoji--gasto'}`}>
                                            {cat?.icono ?? '📦'}
                                        </div>
                                        <div className="mobile-tx-info">
                                            <p className="mobile-tx-name" style={{ fontWeight: 600, color: 'var(--t1)' }}>{cat?.nombre ?? 'Sin categoría'}</p>
                                            <p className="mobile-tx-date" style={{ color: 'var(--t3)' }}>
                                                {formatFechaCorta(mov.fecha)} {mov.nota ? `· ${mov.nota}` : ''}
                                            </p>
                                        </div>
                                        <div className="mobile-tx-right" style={{ textAlign: 'right' }}>
                                            <span className={`tx-amount ${ing ? 'tx-amount--ingreso' : 'tx-amount--gasto'}`}>
                                                {ing ? '+' : '–'}{formatMonto(mov.monto, mov.moneda)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {tipoModal && (
                <ModalRegistrar tipoInicial={tipoModal} onClose={cerrar} movimientoEditar={movEditar} onGuardado={onGuardado} />
            )}
        </div>
    );
}
