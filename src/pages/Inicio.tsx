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

    const mesActual = mesActualRaw.filter(m => (m.moneda || 'ARS') === moneda);

    const entradas = mesActual.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
    const salidas = mesActual.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);
    const saldo = entradas - salidas;
    const nMov = mesActual.length;

    const cargarUltimos = useCallback(async () => {
        const d = await db.movimientos.orderBy('creado_en').reverse().limit(100).toArray();
        setUltimos(d.filter(m => (m.moneda || 'ARS') === moneda).slice(0, 6));
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                        {/* CARD: SALDO TOTAL */}
                        <div className="premium-card">
                            <p className="premium-legend" style={{ marginBottom: 12, textTransform: 'uppercase' }}>Cierre Actual</p>
                            <h4 className="premium-amount" style={{ fontSize: 42, color: saldo < 0 ? 'var(--red-soft)' : 'var(--charcoal)', marginBottom: 4 }}>
                                {saldo >= 0 ? '+' : ''}{formatMonto(saldo, moneda)}
                            </h4>
                            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: saldo >= 0 ? 'var(--green-main)' : 'var(--red-soft)' }}></div>
                                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t2)' }}>{mensajeEstado}</p>
                            </div>
                        </div>

                        {/* CARD: INGRESOS */}
                        <div className="premium-card" style={{ background: 'var(--sage-bg)' }}>
                            <p className="premium-legend" style={{ marginBottom: 12, textTransform: 'uppercase', color: 'var(--green-main)' }}>Entradas Totales</p>
                            <h4 className="premium-amount" style={{ fontSize: 32 }}>
                                {formatMonto(entradas, moneda)}
                            </h4>
                            <div style={{ marginTop: 16 }}>
                                {catMayorIngreso ? (
                                    <p style={{ fontSize: 13, color: 'var(--t3)', fontWeight: 500 }}>Venta principal: <strong style={{ color: 'var(--t1)' }}>{catMayorIngreso}</strong></p>
                                ) : (
                                    <p style={{ fontSize: 13, color: 'var(--t3)', fontWeight: 500 }}>Sin ventas registradas</p>
                                )}
                            </div>
                        </div>

                        {/* CARD: GASTOS */}
                        <div className="premium-card" style={{ background: 'var(--terracotta-bg)' }}>
                            <p className="premium-legend" style={{ marginBottom: 12, textTransform: 'uppercase', color: 'var(--terracotta-soft)' }}>Salidas Totales</p>
                            <h4 className="premium-amount" style={{ fontSize: 32 }}>
                                {formatMonto(salidas, moneda)}
                            </h4>
                            <div style={{ marginTop: 16 }}>
                                {catMayorGasto ? (
                                    <p style={{ fontSize: 13, color: 'var(--t3)', fontWeight: 500 }}>Gasto mayor: <strong style={{ color: 'var(--t1)' }}>{catMayorGasto}</strong></p>
                                ) : (
                                    <p style={{ fontSize: 13, color: 'var(--t3)', fontWeight: 500 }}>Sin gastos registrados</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── COMPARATIVA DE FLUJO ── */}
                <div style={{ marginBottom: 40 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t2)' }}>Distribución de Flujo</h3>
                        <div style={{ display: 'flex', gap: 20 }}>
                            <span className="premium-legend" style={{ color: 'var(--green-main)' }}>Ingreso {100 - Math.round(pctGastos)}%</span>
                            <span className="premium-legend" style={{ color: 'var(--red-soft)' }}>Gasto {Math.round(pctGastos)}%</span>
                        </div>
                    </div>
                    <div className="premium-pill-bar">
                        <div className="premium-pill-fill-in" style={{ width: `${100 - pctGastos}%` }}></div>
                        <div className="premium-pill-fill-out" style={{ width: `${pctGastos}%` }}></div>
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
                            <div className="premium-card" style={{ border: '1px dashed rgba(0,0,0,0.1)', background: 'var(--bg)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                        <TrendingUp size={16} color="var(--green-main)" />
                                    </div>
                                    <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>Proyección a cierre de mes</h3>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div>
                                        <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 4 }}>Resultado proyectado</p>
                                        <h4 className="premium-amount" style={{ fontSize: 24, color: projN < 0 ? 'var(--red-soft)' : 'var(--green-main)' }}>
                                            {projN >= 0 ? '+' : ''}{formatMonto(projN, moneda)}
                                        </h4>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>Basado en {dayToday} días</p>
                                        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                            <span style={{ fontSize: 12, color: 'var(--t2)' }}>↑ {formatMonto(projE, moneda)}</span>
                                            <span style={{ fontSize: 12, color: 'var(--t2)' }}>↓ {formatMonto(projS, moneda)}</span>
                                        </div>
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
