/**
 * Reports Module
 * Handles Charts, Stats, and PDF Export.
 */

import { formatCurrency } from './utils.js';

// Helper for chart colors
function getColor(index) {
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#8e44ad', '#2ecc71'];
    return colors[index % colors.length];
}

// Helper for date
function getFechaFromId(registro) {
    if (registro.timestamp) return new Date(registro.timestamp);
    if (registro.createdAt && registro.createdAt.seconds) return new Date(registro.createdAt.seconds * 1000);
    return new Date();
}

// --- EXPORTED FUNCTIONS ---

export function actualizarReportes(data = null) {
    const dataSource = data || window.ventasDelDia;

    // 1. Employee Ranking
    const rankTable = document.getElementById('employeeRankingTable');
    if (rankTable) {
        const counts = {};
        dataSource.forEach(v => {
            if (v.tipo === 'Delivery') {
                const name = v.detalles || 'Desconocido';
                if (!counts[name]) counts[name] = { count: 0, total: 0 };
                counts[name].count += (Number(v.cantidad) || 0);
                counts[name].total += (Number(v.total) || 0);
            }
        });

        const sorted = Object.entries(counts).sort((a, b) => b[1].count - a[1].count);

        if (sorted.length === 0) {
            rankTable.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sin datos de delivery</td></tr>';
        } else {
            rankTable.innerHTML = sorted.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item[0]}</td>
                    <td class="text-right">${item[1].count}</td>
                    <td class="text-right">${formatCurrency(item[1].total)}</td>
                </tr>
            `).join('');
        }
    }

    // 2. Sales Charts (Pie & Trend)
    if (typeof Chart === 'undefined') return;

    // Pie Chart (Distribution)
    const ctxPie = document.getElementById('salesPieChart');
    if (ctxPie) {
        const aggr = { 'Local': 0, 'Camión': 0, 'Delivery': 0, 'Otros': 0 };
        dataSource.forEach(v => {
            if (v.tipo === 'Gasto') return;
            const t = v.tipo || 'Otros';
            if (aggr[t] !== undefined) aggr[t] += (Number(v.total) || 0);
            else aggr['Otros'] += (Number(v.total) || 0);
        });

        const dataPie = {
            labels: Object.keys(aggr),
            datasets: [{
                data: Object.values(aggr),
                backgroundColor: ['#00d2d3', '#5f27cd', '#ff9f43', '#2e86de'],
                borderWidth: 0
            }]
        };

        if (window.myPieChart) window.myPieChart.destroy();
        window.myPieChart = new Chart(ctxPie, {
            type: 'doughnut',
            data: dataPie,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: '#ecf0f1' } } }
            }
        });
    }

    // Trend Chart (Hourly Sales)
    const ctxTrend = document.getElementById('trendChart');
    if (ctxTrend) {
        // Group by Hour (range 6 AM to 10 PM)
        const hours = {};
        for (let i = 6; i <= 22; i++) hours[`${i}:00`] = 0;

        dataSource.forEach(v => {
            if (v.tipo === 'Gasto') return;

            // Priority 1: Use helper to get Date object
            const d = getFechaFromId(v);
            let hNum = d.getHours();

            // Priority 2: Fallback to .hora string if getFechaFromId returned "now" 
            // but the record has a legacy .hora string (e.g. "14:30")
            if (!v.timestamp && (!v.createdAt || !v.createdAt.seconds) && v.hora) {
                hNum = parseInt(v.hora.split(':')[0]);
            }

            const hKey = `${hNum}:00`;
            if (hours[hKey] !== undefined) {
                hours[hKey] += (Number(v.total) || 0);
            }
        });

        const dataTrend = {
            labels: Object.keys(hours),
            datasets: [{
                label: 'Ventas (RD$)',
                data: Object.values(hours),
                borderColor: '#00d2d3',
                backgroundColor: 'rgba(0, 210, 211, 0.1)',
                fill: true,
                tension: 0.4
            }]
        };

        if (window.myTrendChart) window.myTrendChart.destroy();
        window.myTrendChart = new Chart(ctxTrend, {
            type: 'line',
            data: dataTrend,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#bdc3c7' } },
                    x: { grid: { display: false }, ticks: { color: '#bdc3c7' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // 3. Stats Summary (New Logic for Redesign)
    let totalIngresos = 0;
    let totalGastos = 0;
    let totalBotellones = 0;

    // Breakdown stats
    const breakdown = {
        'Local': { qty: 0, total: 0 },
        'Delivery': { qty: 0, total: 0 },
        'Camión': { qty: 0, total: 0 },
        'Otros': { qty: 0, total: 0 }
    };

    dataSource.forEach(v => {
        const val = Number(v.total) || 0;
        const qty = Number(v.cantidad) || 0;

        if (v.tipo === 'Gasto') {
            totalGastos += Math.abs(val);
        } else {
            // Es venta
            if (val > 0) totalIngresos += val;
            totalBotellones += qty;

            // Channel breakdown
            const tipoRaw = v.tipo || 'Otros';
            // Normalize type keys
            let typeKey = 'Otros';
            if (tipoRaw.includes('Local')) typeKey = 'Local';
            else if (tipoRaw.includes('Delivery')) typeKey = 'Delivery';
            else if (tipoRaw.includes('Camión')) typeKey = 'Camión';

            if (breakdown[typeKey]) {
                breakdown[typeKey].qty += qty;
                breakdown[typeKey].total += val;
            } else {
                breakdown['Otros'].qty += qty;
                breakdown['Otros'].total += val;
            }
        }
    });

    const totalNeto = totalIngresos - totalGastos;

    // Update KPI Cards
    if (document.getElementById('repIngresos')) document.getElementById('repIngresos').textContent = formatCurrency(totalIngresos);
    if (document.getElementById('repGastos')) document.getElementById('repGastos').textContent = formatCurrency(totalGastos);
    if (document.getElementById('repNeto')) {
        const el = document.getElementById('repNeto');
        el.textContent = formatCurrency(totalNeto);
        el.style.color = totalNeto < 0 ? '#e74c3c' : '#3498db';
    }
    if (document.getElementById('repBotellones')) document.getElementById('repBotellones').textContent = totalBotellones;

    // Update Breakdown Table
    const tbody = document.getElementById('repChannelBody');
    if (tbody) {
        tbody.innerHTML = Object.entries(breakdown).map(([canal, stats]) => `
            <tr>
                <td style="padding:12px;">
                    <div style="font-weight:500;">${canal}</div>
                </td>
                <td class="text-right" style="padding:12px;">${stats.qty}</td>
                <td class="text-right" style="padding:12px; font-weight:600; color:var(--primary);">${formatCurrency(stats.total)}</td>
            </tr>
        `).join('');
    }

    // 4. Expenses Chart
    const gastosPorCategoria = {};
    dataSource.filter(v => v.tipo === 'Gasto').forEach(g => {
        let cat = g.categoria;

        if (!cat || cat === 'Otros' || cat === 'Sin Categoría') {
            const desc = g.descripcion || g.detalles || '';
            let cleanDesc = desc.replace(/^(Otros|Gasto|Nota)\s*-\s*/i, '').trim();

            if (cleanDesc && cleanDesc.length > 2) {
                cat = cleanDesc.length > 25 ? cleanDesc.substring(0, 25) + '...' : cleanDesc;
            } else {
                cat = 'Otros (Sin Detalle)';
            }
        }

        if (!gastosPorCategoria[cat]) gastosPorCategoria[cat] = 0;
        gastosPorCategoria[cat] += Math.abs(Number(g.total));
    });
    renderGastosChart(gastosPorCategoria);

    // 5. Client Reporting
    generarReporteClientes(dataSource);
}

export function renderGastosChart(dataMap) {
    const ctx = document.getElementById('gastosChart');
    if (!ctx) return;

    if (window.gastosChartInstance) {
        window.gastosChartInstance.destroy();
    }

    const labels = Object.keys(dataMap);
    const values = Object.values(dataMap);

    const legendContainer = document.getElementById('gastosLegend');
    if (legendContainer) {
        if (labels.length === 0) {
            legendContainer.innerHTML = '<span style="color:var(--text-muted)">No hay gastos</span>';
        } else {
            legendContainer.innerHTML = labels.map((l, i) => `
                <div style="display:flex; align-items:center; gap:5px; font-size:12px;">
                    <div style="width:10px; height:10px; background:${getColor(i)}; border-radius:50%;"></div>
                    <span>${l} ($${values[i].toLocaleString()})</span>
                </div>
            `).join('');
        }
    }

    if (labels.length === 0) return;

    window.gastosChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: labels.map((_, i) => getColor(i)),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

export function generarReporteClientes(data) {
    const tableBody = document.getElementById('topClientsTable');
    if (!tableBody) return;

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-muted);">Sin datos</td></tr>';
        return;
    }

    const clientStats = {};

    data.forEach(v => {
        if (v.tipo === 'Gasto') return;
        const key = v.clienteId || v.clienteNombre || 'Casual';
        const name = v.clienteNombre || (v.clienteId ? 'Cliente ' + v.clienteId : 'Casual');

        if (!clientStats[key]) {
            clientStats[key] = { id: v.clienteId, name: name, count: 0, total: 0 };
        }
        clientStats[key].count += 1;
        clientStats[key].total += (Number(v.total) || 0);
    });

    const sortedClients = Object.values(clientStats).sort((a, b) => b.total - a.total).slice(0, 10);

    if (sortedClients.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-muted);">Sin clientes registrados</td></tr>';
        return;
    }

    tableBody.innerHTML = sortedClients.map(c => {
        const realClient = (window.listaClientes || []).find(x => x.id === c.id);
        const stock = realClient ? (realClient.stockBotellones || 0) : 0;

        return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:10px;">
                <div style="font-weight:500;">${c.name}</div>
                <div style="font-size:11px; color:var(--text-muted);">${stock > 0 ? 'Stock: ' + stock : ''}</div>
            </td>
            <td style="padding:10px; text-align:right;">${c.count}</td>
            <td style="padding:10px; text-align:right;">${stock}</td>
            <td style="padding:10px; text-align:right; color:var(--success); font-weight:bold;">${formatCurrency(c.total)}</td>
        </tr>
    `}).join('');
}

