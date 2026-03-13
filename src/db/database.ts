import Dexie, { type Table } from 'dexie';
import type { Movimiento, Categoria, ConfigItem } from '../types';

const activeDbName = localStorage.getItem('activeEstDB') || 'RuralitDB';

if (!localStorage.getItem('ruralit_establecimientos')) {
    localStorage.setItem('ruralit_establecimientos', JSON.stringify([{ id: 'RuralitDB', nombre: 'Mi Establecimiento' }]));
}

// ─── Tipos de Producción y Categorías ──────────────────────────────

export type TipoProduccion = 'Ganadería' | 'Lechería' | 'Agricultura' | 'Contratista' | 'Ovina' | 'Mixto';

export const CATEGORIAS_POR_TIPO: Record<TipoProduccion, Omit<Categoria, 'id'>[]> = {
    'Ganadería': [
        // Entradas
        { nombre: 'Venta de hacienda', tipo: 'ingreso', icono: '🐄', color: '#2E7D32', esPredefinida: true },
        { nombre: 'Venta de terneros', tipo: 'ingreso', icono: '🐂', color: '#2E7D32', esPredefinida: true },
        { nombre: 'Venta de vacas', tipo: 'ingreso', icono: '🐄', color: '#2E7D32', esPredefinida: true },
        { nombre: 'Venta de toros', tipo: 'ingreso', icono: '🐃', color: '#2E7D32', esPredefinida: true },
        { nombre: 'Venta de novillos', tipo: 'ingreso', icono: '🐄', color: '#2E7D32', esPredefinida: true },
        { nombre: 'Venta de corderos', tipo: 'ingreso', icono: '🐑', color: '#795548', esPredefinida: true },
        { nombre: 'Venta de lana', tipo: 'ingreso', icono: '🧶', color: '#795548', esPredefinida: true },
        { nombre: 'Venta de cueros', tipo: 'ingreso', icono: '🧤', color: '#795548', esPredefinida: true },
        { nombre: 'Venta de reproductores', tipo: 'ingreso', icono: '🏆', color: '#2E7D32', esPredefinida: true },
        { nombre: 'Pastoreo cobrado', tipo: 'ingreso', icono: '🌿', color: '#1565C0', esPredefinida: true },
        { nombre: 'Arrendamiento de campo', tipo: 'ingreso', icono: '🌾', color: '#1565C0', esPredefinida: true },
        { nombre: 'Subsidios ganaderos', tipo: 'ingreso', icono: '🏛️', color: '#00796B', esPredefinida: true },
        { nombre: 'Servicios ganaderos', tipo: 'ingreso', icono: '🤝', color: '#F9A825', esPredefinida: true },
        { nombre: 'Otros ingresos', tipo: 'ingreso', icono: '💰', color: '#F9A825', esPredefinida: true },
        // Salidas
        { nombre: 'Alimentación / ración', tipo: 'gasto', icono: '🌾', color: '#E65100', esPredefinida: true },
        { nombre: 'Fardos / silo', tipo: 'gasto', icono: '📦', color: '#E65100', esPredefinida: true },
        { nombre: 'Suplementos', tipo: 'gasto', icono: '💊', color: '#E65100', esPredefinida: true },
        { nombre: 'Sales minerales', tipo: 'gasto', icono: '🧂', color: '#E65100', esPredefinida: true },
        { nombre: 'Compra de ganado', tipo: 'gasto', icono: '🐄', color: '#4E342E', esPredefinida: true },
        { nombre: 'Veterinaria', tipo: 'gasto', icono: '💉', color: '#AD1457', esPredefinida: true },
        { nombre: 'Medicamentos', tipo: 'gasto', icono: '💊', color: '#AD1457', esPredefinida: true },
        { nombre: 'Vacunas', tipo: 'gasto', icono: '💉', color: '#AD1457', esPredefinida: true },
        { nombre: 'Antiparasitarios', tipo: 'gasto', icono: '🧪', color: '#AD1457', esPredefinida: true },
        { nombre: 'Combustible', tipo: 'gasto', icono: '🚜', color: '#455A64', esPredefinida: true },
        { nombre: 'Lubricantes', tipo: 'gasto', icono: '🛢️', color: '#455A64', esPredefinida: true },
        { nombre: 'Reparación de maquinaria', tipo: 'gasto', icono: '🔧', color: '#37474F', esPredefinida: true },
        { nombre: 'Repuestos', tipo: 'gasto', icono: '🔩', color: '#37474F', esPredefinida: true },
        { nombre: 'Mantenimiento maquinaria', tipo: 'gasto', icono: '⚙️', color: '#37474F', esPredefinida: true },
        { nombre: 'Arrendamiento de campo', tipo: 'gasto', icono: '🏠', color: '#5D4037', esPredefinida: true },
        { nombre: 'Pastoreo pagado', tipo: 'gasto', icono: '🌿', color: '#5D4037', esPredefinida: true },
        { nombre: 'Mano de obra', tipo: 'gasto', icono: '👷', color: '#6A1B9A', esPredefinida: true },
        { nombre: 'Jornales', tipo: 'gasto', icono: '📋', color: '#6A1B9A', esPredefinida: true },
        { nombre: 'Contratistas', tipo: 'gasto', icono: '🚜', color: '#1E88E5', esPredefinida: true },
        { nombre: 'Transporte', tipo: 'gasto', icono: '🚚', color: '#455A64', esPredefinida: true },
        { nombre: 'Alambrados', tipo: 'gasto', icono: '🚧', color: '#37474F', esPredefinida: true },
        { nombre: 'Corrales', tipo: 'gasto', icono: '🛖', color: '#37474F', esPredefinida: true },
        { nombre: 'Infraestructura rural', tipo: 'gasto', icono: '🏗️', color: '#37474F', esPredefinida: true },
        { nombre: 'Electricidad', tipo: 'gasto', icono: '💡', color: '#FBC02D', esPredefinida: true },
        { nombre: 'Agua', tipo: 'gasto', icono: '🚰', color: '#1565C0', esPredefinida: true },
        { nombre: 'Impuestos', tipo: 'gasto', icono: '📄', color: '#546E7A', esPredefinida: true },
        { nombre: 'Seguros', tipo: 'gasto', icono: '🛡️', color: '#546E7A', esPredefinida: true },
        { nombre: 'Honorarios contables', tipo: 'gasto', icono: '👨‍💼', color: '#546E7A', esPredefinida: true },
        { nombre: 'Otros gastos', tipo: 'gasto', icono: '📦', color: '#795548', esPredefinida: true },
    ],
    'Lechería': [
        // Entradas
        { nombre: 'Venta de leche', tipo: 'ingreso', icono: '🥛', color: '#1565C0', esPredefinida: true },
        { nombre: 'Bonificaciones industria', tipo: 'ingreso', icono: '💰', color: '#1565C0', esPredefinida: true },
        { nombre: 'Venta de queso', tipo: 'ingreso', icono: '🧀', color: '#FBC02D', esPredefinida: true },
        { nombre: 'Venta de crema', tipo: 'ingreso', icono: '🍶', color: '#FBC02D', esPredefinida: true },
        { nombre: 'Venta derivados lácteos', tipo: 'ingreso', icono: '🍦', color: '#FBC02D', esPredefinida: true },
        { nombre: 'Venta de terneros', tipo: 'ingreso', icono: '🐂', color: '#1565C0', esPredefinida: true },
        { nombre: 'Venta de vacas descarte', tipo: 'ingreso', icono: '🐄', color: '#1565C0', esPredefinida: true },
        { nombre: 'Arrendamiento cobrado', tipo: 'ingreso', icono: '🏠', color: '#1565C0', esPredefinida: true },
        { nombre: 'Subsidios lecheros', tipo: 'ingreso', icono: '🏛️', color: '#00796B', esPredefinida: true },
        { nombre: 'Otros ingresos', tipo: 'ingreso', icono: '💰', color: '#F9A825', esPredefinida: true },
        // Salidas
        { nombre: 'Alimentación / ración', tipo: 'gasto', icono: '🌾', color: '#E65100', esPredefinida: true },
        { nombre: 'Suplementos', tipo: 'gasto', icono: '💊', color: '#E65100', esPredefinida: true },
        { nombre: 'Silaje', tipo: 'gasto', icono: '📦', color: '#E65100', esPredefinida: true },
        { nombre: 'Veterinaria', tipo: 'gasto', icono: '💉', color: '#AD1457', esPredefinida: true },
        { nombre: 'Medicamentos', tipo: 'gasto', icono: '💊', color: '#AD1457', esPredefinida: true },
        { nombre: 'Vacunas', tipo: 'gasto', icono: '💉', color: '#AD1457', esPredefinida: true },
        { nombre: 'Antiparasitarios', tipo: 'gasto', icono: '🧪', color: '#AD1457', esPredefinida: true },
        { nombre: 'Combustible', tipo: 'gasto', icono: '🚜', color: '#455A64', esPredefinida: true },
        { nombre: 'Reparación de maquinaria', tipo: 'gasto', icono: '🔧', color: '#37474F', esPredefinida: true },
        { nombre: 'Mantenimiento maquinaria', tipo: 'gasto', icono: '⚙️', color: '#37474F', esPredefinida: true },
        { nombre: 'Reparación sala ordeñe', tipo: 'gasto', icono: '🔧', color: '#1E88E5', esPredefinida: true },
        { nombre: 'Mano de obra', tipo: 'gasto', icono: '👷', color: '#6A1B9A', esPredefinida: true },
        { nombre: 'Jornales', tipo: 'gasto', icono: '📋', color: '#6A1B9A', esPredefinida: true },
        { nombre: 'Transporte de leche', tipo: 'gasto', icono: '🚚', color: '#455A64', esPredefinida: true },
        { nombre: 'Electricidad', tipo: 'gasto', icono: '💡', color: '#FBC02D', esPredefinida: true },
        { nombre: 'Agua', tipo: 'gasto', icono: '🚰', color: '#1565C0', esPredefinida: true },
        { nombre: 'Arrendamiento de campo', tipo: 'gasto', icono: '🏠', color: '#5D4037', esPredefinida: true },
        { nombre: 'Impuestos', tipo: 'gasto', icono: '📄', color: '#546E7A', esPredefinida: true },
        { nombre: 'Seguros', tipo: 'gasto', icono: '🛡️', color: '#546E7A', esPredefinida: true },
        { nombre: 'Honorarios contables', tipo: 'gasto', icono: '👨‍💼', color: '#546E7A', esPredefinida: true },
        { nombre: 'Otros gastos', tipo: 'gasto', icono: '📦', color: '#795548', esPredefinida: true },
    ],
    'Agricultura': [
        // Entradas
        { nombre: 'Venta de granos', tipo: 'ingreso', icono: '🌾', color: '#F9A825', esPredefinida: true },
        { nombre: 'Venta de soja', tipo: 'ingreso', icono: '🫘', color: '#F9A825', esPredefinida: true },
        { nombre: 'Venta de maíz', tipo: 'ingreso', icono: '🌽', color: '#F9A825', esPredefinida: true },
        { nombre: 'Venta de trigo', tipo: 'ingreso', icono: '🌾', color: '#F9A825', esPredefinida: true },
        { nombre: 'Venta de cebada', tipo: 'ingreso', icono: '🌾', color: '#F9A825', esPredefinida: true },
        { nombre: 'Venta de arroz', tipo: 'ingreso', icono: '🌾', color: '#F9A825', esPredefinida: true },
        { nombre: 'Venta de girasol', tipo: 'ingreso', icono: '🌻', color: '#F9A825', esPredefinida: true },
        { nombre: 'Venta de semillas', tipo: 'ingreso', icono: '🌱', color: '#F9A825', esPredefinida: true },
        { nombre: 'Arrendamiento cobrado', tipo: 'ingreso', icono: '🏠', color: '#1565C0', esPredefinida: true },
        { nombre: 'Servicios agrícolas', tipo: 'ingreso', icono: '🚜', color: '#F9A825', esPredefinida: true },
        { nombre: 'Subsidios agrícolas', tipo: 'ingreso', icono: '🏛️', color: '#00796B', esPredefinida: true },
        { nombre: 'Otros ingresos', tipo: 'ingreso', icono: '💰', color: '#F9A825', esPredefinida: true },
        // Salidas
        { nombre: 'Semillas', tipo: 'gasto', icono: '🌱', color: '#558B2F', esPredefinida: true },
        { nombre: 'Fertilizantes', tipo: 'gasto', icono: '🧪', color: '#00796B', esPredefinida: true },
        { nombre: 'Herbicidas', tipo: 'gasto', icono: '🧪', color: '#00796B', esPredefinida: true },
        { nombre: 'Insecticidas', tipo: 'gasto', icono: '🧪', color: '#00796B', esPredefinida: true },
        { nombre: 'Fungicidas', tipo: 'gasto', icono: '🧪', color: '#00796B', esPredefinida: true },
        { nombre: 'Labranza', tipo: 'gasto', icono: '🚜', color: '#37474F', esPredefinida: true },
        { nombre: 'Siembra', tipo: 'gasto', icono: '🌱', color: '#37474F', esPredefinida: true },
        { nombre: 'Cosecha', tipo: 'gasto', icono: '🚜', color: '#37474F', esPredefinida: true },
        { nombre: 'Combustible', tipo: 'gasto', icono: '🚜', color: '#455A64', esPredefinida: true },
        { nombre: 'Lubricantes', tipo: 'gasto', icono: '🛢️', color: '#455A64', esPredefinida: true },
        { nombre: 'Reparación de maquinaria', tipo: 'gasto', icono: '🔧', color: '#37474F', esPredefinida: true },
        { nombre: 'Repuestos', tipo: 'gasto', icono: '🔩', color: '#37474F', esPredefinida: true },
        { nombre: 'Transporte', tipo: 'gasto', icono: '🚚', color: '#455A64', esPredefinida: true },
        { nombre: 'Flete', tipo: 'gasto', icono: '🚚', color: '#455A64', esPredefinida: true },
        { nombre: 'Secado de granos', tipo: 'gasto', icono: '🌬️', color: '#37474F', esPredefinida: true },
        { nombre: 'Almacenamiento', tipo: 'gasto', icono: '🛖', color: '#37474F', esPredefinida: true },
        { nombre: 'Mano de obra', tipo: 'gasto', icono: '👷', color: '#6A1B9A', esPredefinida: true },
        { nombre: 'Contratistas', tipo: 'gasto', icono: '🚜', color: '#1E88E5', esPredefinida: true },
        { nombre: 'Arrendamiento de campo', tipo: 'gasto', icono: '🏠', color: '#5D4037', esPredefinida: true },
        { nombre: 'Impuestos', tipo: 'gasto', icono: '📄', color: '#546E7A', esPredefinida: true },
        { nombre: 'Seguros', tipo: 'gasto', icono: '🛡️', color: '#546E7A', esPredefinida: true },
        { nombre: 'Honorarios contables', tipo: 'gasto', icono: '👨‍💼', color: '#546E7A', esPredefinida: true },
        { nombre: 'Otros gastos', tipo: 'gasto', icono: '📦', color: '#795548', esPredefinida: true },
    ],
    'Contratista': [
        // Entradas
        { nombre: 'Servicios de siembra', tipo: 'ingreso', icono: '🌱', color: '#1E88E5', esPredefinida: true },
        { nombre: 'Servicios de cosecha', tipo: 'ingreso', icono: '🚜', color: '#1E88E5', esPredefinida: true },
        { nombre: 'Servicios de fumigación', tipo: 'ingreso', icono: '🧪', color: '#1E88E5', esPredefinida: true },
        { nombre: 'Servicios de maquinaria', tipo: 'ingreso', icono: '🔧', color: '#1E88E5', esPredefinida: true },
        { nombre: 'Servicios de transporte', tipo: 'ingreso', icono: '🚚', color: '#1E88E5', esPredefinida: true },
        { nombre: 'Servicios de laboreo', tipo: 'ingreso', icono: '🚜', color: '#1E88E5', esPredefinida: true },
        { nombre: 'Otros ingresos', tipo: 'ingreso', icono: '💰', color: '#F9A825', esPredefinida: true },
        // Salidas
        { nombre: 'Combustible', tipo: 'gasto', icono: '🚜', color: '#455A64', esPredefinida: true },
        { nombre: 'Lubricantes', tipo: 'gasto', icono: '🛢️', color: '#455A64', esPredefinida: true },
        { nombre: 'Reparación de maquinaria', tipo: 'gasto', icono: '🔧', color: '#37474F', esPredefinida: true },
        { nombre: 'Repuestos', tipo: 'gasto', icono: '🔩', color: '#37474F', esPredefinida: true },
        { nombre: 'Compra de maquinaria', tipo: 'gasto', icono: '🚜', color: '#1976D2', esPredefinida: true },
        { nombre: 'Mantenimiento maquinaria', tipo: 'gasto', icono: '⚙️', color: '#37474F', esPredefinida: true },
        { nombre: 'Mano de obra', tipo: 'gasto', icono: '👷', color: '#6A1B9A', esPredefinida: true },
        { nombre: 'Jornales', tipo: 'gasto', icono: '📋', color: '#6A1B9A', esPredefinida: true },
        { nombre: 'Transporte', tipo: 'gasto', icono: '🚚', color: '#455A64', esPredefinida: true },
        { nombre: 'Seguros', tipo: 'gasto', icono: '🛡️', color: '#546E7A', esPredefinida: true },
        { nombre: 'Impuestos', tipo: 'gasto', icono: '📄', color: '#546E7A', esPredefinida: true },
        { nombre: 'Otros gastos', tipo: 'gasto', icono: '📦', color: '#795548', esPredefinida: true },
    ],
    'Ovina': [
        // Entradas
        { nombre: 'Venta de corderos', tipo: 'ingreso', icono: '🐑', color: '#7E57C2', esPredefinida: true },
        { nombre: 'Venta de ovejas', tipo: 'ingreso', icono: '🐑', color: '#7E57C2', esPredefinida: true },
        { nombre: 'Venta de lana', tipo: 'ingreso', icono: '🧶', color: '#7E57C2', esPredefinida: true },
        { nombre: 'Venta de reproductores', tipo: 'ingreso', icono: '🏆', color: '#7E57C2', esPredefinida: true },
        { nombre: 'Pastoreo cobrado', tipo: 'ingreso', icono: '🌿', color: '#1565C0', esPredefinida: true },
        { nombre: 'Subsidios', tipo: 'ingreso', icono: '🏛️', color: '#00796B', esPredefinida: true },
        { nombre: 'Otros ingresos', tipo: 'ingreso', icono: '💰', color: '#F9A825', esPredefinida: true },
        // Salidas
        { nombre: 'Alimentación', tipo: 'gasto', icono: '🌾', color: '#E65100', esPredefinida: true },
        { nombre: 'Suplementos', tipo: 'gasto', icono: '💊', color: '#E65100', esPredefinida: true },
        { nombre: 'Veterinaria', tipo: 'gasto', icono: '💉', color: '#AD1457', esPredefinida: true },
        { nombre: 'Vacunas', tipo: 'gasto', icono: '💉', color: '#AD1457', esPredefinida: true },
        { nombre: 'Antiparasitarios', tipo: 'gasto', icono: '🧪', color: '#AD1457', esPredefinida: true },
        { nombre: 'Combustible', tipo: 'gasto', icono: '🚜', color: '#455A64', esPredefinida: true },
        { nombre: 'Mano de obra', tipo: 'gasto', icono: '👷', color: '#6A1B9A', esPredefinida: true },
        { nombre: 'Transporte', tipo: 'gasto', icono: '🚚', color: '#455A64', esPredefinida: true },
        { nombre: 'Arrendamiento de campo', tipo: 'gasto', icono: '🏠', color: '#5D4037', esPredefinida: true },
        { nombre: 'Impuestos', tipo: 'gasto', icono: '📄', color: '#546E7A', esPredefinida: true },
        { nombre: 'Seguros', tipo: 'gasto', icono: '🛡️', color: '#546E7A', esPredefinida: true },
        { nombre: 'Otros gastos', tipo: 'gasto', icono: '📦', color: '#795548', esPredefinida: true },
    ],
    'Mixto': [
        // Basado en sugerencia "Ruralia v1" (Pocas categorías al principio)
        { nombre: 'Venta de hacienda', tipo: 'ingreso', icono: '🐄', color: '#2E7D32', esPredefinida: true },
        { nombre: 'Venta de leche', tipo: 'ingreso', icono: '🥛', color: '#1565C0', esPredefinida: true },
        { nombre: 'Venta de granos', tipo: 'ingreso', icono: '🌾', color: '#F9A825', esPredefinida: true },
        { nombre: 'Arrendamiento cobrado', tipo: 'ingreso', icono: '🏠', color: '#1565C0', esPredefinida: true },
        { nombre: 'Servicios rurales', tipo: 'ingreso', icono: '🚜', color: '#F9A825', esPredefinida: true },
        { nombre: 'Subsidios', tipo: 'ingreso', icono: '🏛️', color: '#00796B', esPredefinida: true },
        { nombre: 'Otros ingresos', tipo: 'ingreso', icono: '💰', color: '#F9A825', esPredefinida: true },
        { nombre: 'Alimentación', tipo: 'gasto', icono: '🌾', color: '#E65100', esPredefinida: true },
        { nombre: 'Veterinaria', tipo: 'gasto', icono: '💉', color: '#AD1457', esPredefinida: true },
        { nombre: 'Combustible', tipo: 'gasto', icono: '🚜', color: '#455A64', esPredefinida: true },
        { nombre: 'Mano de obra', tipo: 'gasto', icono: '👷', color: '#6A1B9A', esPredefinida: true },
        { nombre: 'Insumos agrícolas', tipo: 'gasto', icono: '🌱', color: '#558B2F', esPredefinida: true },
        { nombre: 'Arrendamiento de campo', tipo: 'gasto', icono: '🏠', color: '#5D4037', esPredefinida: true },
        { nombre: 'Impuestos', tipo: 'gasto', icono: '📄', color: '#546E7A', esPredefinida: true },
        { nombre: 'Transporte', tipo: 'gasto', icono: '🚚', color: '#455A64', esPredefinida: true },
        { nombre: 'Otros gastos', tipo: 'gasto', icono: '📦', color: '#795548', esPredefinida: true },
    ]
};

