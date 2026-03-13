import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Movimiento, BalanceMes, Categoria } from '../types';
import db from '../db/database';

// ─── Formateo ────────────────────────────────────────────────────────────────

export const MONEDAS = {
    ARS: { simbolo: '$', label: 'Peso Arg.', flag: '🇦🇷' },
    UYU: { simbolo: 'UYU', label: 'Peso Uru.', flag: '🇺🇾' },
    CLP: { simbolo: '$', label: 'Peso Chi.', flag: '🇨🇱' },
    COP: { simbolo: '$', label: 'Peso Col.', flag: '🇨🇴' },
    PYG: { simbolo: '₲', label: 'Guaraní', flag: '🇵🇾' },
    BOB: { simbolo: 'Bs', label: 'Boliviano', flag: '🇧🇴' },
    PEN: { simbolo: 'S/', label: 'Sol', flag: '🇵🇪' },
    BRL: { simbolo: 'R$', label: 'Real', flag: '🇧🇷' },
    MXN: { simbolo: '$', label: 'Peso Mex.', flag: '🇲🇽' },
    USD: { simbolo: 'US$', label: 'Dólar', flag: '🇺🇸' },
    EUR: { simbolo: '€', label: 'Euro', flag: '🇪🇺' },
} as const;

export const formatMonto = (monto: number, moneda = 'UYU'): string => {
    const m = MONEDAS[moneda as keyof typeof MONEDAS] ?? MONEDAS.UYU;
    return `${m.simbolo} ${Number(monto).toLocaleString('es-UY')}`;
};

export const formatFecha = (fecha: string | Date): string => {
    if (!fecha) return '';
    try {
        const date = typeof fecha === 'string' ? parseISO(fecha) : fecha;
        return format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
        return String(fecha);
    }
};

export const formatFechaCorta = (fecha: string | Date): string => {
    if (!fecha) return '';
    try {
        const date = typeof fecha === 'string' ? parseISO(fecha) : fecha;
        return format(date, 'dd/MM/yyyy', { locale: es });
    } catch {
        return String(fecha);
    }
};

export const formatMesLabel = (anio: number, mes: number): string => {
    return format(new Date(anio, mes, 1), 'MMMM yyyy', { locale: es });
};

// ─── Fechas de mes ────────────────────────────────────────────────────────────

export const getMesActualInfo = () => {
    const ahora = new Date();
    return {
        anio: ahora.getFullYear(),
        mes: ahora.getMonth(),
        inicio: startOfMonth(ahora).toISOString().split('T')[0],
        fin: endOfMonth(ahora).toISOString().split('T')[0],
        label: format(ahora, 'MMMM yyyy', { locale: es }),
    };
};

export const getTrimestreInfo = (fecha: Date = new Date()) => {
    const mes = fecha.getMonth();
    const anio = fecha.getFullYear();
    const trimestre = Math.floor(mes / 3); // 0, 1, 2, 3
    
    // Q1: 0,1,2 | Q2: 3,4,5 | Q3: 6,7,8 | Q4: 9,10,11
    const inicioMes = trimestre * 3;
    const finMes = inicioMes + 2;
    
    const inicio = new Date(anio, inicioMes, 1).toISOString().split('T')[0];
    const fin = new Date(anio, finMes + 1, 0).toISOString().split('T')[0];
    
    const labelMesInicio = format(new Date(anio, inicioMes, 1), 'MMM', { locale: es });
    const labelMesFin = format(new Date(anio, finMes, 1), 'MMM', { locale: es });
    
    return {
        inicio,
        fin,
        label: `Trimestre Q${trimestre + 1} (${labelMesInicio} - ${labelMesFin})`,
        trimestre: trimestre + 1,
        anio
    };
};

// ─── Consultas DB ─────────────────────────────────────────────────────────────

export const getMovimientosPorMes = async (
    anio: number,
    mes: number
): Promise<Movimiento[]> => {
    const inicio = new Date(anio, mes, 1).toISOString().split('T')[0];
    const fin = new Date(anio, mes + 1, 0).toISOString().split('T')[0];

    const movimientos = await db.movimientos
        .where('fecha')
        .between(inicio, fin, true, true)
        .toArray();

    return movimientos.sort((a, b) => b.fecha.localeCompare(a.fecha));
};

export const getUltimosMovimientos = async (cantidad = 5): Promise<Movimiento[]> => {
    const todos = await db.movimientos.orderBy('creado_en').reverse().limit(cantidad).toArray();
    return todos;
};

// ─── Cálculos ─────────────────────────────────────────────────────────────────

export const calcularBalance = (movimientos: Movimiento[]): BalanceMes => {
    let ingresos = 0;
    let gastos = 0;
    movimientos.forEach((m) => {
        if (m.tipo === 'ingreso') ingresos += Number(m.monto);
        else if (m.tipo === 'gasto') gastos += Number(m.monto);
    });
    return { ingresos, gastos, neto: ingresos - gastos };
};

export const hoy = (): string => new Date().toISOString().split('T')[0];

