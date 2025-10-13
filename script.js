// Import the functions you need from the SDKs you need
    import { initializeApp } from "firebase/app";
    // TODO: Add SDKs for Firebase products that you want to use
    // https://firebase.google.com/docs/web/setup#available-libraries

    // Your web app's Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyCojK8pGgNKb9AhUHo50rgYiW769t_ljmk",
      authDomain: "sistemaventasagua.firebaseapp.com",
      projectId: "sistemaventasagua",
      storageBucket: "sistemaventasagua.firebasestorage.app",
      messagingSenderId: "699153205855",
      appId: "1:699153205855:web:33455493ba6e40b4d029ea"
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    
    // Encapsular todo para evitar fugas globales
    (function () {
      let ventasDelDia = [];
      let contadorVentas = 0;
      let empleados = [];

      const PRECIO_LOCAL = 25;
      const PRECIO_CAMION = 30;
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
      window.agregarEmpleado = function () {
        const nombreInput = document.getElementById('empleadoNombre');
        const nombre = nombreInput.value.trim();
        if (!nombre) { alert('⚠️ Por favor ingresa el nombre del repartidor'); nombreInput.focus(); return; }
        if (empleados.some(e => e.nombre.toLowerCase() === nombre.toLowerCase())) { alert('⚠️ Ya existe un repartidor con ese nombre'); return; }

        const empleado = { id: Date.now(), nombre };
        empleados.push(empleado);
        actualizarEmpleadosVisual();
        nombreInput.value = '';
        nombreInput.focus();
        guardarEnStorage();
      };

      window.eliminarEmpleado = function (id) {
        const emp = empleados.find(e => e.id === id);
        if (!emp) return;
        if (!confirm(`¿Eliminar al repartidor "${emp.nombre}"?`)) return;
        empleados = empleados.filter(e => e.id !== id);
        actualizarEmpleadosVisual();
        guardarEnStorage();
        calcularTotal();
      };

      function actualizarEmpleadosVisual() {
        const container = document.getElementById('empleadosContainer');
        if (!container) return;
        if (empleados.length === 0) {
          container.innerHTML = '<div style="color:#999; font-style:italic; grid-column:1 / -1">No hay repartidores agregados</div>';
          return;
        }

        container.innerHTML = empleados.map(emp => `
          <div class="employee-card" id="emp-${emp.id}">
            <div class="employee-header">
              <div class="employee-name">👤 ${emp.nombre}</div>
              <button class="remove-employee-btn" title="Eliminar repartidor" onclick="eliminarEmpleado(${emp.id})">×</button>
            </div>
            <div class="mini-label" style="text-align:center; font-size:.9em; color:#666">Botellones de ESTE pedido</div>
            <div class="input-with-btn">
              <input type="number" min="0" max="999" placeholder="0" class="empleado-cantidad" data-emp-id="${emp.id}">
              <button type="button" class="save-inline-btn" onclick="guardarIndividual('empleado-${emp.id}')" title="Guardar entrega de ${emp.nombre}">💾</button>
            </div>
          </div>
        `).join('');
      }

      // ---------- CÁLCULOS ----------
      window.calcularTotal = function () {
        const ventaLocal = parseInt(document.getElementById('ventaLocal').value) || 0;
        const camion = parseInt(document.getElementById('camion').value) || 0;
        const inputs = document.querySelectorAll('.empleado-cantidad');
        let totalDelivery = 0;
        inputs.forEach(i => totalDelivery += (parseInt(i.value) || 0));

        const totalBotellones = ventaLocal + totalDelivery + camion;
        const totalLocal = ventaLocal * PRECIO_LOCAL;
        const totalDeliveryMonto = totalDelivery * PRECIO_DELIVERY;
        const totalCamion = camion * PRECIO_CAMION;
        const totalGeneral = totalLocal + totalDeliveryMonto + totalCamion;

        document.getElementById('totalBotellones').textContent = totalBotellones;
        document.getElementById('totalPagar').textContent = formatCurrency(totalGeneral);
        document.getElementById('montoFinal').textContent = formatCurrency(totalGeneral);

        const tiposActivos = [];
        if (ventaLocal > 0) tiposActivos.push('Local');
        if (totalDelivery > 0) tiposActivos.push('Delivery');
        if (camion > 0) tiposActivos.push('Camión');

        const tipoServicio = tiposActivos.length === 0 ? '-' : (tiposActivos.length === 1 ? tiposActivos[0] : 'Mixto');

        let precioServicio = [];
        if (ventaLocal > 0) precioServicio.push(`Local ${formatCurrency(PRECIO_LOCAL)}`);
        if (totalDelivery > 0) precioServicio.push(`Delivery ${formatCurrency(PRECIO_DELIVERY)}`);
        if (camion > 0) precioServicio.push(`Camión ${formatCurrency(PRECIO_CAMION)}`);
        precioServicio = precioServicio.length === 0 ? '$0' : precioServicio.join(' | ');

        document.getElementById('tipoServicio').textContent = tipoServicio;
        document.getElementById('precioServicio').textContent = precioServicio;
      };

      // Escuchar cambios para recalcular en tiempo real
      function configurarEventListeners() {
        const ventaLocalInput = document.getElementById('ventaLocal');
        const camionInput = document.getElementById('camion');
        ventaLocalInput.addEventListener('input', calcularTotal);
        camionInput.addEventListener('input', calcularTotal);
        // Delegación para inputs de empleados
        document.getElementById('empleadosContainer').addEventListener('input', function (e) {
          if (e.target && e.target.classList.contains('empleado-cantidad')) calcularTotal();
        });
      }

      // ---------- VENTAS ----------
      window.guardarVenta = async function () {
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

  if (ventaLocal === 0 && totalDelivery === 0 && camion === 0) {
    alert('⚠️ Debe ingresar al menos un botellón para guardar la venta');
    return;
  }

  const ahora = new Date();
  const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const fecha = ahora.toLocaleDateString('es-ES');

  const totalBotellones = ventaLocal + totalDelivery + camion;
  const totalLocal = ventaLocal * PRECIO_LOCAL;
  const totalDeliveryMonto = totalDelivery * PRECIO_DELIVERY;
  const totalCamion = camion * PRECIO_CAMION;
  const totalGeneral = totalLocal + totalDeliveryMonto + totalCamion;

  const tiposActivos = [];
  if (ventaLocal > 0) tiposActivos.push('Local');
  if (totalDelivery > 0) tiposActivos.push('Delivery');
  if (camion > 0) tiposActivos.push('Camión');

  const tipoServicio =
    tiposActivos.length === 0 ? '-' :
    (tiposActivos.length === 1 ? tiposActivos[0] : 'Mixto');

  const precioUnitario =
    tiposActivos.length === 1
      ? (tipoServicio === 'Local'
          ? `${formatCurrency(PRECIO_LOCAL)}`
          : tipoServicio === 'Delivery'
            ? `${formatCurrency(PRECIO_DELIVERY)}`
            : `${formatCurrency(PRECIO_CAMION)}`
        )
      : 'Var.';

  const detallesEntregas = entregas.length > 0
    ? entregas.map(e => `${e.nombre}(${e.cantidad})`).join(', ')
    : '';

  const nuevaVenta = {
    id: ++contadorVentas,
    hora,
    fecha,
    tipo: tipoServicio,
    ventaLocal,
    totalDelivery,
    entregasDelivery: entregas,
    detallesEntregas,
    camion,
    totalBotellones,
    precioUnitario,
    total: totalGeneral
  };

  // 🔹 Guardar localmente (como ya hacías)
  ventasDelDia.push(nuevaVenta);
  actualizarTablaRegistros();
  actualizarTotalDiario();
  guardarEnStorage();

  // 🔹 Guardar también en Firestore
  try {
    await ventasRef.add(nuevaVenta);
    console.log("✅ Venta guardada en Firestore correctamente");
  } catch (error) {
    console.error("❌ Error al guardar en Firestore:", error);
  }

  // 🔹 Limpiar formulario al final
  limpiarFormulario();
};


        // Feedback visual
        const btnGuardar = document.querySelector('.btn-save');
        const textoOriginal = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '✅ Guardado!';
        btnGuardar.style.background = '#27ae60';
        btnGuardar.classList.add('success-animation');
        setTimeout(() => { btnGuardar.innerHTML = textoOriginal; btnGuardar.style.background = ''; btnGuardar.classList.remove('success-animation'); }, 1200);
      

      // Guardar individual (ventaLocal, camion o empleado-<id>)
      window.guardarIndividual = function (campo) {
        if (!campo) return;
        const ahora = new Date();
        const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        if (campo === 'ventaLocal') {
          const cantidad = parseInt(document.getElementById('ventaLocal').value) || 0;
          if (cantidad <= 0) {
            alert('Ingresa una cantidad mayor a 0 para venta local');
            return;
          }
          const total = cantidad * PRECIO_LOCAL;
          const venta = {
            id: ++contadorVentas,
            hora,
            tipo: 'Local',
            detalles: '-',
            cantidad,
            precioUnitario: `${formatCurrency(PRECIO_LOCAL)}`,
            total
          };
          ventasDelDia.push(venta);
          actualizarTablaRegistros();
          actualizarTotalDiario();
          guardarEnStorage();
          document.getElementById('ventaLocal').value = '';
          limpiarFormulario(); // 🔹 agregado aquí
          mostrarConfirmacion('💾 Venta local guardada', '#56ab2f');
          return;
        }

        if (campo === 'camion') {
          const cantidad = parseInt(document.getElementById('camion').value) || 0;
          if (cantidad <= 0) {
            alert('Ingresa una cantidad mayor a 0 para camión');
            return;
          }
          const total = cantidad * PRECIO_CAMION;
          const venta = {
            id: ++contadorVentas,
            hora,
            tipo: 'Camión',
            detalles: '-',
            cantidad,
            precioUnitario: `${formatCurrency(PRECIO_CAMION)}`,
            total
          };
          ventasDelDia.push(venta);
          actualizarTablaRegistros();
          actualizarTotalDiario();
          guardarEnStorage();
          document.getElementById('camion').value = '';
          limpiarFormulario(); // 🔹 agregado aquí
          mostrarConfirmacion('💾 Venta de camión guardada', '#f39c12');
          return;
        }

        // 🔹 Función para limpiar formulario y totales
      function limpiarFormulario() {
        // Limpiar inputs
        document.getElementById('ventaLocal').value = '';
        document.getElementById('camion').value = '';
        document.getElementById('empleadoNombre').value = '';
        const empleadosInputs = document.querySelectorAll('.empleado-cantidad');
        empleadosInputs.forEach(input => input.value = '');

        // 🔹 Limpiar totales mostrados
        document.getElementById('totalBotellones').textContent = '0';
        document.getElementById('precioServicio').textContent = '$0';
        document.getElementById('tipoServicio').textContent = '-';
        document.getElementById('totalPagar').textContent = '$0';
        document.getElementById('montoFinal').textContent = '$0';
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
      id: ++contadorVentas,
      hora,
      tipo: 'Delivery',
      detalles: emp ? emp.nombre : 'Repartidor',
      cantidad,
      precioUnitario: `${formatCurrency(PRECIO_DELIVERY)}`,
      total
    };
    ventasDelDia.push(venta);
    actualizarTablaRegistros();
    actualizarTotalDiario();
    guardarEnStorage();
    input.value = '';
    limpiarFormulario(); // 🔹 agregado aquí
    mostrarConfirmacion(`💾 Entrega de ${emp ? emp.nombre : 'repartidor'} guardada`, '#c0392b');
    return;
  }
};


      // ---------- GASTOS ----------
      window.guardarGasto = function () {
        const monto = parseFloat(document.getElementById('montoGasto').value) || 0;
        const nota = document.getElementById('notaGasto').value.trim();
        if (monto <= 0) { alert('⚠️ Por favor ingresa un monto válido para el gasto'); document.getElementById('montoGasto').focus(); return; }
        if (!nota) { alert('⚠️ Por favor describe el gasto'); document.getElementById('notaGasto').focus(); return; }
        const ahora = new Date();
        const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const nuevoGasto = { id: ++contadorVentas, hora, tipo: 'Gasto', detalles: nota, cantidad: '-', precioUnitario: '-', total: -Math.abs(monto) };
        ventasDelDia.push(nuevoGasto);
        actualizarTablaRegistros(); actualizarTotalDiario(); guardarEnStorage(); limpiarGastos();
        mostrarConfirmacion('💾 Gasto guardado correctamente', '#f39c12');
      };

      function limpiarGastos() { document.getElementById('montoGasto').value = ''; document.getElementById('notaGasto').value = ''; }

      // ---------- OTROS SERVICIOS ----------
      window.guardarOtroServicio = function () {
        const precio = parseFloat(document.getElementById('precioOtro').value) || 0;
        const cantidad = parseInt(document.getElementById('cantidadOtro').value) || 0;
        const descripcion = document.getElementById('descripcionOtro').value.trim() || 'Sin descripción';
        if (precio <= 0) { alert('⚠️ Ingresa un precio válido'); document.getElementById('precioOtro').focus(); return; }
        if (cantidad <= 0) { alert('⚠️ Ingresa una cantidad válida'); document.getElementById('cantidadOtro').focus(); return; }
        if (!descripcion) { alert('⚠️ Por favor describe el servicio'); document.getElementById('descripcionOtro').focus(); return; }
        const total = precio * cantidad;
        const ahora = new Date();
        const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const nuevoServicio = { id: ++contadorVentas, hora, tipo: 'Otros', detalles: descripcion, cantidad, precioUnitario: `${formatCurrency(precio)}`, total };
        ventasDelDia.push(nuevoServicio);
        actualizarTablaRegistros(); actualizarTotalDiario(); guardarEnStorage(); limpiarOtrosServicios();
        mostrarConfirmacion('💾 Servicio guardado correctamente', '#8e44ad');
      };

      function limpiarOtrosServicios() { document.getElementById('precioOtro').value = ''; document.getElementById('cantidadOtro').value = ''; document.getElementById('descripcionOtro').value = ''; }

      // ---------- TABLA ----------
      function actualizarTablaRegistros() {
        const tbody = document.getElementById('tablaRegistros');
        if (!tbody) return;
        if (ventasDelDia.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" style="color:#888; font-style:italic">No hay ventas registradas</td></tr>';
          return;
        }

        tbody.innerHTML = ventasDelDia.map(registro => {
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

          return `
            <tr>
              <td>${registro.hora || '-'}</td>
              <td><span class="service-type ${tipoClass}">${registro.tipo || '-'}</span></td>
              <td style="font-size:.9em;">${detalles}</td>
              <td>${cantidad}</td>
              <td>${precioUnit}</td>
              <td style="font-weight:700; color:${color};">${textoTotal}</td>
              <td><button class="delete-btn" onclick="eliminarRegistro(${registro.id})">🗑️</button></td>
            </tr>
          `;
        }).join('');
      }

      window.eliminarRegistro = function (id) {
        if (!confirm('¿Está seguro de eliminar este registro?')) return;
        ventasDelDia = ventasDelDia.filter(r => r.id !== id);
        actualizarTablaRegistros(); actualizarTotalDiario(); guardarEnStorage();
      };

      function actualizarTotalDiario() {
        let totalDinero = 0;
        let totalLocal = 0;
        let totalDelivery = 0;
        let totalCamion = 0;
        let totalBotellones = 0;

        ventasDelDia.forEach(r => {
          const total = Number(r.total) || 0;
          totalDinero += total;

          // Botellones por registro (prioriza totalBotellones, luego cantidad, luego ventaLocal)
          if (Number(r.totalBotellones)) {
            totalBotellones += Number(r.totalBotellones);
          } else if (Number(r.cantidad)) {
            totalBotellones += Number(r.cantidad);
          } else if (Number(r.ventaLocal)) {
            totalBotellones += Number(r.ventaLocal);
          }

          // Local
          if (r.tipo === 'Local') {
            totalLocal += Number(r.cantidad) || Number(r.ventaLocal) || 0;
          } else {
            if (Number(r.ventaLocal)) totalLocal += Number(r.ventaLocal);
          }

          // Delivery
          if (r.tipo === 'Delivery') {
            totalDelivery += Number(r.cantidad) || Number(r.totalDelivery) || 0;
          } else {
            if (Number(r.totalDelivery)) totalDelivery += Number(r.totalDelivery);
          }

          // Camión
          if (r.tipo === 'Camión' || r.tipo === 'Camion') {
            totalCamion += Number(r.cantidad) || Number(r.camion) || 0;
          } else {
            if (Number(r.camion)) totalCamion += Number(r.camion);
          }
        });

        document.getElementById('totalDiario').textContent = formatCurrency(totalDinero);
        document.getElementById('ventasLocal').textContent = totalLocal;
        document.getElementById('ventasDelivery').textContent = totalDelivery;
        document.getElementById('ventasCamion').textContent = totalCamion;
        document.getElementById('botellonesTotal').textContent = totalBotellones;
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
        const header = ['Fecha','Hora','Tipo','Detalles','Cantidad','Precio Unit.','Total'];
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
        link.setAttribute('download', `ventas_agua_${fecha.replace(/\//g,'-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert('✅ Archivo CSV exportado correctamente!');
      };

      // ---------- FEEDBACK ----------
      function mostrarConfirmacion(mensaje, color) {
        const notification = document.createElement('div');
        notification.style.cssText = `position:fixed; top:20px; right:20px; background:${color}; color:white; padding:12px 16px; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.2); z-index:9999; font-weight:700;`;
        notification.textContent = mensaje;
        document.body.appendChild(notification);
        setTimeout(() => { notification.style.opacity = '0'; notification.style.transform = 'translateY(-10px)'; setTimeout(()=> notification.remove(), 300); }, 2600);
      }

       function guardarIndividual(tipo) {
      console.log('Guardar individual:', tipo);
    }

    function agregarEmpleado() {
      console.log('Agregar empleado');
    }

    function guardarVenta() {
      console.log('Guardar venta');
    }

    function limpiarFormulario() {
      console.log('Limpiar formulario');
    }

    function exportarCSV() {
      console.log('Exportar CSV');
    }

    function guardarGasto() {
      console.log('Guardar gasto');
    }

    function guardarOtroServicio() {
      console.log('Guardar otro servicio');
    }

    function limpiarRegistros() {
      console.log('Limpiar registros');
    }

      // ---------- INICIALIZACIÓN ----------
      function init() {
        cargarDesdeStorage();
        actualizarEmpleadosVisual();
        configurarEventListeners();
        actualizarTablaRegistros();
        actualizarTotalDiario();
        calcularTotal();
      }

      document.addEventListener('DOMContentLoaded', init);
    })();

    ventasRef.orderBy("hora", "asc").onSnapshot(snapshot => {
  ventasDelDia = [];
  snapshot.forEach(doc => {
    ventasDelDia.push(doc.data());
  });
  actualizarTablaRegistros();
  actualizarTotalDiario();
});
