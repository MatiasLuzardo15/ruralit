import Dexie, { type Table } from 'dexie';
import type { Movimiento, Categoria, ConfigItem } from '../types';

const activeDbName = localStorage.getItem('activeEstDB') || 'RuralitDB';

if (!localStorage.getItem('ruralit_establecimientos')) {
    localStorage.setItem('ruralit_establecimientos', JSON.stringify([{ id: 'RuralitDB', nombre: 'Mi Establecimiento' }]));
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
    }
}

export const db = new RuralitDatabase();

// ─── Categorías con terminología rural familiar ──────────────────────────────

const categoriasDefault: Omit<Categoria, 'id'>[] = [
    // SALIDAS (gastos)
    { nombre: 'Alimentación / Ración', tipo: 'gasto', icono: '🌾', color: '#E65100', esPredefinida: true },
    { nombre: 'Sanidad / Veterinaria', tipo: 'gasto', icono: '💉', color: '#AD1457', esPredefinida: true },
    { nombre: 'Combustible', tipo: 'gasto', icono: '🚜', color: '#4E342E', esPredefinida: true },
    { nombre: 'Reparaciones', tipo: 'gasto', icono: '🔧', color: '#37474F', esPredefinida: true },
    { nombre: 'Mano de obra', tipo: 'gasto', icono: '👷', color: '#6A1B9A', esPredefinida: true },
    { nombre: 'Semillas / Agroquímicos', tipo: 'gasto', icono: '🌱', color: '#558B2F', esPredefinida: true },
    { nombre: 'Compra de animales', tipo: 'gasto', icono: '🐄', color: '#4E342E', esPredefinida: true },
    { nombre: 'Otros gastos', tipo: 'gasto', icono: '📦', color: '#795548', esPredefinida: true },

    // ENTRADAS (ingresos)
    { nombre: 'Venta de animales', tipo: 'ingreso', icono: '🐄', color: '#2E7D32', esPredefinida: true },
    { nombre: 'Leche / Lácteos', tipo: 'ingreso', icono: '🥛', color: '#1565C0', esPredefinida: true },
    { nombre: 'Granos / Forraje', tipo: 'ingreso', icono: '🌿', color: '#558B2F', esPredefinida: true },
    { nombre: 'Lana / Cueros', tipo: 'ingreso', icono: '🦙', color: '#795548', esPredefinida: true },
    { nombre: 'Otras entradas', tipo: 'ingreso', icono: '💰', color: '#F9A825', esPredefinida: true },
];

// ─── Seed inicial ─────────────────────────────────────────────────────────────

db.on('ready', async () => {
    const count = await db.categorias.count();
    if (count === 0) {
        await db.categorias.bulkAdd(categoriasDefault as Categoria[]);
    } else {
        const c1 = await db.categorias.where('nombre').equals('Hacienda (venta)').first();
        if (c1) await db.categorias.update(c1.id!, { nombre: 'Venta de animales' });
        const c2 = await db.categorias.where('nombre').equals('Hacienda (compra)').first();
        if (c2) await db.categorias.update(c2.id!, { nombre: 'Compra de animales' });
    }

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
