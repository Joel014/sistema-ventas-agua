/**
 * Clients Module
 * Manages client CRUD, Route system, and Debt management.
 */

import { formatCurrency } from './utils.js';

// --- HELPERS (Internal) ---

function resetClientForm() {
    const container = document.getElementById('clientFormContainer');
    const toggleBtn = document.getElementById('btnToggleClientForm');

    document.getElementById('editClientId').value = '';
    document.getElementById('newClientName').value = '';
    document.getElementById('newClientPhone').value = '';
    document.getElementById('newClientAddress').value = '';
    document.getElementById('newClientPrice').value = '25';
    document.getElementById('newClientStock').value = '';
    document.getElementById('newClientLat').value = '';
    document.getElementById('newClientLng').value = '';

    document.getElementById('formClientTitle').textContent = "Nuevo Cliente";

    const btn = document.getElementById('btnSaveClient');
    if (btn) {
        btn.innerHTML = '<i class="bi bi-plus-circle"></i> Agregar Cliente';
        btn.classList.remove('warning');
    }

    const cancelBtn = document.getElementById('btnCancelEdit');
    if (cancelBtn) cancelBtn.style.display = 'none';

    // Hide form and show toggle button
    if (container) container.style.display = 'none';
    if (toggleBtn) toggleBtn.style.display = 'flex';
}

function loadPendingDebts() {
    const container = document.getElementById('pendingDebtsList');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Cargando deudas...</div>';

    if (!window.db) return;

    window.db.collection('ventas')
        .where('estadoPago', '==', 'pendiente')
        .limit(100)
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">No hay deudas pendientes.</div>';
                return;
            }

            const rawDebts = [];
            snapshot.forEach(doc => rawDebts.push({ id: doc.id, ...doc.data() }));

            // Group by Client
            const groups = {};
            rawDebts.forEach(d => {
                const key = d.clienteId || d.clienteNombre || 'Desconocido';
                if (!groups[key]) {
                    groups[key] = {
                        clientId: d.clienteId,
                        name: d.clienteNombre || 'Cliente Sin Nombre',
                        total: 0,
                        items: []
                    };
                }
                groups[key].total += (Number(d.total) || 0);
                groups[key].items.push(d);
            });

            // Convert to array and sort by Total Amount Descending
            const sortedGroups = Object.values(groups).sort((a, b) => b.total - a.total);

            // Render Groups
            container.innerHTML = sortedGroups.map(group => {
                const itemsHtml = group.items.map(d => {
                    let dateStr = "---";
                    if (d.timestamp) {
                        if (d.timestamp.seconds) dateStr = new Date(d.timestamp.seconds * 1000).toLocaleDateString();
                        else if (typeof d.timestamp === 'number') dateStr = new Date(d.timestamp).toLocaleDateString();
                    }
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:13px;">
                            <div style="color:var(--text-muted);">
                                ${dateStr} • ${d.cantidad} botellones <br>
                                <span style="font-size:11px;">${d.detalles || ''}</span>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-weight:bold; margin-bottom:4px;">${formatCurrency(d.total)}</div>
                                <button onclick="markAsPaid('${d.id}')" style="background:none; border:1px solid var(--success); color:var(--success); padding:2px 8px; border-radius:4px; cursor:pointer; font-size:11px;">
                                    Pagar Uno
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');

                return `
                <div style="background:rgba(255,255,255,0.05); border-radius:12px; margin-bottom:12px; border:1px solid var(--border); overflow:hidden;">
                    <div style="padding:15px; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02);">
                        <div>
                            <div style="font-weight:700; color:var(--text-main); font-size:16px;">${group.name}</div>
                            <div style="font-size:12px; color:var(--text-muted);">
                                ${group.items.length} factura(s) pendiente(s)
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:800; font-size:18px; color:#ff6b6b;">${formatCurrency(group.total)}</div>
                            ${group.clientId ?
                        `<button onclick="payAllDebts('${group.clientId}', '${group.name}')" style="margin-top:5px; background:var(--success); color:white; border:none; padding:4px 12px; border-radius:6px; font-size:12px; cursor:pointer; font-weight:600;">
                                    Saldar Todo (${formatCurrency(group.total)})
                                </button>`
                        : ''}
                        </div>
                    </div>
                    
                    <details style="padding:0 15px 15px 15px;">
                        <summary style="cursor:pointer; color:var(--primary); font-size:12px; padding:10px 0; outline:none;">Ver facturas individuales</summary>
                        <div style="padding-top:5px;">
                            ${itemsHtml}
                        </div>
                    </details>
                </div>
                `;
            }).join('');

        })
        .catch(err => {
            console.error(err);
            container.innerHTML = '<div style="text-align:center; color:red;">Error cargando datos</div>';
        });
}


