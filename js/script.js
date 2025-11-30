// Store Class
class Store {
    constructor() {
        this.STORAGE_KEY = 'awa_registros_v3';
        this.state = {
            registros: [],
            empleados: {}
        };
        this.load();
    }

    load() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.state.registros = parsed.registros || [];
                this.state.empleados = parsed.empleados || {};
            } catch (e) {
                console.error('Error loading data', e);
                this.state = { registros: [], empleados: {} };
            }
        }
    }

    save() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    }

    addRegistro(registro) {
        const newReg = {
            ...registro,
            id: this.uid(),
            createdAt: Date.now()
        };
        this.state.registros.push(newReg);
        this.save();
        return newReg;
    }

    removeRegistro(id) {
        const idx = this.state.registros.findIndex(r => r.id === id);
        if (idx === -1) return null;

        const item = this.state.registros[idx];

        // If it's a delivery, revert employee count
        if (item.tipo === 'Delivery' && item.detalles) {
            const name = item.detalles;
            if (this.state.empleados[name] && this.state.empleados[name][item.fechaISO]) {
                this.state.empleados[name][item.fechaISO] -= item.cantidad;
                if (this.state.empleados[name][item.fechaISO] <= 0) {
                    delete this.state.empleados[name][item.fechaISO];
                }
            }
        }

        this.state.registros.splice(idx, 1);
        this.save();
        return item;
    }

    addEmpleado(name) {
        if (!name) return false;
        if (this.state.empleados[name]) return false;
        this.state.empleados[name] = {};
        this.save();
        return true;
    }

    removeEmpleado(name) {
        if (this.state.empleados[name]) {
            delete this.state.empleados[name];
            this.save();
            return true;
        }
        return false;
    }

    updateEmpleado(name, date, qty) {
        if (!this.state.empleados[name]) this.state.empleados[name] = {};
        this.state.empleados[name][date] = qty;
        this.save();
    }

    getRegistros(filterText = '', dateFilter = 'all') {
        return this.state.registros.filter(r => {
            if (dateFilter !== 'all' && r.fechaISO !== dateFilter) return false;
            if (!filterText) return true;
            const t = filterText.toLowerCase();
            return (r.tipo || '').toLowerCase().includes(t) ||
                (r.detalles || '').toLowerCase().includes(t);
        }).sort((a, b) => b.createdAt - a.createdAt);
    }

    getStats(date) {
        const regs = this.state.registros.filter(r => r.fechaISO === date);
        return {
            total: regs.reduce((s, r) => s + r.total, 0),
            botellones: regs.reduce((s, r) => s + (r.tipo === 'Gasto' ? 0 : r.cantidad), 0),
            transacciones: regs.length
        };
    }

    getReportData(start, end) {
        const filtered = this.state.registros.filter(r => {
            if (!start && !end) return true;
            if (start && r.fechaISO < start) return false;
            if (end && r.fechaISO > end) return false;
            return true;
        });

        const byDate = {};
        filtered.forEach(r => {
            if (!byDate[r.fechaISO]) byDate[r.fechaISO] = 0;
            byDate[r.fechaISO] += r.total;
        });

        return {
            labels: Object.keys(byDate).sort(),
            values: Object.keys(byDate).sort().map(d => byDate[d]),
            total: filtered.reduce((s, r) => s + r.total, 0),
            ventasCount: filtered.filter(r => r.total > 0).length,
            gastosCount: filtered.filter(r => r.total < 0).length
        };
    }

    clearAll() {
        this.state = { registros: [], empleados: {} };
        this.save();
    }

    uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }
}

// UI Class
class UI {
    constructor(store) {
        this.store = store;
        this.chart = null;
        this.PRECIOS = { local: 25, camion: 30, delivery: 35 };
    }

    init() {
        this.renderDashboard();
        this.renderRepartidores();
        this.renderHistory();
        this.updateDateDisplay();

        // Set default dates
        const today = new Date().toISOString().slice(0, 10);
        document.querySelectorAll('input[type="date"]').forEach(el => {
            if (!el.value) el.value = today;
        });
    }

