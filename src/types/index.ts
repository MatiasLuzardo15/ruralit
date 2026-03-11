// ─── Tipos de dominio ───────────────────────────────────────────────────────

export type TipoMovimiento = 'ingreso' | 'gasto';
export type Moneda = 'ARS' | 'USD' | 'EUR' | 'BRL' | 'UYU' | 'CLP' | 'COP' | 'PYG' | 'BOB' | 'PEN' | 'MXN';


export interface Categoria {
    id?: number;
    nombre: string;
    tipo: TipoMovimiento;
    icono: string;
    color: string;
    esPredefinida: boolean;
}

export interface Movimiento {
    id?: number;
    establecimientoId?: number; // Para soporte futuro de múltiples establecimientos
    tipo: TipoMovimiento;
    monto: number;
    moneda?: Moneda;
    categoriaId: number;
    nota?: string;
    fecha: string; // YYYY-MM-DD
    creado_en: string; // ISO string
    
    // -- Futuros soportes --
    comprobanteUrl?: string; // Para adjuntar fotos de comprobantes
}

// ─── Interfaces Futuras (Arquitectura) ──────────────────────────────────────────────────
export interface Establecimiento {
    id?: number;
    nombre: string;
    ubicacion?: string;
}

export interface Recordatorio {
    id?: number;
    establecimientoId?: number;
    titulo: string;
    fechaVencimiento: string;
    completado: boolean;
}


export interface MovimientoConCategoria extends Movimiento {
    categoria?: Categoria;
}

export interface ConfigItem {
    clave: string;
    valor: any;
}

export interface BalanceMes {
    ingresos: number;
    gastos: number;
    neto: number;
}

export interface ResumenCategoria {
    categoria: Categoria;
    total: number;
    porcentaje: number;
}