// --- EXPORTED FUNCTIONS ---

export function toggleNewClientForm() {
    const container = document.getElementById('clientFormContainer');
    const btn = document.getElementById('btnToggleClientForm');

    if (container.style.display === 'none') {
        container.style.display = 'block';
        btn.style.display = 'none'; // Hide "New Client" button while form is open
        document.getElementById('newClientName').focus();
    } else {
        container.style.display = 'none';
        btn.style.display = 'flex';
    }
}

export function toggleClientesModal() {
    if (window.mostrarSeccion) {
        window.mostrarSeccion('clientes');
    }
}

export function guardarClienteNuevo() {
    const id = document.getElementById('editClientId').value; // Check if editing
    const nombre = document.getElementById('newClientName').value.trim();
    const telefono = document.getElementById('newClientPhone').value.trim();
    const direccion = document.getElementById('newClientAddress').value.trim();
    const precio = parseFloat(document.getElementById('newClientPrice').value) || 25;
    const stock = parseInt(document.getElementById('newClientStock').value) || 0;

    if (!nombre) {
        alert("El nombre es obligatorio");
        return;
    }

    const lat = document.getElementById('newClientLat').value;
    const lng = document.getElementById('newClientLng').value;

    const clienteData = {
        nombre,
        telefono,
        direccion,
        precioEspecial: precio,
        stockBotellones: stock,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (lat) clienteData.lat = parseFloat(lat);
    if (lng) clienteData.lng = parseFloat(lng);

    if (id) {
        // Edit existing
        window.clientesRef.doc(id).update(clienteData)
            .then(() => {
                alert("✅ Cliente actualizado");
                resetClientForm();
            })
            .catch(err => console.error(err));
    } else {
        // Create new
        clienteData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        window.clientesRef.add(clienteData)
            .then(() => {
                alert("✅ Cliente guardado");
                resetClientForm();
            })
            .catch(err => console.error(err));
    }
}

export function editarCliente(id) {
    const c = window.listaClientes.find(x => x.id === id);
    if (!c) return;

    // Show form
    const container = document.getElementById('clientFormContainer');
    const toggleBtn = document.getElementById('btnToggleClientForm');
    // Ensure container exists before accessing style
    if (container) container.style.display = 'block';
    if (toggleBtn) toggleBtn.style.display = 'none';

    document.getElementById('editClientId').value = c.id;
    document.getElementById('newClientName').value = c.nombre;
    document.getElementById('newClientPhone').value = c.telefono || '';
    document.getElementById('newClientAddress').value = c.direccion || '';
    document.getElementById('newClientPrice').value = c.precioEspecial || '';
    document.getElementById('newClientStock').value = c.stockBotellones || '';
    document.getElementById('newClientLat').value = c.lat || '';
    document.getElementById('newClientLng').value = c.lng || '';

    document.getElementById('formClientTitle').textContent = "Editar Cliente";
    const btn = document.getElementById('btnSaveClient');
    if (btn) {
        btn.innerHTML = '<i class="bi bi-save"></i> Guardar Cambios';
        btn.classList.add('warning');
    }

    // Show cancel button
    const cancelBtn = document.getElementById('btnCancelEdit');
    if (cancelBtn) cancelBtn.style.display = 'block';
}

export function cancelarEdicionCliente() {
    resetClientForm();
}

export function eliminarCliente(id) {
    if (confirm("¿Estás seguro de eliminar este cliente?")) {
        window.clientesRef.doc(id).delete().catch(console.error);
    }
}

export function agregarARuta(id) {
    const cliente = window.listaClientes.find(c => c.id === id);
    if (!cliente) return;

    const rutaRef = window.db.collection("ruta_dia");

    rutaRef.add({
        clienteId: cliente.id,
        nombre: cliente.nombre,
        direccion: cliente.direccion,
        precio: cliente.precioEspecial,
        pagado: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Agregado a ruta',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        }
        toggleClientesModal();
    }).catch(err => {
        console.error(err);
        alert("Error al agregar a ruta");
    });
}

export function filtrarClientes() {
    const texto = document.getElementById('busquedaCliente').value.toLowerCase();
    const filtrados = window.listaClientes.filter(c =>
        c.nombre.toLowerCase().includes(texto) ||
        (c.direccion && c.direccion.toLowerCase().includes(texto))
    );
    renderClientesList(filtrados);
}

export function renderClientesList(listToRender = window.listaClientes) {
    const container = document.getElementById('listaClientesContainer');
    const selector = document.getElementById('clienteCamionSelector');
    if (container) {
        if (listToRender.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted); opacity:0.5;">No hay clientes registrados</div>';
        } else {
            container.innerHTML = listToRender.map(c => `
              <div class="client-card-premium">
                  <!-- Info Left -->
                  <div class="client-info-premium">
                      <h3>${c.nombre}</h3>
                      <div class="client-address-premium">
                          <i class="bi bi-geo-alt"></i> ${c.direccion || 'Sin dirección registrada'}
                      </div>
                      <div class="client-badges-premium">
                          <div class="premium-badge price">
                              <i class="bi bi-tag-fill"></i> RD$ ${c.precioEspecial}
                          </div>
                          <div class="premium-badge stock">
                              <i class="bi bi-box-seam"></i> Stock: ${c.stockBotellones || 0}
                          </div>
                      </div>
                  </div>

                  <!-- Actions Right -->
                  <div class="client-actions-premium">
                      <!-- Primary Column: Route & Location -->
                      <div class="actions-column-premium">
                          <button onclick="agregarARuta('${c.id}')" class="btn-circle-premium primary" title="Enviar a Ruta">
                              <i class="bi bi-truck"></i>
                          </button>
                          <button onclick="gestionarUbicacion('${c.id}', ${c.lat || 'null'}, ${c.lng || 'null'})" 
                                  class="btn-circle-premium" 
                                  style="background:${c.lat ? 'rgba(0, 194, 255, 0.15)' : 'rgba(255,255,255,0.03)'}; 
                                         color:${c.lat ? 'var(--primary)' : 'var(--text-muted)'};"
                                  title="${c.lat ? 'Ver Mapa' : 'Fijar Ubicación'}">
                              <i class="bi ${c.lat ? 'bi-geo-alt-fill' : 'bi-geo-alt'}"></i>
                          </button>
                      </div>

                      <!-- Secondary Column: History, Edit, Delete -->
                      <div class="secondary-actions-premium">
                          <button onclick="verHistorialCliente('${c.id}')" class="btn-small-premium" title="Historial">
                              <i class="bi bi-clock-history"></i>
                          </button>
                          <button onclick="editarCliente('${c.id}')" class="btn-small-premium" title="Editar">
                              <i class="bi bi-pencil-square"></i>
                          </button>
                          <button onclick="eliminarCliente('${c.id}')" class="btn-small-premium danger" title="Eliminar">
                              <i class="bi bi-trash"></i>
                          </button>
                      </div>
                  </div>
              </div>
          `).join('');
        }
    }

    if (selector) {
        const currentVal = selector.value;
        selector.innerHTML = '<option value="" data-precio="30">Cliente Casual (30 RD$)</option>';
        window.listaClientes.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            // Accessing window.PRECIO_CAMION fallback ?? NO, it uses client specific price
            option.textContent = `${c.nombre} - RD$${c.precioEspecial}`;
            option.setAttribute('data-precio', c.precioEspecial);
            selector.appendChild(option);
        });
        selector.value = currentVal;
    }
}

