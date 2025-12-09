// --- 🔥 CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCojK8pGgNKb9AhUHo50rgYiW769t_ljmk",
  authDomain: "sistemaventasagua.firebaseapp.com",
  projectId: "sistemaventasagua",
  storageBucket: "sistemaventasagua.firebasestorage.app",
  messagingSenderId: "699153205855",
  appId: "1:699153205855:web:33455493ba6e40b4d029ea"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar Firestore
const db = firebase.firestore();
const ventasRef = db.collection("ventas");
const empleadosRef = db.collection("empleados");

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
  let ventasDelDia = [];
  let contadorVentas = 0;
  let empleados = [];

  // Chart Instances
  let myPieChart = null;
  let myTrendChart = null;

  const PRECIO_LOCAL = 25;
  const PRECIO_CAMION = 25;
  const PRECIO_DELIVERY = 35;

  // ---------- UTILIDADES ----------
  function formatCurrency(n) {
    const num = Number(n) || 0;
    const opts = { minimumFractionDigits: (Math.round(num) === num ? 0 : 2), maximumFractionDigits: 2 };
    return '$' + num.toLocaleString('es-ES', opts);
  }

  function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

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

  // Escuchar cambios para recalcular - No necesario si no mostramos totales live
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

    const btnGasto = document.getElementById('btnGasto');
    if (btnGasto) btnGasto.addEventListener('click', guardarGasto);

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
      const mode = document.querySelector('input[name="camionMode"]:checked');
      const modeVal = mode ? mode.value : '';
      const comment = document.getElementById('commentCamion').value.trim();
      const descripcion = (modeVal ? (modeVal === 'solo' ? 'Solo' : 'Ayudante') : '') + (comment ? ` - ${comment}` : '');

      const total = cantidad * PRECIO_CAMION;
      const venta = {
        timestamp: Date.now(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        hora,
        tipo: 'Camión',
        detalles: descripcion || '-',
        cantidad,
        precioUnitario: `${formatCurrency(PRECIO_CAMION)}`,
        total
      };

      ventasRef.add(venta)
        .then(() => {
          document.getElementById('qtyCamion').value = '';
          document.getElementById('commentCamion').value = '';
          if (mode) mode.checked = false;
          mostrarConfirmacion('💾 Venta de camión guardada en nube', '#f39c12');
        })
        .catch(err => { console.error(err); alert("Error guardando venta"); });
      return;
    }

    // empleado-<id>
    if (campo.startsWith('empleado-')) {
      const empId = parseInt(campo.split('-')[1]);
      const input = document.querySelector(`.empleado-cantidad[data-emp-id='${empId}']`);
      if (!input) {
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
    const nota = document.getElementById('gastoDesc').value.trim();
    if (monto <= 0) { alert('⚠️ Por favor ingresa un monto válido para el gasto'); document.getElementById('gastoMonto').focus(); return; }
    if (!nota) { alert('⚠️ Por favor describe el gasto'); document.getElementById('gastoDesc').focus(); return; }
    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const nuevoGasto = {
      timestamp: Date.now(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      hora,
      tipo: 'Gasto',
      descripcion: nota,
      detalles: nota,
      cantidad: '-',
      precioUnitario: '-',
      total: -Math.abs(monto)
    };

    ventasRef.add(nuevoGasto)
      .then(() => {
        limpiarGastos();
        mostrarConfirmacion('💾 Gasto guardado correctamente en nube', '#f39c12');
      })
      .catch(err => { console.error(err); alert("Error al guardar gasto"); });
  };

  function limpiarGastos() { document.getElementById('gastoMonto').value = ''; document.getElementById('gastoDesc').value = ''; }

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
    // Attempt to update Historial Table
    // FIX: ID was mismatched. HTML has 'historyTableBody'.
    const tbodyHistorial = document.getElementById('historyTableBody') || document.getElementById('tablaRegistros');

    if (tbodyHistorial) {
      if (ventasDelDia.length === 0) {
        tbodyHistorial.innerHTML = '<tr><td colspan="7" style="color:#888; font-style:italic; text-align:center; padding:20px;">No hay ventas registradas hoy</td></tr>';
      } else {
        renderTableRows(tbodyHistorial, ventasDelDia);
      }
    }
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

      const detalles = registro.detallesEntregas && registro.detallesEntregas.trim().length > 0 ? registro.detallesEntregas : registro.detalles || '-';
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
        <tr class="venta-${tipoClass}">
            <td>${fechaStr}</td> <!-- Col 1: Fecha -->
            <td>${registro.hora || '-'}</td> <!-- Col 2: Hora -->
            <td><span class="service-type ${tipoClass}">${registro.tipo || '-'}</span></td> <!-- Col 3: Tipo -->
            <td style="font-size:.9em;">${detalles}</td> <!-- Col 4: Detalle -->
            <td class="text-right">${cantidad}</td> <!-- Col 5: Cant -->
            <td class="text-right">${precioUnit}</td> <!-- Col 6: Precio -->
            <td class="text-right" style="font-weight:700; color:${color};">${textoTotal}</td> <!-- Col 7: Total -->
            <td><button class="delete-btn" onclick="eliminarRegistro('${registro.id}')">🗑️</button></td> <!-- Col 8: Action -->
          </tr >
        `;

    }).join('');
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

  // ---------- REPORTES ----------
  function actualizarReportes(data = null) {
    const dataSource = data || ventasDelDia;

    // 1. Employee Ranking
    const rankTable = document.getElementById('employeeRankingTable');
    if (rankTable) {
      // Aggregate delivery counts per employee
      // We need to parse 'detalles' or check logic. For now, we only have 'empleadoId' in 'entregas'?
      // The current storage logic for individual sales doesn't explicitly store employee ID in 'ventasDelDia' easy to parse.
      // It stores "Repartidor: Name" in detalles, or similar.
      // Let's iterate 'ventasDelDia' and look for type 'Delivery' and parse name.

      const counts = {};
      dataSource.forEach(v => {
        if (v.tipo === 'Delivery') {
          // Try to extract name. details might be "Repartidor: Juan - 5 botellones"
          // Or if we saved it differently.
          // In 'guardarVenta' (legacy) it pushed objects.
          // In 'guardarIndividual' (current/fixed), we might need to improve how we store delivery data.
          // For now, let's just group by 'detalles' if type is Delivery.
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

    // 2. Charts
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

      if (myPieChart) myPieChart.destroy();
      myPieChart = new Chart(ctxPie, {
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
        // v.hora is like "10:30"
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

      if (myTrendChart) myTrendChart.destroy();
      myTrendChart = new Chart(ctxTrend, {
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
    const totalVentas = dataSource.filter(v => v.tipo !== 'Gasto').reduce((acc, c) => acc + (Number(c.total) || 0), 0);
    const totalGastos = dataSource.filter(v => v.tipo === 'Gasto').reduce((acc, c) => acc + Math.abs(Number(c.total) || 0), 0);
    const profit = totalVentas - totalGastos;
    const margin = totalVentas > 0 ? ((profit / totalVentas) * 100).toFixed(1) : 0;

    const countVentas = dataSource.filter(v => v.tipo !== 'Gasto').length;
    const avgTicket = countVentas > 0 ? (totalVentas / countVentas) : 0;

    const elProfit = document.getElementById('reportNetProfit');
    if (elProfit) elProfit.textContent = formatCurrency(profit);

    const elMargin = document.getElementById('reportMargin');
    if (elMargin) elMargin.textContent = `${margin}%`;

    const elAvg = document.getElementById('reportAvgTicket');
    if (elAvg) elAvg.textContent = formatCurrency(avgTicket);
  }

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
        const total = Number(r.total) || 0;
        totalDinero += (r.tipo === 'Gasto' ? -total : total);

        // Gastos (sumar el valor absoluto o el valor real si quieres mostrar cuanto se gastó)
        if (r.tipo === 'Gasto') {
          totalGastos += Math.abs(Number(r.total) || 0); // Sumamos positivo para mostrar "Total Gastado: 500"
        }

        // Botellones
        if (Number(r.cantidad)) {
          totalBotellones += Number(r.cantidad);
        }

        // Local
        if (r.tipo === 'Local') {
          totalLocal += Number(r.cantidad) || 0;
        }

        // Delivery
        if (r.tipo === 'Delivery') {
          totalDelivery += Number(r.cantidad) || 0;
        }

        // Camión
        if (r.tipo === 'Camión') {
          totalCamion += Number(r.cantidad) || 0;
        }

        // Otro Servicio
        if (r.tipo === 'Otros') {
          // AHORA sumamos CANTIDAD, no dinero.
          totalOtro += Number(r.cantidad) || 0;
        }
      });
    }

    // Totales Panel Planta (Inputs) - Mostrar CANTIDAD
    const elTotalLocal = document.getElementById('totalLocal');
    if (elTotalLocal) elTotalLocal.value = totalLocal;

    const elTotalCamion = document.getElementById('totalCamion');
    if (elTotalCamion) elTotalCamion.value = totalCamion;

    const elTotalOtro = document.getElementById('totalOtro');
    // Mostrar solo el numero (cantidad)
    if (elTotalOtro) elTotalOtro.value = totalOtro;

    const elTotalGastos = document.getElementById('totalGastos');
    if (elTotalGastos) elTotalGastos.value = formatCurrency(totalGastos);

    // Totales Dashboard
    const elDashTotal = document.getElementById('dashTotal');
    if (elDashTotal) elDashTotal.textContent = formatCurrency(totalDinero);

    const elDashBotellones = document.getElementById('dashBotellones');
    if (elDashBotellones) elDashBotellones.textContent = totalBotellones;

    const elDashTransacciones = document.getElementById('dashTransacciones');
    if (elDashTransacciones) elDashTransacciones.textContent = ventasDelDia ? ventasDelDia.length : 0;

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





  // ---------- INICIALIZACIÓN ----------
  // function init() original se mueve para ser llamada post-login

  // ---------- AUTH & LIFECYCLE ----------
  firebase.auth().onAuthStateChanged(user => {
    const loginView = document.getElementById('view-login');
    const appContent = document.getElementById('app-content');

    if (user) {
      // User is signed in.
      console.log("Usuario autenticado:", user.email);
      if (loginView) loginView.style.display = 'none';
      if (appContent) appContent.style.display = 'flex'; // Flex para el layout sidebar/main

      // Inicializar datos
      init();
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

  function actualizarFecha() {
    const dateElement = document.getElementById('currentDate');
    if (!dateElement) return;
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fe = new Date().toLocaleDateString('es-ES', options);
    dateElement.textContent = fe.charAt(0).toUpperCase() + fe.slice(1);
  }

  function renderRecentActivity() {
    const list = document.getElementById('recentActivityList');
    if (!list) return;

    if (!ventasDelDia || ventasDelDia.length === 0) {
      list.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">No hay actividad reciente</div>';
      return;
    }

    // Sort by timestamp desc (assuming newer items are pushed last, so reverse) or utilize 'id' desc
    // Since ventasDelDia is pushed chronologically, reverse is enough.
    // However, if we want strict time sort:
    // We don't have a raw timestamp in all objects, some have 'hora' string.
    // Relying on array order (reverse) is safer for this simple app.
    const recent = [...ventasDelDia].reverse().slice(0, 5);

    list.innerHTML = recent.map(t => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:40px; height:40px; border-radius:12px; background:rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; color:var(--primary);">
                    <i class="bi bi-${getIconForType(t.tipo)}"></i>
                </div>
                <div>
                    <div style="font-weight:500; color:var(--text-main);">${t.tipo === 'Gasto' ? t.descripcion : t.tipo + (t.detalles && t.detalles !== '-' ? ' (' + t.detalles + ')' : '')}</div>
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
    const filtered = ventasDelDia.filter(v => {
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
    const dateVal = document.getElementById('historyDateInput').value;
    const typeVal = document.getElementById('historyTypeFilter').value;
    const tbody = document.getElementById('historyTableBody') || document.getElementById('tablaRegistros');

    let filtered = ventasDelDia;

    // Filter by Date
    if (dateVal) {
      // Force Local Time comparison for strict day matching
      const filterDate = new Date(dateVal + 'T00:00:00').toDateString();
      filtered = filtered.filter(v => {
        const d = getFechaFromId(v);
        return d.toDateString() === filterDate;
      });
    }

    // Filter by Type
    if (typeVal) {
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
      ventasRef.orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        console.log("📡 Nuevo snapshot de Firestore. Docs:", snapshot.size);
        ventasDelDia = [];

        snapshot.forEach((doc) => {
          ventasDelDia.push({ id: doc.id, ...doc.data() });
        });

        // Re-render UI
        actualizarEmpleadosVisual(); // Needs calling? Maybe not relevant to sales? 
        // Actually updating employees is separate but sales might affect stats.

        actualizarTablaRegistros();
        actualizarTotalDiario();
        actualizarReportes();
        renderRecentActivity();
      });

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
      const histDate = document.getElementById('historyDateInput');
      if (histDate) histDate.addEventListener('input', filtrarHistorial);

      const histType = document.getElementById('historyTypeFilter');
      if (histType) histType.addEventListener('change', filtrarHistorial);

      console.log("✅ App Init Complete.");
    } catch (e) {
      console.error("❌ Critical Error during Init:", e);
      alert("Error iniciando la aplicación: " + e.message);
    }
  }

  // No llamamos a init() directamente en DOMContentLoaded, 
  // dejamos que onAuthStateChanged lo haga si hay usuario.
  // document.addEventListener('DOMContentLoaded', init);

})();