export const parseRegistroRapido = (texto: string, categorias: Categoria[]): { tipo: 'ingreso' | 'gasto', monto: number, categoriaId: string | number | null, nota: string } | null => {
    if (!texto.trim()) return null;
    
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const txt = normalize(texto);

    // 1. Determinar Tipo
    let tipo: 'ingreso' | 'gasto' = 'gasto';
    const palabrasGasto = ['gaste', 'pague', 'compre', 'gasto', 'compra', 'salida', 'pagamos', 'compramos', 'retiro', 'pago', 'factura', 'cuota'];
    const palabrasIngreso = ['vendi', 'cobre', 'ingrese', 'ingreso', 'venta', 'entrada', 'vendimos', 'cobramos', 'deposito', 'cobro', 'liquidar', 'cheque'];

    const checkKw = (kws: string[]) => kws.some(kw => new RegExp(`\\b${normalize(kw)}\\b`, 'i').test(txt));

    if (checkKw(palabrasIngreso)) tipo = 'ingreso';
    else if (checkKw(palabrasGasto)) tipo = 'gasto';

    // 2. Extraer Monto
    const matchMonto = txt.match(/\b\d+([.,]\d+)?\b/);
    if (!matchMonto) return null; 
    const monto = parseFloat(matchMonto[0].replace(',', '.'));

    let categoriaId: string | number | null = null;

    // 3. Prioridad 1: Buscar si el NOMBRE de alguna categoría está explícitamente en el texto
    // Ordenamos por longitud de nombre descendente para que "Venta de animales" gane a "Venta"
    const catsDelTipo = categorias.filter(c => c.tipo === tipo);
    const sortedCats = [...catsDelTipo].sort((a, b) => b.nombre.length - a.nombre.length);
    
    // Palabras genéricas que no deben disparar un match por sí solas
    const palabrasGenericas = ['venta', 'compra', 'gasto', 'ingreso', 'entrada', 'salida', 'otros', 'otras', 'pago', 'cobro'];

    const catPorNombre = sortedCats.find(c => {
        const nom = normalize(c.nombre);
        // Si el nombre de la categoría es una palabra genérica, ignoramos este paso
        if (palabrasGenericas.includes(nom)) return false;
        
        // 1. Coincidencia exacta/contenida (ej: "venta de leche" -> "leche")
        if (txt.includes(nom)) return true;

        // 2. Coincidencia de palabra significativa (ej: "novillos" -> "Venta de novillos")
        // Filtramos palabras de la categoría que sean cortas o genéricas
        const palabrasSignificativas = nom.split(' ').filter(w => w.length > 3 && !palabrasGenericas.includes(w));
        return palabrasSignificativas.some(w => new RegExp(`\\b${w}\\b`, 'i').test(txt));
    });

    if (catPorNombre) {
        categoriaId = catPorNombre.id!;
    } else {
        // 4. Prioridad 2: Diccionario de palabras clave (Mapeo Semántico)
        const keywordMap = [
            { key: 'Leche', words: ['leche', 'queso', 'lacteo', 'manteca', 'suero', 'tambo', 'remitente', 'conaprole', 'indlacol'] },
            { key: 'Animales', words: ['vaca', 'vacas', 'ternero', 'terneros', 'novillo', 'novillos', 'animal', 'toro', 'vaquillona', 'oveja', 'lana', 'cordero', 'borrego', 'capon', 'lanar', 'ovino', 'bovino', 'hacienda', 'vaquillonas'] },
            { key: 'Sanidad', words: ['vet', 'veterinaria', 'remedio', 'vacuna', 'sanidad', 'medicamento', 'antibiotico', 'jeringa', 'desparasitante', 'aftosa', 'iia', 'inseminacion', 'carbunco'] },
            { key: 'Combustible', words: ['nafta', 'gasoil', 'diesel', 'combustible', 'gasolina', 'estacion', 'bencina', 'premium', 'gasóleo'] },
            { key: 'Alimentación', words: ['racion', 'fardo', 'comida', 'pasto', 'maiz', 'avena', 'suplemento', 'rollo', 'alfalfa', 'proteina', 'silaje', 'concentrado', 'grano', 'semilla'] },
            { key: 'Granos', words: ['soja', 'trigo', 'sorgo', 'girasol', 'cebada', 'cosecha', 'trilla', 'flete', 'granos', 'silobolsa'] },
            { key: 'Reparaciones', words: ['reparacion', 'arreglo', 'taller', 'repuesto', 'mecanico', 'goma', 'cubierta', 'alambre', 'pique', 'varilla', 'tornillo', 'herramienta', 'ferreteria', 'pintura', 'tractor', 'arado', 'herrería'] },
            { key: 'Mano de obra', words: ['peon', 'sueldo', 'jornal', 'empleado', 'salario', 'personal', 'aguinaldo', 'bps', 'pago', 'obrero'] },
        ];

        for (const map of keywordMap) {
            if (checkKw(map.words)) {
                const found = catsDelTipo.find(c => {
                    const nom = normalize(c.nombre);
                    return nom.includes(normalize(map.key)) || normalize(map.key).includes(nom);
                });
                if (found) {
                    categoriaId = found.id!;
                    break;
                }
            }
        }
    }

    // 5. Prioridad 3: Fallback inteligente a "Otros"
    if (!categoriaId) {
        const fallbacks = ['otros', 'otras', 'general', 'varios', 'diversos'];
        const catFallback = catsDelTipo.find(c => fallbacks.some(f => normalize(c.nombre).includes(f)));
        if (catFallback) categoriaId = catFallback.id!;
    }

    // 6. Último recurso: Primera categoría del tipo
    if (!categoriaId && catsDelTipo.length > 0) {
        categoriaId = catsDelTipo[0].id!;
    }

    return { tipo, monto, categoriaId, nota: texto.charAt(0).toUpperCase() + texto.slice(1) };
};