export function verHistorialCliente(id) {
    const client = window.listaClientes.find(c => c.id === id);
    if (!client) return;

    document.getElementById('historialClienteNombre').textContent = `📜 Historial: ${client.nombre}`;
    const modal = document.getElementById('modalHistorialCliente');
    const listContainer = document.getElementById('historialClienteList');

    modal.style.display = 'flex';
    listContainer.innerHTML = '<div style="text-align:center; padding:20px;">Cargando...</div>';

    const sales = (window.allRecentVentas || []).filter(v => v.clienteId === id);

    if (sales.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">No hay compras recientes registradas.</div>';
        return;
    }

    listContainer.innerHTML = sales.map(v => {
        let dateStr = '-';
        if (v.createdAt && v.createdAt.seconds) {
            dateStr = new Date(v.createdAt.seconds * 1000).toLocaleDateString();
        } else if (v.timestamp) {
            dateStr = new Date(v.timestamp).toLocaleDateString();
        }

        return `
            <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-bottom:8px; border-bottom:1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="font-size:13px; color:var(--text-muted);">${dateStr} - ${v.hora || ''}</span>
                    <span style="font-weight:bold; color:var(--success);">${formatCurrency(v.total)}</span>
                </div>
                <div style="font-size:14px;">
                    <i class="bi bi-droplet"></i> ${v.cantidad} botellones
                    ${v.botellonesVacios ? `<span style="font-size:12px; color:var(--info); margin-left:8px;">(Devolvió ${v.botellonesVacios} vacíos)</span>` : ''}
                </div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                    ${v.detalles || ''}
                </div>
            </div>
          `;
    }).join('');
}