    updateDateDisplay() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = new Date().toLocaleDateString('es-DO', options);
        const el = document.getElementById('currentDate');
        if (el) el.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    }

    renderDashboard() {
        const today = new Date().toISOString().slice(0, 10);
        const stats = this.store.getStats(today);

        this.animateValue('dashTotal', stats.total, '$');
        this.animateValue('dashBotellones', stats.botellones, '');
        this.animateValue('dashTransacciones', stats.transacciones, '');

        // Recent activity
        const recent = this.store.getRegistros().slice(0, 5);
        const list = document.getElementById('recentActivityList');
        if (list) {
            list.innerHTML = recent.map(r => `
                <div class="activity-item" style="display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid var(--border)">
                    <div>
                        <div style="font-weight:600">${r.tipo}</div>
                        <div style="font-size:12px;color:var(--text-muted)">${r.hora} - ${r.detalles}</div>
                    </div>
                    <div style="font-weight:700;color:${r.total < 0 ? 'var(--warning)' : 'var(--success)'}">
                        ${r.total < 0 ? '-' : '+'}$${Math.abs(r.total).toFixed(2)}
                    </div>
                </div>
            `).join('') || '<div style="padding:12px;color:var(--text-muted)">Sin actividad hoy</div>';
        }
    }

    renderRepartidores() {
        const container = document.getElementById('repartidoresList');
        if (!container) return;

        const today = new Date().toISOString().slice(0, 10);

        container.innerHTML = '';

        const names = Object.keys(this.store.state.empleados).sort();

        names.forEach((name, index) => {
            // Add card
            const qty = this.store.state.empleados[name][today] || 0;
            const div = document.createElement('div');
            div.className = 'emp-card';
            div.innerHTML = `
                <div class="emp-header">
                    <span>${name}</span>
                    <span class="badge" style="background:rgba(99,102,241,0.1);color:var(--primary);padding:2px 8px;border-radius:4px">${qty}</span>
                </div>
                
                <div class="emp-quick-add" style="display:flex;gap:6px;margin:8px 0;">
                    <input type="number" id="qty-emp-${index}" placeholder="Cant." style="padding:6px;font-size:13px;min-width:0">
                    <button class="btn btn-primary btn-sm" onclick="window.app.addDelivery('${name}', 'qty-emp-${index}')">
                        <i class="bi bi-plus-lg"></i>
                    </button>
                </div>

                <div class="emp-actions">
                    <button class="btn btn-sm btn-outline full-width" onclick="window.app.editEmpleado('${name}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline full-width" style="color:var(--danger);border-color:rgba(239,68,68,0.3)" onclick="window.app.deleteEmpleado('${name}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(div);
        });

        if (names.length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:20px">No hay repartidores registrados</div>';
        }
    }

    renderHistory() {
        const searchInput = document.getElementById('searchHistory');
        const dateSelect = document.getElementById('filterHistoryDate');
        const tbody = document.getElementById('historyTableBody');

        if (!searchInput || !dateSelect || !tbody) return;
        const search = searchInput.value;
        const dateFilter = dateSelect.value;

        const data = this.store.getRegistros(search, dateFilter);

        // Calculate totals
        const totalMoney = data.reduce((sum, r) => sum + r.total, 0);
        const totalQty = data.reduce((sum, r) => sum + (r.tipo === 'Gasto' ? 0 : r.cantidad), 0);

        // Update summary
        const summaryEl = document.getElementById('historySummary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <span>Total: $${totalMoney.toFixed(2)}</span>
                <span>Cant: ${totalQty}</span>
            `;
        }

        // Update date filter options
        const currentVal = dateSelect.value;
        const dates = [...new Set(this.store.state.registros.map(r => r.fechaISO))].sort().reverse();

        dateSelect.innerHTML = '<option value="all">Todos los días</option>';
        dates.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            dateSelect.appendChild(opt);
        });
        dateSelect.value = currentVal;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No hay registros</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(r => `
            <tr>
                <td>${r.fechaISO}</td>
                <td>${r.hora}</td>
                <td><span class="badge">${r.tipo}</span></td>
                <td>${r.detalles}</td>
                <td class="text-right">${r.cantidad}</td>
                <td class="text-right" style="color:${r.total < 0 ? 'var(--warning)' : 'var(--text-main)'}">
                    $${r.total.toFixed(2)}
                </td>
                <td class="text-right">
                    <button class="btn-icon danger" style="width:32px;height:32px;margin-left:auto" onclick="window.app.deleteRegistro('${r.id}')">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderChart(start, end) {
        const canvas = document.getElementById('mainChart');
        if (!canvas) return;

        const data = this.store.getReportData(start, end);
        const ctx = canvas.getContext('2d');

        if (this.chart) this.chart.destroy();

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Ventas (RD$)',
                    data: data.values,
                    backgroundColor: 'rgba(99, 102, 241, 0.5)',
                    borderColor: '#6366f1',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#94a3b8' } }
                },
                scales: {
                    y: {
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });

        // Update summary stats
        this.animateValue('reportTotal', data.total, '$');
        const elVentas = document.getElementById('reportVentas');
        const elGastos = document.getElementById('reportGastos');
        if (elVentas) elVentas.textContent = data.ventasCount;
        if (elGastos) elGastos.textContent = data.gastosCount;
    }

    animateValue(id, end, prefix = '') {
        const obj = document.getElementById(id);
        if (!obj) return;
        obj.textContent = prefix + end.toFixed(2);
    }

    showToast(msg, type = 'success') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            background: '#1e293b',
            color: '#fff'
        });
        Toast.fire({
            icon: type,
            title: msg
        });
    }
}

// App Class
class App {
    constructor() {
        this.store = new Store();
        this.ui = new UI(this.store);

        // Expose for inline onclicks
        window.app = this;

        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.ui.init();
        this.setupEventListeners();
        this.ui.renderChart(); // Initial chart
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;

                // Active state
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // Show view
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                const view = document.getElementById(`view-${tab}`);
                if (view) view.classList.add('active');

                // Update title
                const title = document.getElementById('pageTitle');
                if (title) title.textContent = e.currentTarget.textContent.trim();

                // Refresh specific views
                if (tab === 'reportes') this.ui.renderChart();
            });
        });

        // Helper to safely add listener
        const on = (id, event, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, handler);
        };

        // Sales Actions
        on('btnLocal', 'click', () => this.addVenta('local'));
        on('btnCamion', 'click', () => this.addVenta('camion'));
        on('btnOtro', 'click', () => this.addOtro());

        // Expenses
        on('btnGasto', 'click', () => this.addGasto());

        // Repartidores
        on('btnAddRepartidor', 'click', () => this.addRepartidor());

        // Filters
        on('searchHistory', 'input', () => this.ui.renderHistory());
        on('filterHistoryDate', 'change', () => this.ui.renderHistory());

        on('btnFilterReport', 'click', () => {
            const start = document.getElementById('reportStart').value;
            const end = document.getElementById('reportEnd').value;
            this.ui.renderChart(start, end);
        });

        on('btnResetReport', 'click', () => {
            document.getElementById('reportStart').value = '';
            document.getElementById('reportEnd').value = '';
            this.ui.renderChart();
        });

        // Global Actions
        on('exportCsv', 'click', () => this.exportCsv());
        on('clearAll', 'click', () => this.clearAll());
        on('exportCsvMobile', 'click', () => this.exportCsv());
        on('clearAllMobile', 'click', () => this.clearAll());
    }

    // --- Actions ---

    addVenta(type) {
        const isLocal = type === 'local';
        const inputId = isLocal ? 'qtyLocal' : 'qtyCamion';
        const price = isLocal ? this.ui.PRECIOS.local : this.ui.PRECIOS.camion;
        const label = isLocal ? 'Venta Local' : 'Camión';

        const qtyInput = document.getElementById(inputId);
        const qty = parseInt(qtyInput.value) || 0;
        const date = document.getElementById('saleDate').value || new Date().toISOString().slice(0, 10);

        if (qty <= 0) return this.ui.showToast('Cantidad inválida', 'error');

        let detalles = label;
        if (!isLocal) {
            const commentInput = document.getElementById('commentCamion');
            if (commentInput) {
                if (commentInput.value.trim()) {
                    detalles += ` (${commentInput.value.trim()})`;
                }
                commentInput.value = '';
            }
        }

        this.store.addRegistro({
            fechaISO: date,
            hora: new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
            tipo: label,
            detalles: detalles,
            cantidad: qty,
            precioUnitario: price,
            total: qty * price
        });

        qtyInput.value = '';
        this.refreshAll();
        this.ui.showToast('Venta registrada');
    }

    addOtro() {
        const desc = document.getElementById('descOtro').value.trim();
        const price = parseFloat(document.getElementById('priceOtro').value) || 0;
        const qty = parseInt(document.getElementById('qtyOtro').value) || 0;
        const date = document.getElementById('saleDate').value || new Date().toISOString().slice(0, 10);

        if (!desc || price <= 0 || qty <= 0) return this.ui.showToast('Complete los campos', 'error');

        this.store.addRegistro({
            fechaISO: date,
            hora: new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
            tipo: 'Otro Servicio',
            detalles: desc,
            cantidad: qty,
            precioUnitario: price,
            total: qty * price
        });

        document.getElementById('descOtro').value = '';
        document.getElementById('priceOtro').value = '';
        document.getElementById('qtyOtro').value = '';
        this.refreshAll();
        this.ui.showToast('Servicio registrado');
    }

    addDelivery(targetName = null, inputId = null) {
        let name, qty, qtyInput;

        if (targetName && inputId) {
            name = targetName;
            qtyInput = document.getElementById(inputId);
            qty = parseInt(qtyInput.value) || 0;
        } else {
            name = document.getElementById('selRepartidor').value;
            qtyInput = document.getElementById('qtyDelivery');
            qty = parseInt(qtyInput.value) || 0;
        }

        const date = document.getElementById('saleDate').value || new Date().toISOString().slice(0, 10);

        if (!name) return this.ui.showToast('Seleccione un repartidor', 'error');
        if (qty <= 0) return this.ui.showToast('Cantidad inválida', 'error');

        this.store.addRegistro({
            fechaISO: date,
            hora: new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
            tipo: 'Delivery',
            detalles: name,
            cantidad: qty,
            precioUnitario: this.ui.PRECIOS.delivery,
            total: qty * this.ui.PRECIOS.delivery
        });

        this.store.updateEmpleado(name, date, (this.store.state.empleados[name][date] || 0) + qty);

        if (qtyInput) qtyInput.value = '';
        this.refreshAll();
        this.ui.showToast(`Delivery registrado: ${name}`);
    }

    addGasto() {
        const montoInput = document.getElementById('gastoMonto');
        const descInput = document.getElementById('gastoDesc');
        const monto = parseFloat(montoInput.value) || 0;
        const desc = descInput.value.trim();
        const date = new Date().toISOString().slice(0, 10);

        if (monto <= 0 || !desc) return this.ui.showToast('Datos incompletos', 'error');

        this.store.addRegistro({
            fechaISO: date,
            hora: new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
            tipo: 'Gasto',
            detalles: desc,
            cantidad: 1,
            precioUnitario: -monto,
            total: -monto
        });

        montoInput.value = '';
        descInput.value = '';
        this.refreshAll();
        this.ui.showToast('Gasto registrado', 'warning');
    }

    async addRepartidor() {
        const { value: nombre } = await Swal.fire({
            title: 'Nuevo Repartidor',
            input: 'text',
            inputLabel: 'Nombre',
            background: '#1e293b',
            color: '#fff',
            confirmButtonColor: '#6366f1',
            showCancelButton: true
        });

        if (nombre && nombre.trim()) {
            if (this.store.addEmpleado(nombre.trim())) {
                this.ui.renderRepartidores();
                this.ui.showToast('Repartidor agregado');
            } else {
                this.ui.showToast('El repartidor ya existe', 'error');
            }
        }
    }

    async editEmpleado(name) {
        const today = new Date().toISOString().slice(0, 10);
        const current = (this.store.state.empleados[name] && this.store.state.empleados[name][today]) || 0;

        const { value: nuevo } = await Swal.fire({
            title: `Editar: ${name}`,
            text: 'Cantidad de botellones hoy',
            input: 'number',
            inputValue: current,
            background: '#1e293b',
            color: '#fff',
            confirmButtonColor: '#6366f1',
            showCancelButton: true
        });

        if (nuevo !== null) {
            const n = parseInt(nuevo);
            if (!isNaN(n)) {
                this.store.updateEmpleado(name, today, n);
                this.ui.renderRepartidores();
                this.ui.showToast('Actualizado');
            }
        }
    }

    deleteEmpleado(name) {
        Swal.fire({
            title: '¿Eliminar Repartidor?',
            text: `Se eliminará a ${name} de la lista.`,
            icon: 'warning',
            showCancelButton: true,
            background: '#1e293b',
            color: '#fff',
            confirmButtonColor: '#ef4444'
        }).then(res => {
            if (res.isConfirmed) {
                this.store.removeEmpleado(name);
                this.ui.renderRepartidores();
                this.ui.showToast('Eliminado');
            }
        });
    }

    deleteRegistro(id) {
        Swal.fire({
            title: '¿Eliminar registro?',
            text: "No podrás revertir esto",
            icon: 'warning',
            showCancelButton: true,
            background: '#1e293b',
            color: '#fff',
            confirmButtonColor: '#ef4444'
        }).then((result) => {
            if (result.isConfirmed) {
                this.store.removeRegistro(id);
                this.refreshAll();
                this.ui.showToast('Registro eliminado');
            }
        });
    }

    exportCsv() {
        const regs = this.store.state.registros;
        if (regs.length === 0) return this.ui.showToast('No hay datos', 'error');

        const header = ['fecha', 'hora', 'tipo', 'detalles', 'cantidad', 'precioUnitario', 'total'];
        const rows = regs.map(r => [
            r.fechaISO, r.hora, r.tipo, `"${r.detalles.replace(/"/g, '""')}"`, r.cantidad, r.precioUnitario, r.total.toFixed(2)
        ]);

        const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `awa_export_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    clearAll() {
        Swal.fire({
            title: '¿Estás seguro?',
            text: "Se borrarán todos los registros y empleados. No podrás revertir esto.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, borrar todo'
        }).then((result) => {
            if (result.isConfirmed) {
                this.store.clearAll();
                this.refreshAll();
                this.ui.showToast('Sistema reiniciado', 'success');
            }
        });
    }

    backupData() {
        const data = JSON.stringify(this.store.state, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `awa_backup_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.ui.showToast('Copia de seguridad descargada');
    }

    restoreData(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Basic validation
                if (!data.registros || !data.empleados) {
                    throw new Error('Formato de archivo inválido');
                }

                Swal.fire({
                    title: '¿Restaurar datos?',
                    text: "Esto reemplazará todos los datos actuales con los del archivo.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, restaurar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        this.store.state = data;
                        this.store.save();
                        this.refreshAll();
                        this.ui.showToast('Datos restaurados correctamente', 'success');
                        setTimeout(() => location.reload(), 1500);
                    }
                });
            } catch (err) {
                this.ui.showToast('Error al leer el archivo: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
        input.value = ''; // Reset input
    }

    refreshAll() {
        this.ui.renderDashboard();
        this.ui.renderHistory();
        this.ui.renderRepartidores();
        // If on reports tab, update chart
        const reportView = document.getElementById('view-reportes');
        if (reportView && reportView.classList.contains('active')) {
            this.ui.renderChart();
        }
    }
}

// Start app
new App();
