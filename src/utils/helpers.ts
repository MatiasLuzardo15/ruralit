import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Movimiento, BalanceMes, Categoria } from '../types';
import db from '../db/database';

// ─── Formateo ────────────────────────────────────────────────────────────────

export const MONEDAS = {
    ARS: { simbolo: '$', label: 'Peso Arg.', flag: '🇦🇷' },
    UYU: { simbolo: '$U', label: 'Peso Uru.', flag: '🇺🇾' },
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

export const parseRegistroRapido = (texto: string, categorias: Categoria[]): { tipo: 'ingreso' | 'gasto', monto: number, categoriaId: number | null, nota: string } | null => {
    if (!texto.trim()) return null;
    
    // Normalizamos texto para quitar acentos y transformar a minúsculas
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const txt = normalize(texto);

    let tipo: 'ingreso' | 'gasto' = 'gasto'; // por defecto
    const palabrasGasto = ['gaste', 'pague', 'compre', 'gasto', 'compra', 'salida', 'pagamos', 'compramos', 'estación de servicio', 'retiro'];
    const palabrasIngreso = ['vendi', 'cobre', 'ingrese', 'ingreso', 'venta', 'entrada', 'vendimos', 'cobramos', 'deposito'];

    // Utilizamos regex para comprobar que la palabra clave encaja en los límites de la palabra (\b) y evitar falsos positivos
    const checkKw = (kws: string[]) => kws.some(kw => new RegExp(`\\b${normalize(kw)}\\b`, 'i').test(txt));

    if (checkKw(palabrasGasto)) tipo = 'gasto';
    if (checkKw(palabrasIngreso)) tipo = 'ingreso';

    // Extracción de número robusto permitiendo coma o punto para decimales (ej. 1500.50 o 1500,50)
    const matchMoneda = txt.match(/\b\d+([.,]\d+)?\b/);
    if (!matchMoneda) return null; // se necesita al menos un monto
    const monto = parseFloat(matchMoneda[0].replace(',', '.'));

    let categoriaId: number | null = null;
    let fallbackCatId: number | null = null;
    
    // Diccionarios robustos de palabras clave
    if (tipo === 'gasto') {
        const keywordMapGasto = [
            { key: 'Sanidad', words: ['vet', 'veterinaria', 'remedio', 'vacuna', 'sanidad', 'medicamento', 'antibiotico', 'desparasitante', 'inyeccion'] },
            { key: 'Combustible', words: ['nafta', 'gasoil', 'diesel', 'combustible', 'gasolina', 'estacion', 'bencina'] },
            { key: 'Alimentación', words: ['racion', 'fardo', 'comida', 'pasto', 'alimentacion', 'maiz', 'avena', 'suplemento', 'rollo', 'alfalfa', 'sorgo'] },
            { key: 'Compra de animales', words: ['vaca', 'vacas', 'ternero', 'terneros', 'novillo', 'novillos', 'hacienda', 'animales', 'toro', 'toros', 'vaquillona', 'tambo'] },
            { key: 'Sem', words: ['semilla', 'semillas', 'agroquimico', 'fertilizante', 'herbicida', 'insecticida', 'fungicida', 'urea', 'glifosato'] },
            { key: 'Mano de obra', words: ['peon', 'sueldo', 'jornal', 'mano de obra', 'empleado', 'empleados', 'salario', 'aguinaldo', 'capataz', 'trabajador'] },
            { key: 'Reparaciones', words: ['reparacion', 'arreglo', 'taller', 'repuesto', 'mecanico', 'goma', 'cubierta', 'alambre', 'pique', 'varilla'] }
        ];

        for (const map of keywordMapGasto) {
            if (checkKw(map.words)) {
                categoriaId = categorias.find(c => c.nombre.includes(map.key) || c.nombre === map.key)?.id ?? null;
                if (categoriaId) break;
            }
        }
        fallbackCatId = categorias.find(c => c.nombre === 'Otros gastos')?.id ?? null;

    } else {
        const keywordMapIngreso = [
            { key: 'Venta de animales', words: ['vaca', 'vacas', 'ternero', 'terneros', 'novillo', 'novillos', 'hacienda', 'animales', 'toro', 'toros', 'vaquillona', 'tambo'] },
            { key: 'Leche', words: ['leche', 'queso', 'lacteo', 'lacteos', 'manteca', 'suero', 'crema'] },
            { key: 'Granos', words: ['grano', 'granos', 'soja', 'trigo', 'maiz', 'forraje', 'sorgo', 'girasol', 'avena', 'cebada'] },
            { key: 'Lana', words: ['lana', 'cuero', 'cueros', 'oveja', 'ovejas', 'cordero', 'corderos', 'vellon', 'esquila'] }
        ];

        for (const map of keywordMapIngreso) {
            if (checkKw(map.words)) {
                categoriaId = categorias.find(c => c.nombre.includes(map.key) || c.nombre === map.key)?.id ?? null;
                if (categoriaId) break;
            }
        }
        fallbackCatId = categorias.find(c => c.nombre === 'Otras entradas')?.id ?? null;
    }

    if (!categoriaId) categoriaId = fallbackCatId;

    return { tipo, monto, categoriaId, nota: texto.charAt(0).toUpperCase() + texto.slice(1) };
};