export function setupCommentSearch() {
    const commentInput = document.getElementById('commentCamion');
    const suggestionsBox = document.getElementById('suggestionsList');

    if (!commentInput || !suggestionsBox) return;

    commentInput.addEventListener('input', function () {
        const val = this.value.toLowerCase().trim();
        if (val.length < 2) {
            suggestionsBox.style.display = 'none';
            return;
        }

        const matches = window.listaClientes.filter(c => c.nombre.toLowerCase().includes(val));

        if (matches.length === 0) {
            suggestionsBox.style.display = 'none';
            return;
        }

        suggestionsBox.innerHTML = matches.map(c => `
            <div class="suggestion-item" onmousedown="event.preventDefault(); selectClientFromSearch('${c.id}')" ontouchstart="event.preventDefault(); selectClientFromSearch('${c.id}')">
                <strong>${c.nombre}</strong> <small>(RD$${c.precioEspecial})</small>
            </div>
        `).join('');
        suggestionsBox.style.display = 'block';
    });

    const closeSuggestions = function (e) {
        if (!commentInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.style.display = 'none';
        }
    };

    document.addEventListener('click', closeSuggestions);
    document.addEventListener('touchstart', closeSuggestions);
}

export function selectClientFromSearch(id) {
    const selector = document.getElementById('clienteCamionSelector');
    const suggestionsBox = document.getElementById('suggestionsList');

    if (selector) {
        selector.value = id;
        if (window.seleccionarClienteCamion) window.seleccionarClienteCamion(); // Call the script.js logic if exists
    }

    if (suggestionsBox) suggestionsBox.style.display = 'none';
}

