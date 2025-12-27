// --- 📊 MÓDULO DE REPORTES ---

// Global Chart Instances (from Globals)
// window.myPieChart, window.myTrendChart, window.gastosChartInstance

window.actualizarReportes = function (data = null) {
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
        // Group by Hour
        const hours = {};
        for (let i = 8; i <= 20; i++) hours[`${i}:00`] = 0; // Init 8am to 8pm

        dataSource.forEach(v => {
            if (v.tipo === 'Gasto') return;
            if (v.hora) {
                const h = v.hora.split(':')[0] + ':00';
                if (hours[h] !== undefined) hours[h] += (Number(v.total) || 0);
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

    // 3. Stats Summary (Net Profit, etc.)
    const totalVentas = dataSource.reduce((acc, v) => v.tipo !== 'Gasto' ? acc + (Number(v.total) || 0) : acc, 0);
    const totalGastos = dataSource.reduce((acc, v) => v.tipo === 'Gasto' ? acc + (Math.abs(Number(v.total)) || 0) : acc, 0);
    const totalNeto = totalVentas - totalGastos;
    const profit = totalNeto;
    const margin = totalVentas > 0 ? ((profit / totalVentas) * 100).toFixed(1) : 0;
    const countVentas = dataSource.filter(v => v.tipo !== 'Gasto').length;
    const avgTicket = countVentas > 0 ? (totalVentas / countVentas) : 0;

    // Update new Summary Elements (from Expense Report Phase)
    if (document.getElementById('repVentaTotal')) {
        document.getElementById('repVentaTotal').textContent = formatCurrency(totalVentas);
        document.getElementById('repGastosTotal').textContent = formatCurrency(totalGastos);
        document.getElementById('repNeto').textContent = formatCurrency(totalNeto);
    }

    // Update old Summary Elements (if present)
    const elProfit = document.getElementById('reportNetProfit');
    if (elProfit) elProfit.textContent = formatCurrency(profit);

    const elMargin = document.getElementById('reportMargin');
    if (elMargin) elMargin.textContent = `${margin}%`;

    const elAvg = document.getElementById('reportAvgTicket');
    if (elAvg) elAvg.textContent = formatCurrency(avgTicket);


    // 4. Expenses Chart (New)
    const gastosPorCategoria = {};
    dataSource.filter(v => v.tipo === 'Gasto').forEach(g => {
        let cat = g.categoria;

        // If category is generic ('Otros', 'Sin Categoría') or missing, use the description for better insight
        if (!cat || cat === 'Otros' || cat === 'Sin Categoría') {
            const desc = g.descripcion || g.detalles || '';
            // Clean description (remove generic prefixes if any)
            let cleanDesc = desc.replace(/^(Otros|Gasto|Nota)\s*-\s*/i, '').trim();

            if (cleanDesc && cleanDesc.length > 2) {
                // Use the specific description as the category label
                // Truncate if too long to keep chart clean
                cat = cleanDesc.length > 25 ? cleanDesc.substring(0, 25) + '...' : cleanDesc;
            } else {
                cat = 'Otros (Sin Detalle)';
            }
        }

        if (!gastosPorCategoria[cat]) gastosPorCategoria[cat] = 0;
        gastosPorCategoria[cat] += Math.abs(Number(g.total));
    });
    renderGastosChart(gastosPorCategoria);

    // 5. Client Reporting (Legacy)
    if (window.generarReporteClientes) window.generarReporteClientes(dataSource);
};

window.renderGastosChart = function (dataMap) {
    const ctx = document.getElementById('gastosChart');
    if (!ctx) return;

    // Clear existing
    if (window.gastosChartInstance) {
        window.gastosChartInstance.destroy();
    }

    const labels = Object.keys(dataMap);
    const values = Object.values(dataMap);

    // Legend
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
                legend: { display: false } // Custom legend used
            }
        }
    });
}

function getColor(index) {
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#8e44ad', '#2ecc71'];
    return colors[index % colors.length];
}

// --- FILTERING & EXPORT ---

