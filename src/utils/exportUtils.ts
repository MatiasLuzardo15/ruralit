import { dataService } from '../lib/dataService';
import { formatMonto, formatFechaCorta } from './helpers';
import type { Movimiento, Categoria } from '../types';

/** ─── SHARED CSV LOGIC ─── */
async function internalGenerateCSV(movs: Movimiento[], catMap: Map<string, Categoria>, title: string, periodLabel: string) {
    // Calculate Summary
    const summary: Record<string, { ing: number, egr: number }> = {};
    movs.forEach(m => {
        const mon = m.moneda || 'UYU';
        if (!summary[mon]) summary[mon] = { ing: 0, egr: 0 };
        if (m.tipo === 'ingreso') summary[mon].ing += m.monto;
        else summary[mon].egr += m.monto;
    });

    // Add UTF-8 BOM for Excel compatibility
    let csv = '\uFEFF';

    // Title & Info
    csv += `${title}\n`;
    csv += `Periodo:;${periodLabel}\n`;
    csv += `Generado el:;${new Date().toLocaleDateString()}\n\n`;

    // Summary Section
    csv += 'RESUMEN FINANCIERO\n';
    csv += 'Moneda;Ingresos;Egresos;Saldo Neto\n';
    Object.entries(summary).forEach(([mon, vals]) => {
        csv += `${mon};${vals.ing};${vals.egr};${vals.ing - vals.egr}\n`;
    });
    csv += '\n\n';

    // Transactions header
    csv += 'DETALLE DE OPERACIONES\n';
    csv += 'Fecha;Tipo;Categoria;Monto;Moneda;Nota\n';

    // Rows
    movs.forEach(m => {
        const catName = catMap.get(String(m.categoriaId))?.nombre || 'Sin categoría';
        const row = [
            m.fecha,
            m.tipo === 'ingreso' ? 'Entrada' : 'Salida',
            catName,
            m.monto,
            m.moneda || 'UYU',
            `"${(m.nota || '').replace(/"/g, '""')}"`
        ].join(';');
        csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export async function exportarACSV() {
    const activeId = localStorage.getItem('activeEstDB_uuid');
    if (!activeId) return;
    try {
        const [movs, cats, estab] = await Promise.all([
            dataService.getMovimientos(activeId),
            dataService.getCategorias(activeId),
            dataService.getEstablecimientoActivo()
        ]);
        const catMap = new Map(cats.map(c => [String(c.id), c]));
        await internalGenerateCSV(movs, catMap, `Ruralit - ${estab?.nombre || 'Completo'}`, 'Historial Completo');
    } catch (e) {
        console.error('Error al exportar Excel:', e);
        alert('Error al exportar los datos');
    }
}

export async function exportMovimientosCSV(movs: Movimiento[], catMap: Map<string, Categoria>, mesLabel: string) {
    try {
        await internalGenerateCSV(movs, catMap, 'Movimientos', mesLabel);
    } catch (e) {
        console.error('Error al exportar Libreta CSV:', e);
    }
}

export async function exportBalanceFullCSV(movs: Movimiento[], catMap: Map<string, Categoria>, periodLabel: string) {
    try {
        await internalGenerateCSV(movs, catMap, 'Análisis de Balance', periodLabel);
    } catch (e) {
        console.error('Error al exportar Balance CSV:', e);
    }
}

export async function exportarAPDF() {
    const activeId = localStorage.getItem('activeEstDB_uuid');
    if (!activeId) return;

    try {
        const [movs, cats, estab] = await Promise.all([
            dataService.getMovimientos(activeId),
            dataService.getCategorias(activeId),
            dataService.getEstablecimientoActivo()
        ]);

        const catMap = new Map(cats.map(c => [c.id, c]));

        // Calculate totals per currency properly
        const totals: Record<string, { ing: number, egr: number }> = {};
        movs.forEach(m => {
            const mon = m.moneda || 'UYU';
            if (!totals[mon]) totals[mon] = { ing: 0, egr: 0 };
            if (m.tipo === 'ingreso') totals[mon].ing += m.monto;
            else totals[mon].egr += m.monto;
        });
        const currencies = Object.keys(totals).sort();

        // Calculate Trend Data (Monthly Margin)
        const trendData: Record<string, { ing: number, egr: number }> = {};
        movs.forEach(m => {
            const date = new Date(m.fecha);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!trendData[key]) trendData[key] = { ing: 0, egr: 0 };
            if (m.tipo === 'ingreso') trendData[key].ing += m.monto;
            else trendData[key].egr += m.monto;
        });

        const sortedMonths = Object.keys(trendData).sort();
        const marginTrend = sortedMonths.map(month => {
            const data = trendData[month];
            const margin = data.ing > 0 ? ((data.ing - data.egr) / data.ing) * 100 : (data.egr > 0 ? -100 : 0);
            return { month, margin: Math.round(margin) };
        });

        const currentMargin = marginTrend[marginTrend.length - 1]?.margin || 0;
        const avgMargin = Math.round(marginTrend.reduce((s, m) => s + m.margin, 0) / (marginTrend.length || 1));

        // Data for doughnut
        const gastosPorCat: Record<string, number> = {};
        movs.filter(m => m.tipo === 'gasto').forEach(m => {
            const name = catMap.get(m.categoriaId)?.nombre || 'Otros';
            const label = `${name} (${m.moneda || 'UYU'})`;
            gastosPorCat[label] = (gastosPorCat[label] || 0) + m.monto;
        });

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        // Feedback Text based on all currencies and trend
        let feedback = "Situación General: ";
        currencies.forEach(mon => {
            const bal = totals[mon].ing - totals[mon].egr;
            feedback += `En ${mon}, saldo ${bal >= 0 ? 'positivo' : 'negativo'} (${formatMonto(bal, mon as any)}). `;
        });
        feedback += `Tu margen de beneficio promedio es del ${avgMargin}%. `;
        if (currentMargin > avgMargin) feedback += "La tendencia de margen es ascendente, indicando una optimización de procesos o mejores precios de venta. ";
        else if (currentMargin < avgMargin) feedback += "Se observa una ligera compresión del margen en el último periodo; sugerimos revisar costos fijos. ";

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Informe Ruralit - ${estab?.nombre}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
                <style>
                    :root { --green: #2E7D32; --red: #C94A4A; --logo: #2B3D2B; --dot: #CCFF00; }
                    @page { size: A4; margin: 12mm; }
                    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #1a1a1a; line-height: 1.3; background: #fff; }
                    .page-container { width: 185mm; margin: 0 auto; padding-top: 5mm; }
                    .logo { font-family: 'Orbitron', sans-serif; font-size: 26px; color: var(--logo); letter-spacing: -1px; margin-bottom: 2px; }
                    .logo span { color: var(--dot); font-weight: 900; }
                    .header { border-bottom: 2px solid var(--green); padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .estab-info p { margin: 0; color: #666; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
                    .header h1 { margin: 0; font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
                    
                    .section-title { font-size: 11px; font-weight: 800; color: var(--green); text-transform: uppercase; margin: 15px 0 10px; border-left: 3px solid var(--green); padding-left: 8px; }
                    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px; }
                    .card { padding: 10px; border: 1px solid #eee; border-radius: 10px; background: #fafafa; }
                    .card label { font-size: 8px; font-weight: 800; text-transform: uppercase; color: #888; display: block; margin-bottom: 3px; }
                    .card val { font-size: 15px; font-weight: 800; }

                    .feedback-box { background: #f0f7f4; border-left: 4px solid var(--green); padding: 10px; border-radius: 8px; margin-bottom: 15px; }
                    .feedback-box h3 { margin: 0 0 4px; font-size: 12px; color: var(--green); font-weight: 800; }
                    .feedback-box p { margin: 0; font-size: 11px; color: #334e3e; }

                    .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; page-break-inside: avoid; }
                    .chart-full { grid-column: span 2; margin-top: 10px; }
                    .chart-wrapper { position: relative; height: 180px; width: 100%; }
                    .chart-container h4 { margin-bottom: 5px; font-size: 10px; color: #333; text-transform: uppercase; font-weight: 800; text-align: center; }

                    table { width: 100%; border-collapse: collapse; margin-top: 10px; background: white; table-layout: auto; }
                    th { text-align: left; background: #f8f9fa; padding: 6px 8px; border-bottom: 2px solid #ddd; font-size: 8px; font-weight: 800; color: #666; }
                    td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 9px; }
                    .ing { color: var(--green); font-weight: 800; }
                    .egr { color: var(--red); font-weight: 800; }

                    .no-print { position: fixed; bottom: 20px; right: 20px; padding: 10px 20px; background: var(--green); color: #fff; border: none; border-radius: 50px; cursor: pointer; font-weight: 800; box-shadow: 0 5px 15px rgba(0,0,0,0.2); z-index: 1000; font-size: 13px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <button class="no-print" onclick="window.print()">Imprimir / Guardar Reporte</button>

                <div class="page-container">
                    <div class="logo">ruralit<span>.</span></div>
                    <div class="header">
                        <div class="estab-info">
                             <p>Análisis de Desempeño y Margen</p>
                        </div>
                        <div style="text-align: right;">
                            <h1>${estab?.nombre}</h1>
                            <div style="color: #888; font-size: 9px; font-weight: 600;">
                                ${new Date().toLocaleDateString('es-UY', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </div>
                        </div>
                    </div>

                    <div class="feedback-box">
                        <h3>Análisis Estratégico</h3>
                        <p>${feedback}</p>
                    </div>

                    <div class="grid">
                        <div class="card" style="background: #111; color: #fff;">
                            <label style="color: #aaa;">Margen Promedio</label>
                            <val style="color: #ccff00;">${avgMargin}%</val>
                        </div>
                        <div class="card">
                            <label>Margen Actual</label>
                            <val class="${currentMargin >= avgMargin ? 'ing' : 'egr'}">${currentMargin}%</val>
                        </div>
                        <div class="card">
                            <label>Estado de Tendencia</label>
                            <val style="color: ${currentMargin >= avgMargin ? '#2E7D32' : '#C94A4A'}">${currentMargin >= avgMargin ? 'CRECIENTE ↑' : 'REDUCCIÓN ↓'}</val>
                        </div>
                    </div>

                    ${currencies.map(mon => `
                        <div class="section-title">Resumen Financiero en ${mon}</div>
                        <div class="grid">
                            <div class="card"><label>Ingresos</label><val class="ing">${formatMonto(totals[mon].ing, mon as any)}</val></div>
                            <div class="card"><label>Gastos</label><val class="egr">${formatMonto(totals[mon].egr, mon as any)}</val></div>
                            <div class="card"><label>Resultado</label><val style="color: ${totals[mon].ing - totals[mon].egr >= 0 ? 'var(--green)' : 'var(--red)'}">${formatMonto(totals[mon].ing - totals[mon].egr, mon as any)}</val></div>
                        </div>
                    `).join('')}

                    <div class="charts-grid">
                        <div class="chart-container">
                            <h4>Proporción de Ingreso vs Gasto</h4>
                            <div class="chart-wrapper"><canvas id="barChart"></canvas></div>
                        </div>
                        <div class="chart-container">
                            <h4>Distribución de Egresos</h4>
                            <div class="chart-wrapper"><canvas id="expenseChart"></canvas></div>
                        </div>
                        <div class="chart-container chart-full">
                            <h4>Tendencia Histórica de Margen (%)</h4>
                            <div class="chart-wrapper" style="height: 150px;"><canvas id="trendChart"></canvas></div>
                        </div>
                    </div>

                    <div class="section-title">Registro de Operaciones</div>
                    <table>
                        <thead>
                            <tr><th>FECHA</th><th>TIPO</th><th>CATEGORÍA</th><th>CONCEPTO</th><th style="text-align: right;">MONTO</th></tr>
                        </thead>
                        <tbody>
                            ${movs.slice(0, 30).map(m => `
                                <tr>
                                    <td>${formatFechaCorta(m.fecha)}</td>
                                    <td class="${m.tipo === 'ingreso' ? 'ing' : 'egr'}">${m.tipo === 'ingreso' ? 'ENTRADA' : 'SALIDA'}</td>
                                    <td style="font-weight: 600;">${catMap.get(m.categoriaId)?.nombre || 'Sin categoría'}</td>
                                    <td>${m.nota || '-'}</td>
                                    <td style="text-align: right; font-weight: 800;">${formatMonto(m.monto, m.moneda)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <script>
                    Chart.register(ChartDataLabels);

                    const commonOptions = {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            datalabels: { display: false } // Disabled by default to keep graphics clean
                        }
                    };

                    // Donut Expense with values in labels
                    new Chart(document.getElementById('expenseChart').getContext('2d'), {
                        type: 'doughnut',
                        data: {
                            labels: ${JSON.stringify(Object.entries(gastosPorCat).map(([k, v]) => `${k}: $${v.toLocaleString()}`))},
                            datasets: [{
                                data: ${JSON.stringify(Object.values(gastosPorCat))},
                                backgroundColor: ['#2E7D32', '#C94A4A', '#1565C0', '#F9A825', '#6A1B9A', '#00838F', '#AD1457'],
                                borderWidth: 1
                            }]
                        },
                        options: { 
                            ...commonOptions, 
                            plugins: { 
                                ...commonOptions.plugins, 
                                legend: { 
                                    position: 'bottom', 
                                    labels: { boxWidth: 10, font: { size: 8, family: 'Inter', weight: '600' } } 
                                } 
                            } 
                        }
                    });

                    // Bar Comparison with values in legend
                    new Chart(document.getElementById('barChart').getContext('2d'), {
                        type: 'bar',
                        data: {
                            labels: ${JSON.stringify(currencies)},
                            datasets: [
                                { 
                                    label: 'Ingresos', 
                                    data: [${currencies.map(m => totals[m].ing).join(',')}], 
                                    backgroundColor: '#2E7D32' 
                                },
                                { 
                                    label: 'Gastos', 
                                    data: [${currencies.map(m => totals[m].egr).join(',')}], 
                                    backgroundColor: '#C94A4A' 
                                }
                            ]
                        },
                        options: { 
                            ...commonOptions, 
                            scales: { 
                                y: { ticks: { font: { size: 7 } } }, 
                                x: { ticks: { font: { size: 10, weight: 700 } } } 
                            },
                            plugins: { 
                                ...commonOptions.plugins, 
                                legend: { 
                                    display: true, 
                                    position: 'top',
                                    labels: { 
                                        boxWidth: 10, 
                                        font: { size: 9, weight: 'bold' },
                                        generateLabels: (chart) => {
                                            const original = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                                            original.forEach(label => {
                                                const dataset = chart.data.datasets[label.datasetIndex];
                                                const total = dataset.data.reduce((a, b) => a + b, 0);
                                                label.text += ' (Total: $' + total.toLocaleString() + ')';
                                            });
                                            return original;
                                        }
                                    } 
                                }
                            } 
                        }
                    });

                    // Trend Line Margin (Keeping datalabels here as trend values are critical and line charts are less cluttered)
                    new Chart(document.getElementById('trendChart').getContext('2d'), {
                        type: 'line',
                        data: {
                            labels: ${JSON.stringify(marginTrend.map(t => t.month))},
                            datasets: [{
                                label: 'Margen %',
                                data: [${marginTrend.map(t => t.margin).join(',')}],
                                borderColor: '#2E7D32',
                                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                                fill: true,
                                tension: 0.4,
                                pointRadius: 4,
                                pointBackgroundColor: '#2E7D32'
                            }]
                        },
                        options: { 
                            ...commonOptions,
                            scales: { y: { beginAtZero: false, ticks: { font: { size: 8 } } }, x: { ticks: { font: { size: 8 } } } },
                            plugins: { 
                                ...commonOptions.plugins, 
                                legend: { display: false },
                                datalabels: { display: true, align: 'top', formatter: (v) => v + '%' }
                            }
                        }
                    });
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    } catch (e) {
        console.error('Error al generar Reporte:', e);
        alert('Error al generar el informe');
    }
}
