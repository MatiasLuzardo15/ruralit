// ─── Tipos de dominio ───────────────────────────────────────────────────────

export type TipoMovimiento = 'ingreso' | 'gasto';
export type Moneda = 'ARS' | 'USD' | 'EUR' | 'BRL' | 'UYU' | 'CLP' | 'COP' | 'PYG' | 'BOB' | 'PEN' | 'MXN';


export interface Categoria {
    id?: number | string;
    nombre: string;
    tipo: TipoMovimiento;
    icono: string;
    color: string;
    esPredefinida: boolean;
    server_id?: string;
    updated_at?: string;
}

export interface Movimiento {
    id?: number | string;
    establecimientoId?: string; // UUID de Supabase
    tipo: TipoMovimiento;
    monto: number;
    moneda?: Moneda;
    categoriaId: number | string;
    nota?: string;
    fecha: string; // YYYY-MM-DD
    creado_en: string; // ISO string
    server_id?: string;
    updated_at?: string;
    comprobanteUrl?: string; // Para adjuntar fotos de comprobantes
}

// ─── Interfaces Futuras (Arquitectura) ──────────────────────────────────────────────────
export interface Establecimiento {
    id?: number | string;
    nombre: string;
    ubicacion?: string;
    tipo_produccion?: string;
    monedas_activas?: string[];
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