window.filtrarReporte = function () {
    const startStr = document.getElementById('reportStart').value;
    const endStr = document.getElementById('reportEnd').value;

    if (!startStr || !endStr) {
        alert("Por favor selecciona ambas fechas");
        return;
    }

    // Force Local Time
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T23:59:59');

    // Filter
    const filtered = window.allRecentVentas.filter(v => {
        const d = getFechaFromId(v);
        return d >= start && d <= end;
    });

    // Update Global State for Exports
    window.currentFilteredVentas = filtered;

    // Update UI
    window.actualizarReportes(filtered);

    Swal.fire({
        title: 'Filtro Aplicado',
        text: `Se encontraron ${filtered.length} registros.`,
        icon: 'info',
        timer: 2000,
        showConfirmButton: false
    });
}

window.resetFiltro = function () {
    document.getElementById('reportStart').value = '';
    document.getElementById('reportEnd').value = '';
    window.currentFilteredVentas = null;
    window.actualizarReportes(window.ventasDelDia); // Restore
    Swal.fire({
        title: 'Filtro Reiniciado',
        text: 'Mostrando registros originales.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
    });
}

// Helper for date
function getFechaFromId(registro) {
    if (registro.timestamp) return new Date(registro.timestamp);
    if (registro.createdAt && registro.createdAt.seconds) return new Date(registro.createdAt.seconds * 1000);
    return new Date();
}

// -- EXPORT PDF --
window.exportarPDF = function () {
    if (typeof jspdf === 'undefined') { alert('Librería PDF no cargada'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Data to print
    const dataToPrint = window.currentFilteredVentas || window.ventasDelDia;

    // Title
    doc.setFontSize(18);
    doc.text('Reporte de Ventas - AWA System', 14, 22);

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

    // Summary
    const net = document.getElementById('repNeto') ? document.getElementById('repNeto').textContent : '-';
    doc.text(`Rentabilidad Neta: ${net}`, 14, 45);

    // Table
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

    doc.save(`Reporte_AWA_${Date.now()}.pdf`);
}

// -- CLIENT REPORT GEN (Legacy support) --
window.generarReporteClientes = function (data) {
    const tableBody = document.getElementById('topClientsTable');
    if (!tableBody) return;

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-muted);">Sin datos</td></tr>';
        return;
    }

    const clientStats = {};

    data.forEach(v => {
        if (v.tipo === 'Gasto') return;
        // Group by ID if available, else Name
        const key = v.clienteId || v.clienteNombre || 'Casual';
        const name = v.clienteNombre || (v.clienteId ? 'Cliente ' + v.clienteId : 'Casual');

        if (!clientStats[key]) {
            clientStats[key] = { id: v.clienteId, name: name, count: 0, total: 0 };
        }
        clientStats[key].count += 1;
        clientStats[key].total += (Number(v.total) || 0);
    });

    // Convert to Array and Sort
    const sortedClients = Object.values(clientStats).sort((a, b) => b.total - a.total).slice(0, 10); // Top 10

    if (sortedClients.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-muted);">Sin clientes registrados</td></tr>';
        return;
    }

    tableBody.innerHTML = sortedClients.map(c => {
        // Try to find real client data for Stock Comparison if available globally
        // Assumes window.listaClientes is available
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

// --- HISTORIAL FILTERING ---
window.filtrarHistorial = function () {
    const dateVal = document.getElementById('historyDateFilter') ? document.getElementById('historyDateFilter').value : '';
    const typeVal = document.getElementById('historyTypeFilter') ? document.getElementById('historyTypeFilter').value : '';
    const tbody = document.getElementById('historyTableBody') || document.getElementById('tablaRegistros');

    let filtered = window.allRecentVentas || [];

    // Filter by Date
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

    // Filter by Type
    if (typeVal && typeVal !== 'todos') {
        filtered = filtered.filter(v => (v.tipo || '') === typeVal);
    }

    // Update Table
    if (tbody) {
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="color:#888; font-style:italic; text-align:center; padding:20px;">No se encontraron registros</td></tr>';
        } else {
            if (typeof renderTableRows === 'function') {
                renderTableRows(tbody, filtered);
            } else if (window.renderTableRows) {
                window.renderTableRows(tbody, filtered);
            } else {
                console.warn("renderTableRows not found");
            }
        }
    }
}
