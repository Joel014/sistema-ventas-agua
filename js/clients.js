// --- 👥 MÓDULO DE CLIENTES ---

// Functions exposed to window
window.toggleClientesModal = function () {
  const modal = document.getElementById('modalClientes');
  if (modal) {
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
  }
}

window.guardarClienteNuevo = function () {
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

window.editarCliente = function (id) {
  const c = window.listaClientes.find(x => x.id === id);
  if (!c) return;

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
  btn.innerHTML = '<i class="bi bi-save"></i> Guardar Cambios';
  btn.classList.add('warning');
}

function resetClientForm() {
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
  btn.innerHTML = '<i class="bi bi-plus-circle"></i> Agregar Cliente';
  btn.classList.remove('warning');
}

window.cancelarEdicionCliente = function () {
  resetClientForm();
  document.getElementById('btnCancelEdit').style.display = 'none';
}

window.eliminarCliente = function (id) {
  if (confirm("¿Estás seguro de eliminar este cliente?")) {
    window.clientesRef.doc(id).delete().catch(console.error);
  }
}

// --- 🚚 SISTEMA DE RUTAS (Client Actions) ---
window.agregarARuta = function (id) {
  const cliente = window.listaClientes.find(c => c.id === id);
  if (!cliente) return;

  // Check if ruta_dia collection is defined somewhere, if not use db
  const rutaRef = window.db.collection("ruta_dia");

  // Add directly without confirmation (One-click action)
  rutaRef.add({
    clienteId: cliente.id,
    nombre: cliente.nombre,
    direccion: cliente.direccion,
    precio: cliente.precioEspecial,
    pagado: false, // Default pending
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    // Less intrusive notification
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: 'Agregado a ruta',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      });
    } else {
      // Fallback if Swal not loaded (unlikely)
      console.log("Cliente agregado");
    }
    toggleClientesModal(); // Close modal
  }).catch(err => {
    console.error(err);
    alert("Error al agregar a ruta");
  });
}

window.filtrarClientes = function () {
  const texto = document.getElementById('busquedaCliente').value.toLowerCase();
  const filtrados = window.listaClientes.filter(c =>
    c.nombre.toLowerCase().includes(texto) ||
    (c.direccion && c.direccion.toLowerCase().includes(texto))
  );
  renderClientesList(filtrados);
}