export async function inicializarCategorias(tipo: TipoProduccion, limpiar: boolean = false) {
    if (limpiar) {
        // Obtenemos los IDs de categorías que tienen movimientos asociados
        const movimientos = await db.movimientos.toArray();
        const idsEnUso = new Set(movimientos.map(m => m.categoriaId));

        // Borramos solo las categorías predefinidas que NO están en uso
        // Usamos filter porque es posible que el índice esPredefinida sea nuevo
        await db.categorias
            .filter(c => c.esPredefinida === true && !idsEnUso.has(c.id!))
            .delete();
    }

    const todas = CATEGORIAS_POR_TIPO[tipo] || [];
    
    for (const cat of todas) {
        const existe = await db.categorias.where('nombre').equals(cat.nombre).first();
        if (!existe) {
            await db.categorias.add(cat as Categoria);
        }
    }
}

export class RuralitDatabase extends Dexie {
    movimientos!: Table<Movimiento, number>;
    categorias!: Table<Categoria, number>;
    config!: Table<ConfigItem, string>;

    constructor() {
        super(activeDbName);
        this.version(1).stores({
            movimientos: '++id, tipo, categoriaId, fecha, creado_en',
            categorias: '++id, tipo, nombre',
            config: 'clave',
        });
        // v2: campo moneda por movimiento (opcional, retrocompatible)
        this.version(2).stores({
            movimientos: '++id, tipo, categoriaId, fecha, creado_en, moneda',
            categorias: '++id, tipo, nombre',
            config: 'clave',
        });
        // v4: Indexamos esPredefinida para limpiezas eficientes
        this.version(4).stores({
            movimientos: '++id, tipo, categoriaId, fecha, creado_en, moneda',
            categorias: '++id, tipo, nombre, esPredefinida',
            config: 'clave',
        });
    }
}

export const db = new RuralitDatabase();


// ─── Seed inicial ─────────────────────────────────────────────────────────────

db.on('ready', async () => {
    // Ya no cargamos categorías por defecto aquí si queremos usar el setup flow
    // pero mantenemos los fixes de nombres por compatibilidad
    const c1 = await db.categorias.where('nombre').equals('Hacienda (venta)').first();
    if (c1) await db.categorias.update(c1.id!, { nombre: 'Venta de animales' });
    const c2 = await db.categorias.where('nombre').equals('Hacienda (compra)').first();
    if (c2) await db.categorias.update(c2.id!, { nombre: 'Compra de animales' });

    const nombreExistente = await db.config.get('nombreEstablecimiento');
    if (!nombreExistente) {
        let nameToUse = 'Mi Establecimiento';
        try {
            const estabs = JSON.parse(localStorage.getItem('ruralit_establecimientos') || '[]');
            const act = estabs.find((e: any) => e.id === activeDbName);
            if (act) nameToUse = act.nombre;
        } catch(e) {}

        await db.config.bulkPut([
            { clave: 'nombreEstablecimiento', valor: nameToUse },
            { clave: 'moneda', valor: 'UYU' },
        ]);
    }
});

export default db;
