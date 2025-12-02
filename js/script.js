import { db } from './firebase-config.js';
import { AuthManager } from './auth.js';
import { collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- STATE MANAGEMENT (Firestore) ---
class Store {
    constructor() {
        this.state = {
            registros: [],
            empleados: [],
            gastos: []
        };
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(l => l(this.state));
    }

    // Real-time listeners
    initRealtimeUpdates() {
        // Ventas
        const qVentas = query(collection(db, "ventas"), orderBy("fecha", "desc"));
        onSnapshot(qVentas, (snapshot) => {
            this.state.registros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.notify();
        });

        // Gastos
        const qGastos = query(collection(db, "gastos"), orderBy("fecha", "desc"));
        onSnapshot(qGastos, (snapshot) => {
            this.state.gastos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.notify();
        });

        // Empleados (Repartidores)
        const qEmpleados = query(collection(db, "empleados"));
        onSnapshot(qEmpleados, (snapshot) => {
            this.state.empleados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.notify();
        });
    }

    async addVenta(venta) {
        try {
            await addDoc(collection(db, "ventas"), venta);
            return true;
        } catch (e) {
            console.error("Error adding venta: ", e);
            return false;
        }
    }

    async addGasto(gasto) {
        console.log("Store: Adding gasto to Firestore...", gasto);
        try {
            const docRef = await addDoc(collection(db, "gastos"), gasto);
            console.log("Store: Gasto added with ID: ", docRef.id);
            return true;
        } catch (e) {
            console.error("Store: Error adding gasto: ", e);
            return false;
        }
    }

    async addEmpleado(nombre) {
        try {
            await addDoc(collection(db, "empleados"), { nombre, activo: true, carga: 0 });
            return true;
        } catch (e) {
            console.error("Error adding empleado: ", e);
            return false;
        }
    }

    async updateEmpleado(id, data) {
        try {
            const docRef = doc(db, "empleados", id);
            await updateDoc(docRef, data);
            return true;
        } catch (e) {
            console.error("Error updating empleado: ", e);
            return false;
        }
    }

    async deleteRegistro(id, collectionName = "ventas") {
        try {
            await deleteDoc(doc(db, collectionName, id));
            return true;
        } catch (e) {
            console.error("Error deleting document: ", e);
            return false;
        }
    }

    getReportData(start, end) {
        // Ensure we have records
        if (!this.state.registros || this.state.registros.length === 0) return [];

        const filtered = this.state.registros.filter(r => {
            if (!r.fecha) return false;
            const rDate = r.fecha.split('T')[0]; // Extract YYYY-MM-DD

            if (start && rDate < start) return false;
            if (end && rDate > end) return false;

            return true;
        });

        // Map to standard format for reports
        return [
            ...filtered.map(r => ({ ...r, type: 'venta', total: parseFloat(r.total) || 0 })),
            ...this.state.gastos.filter(g => {
                if (!g.fecha) return false;
                const gDate = g.fecha.split('T')[0];
                if (start && gDate < start) return false;
                if (end && gDate > end) return false;
                return true;
            }).map(g => ({ ...g, type: 'gasto', monto: parseFloat(g.monto) || 0 }))
        ];
    }
}


// --- UI HANDLER ---
class UI {
    constructor() {
        this.elements = {
            // Views
            views: document.querySelectorAll('.view'),
            navBtns: document.querySelectorAll('.nav-btn'),

            // Dashboard
            dashTotal: document.getElementById('dashTotal'),
            dashBotellones: document.getElementById('dashBotellones'),
            dashTransacciones: document.getElementById('dashTransacciones'),
            recentActivityList: document.getElementById('recentActivityList'),

            // Lists
            repartidoresList: document.getElementById('repartidoresList'),
            historyTableBody: document.getElementById('historyTableBody'),
            topRepartidores: document.getElementById('topRepartidores'),

            // Reports
            reportTotal: document.getElementById('reportTotal'),
            reportVentas: document.getElementById('reportVentas'),
            reportGastos: document.getElementById('reportGastos'),

            // Inputs
            dateDisplay: document.getElementById('currentDate'),

            // Login
            loginView: document.getElementById('view-login'),
            appContent: document.getElementById('app-content'),
            sidebar: document.querySelector('.sidebar')
        };
        this.chart = null;
    }

    showView(viewId) {
        this.elements.views.forEach(el => el.classList.remove('active'));
        this.elements.navBtns.forEach(el => el.classList.remove('active'));

        const targetView = document.getElementById(`view-${viewId}`);
        const targetBtn = document.querySelector(`.nav-btn[data-tab="${viewId}"]`);

        if (targetView) targetView.classList.add('active');
        if (targetBtn) targetBtn.classList.add('active');
    }

    updateDashboard(stats, recent) {
        if (!this.elements.dashTotal) return;

        this.elements.dashTotal.textContent = this.formatCurrency(stats.dinero);
        this.elements.dashBotellones.textContent = stats.botellones;
        this.elements.dashTransacciones.textContent = stats.transacciones;

        this.elements.recentActivityList.innerHTML = recent.map(r => {
            const isGasto = r.type === 'gasto';
            const color = isGasto ? 'var(--danger)' : 'var(--success)';
            const sign = isGasto ? '-' : '+';
            const amount = isGasto ? this.formatCurrency(Math.abs(r.total)) : `+${r.cantidad}`;

            return `
            <div class="activity-item" style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
                <div>
                    <div style="font-weight:600">${r.detalle}</div>
                    <div style="font-size:12px;color:var(--text-muted)">${new Date(r.fecha).toLocaleTimeString()}</div>
                </div>
                <div class="text-right">
                    <div style="font-weight:700;color:${color}">${amount}</div>
                    ${!isGasto ? `<div style="font-size:12px;color:var(--text-muted)">${this.formatCurrency(r.total)}</div>` : ''}
                </div>
            </div>
            `;
        }).join('');
    }

    renderRepartidores(empleados, onAdd) {
        this.elements.repartidoresList.innerHTML = empleados.map(emp => `
            <div class="emp-card">
                <div class="emp-header">
                    <span>${emp.nombre}</span>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <input type="text" 
                               value="${emp.totalEntregado || 0}" 
                               readonly
                               class="form-control" 
                               style="width: 60px; padding: 2px 6px; font-size: 12px; height: 24px; text-align: center; background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--primary); font-weight: bold;"
                               title="Total Entregado">
                        <button class="btn-icon danger small" onclick="window.app.deleteRepartidor('${emp.id}')" style="padding:0;width:24px;height:24px;min-width:auto;">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>
                <div class="emp-actions">
                    <input type="number" id="qty-${emp.id}" placeholder="Cant." class="form-control" style="width: 70px; padding: 4px 8px; font-size: 13px;">
                    <button class="btn btn-sm btn-primary" onclick="window.app.addDelivery('${emp.id}', '${emp.nombre}')">
                        <i class="bi bi-plus-lg"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderHistory(registros, onDelete) {
        this.elements.historyTableBody.innerHTML = registros.map(r => {
            const isGasto = r.type === 'gasto';
            const unitPrice = !isGasto && r.cantidad > 0 ? r.total / r.cantidad : 0;
            const rowClass = isGasto ? 'style="background:rgba(239,68,68,0.05)"' : '';
            const badgeClass = isGasto ? 'danger' : r.tipo;
            const badgeText = isGasto ? 'GASTO' : r.tipo;
            const totalColor = isGasto ? 'color:var(--danger)' : 'color:var(--success)';
            const collection = isGasto ? 'gastos' : 'ventas';

            return `
            <tr ${rowClass}>
                <td>${new Date(r.fecha).toLocaleDateString()}</td>
                <td>${new Date(r.fecha).toLocaleTimeString()}</td>
                <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                <td>${r.detalle}</td>
                <td class="text-right">${isGasto ? '-' : r.cantidad}</td>
                <td class="text-right">${isGasto ? '-' : this.formatCurrency(unitPrice)}</td>
                <td class="text-right" style="${totalColor}">${this.formatCurrency(r.total)}</td>
                <td>
                    <button class="btn btn-sm btn-outline danger" onclick="window.app.deleteRegistro('${r.id}', '${collection}')" style="border-color:var(--danger);color:var(--danger)">
                        <i class="bi bi-trash"></i> Borrar
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    }

    showToast(title, icon = 'success') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            background: '#1e293b',
            color: '#fff'
        });
        Toast.fire({ icon, title });
    }

    formatCurrency(amount) {
        const val = parseFloat(amount);
        if (isNaN(val)) return 'RD$ 0.00';
        return 'RD$ ' + val.toFixed(2);
    }

    toggleLogin(show) {
        if (show) {
            this.elements.loginView.style.display = 'flex';
            this.elements.appContent.style.display = 'none';
        } else {
            this.elements.loginView.style.display = 'none';
            this.elements.appContent.style.display = 'flex';
        }
    }

    applyRole(role) {
        const allTabs = ['dashboard', 'planta', 'camion', 'gastos', 'reportes', 'historial'];
        let allowedTabs = [];

        if (role === 'admin') {
            allowedTabs = allTabs;
        } else if (role === 'planta') {
            allowedTabs = ['planta', 'gastos', 'historial'];
        } else if (role === 'camion') {
            allowedTabs = ['camion', 'gastos'];
        }

        // Hide/Show Sidebar Tabs
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const tab = btn.dataset.tab;
            if (allowedTabs.includes(tab)) {
                btn.style.display = 'flex';
            } else {
                btn.style.display = 'none';
            }
        });
    }

    renderReports(start = null, end = null) {
        // 1. Get Data
        const data = window.app.store.getReportData(start, end);
        const sales = data.filter(r => r.type === 'venta');
        const expenses = data.filter(r => r.type === 'gasto');

        // 2. Financial Summary
        const totalSales = sales.reduce((sum, r) => sum + (r.total || 0), 0);
        const totalExpenses = expenses.reduce((sum, r) => sum + (r.monto || 0), 0);
        const netProfit = totalSales - totalExpenses;
        const margin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0;

        document.getElementById('reportNetProfit').textContent = this.formatCurrency(netProfit);
        document.getElementById('reportNetProfit').style.color = netProfit >= 0 ? '#10b981' : '#ef4444';
        document.getElementById('reportMargin').textContent = `${margin}%`;

        // 3. Sales Breakdown (Pie Chart)
        const ctxPie = document.getElementById('salesPieChart');
        if (ctxPie) {
            const byType = { 'local': 0, 'camion': 0, 'delivery': 0 };
            sales.forEach(r => {
                if (byType[r.tipo] !== undefined) byType[r.tipo] += (r.total || 0);
            });

            if (this.pieChart) this.pieChart.destroy();
            this.pieChart = new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels: ['Local', 'Camión', 'Delivery'],
                    datasets: [{
                        data: [byType.local, byType.camion, byType.delivery],
                        backgroundColor: ['#00c2ff', '#7c3aed', '#10b981'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } }
                }
            });
        }

        // 4. Weekly Trend (Line Chart) - Simplified to Daily for selected range
        const ctxTrend = document.getElementById('trendChart');
        if (ctxTrend) {
            const byDate = {};
            sales.forEach(r => {
                const date = r.fecha.split('T')[0];
                byDate[date] = (byDate[date] || 0) + (r.total || 0);
            });

            const sortedDates = Object.keys(byDate).sort();

            if (this.trendChart) this.trendChart.destroy();
            this.trendChart = new Chart(ctxTrend, {
                type: 'line',
                data: {
                    labels: sortedDates,
                    datasets: [{
                        label: 'Ventas',
                        data: sortedDates.map(d => byDate[d]),
                        borderColor: '#00c2ff',
                        tension: 0.4,
                        fill: true,
                        backgroundColor: 'rgba(0, 194, 255, 0.1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // 5. Employee Ranking
        const rankingTable = document.getElementById('employeeRankingTable');
        if (rankingTable) {
            const empStats = {};
            sales.forEach(r => {
                if (r.repartidorId) { // Only count deliveries assigned to someone
                    if (!empStats[r.repartidorId]) empStats[r.repartidorId] = { name: r.repartidorNombre || 'Unknown', qty: 0, total: 0 };
                    empStats[r.repartidorId].qty += (parseInt(r.cantidad) || 0);
                    empStats[r.repartidorId].total += (r.total || 0);
                }
            });

            // Also include Camion sales if we want to track "Camion" as a pseudo-employee, or track helper?
            // For now, let's stick to registered Repartidores (Delivery)

            const sortedEmps = Object.values(empStats).sort((a, b) => b.qty - a.qty);

            rankingTable.innerHTML = sortedEmps.map((emp, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${emp.name}</td>
                    <td>${emp.qty}</td>
                    <td>${this.formatCurrency(emp.total)}</td>
                </tr>
            `).join('') || '<tr><td colspan="4" class="text-center">No hay datos</td></tr>';
        }
    }
}

// --- APP CONTROLLER ---
class App {
    constructor() {
        this.store = new Store();
        this.ui = new UI();
        this.auth = new AuthManager(this);

        // Expose app to window for inline onclicks
        window.app = this;

        this.setupEventListeners();
        this.updateDate();
    }

    onLogin(role) {
        this.ui.toggleLogin(false);
        this.ui.applyRole(role);
        this.store.initRealtimeUpdates();
        this.store.subscribe((state) => this.refreshUI(state));

        let defaultView = 'dashboard';
        if (role === 'planta') defaultView = 'planta';
        if (role === 'camion') defaultView = 'camion';

        this.ui.showView(defaultView);
    }

    onLogout() {
        this.ui.toggleLogin(true);
    }

    setupEventListeners() {
        // Navigation
        this.ui.elements.navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.ui.showView(tab);
            });
        });

        // Login Form
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Login submitted");
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cargando...';

            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPass').value;

            try {
                const res = await this.auth.login(email, pass);
                console.log("Login result:", res);

                if (!res.success) {
                    let msg = 'Error al iniciar sesión';
                    if (res.message.includes('invalid-credential') || res.message.includes('wrong-password')) {
                        msg = 'Correo o contraseña incorrectos';
                    } else if (res.message.includes('user-not-found')) {
                        msg = 'Usuario no encontrado';
                    } else if (res.message.includes('too-many-requests')) {
                        msg = 'Demasiados intentos. Espera unos minutos';
                    } else if (res.message.includes('network-request-failed')) {
                        msg = 'Error de conexión. Verifica tu internet';
                    }
                    this.ui.showToast(msg, 'error');
                    btn.disabled = false;
                    btn.textContent = originalText;
                }
                // If success, onAuthStateChanged in auth.js will trigger app.onLogin
                // We leave the button disabled to prevent double submit while redirecting
            } catch (err) {
                console.error("Login error:", err);
                this.ui.showToast('Error inesperado: ' + err.message, 'error');
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });

        document.getElementById('btnLogout').addEventListener('click', () => {
            this.auth.logout();
        });

        // Header Actions
        const safeAdd = (id, fn) => {
            const el = document.getElementById(id);
            if (el) {
                // Mobile Logout
                const btnMobileLogout = document.getElementById('btnMobileLogout');
                if (btnMobileLogout) {
                    btnMobileLogout.addEventListener('click', () => {
                        Swal.fire({
                            title: '¿Cerrar sesión?',
                            text: "Tendrás que ingresar tus credenciales nuevamente.",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#ef4444',
                            cancelButtonColor: '#334155',
                            confirmButtonText: 'Sí, salir',
                            cancelButtonText: 'Cancelar',
                            background: '#1e293b',
                            color: '#fff'
                        }).then((result) => {
                            if (result.isConfirmed) {
                                this.auth.logout(); // Changed window.auth.logout() to this.auth.logout()
                            }
                        });
                    });
                }

                // Add Venta Listeners
                el.addEventListener('click', fn);
                console.log(`Listener attached to ${id}`);
            } else {
                console.warn(`Element ${id} not found for listener`);
            }
        };

        safeAdd('exportCsvMobile', () => this.exportToCSV());
        safeAdd('clearAllMobile', () => this.clearAllData());

        // Data Menu
        safeAdd('btnDataMenu', async () => {
            const { isConfirmed, isDenied } = await Swal.fire({
                title: 'Gestión de Datos',
                text: 'Elige una opción para tus datos',
                icon: 'question',
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: '<i class="bi bi-cloud-download-fill"></i> Descargar Copia',
                denyButtonText: '<i class="bi bi-cloud-upload-fill"></i> Restaurar Datos',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: 'var(--primary)',
                denyButtonColor: 'var(--warning)'
            });

            if (isConfirmed) {
                this.exportData();
            } else if (isDenied) {
                document.getElementById('restoreFileHeader').click();
            }
        });

        // Quick Actions
        safeAdd('btnLocal', () => this.addVenta('local'));
        safeAdd('btnCamion', () => this.addVenta('camion'));
        safeAdd('btnOtro', () => this.addVenta('otro'));

        // Gastos
        safeAdd('btnGasto', () => this.addGasto());

        // Repartidor
        safeAdd('btnAddRepartidor', () => this.addRepartidor());

        // Reports
        document.getElementById('btnFilterReport').addEventListener('click', () => {
            const start = document.getElementById('reportStart').value;
            const end = document.getElementById('reportEnd').value;
            this.ui.renderReports(start, end);
        });

        document.getElementById('btnResetReport').addEventListener('click', () => {
            const today = new Date().toISOString().slice(0, 10);
            document.getElementById('reportStart').value = today;
            document.getElementById('reportEnd').value = today;
            this.ui.renderReports(today, today);
        });

        // Initialize reports with today's date
        const today = new Date().toISOString().slice(0, 10);
        const startInput = document.getElementById('reportStart');
        const endInput = document.getElementById('reportEnd');
        if (startInput && endInput) {
            startInput.value = today;
            endInput.value = today;
        }

        // Swipe Navigation
        let touchStartX = 0;
        let touchEndX = 0;

        document.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        document.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        // Prevent swipe when scrolling table
        const tableContainer = document.querySelector('.table-responsive');
        if (tableContainer) {
            tableContainer.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
            tableContainer.addEventListener('touchend', e => e.stopPropagation(), { passive: true });
        }

        const handleSwipe = () => {
            const SWIPE_THRESHOLD = 50;
            if (touchEndX < touchStartX - SWIPE_THRESHOLD) {
                // Swipe Left (Next Tab)
                this.navigateTabs(1);
            }
            if (touchEndX > touchStartX + SWIPE_THRESHOLD) {
                // Swipe Right (Prev Tab)
                this.navigateTabs(-1);
            }
        };
    }

    navigateTabs(direction) {
        // Get all visible tabs
        const visibleTabs = Array.from(this.ui.elements.navBtns)
            .filter(btn => btn.style.display !== 'none')
            .map(btn => btn.dataset.tab);

        // Find current active tab
        const currentTab = document.querySelector('.view.active').id.replace('view-', '');
        const currentIndex = visibleTabs.indexOf(currentTab);

        if (currentIndex === -1) return;

        let nextIndex = currentIndex + direction;

        // Bounds check
        if (nextIndex >= 0 && nextIndex < visibleTabs.length) {
            this.ui.showView(visibleTabs[nextIndex]);
        }
    }

    refreshUI(state) {
        // Ensure arrays exist
        const registros = state.registros || [];
        const gastos = state.gastos || [];
        const empleados = state.empleados || [];

        // Combine and sort records
        const allRecords = [
            ...registros.map(r => ({ ...r, type: 'venta', total: parseFloat(r.total) || 0 })),
            ...gastos.map(g => ({ ...g, type: 'gasto', total: -(parseFloat(g.monto) || 0), detalle: g.descripcion, cantidad: 0 }))
        ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        // Filter for History (Default: All)
        const historyFilter = document.getElementById('filterHistoryDate').value;
        let historyRecords = allRecords;

        if (historyFilter !== 'all') {
            // If we had specific date logic, it would go here. 
            // For now 'all' is the only option in the dropdown, but we ensure it shows everything.
        }

        this.ui.renderHistory(historyRecords);

        // Filter for TODAY only (Daily Reset)
        const today = new Date().toISOString().slice(0, 10);
        // Use string comparison for date filtering to be safe
        const todaysRecords = allRecords.filter(r => r.fecha && r.fecha.startsWith(today));

        // Update Dashboard with TODAY'S data
        const stats = {
            botellones: todaysRecords.filter(r => r.type === 'venta').reduce((acc, curr) => acc + (parseInt(curr.cantidad) || 0), 0),
            transacciones: todaysRecords.length,
            dinero: todaysRecords.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0)
        };

        this.ui.updateDashboard(stats, todaysRecords.slice(0, 5));

        // Calculate totals for repartidores (TODAY only)
        console.log("Calculating daily totals...");
        const repartidoresWithTotal = state.empleados.map(emp => {
            const empSales = todaysRecords.filter(r => r.repartidorId === emp.id);
            const total = empSales.reduce((sum, r) => sum + (parseInt(r.cantidad) || 0), 0);
            return { ...emp, totalEntregado: total };
        });

        this.ui.renderRepartidores(repartidoresWithTotal);

        // Render History (Show ALL records for reference, or change to todaysRecords if preferred)
        // User asked for "reset", but "registered by day". Keeping history full is safer for "registered".
        this.ui.renderHistory(allRecords);

        // Calculate Total Camion (TODAY only)
        const totalCamion = todaysRecords
            .filter(r => r.type === 'venta' && r.tipo === 'camion')
            .reduce((sum, r) => sum + (parseInt(r.cantidad) || 0), 0);

        const totalCamionInput = document.getElementById('totalCamion');
        if (totalCamionInput) {
            totalCamionInput.value = totalCamion;
        }

        // Update chart if on reports view
        if (document.querySelector('.nav-btn[data-tab="reportes"]').classList.contains('active')) {
            this.ui.renderReports();
        }
    }

    async addVenta(type) {
        const dateInput = document.getElementById('saleDate');
        const date = dateInput ? dateInput.value : new Date().toISOString();

        let venta = {
            fecha: date || new Date().toISOString(),
            tipo: type,
            usuario: this.auth.currentUser.email
        };

        if (type === 'local') {
            const qty = parseInt(document.getElementById('qtyLocal').value) || 1;
            const price = parseInt(document.getElementById('priceLocal').textContent);
            venta = { ...venta, cantidad: qty, total: qty * price, detalle: 'Venta Local' };
            document.getElementById('qtyLocal').value = '';
        } else if (type === 'camion') {
            const qty = parseInt(document.getElementById('qtyCamion').value) || 1;
            const price = parseInt(document.getElementById('priceCamion').textContent);
            const comment = document.getElementById('commentCamion').value;

            const isSolo = document.getElementById('modeSolo').checked;
            const isAyudante = document.getElementById('modeAyudante').checked;

            if (!isSolo && !isAyudante) {
                return this.ui.showToast('Selecciona: Solo o Ayudante', 'warning');
            }

            const detailBase = isAyudante ? 'Venta Camión (Con Ayudante)' : 'Venta Camión (Solo)';

            venta = {
                ...venta,
                cantidad: qty,
                total: qty * price,
                detalle: `${detailBase} ${comment ? '- ' + comment : ''}`
            };
            document.getElementById('qtyCamion').value = '';
            document.getElementById('commentCamion').value = '';

            // Reset selection to force choice next time
            document.getElementById('modeSolo').checked = false;
            document.getElementById('modeAyudante').checked = false;
        } else if (type === 'otro') {
            const desc = document.getElementById('descOtro').value;
            const price = parseFloat(document.getElementById('priceOtro').value) || 0;
            const qty = parseInt(document.getElementById('qtyOtro').value) || 1;
            if (!desc) return this.ui.showToast('Falta descripción', 'warning');
            venta = { ...venta, cantidad: qty, total: qty * price, detalle: desc };
            // Clear inputs...
        }

        if (await this.store.addVenta(venta)) {
            this.ui.showToast('Venta registrada');
        }
    }

    async addDelivery(empId, empName) {
        const qtyInput = document.getElementById(`qty-${empId}`);
        const qty = parseInt(qtyInput.value);

        if (!qty || qty <= 0) {
            return this.ui.showToast('Ingresa una cantidad válida', 'warning');
        }

        // Assuming fixed price for delivery for now, or fetch from config
        const price = 25;
        const venta = {
            fecha: new Date().toISOString(),
            tipo: 'delivery',
            cantidad: qty,
            total: qty * price,
            detalle: `Delivery: ${empName}`,
            repartidorId: empId,
            usuario: this.auth.currentUser.email
        };

        if (await this.store.addVenta(venta)) {
            this.ui.showToast('Delivery registrado');
            qtyInput.value = '';
        }
    }

    async addGasto() {
        console.log("Attempting to add gasto...");
        const montoInput = document.getElementById('gastoMonto');
        const descInput = document.getElementById('gastoDesc');

        if (!montoInput || !descInput) {
            console.error("Gasto inputs not found!", montoInput, descInput);
            return;
        }

        const monto = parseFloat(montoInput.value);
        const desc = descInput.value;

        console.log("Values:", { monto, desc });

        if (!monto || !desc) return this.ui.showToast('Completa los campos', 'warning');

        // Infer origin from role
        const role = this.auth.userRole;
        const origen = role === 'camion' ? 'Ruta' : 'Planta';

        const gasto = {
            fecha: new Date().toISOString(),
            monto,
            descripcion: desc,
            origen: origen,
            usuario: this.auth.currentUser.email
        };

        if (await this.store.addGasto(gasto)) {
            this.ui.showToast('Gasto guardado');
            montoInput.value = '';
            descInput.value = '';
        }
    }

    async addRepartidor() {
        const { value: nombre } = await Swal.fire({
            title: 'Nuevo Repartidor',
            input: 'text',
            inputLabel: 'Nombre',
            showCancelButton: true
        });

        if (nombre) {
            this.store.addEmpleado(nombre);
        }
    }

    async deleteRepartidor(id) {
        if (confirm('¿Estás seguro de eliminar este repartidor?')) {
            if (await this.store.deleteRegistro(id, 'empleados')) {
                this.ui.showToast('Repartidor eliminado');
            }
        }
    }

    async updateRepartidorCarga(id, value) {
        const carga = parseInt(value) || 0;
        await this.store.updateEmpleado(id, { carga });
        // Toast is optional here to avoid spam, but good for feedback
        // this.ui.showToast('Carga actualizada'); 
    }

    async deleteRegistro(id) {
        const result = await Swal.fire({
            title: '¿Borrar?',
            text: "No se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, borrar'
        });

        if (result.isConfirmed) {
            await this.store.deleteRegistro(id);
            this.ui.showToast('Eliminado', 'info');
        }
    }

    updateDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        this.ui.elements.dateDisplay.textContent = now.toLocaleDateString('es-ES', options);
    }

    exportToCSV() {
        const rows = [
            ['Fecha', 'Tipo', 'Detalle', 'Cantidad', 'Total', 'Usuario'],
            ...this.store.state.registros.map(r => [
                r.fecha, r.tipo, r.detalle, r.cantidad, r.total, r.usuario
            ]),
            ...this.store.state.gastos.map(g => [
                g.fecha, 'Gasto', g.descripcion, 0, -g.monto, g.usuario
            ])
        ];

        const csvContent = "data:text/csv;charset=utf-8,"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "reporte_ventas_awa.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    exportData() {
        const data = {
            ventas: this.store.state.registros,
            gastos: this.store.state.gastos,
            empleados: this.store.state.empleados,
            timestamp: new Date().toISOString()
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "backup_awa_" + new Date().toISOString().slice(0, 10) + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    async restoreData(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Confirm before restoring
                const { isConfirmed } = await Swal.fire({
                    title: '¿Restaurar Datos?',
                    text: `Se importarán ${data.ventas?.length || 0} ventas, ${data.gastos?.length || 0} gastos y ${data.empleados?.length || 0} empleados. Esto se agregará a lo existente.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, restaurar'
                });

                if (isConfirmed) {
                    // Batch add (one by one for now as Firestore batch has limits and we are client side)
                    let count = 0;
                    if (data.ventas) {
                        for (const v of data.ventas) {
                            delete v.id; // Let Firestore generate ID
                            await this.store.addVenta(v);
                            count++;
                        }
                    }
                    if (data.gastos) {
                        for (const g of data.gastos) {
                            delete g.id;
                            await this.store.addGasto(g);
                            count++;
                        }
                    }
                    if (data.empleados) {
                        for (const emp of data.empleados) {
                            delete emp.id;
                            await this.store.addEmpleado(emp.nombre); // Simplified
                            count++;
                        }
                    }

                    this.ui.showToast(`Restauración completada (${count} registros)`);
                }
            } catch (err) {
                console.error(err);
                this.ui.showToast('Error al leer el archivo', 'error');
            }
            input.value = ''; // Reset input
        };
        reader.readAsText(file);
    }

    async clearAllData() {
        const result = await Swal.fire({
            title: '¿Borrar TODOS los datos?',
            text: "Esta acción eliminará todas las ventas y gastos. No se puede deshacer. ¿Estás seguro?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--danger)',
            confirmButtonText: 'Sí, borrar todo'
        });

        if (result.isConfirmed) {
            // Delete all sales
            const sales = this.store.state.registros;
            for (const s of sales) {
                await this.store.deleteRegistro(s.id, 'ventas');
            }

            // Delete all expenses
            const expenses = this.store.state.gastos;
            for (const g of expenses) {
                await this.store.deleteRegistro(g.id, 'gastos');
            }

            this.ui.showToast('Todos los datos han sido eliminados', 'info');
        }
    }
}

// Start App
new App();
