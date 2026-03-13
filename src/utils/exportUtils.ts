import { formatFechaCorta } from './helpers';
import type { Movimiento, Categoria } from '../types';

/**
 * Exporta un array de datos a un archivo CSV y gatilla la descarga en el navegador.
 */
export const exportToCSV = (data: any[], headers: string[], fileName: string) => {
    const csvRows = [];
    
    // Header
    csvRows.push(headers.join(';'));
    
    // Body
    for (const row of data) {
        const values = Object.values(row).map(value => {
            const escaped = ('' + value).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(';'));
    }
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Prepara los movimientos para exportar a CSV
 */
export const exportMovimientosCSV = (movimientos: Movimiento[], catMap: Map<number, Categoria>, periodLabel: string) => {
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Nota', 'Monto', 'Moneda'];
    
    const data = movimientos.map(m => ({
        fecha: formatFechaCorta(m.fecha),
        tipo: m.tipo === 'ingreso' ? 'Venta/Ingreso' : 'Compra/Gasto',
        categoria: catMap.get(m.categoriaId)?.nombre ?? 'Sin categoría',
        nota: m.nota || '-',
        monto: m.monto,
        moneda: m.moneda || 'UYU'
    }));
    
    const fileName = `Reporte_Ruralit_${periodLabel.replace(/ /g, '_')}`;
    exportToCSV(data, headers, fileName);
};

/**
 * Exporta un resumen del balance (Ingresos vs Gastos por categoría)
 */
export const exportBalanceSummaryCSV = (
    ingresosCat: any[], 
    gastosCat: any[], 
    periodLabel: string,
    moneda: string
) => {
    const headers = ['Categoría', 'Tipo', 'Monto', 'Porcentaje', 'Moneda'];
    
    const data = [
        ...ingresosCat.map(item => ({
            categoria: item.cat.nombre,
            tipo: 'Ingreso',
            monto: item.monto,
            pct: `${item.pct.toFixed(2)}%`,
            moneda
        })),
        ...gastosCat.map(item => ({
            categoria: item.cat.nombre,
            tipo: 'Gasto',
            monto: item.monto,
            pct: `${item.pct.toFixed(2)}%`,
            moneda
        }))
    ];
    
    const fileName = `Resumen_Balance_${periodLabel.replace(/ /g, '_')}`;
    exportToCSV(data, headers, fileName);
};