window.renderClientesList = function (listToRender = window.listaClientes) {
  const container = document.getElementById('listaClientesContainer');
  const selector = document.getElementById('clienteCamionSelector');
  if (container) {
    if (listToRender.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">No hay clientes registrados</div>';
    } else {
      container.innerHTML = `
          <div class="client-list-items">
             ${listToRender.map(c => `
              <div class="client-card" style="display:flex; justify-content:space-between; align-items:center; param:12px; padding:12px; border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.2s;">
                  <div style="flex:1;">
                      <div style="font-weight:600; font-size:15px; color:var(--text-main); margin-bottom:4px;">${c.nombre}</div>
                      <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; font-size:12px;">
                          <div style="display:flex; align-items:center; color:var(--text-muted);">
                             <i class="bi bi-geo-alt" style="margin-right:4px;"></i> ${c.direccion || 'Sin dirección'}
                          </div>
                      </div>
                      <div style="display:flex; gap:8px; margin-top:6px;">
                          <span style="font-size:11px; font-weight:600; background:rgba(46, 204, 113, 0.15); color:#2ecc71; padding:2px 8px; border-radius:4px;">
                              RD$ ${c.precioEspecial}
                          </span>
                          <span style="font-size:11px; font-weight:600; background:rgba(0, 194, 255, 0.15); color:var(--primary); padding:2px 8px; border-radius:4px;">
                              <i class="bi bi-box-seam"></i> Stock: ${c.stockBotellones || 0}
                          </span>
                      </div>
                  </div>
                  <div style="display:flex; gap:8px; align-items:center;">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <button onclick="agregarARuta('${c.id}')" style="background:var(--primary); color:white; border:none; width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 4px 10px rgba(0,194,255,0.3);" title="Enviar a Ruta">
                          <i class="bi bi-truck"></i>
                        </button>
                        <button onclick="gestionarUbicacion('${c.id}', ${c.lat || 'null'}, ${c.lng || 'null'})" 
                                style="background:${c.lat ? 'rgba(0, 194, 255, 0.15)' : 'rgba(255,255,255,0.05)'}; 
                                       color:${c.lat ? 'var(--primary)' : 'var(--text-muted)'}; 
                                       border:${c.lat ? '1px solid var(--primary)' : '1px solid var(--border)'}; 
                                       width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; cursor:pointer;" 
                                title="${c.lat ? 'Gestionar Ubicación' : 'Fijar Ubicación GPS'}">
                          <i class="bi ${c.lat ? 'bi-geo-alt-fill' : 'bi-geo-alt'}"></i>
                        </button>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <button onclick="verHistorialCliente('${c.id}')" style="background:rgba(255,255,255,0.05); color:var(--info); border:1px solid var(--border); width:28px; height:28px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Ver Historial">
                            <i class="bi bi-clock-history" style="font-size:12px;"></i>
                        </button>
                        <button onclick="editarCliente('${c.id}')" style="background:rgba(255,255,255,0.05); color:var(--text-muted); border:1px solid var(--border); width:28px; height:28px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Editar">
                            <i class="bi bi-pencil-square" style="font-size:12px;"></i>
                        </button>
                        <button onclick="eliminarCliente('${c.id}')" style="background:rgba(231,29,54,0.1); color:var(--danger); border:1px solid rgba(231,29,54,0.3); width:28px; height:28px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Eliminar">
                            <i class="bi bi-trash" style="font-size:12px;"></i>
                        </button>
                    </div>
                </div>
              </div>
          `).join('')}
          </div>
        `;
    }
  }

  // Update Camion Selector too
  if (selector) {
    const currentVal = selector.value;
    selector.innerHTML = '<option value="" data-precio="30">Cliente Casual (30 RD$)</option>';
    window.listaClientes.forEach(c => {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = `${c.nombre} - RD$${c.precioEspecial}`;
      option.setAttribute('data-precio', c.precioEspecial);
      selector.appendChild(option);
    });
    selector.value = currentVal;
  }
}

