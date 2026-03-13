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

/**
 * Exportación completa de Balance que incluye detalle y resúmenes por moneda
 */
export const exportBalanceFullCSV = (movimientos: Movimiento[], catMap: Map<number, Categoria>, periodLabel: string) => {
    const csvRows = [];

    // Título y Periodo
    csvRows.push(`REPORTE DE BALANCE RURALIT - ${periodLabel.toUpperCase()}`);
    csvRows.push('');

    // --- SECCIÓN 1: RESUMEN POR MONEDA ---
    const currencies = Array.from(new Set(movimientos.map(m => m.moneda || 'UYU')));

    currencies.forEach(curr => {
        const movsCurr = movimientos.filter(m => (m.moneda || 'UYU') === curr);
        const totalI = movsCurr.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
        const totalG = movsCurr.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);

        csvRows.push(`RESUMEN EN ${curr}`);
        csvRows.push(`Total Ingresos;${totalI}`);
        csvRows.push(`Total Gastos;${totalG}`);
        csvRows.push(`Saldo Neto;${totalI - totalG}`);
        csvRows.push('');

        // Desglose por categoría en esta moneda
        csvRows.push('Categoría;Tipo;Total');
        const cats = new Map<number, { nombre: string, ingreso: number, gasto: number }>();

        movsCurr.forEach(m => {
            if (!cats.has(m.categoriaId)) {
                cats.set(m.categoriaId, {
                    nombre: catMap.get(m.categoriaId)?.nombre ?? 'Sin categoría',
                    ingreso: 0,
                    gasto: 0
                });
            }
            const c = cats.get(m.categoriaId)!;
            if (m.tipo === 'ingreso') c.ingreso += m.monto;
            else c.gasto += m.monto;
        });

        const sortedCats = Array.from(cats.values()).sort((a, b) => (b.ingreso + b.gasto) - (a.ingreso + a.gasto));

        sortedCats.forEach(c => {
            if (c.ingreso > 0) csvRows.push(`${c.nombre};Ingreso;${c.ingreso}`);
            if (c.gasto > 0) csvRows.push(`${c.nombre};Gasto;${c.gasto}`);
        });
        csvRows.push('');
        csvRows.push('');
    });

    // --- SECCIÓN 2: DETALLE DE MOVIMIENTOS ---
    csvRows.push('DETALLE DE MOVIMIENTOS (TODAS LAS MONEDAS)');
    csvRows.push('Fecha;Tipo;Categoría;Nota;Monto;Moneda');

    const sorted = [...movimientos].sort((a, b) => a.fecha.localeCompare(b.fecha));

    sorted.forEach(m => {
        csvRows.push([
            formatFechaCorta(m.fecha),
            m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
            catMap.get(m.categoriaId)?.nombre ?? 'Sin categoría',
            m.nota || '-',
            m.monto,
            m.moneda || 'UYU'
        ].join(';'));
    });

    const csvContent = csvRows.join('\n');
    // Agregamos BOM para que Excel reconozca UTF-8 automáticamente
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Balance_Ruralit_${periodLabel.replace(/ /g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