export function filtrarReporte() {
    const startStr = document.getElementById('reportStart').value;
    const endStr = document.getElementById('reportEnd').value;

    if (!startStr || !endStr) {
        alert("Por favor selecciona ambas fechas");
        return;
    }

    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T23:59:59');

    const filtered = window.allRecentVentas.filter(v => {
        const d = getFechaFromId(v);
        return d >= start && d <= end;
    });

    window.currentFilteredVentas = filtered;
    actualizarReportes(filtered);

    Swal.fire({
        title: 'Filtro Aplicado',
        text: `Se encontraron ${filtered.length} registros.`,
        icon: 'info',
        timer: 2000,
        showConfirmButton: false
    });
}

export function resetFiltro() {
    document.getElementById('reportStart').value = '';
    document.getElementById('reportEnd').value = '';
    window.currentFilteredVentas = null;
    actualizarReportes(window.ventasDelDia); // Restore
    Swal.fire({
        title: 'Filtro Reiniciado',
        text: 'Mostrando registros originales.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
    });
}

export function exportarPDF() {
    if (typeof jspdf === 'undefined') { alert('Librería PDF no cargada'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const dataToPrint = window.currentFilteredVentas || window.ventasDelDia;

    doc.setFontSize(18);
    doc.text('Reporte de Ventas - BizCore System', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    const fecha = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
    doc.text(`Generado: ${fecha}`, 14, 30);

    if (window.currentFilteredVentas) {
        doc.setFontSize(10);
        doc.setTextColor(255, 0, 0);
        doc.text('* Reporte Filtrado', 14, 36);
        doc.setTextColor(100);
    }

    const net = document.getElementById('repNeto') ? document.getElementById('repNeto').textContent : '-';
    doc.text(`Rentabilidad Neta: ${net}`, 14, 45);

    const tableColumn = ["Hora", "Tipo", "Detalle", "Total"];
    const tableRows = [];

    dataToPrint.forEach(ticket => {
        const ticketData = [
            ticket.hora,
            ticket.tipo,
            ticket.tipo === 'Gasto' ? (ticket.descripcion || ticket.detalles) : ticket.detalles,
            formatCurrency(ticket.total)
        ];
        tableRows.push(ticketData);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 55,
    });

    doc.save(`Reporte_BizCore_${Date.now()}.pdf`);
}

export function filtrarHistorial() {
    const dateVal = document.getElementById('historyDateFilter') ? document.getElementById('historyDateFilter').value : '';
    const typeVal = document.getElementById('historyTypeFilter') ? document.getElementById('historyTypeFilter').value : '';
    const tbody = document.getElementById('historyTableBody') || document.getElementById('tablaRegistros');

    let filtered = window.allRecentVentas || [];

    if (dateVal && dateVal !== 'todo') {
        const now = new Date();
        const todayStr = now.toDateString();

        filtered = filtered.filter(v => {
            const d = getFechaFromId(v);
            const dStr = d.toDateString();

            if (dateVal === 'hoy') return dStr === todayStr;
            if (dateVal === 'ayer') {
                const ayer = new Date(now);
                ayer.setDate(ayer.getDate() - 1);
                return dStr === ayer.toDateString();
            }
            if (dateVal === 'semana') {
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return d >= weekAgo;
            }
            if (dateVal === 'mes') {
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }

    if (typeVal && typeVal !== 'todos') {
        filtered = filtered.filter(v => (v.tipo || '') === typeVal);
    }

    // --- RBAC DATA FILTERING ---
    const role = window.currentUserRole;
    const email = window.currentUserEmail;

    if (role === 'camion') {
        // Show only 'Camión' OR their own expenses
        filtered = filtered.filter(v =>
            v.tipo === 'Camión' ||
            (v.tipo === 'Gasto' && v.usuario === email)
        );
    } else if (role === 'planta') {
        // Planta: Planta, Produccion (custom view?), Gasto, Historial (Planta/Local)
        filtered = filtered.filter(v =>
            v.tipo === 'Local' ||
            v.tipo === 'Planta' ||
            v.tipo === 'Gasto' ||
            (v.usuario && v.usuario === email)
        );
    }
    // Admin sees everything (no filter)

    if (tbody) {
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="color:#888; font-style:italic; text-align:center; padding:20px;">No se encontraron registros</td></tr>';
        } else {
            // Need to bridge renderTableRows too, or use window.renderTableRows
            // Assuming renderTableRows is global or we import it?
            // Actually renderTableRows is inside script.js - we can call it if it's window attached
            if (typeof window.renderTableRows === 'function') {
                window.renderTableRows(tbody, filtered);
            } else {
                console.warn("renderTableRows not found");
            }
        }
    }
}

// Quick filter helper
export function applyQuickFilter(type, btn) {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const panel = document.getElementById('customDatePanel');
    if (panel) panel.style.display = 'none';

    const startInput = document.getElementById('reportStart');
    const endInput = document.getElementById('reportEnd');
    const today = new Date();

    let start, end;

    switch (type) {
        case 'today':
            start = new Date();
            end = new Date();
            break;
        case 'yesterday':
            start = new Date();
            start.setDate(today.getDate() - 1);
            end = new Date();
            end.setDate(today.getDate() - 1);
            break;
        case 'week':
            start = new Date();
            const day = start.getDay() || 7;
            if (day !== 1) start.setDate(today.getDate() - (day - 1));
            end = new Date();
            break;
        case 'month':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date();
            break;
    }

    if (start && end) {
        const fmt = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        if (startInput) startInput.value = fmt(start);
        if (endInput) endInput.value = fmt(end);

        filtrarReporte();
    }
}

export function toggleCustomDate(btn) {
    const panel = document.getElementById('customDatePanel');
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';

    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    if (isHidden && btn) btn.classList.add('active');
}
