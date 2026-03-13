import Dexie, { type Table } from 'dexie';
import type { Movimiento, Categoria, ConfigItem } from '../types';

const activeDbName = localStorage.getItem('activeEstDB') || 'RuralitDB';

if (!localStorage.getItem('ruralit_establecimientos')) {
    localStorage.setItem('ruralit_establecimientos', JSON.stringify([{ id: 'RuralitDB', nombre: 'Mi Establecimiento' }]));
}

// ─── Tipos de Producción y Categorías ──────────────────────────────

export type TipoProduccion = 'Ganadería' | 'Lechería' | 'Agricultura' | 'Mixto';

export const CATEGORIAS_POR_TIPO: Record<TipoProduccion, Omit<Categoria, 'id'>[]> = {
    'Ganadería': [
        { nombre: 'Compra de animales', tipo: 'gasto', icono: '🐄', color: '#4E342E', esPredefinida: true },
        { nombre: 'Sanidad / Veterinaria', tipo: 'gasto', icono: '💉', color: '#AD1457', esPredefinida: true },
        { nombre: 'Alimentación / Ración', tipo: 'gasto', icono: '🌾', color: '#E65100', esPredefinida: true },
        { nombre: 'Personal / Jornales', tipo: 'gasto', icono: '👷', color: '#6A1B9A', esPredefinida: true },
        { nombre: 'Venta de animales', tipo: 'ingreso', icono: '🐄', color: '#2E7D32', esPredefinida: true },
        { nombre: 'Lana / Cueros', tipo: 'ingreso', icono: '🦙', color: '#795548', esPredefinida: true },
    ],
    'Lechería': [
        { nombre: 'Insumos Tambo', tipo: 'gasto', icono: '🪣', color: '#1976D2', esPredefinida: true },
        { nombre: 'Sanidad / Inseminación', tipo: 'gasto', icono: '💉', color: '#AD1457', esPredefinida: true },
        { nombre: 'Alimentación / Concentrados', tipo: 'gasto', icono: '🌾', color: '#E65100', esPredefinida: true },
        { nombre: 'Electricidad / Energía', tipo: 'gasto', icono: '💡', color: '#FBC02D', esPredefinida: true },
        { nombre: 'Venta de Leche', tipo: 'ingreso', icono: '🥛', color: '#1565C0', esPredefinida: true },
        { nombre: 'Venta de animales', tipo: 'ingreso', icono: '🐄', color: '#2E7D32', esPredefinida: true },
    ],
    'Agricultura': [
        { nombre: 'Semillas', tipo: 'gasto', icono: '🌱', color: '#558B2F', esPredefinida: true },
        { nombre: 'Fertilizantes / Químicos', tipo: 'gasto', icono: '🧪', color: '#00796B', esPredefinida: true },
        { nombre: 'Cosecha / Fletes', tipo: 'gasto', icono: '🚚', color: '#455A64', esPredefinida: true },
        { nombre: 'Reparaciones Maquinaria', tipo: 'gasto', icono: '🔧', color: '#37474F', esPredefinida: true },
        { nombre: 'Venta de Granos', tipo: 'ingreso', icono: '🌾', color: '#F9A825', esPredefinida: true },
        { nombre: 'Venta de Forraje', tipo: 'ingreso', icono: '🌿', color: '#558B2F', esPredefinida: true },
    ],
    'Mixto': [] // Se llenará con una mezcla o permitirá elegir
};

const CATEGORIAS_COMUNES: Omit<Categoria, 'id'>[] = [
    { nombre: 'Combustible', tipo: 'gasto', icono: '🚜', color: '#4E342E', esPredefinida: true },
    { nombre: 'Reparaciones Estructura', tipo: 'gasto', icono: '🔨', color: '#37474F', esPredefinida: true },
    { nombre: 'Mano de obra', tipo: 'gasto', icono: '👷', color: '#6A1B9A', esPredefinida: true },
    { nombre: 'Otros gastos', tipo: 'gasto', icono: '📦', color: '#795548', esPredefinida: true },
    { nombre: 'Otras entradas', tipo: 'ingreso', icono: '💰', color: '#F9A825', esPredefinida: true },
];

export async function inicializarCategorias(tipo: TipoProduccion) {
    const especificas = CATEGORIAS_POR_TIPO[tipo] || [];
    const todas = [...especificas, ...CATEGORIAS_COMUNES];
    
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
        // v3: No cambia esquema pero marca la versión para futuras migraciones si fuera necesario
        this.version(3).stores({
            movimientos: '++id, tipo, categoriaId, fecha, creado_en, moneda',
            categorias: '++id, tipo, nombre',
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
