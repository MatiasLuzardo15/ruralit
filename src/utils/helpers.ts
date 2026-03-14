import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Movimiento, BalanceMes, Categoria, Moneda } from '../types';
import db from '../db/database';

// ─── Formateo ────────────────────────────────────────────────────────────────

export const MONEDAS = {
    ARS: { simbolo: '$', label: 'Peso Arg.', flag: '🇦🇷' },
    UYU: { simbolo: '$', label: 'Peso Uru.', flag: '🇺🇾' },
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

export const formatFechaMediana = (fecha: string | Date): string => {
    if (!fecha) return '';
    try {
        const date = typeof fecha === 'string' ? parseISO(fecha + 'T12:00:00') : fecha;
        return format(date, "d MMM yyyy", { locale: es });
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

export const parseRegistroRapido = (texto: string, categorias: Categoria[], monedasActivas: Moneda[] = ['UYU']): { tipo: 'ingreso' | 'gasto', monto: number, categoriaId: string | number | null, nota: string, moneda?: Moneda } | null => {
    if (!texto.trim()) return null;
    
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const txt = normalize(texto);

    // 1. Determinar Tipo
    let tipo: 'ingreso' | 'gasto' = 'gasto';
    const palabrasGasto = ['gaste', 'pague', 'compre', 'gasto', 'compra', 'salida', 'pagamos', 'compramos', 'retiro', 'pago', 'factura', 'cuota', 'abone', 'debito', 'transferi', 'comision', 'interes', 'perdida', 'gastamos', 'inverti', 'taller', 'mecanico', 'repuesto'];
    const palabrasIngreso = ['vendi', 'cobre', 'ingrese', 'ingreso', 'venta', 'entrada', 'vendimos', 'cobramos', 'deposito', 'cobro', 'liquidar', 'cheque', 'transfirieron', 'recibi', 'abonaron', 'ganancia', 'liquidacion', 'reembolso', 'devolucion'];

    const checkKw = (kws: string[]) => kws.some(kw => {
        const normalizedKw = normalize(kw);
        return new RegExp(`\\b${normalizedKw}\\b`, 'i').test(txt) || txt.includes(normalizedKw);
    });

    if (checkKw(palabrasIngreso)) tipo = 'ingreso';
    else if (checkKw(palabrasGasto)) tipo = 'gasto';

    // 2. Extraer Monto
    const matchMonto = txt.match(/\b\d+([.,]\d+)?\b/);
    if (!matchMonto) return null; 
    const monto = parseFloat(matchMonto[0].replace(',', '.'));

    // 2.1 Determinar Moneda
    let monedaDectectada: Moneda | undefined;
    const currencyKeywords: Record<Moneda, string[]> = {
        'USD': ['dolares', 'usd', 'u$s', 'dolar', 'green', 'verdes', 'us$'],
        'UYU': ['pesos', 'uyu', '$u', 'uru', 'peso', 'uruguayos'],
        'ARS': ['ars', 'argentinos', 'peronios', 'pesos arg'],
        'BRL': ['reales', 'brl', 'real'],
        'EUR': ['euros', 'eur', 'euro'],
        'CLP': ['clp', 'chilenos'],
        'COP': ['cop', 'colombianos'],
        'PYG': ['pyg', 'guaranies'],
        'BOB': ['bob', 'bolivianos'],
        'PEN': ['pen', 'soles'],
        'MXN': ['mxn', 'mexicanos']
    };

    for (const [code, kws] of Object.entries(currencyKeywords)) {
        if (monedasActivas.includes(code as Moneda) && checkKw(kws)) {
            monedaDectectada = code as Moneda;
            break;
        }
    }

    let categoriaId: string | number | null = null;
    const catsDelTipo = categorias.filter(c => c.tipo === tipo);

    // 3. Prioridad 1: Buscar si el NOMBRE de alguna categoría está explícitamente en el texto
    const sortedCats = [...catsDelTipo].sort((a, b) => b.nombre.length - a.nombre.length);
    const palabrasGenericas = ['venta', 'compra', 'gasto', 'ingreso', 'entrada', 'salida', 'otros', 'otras', 'pago', 'cobro', 'varios', 'general'];

    const catPorNombre = sortedCats.find(c => {
        const nom = normalize(c.nombre);
        if (palabrasGenericas.includes(nom)) return false;
        if (txt.includes(nom)) return true;
        const palabrasSignificativas = nom.split(' ').filter(w => w.length > 3 && !palabrasGenericas.includes(w));
        return palabrasSignificativas.some(w => new RegExp(`\\b${w}\\b`, 'i').test(txt));
    });

    if (catPorNombre) {
        categoriaId = catPorNombre.id!;
    } else {
        // 4. Prioridad 2: Diccionario de palabras clave Ultra-Robusto (Multisectorial)
        // Las "keys" deben coincidir o estar contenidas en los nombres de las categorías reales
        const keywordMap = [
            { key: 'Leche', words: ['leche', 'queso', 'lacteo', 'manteca', 'suero', 'tambo', 'remitente', 'conaprole', 'indlacol', 'ordeñe', 'tanque frio', 'cuota leche', 'pezonera', 'detergente tambo', 'sellador'] },
            { key: 'Animales', words: ['vaca', 'vacas', 'ternero', 'novillo', 'toro', 'vaquillona', 'oveja', 'lana', 'cordero', 'borrego', 'ovino', 'bovino', 'hacienda', 'ternerada', 'rodeo', 'lote', 'tropa', 'remate', 'feria', 'consignatario', 'pantalla', 'plazarural', 'destete', 'invernada', 'cria', 'recria', 'vaquillonas', 'animal', 'animales', 'caravanas', 'arete', 'caballos', 'yegua', 'potrillo', 'lanar', 'vellon', 'esquila', 'carnero', 'capon'] },
            { key: 'Veterinaria', words: ['vet', 'veterinaria', 'remedio', 'vacuna', 'sanidad', 'medicamento', 'antibiotico', 'jeringa', 'desparasitante', 'aftosa', 'iia', 'inseminacion', 'carbunco', 'ivermectina', 'piojo', 'garrapata', 'bichera', 'cura de bicho', 'tacto', 'ecografia', 'raspaje', 'podologia', 'mineral', 'sal mineral', 'bloque', 'especifico', 'etiqueta azul', 'carbunclo', 'clostridiosis', 'querato', 'medicamentos', 'vacunas'] },
            { key: 'Combustible', words: ['nafta', 'gasoil', 'diesel', 'combustible', 'gasolina', 'estacion', 'bencina', 'premium', 'gasóleo', 'ancap', 'axion', 'shell', 'ypf', 'petrobras', 'grasa', 'lubricante', 'aceite motor', 'transmision', 'hidraulico', 'adblue'] },
            { key: 'Alimentación', words: ['racion', 'fardo', 'comida', 'pasto', 'maiz', 'avena', 'suplemento', 'rollo', 'alfalfa', 'proteina', 'silaje', 'concentrado', 'grano', 'semilla', 'sorgo', 'silo', 'autoconsumo', 'reserva', 'afrechillo', 'malteo', 'fardos', 'rollos', 'expeller', 'afrecho'] },
            { key: 'Granos', words: ['soja', 'trigo', 'sorgo', 'girasol', 'cebada', 'cosecha', 'trilla', 'flete', 'granos', 'silobolsa', 'planta', 'acopio', 'cooperativa', 'secado', 'humedad', 'zaranda', 'maizena'] },
            { key: 'Reparaciones', words: ['reparacion', 'arreglo', 'taller', 'repuesto', 'mecanico', 'goma', 'cubierta', 'herramienta', 'ferreteria', 'pintura', 'tractor', 'arado', 'herrería', 'aceite', 'filtro', 'bateria', 'soldadura', 'torneria', 'ferretería', 'rodamiento', 'ruleman', 'correa', 'alternador', 'arranque', 'hidraulico', 'manguera', 'disco', 'punta de eje', 'repuestos'] },
            { key: 'Alambrados', words: ['poste', 'alambre', 'pique', 'varilla', 'alambrado', 'electrificador', 'boyero', 'piquetes', 'torniquete', 'taco', 'atadora', 'balancin', 'cerco', 'valla'] },
            { key: 'Infraestructura', words: ['portland', 'arena', 'pedregal', 'caño', 'tanque', 'bebedero', 'molino', 'bomba', 'panel solar', 'tejido', 'porteria', 'tranquera', 'cepo', 'manga', 'balanza', 'galpon', 'pastoreo', 'bebederos', 'flotador', 'picada', 'corrales', 'brete'] },
            { key: 'Granja', words: ['cajon', 'plantin', 'semillero', 'invernaculo', 'nylon', 'riego', 'goteo', 'malla', 'fruta', 'verdura', 'hortaliza', 'packing', ' cajones', 'plantines', 'vivero', 'injerto', 'fungicida', 'atadura', 'tijera poda'] },
            { key: 'Apicultura', words: ['miel', 'colmena', 'alza', 'ahumador', 'cera', 'nucleo', 'reina', 'cuadro', 'extractora', 'jarabe', 'fructosa', 'varroa', 'centrifuga', 'tambor miel'] },
            { key: 'Forestal', words: ['madera', 'raleo', 'poda', 'vivero', 'eucaliptus', 'pino', 'cuadrilla', 'motosierra', 'cadena', 'aserradero', 'leña', 'monte'] },
            { key: 'Avicultura', words: ['pollito', 'ponedora', 'parrillero', 'huevo', 'incubadora', 'galpon aves', 'bebedero ave', 'jaula', 'ave', 'aves', 'maple', 'guano'] },
            { key: 'Porcinos', words: ['lechon', 'cerdo', 'chancho', 'paridera', 'marrana', 'verraco', 'lechones', 'puerco'] },
            { key: 'Mano de obra', words: ['peon', 'sueldo', 'jornal', 'empleado', 'salario', 'personal', 'aguinaldo', 'bps', 'pago', 'obrero', 'capataz', 'casero', 'tropero', 'esquilador', 'vivienda', 'comestibles', 'adelanto', 'liquidacion', 'despido', 'sereno'] },
            { key: 'Impuestos', words: ['guia', 'dicose', 'guía', 'contribucion', 'impuesto', 'dgi', 'bps', 'contador', 'escribano', 'timbre', 'seguro', 'poliza', 'banco', 'intereses', 'comision', 'honorarios', 'papeleria', 'abono', 'primaria', 'patente', 'sucive', 'aduana', 'administracion'] },
            { key: 'Servicios', words: ['luz', 'agua', 'internet', 'telefono', 'ute', 'antel', 'ose', 'gas', 'wifi', 'celular', 'flete', 'transporte', 'camion', 'flete animal', 'jaula', 'maquinista', 'trilla', 'siembra directa'] },
            { key: 'Insumos', words: ['fertilizante', 'urea', 'herbicida', 'glifosato', 'veneno', 'fertilizacion', 'potasio', 'fosforo', 'agroquimico', 'hormiguicida', 'fungicida', 'insecticida', 'curasemilla', 'inoculante', 'coadyuvante', 'fosfato'] },
            { key: 'Otros', words: ['mercaderia', 'comida', 'limpieza', 'provista', 'almacen', 'provisiones', 'casa', 'gastos varios', 'personal', 'carniceria', 'panaderia'] },
        ];

        for (const map of keywordMap) {
            if (checkKw(map.words)) {
                const found = catsDelTipo.find(c => {
                    const nom = normalize(c.nombre);
                    // Match si el nombre de la categoría contiene la "key" (ej: "SanidadAnimal" contiene "Sanidad")
                    // O si la "key" contiene el nombre de la categoría (ej: "Hacienda" matchea con "Animales")
                    return nom.includes(normalize(map.key)) || normalize(map.key).includes(nom);
                });
                if (found) {
                    categoriaId = found.id!;
                    break;
                }
            }
        }
    }

    // 5. Fallback inteligente
    if (!categoriaId) {
        const fallbacks = ['otros', 'otras', 'general', 'varios', 'diversos', 'varias'];
        const catFallback = catsDelTipo.find(c => fallbacks.some(f => normalize(c.nombre).includes(f)));
        if (catFallback) categoriaId = catFallback.id!;
    }

    if (!categoriaId && catsDelTipo.length > 0) {
        categoriaId = catsDelTipo[0].id!;
    }

    return { 
        tipo, 
        monto, 
        categoriaId, 
        nota: texto.charAt(0).toUpperCase() + texto.slice(1),
        moneda: monedaDectectada 
    };
};
