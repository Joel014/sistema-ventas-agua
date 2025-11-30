import { db } from './firebase-config.js';
import { AuthManager } from './auth.js';
import { collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
        try {
            await addDoc(collection(db, "gastos"), gasto);
            return true;
        } catch (e) {
            console.error("Error adding gasto: ", e);
            return false;
        }
    }

    async addEmpleado(nombre) {
        try {
            await addDoc(collection(db, "empleados"), { nombre, activo: true });
            return true;
        } catch (e) {
            console.error("Error adding empleado: ", e);
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

            // Inputs
            dateDisplay: document.getElementById('currentDate'),

            // Login
            loginView: document.getElementById('view-login'),
            appContent: document.getElementById('app-content'),
            sidebar: document.querySelector('.sidebar')
        };
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

        this.elements.dashTotal.textContent = this.formatCurrency(stats.total);
        this.elements.dashBotellones.textContent = stats.botellones;
        this.elements.dashTransacciones.textContent = stats.transacciones;

        this.elements.recentActivityList.innerHTML = recent.map(r => `
            <div class="activity-item" style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
                <div>
                    <div style="font-weight:600">${r.detalle}</div>
                    <div style="font-size:12px;color:var(--text-muted)">${new Date(r.fecha).toLocaleTimeString()}</div>
                </div>
                <div style="font-weight:700;color:var(--success)">+${r.cantidad}</div>
            </div>
        `).join('');
    }

    renderRepartidores(empleados, onAdd) {
        this.elements.repartidoresList.innerHTML = empleados.map(emp => `
            <div class="emp-card">
                <div class="emp-header">
                    <span>${emp.nombre}</span>
                    <i class="bi bi-person-badge"></i>
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
        this.elements.historyTableBody.innerHTML = registros.map(r => `
            <tr>
                <td>${new Date(r.fecha).toLocaleDateString()}</td>
                <td>${new Date(r.fecha).toLocaleTimeString()}</td>
                <td><span class="badge ${r.tipo}">${r.tipo}</span></td>
                <td>${r.detalle}</td>
                <td class="text-right">${r.cantidad}</td>
                <td class="text-right">${this.formatCurrency(r.total)}</td>
                <td>
                    <button class="btn-icon danger" onclick="window.app.deleteRegistro('${r.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
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
        return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount);
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
        const allTabs = ['dashboard', 'ventas', 'gastos', 'reportes', 'historial', 'config'];
        let allowedTabs = [];

        if (role === 'admin') {
            allowedTabs = allTabs;
        } else if (role === 'planta') {
            allowedTabs = ['ventas', 'gastos', 'historial'];
        } else if (role === 'camion') {
            allowedTabs = ['ventas'];
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
        this.ui.showView(role === 'camion' ? 'ventas' : 'dashboard');
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
            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPass').value;
            const res = await this.auth.login(email, pass);
            if (!res.success) {
                this.ui.showToast('Error: ' + res.message, 'error');
            }
        });

        document.getElementById('btnLogout').addEventListener('click', () => {
            this.auth.logout();
        });

        // Quick Actions
        document.getElementById('btnLocal').addEventListener('click', () => this.addVenta('local'));
        document.getElementById('btnCamion').addEventListener('click', () => this.addVenta('camion'));
        document.getElementById('btnOtro').addEventListener('click', () => this.addVenta('otro'));

        // Gastos
        document.getElementById('btnGasto').addEventListener('click', () => this.addGasto());

        // Repartidor
        document.getElementById('btnAddRepartidor').addEventListener('click', () => this.addRepartidor());
    }

    refreshUI(state) {
        // Calculate Dashboard Stats
        const today = new Date().toISOString().slice(0, 10);
        const todaySales = state.registros.filter(r => r.fecha.startsWith(today));

        const stats = {
            total: todaySales.reduce((sum, r) => sum + r.total, 0),
            botellones: todaySales.reduce((sum, r) => sum + r.cantidad, 0),
            transacciones: todaySales.length
        };

        this.ui.updateDashboard(stats, todaySales.slice(0, 5));
        this.ui.renderRepartidores(state.empleados);
        this.ui.renderHistory(state.registros);
    }

    async addVenta(type) {
        const date = document.getElementById('saleDate').value || new Date().toISOString();
        let venta = {
            fecha: date,
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
            venta = {
                ...venta,
                cantidad: qty,
                total: qty * price,
                detalle: `Venta Camión ${comment ? '(' + comment + ')' : ''}`
            };
            document.getElementById('qtyCamion').value = '';
            document.getElementById('commentCamion').value = '';
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
        const monto = parseFloat(document.getElementById('gastoMonto').value);
        const desc = document.getElementById('gastoDesc').value;

        if (!monto || !desc) return this.ui.showToast('Completa los campos', 'warning');

        const gasto = {
            fecha: new Date().toISOString(),
            monto,
            descripcion: desc,
            usuario: this.auth.currentUser.email
        };

        if (await this.store.addGasto(gasto)) {
            this.ui.showToast('Gasto guardado');
            document.getElementById('gastoMonto').value = '';
            document.getElementById('gastoDesc').value = '';
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
}

// Start App
new App();
