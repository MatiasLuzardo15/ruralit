import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    Wallet, TrendingUp, TrendingDown, Hash,
    ArrowUpRight, ArrowDownRight, BookOpen, Plus, Minus, Send, Search
} from 'lucide-react';
import db from '../db/database';
import type { Movimiento, Categoria, TipoMovimiento } from '../types';
import { formatMonto, formatFechaCorta, formatMesLabel, parseRegistroRapido, hoy } from '../utils/helpers';
import { ModalRegistrar } from '../components/ModalRegistrar';
import { TopBar } from '../components/TopBar';
import { useMonedas } from '../utils/useMoneda';

export function Inicio() {
    const [tipoModal, setTipo] = useState<TipoMovimiento | null>(null);
    const [movEditar, setMovEd] = useState<Movimiento | undefined>();
    const [ultimos, setUltimos] = useState<Movimiento[]>([]);
    const [key, setKey] = useState(0);
    const { moneda } = useMonedas();
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
            />

            <div className="page-content" style={{ paddingBottom: 80 }}>
                {/* ── SECCIÓN DE REGISTRO RÁPIDO ── */}
                <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Anotación Directa</h3>
                    
                    <form onSubmit={handleRegistroRapido} className="premium-input-group" style={{ marginBottom: 16 }}>
                        <Search size={16} color="var(--t3)" style={{ marginRight: 12 }} />
                        <input
                            type="text"
                            placeholder='¿Qué pasó hoy? Ej: "gasté 2000 en gasoil"'
                            value={textoRapido}
                            onChange={(e) => setTextoRapido(e.target.value)}
                            className="premium-input"
                        />
                        <button type="submit" className="premium-btn-anotar">
                            <Send size={15} style={{ marginRight: 6 }} />
                            Anotar
                        </button>
                    </form>

                    {/* BOTONES DE ACCIÓN PREPONDERANTES */}
                    <div className="premium-actions-row">
                        <button onClick={() => setTipo('ingreso')} className="premium-action-btn premium-action-btn--in">
                            <div className="premium-action-icon-wrap">
                                <Plus size={20} />
                            </div>
                            <span>Nueva Entrada</span>
                        </button>
                        <button onClick={() => setTipo('gasto')} className="premium-action-btn premium-action-btn--out">
                            <div className="premium-action-icon-wrap">
                                <Minus size={20} />
                            </div>
                            <span>Nueva Salida</span>
                        </button>
                    </div>
                </div>

                {/* ── MÉTRICAS PRINCIPALES (CARDS) ── */}
                <div style={{ marginBottom: 32 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.5px', marginBottom: 20 }}>Balance Mensual <span style={{ color: 'var(--t3)', fontSize: 14, fontWeight: 600 }}>({mesLabel})</span></h2>

                    <div className="premium-card" style={{ padding: '0', overflow: 'hidden' }}>
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
                        <div style={{ padding: '16px 32px 24px', background: 'rgba(0,0,0,0.01)', borderTop: '1px solid var(--border-sm)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.2px' }}>Distribución de Flujo</h3>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <span className="premium-legend" style={{ color: 'var(--green-main)', fontWeight: 700 }}>{100 - Math.round(pctGastos)}% Ingreso</span>
                                    <span className="premium-legend" style={{ color: 'var(--red-soft)', fontWeight: 700 }}>{Math.round(pctGastos)}% Gasto</span>
                                </div>
                            </div>
                            <div className="premium-pill-bar" style={{ height: '8px' }}>
                                <div className="premium-pill-fill-in" style={{ width: `${100 - pctGastos}%`, background: 'var(--green-main)', opacity: 0.8 }}></div>
                                <div className="premium-pill-fill-out" style={{ width: `${pctGastos}%`, background: 'var(--red-soft)', opacity: 0.8 }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── PROYECCIÓN (CARD DEDICADA) ── */}
                {(() => {
                    const today = new Date();
                    const isCurr = today.getFullYear() === now.getFullYear() && today.getMonth() === now.getMonth();
                    const dayToday = today.getDate();
                    const daysInM = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    if (!isCurr || (entradas === 0 && salidas === 0)) return null;

                    const projE = (entradas / dayToday) * daysInM;
                    const projS = (salidas / dayToday) * daysInM;
                    const projN = projE - projS;

                    return (
                        <div style={{ marginBottom: 40 }}>
                            <div className="premium-card" style={{ border: '1px solid var(--border)', background: 'var(--bg)', padding: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                        <TrendingUp size={20} color="var(--green-main)" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)', marginBottom: 2 }}>A este ritmo...</h3>
                                        <p style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 500 }}>Estimación basada en tus últimos {dayToday} días</p>
                                    </div>
                                </div>

                                <div className="res-flex-between">
                                    <div className="res-flex-item-main">
                                        <p style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 600, marginBottom: 8 }}>Te quedarían libres aproximadamente:</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                                            <h4 className="premium-amount" style={{ fontSize: 42, color: projN < 0 ? 'var(--red-soft)' : 'var(--green-main)', letterSpacing: '-1.5px', marginBottom: 0 }}>
                                                {formatMonto(Math.abs(projN), moneda)}
                                            </h4>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: projN < 0 ? 'var(--red-soft)' : 'var(--green-main)', textTransform: 'uppercase' }}>
                                                {projN >= 0 ? 'a favor' : 'en contra'}
                                            </span>
                                        </div>
                                        <div style={{ marginTop: 16, padding: '12px 16px', background: projN >= 0 ? 'rgba(46, 125, 50, 0.04)' : 'rgba(201, 74, 74, 0.04)', borderRadius: '12px', border: projN >= 0 ? '1px solid rgba(46, 125, 50, 0.1)' : '1px solid rgba(201, 74, 74, 0.1)', maxWidth: '440px' }}>
                                            <p style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 600, lineHeight: 1.5 }}>
                                                {projN >= 0 
                                                    ? "¡Buen trabajo! Si no hay imprevistos, el mes cerrará con saldo positivo."
                                                    : "Ojo: a este paso podrías cerrar el mes en negativo. Revisá tus gastos previstos."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="res-flex-item-side" style={{ background: 'white', padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                                        <p style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Detalle del Cálculo</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 500 }}>Ventas proyectadas</span>
                                                <span style={{ fontSize: 14, color: 'var(--green-main)', fontWeight: 800 }}>{formatMonto(projE, moneda)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 500 }}>Gastos proyectados</span>
                                                <span style={{ fontSize: 14, color: 'var(--red-soft)', fontWeight: 800 }}>{formatMonto(projS, moneda)}</span>
                                            </div>
                                        </div>
                                        <div style={{ height: '1px', background: 'var(--border-sm)', margin: '4px 0' }}></div>
                                        <p style={{ fontSize: 11, color: 'var(--t3)', fontStyle: 'italic', textAlign: 'center' }}>
                                            Basado en {dayToday} d / faltan {daysInM - dayToday} d
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

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
