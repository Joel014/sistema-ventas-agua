// Firebase Config & Init moved to js/globals.js


// --- 🔹 FUNCIÓN PARA GUARDAR VENTA ---
window.guardarVenta = function () {
  const ventaLocal = parseInt(document.getElementById('ventaLocal').value) || 0;
  const camion = parseInt(document.getElementById('camion').value) || 0;

  // Ejemplo simple (puedes incluir más datos luego)
  const nuevaVenta = {
    ventaLocal,
    camion,
    fecha: new Date(),
  };

  ventasRef.add(nuevaVenta)
    .then(() => {
      alert("✅ Venta guardada correctamente en Firestore");
      console.log("Venta guardada:", nuevaVenta);
    })
    .catch((error) => {
      console.error("❌ Error al guardar venta:", error);
      alert("Ocurrió un error al guardar la venta");
    });
};


// Encapsular todo para evitar fugas globales
(function () {
  // Globals moved to js/globals.js
  // Accessing window variables directly now


  const PRECIO_LOCAL = 25;
  const PRECIO_CAMION = 30; // Updated to 30 as requested
  const PRECIO_DELIVERY = 35;

  // Utils moved to js/utils.js


  function guardarEnStorage() {
    if (typeof Storage === 'undefined') return;
    const datos = {
      fecha: new Date().toDateString(),
      ventas: ventasDelDia,
      contador: contadorVentas,
      empleados: empleados
    };
    localStorage.setItem('ventasAguaDelDia', JSON.stringify(datos));
  }

  function cargarDesdeStorage() {
    if (typeof Storage === 'undefined') return;
    // The following lines seem to be intended for a different function (e.g., a navigation handler)
    // as `targetId` is not defined here and the `});` is syntactically incorrect.
    // I'm placing them as close as possible to the requested location, but they will likely cause errors
    // or not function as intended without `targetId` being defined.
    // If this code is meant for a navigation function, please provide that function's context.
    // if (targetId === 'historial') {
    //     console.log("Navigating to Historial - Forcing Table Update");
    //     actualizarTablaRegistros();
    // }
    // // Save state
    // localStorage.setItem('awacorpHLastView', targetId);
    // }); // This closing parenthesis is syntactically incorrect here.

    const datosGuardados = localStorage.getItem('ventasAguaDelDia');
    if (!datosGuardados) return;
    try {
      const datos = JSON.parse(datosGuardados);
      const hoy = new Date().toDateString();
      if (datos.fecha === hoy) {
        ventasDelDia = datos.ventas || [];
        contadorVentas = datos.contador || 0;
        empleados = datos.empleados || [];
      }
    } catch (e) {
      console.log('Error cargando storage', e);
    }
  }

  // ---------- EMPLEADOS ----------
  window.agregarEmpleado = async function () {
    const { value: nombre } = await Swal.fire({
      title: 'Nuevo Repartidor',
      input: 'text',
      inputLabel: 'Nombre del repartidor',
      inputPlaceholder: 'Ej: Juan',
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar'
    });

    if (!nombre || !nombre.trim()) return;

    if (empleados.some(e => e.nombre.toLowerCase() === nombre.trim().toLowerCase())) {
      Swal.fire('Error', 'Ya existe un repartidor con ese nombre', 'error');
      return;
    }

    // Firestore Add
    empleadosRef.add({
      nombre: nombre.trim(),
      active: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
      .then(() => {
        Swal.fire('Agregado', 'Repartidor agregado a la nube', 'success');
      })
      .catch(err => {
        console.error(err);
        Swal.fire('Error', 'No se pudo guardar en nube', 'error');
      });
  };

  window.eliminarEmpleado = function (id) {
    const emp = empleados.find(e => e.id === id);
    if (!emp) return;
    if (!confirm(`¿Eliminar al repartidor "${emp.nombre}" de la nube?`)) return;

    // Check for string ID (Firestore)
    if (typeof id === 'number') {
      alert("Este repartidor es local/antiguo. Se borrará localmente.");
      empleados = empleados.filter(e => e.id !== id);
      actualizarEmpleadosVisual();
      return;
    }

    empleadosRef.doc(id).delete()
      .then(() => {
        // calculatedTotal triggers optionally if needed, but snapshot will update list
      })
      .catch(err => { console.error(err); alert("Error al eliminar"); });
  };

  function calculateDailyChange(currentValue, type) {
    if (!allRecentVentas) return null;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    // Filter yesterday's sales
    const yesterSales = allRecentVentas.filter(v => {
      const d = getFechaFromId(v);
      return d.toDateString() === yesterdayStr;
    });

    // Calculate total for yesterday based on type
    let yesterTotal = 0;
    yesterSales.forEach(v => {
      if (type === 'money') yesterTotal += (Number(v.total) || 0);
      if (type === 'bottles') yesterTotal += (Number(v.totalBotellones) || Number(v.cantidad) || 0);
    });

    if (yesterTotal === 0) return { percent: 0, show: false, val: 0 };

    const diff = currentValue - yesterTotal;
    const percent = ((diff / yesterTotal) * 100).toFixed(1);

    return {
      percent: percent,
      show: true,
      val: yesterTotal,
      positive: diff >= 0
    };
  }

  function actualizarEmpleadosVisual() {
    const container = document.getElementById('repartidoresList');
    if (!container) return;
    if (empleados.length === 0) {
      container.innerHTML = '<div style="color:#999; font-style:italic; grid-column:1 / -1">No hay repartidores agregados</div>';
      return;
    }

    container.innerHTML = empleados.map(emp => `
        <div style="display:flex; flex-direction:column; background:rgba(255,255,255,0.03); padding:12px; border-radius:12px; border:1px solid var(--border); margin-bottom:10px; transition: transform 0.2s;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:36px; height:36px; background:rgba(0,194,255,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--primary);">
                        <i class="bi bi-person-fill" style="font-size:18px;"></i>
                    </div>
                    <span style="font-weight:600; font-size:15px; color:var(--text-main); letter-spacing:0.3px;">${emp.nombre}</span>
                </div>
                 <button onclick="eliminarEmpleado('${emp.id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer; padding:6px; border-radius:50%; transition:all 0.2s;" onmouseover="this.style.color='var(--danger)'; this.style.backgroundColor='rgba(231,29,54,0.1)'" onmouseout="this.style.color='var(--text-muted)'; this.style.backgroundColor='transparent'">
                    <i class="bi bi-trash3" style="font-size:16px;"></i>
                </button>
            </div>
            <div style="display:flex; gap:10px; align-items:stretch;">
                 <input type="number" min="0" placeholder="Cant." class="empleado-cantidad" data-emp-id="${emp.id}" style="flex:1; background:var(--bg-dark); border:1px solid var(--border); border-radius:8px; padding:10px; color:white; text-align:center; font-size:16px; font-weight:500;">
                 <button onclick="guardarIndividual('empleado-${emp.id}')" style="background:var(--primary); border:none; border-radius:8px; width:48px; color:#000; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:20px; box-shadow:0 4px 12px rgba(0,194,255,0.3); transition: transform 0.1s;" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">
                    <i class="bi bi-check-lg"></i>
                 </button>
            </div>
        </div>
      `).join('');
  }

  // ---------- CÁLCULOS ----------
  window.calcularTotal = function () {
    const ventaLocal = parseInt(document.getElementById('qtyLocal').value) || 0;
    const camion = parseInt(document.getElementById('qtyCamion').value) || 0;
    const inputs = document.querySelectorAll('.empleado-cantidad');
    let totalDelivery = 0;
    inputs.forEach(i => totalDelivery += (parseInt(i.value) || 0));

    const totalBotellones = ventaLocal + totalDelivery + camion;
    const totalLocal = ventaLocal * PRECIO_LOCAL;
    const totalDeliveryMonto = totalDelivery * PRECIO_DELIVERY;
    const totalCamion = camion * PRECIO_CAMION;
    const totalGeneral = totalLocal + totalDeliveryMonto + totalCamion;

    // Totales en UI - IDs en HTML: dashBotellones? No, totalPagar etc en vista planta?
    // Revisando HTML: totalLocal input readonly, totalCamion input readonly...
    // HTML de vista planta tiene: 
    // Venta Local total hoy: id="totalLocal" (es el acumulado del dia? o total de la venta actual?)
    // En el HTML original `totalLocal` parece ser el acumulado del día (line 180).
    // Pero aquí `calcularTotal` parece querer mostrar el total de la *transacción actual*?
    // El script original tenia `totalPagar`, `montoFinal`, `tipoServicio`... 
    // Esos IDs NO existen en el HTML actual (Step 249).
    // El HTML actual es más simple, no tiene un "panel lateral de totales de transacción".
    // Por lo tanto, `calcularTotal` tal como está NO SIRVE para el diseño actual.
    // En el diseño actual, el usuario mete cantidad y da click.
    // Sin embargo, hay inputs readonly `totalLocal`, `totalCamion`, `totalOtro` que parecen ser "Total Hoy".
    // Esos se actualizan en `actualizarTotalDiario`.

    // Entonces `calcularTotal` está sobrando o está mal conceptualizada para este HTML.
    // Voy a VACIAR `calcularTotal` para que no de errores, y enfocarme en que los botones guarden.
    // O mejor, si hay listeners 'input', quizás querían feedback inmediato?
    // Pero no hay donde mostrarlo.
    // Voy a dejarla vacía para evitar crashes.
  };

  window.agregarGasto = function () {
    const descInput = document.getElementById('gastoDesc');
    const montoInput = document.getElementById('gastoMonto');
    const descripcion = descInput.value.trim();
    const monto = parseFloat(montoInput.value) || 0;

    if (!descripcion || monto <= 0) {
      alert("Ingrese descripción y monto válido");
      return;
    }

    const nuevoGasto = {
      tipo: 'Gasto',
      descripcion: descripcion,
      detalles: descripcion, // Fallback for reports
      cantidad: 1, // Dummy for reports
      precioUnitario: monto,
      total: -Math.abs(monto), // Negative for easy summing
      fecha: new Date().toISOString(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    ventasRef.add(nuevoGasto)
      .then(() => {
        descInput.value = '';
        montoInput.value = '';
        mostrarConfirmacion('gastos', 'Gasto registrado correctamente');
      })
      .catch(err => {
        console.error("Error al guardar gasto:", err);
        alert("No se pudo guardar el gasto");
      });
  };

  function configurarEventListeners() {
    // Bind Buttons
    console.log("Configurando Event Listeners...");

    const btnLocal = document.getElementById('btnLocal');
    if (btnLocal) {
      console.log("btnLocal encontrado, asignando listener");
      btnLocal.addEventListener('click', () => {
        console.log("Click en Venta Local");
        guardarIndividual('ventaLocal');
      });
    } else {
      console.error("btnLocal NO encontrado");
    }

    const btnCamion = document.getElementById('btnCamion');
    if (btnCamion) btnCamion.addEventListener('click', () => guardarIndividual('camion'));

    const btnOtro = document.getElementById('btnOtro');
    if (btnOtro) btnOtro.addEventListener('click', guardarOtroServicio);
    setupNavigation();
    setupProduccionListeners(); // <--- NUEVO
    cargarUltimaLectura();      // <--- NUEVO

    // Listeners globales con seguridad
    const btnSubmit = document.getElementById('btnSubmit');
    if (btnSubmit) btnSubmit.addEventListener('click', agregarVenta);

    const btnGasto = document.getElementById('btnGasto');
    if (btnGasto) btnGasto.addEventListener('click', agregarGasto);

    const btnAddRepartidor = document.getElementById('btnAddRepartidor');
    if (btnAddRepartidor) btnAddRepartidor.addEventListener('click', agregarEmpleado);
  }

  // ---------- VENTAS ----------
  window.guardarVenta = function () {
    const ventaLocal = parseInt(document.getElementById('ventaLocal').value) || 0;
    const camion = parseInt(document.getElementById('camion').value) || 0;
    const inputs = document.querySelectorAll('.empleado-cantidad');
    let totalDelivery = 0;
    const entregas = [];
    inputs.forEach(i => {
      const cantidad = parseInt(i.value) || 0;
      if (cantidad > 0) {
        const empId = parseInt(i.getAttribute('data-emp-id'));
        const emp = empleados.find(e => e.id === empId);
        if (emp) entregas.push({ empleadoId: emp.id, nombre: emp.nombre, cantidad });
        totalDelivery += cantidad;
      }
    });

    if (ventaLocal === 0 && totalDelivery === 0 && camion === 0) { alert('⚠️ Debe ingresar al menos un botellón para guardar la venta'); return; }

    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const totalBotellones = ventaLocal + totalDelivery + camion;
    const totalLocal = ventaLocal * PRECIO_LOCAL;
    const totalDeliveryMonto = totalDelivery * PRECIO_DELIVERY;
    const totalCamion = camion * PRECIO_CAMION;
    const totalGeneral = totalLocal + totalDeliveryMonto + totalCamion;

    const tiposActivos = [];
    if (ventaLocal > 0) tiposActivos.push('Local');
    if (totalDelivery > 0) tiposActivos.push('Delivery');
    if (camion > 0) tiposActivos.push('Camión');

    const tipoServicio = tiposActivos.length === 0 ? '-' : (tiposActivos.length === 1 ? tiposActivos[0] : 'Mixto');
    const precioUnitario = tiposActivos.length === 1
      ? (tipoServicio === 'Local' ? `${formatCurrency(PRECIO_LOCAL)}` : tipoServicio === 'Delivery' ? `${formatCurrency(PRECIO_DELIVERY)}` : `${formatCurrency(PRECIO_CAMION)}`)
      : 'Var.';

    const detallesEntregas = entregas.length > 0 ? entregas.map(e => `${e.nombre}(${e.cantidad})`).join(', ') : '';

    const nuevaVenta = {
      id: ++contadorVentas,
      hora,
      tipo: tipoServicio,
      ventaLocal,
      totalDelivery,
      entregasDelivery: entregas,
      detallesEntregas: detallesEntregas,
      camion,
      totalBotellones,
      precioUnitario,
      total: totalGeneral
    };

    ventasDelDia.push(nuevaVenta);
    actualizarTablaRegistros();
    actualizarTotalDiario();
    renderRecentActivity();
    guardarEnStorage();
    limpiarFormulario();

    // Feedback visual
    const btnGuardar = document.querySelector('.btn-primary'); // Generic fallback
    if (btnGuardar) {
      // ...
    }
  };

  // Guardar individual (ventaLocal, camion o empleado-<id>)
  window.guardarIndividual = function (campo) {
    console.log(`💾 guardarIndividual called for: ${campo}`);
    if (!campo) { console.error("guardarIndividual called with empty campo"); return; }

    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    if (campo === 'ventaLocal') {
      const cantidad = parseInt(document.getElementById('qtyLocal').value) || 0;
      if (cantidad <= 0) {
        alert('Ingresa una cantidad mayor a 0 para venta local');
        return;
      }
      const total = cantidad * PRECIO_LOCAL;
      const venta = {
        timestamp: Date.now(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        hora,
        tipo: 'Local',
        detalles: '-',
        cantidad,
        precioUnitario: `${formatCurrency(PRECIO_LOCAL)}`,
        total
      };

      ventasRef.add(venta)
        .then(() => {
          document.getElementById('qtyLocal').value = '';
          mostrarConfirmacion('💾 Venta local guardada en nube', '#56ab2f');
        })
        .catch(err => { console.error(err); alert("Error guardando venta"); });
      return;
    }

    if (campo === 'camion') {
      const cantidad = parseInt(document.getElementById('qtyCamion').value) || 0;
      if (cantidad <= 0) {
        alert('Ingresa una cantidad mayor a 0 para camión');
        return;
      }

      // Obtener descripción (modo + comentario)
      // Obtener descripción (modo + comentario)
      const mode = document.querySelector('input[name="camionMode"]:checked');
      if (!mode) {
        alert('⚠️ Por favor selecciona una MODALIDAD (Solo o Ayudante)');
        return;
      }
      const modeVal = mode.value;
      const comment = document.getElementById('commentCamion').value.trim();
      const descripcion = (modeVal === 'solo' ? 'Solo' : 'Ayudante') + (comment ? ` - ${comment}` : '');

      const total = cantidad * PRECIO_CAMION;
      // CHECK CLIENT SELECTOR
      const clientSelector = document.getElementById('clienteCamionSelector');
      let finalPrice = PRECIO_CAMION; // Default 30
      let clientDetails = '';

      if (clientSelector && clientSelector.value) {
        // A specific client is selected
        const selectedOption = clientSelector.options[clientSelector.selectedIndex];
        const customPrice = parseFloat(selectedOption.getAttribute('data-precio'));
        if (!isNaN(customPrice)) {
          finalPrice = customPrice;
        }

        // Find client info for details
        const clientData = listaClientes.find(c => c.id === clientSelector.value);
        if (clientData) {
          clientDetails = ` | Cliente: ${clientData.nombre} (${clientData.direccion || ''})`;
        }
      }

      const totalCalculado = cantidad * finalPrice;

      const cantidadVacios = parseInt(document.getElementById('qtyCamionVacios').value) || 0;

      const venta = {
        timestamp: Date.now(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        hora,
        tipo: 'Camión',
        detalles: (descripcion || '-') + clientDetails,
        cantidad,
        botellonesVacios: cantidadVacios, // Save empty bottles
        precioUnitario: `${formatCurrency(finalPrice)}`, // Show the price used
        total: totalCalculado,
        // Reporting Fields
        clienteId: (clientSelector && clientSelector.value) ? clientSelector.value : null,
        clienteNombre: (clientSelector && clientSelector.value && clientSelector.options[clientSelector.selectedIndex]) ? clientSelector.options[clientSelector.selectedIndex].text.split(' - ')[0] : 'Casual',
        estadoPago: 'pagado' // Default for manual POS sales
      };

      ventasRef.add(venta)
        .then(() => {
          document.getElementById('qtyCamion').value = '';
          document.getElementById('qtyCamionVacios').value = ''; // Reset Empty bottles
          document.getElementById('commentCamion').value = '';
          if (mode) mode.checked = false;
          mostrarConfirmacion('💾 Venta de camión guardada en nube', '#f39c12');
        })
        .catch(err => { console.error(err); alert("Error guardando venta"); });
      return;
    }

    // empleado-<id>
    if (campo.startsWith('empleado-')) {
      const empId = campo.split('-')[1]; // Keep as string first to match ID logic

      // Try finding by ID first (most robust)
      let input = document.getElementById(`cant-${empId}`);

      // Fallback to data attribute if ID not found
      if (!input) {
        input = document.querySelector(`.empleado-cantidad[data-emp-id='${empId}']`);
      }

      if (!input) {
        console.error(`Input not found for ID: cant-${empId} or data-emp-id=${empId}`);
        alert('No se encontró la entrada del repartidor');
        return;
      }

      const cantidad = parseInt(input.value) || 0;
      if (cantidad <= 0) {
        alert('Ingresa una cantidad mayor a 0 para este repartidor');
        return;
      }
      const emp = empleados.find(e => e.id === empId);
      const total = cantidad * PRECIO_DELIVERY;
      const venta = {
        timestamp: Date.now(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        hora,
        tipo: 'Delivery',
        detalles: emp ? emp.nombre : 'Repartidor',
        cantidad,
        precioUnitario: `${formatCurrency(PRECIO_DELIVERY)}`,
        total
      };

      ventasRef.add(venta)
        .then(() => {
          input.value = '';
          mostrarConfirmacion(`💾 Entrega de ${emp ? emp.nombre : 'repartidor'} guardada en nube`, '#c0392b');
        })
        .catch(err => { console.error(err); alert("Error guardando venta"); });
      return;
    }
  };


  // ---------- GASTOS ----------
  window.guardarGasto = function () {
    const monto = parseFloat(document.getElementById('gastoMonto').value) || 0;
    const categoria = document.getElementById('gastoCategoria').value;
    const nota = document.getElementById('gastoDesc').value.trim();

    if (monto <= 0) { alert('⚠️ Por favor ingresa un monto válido'); document.getElementById('gastoMonto').focus(); return; }
    if (!categoria) { alert('⚠️ Selecciona una CATEGORÍA para el gasto'); document.getElementById('gastoCategoria').focus(); return; }

    // Construct description: "Combustible - Gasolina Camion" or just "Combustible"
    const descripcionFinal = categoria + (nota ? ` - ${nota}` : '');

    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const nuevoGasto = {
      timestamp: Date.now(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      hora,
      tipo: 'Gasto',
      categoria: categoria, // Structured Field
      descripcion: descripcionFinal,
      detalles: descripcionFinal,
      cantidad: '-',
      precioUnitario: '-',
      total: -Math.abs(monto)
    };

    ventasRef.add(nuevoGasto)
      .then(() => {
        limpiarGastos();
        mostrarConfirmacion('💾 Gasto registrado correctamente', '#f39c12');
      })
      .catch(err => { console.error(err); alert("Error al guardar gasto"); });
  };

  function limpiarGastos() {
    document.getElementById('gastoMonto').value = '';
    document.getElementById('gastoDesc').value = '';
    const catSelect = document.getElementById('gastoCategoria');
    if (catSelect) {
      catSelect.value = ""; // Try resetting value
      catSelect.selectedIndex = 0; // Force index
    }
  }

  // ---------- OTROS SERVICIOS ----------
  window.guardarOtroServicio = function () {
    const precio = parseFloat(document.getElementById('priceOtro').value) || 0;
    const cantidad = parseInt(document.getElementById('qtyOtro').value) || 0;
    const descripcion = document.getElementById('descOtro').value.trim() || 'Sin descripción';

    if (precio <= 0) { alert('⚠️ Ingresa un precio válido'); document.getElementById('priceOtro').focus(); return; }
    if (cantidad <= 0) { alert('⚠️ Ingresa una cantidad válida'); document.getElementById('qtyOtro').focus(); return; }
    if (!descripcion) { alert('⚠️ Por favor describe el servicio'); document.getElementById('descOtro').focus(); return; }

    const total = precio * cantidad;
    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const nuevoServicio = {
      timestamp: Date.now(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      hora,
      tipo: 'Otros',
      detalles: descripcion,
      cantidad,
      precioUnitario: `${formatCurrency(precio)}`,
      total
    };

    ventasRef.add(nuevoServicio)
      .then(() => {
        limpiarOtrosServicios();
        mostrarConfirmacion('💾 Servicio guardado correctamente en nube', '#8e44ad');
      })
      .catch(err => { console.error(err); alert("Error guardando servicio"); });
  };

  function limpiarOtrosServicios() { document.getElementById('priceOtro').value = ''; document.getElementById('qtyOtro').value = ''; document.getElementById('descOtro').value = ''; }

  // ---------- TABLA ----------
  function actualizarTablaRegistros() {
    // Use the filter logic to render table (defaults to showing all history)
    filtrarHistorial();
  }

  function renderTableRows(tbody, data) {
    if (!data) return;
    tbody.innerHTML = data.map(registro => {
      const tipoLc = (registro.tipo || '').toLowerCase();
      let tipoClass = 'otros';
      if (tipoLc.includes('cam')) tipoClass = 'camion';
      else if (tipoLc.includes('loc')) tipoClass = 'local';
      else if (tipoLc.includes('mix')) tipoClass = 'mixto';
      else if (tipoLc.includes('del')) tipoClass = 'delivery';
      else if (tipoLc.includes('gas')) tipoClass = 'gasto';
      else if (tipoLc.includes('otr')) tipoClass = 'otros';

      let detalles = registro.detallesEntregas && registro.detallesEntregas.trim().length > 0 ? registro.detallesEntregas : registro.detalles || '-';

      // Simplify description for Route sales (Camión)
      if (registro.tipo === 'Camión' && detalles.startsWith('Ruta:')) {
        // Check for format: Ruta: [Name] - [Address] ([Status])
        // We want: [Name] ([Status])
        // Or just regex extract the name and status.
        try {
          const parts = detalles.split(' - ');
          if (parts.length >= 1) {
            let namePart = parts[0].replace('Ruta: ', '');
            // Status is usually at the end in parens or appended
            // Previous save format: Ruta: Name - Address (Paid/Pending)
            // Let's try to find the parens at the end
            const match = detalles.match(/\((Pagado|Pendiente)\)$/);
            const status = match ? match[0] : ''; // (Pagado)

            // If we have address part, it might complicate split.
            // Let's rely on the previous save format which was: `Ruta: ${item.nombre} - ${item.direccion} (${item.pagado ? 'Pagado' : 'Pendiente'})`
            // Actually I just changed it to include status.

            // Heuristic: Name is between "Ruta: " and " - "
            // Status is in parens at end.

            detalles = `${namePart} <span style="font-size:0.85em; opacity:0.8;">${status}</span>`;
          }
        } catch (e) { }
      }
      const cantidad = registro.totalBotellones || registro.cantidad || '-';
      const total = Number(registro.total) || 0;
      const color = total < 0 ? '#e74c3c' : '#27ae60';
      const textoTotal = total < 0 ? ('-' + formatCurrency(Math.abs(total))) : formatCurrency(total);
      const precioUnit = registro.precioUnitario || '-';

      // Calculate Date
      // Use getFechaFromId helper logic but inline or call it if available in scope.
      // We will duplicate logic slightly for safety or use the helper I added earlier 'getFechaFromId(registro)'
      // But verify 'getFechaFromId' is accessible. It is.
      let fechaStr = '-';
      try {
        const fs = getFechaFromId(registro);
        fechaStr = fs.toLocaleDateString();
      } catch (e) { fechaStr = 'Hoy'; }

      return `
        <tr class="venta-${tipoClass}" style="background:rgba(255,255,255,0.03); transition:transform 0.2s;">
            <td data-label="Fecha" style="padding:16px; border-radius:12px 0 0 12px;">${fechaStr}</td>
            <td data-label="Hora" style="padding:16px;">${registro.hora || '-'}</td>
            <td data-label="Tipo" style="padding:16px;"><span class="service-type ${tipoClass}">${registro.tipo || '-'}</span></td>
            <td data-label="Detalle" style="padding:16px; font-size:.95em; color:var(--text-main);">${detalles}</td>
            <td data-label="Cant." style="padding:16px;" class="text-right">${cantidad}</td>
            <td data-label="Precio" style="padding:16px;" class="text-right">${precioUnit}</td>
            <td data-label="Total" style="padding:16px; border-radius:0 12px 12px 0;" class="text-right" style="font-weight:700; color:${color};">${textoTotal}</td>
            <td data-label="Acción" style="padding:16px;"><button class="delete-btn" onclick="eliminarRegistro('${registro.id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer;"><i class="bi bi-trash"></i></button></td>
          </tr >
        `;

    }).join('');
  }

  // ---------- PRODUCCION TABLE ----------
  function renderProductionTableRows(tbody, history) {
    if (!history) return;
    // Assuming the table header for production is: Fecha, Ayer, Hoy, Galones, Botellones, Acción
    // The instruction implies ensuring the header is correct, but only provides tbody content.
    // The data-label attributes are added    // Populate Table
    tbody.innerHTML = history.map(h => `
      <tr style="background:rgba(255,255,255,0.03);">
        <td data-label="Fecha" style="padding-left:15px; border-left:3px solid var(--primary);">${new Date(h.fecha + 'T00:00:00').toLocaleDateString()}</td>
        <td data-label="Ayer" style="text-align:center">${h.ayer}</td>
        <td data-label="Hoy" style="text-align:center">${h.hoy}</td>
        <td data-label="Galones" style="text-align:center; font-weight:bold; color:var(--primary);">${h.galones}</td>
        <td data-label="Botellones" style="text-align:center; font-weight:bold; color:var(--success);">${h.botellones}</td>
        <td data-label="Acción">
           <button class="delete-btn" onclick="eliminarProduccion('${h.id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer;"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
  }

  window.eliminarRegistro = function (id) {
    if (!confirm('¿Está seguro de eliminar este registro de la nube?')) return;

    // Check if ID is string (Firestore) or number (Legacy)
    // If number, we can't delete easily unless we search for it or just ignore (legacy data might stay)
    if (typeof id === 'number') {
      alert("Este registro es local/antiguo y no se puede borrar de la nube directamente.");
      // Optional: Remove locally
      ventasDelDia = ventasDelDia.filter(r => r.id !== id);
      actualizarTablaRegistros(); actualizarTotalDiario();
      return;
    }

    ventasRef.doc(id).delete()
      .then(() => {
        mostrarConfirmacion('🗑️ Registro eliminado', '#c0392b');
      })
      .catch(err => console.error(err));
  };

  // Old Reports Logic Removed (Now in js/reports.js)



  function actualizarTotalDiario() {
    let totalDinero = 0;
    let totalLocal = 0;
    let totalDelivery = 0;
    let totalCamion = 0;
    let totalBotellones = 0;
    let totalOtro = 0;
    let totalGastos = 0;

    if (ventasDelDia) {
      ventasDelDia.forEach(r => {
        const val = Number(r.total) || 0;

        // Sumar al total global (Gastos ya vienen negativos)
        totalDinero += val;

        if (r.tipo === 'Gasto') {
          totalGastos += Math.abs(val);
        } else {
          // Si NO es Gasto, sumamos botellones/cantidades
          // (Evita sumar cantidad de dummy gastos)
          const qty = Number(r.cantidad) || 0;
          totalBotellones += qty;

          if (r.tipo === 'Local') totalLocal += qty;
          if (r.tipo === 'Delivery') totalDelivery += qty;
          if (r.tipo === 'Camión') totalCamion += qty;
          if (r.tipo === 'Otros') totalOtro += qty;
        }
      });
    }

    // Totales Panel Planta (Inputs)
    const elTotalLocal = document.getElementById('totalLocal');
    if (elTotalLocal) elTotalLocal.value = totalLocal;

    const elTotalCamion = document.getElementById('totalCamion');
    if (elTotalCamion) elTotalCamion.value = totalCamion;

    const elTotalOtro = document.getElementById('totalOtro');
    if (elTotalOtro) elTotalOtro.value = totalOtro;

    const elTotalGastos = document.getElementById('totalGastos');
    if (elTotalGastos) {
      elTotalGastos.value = formatCurrency(totalGastos);
      // Auto-resize width based on content length (approximate)
      elTotalGastos.style.width = (elTotalGastos.value.length + 2) + 'ch';
    }

    // Reuse calculated values for Dashboard
    const totalTx = ventasDelDia.length;

    // Debt Calculation
    // We scan ALL ventas (limit 500) for pending debts, not just today's.
    // However, 'ventasDelDia' is just today.
    // Let's use 'allRecentVentas' for debt to be more accurate if available, 
    // OR fetch a dedicated query for 'pending'.
    // For now, let's rely on the dedicated 'loadPendingDebts' logic for the modal, 
    // but for the DASHBOARD CARD, we need a quick sum.
    // 'allRecentVentas' contains recent 500. It's a good proxy.
    const pendingDebt = allRecentVentas.reduce((acc, curr) => {
      if (curr.estadoPago === 'pendiente') {
        return acc + (Number(curr.total) || 0);
      }
      return acc;
    }, 0);


    // Update UI
    if (document.getElementById('dashTotal')) {
      document.getElementById('dashTotal').textContent = formatCurrency(totalDinero);

      // Growth Indicator (Money)
      const diffMoney = calculateDailyChange(totalDinero, 'money');
      const diffEl = document.getElementById('diffTotal');
      if (diffEl && diffMoney && diffMoney.show) {
        const icon = diffMoney.positive ? 'bi-arrow-up-short' : 'bi-arrow-down-short';
        const color = diffMoney.positive ? '#2ecc71' : '#e74c3c';
        diffEl.innerHTML = `<i class="bi ${icon}" style="color:${color}; font-size:14px;"></i> <span style="color:${color}">${Math.abs(diffMoney.percent)}%</span> <span style="opacity:0.7">vs ayer $${diffMoney.val.toLocaleString()}</span>`;
      } else if (diffEl) {
        diffEl.innerHTML = '<span style="opacity:0.5">- vs ayer</span>';
      }
    }

    if (document.getElementById('dashBotellones')) {
      document.getElementById('dashBotellones').textContent = totalBotellones;

      // Growth Indicator (Bottles)
      const diffBottles = calculateDailyChange(totalBotellones, 'bottles');
      const diffEl = document.getElementById('diffBotellones');
      if (diffEl && diffBottles && diffBottles.show) {
        const icon = diffBottles.positive ? 'bi-arrow-up-short' : 'bi-arrow-down-short';
        const color = diffBottles.positive ? '#00c2ff' : '#e74c3c';
        diffEl.innerHTML = `<i class="bi ${icon}" style="color:${color}; font-size:14px;"></i> <span style="color:${color}">${Math.abs(diffBottles.percent)}%</span>`;
      } else if (diffEl) {
        diffEl.innerHTML = '<span style="opacity:0.5">- vs ayer</span>';
      }
    }

    if (document.getElementById('dashTransacciones')) document.getElementById('dashTransacciones').textContent = totalTx;
    if (document.getElementById('dashDeuda')) document.getElementById('dashDeuda').textContent = formatCurrency(pendingDebt);

    // Virtual Stock Calculation
    // Stock = (Prod Hoy - Venta Botellones Hoy)
    const lblStock = document.getElementById('dashStock');
    const lblStockDetail = document.getElementById('dashStockDetail');

    if (lblStock) {
      // Get production from calculateProduccion (it reads inputs)
      // Or better, define global var for 'produccionHoy' updated there.
      // Let's read the inputs directly if they exist
      const prodHoy = parseFloat(document.getElementById('calcBotellones') ? document.getElementById('calcBotellones').textContent : 0) || 0;

      // Sales Today (Botellones) = totalBotellones
      const stockEstimado = prodHoy - totalBotellones;

      lblStock.textContent = (stockEstimado > 0 ? "+" : "") + Math.floor(stockEstimado);
      lblStock.style.color = stockEstimado < 0 ? '#e74c3c' : '#9b59b6';

      if (lblStockDetail) {
        lblStockDetail.textContent = `Prod: ${Math.floor(prodHoy)} - Venta: ${totalBotellones}`;
      }
    }
    actualizarReportes();
  }


  // ---------- LIMPIAR ----------
  window.limpiarFormulario = function () {
    document.getElementById('ventaLocal').value = '';
    document.getElementById('camion').value = '';
    const inputs = document.querySelectorAll('.empleado-cantidad');
    inputs.forEach(i => i.value = '');
    calcularTotal();
  };

  window.limpiarRegistros = function () {
    if (!confirm('¿Está seguro de eliminar todos los registros del día?')) return;
    ventasDelDia = []; contadorVentas = 0; actualizarTablaRegistros(); actualizarTotalDiario(); guardarEnStorage();
  };

  // ---------- EXPORTAR ----------
  window.exportarCSV = function () {
    if (ventasDelDia.length === 0) { alert('⚠️ No hay registros para exportar'); return; }
    const fecha = new Date().toLocaleDateString('es-ES');
    const header = ['Fecha', 'Hora', 'Tipo', 'Detalles', 'Cantidad', 'Precio Unit.', 'Total'];
    const rows = [header];

    ventasDelDia.forEach(registro => {
      const detalles = registro.detallesEntregas || registro.detalles || '';
      const cantidad = registro.totalBotellones || registro.cantidad || '';
      const precioUnitario = registro.precioUnitario ? registro.precioUnitario.toString() : '';
      const total = registro.total || '';

      rows.push([fecha, registro.hora || '', registro.tipo || '', detalles, cantidad, precioUnitario, total]);
    });

    const csvContent = rows.map(r => r.map(c => escapeCSV(c)).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ventas_agua_${fecha.replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('✅ Archivo CSV exportado correctamente!');
  };

  // ---------- FEEDBACK ----------
  function mostrarConfirmacion(mensaje, color) {
    const notification = document.createElement('div');
    notification.style.cssText = `position: fixed; top: 20px; right: 20px; background:${color}; color: white; padding: 12px 16px; border - radius: 8px; box - shadow: 0 4px 12px rgba(0, 0, 0, 0.2); z - index: 9999; font - weight: 700; `;
    notification.textContent = mensaje;
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.opacity = '0'; notification.style.transform = 'translateY(-10px)'; setTimeout(() => notification.remove(), 300); }, 2600);
  }


  // -------// --- 🧭 NAVEGACIÓN ---
  function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    const title = document.querySelector('header h2');
    const viewTitleMap = {
      'dashboard': 'Panel Principal',
      'planta': 'Venta en Planta',
      'camion': 'Venta Camiones',
      'gastos': 'Registro de Gastos',
      'reportes': 'Reportes y Finanzas',
      'historial': 'Historial de Transacciones',
      'produccion': 'Registro de Producción'
    };

    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Activar botón
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Mostrar vista
        const targetTab = btn.getAttribute('data-tab');
        views.forEach(v => v.classList.remove('active'));
        const targetView = document.getElementById(`view-${targetTab}`);
        if (targetView) targetView.classList.add('active');

        // Actualizar título (móvil y desktop)
        if (title && viewTitleMap[targetTab]) {
          title.textContent = viewTitleMap[targetTab];
        }

        // Cerrar sidebar en móvil si se usa
        const sidebar = document.querySelector('.sidebar');
        if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
          sidebar.classList.remove('active');
        }
      });
    });
  }

  // --- 🚀 INICIALIZACIÓN ---
  // Old init function removed


  // ---------- AUTH & LIFECYCLE ----------
  let currentUser = null; // Global reference for the current user

  // --- Listener de Autenticación ---
  firebase.auth().onAuthStateChanged((user) => {
    const loginView = document.getElementById('view-login');
    const appContent = document.getElementById('app-content');

    if (user) {
      console.log("Usuario autenticado:", user.email);
      currentUser = user; // Global ref if needed
      if (loginView) loginView.style.display = 'none';
      if (appContent) appContent.style.display = 'flex'; // Restore flex layout

      // Initialize App Logic
      init();

      // Apply RBAC
      const role = updateUIForRole(user.email);

      // Filter History for Camion Role
      // We override the 'filtrarHistorial' or data fetching?
      // Better to filter "allRecentVentas" at the source (onSnapshot) or just before render.
      // Let's attach role to window or global scope used by init/snapshot
      window.currentUserRole = role;

      // Initial UI Update done by init -> actual renders
      // But init is async in setting up listeners.
      // The listeners will fire and check 'currentUserRole'.

    } else {
      // No user is signed in.
      console.log("No hay usuario autenticado");
      if (appContent) appContent.style.display = 'none';
      if (loginView) loginView.style.display = 'flex';
    }
  });

  // Listeners Globales (fuera de init para que funcionen siempre)
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const pass = document.getElementById('loginPass').value;
      const btn = loginForm.querySelector('button');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Entrando...';

      firebase.auth().signInWithEmailAndPassword(email, pass)
        .then((userCredential) => {
          // Signed in
          // onAuthStateChanged se encargará del resto
          btn.disabled = false;
          btn.textContent = originalText;
        })
        .catch((error) => {
          btn.disabled = false;
          btn.textContent = originalText;
          console.error(error);
          alert("Error de inicio de sesión: " + error.message);
        });
    });
  }

  // Logout buttons
  const btnLogout = document.getElementById('btnLogout');
  const btnMobileLogout = document.getElementById('btnMobileLogout');

  function doLogout() {
    firebase.auth().signOut().then(() => {
      alert("Sesión cerrada");
    }).catch((error) => {
      console.error(error);
    });
  }

  if (btnLogout) btnLogout.addEventListener('click', doLogout);
  if (btnMobileLogout) btnMobileLogout.addEventListener('click', doLogout);


  function configurarNavegacion() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    const pageTitle = document.getElementById('pageTitle');

    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active from all buttons
        navBtns.forEach(b => b.classList.remove('active'));
        // Add active to clicked
        btn.classList.add('active');

        // Get target view
        const tab = btn.getAttribute('data-tab');

        // Hide all views
        views.forEach(v => v.classList.remove('active'));

        // Show target view
        const targetView = document.getElementById(`view-${tab}`);
        if (targetView) {
          targetView.classList.add('active');

          if (tab === 'historial') {
            actualizarTablaRegistros();
          }

          // Delegación para inputs de empleados (this part was originally inside the target check)
          const repList = document.getElementById('repartidoresList');
          if (repList) {
            repList.addEventListener('input', function (e) {
              if (e.target && e.target.classList.contains('empleado-cantidad')) calcularTotal();
            });
          }
        } else {
          console.warn(`View not found: view-${tab}`);
        }

        // Update Title if exists
        const span = btn.querySelector('span');
        if (pageTitle && span) {
          pageTitle.textContent = span.textContent;
        }
      });
    });
  }

  // PRECIO_CAMION definition (assuming it's defined globally or in a similar scope)

  function actualizarFecha() {
    const dateElement = document.getElementById('currentDate');
    if (!dateElement) return;
    const now = new Date(); // Get current date for both display and reset check
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fe = now.toLocaleDateString('es-ES', options);
    dateElement.textContent = fe.charAt(0).toUpperCase() + fe.slice(1);

    // Check for Camion Total Reset (Days 1 and 16)
    checkCamionTotalReset(now);
  }

  function checkCamionTotalReset(date) {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    const todayStr = `${year}-${month}-${day}`;

    // Reset on day 1 (after 30/31) and day 16 (after 15)
    if (day === 1 || day === 16) {
      const lastReset = localStorage.getItem('camionTotalLastReset');
      if (lastReset !== todayStr) {
        // Perform Reset
        const totalCamionInput = document.getElementById('totalCamion');
        if (totalCamionInput) {
          totalCamionInput.value = ''; // Clear the input
          console.log("🚛 Total Camión reiniciado por corte de quincena/mes.");
        }
        localStorage.setItem('camionTotalLastReset', todayStr);
      }
    }
  }

  function renderRecentActivity() {
    const list = document.getElementById('recentActivityList');
    if (!list) return;

    if (!ventasDelDia || ventasDelDia.length === 0) {
      list.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">No hay actividad reciente</div>';
      return;
    }

    // Sort by timestamp desc (already sorted by Firestore if we use that list)
    // ventasDelDia is populated from snapshot which is ordered by createdAt desc.
    // So we just take the first 5.
    const recent = ventasDelDia.slice(0, 5);

    list.innerHTML = recent.map(t => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:40px; height:40px; border-radius:12px; background:rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; color:var(--primary);">
                    <i class="bi bi-${getIconForType(t.tipo)}"></i>
                </div>
                <div>
                    <div style="font-weight:500; color:var(--text-main);">
                        ${(function () {
        if (t.tipo === 'Gasto') return t.descripcion;
        if (t.tipo === 'Camión' && t.detalles && t.detalles.startsWith('Ruta:')) {
          // Simplify for Dashboard: Check Name and Status
          try {
            const nameMatch = t.detalles.match(/Ruta:\s*(.*?)\s*-/);
            const statusMatch = t.detalles.match(/\((Pagado|Pendiente)\)$/);
            const name = nameMatch ? nameMatch[1] : t.detalles;
            const status = statusMatch ? statusMatch[1] : '';

            return `${name} <span style="font-size:0.85em; opacity:0.75; margin-left:4px;">(${status})</span>`;
          } catch (e) { return t.detalles; }
        }
        return t.tipo + (t.detalles && t.detalles !== '-' ? ' (' + t.detalles + ')' : '');
      })()}
                    </div>
                    <div style="font-size:12px; color:var(--text-muted);">${t.hora || '-'}</div>
                </div>
            </div>
            <div style="font-weight:600; color:${t.tipo === 'Gasto' ? 'var(--danger)' : 'var(--success)'};">
                ${t.tipo === 'Gasto' ? '-' : '+'}RD$ ${Number(t.total).toLocaleString()}
            </div>
        </div>
        `).join('');
  }

  function getIconForType(tipo) {
    if (tipo === 'Local') return 'shop';
    if (tipo === 'Delivery') return 'bicycle';
    if (tipo === 'Camión') return 'truck';
    if (tipo === 'Gasto') return 'wallet2';
    return 'bag-check';
  }

  // ---------- FILTROS Y PDF ----------
  // NOTE: For a real system with history, we should fetch from Firestore by date range.
  // Currently 'ventasDelDia' is just the current session/day or what loaded from LocalStorage.
  // We'll filter assuming 'ventasDelDia' might hold more if we expand it, 
  // or just filter the current view.
  // Actually, 'cargarDesdeStorage' loads 'ventas_sistema_awa'. 
  // If the user wants to filter *history*, they need to fetch history. 
  // But let's assume 'ventasDelDia' is the "Working Set".

  // Actually, checking previous code, we only save to localStorage 'ventas_sistema_awa'.
  // So 'ventasDelDia' is just that. 
  // Let's implement client-side filtering on 'ventasDelDia' for now, 
  // and PDF generation on the *current filtered view* or *all*.

  let currentFilteredVentas = null; // If null, use ventasDelDia

  function getVentasActivas() {
    return currentFilteredVentas || ventasDelDia;
  }

  // Need to update 'actualizarReportes' to use 'getVentasActivas()' instead of 'ventasDelDia'
  // But to avoid rewriting that huge function now, let's swap 'ventasDelDia' temporarily or refactor?
  // Easier: Refactor 'actualizarReportes' is best practice, but 
  // riskier to break. 
  // Let's modify 'actualizarReportes' (it was just added) to accept data arg?
  // Or just modify 'actualizarReportes' to use a local variable data = ...

  // Wait, I just wrote 'actualizarReportes' in previous step.
  // I will just override 'ventasDelDia' in the report scope? No, that's dangerous.
  // Let's create a proxy or just pass data to actualizaReportes if I can.
  // Since I can't easily change the signature without finding all calls,
  // I will redefine 'actualizarReportes' slightly to use a helper or check for filter.

  // Actually, let's keep it simple.
  // The user wants 'Filtrar'. It should filter valid items.
  // If we filter, we want to update the dashboard.
  // But 'ventasDelDia' implies "Sales of the Day".
  // If we filter by date range 1-Jan to 31-Jan, 'ventasDelDia' name is confusing.

  /* 
     Revised Plan for Filter:
     1. User clicks Filter.
     2. We filter 'ventasDelDia' (assuming it has data with dates)
        BUT 'ventasDelDia' items have 'hora' but NOT 'fecha' explicitly stored in the object 
        in 'guardarIndividual' etc? 
        Let's check 'nuevoRegistro'. 
        It has 'id' (timestamp-ish?), 'hora'.
        It does NOT seem to have 'fecha' explicitly in the previous snippets!
        If there is no 'fecha', we CANNOT filter by date range! 
        
        Wait, 'cargarDesdeStorage' loads it.
        If we don't save year/month/day, we are screwed for filtering.
        Let's look at 'guardarIndividual' again.
        "const hora = new Date().toLocaleTimeString..."
        It does NOT save full date.
        
        CRITICAL: We can only filter by "Today" if we assume everything in 'ventasDelDia' IS today.
        Or if 'id' is a timestamp (Date.now()), we can recover the date from 'id'.
        
        Let's retrieve date from 'id'.
  */

  function getFechaFromId(registro) {
    if (registro.timestamp) return new Date(registro.timestamp);
    // Fallback: If no timestamp, ID might be small (legacy).
    // Assume it belongs to TODAY (or the current session context).
    return new Date();
  }

  function filtrarReporte() {
    const startStr = document.getElementById('reportStart').value;
    const endStr = document.getElementById('reportEnd').value;

    if (!startStr || !endStr) {
      alert("Por favor selecciona ambas fechas");
      return;
    }

    // Force Local Time to avoid UTC issues
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T23:59:59');

    // Filter
    const filtered = allRecentVentas.filter(v => {
      const d = getFechaFromId(v);
      return d >= start && d <= end;
    });

    // Update state
    currentFilteredVentas = filtered; // Store filtered state if we needed it for PDF export 
    // (My previous exportarPDF logic used 'ventasDelDia' directly, I need to fix that too!)

    // Update Charts
    // We need 'actualizarReportes' to accept data.
    // I'll re-declare 'actualizarReportes' below to accept an argument.
    actualizarReportes(filtered);

    Swal.fire({
      title: 'Filtro Aplicado',
      text: `Se encontraron ${filtered.length} registros.`,
      icon: 'info',
      timer: 2000,
      showConfirmButton: false
    });
  }

  function resetFiltro() {
    document.getElementById('reportStart').value = '';
    document.getElementById('reportEnd').value = '';
    currentFilteredVentas = null; // Clear filter
    actualizarReportes(ventasDelDia); // Restore full
    Swal.fire({
      title: 'Filtro Reiniciado',
      text: 'Mostrando todos los registros.',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  }

  window.filtrarReporte = filtrarReporte; // Expose
  window.resetFiltro = resetFiltro;

  async function exportarPDF() {
    if (typeof jspdf === 'undefined') { alert('Librería PDF no cargada'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Data to print
    const dataToPrint = currentFilteredVentas || ventasDelDia;

    // Title
    doc.setFontSize(18);
    doc.text('Reporte de Ventas - AWA System', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    const fecha = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
    doc.text(`Generado: ${fecha}`, 14, 30);

    if (currentFilteredVentas) {
      doc.setFontSize(10);
      doc.setTextColor(255, 0, 0);
      doc.text('* Reporte Filtrado', 14, 36);
      doc.setTextColor(100);
    }

    // Summary
    const net = document.getElementById('reportNetProfit') ? document.getElementById('reportNetProfit').textContent : '-';
    const margin = document.getElementById('reportMargin') ? document.getElementById('reportMargin').textContent : '-';
    const avg = document.getElementById('reportAvgTicket') ? document.getElementById('reportAvgTicket').textContent : '-';

    doc.text(`Rentabilidad: ${net} | Margen: ${margin} | Ticket Prom: ${avg}`, 14, 45);

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

  // ---------- FILTROS HISTORIAL ----------
  function filtrarHistorial() {
    const dateVal = document.getElementById('historyDateFilter').value; // Corrected ID
    const typeVal = document.getElementById('historyTypeFilter').value;
    const tbody = document.getElementById('historyTableBody') || document.getElementById('tablaRegistros');

    let filtered = allRecentVentas;

    // Filter by Date
    if (dateVal && dateVal !== 'todo') { // Adjusted for Select values
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
          // Last 7 days
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return d >= weekAgo;
        }
        if (dateVal === 'mes') {
          // Current Month
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        return true; // Fallback or 'todo'
      });
    }

    // Filter by Type
    if (typeVal && typeVal !== 'todos') { // Adjusted for 'todos' value
      filtered = filtered.filter(v => (v.tipo || '') === typeVal);
    }

    // Update Table
    if (tbody) {
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="color:#888; font-style:italic; text-align:center; padding:20px;">No se encontraron registros</td></tr>';
      } else {
        renderTableRows(tbody, filtered);
      }
    }
  }

  function init() {
    try {
      console.log("🚀 Starting App Init (Cloud Mode)...");
      // cargarDesdeStorage(); // Disabled for Cloud Cloud

      // Setup Realtime Listener
      // Setup Realtime Listener
      // Only listen for recent items to avoid reading entire DB history
      // We filter by "today" in client, but limit query to recent 500
      ventasRef.orderBy("createdAt", "desc").limit(500).onSnapshot((snapshot) => {
        console.log("📡 Nuevo snapshot de Firestore");
        ventasDelDia = [];
        allRecentVentas = [];

        // Strict "Today" Filter
        const todayStr = new Date().toDateString();

        snapshot.forEach((doc) => {
          const data = doc.data();
          const registro = { id: doc.id, ...data };

          // Store raw history
          const role = window.currentUserRole;

          // CAMION EXCLUSIVE HISTORY LOGIC
          // If role is 'camion', only include 'Camión' records AND 'Gasto' records? 
          // User said: "vea sus movimientos". Usually means their sales and filtered expenses?
          // Or just allow all Gastos (simpler)? 
          // Restriction: "camion ve camion y gastos".
          // Let's filter 'allRecentVentas' here correctly.

          let addToHistory = true;
          if (role === 'camion') {
            if (registro.tipo !== 'Camión' && registro.tipo !== 'Gasto') {
              addToHistory = false;
            }
          }
          // Planta logic? "solo puede ver planta..."
          // If we want to hide Camion data from Planta?
          // User didn't strictly say "hide history from planta", but implies RBAC.
          // Only Camion was explicit about "historial exclusivo".
          // I'll stick to Camion restriction for now.

          if (addToHistory) {
            allRecentVentas.push(registro);
          }

          // Dashboard Filter: Only Today
          let shouldInclude = false;

          // Case 1: Pending write (createdAt is null) -> Assume it's happening NOW (Today)
          if (data.createdAt === null) {
            shouldInclude = true;
          }
          // Case 2: Has createdAt -> Check date
          else if (data.createdAt) {
            const d = new Date(data.createdAt.seconds * 1000);
            if (d.toDateString() === todayStr) shouldInclude = true;
          }
          // Case 3: Fallback legacy 'fecha'
          else if (data.fecha) {
            const d = new Date(data.fecha);
            if (d.toDateString() === todayStr) shouldInclude = true;
          }

          if (shouldInclude) {
            ventasDelDia.push(registro);
          }
        });

        // Re-render UI
        actualizarEmpleadosVisual();
        actualizarTablaRegistros();
        actualizarTotalDiario();
        actualizarReportes();
        renderRecentActivity();
      });

      // Re-render UI
      actualizarEmpleadosVisual();
      actualizarTablaRegistros();
      actualizarTotalDiario();
      actualizarReportes();
      renderRecentActivity();

      // Employees Listener
      empleadosRef.orderBy("nombre").onSnapshot((snapshot) => {
        console.log("👥 Empleados actualizados desde nube");
        empleados = [];
        snapshot.forEach(doc => {
          empleados.push({ id: doc.id, ...doc.data() });
        });
        actualizarEmpleadosVisual();
      });

      // actualizarEmpleadosVisual(); // Listener covers this
      configurarEventListeners();
      configurarNavegacion();
      actualizarFecha();
      // actualizarTablaRegistros(); // Listener will trigger this
      // actualizarTotalDiario(); // Listener will trigger this
      // renderRecentActivity(); // Listener will trigger this
      calcularTotal();

      // Bind Filter Buttons (Reporte)
      const btnFilter = document.getElementById('btnFilterReport');
      if (btnFilter) btnFilter.addEventListener('click', filtrarReporte);

      const btnReset = document.getElementById('btnResetReport');
      if (btnReset) btnReset.addEventListener('click', resetFiltro);

      const btnPdf = document.getElementById('btnExportPDF');
      if (btnPdf) btnPdf.addEventListener('click', exportarPDF);

      // Bind Filter Buttons (Historial)
      const histDate = document.getElementById('historyDateFilter'); // Corrected ID
      if (histDate) histDate.addEventListener('change', filtrarHistorial); // Changed to 'change'

      const histType = document.getElementById('historyTypeFilter');
      if (histType) histType.addEventListener('change', filtrarHistorial);

      console.log("✅ App Init Complete.");
    } catch (e) {
      console.error("❌ Critical Error during Init:", e);
      alert("Error iniciando la aplicación: " + e.message);
    }
  }

  // --- 🔒 RBAC & AUTH ---
  function updateUIForRole(email) {
    if (!email) return;

    // Define Roles (Simple Mapping)
    // admin: all
    // planta: planta, gastos, produccion
    // camion: camion, gastos, historial (filtered)

    let role = 'user'; // default (maybe limited?)

    // Explicit mappings or logic
    if (email.includes('admin') || email === 'joelsanchez@awa.com') role = 'admin';
    else if (email.includes('planta')) role = 'planta';
    else if (email.includes('camion')) role = 'camion';

    console.log(`👤 User Role Detected: ${role} (${email})`);

    // Sidebar Permissions
    const allTabs = ['dashboard', 'planta', 'camion', 'gastos', 'reportes', 'historial', 'produccion'];
    let allowedTabs = [];

    if (role === 'admin') {
      allowedTabs = allTabs;
    } else if (role === 'planta') {
      allowedTabs = ['planta', 'gastos', 'produccion'];
    } else if (role === 'camion') {
      allowedTabs = ['camion', 'gastos', 'historial'];
    }

    // Hide/Show Sidebar Buttons
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
      const tab = btn.getAttribute('data-tab');
      if (allowedTabs.includes(tab)) {
        btn.style.display = 'flex';
      } else {
        btn.style.display = 'none';
      }
    });

    // Handle initial redirect if on forbidden tab or default
    // If Admin/Default -> Dashboard
    // If Planta -> Planta
    // If Camion -> Camion
    // (This logic usually handled by defaulting to first visible tab or keeping current if allowed)
    // Let's force a safe default on load
    const activeBtn = document.querySelector('.nav-btn.active');
    const activeTab = activeBtn ? activeBtn.getAttribute('data-tab') : null;

    if (!allowedTabs.includes(activeTab)) {
      // Find first allowed tab
      const firstAllowed = allowedTabs[0];
      if (firstAllowed) {
        // Simulate click
        const targetBtn = document.querySelector(`.nav-btn[data-tab="${firstAllowed}"]`);
        if (targetBtn) targetBtn.click();
      }
    }

    return role;
  }

  // --- 🏭 MÓDULO DE PRODUCCIÓN ---

  const produccionRef = db.collection("produccion");
  let produccionHistorial = [];

  function setupProduccionListeners() {
    console.log("🏭 Inicializando Listeners de Producción...");
    const medAyer = document.getElementById('prodMedidorAyer');
    const medHoy = document.getElementById('prodMedidorHoy');
    const btnGuardar = document.getElementById('btnGuardarProduccion');
    const mesFilter = document.getElementById('prodMesFilter');

    if (medAyer && medHoy) {
      [medAyer, medHoy].forEach(input => {
        input.addEventListener('input', calcularProduccion);
      });
    }

    if (btnGuardar) btnGuardar.addEventListener('click', guardarProduccion);

    // Set default month to current
    if (mesFilter) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      mesFilter.value = `${year}-${month}`;
      mesFilter.addEventListener('change', actualizarTablaProduccion);
    }

    // Load last reading for 'Ayer' input
    cargarUltimaLectura();
  }

  function calcularProduccion() {
    const ayer = parseFloat(document.getElementById('prodMedidorAyer').value) || 0;
    const hoy = parseFloat(document.getElementById('prodMedidorHoy').value) || 0;

    let dif = 0;
    let botellones = 0;

    if (hoy > 0) {
      dif = hoy - ayer;
      botellones = dif / 5;
    }

    const lblGalones = document.getElementById('calcGalones');
    const lblBotellones = document.getElementById('calcBotellones');

    if (lblGalones) lblGalones.textContent = dif.toLocaleString('en-US');
    if (lblBotellones) lblBotellones.textContent = Number.isInteger(botellones) ? botellones : botellones.toFixed(1);
  }

  function cargarUltimaLectura() {
    // ... codigo anterior ok ...
    produccionRef.orderBy("createdAt", "desc").limit(1).get()
      .then(snapshot => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          inputAyer.value = data.medidorActual;
          calcularProduccion();
          // Force UI update for stock
          setTimeout(actualizarUI, 500);
        }
      })
      .catch(console.error);
  }

  function actualizarUI() {
    // Wrapper to refresh totals and stock (can be called from production change)
    actualizarTotalDiario();
  }

  function guardarProduccion() {
    const ayer = parseFloat(document.getElementById('prodMedidorAyer').value) || 0;
    const hoy = parseFloat(document.getElementById('prodMedidorHoy').value) || 0;

    if (hoy <= 0 || hoy <= ayer) {
      alert("⚠️ El medidor actual debe ser mayor al anterior.");
      return;
    }

    const diferencia = hoy - ayer;
    const botellones = diferencia / 5;
    const fecha = new Date(); // To create filterable date

    const registro = {
      medidorAnterior: ayer,
      medidorActual: hoy,
      galones: diferencia,
      botellones: botellones,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      fecha: fecha.toISOString(),
      yearMonth: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}` // Helper index
    };

    produccionRef.add(registro)
      .then(() => {
        alert("✅ Producción guardada");
        document.getElementById('prodMedidorHoy').value = '';
        document.getElementById('prodMedidorAyer').value = hoy;
        calcularProduccion();
      })
      .catch(err => {
        console.error(err);
        alert("❌ Error al guardar");
      });
  }

  function actualizarTablaProduccion() {
    const tbody = document.getElementById('produccionTableBody');
    const mesFilter = document.getElementById('prodMesFilter');
    const totalMesInput = document.getElementById('totalProduccionMes');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Filtro por mes
    const selectedMonth = mesFilter ? mesFilter.value : null;

    let totalBotellonesMes = 0;

    // Filter list
    const filteredList = produccionHistorial.filter(item => {
      if (!selectedMonth) return true; // Show all if no filter (though UI enforces input)

      let itemDate;
      if (item.createdAt) {
        itemDate = new Date(item.createdAt.seconds * 1000);
      } else if (item.fecha) {
        itemDate = new Date(item.fecha);
      } else {
        return false;
      }

      const itemYM = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
      return itemYM === selectedMonth;
    });

    filteredList.forEach(item => {
      let fechaStr = "---";
      if (item.createdAt && item.createdAt.seconds) {
        fechaStr = new Date(item.createdAt.seconds * 1000).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
      }

      totalBotellonesMes += (Number(item.botellones) || 0);

      const tr = document.createElement('tr');
      // Style spacing
      tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";

      tr.innerHTML = `
            <td data-label="Fecha" style="padding:16px 15px; font-weight:500;">${fechaStr}</td>
            <td data-label="Ayer" style="color:#ff9f43; background:rgba(255,159,67,0.1); border-radius:8px; padding:8px 15px; text-align:center; font-weight:500;">${item.medidorAnterior}</td>
            <td data-label="Hoy" style="color:#00c2ff; background:rgba(0,194,255,0.1); border-radius:8px; padding:8px 15px; text-align:center; font-weight:500;">${item.medidorActual}</td>
            <td data-label="Galones" style="text-align:center; padding:0 15px;">${item.galones}</td>
            <td data-label="Botellones" style="font-weight:bold; color:var(--success); font-size:16px; text-align:center; padding:0 15px;">${Number(item.botellones).toFixed(1)}</td>
            <td data-label="Acción" style="text-align:right; padding-right:10px;">
                <button onclick="eliminarProduccion('${item.id}')" class="btn-icon danger"><i class="bi bi-trash"></i></button>
            </td>
        `;
      tbody.appendChild(tr);
    });

    // Update Header Total
    if (totalMesInput) {
      totalMesInput.value = totalBotellonesMes.toLocaleString('en-US', { maximumFractionDigits: 1 });
    }
  }

  // ... eliminarProduccion ...
  window.eliminarProduccion = function (id) {
    if (confirm("¿Borrar este registro?")) {
      produccionRef.doc(id).delete().catch(console.error);
    }
  }

  // Listener principal (trae max 100 para no sobrecargar, el filtro es en cliente por ahora)
  produccionRef.orderBy("createdAt", "desc").limit(100).onSnapshot(snapshot => {
    produccionHistorial = [];
    snapshot.forEach(doc => {
      produccionHistorial.push({ id: doc.id, ...doc.data() });
    });
    actualizarTablaProduccion();
  });

  // --- 👥 MÓDULO DE CLIENTES (CAMIÓN) ---
  // Clients Module moved to js/clients.js
  // Route logic handled there/or here?
  // Cleaning up...

  // Check for new items
  // Listener logic moved to clients.js or main init


  // Helper for generated sound
  function playNotificationBeep() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { console.error("Audio error", e); }
  }

  // --- 📱 MOBILE OPTIMIZATIONS (PTR & RESUME) ---

  // 1. Auto-Reconnect on Resume (App Switching)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log("🔄 App resumed - forcing sync...");

      // Force Firestore Network Reconnection
      rutaRef.firestore.disableNetwork().then(() => {
        rutaRef.firestore.enableNetwork();
      });

      // Force timestamp update
      actualizarFecha();

      // Update list if in Route view
      if (document.getElementById('view-camion').classList.contains('active')) {
        // Re-trigger modal render if open or just let listeners handle it
      }
    }
  });

  // 2. Pull to Refresh (Visual & "Native-like")
  let ptrStartY = 0;
  let ptrDistance = 0;
  let isPtrActive = false;
  let ptrLoader = null;
  let activeScrollTarget = null;

  // Initialize Loader
  window.addEventListener('DOMContentLoaded', () => {
    ptrLoader = document.createElement('div');
    ptrLoader.id = 'ptr-loader';
    ptrLoader.innerHTML = '<i class="bi bi-arrow-down"></i>';
    document.body.appendChild(ptrLoader);
  });

  function getScrollableParent(node) {
    if (node == null) return null;
    if (node.tagName === 'BODY' || node.tagName === 'HTML') return null;
    // Check if element is scrollable
    const style = window.getComputedStyle(node);
    const isScrollable = (style.overflowY === 'auto' || style.overflowY === 'scroll');

    if (isScrollable && node.scrollHeight > node.clientHeight) {
      return node;
    }
    return getScrollableParent(node.parentNode);
  }

  window.addEventListener('touchstart', (e) => {
    // Only allow if touching near the top of the interface 
    // OR if the active view is scrolled to top.
    const touchY = e.touches[0].clientY;
    activeScrollTarget = getScrollableParent(e.target);

    // If we are inside a scrollable container (like the list), ensure it's at top
    if (activeScrollTarget && activeScrollTarget.scrollTop > 0) {
      isPtrActive = false;
      return;
    }

    // If not in a scrollable container, strictly require touch to start in top 20% of screen
    // This solves "only if I do it from the top"
    if (!activeScrollTarget && touchY > (window.innerHeight * 0.2)) {
      isPtrActive = false;
      return;
    }

    ptrStartY = touchY;
    ptrDistance = 0;
    isPtrActive = true;

    if (ptrLoader) {
      ptrLoader.style.transition = 'none'; // Remove transition for realtime drag
      ptrLoader.querySelector('.bi').classList.remove('bi-arrow-repeat');
      ptrLoader.querySelector('.bi').classList.add('bi-arrow-down');
      ptrLoader.classList.remove('refreshing');
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isPtrActive) return;
    const touchY = e.touches[0].clientY;
    const diff = touchY - ptrStartY;

    // Only pull down
    if (diff > 0) {
      // Check scroll again just in case
      if (activeScrollTarget && activeScrollTarget.scrollTop > 0) {
        isPtrActive = false;
        ptrLoader.style.top = '-60px';
        return;
      }

      // Resistance formula
      ptrDistance = Math.pow(diff, 0.8); // Damping

      // Max pull distance visually
      if (ptrDistance > 150) ptrDistance = 150;

      if (ptrLoader) {
        ptrLoader.style.top = (ptrDistance - 60) + 'px'; // -60 is hidden state
        ptrLoader.querySelector('.bi').style.transform = `rotate(${ptrDistance * 2}deg)`;
      }
    } else {
      isPtrActive = false;
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    if (!isPtrActive) return;
    isPtrActive = false;

    if (ptrLoader) {
      ptrLoader.style.transition = 'top 0.3s ease';

      // Threshold to trigger reload
      if (ptrDistance > 80) { // Standard threshold
        ptrLoader.style.top = '20px'; // Snap to active position
        ptrLoader.classList.add('refreshing');
        ptrLoader.querySelector('.bi').classList.remove('bi-arrow-down');
        ptrLoader.querySelector('.bi').classList.add('bi-arrow-repeat');

        // Trigger Reload
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        // Bounce back to hidden
        ptrLoader.style.top = '-60px';
      }
    }
  });

  window.solicitarNotificaciones = function () {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
      } else {
        alert("❌ Permiso denegado");
      }
    });
  }


  // --- SMART SEARCH ---
  function setupCommentSearch() {
    const commentInput = document.getElementById('commentCamion');
    const suggestionsBox = document.getElementById('suggestionsList');

    if (!commentInput || !suggestionsBox) return;

    commentInput.addEventListener('input', function () {
      const val = this.value.toLowerCase().trim();
      if (val.length < 2) {
        suggestionsBox.style.display = 'none';
        return;
      }

      const matches = listaClientes.filter(c => c.nombre.toLowerCase().includes(val));

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

    // Hide when clicking outside
    // Hide when clicking outside
    const closeSuggestions = function (e) {
      if (!commentInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.style.display = 'none';
      }
    };

    document.addEventListener('click', closeSuggestions);
    document.addEventListener('touchstart', closeSuggestions); // Use separate listener for mobile touch consistency

  }

  window.selectClientFromSearch = function (id) {
    const selector = document.getElementById('clienteCamionSelector');
    const suggestionsBox = document.getElementById('suggestionsList');
    // const commentInput = document.getElementById('commentCamion');

    if (selector) {
      selector.value = id;
      seleccionarClienteCamion(); // Trigger price update
    }

    // Hide suggestions immediately
    if (suggestionsBox) suggestionsBox.style.display = 'none';
  }

  // Init Search
  setupCommentSearch();



})();

// --- GESTOS SWIPE (DESLIZAR) ---
(function () {
  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchEndY = 0;
  const minSwipeDistance = 80;

  // Lista ordenada de IDs de vistas
  const views = [
    'view-dashboard',
    'view-planta',
    'view-camion',
    'view-gastos',
    'view-historial',
    'view-reportes',
    'view-produccion'
  ];

  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    // 1. Verificar umbral mínimo horizontal
    if (Math.abs(diffX) < minSwipeDistance) return;

    // 2. Verificar que no sea scroll vertical (si movió más en Y que en X, es scroll)
    if (Math.abs(diffY) > Math.abs(diffX)) return;

    // Determinar vista actual
    // Busca cuál tiene display block. Si ninguna (inicio), asume dashboard.
    const currentView = views.find(id => {
      const el = document.getElementById(id);
      return el && window.getComputedStyle(el).display !== 'none';
    }) || 'view-dashboard';

    const currentIndex = views.indexOf(currentView);
    if (currentIndex === -1) return;

    let targetSection = null;

    if (diffX > 0) {
      // Deslizar izquierda -> Siguiente
      if (currentIndex < views.length - 1) {
        targetSection = views[currentIndex + 1].replace('view-', '');
      }
    } else {
      // Deslizar derecha -> Anterior
      if (currentIndex > 0) {
        targetSection = views[currentIndex - 1].replace('view-', '');
      }
    }

    if (targetSection) {
      // Intentar usar función global, si no, simular click en botón
      if (typeof window.mostrarSeccion === 'function') {
        window.mostrarSeccion(targetSection);
      } else {
        // Buscar botón de navegación
        const btn = Array.from(document.querySelectorAll('button')).find(b =>
          b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${targetSection}'`)
        );
        if (btn) btn.click();
      }
    }
  }
})();