export function renderRutaDia(rutaList = window.rutaDiaList) {
    const container = document.getElementById('rutaDiaContainer');
    if (!container) return;

    if (rutaList.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px 20px;">
                <p style="color:var(--text-muted); margin-bottom:10px;">La ruta está vacía.</p>
                <button onclick="toggleClientesModal()" style="color:var(--primary); background:none; border:1px solid var(--primary); padding:8px 16px; border-radius:6px; font-size:14px; cursor:pointer;">
                    <i class="bi bi-search"></i> Buscar Clientes para Agregar
                </button>
            </div>
          `;
        return;
    }

    container.innerHTML = rutaList.map(item => `
        <div class="ruta-card" style="background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:12px; padding:15px; margin-bottom:10px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="flex:1;">
                    <div style="font-weight:bold; font-size:16px;">${item.nombre}</div>
                    <div style="font-size:13px; color:var(--text-muted);">${item.direccion || 'Sin dirección'}</div>
                    <div style="font-size:12px; color:var(--primary); margin-top:2px;">Precio: RD$${item.precio}</div>
                </div>
                <div style="text-align:right;">
                    <button onclick="togglePago('${item.id}', ${item.pagado})" class="btn-sm" style="background:${item.pagado ? '#2ecc71' : '#ff9f43'}; border:none; border-radius:20px; padding:6px 12px; font-size:12px; color:white; font-weight:600; box-shadow:0 2px 5px rgba(0,0,0,0.2);">
                        ${item.pagado ? '💰 Pagado' : '⏳ Pendiente'}
                    </button>
                </div>
            </div>

            <div style="display:flex; gap:10px; align-items:center; margin-top:5px;">
                <div style="display:flex; align-items:center; background:rgba(0,0,0,0.2); border-radius:8px; padding:2px 8px; border:1px solid var(--border);">
                    <span style="font-size:12px; color:var(--text-muted); margin-right:5px;">Cant:</span>
                    <input type="number" value="${item.cantidad || 1}" min="1" 
                        onfocus="if(this.value=='1') this.value=''" 
                        onchange="window.updateRutaCantidad('${item.id}', this.value)"
                        placeholder="1"
                        style="width:50px; background:none; border:none; color:white; font-weight:bold; text-align:center; font-size:14px;">
                </div>
                
                <button onclick="entregarPedido('${item.id}')" class="btn btn-primary" style="flex:1; font-size:14px; padding:8px;">
                    <i class="bi bi-check-lg"></i> Entregar
                </button>
                <button onclick="eliminarDeRuta('${item.id}')" class="btn btn-outline danger" style="width:40px; padding:0; display:flex; align-items:center; justify-content:center;">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
      `).join('');
}

export function eliminarDeRuta(id) {
    const rutaRef = window.db.collection("ruta_dia");
    if (confirm("¿Eliminar este pedido de la ruta?")) {
        rutaRef.doc(id).delete();
    }
}

export function togglePago(id, currentStatus) {
    const rutaRef = window.db.collection("ruta_dia");
    const newStatus = !currentStatus;
    rutaRef.doc(id).update({ pagado: newStatus });
}

export function updateRutaCantidad(id, qty) {
    const rutaRef = window.db.collection("ruta_dia");
    let val = parseInt(qty);
    if (isNaN(val) || val < 1) val = 1;
    rutaRef.doc(id).update({ cantidad: val });
}

export function entregarPedido(id) {
    const item = (window.rutaDiaList || []).find(r => r.id === id);
    if (!item) return;

    Swal.fire({
        title: `Entrega: ${item.nombre}`,
        text: "Seleccione la modalidad de entrega",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: '👤 Solo (Yo)',
        cancelButtonText: '👥 Con Ayudante',
        showCloseButton: true
    }).then((result) => {
        if (result.dismiss === Swal.DismissReason.backdrop || result.dismiss === Swal.DismissReason.close) {
            return;
        }

        let modalidad = 'Solo';
        if (result.isConfirmed) {
            modalidad = 'Solo';
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            modalidad = 'Ayudante';
        } else {
            return;
        }

        const venta = {
            timestamp: Date.now(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            hora: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            tipo: 'Camión',
            subtipo: modalidad,
            detalles: `Ruta: ${item.nombre} (${modalidad}) - ${item.direccion}`,
            cantidad: item.cantidad || 1,
            precioUnitario: `${formatCurrency(item.precio)}`,
            total: (item.precio * (item.cantidad || 1)),
            clienteId: item.clienteId || null,
            clienteNombre: item.nombre || 'Desconocido',
            estadoPago: item.pagado ? 'pagado' : 'pendiente'
        };

        window.ventasRef.add(venta).then(() => {
            const rutaRef = window.db.collection("ruta_dia");
            rutaRef.doc(id).delete();

            Swal.fire({
                icon: 'success',
                title: 'Entrega Registrada',
                text: `Modalidad: ${modalidad}`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        }).catch(err => {
            console.error(err);
            Swal.fire('Error', 'No se pudo registrar la venta', 'error');
        });
    });
}

export function toggleDebtsModal() {
    const modal = document.getElementById('modalDebts');
    if (!modal) return;
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
    } else {
        modal.style.display = 'flex';
        loadPendingDebts();
    }
}

export function payAllDebts(clientId, clientName) {
    if (!clientId) return;
    if (!confirm(`¿Saldar TODAS las deudas pendientes de ${clientName}?`)) return;

    window.db.collection('ventas')
        .where('clienteId', '==', clientId)
        .where('estadoPago', '==', 'pendiente')
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                alert("No se encontraron deudas.");
                return;
            }

            const batch = window.db.batch();
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    estadoPago: 'pagado',
                    pagadoEl: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            return batch.commit();
        })
        .then(() => {
            alert(`✅ Todas las deudas de ${clientName} han sido saldadas.`);
            loadPendingDebts(); // Refresh
            if (typeof window.filtrarHistorial === 'function') window.filtrarHistorial();
        })
        .catch(err => {
            console.error(err);
            alert("Error al procesar el pago masivo.");
        });
}

export function markAsPaid(id) {
    if (!confirm("¿Marcar esta deuda como PAGADA? Se actualizará el historial.")) return;

    window.db.collection('ventas').doc(id).update({
        estadoPago: 'pagado',
        pagadoEl: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        if (window.ventasDelDia) {
            const ventaLocal = window.ventasDelDia.find(v => v.id === id);
            if (ventaLocal) {
                ventaLocal.estadoPago = 'pagado';
                ventaLocal.pagadoEl = new Date();
            }
        }
        if (typeof window.filtrarHistorial === 'function') window.filtrarHistorial();
        loadPendingDebts();
        alert("Deuda saldada correctamente");
    }).catch(err => alert("Error al actualizar"));
}

export function fijarUbicacionCliente(id) {
    if (!navigator.geolocation) {
        Swal.fire('Error', 'Tu navegador no soporta geolocalización', 'error');
        return;
    }

    Swal.fire({
        title: 'Fijar Ubicación',
        text: "¿Deseas guardar tu posición actual como la ubicación de este cliente?",
        icon: 'location',
        showCancelButton: true,
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Obteniendo GPS...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            navigator.geolocation.getCurrentPosition((position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                window.clientesRef.doc(id).update({
                    lat: lat,
                    lng: lng,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Ubicación Guardada',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }).catch(err => {
                    console.error(err);
                    Swal.fire('Error', 'No se pudo guardar en la base de datos', 'error');
                });
            }, (error) => {
                console.error(error);
                if (error.code === 1) {
                    Swal.fire('Acceso denegado', 'Por favor habilita el GPS', 'warning');
                } else {
                    Swal.fire('Error', 'Error SOS', 'error');
                }
            }, {
                enableHighAccuracy: true,
                timeout: 10000
            });
        }
    });
}

export function gestionarUbicacion(id, lat, lng) {
    if (!lat || lat === 'null') {
        fijarUbicacionCliente(id);
    } else {
        Swal.fire({
            title: 'Gestionar Ubicación',
            text: "¿Qué deseas hacer?",
            icon: 'question',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: '🚀 Navegar',
            denyButtonText: '📍 Actualizar GPS',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3085d6',
            denyButtonColor: '#ff9f43'
        }).then((result) => {
            if (result.isConfirmed) {
                verUbicacionCliente(lat, lng);
            } else if (result.isDenied) {
                fijarUbicacionCliente(id);
            }
        });
    }
}

export function verUbicacionCliente(lat, lng) {
    const url = "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lng;
    window.open(url, "_blank");
}


// --- LISTENERS (Self-Starting) ---

export function initClientsListener() {
    if (!window.clientesRef) return;

    window.clientesRef.onSnapshot(snapshot => {
        window.listaClientes = [];
        snapshot.forEach(doc => {
            window.listaClientes.push({ id: doc.id, ...doc.data() });
        });
        window.listaClientes.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        if (typeof renderClientesList === 'function') {
            renderClientesList();
        }
    }, (error) => {
        console.error("Error loading clients:", error);
    });
}

export function initRutaListener() {
    const rutaRef = window.db.collection("ruta_dia");
    let previousRouteCount = -1;

    rutaRef.onSnapshot(snapshot => {
        window.rutaDiaList = [];
        snapshot.forEach(doc => {
            window.rutaDiaList.push({ id: doc.id, ...doc.data() });
        });

        window.rutaDiaList.sort((a, b) => {
            const timeA = a.createdAt ? a.createdAt.seconds : 0;
            const timeB = b.createdAt ? b.createdAt.seconds : 0;
            return timeA - timeB;
        });

        if (previousRouteCount !== -1 && window.rutaDiaList.length > previousRouteCount) {
            if (typeof window.playNotificationBeep === 'function') window.playNotificationBeep();

            // Show red dot
            const dot = document.getElementById('rutaNotifDot');
            if (dot) dot.style.display = 'block';
        }
        previousRouteCount = window.rutaDiaList.length;

        renderRutaDia();

    }, err => console.error(err));
}
