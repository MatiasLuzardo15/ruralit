import { useState, useCallback, useEffect } from 'react';
import {
    Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, BookOpen, Plus, Minus, Send, Search,
    Calculator, Clock, Printer, ChevronRight
} from 'lucide-react';
import type { Movimiento, Categoria, TipoMovimiento } from '../types';
import { formatMonto, formatFechaCorta, formatMesLabel, parseRegistroRapido, hoy, MONEDAS } from '../utils/helpers';
import { dataService } from '../lib/dataService';
import { ModalRegistrar } from '../components/ModalRegistrar';
import { TopBar } from '../components/TopBar';
import { useMonedas } from '../utils/useMoneda';
import { showToast } from '../components/Toast';
import { LoadingScreen } from '../components/LoadingScreen';

export function Inicio() {
    const [tipoModal, setTipo] = useState<TipoMovimiento | null>(null);
    const [movEditar, setMovEd] = useState<Movimiento | undefined>();
    const [ultimos, setUltimos] = useState<Movimiento[]>([]);
    const [key, setKey] = useState(0);
    const { moneda, monedasActivas, changeMoneda } = useMonedas();
    const [textoRapido, setTextoRapido] = useState('');

    const [categorias, setCats] = useState<Categoria[]>([]);
    const [nombreUsuario, setNombreUsuario] = useState('Usuario');
    const [estabNombre, setEstabNombre] = useState('Mi Establecimiento');
    const [loadingData, setLoadingData] = useState(true);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const catMap = new Map<string, Categoria>(categorias.map(c => [String(c.id), c]));

    const now = new Date();
    const iniMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const mesLabel = formatMesLabel(now.getFullYear(), now.getMonth());

    const [mesActual, setMesActual] = useState<Movimiento[]>([]);

    const cargarData = useCallback(async (force: boolean = false) => {
        if (!hasLoadedOnce) setLoadingData(true);
        try {
            const activeId = localStorage.getItem('activeEstDB_uuid');
            if (!activeId) return;

            const [prof, estab, catsData] = await Promise.all([
                dataService.getProfile(),
                dataService.getEstablecimientoActivo(),
                dataService.getCategorias(activeId, force)
            ]);

            if (prof) setNombreUsuario(prof.username || 'Usuario');
            if (estab) setEstabNombre(estab.nombre);
            setCats(catsData);

            const movs = await dataService.getMovimientos(activeId, { from: iniMes, to: finMes }, force);
            const filtered = movs.filter(m => (m.moneda || 'UYU') === moneda);
            setMesActual(filtered);
            setUltimos(movs.filter(m => (m.moneda || 'UYU') === moneda).slice(0, 6));
            setHasLoadedOnce(true);
        } catch (e) {
            console.error('Error cargando Inicio:', e);
        } finally {
            setLoadingData(false);
        }
    }, [moneda, iniMes, finMes, hasLoadedOnce]);

    useEffect(() => { 
        void cargarData(); 
        const handleRefresh = () => void cargarData(true);
        window.addEventListener('ruralit_data_changed', handleRefresh);
        window.addEventListener('ruralit_estab_changed', handleRefresh);
        return () => {
            window.removeEventListener('ruralit_data_changed', handleRefresh);
            window.removeEventListener('ruralit_estab_changed', handleRefresh);
        };
    }, [cargarData]);

    const cerrar = () => { setTipo(null); setMovEd(undefined); };
    const editar = (m: Movimiento) => { setMovEd(m); setTipo(m.tipo); };

    const onGuardado = () => {
        // Al guardar cerramos y refrescamos
        cerrar();
    };

    const handleRegistroRapido = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = parseRegistroRapido(textoRapido, categorias, monedasActivas);
        if (!parsed) {
            alert('No entendí el ingreso o gasto. Probá escribiendo: "gasté 500 en ración"');
            return;
        }

        const activeId = localStorage.getItem('activeEstDB_uuid');
        if (!activeId) {
            showToast('Error: No hay establecimiento seleccionado');
            return;
        }

        if (!parsed.categoriaId) {
            alert('No pude identificar la categoría. Por favor, especifícala mejor o asegúrate de que existan categorías configuradas.');
            return;
        }

        const nMovimiento: Omit<Movimiento, 'id'> = {
            tipo: parsed.tipo,
            monto: parsed.monto,
            categoriaId: parsed.categoriaId,
            fecha: hoy(),
            creado_en: new Date().toISOString(),
            nota: parsed.nota,
            moneda: parsed.moneda || moneda
        };

        // ACCIÓN INSTANTÁNEA
        const originalText = textoRapido;
        setTextoRapido(''); // Limpiar inmediatamente
        showToast('Guardando registro...');
        
        // Ejecutar en segundo plano
        (async () => {
            try {
                const res = await dataService.addMovimiento(activeId, nMovimiento);
                console.log('Registro rápido exitoso:', res);
                showToast('¡Guardado!');
                // Forzamos la recarga de datos frescos
                void cargarData(true);
            } catch (e) {
                console.error('Error en registro rápido:', e);
                setTextoRapido(originalText); // Restauramos el texto si falló
                showToast('Error al guardar. Revisa tu conexión.');
            }
        })();
    };

    const entradas = mesActual.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
    const salidas = mesActual.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);
    const saldo = entradas - salidas;
    const nMov = mesActual.length;

    const dicIngresos = new Map<string, number>();
    const dicGastos = new Map<string, number>();

    mesActual.forEach(m => {
        const catIdStr = String(m.categoriaId);
        if (m.tipo === 'ingreso') dicIngresos.set(catIdStr, (dicIngresos.get(catIdStr) || 0) + m.monto);
        if (m.tipo === 'gasto') dicGastos.set(catIdStr, (dicGastos.get(catIdStr) || 0) + m.monto);
    });

    let catMayorIngreso = "";
    let catMayorGasto = "";

    let maxI = 0, idMaxI = '';
    dicIngresos.forEach((v: number, k: string) => { if (v > maxI) { maxI = v; idMaxI = k; } });
    if (idMaxI !== '') catMayorIngreso = catMap.get(idMaxI)?.nombre || (idMaxI === 'null' ? "Sin categoría" : "Ingreso");

    let maxG = 0, idMaxG = '';
    dicGastos.forEach((v: number, k: string) => { if (v > maxG) { maxG = v; idMaxG = k; } });
    if (idMaxG !== '') catMayorGasto = catMap.get(idMaxG)?.nombre || (idMaxG === 'null' ? "Sin categoría" : "Gasto");

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

    const pctGastos = entradas > 0 ? Math.min((salidas / entradas) * 100, 100) : 0;

    if (loadingData && !hasLoadedOnce) {
        return <LoadingScreen message="Cargando resumen…" />;
    }

    return (
        <div className="page-in">
            <TopBar
                title={estabNombre}
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
                                <Plus size={20} strokeWidth={3} />
                            </div>
                            <span className="action-card-text">Nueva Entrada</span>
                            <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                        </button>
                        <button onClick={() => setTipo('gasto')} className="action-card-premium action-card-premium--out">
                            <div className="action-card-icon-circle action-card-icon-circle--out">
                                <Minus size={20} strokeWidth={3} />
                            </div>
                            <span className="action-card-text">Nueva Salida</span>
                            <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.4 }} />
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
                            <div className="res-mobile-stack balance-item-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                <p className="premium-legend" style={{ marginBottom: 12, textTransform: 'uppercase', fontSize: '10px' }}>Cierre Actual</p>
                                <h4 className="premium-amount" style={{ fontSize: 42, color: saldo < 0 ? 'var(--red-soft)' : 'var(--charcoal)', marginBottom: 4, lineHeight: 1 }}>
                                    {saldo >= 0 ? '+' : ''}{formatMonto(saldo, moneda)}
                                </h4>
                                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
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
                            <div className="res-mobile-stack metric-divider balance-item-expense">
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
                                const cat = catMap.get(String(mov.categoriaId));
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