// --- HISTORIAL CLIENTE ---
window.verHistorialCliente = function (id) {
  const client = window.listaClientes.find(c => c.id === id);
  if (!client) return;

  document.getElementById('historialClienteNombre').textContent = `📜 Historial: ${client.nombre}`;
  const modal = document.getElementById('modalHistorialCliente');
  const listContainer = document.getElementById('historialClienteList');

  modal.style.display = 'flex';
  listContainer.innerHTML = '<div style="text-align:center; padding:20px;">Cargando...</div>';

  // Use window.allRecentVentas
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

// --- SMART SEARCH (For Camion) ---
window.setupCommentSearch = function () {
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

window.selectClientFromSearch = function (id) {
  const selector = document.getElementById('clienteCamionSelector');
  const suggestionsBox = document.getElementById('suggestionsList');

  if (selector) {
    selector.value = id;
    window.seleccionarClienteCamion();
  }

  if (suggestionsBox) suggestionsBox.style.display = 'none';
}

// --- RENDER RUTA DIA ---
window.renderRutaDia = function (rutaList = window.rutaDiaList) {
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
                    <input type="number" value="${item.cantidad || 1}" min="1" onchange="window.updateRutaCantidad('${item.id}', this.value)"
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

// --- ACTIONS FOR RUTA (Depends on Firebase Globals) ---
window.eliminarDeRuta = function (id) {
  // rutaRef should be typically defined, but if not we can use db
  const rutaRef = window.db.collection("ruta_dia");

  if (confirm("¿Eliminar este pedido de la ruta?")) {
    rutaRef.doc(id).delete();
  }
}

window.togglePago = function (id, currentStatus) {
  const rutaRef = window.db.collection("ruta_dia");
  const newStatus = !currentStatus;
  rutaRef.doc(id).update({ pagado: newStatus });
}

window.updateRutaCantidad = function (id, qty) {
  const rutaRef = window.db.collection("ruta_dia");
  if (qty < 1) qty = 1;
  rutaRef.doc(id).update({ cantidad: parseInt(qty) });
}

window.entregarPedido = function (id) {
  const item = (window.rutaDiaList || []).find(r => r.id === id);
  if (!item) return;

  // Ask for Mode: Solo vs Ayudante
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
    // If dismissed by close button or clicking outside -> Do nothing
    if (result.dismiss === Swal.DismissReason.backdrop || result.dismiss === Swal.DismissReason.close) {
      return;
    }

    // Determine Mode based on button clicked
    // SweetAlert 'confirm' is "Solo" (as per confirmButtonText)
    // SweetAlert 'cancel' is "Helping" (as per cancelButtonText) but 'cancel' usually rejects promise or sets isConfirmed=false
    // We need to handle the "Cancel" button click as a valid selection, not a cancellation of the action.

    let modalidad = 'Solo';
    if (result.isConfirmed) {
      modalidad = 'Solo';
    } else if (result.dismiss === Swal.DismissReason.cancel) {
      modalidad = 'Ayudante';
    } else {
      return; // Unknown state
    }

    // Add to sales
    const venta = {
      timestamp: Date.now(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      hora: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      tipo: 'Camión',
      subtipo: modalidad, /* New Field */
      detalles: `Ruta: ${item.nombre} (${modalidad}) - ${item.direccion}`,
      cantidad: item.cantidad || 1,
      precioUnitario: `${formatCurrency(item.precio)}`,
      total: (item.precio * (item.cantidad || 1)),
      // Reporting Fields
      clienteId: item.clienteId || null,
      clienteNombre: item.nombre || 'Desconocido',
      estadoPago: item.pagado ? 'pagado' : 'pendiente'
    };

    window.ventasRef.add(venta).then(() => {
      // Remove from route
      const rutaRef = window.db.collection("ruta_dia");
      rutaRef.doc(id).delete();

      // Toast Success
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
};


// --- LISTENER RUTA DIA (For Live Updates) ---
(function () {
  const rutaRef = window.db.collection("ruta_dia");
  let previousRouteCount = -1;

  rutaRef.onSnapshot(snapshot => {
    window.rutaDiaList = [];
    snapshot.forEach(doc => {
      window.rutaDiaList.push({ id: doc.id, ...doc.data() });
    });

    // Sort logic (timeA - timeB)
    window.rutaDiaList.sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.seconds : 0;
      const timeB = b.createdAt ? b.createdAt.seconds : 0;
      return timeA - timeB;
    });

    // Check for new items
    if (previousRouteCount !== -1 && window.rutaDiaList.length > previousRouteCount) {
      if (typeof playNotificationBeep === 'function') playNotificationBeep();
      if (Notification.permission === "granted") {
        const newItem = window.rutaDiaList[window.rutaDiaList.length - 1];
        new Notification("🚚 Nuevo Pedido en Ruta", {
          body: `Cliente: ${newItem.nombre || 'Nuevo'}`,
        });
      }
    }

    previousRouteCount = window.rutaDiaList.length;

    // Render
    if (typeof window.renderRutaDia === 'function') window.renderRutaDia();

  }, err => console.error("Error ruta listener:", err));
})();

// --- LISTENER CLIENTES MAIN ---
(function () {
  // Ensure Reference Exists (from globals)
  const ref = window.clientesRef || window.db.collection("clientes");

  ref.onSnapshot(snapshot => {
    window.listaClientes = [];
    snapshot.forEach(doc => {
      window.listaClientes.push({ id: doc.id, ...doc.data() });
    });
    // Sort client-side
    window.listaClientes.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    // Render List if visible
    if (typeof window.renderClientesList === 'function') {
      window.renderClientesList(); // Update global list
    }
  }, (error) => {
    console.error("Error loading clients:", error);
  });
})();

// --- 💸 GESTIÓN DE DEUDAS ---
window.toggleDebtsModal = function () {
  const modal = document.getElementById('modalDebts');
  if (!modal) return;
  if (modal.style.display === 'flex') {
    modal.style.display = 'none';
  } else {
    modal.style.display = 'flex';
    loadPendingDebts();
  }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
  const modal = document.getElementById('modalDebts');
  if (e.target === modal) window.toggleDebtsModal();
});

function loadPendingDebts() {
  const container = document.getElementById('pendingDebtsList');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Cargando...</div>';

  // Query only "pendiente" status
  window.db.collection('ventas')
    .where('estadoPago', '==', 'pendiente')
    .limit(100)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">No hay deudas pendientes registradas.</div>';
        return;
      }

      const debts = [];
      snapshot.forEach(doc => debts.push({ id: doc.id, ...doc.data() }));

      // Sort Client Side
      debts.sort((a, b) => {
        const timeA = a.timestamp ? (typeof a.timestamp === 'number' ? a.timestamp : (a.timestamp.seconds * 1000)) : 0;
        const timeB = b.timestamp ? (typeof b.timestamp === 'number' ? b.timestamp : (b.timestamp.seconds * 1000)) : 0;
        return timeB - timeA;
      });

      // Render
      container.innerHTML = debts.map(d => {
        let dateStr = "---";
        if (d.timestamp) {
          if (d.timestamp.seconds) {
            dateStr = new Date(d.timestamp.seconds * 1000).toLocaleDateString();
          } else if (typeof d.timestamp === 'number') {
            dateStr = new Date(d.timestamp).toLocaleDateString();
          }
        }

        return `
                <div style="background:rgba(255,255,255,0.05); padding:12px; border-radius:8px; margin-bottom:8px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:600; color:var(--text-main); font-size:15px;">${d.clienteNombre || 'Cliente'}</div>
                        <div style="font-size:12px; color:var(--text-muted);">
                            📅 ${dateStr} • ${d.cantidad} botellones
                        </div>
                        <div style="font-size:12px; color:#ff6b6b; margin-top:2px;">
                            ${d.detalles || ''}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:bold; font-size:16px; color:#ff6b6b; margin-bottom:6px;">${formatCurrency(d.total)}</div>
                        <button onclick="markAsPaid('${d.id}')" class="btn-sm" style="background:var(--success); color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">
                            <i class="bi bi-check-lg"></i> Pagar
                        </button>
                    </div>
                </div>
                `;
      }).join('');
    })
    .catch(err => {
      console.error("Error loading debts:", err);
      container.innerHTML = '<div style="text-align:center; color:red;">Error cargando datos</div>';
    });
}

