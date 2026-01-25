/**
 * Main Application Entry Point
 * Handles module imports and establishes compatibility bridges for legacy scripts.
 */

import * as utils from './modules/utils.js';
import * as auth from './modules/auth.js';

console.log('🚀 BizCore: Initializing App Modules...');

// --- BRIDGE: Expose Utils to Global Scope for Legacy Compatibility ---
window.formatCurrency = utils.formatCurrency;
window.escapeCSV = utils.escapeCSV;
window.getIconForType = utils.getIconForType;
window.togglePasswordVisibility = utils.togglePasswordVisibility;

// --- BRIDGE: Config ---
import { PRICING, initConfigListener, saveConfig } from './modules/config.js';
window.PRECIO_LOCAL = PRICING.LOCAL;
window.PRECIO_CAMION = PRICING.CAMION;
window.PRECIO_DELIVERY = PRICING.DELIVERY;
window.saveConfig = saveConfig;

console.log(`💰 Pricing Loaded: Local=$${PRICING.LOCAL}, Truck=$${PRICING.CAMION}, Delivery=$${PRICING.DELIVERY}`);

// --- BRIDGE: Clients & Reports ---
import * as clients from './modules/clients.js';
import * as reports from './modules/reports.js';

// Clients Map
window.toggleClientesModal = clients.toggleClientesModal;
window.toggleNewClientForm = clients.toggleNewClientForm;
window.guardarClienteNuevo = clients.guardarClienteNuevo;
window.editarCliente = clients.editarCliente;
window.cancelarEdicionCliente = clients.cancelarEdicionCliente;
window.eliminarCliente = clients.eliminarCliente;
window.agregarARuta = clients.agregarARuta;
window.filtrarClientes = clients.filtrarClientes;
window.renderClientesList = clients.renderClientesList;
window.verHistorialCliente = clients.verHistorialCliente;
window.setupCommentSearch = clients.setupCommentSearch;
window.selectClientFromSearch = clients.selectClientFromSearch;
window.renderRutaDia = clients.renderRutaDia;
window.eliminarDeRuta = clients.eliminarDeRuta;
window.togglePago = clients.togglePago;
window.updateRutaCantidad = clients.updateRutaCantidad;
window.entregarPedido = clients.entregarPedido;
window.toggleDebtsModal = clients.toggleDebtsModal;
window.markAsPaid = clients.markAsPaid;
window.payAllDebts = clients.payAllDebts;
window.fijarUbicacionCliente = clients.fijarUbicacionCliente;
window.gestionarUbicacion = clients.gestionarUbicacion;
window.verUbicacionCliente = clients.verUbicacionCliente;

// Reports Map
window.actualizarReportes = reports.actualizarReportes;
window.renderGastosChart = reports.renderGastosChart;
window.generarReporteClientes = reports.generarReporteClientes;
window.filtrarReporte = reports.filtrarReporte;
window.resetFiltro = reports.resetFiltro;
window.exportarPDF = reports.exportarPDF;
window.filtrarHistorial = reports.filtrarHistorial;

// --- BRIDGE: Calendar ---
import * as calendar from './modules/calendar.js';
window.renderCalendar = calendar.renderCalendar;
window.prevMonth = calendar.prevMonth;
window.nextMonth = calendar.nextMonth;
window.openDayModal = calendar.openDayModal;
window.saveAsistencia = calendar.saveAsistencia;
window.initCalendar = calendar.initCalendar;

// Reports Quick Action Namespace
window.app = window.app || {};
window.app.toggleCustomDate = reports.toggleCustomDate;
window.app.applyQuickFilter = reports.applyQuickFilter;

// --- BRIDGE: Auth ---
window.login = auth.login;
window.logout = auth.logout;

// --- BRIDGE: Profile ---
import * as profile from './modules/profile.js';
window.actualizarPerfilVisual = profile.actualizarPerfilVisual;
window.initProfile = profile.initProfile;
window.resetNotifDot = profile.resetNotifDot;

// Initialize Auth Listener
// We assume 'script.js' defines 'window.updateAuthUI(user)' to handle the UI changes
// We wrap it in a timeout or check to ensure script.js has loaded its function
window.addEventListener('load', () => {
    console.log("🔒 Initializing Auth Module...");
    auth.initAuth((user) => {
        if (typeof window.updateAuthUI === 'function') {
            window.updateAuthUI(user);
        } else {
            console.warn("⚠️ window.updateAuthUI not defined yet. Legacy script might be lagging.");
        }
    });

    // Start Listeners
    if (clients.initClientsListener) clients.initClientsListener();
    if (clients.initRutaListener) clients.initRutaListener();
    if (calendar.initCalendar) calendar.initCalendar();
    if (window.initProfile) window.initProfile();
    // Initialize Dynamic Config Sync
    if (typeof initConfigListener === 'function') initConfigListener();
});

console.log('✅ Utils & Auth Modules Loaded & Bridged.');
