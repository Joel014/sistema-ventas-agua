/**
 * Calendar Module
 * Manages the Work Calendar/Attendance system.
 */

// State
let currentDate = new Date();
let currentMonthData = {}; // Stores attendance data for the current month view
let unsubscribe = null; // Firestore listener unsubscribe

// --- HELPERS ---

function getMonthName(monthIndex) {
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return months[monthIndex];
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay(); // 0 = Sunday
}

function formatDateKey(year, month, day) {
    // Format YYYY-MM-DD
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
}

// --- RENDER ---

export function renderCalendar() {
    const container = document.getElementById('calendarGrid');
    const label = document.getElementById('calendarMonthLabel');

    if (!container || !label) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    label.textContent = `${getMonthName(month)} ${year}`;
    container.innerHTML = '';

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    // Padding for empty start days
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        container.appendChild(empty);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayKey = formatDateKey(year, month, day);
        const data = currentMonthData[dayKey] || {};

        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.onclick = () => openDayModal(dayKey);

        const numberEl = document.createElement('div');
        numberEl.className = 'day-number';
        numberEl.textContent = day;
        dayEl.appendChild(numberEl);

        // Icons Container
        const iconsEl = document.createElement('div');
        iconsEl.className = 'day-icons';

        // Camion Icon
        const truck = document.createElement('span');
        truck.className = `icon-dot ${data.camion ? 'active-truck' : ''}`;
        truck.innerHTML = '<i class="bi bi-truck"></i>';
        truck.title = "Camión";
        iconsEl.appendChild(truck);

        // Delivery Icon
        const delivery = document.createElement('span');
        delivery.className = `icon-dot ${data.delivery ? 'active-delivery' : ''}`;
        delivery.innerHTML = '<i class="bi bi-bicycle"></i>';
        delivery.title = "Delivery";
        iconsEl.appendChild(delivery);

        // Employee Icon
        const emp = document.createElement('span');
        emp.className = `icon-dot ${data.empleado ? 'active-emp' : ''}`;
        emp.innerHTML = '<i class="bi bi-person"></i>';
        emp.title = "Ayudante";
        iconsEl.appendChild(emp);

        dayEl.appendChild(iconsEl);
        container.appendChild(dayEl);
    }

    updateStats();
}

function updateStats() {
    // Calculate totals for the current view
    let tCamion = 0, tDelivery = 0, tEmp = 0;
    Object.values(currentMonthData).forEach(d => {
        if (d.camion) tCamion++;
        if (d.delivery) tDelivery++;
        if (d.empleado) tEmp++;
    });

    const statCamion = document.getElementById('statCamionDays');
    const statDelivery = document.getElementById('statDeliveryDays');
    const statEmp = document.getElementById('statEmpDays');

    if (statCamion) statCamion.textContent = tCamion;
    if (statDelivery) statDelivery.textContent = tDelivery;
    if (statEmp) statEmp.textContent = tEmp;
}

// --- MODAL & LOGIC ---

export function openDayModal(dateStr) {
    const modal = document.getElementById('modalAsistencia');
    const title = document.getElementById('modalAsistenciaTitle');
    const hiddenDate = document.getElementById('asistenciaDate');

    if (!modal) return;

    // Set Date Title
    const parts = dateStr.split('-');
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    title.textContent = `📅 ${dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`;
    hiddenDate.value = dateStr;

    // Load Data
    const data = currentMonthData[dateStr] || { camion: false, delivery: false, empleado: false, notas: '' };

    document.getElementById('checkCamion').checked = data.camion || false;
    document.getElementById('checkDelivery').checked = data.delivery || false;
    document.getElementById('checkEmpleado').checked = data.empleado || false;
    document.getElementById('asistenciaNotas').value = data.notas || '';

    modal.style.display = 'flex';
}

export function saveAsistencia() {
    const dateStr = document.getElementById('asistenciaDate').value;
    const camion = document.getElementById('checkCamion').checked;
    const delivery = document.getElementById('checkDelivery').checked;
    const empleado = document.getElementById('checkEmpleado').checked;
    const notas = document.getElementById('asistenciaNotas').value;

    const parts = dateStr.split('-');
    const year = parts[0];
    const month = parts[1]; // 01-12

    const docId = `${year}_${month}`; // Document ID: 2024_01

    if (!window.db) return;

    // We store data in a map field key = dateStr (full date)
    // Field path: "2024-01-14" : { ... }
    const updateData = {};
    updateData[dateStr] = {
        camion,
        delivery,
        empleado,
        notas
    };

    window.db.collection('asistencia_mensual').doc(docId).set(updateData, { merge: true })
        .then(() => {
            // Optimistic Update
            currentMonthData[dateStr] = updateData[dateStr];
            renderCalendar();

            // Close Modal
            document.getElementById('modalAsistencia').style.display = 'none';
        })
        .catch(err => {
            console.error(err);
            alert("Error al guardar asistencia");
        });
}

// --- NAVIGATION ---

export function prevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    loadMonthData();
}

export function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    loadMonthData();
}

// --- FIRESTORE ---

export function loadMonthData() {
    if (!window.db) return;

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const docId = `${year}_${month}`;

    if (unsubscribe) unsubscribe();

    unsubscribe = window.db.collection('asistencia_mensual').doc(docId)
        .onSnapshot(doc => {
            if (doc.exists) {
                currentMonthData = doc.data();
            } else {
                currentMonthData = {};
            }
            renderCalendar();
        }, err => console.error(err));
}

export function initCalendar() {
    // Only init if we are on the page? Or just load it.
    // It's better to lazy load when the view is shown, but for now we'll start it if the element exists.
    loadMonthData();
}