window.markAsPaid = function (id) {
  if (!confirm("¿Marcar esta deuda como PAGADA? Se actualizará el historial.")) return;

  window.db.collection('ventas').doc(id).update({
    estadoPago: 'pagado',
    pagadoEl: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    // Update Local Data (ventasDelDia) if loaded
    if (window.ventasDelDia) {
      const ventaLocal = window.ventasDelDia.find(v => v.id === id);
      if (ventaLocal) {
        ventaLocal.estadoPago = 'pagado';
        ventaLocal.pagadoEl = new Date();
      }
    }

    // Check active view and force refresh
    if (typeof window.filtrarHistorial === 'function') window.filtrarHistorial();

    // Re-load debts in modal
    loadPendingDebts();

    alert("Deuda saldada correctamente");
  }).catch(err => alert("Error al actualizar"));
}

// --- 📍 GPS & UBICACIÓN ---
window.fijarUbicacionCliente = function (id) {
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
        let msg = "Error al obtener la ubicación.";
        if (error.code === 1) msg = "Debes permitir el acceso al GPS para fijar la ubicación.";
        Swal.fire('Error', msg, 'error');
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    }
  });
};

window.gestionarUbicacion = function (id, lat, lng) {
  if (!lat || lat === 'null') {
    // No existe ubicación -> Fijar nueva
    fijarUbicacionCliente(id);
  } else {
    // Ya existe -> Mostrar Opciones
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
        // Navegar
        verUbicacionCliente(lat, lng);
      } else if (result.isDenied) {
        // Actualizar (Sobreescribir)
        fijarUbicacionCliente(id);
      }
    });
  }
};

window.verUbicacionCliente = function (lat, lng) {
  // URL para navegación en Google Maps
  const url = "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lng;
  window.open(url, "_blank");
};
