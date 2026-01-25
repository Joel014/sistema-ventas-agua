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


  // Constants now provided by js/modules/config.js via Global Bridge
  // const PRECIO_LOCAL = 25;
  // const PRECIO_CAMION = 30;
  // const PRECIO_DELIVERY = 35;

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

  window.handleEmpPhotoSelect = function (input) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById('empPhotoPreview').src = e.target.result;
        document.getElementById('empPhotoPreview').style.display = 'block';
        document.getElementById('empPhotoPlaceholder').style.display = 'none';
        window.tempEmpPhotoBase64 = e.target.result;
      };
      reader.readAsDataURL(input.files[0]);
    }
  };

  function actualizarEmpleadosVisual() {
    const container = document.getElementById('repartidoresList');
    const gridContainer = document.getElementById('grid-empleados');
    if (!container && !gridContainer) return;

    // 1. Render simple list for Delivery Section (Planta View)
    if (container) {
      const deliveryStaff = empleados.filter(emp =>
        emp.cargo === 'Delivery' && emp.activo !== false
      );
      console.log("🚚 Repartidores filtrados (Solo Delivery):", deliveryStaff.length);

      if (deliveryStaff.length === 0) {
        container.innerHTML = '<div style="color:#999; font-style:italic; grid-column:1 / -1">No hay repartidores agregados (Cargo: Delivery)</div>';
      } else {
        container.innerHTML = deliveryStaff.map(emp => `
                <div style="display:flex; flex-direction:column; background:rgba(255,255,255,0.03); padding:12px; border-radius:12px; border:1px solid var(--border); margin-bottom:10px; transition: transform 0.2s;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:36px; height:36px; background:rgba(0,194,255,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--primary); overflow:hidden;">
                                ${emp.photo ? `<img src="${emp.photo}" style="width:100%; height:100%; object-fit:cover;">` : '<i class="bi bi-person-fill" style="font-size:18px;"></i>'}
                            </div>
                            <span style="font-weight:600; font-size:15px; color:var(--text-main); letter-spacing:0.3px;">${emp.nombre}</span>
                        </div>
                        <!-- Trash icon removed to prevent accidental employee deletion -->
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
    }

    // 2. Render Full Cards for Dedicated Employees View
    if (gridContainer) {
      document.getElementById('totalEmpCount').textContent = empleados.length;
      const activeEmployees = empleados.filter(e => e.activo !== false);

      // --- Calculate Payroll Stats ---
      const totalNomina = activeEmployees.reduce((sum, e) => sum + ((e.sueldo || 0) - (e.balance || 0)), 0);
      const statNomina = document.getElementById('totalNominaPagar');
      if (statNomina) statNomina.textContent = formatCurrency(Math.max(0, totalNomina));

      // Filter logic for Soft Delete
      const showArchived = window.verEmpleadosArchivados || false;
      const employeesToDisplay = showArchived ? empleados.filter(e => e.activo === false) : activeEmployees;

      if (employeesToDisplay.length === 0) {
        gridContainer.innerHTML = `<div style="color:#999; font-style:italic; padding:20px;">${showArchived ? 'No hay empleados archivados' : 'No hay empleados activos'}</div>`;
      } else {
        gridContainer.innerHTML = employeesToDisplay.map(emp => {
          const sueldo = emp.sueldo ? formatCurrency(emp.sueldo) : 'RD$ 0';
          const esInactivo = emp.activo === false;
          const balance = emp.balance || 0;
          const comidaBalance = emp.comidaBalance || 0;

          return `
                <div class="glass-card employee-card-premium ${esInactivo ? 'archived-card' : ''}" style="${esInactivo ? 'opacity:0.6; filter: grayscale(1);' : ''}">
                    <!-- Header Info -->
                    <div class="emp-profile-header">
                        <div class="emp-avatar-container">
                            ${emp.photo ? `<img src="${emp.photo}" alt="${emp.nombre}">` : '<i class="bi bi-person"></i>'}
                        </div>
                        <div style="flex:1;">
                            <h3 style="margin:0; font-size:18px; color:white;">${emp.nombre}</h3>
                            <div style="font-size:12px; color:var(--text-muted);">${emp.telefono || 'Sin Tel.'}</div>
                            <div style="font-size:12px; color:var(--primary); font-weight:600; text-transform:uppercase; margin-top:2px;">${emp.cargo || 'Chofer'}</div>
                        </div>
                        <div class="emp-header-actions" style="display:flex; flex-direction:row; gap:8px;">
                            <button onclick="prepararEdicionEmpleado('${emp.id}')" class="btn-icon-subtle" title="Editar">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button onclick="verHistorialEmpleado('${emp.id}')" class="btn-icon-subtle" title="Historial">
                                <i class="bi bi-clock-history"></i>
                            </button>
                            ${esInactivo ? `
                                <button onclick="activarEmpleado('${emp.id}')" class="btn-icon-subtle success" title="Reactivar">
                                    <i class="bi bi-person-check"></i>
                                </button>
                            ` : `
                                <button onclick="archivarEmpleado('${emp.id}')" class="btn-icon-subtle danger" title="Dar de Baja">
                                    <i class="bi bi-person-x"></i>
                                </button>
                            `}
                        </div>
                    </div>

                    <!-- Stats Blocks -->
                    <div class="emp-stat-grid">
                        <div class="emp-stat-box" style="background:#3b82f6; color:white;">
                            <span class="label">Sueldo Base</span>
                            <span class="value">${sueldo}</span>
                        </div>
                        <div class="emp-stat-box" style="background:white; color:#1e293b;">
                            <span class="label">Adelantos</span>
                            <span class="value">RD$ ${balance.toLocaleString()}</span>
                        </div>
                        <div class="emp-stat-box" style="background:#10b981; color:white;">
                            <span class="label">Comida Acum.</span>
                            <span class="value">RD$ ${comidaBalance.toLocaleString()}</span>
                        </div>
                        <div style="display:flex; align-items:stretch;">
                             <button class="btn btn-sm" style="width:100%; font-size:11px; padding:4px; background:rgba(255,255,255,0.1); color:white; border:1px solid rgba(255,255,255,0.2); border-radius:12px;" onclick="registrarComida('${emp.id}')" ${esInactivo ? 'disabled' : ''}>
                                <i class="bi bi-cup-hot"></i> +$150 Hoy
                             </button>
                        </div>
                    </div>

                    <!-- Footer Actions -->
                    <div style="display:flex; gap:12px; margin-top:15px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.1);">
                        <button class="btn primary" style="flex:1; height:42px; border-radius:12px; font-weight:600;" onclick="liquidarNomina('${emp.id}')" ${esInactivo ? 'disabled' : ''}>
                            <i class="bi bi-cash-stack"></i> Pagar Nómina
                        </button>
                        <button class="btn btn-outline" style="flex:1; height:42px; border-radius:12px; font-weight:600; color:white; border-color:rgba(255,255,255,0.3);" onclick="toggleAdelantoModal('${emp.id}')" ${esInactivo ? 'disabled' : ''}>
                            <i class="bi bi-plus-circle"></i> Nuevo Adelanto
                        </button>
                    </div>
                </div>
                `;
        }).join('');
      }
    }
  }

  // --- EMPLOYEE MODAL & FORM ---
  window.toggleNuevoEmpleadoModal = function () {
    const modal = document.getElementById('modalNuevoEmpleado');
    if (modal) {
      modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';

      // Reset if opening
      if (modal.style.display === 'flex') {
        document.getElementById('formNuevoEmpleado').reset();
        document.getElementById('empIdEdit').value = ''; // Update Mode OFF
        document.getElementById('empFecha').valueAsDate = new Date();
        // Reset Photo Preview
        document.getElementById('empPhotoPreview').src = '';
        document.getElementById('empPhotoPreview').style.display = 'none';
        document.getElementById('empPhotoPlaceholder').style.display = 'block';
        window.tempEmpPhotoBase64 = null;
        // Reset title
        modal.querySelector('h3').innerHTML = '<i class="bi bi-person-plus"></i> Registro de Empleado';
      }
    }
  };

  window.prepararEdicionEmpleado = function (id) {
    const emp = empleados.find(e => e.id === id);
    if (!emp) return;

    window.toggleNuevoEmpleadoModal();
    // Override with Edit Data
    const modal = document.getElementById('modalNuevoEmpleado');
    modal.querySelector('h3').innerHTML = '<i class="bi bi-pencil"></i> Editar Empleado';

    document.getElementById('empIdEdit').value = emp.id;
    document.getElementById('empNombre').value = emp.nombre;
    document.getElementById('empCedula').value = emp.cedula || '';
    document.getElementById('empTelefono').value = emp.telefono || '';
    document.getElementById('empCargo').value = emp.cargo || 'Chofer';
    document.getElementById('empSueldo').value = emp.sueldo || '';
    if (emp.fechaIngreso) document.getElementById('empFecha').value = emp.fechaIngreso;

    // Load Photo
    if (emp.photo) {
      document.getElementById('empPhotoPreview').src = emp.photo;
      document.getElementById('empPhotoPreview').style.display = 'block';
      document.getElementById('empPhotoPlaceholder').style.display = 'none';
      window.tempEmpPhotoBase64 = emp.photo;
    } else {
      document.getElementById('empPhotoPreview').src = '';
      document.getElementById('empPhotoPreview').style.display = 'none';
      document.getElementById('empPhotoPlaceholder').style.display = 'block';
      window.tempEmpPhotoBase64 = null;
    }
  };

  const formNuevoEmpleado = document.getElementById('formNuevoEmpleado');
  if (formNuevoEmpleado) {
    formNuevoEmpleado.onsubmit = async (e) => {
      e.preventDefault();
      const idEdit = document.getElementById('empIdEdit').value;
      const nombre = document.getElementById('empNombre').value;
      const cedula = document.getElementById('empCedula').value;
      const telefono = document.getElementById('empTelefono').value;
      const cargo = document.getElementById('empCargo').value;
      const sueldo = parseFloat(document.getElementById('empSueldo').value) || 0;

      const fechaIngreso = document.getElementById('empFecha').value;

      if (!nombre.trim()) return;

      const empData = {
        nombre: nombre.trim(),
        cedula: cedula.trim(),
        telefono: telefono.trim(),
        cargo,
        sueldo,
        fechaIngreso,
        photo: window.tempEmpPhotoBase64 || null
      };

      try {
        if (idEdit) {
          // UPDATE
          await db.collection("empleados").doc(idEdit).update({
            ...empData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        } else {
          // CREATE
          await db.collection("empleados").add({
            ...empData,
            activo: true,
            balance: 0, // Init Balance
            ts: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
        window.toggleNuevoEmpleadoModal();
        mostrarConfirmacion(idEdit ? 'Empleado actualizado' : 'Empleado guardado');
      } catch (err) {
        console.error(err);
        alert("Error: " + err.message);
      }
    };
  }

  // --- ADELANTOS LOGIC ---
  window.toggleAdelantoModal = function (id) {
    const modal = document.getElementById('modalAdelanto');
    if (modal) {
      modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
      if (modal.style.display === 'flex' && id) {
        const emp = empleados.find(e => e.id === id);
        if (emp) {
          document.getElementById('adelantoEmpId').value = emp.id;
          document.getElementById('adelantoEmpNombre').value = emp.nombre;
          document.getElementById('adelantoMonto').value = '';
          document.getElementById('adelantoNota').value = '';
        }
      }
    }
  };

  const formAdelanto = document.getElementById('formAdelanto');
  if (formAdelanto) {
    formAdelanto.onsubmit = async (e) => {
      e.preventDefault();
      const empId = document.getElementById('adelantoEmpId').value;
      const monto = parseFloat(document.getElementById('adelantoMonto').value) || 0;
      const nota = document.getElementById('adelantoNota').value.trim();

      if (monto <= 0) { alert("Monto inválido"); return; }
      const emp = empleados.find(e => e.id === empId);

      try {
        const batch = db.batch();

        // 1. Create Transaction in Sales (Cash Out)
        const ventaRef = db.collection("ventas").doc();
        const descripcion = `Adelanto a ${emp ? emp.nombre : 'Empleado'} - ${nota}`;
        batch.set(ventaRef, {
          timestamp: Date.now(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          tipo: 'Gasto', // Treat as Gasto for Cash Flow
          categoria: 'Nómina', // New Category
          subtipo: 'Adelanto',
          empleadoId: empId,
          descripcion: descripcion,
          detalles: descripcion,
          cantidad: 1,
          precioUnitario: formatCurrency(monto),
          total: -Math.abs(monto) // Negative for cash flow
        });

        // 2. Update Employee Balance (Increase Debt)
        const empRef = db.collection("empleados").doc(empId);
        // We need atomic increment
        batch.update(empRef, {
          balance: firebase.firestore.FieldValue.increment(monto),
          lastAdelanto: firebase.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        window.toggleAdelantoModal();
        mostrarConfirmacion('Adelanto registrado y descontado de caja', '#e67e22');

        // Refreshes handled by listeners
      } catch (err) {
        console.error(err);
        alert("Error al guardar adelanto: " + err.message);
      }
    };
  }

  const btnNuevoEmp = document.getElementById('btnNuevoEmpleado');
  if (btnNuevoEmp) {
    btnNuevoEmp.onclick = () => window.toggleNuevoEmpleadoModal();
  }

  // --- HRIS LOGIC (Professional Upgrade) ---

  window.archivarEmpleado = function (id) {
    Swal.fire({
      title: '¿Dar de Baja?',
      text: "El empleado será archivado pero no eliminado. Podrás ver su historial.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      confirmButtonText: 'Sí, dar de baja',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        db.collection("empleados").doc(id).update({
          activo: false,
          fechaSalida: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          mostrarConfirmacion('Empleado archivado correctamente', '#e67e22');
          // UI updates auto via real-time listener
        }).catch(err => {
          console.error(err);
          alert("Error al archivar");
        });
      }
    });
  };

  window.activarEmpleado = function (id) {
    db.collection("empleados").doc(id).update({
      activo: true,
      fechaReactivacion: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      mostrarConfirmacion('Empleado reactivado');
    }).catch(err => {
      console.error(err);
      alert("Error al reactivar");
    });
  };

  window.verHistorialEmpleado = function (id) {
    // Placeholder for history view
    Swal.fire({
      title: 'Historial de Empleado',
      text: 'Esta función mostrará todos los adelantos y pagos realizados. Próximamente.',
      icon: 'info',
      confirmButtonColor: 'var(--primary)',
      background: 'rgba(30,30,30,0.95)',
      color: '#fff'
    });
  };

  // Logic for Payroll Liquidation (Phase 4: Bi-monthly + Comida)
  window.liquidarNomina = function (id) {
    const emp = empleados.find(e => e.id === id);
    if (!emp) return;

    const sueldoBase = emp.sueldo || 0;
    const quincena = sueldoBase / 2;
    const balance = emp.balance || 0;
    const comida = emp.comidaBalance || 0;

    // Propose Quincenal by default
    let netoAPagar = quincena + comida - balance;

    Swal.fire({
      title: 'Liquidar Nómina',
      html: `
        <div style="text-align:left; font-size:14px;">
            <p><strong>Empleado:</strong> ${emp.nombre}</p>
            <div style="background:rgba(0,194,255,0.05); padding:10px; border-radius:8px; margin-bottom:10px;">
                <label style="font-size:11px; color:var(--text-muted);">Tipo de Pago:</label>
                <select id="payType" class="form-control" style="margin-top:5px;">
                    <option value="quincena">Quincena (50% Salario)</option>
                    <option value="mes">Mes Completo (100% Salario)</option>
                </select>
            </div>
            <div id="liquidationSummary">
                <p>Calculando...</p>
            </div>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: '✅ Registrar Pago',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#27ae60',
      didOpen: () => {
        const select = document.getElementById('payType');
        const summary = document.getElementById('liquidationSummary');

        const updateSummary = () => {
          const type = select.value;
          const valSueldo = type === 'quincena' ? quincena : sueldoBase;
          const valNeto = valSueldo + comida - balance;
          summary.innerHTML = `
            <p><strong>Salario:</strong> ${formatCurrency(valSueldo)}</p>
            <p><strong>+ Comida:</strong> +${formatCurrency(comida)}</p>
            <p><strong>- Adelantos:</strong> -${formatCurrency(balance)}</p>
            <hr style="border:0; border-top:1px solid #eee; margin: 10px 0;">
            <p style="font-size:18px;"><strong>Neto a Pagar:</strong> <span style="color:#27ae60; font-weight:bold;">${formatCurrency(valNeto)}</span></p>
          `;
        };

        select.onchange = updateSummary;
        updateSummary();
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const type = document.getElementById('payType').value;
        const finalSueldo = type === 'quincena' ? quincena : sueldoBase;
        const finalNeto = finalSueldo + comida - balance;

        const batch = db.batch();
        const ventaRef = db.collection("ventas").doc();
        const descripcion = `Pago Nómina (\${type}) - \${emp.nombre}`;

        batch.set(ventaRef, {
          timestamp: Date.now(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          tipo: 'Gasto',
          categoria: 'Nómina',
          subtipo: 'Pago Salario',
          empleadoId: id,
          descripcion: descripcion,
          detalles: descripcion,
          cantidad: 1,
          precioUnitario: formatCurrency(Math.max(0, finalNeto)),
          total: -Math.abs(Math.max(0, finalNeto))
        });

        batch.update(db.collection("empleados").doc(id), {
          balance: 0,
          comidaBalance: 0,
          ultimoPago: firebase.firestore.FieldValue.serverTimestamp()
        });

        batch.commit().then(() => {
          mostrarConfirmacion('Pago de nómina registrado correctamente');
        }).catch(err => {
          console.error(err);
          alert("Error al liquidar");
        });
      }
    });
  };

  window.registrarComida = function (id) {
    const today = new Date();
    // Dominio = 0
    if (today.getDay() === 0) {
      Swal.fire('Hoy es Domingo', 'Los Domingos no se registra comida según la política actual.', 'info');
      return;
    }

    const emp = empleados.find(e => e.id === id);
    if (!emp) return;

    const batch = db.batch();
    const ventaRef = db.collection("ventas").doc();
    const descripcion = `Dieta/Comida - ${emp.nombre}`;

    // Record as a transaction for traceability
    batch.set(ventaRef, {
      timestamp: Date.now(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      tipo: 'Gasto',
      categoria: 'Nómina',
      subtipo: 'Comida',
      empleadoId: id,
      descripcion: descripcion,
      cantidad: 1,
      precioUnitario: 150,
      total: -150
    });

    batch.update(db.collection("empleados").doc(id), {
      comidaBalance: firebase.firestore.FieldValue.increment(150),
      lastComida: firebase.firestore.FieldValue.serverTimestamp()
    });

    batch.commit().then(() => {
      mostrarConfirmacion('Comida diaria (+RD$ 150) registrada', '#2ecc71');
    }).catch(err => {
      console.error(err);
      alert("Error al registrar comida");
    });
  };

  window.reactivarEmpleado = function (id) {
    db.collection("empleados").doc(id).update({
      activo: true,
      fechaReingreso: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      mostrarConfirmacion('Empleado reactivado');
    });
  };

  window.verHistorialEmpleado = async function (id) {
    const emp = empleados.find(e => e.id === id);
    if (!emp) return;

    Swal.fire({
      title: 'Historial: ' + emp.nombre,
      html: '<div id="historialLoader" class="spinner"></div><div id="historialLista" style="max-height:300px; overflow-y:auto; font-size:12px; text-align:left;"></div>',
      width: '400px',
      showConfirmButton: false
    });

    try {
      // Use where only, and sort client-side to avoid "Hidden Index Required" errors for the user
      const q = await db.collection("ventas")
        .where("empleadoId", "==", id)
        .limit(50)
        .get();

      const lista = document.getElementById('historialLista');
      document.getElementById('historialLoader').style.display = 'none';

      if (q.empty) {
        lista.innerHTML = '<p style="text-align:center; color:#888;">No hay transacciones registradas.</p>';
        return;
      }

      // Sort in JS to ensure it works without complex composite indexes
      const docs = q.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => b.timestamp - a.timestamp);

      lista.innerHTML = docs.map(d => {
        const date = new Date(d.timestamp).toLocaleDateString();
        // Dynamic colors for subtypes
        let color = '#27ae60'; // default green (pay)
        if (d.subtipo === 'Adelanto' || d.subtipo === 'Comida') color = '#e67e22'; // orange for advances/benefits
        if (d.subtipo === 'Pago Salario') color = '#27ae60'; // strong green for final pay

        return `
          <div style="border-bottom:1px solid #eee; padding:8px 0; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:bold;">${d.subtipo || d.tipo}</div>
              <div style="font-size:10px; color:#888;">${date} - ${d.descripcion || ''}</div>
            </div>
            <div style="font-weight:bold; color:${color};">${formatCurrency(Math.abs(d.total))}</div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error(err);
      document.getElementById('historialLista').innerHTML = '<p style="color:red;">Error al cargar historial.</p>';
    }
  };

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

  // Function agregarGasto removed (consolidated into guardarGasto)

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
      ? (tipoServicio === 'Local' ? `${formatCurrency(PRECIO_LOCAL)} ` : tipoServicio === 'Delivery' ? `${formatCurrency(PRECIO_DELIVERY)} ` : `${formatCurrency(PRECIO_CAMION)} `)
      : 'Var.';

    const detallesEntregas = entregas.length > 0 ? entregas.map(e => `${e.nombre} (${e.cantidad})`).join(', ') : '';

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
    console.log(`💾 guardarIndividual called for: ${campo} `);
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
        vendedor: window.currentUserEmail,
        hora,
        tipo: 'Local',
        detalles: '-',
        cantidad,
        precioUnitario: PRECIO_LOCAL,
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
      const cantidad = parseInt(document.getElementById('qtyLocal').value || document.getElementById('qtyCamion').value) || 0;
      if (cantidad <= 0) {
        alert('Ingresa una cantidad mayor a 0 para camión');
        return;
      }

      const clientSelector = document.getElementById('clienteCamionSelector');
      let finalPrice = PRECIO_CAMION; // Default 30
      let clientDetails = '';
      let clienteId = null;
      let clienteNombre = 'Casual';

      if (clientSelector && clientSelector.value) {
        clienteId = clientSelector.value;
        const selectedOption = clientSelector.options[clientSelector.selectedIndex];
        clienteNombre = selectedOption.text.split(' - ')[0];
        const customPrice = parseFloat(selectedOption.getAttribute('data-precio'));
        if (!isNaN(customPrice)) finalPrice = customPrice;

        const clientData = (window.listaClientes || []).find(c => c.id === clienteId);
        if (clientData) {
          clientDetails = ` | Cliente: ${clientData.nombre} (${clientData.direccion || ''})`;
        }
      }

      // --- ASYNC PROMPTS (SweetAlert2) ---
      Swal.fire({
        title: '🚚 Modalidad de Venta',
        text: '¿Cómo se realizó este despacho?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-people-fill"></i> Con Ayudante',
        cancelButtonText: '<i class="bi bi-person-fill"></i> Solo',
        confirmButtonColor: 'var(--primary)',
        cancelButtonColor: 'var(--secondary)',
        reverseButtons: true
      }).then((result) => {
        // Cancel = "Solo", Confirm = "Ayudante", Dismiss = Close
        if (result.dismiss === Swal.DismissReason.backdrop || result.dismiss === Swal.DismissReason.esc) return;

        const modeVal = result.isConfirmed ? 'Ayudante' : 'Solo';

        // Step 2: Payment Status
        Swal.fire({
          title: '💰 Estado de Pago',
          text: '¿El cliente pagó este pedido ahora?',
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: '✅ SÍ, PAGADO',
          cancelButtonText: '❌ NO, FIADO',
          confirmButtonColor: '#2ecc71',
          cancelButtonColor: '#e74c3c'
        }).then((payResult) => {
          if (payResult.dismiss === Swal.DismissReason.backdrop || payResult.dismiss === Swal.DismissReason.esc) return;

          const estadoPago = payResult.isConfirmed ? 'pagado' : 'pendiente';
          const comment = document.getElementById('commentCamion').value.trim();
          const descripcion = modeVal + (comment ? ` - ${comment}` : '');
          const totalCalculado = cantidad * finalPrice;
          const cantidadVacios = parseInt(document.getElementById('qtyCamionVacios').value) || 0;

          const venta = {
            timestamp: Date.now(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            vendedor: window.currentUserEmail,
            hora,
            tipo: 'Camión',
            detalles: (descripcion || '-') + clientDetails,
            cantidad,
            botellonesVacios: cantidadVacios,
            precioUnitario: finalPrice,
            total: totalCalculado,
            clienteId,
            clienteNombre,
            estadoPago
          };

          ventasRef.add(venta)
            .then(() => {
              document.getElementById('qtyCamion').value = '';
              document.getElementById('qtyCamionVacios').value = '';
              document.getElementById('commentCamion').value = '';
              mostrarConfirmacion(`💾 Venta (${modeVal} / ${estadoPago}) guardada`, result.isConfirmed ? '#f39c12' : '#f1c40f');
            })
            .catch(err => { console.error(err); alert("Error guardando venta"); });
        });
      });
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
        vendedor: window.currentUserEmail,
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
  // ---------- GASTOS ----------
  window.guardarGasto = function () {
    const monto = parseFloat(document.getElementById('gastoMonto').value) || 0;
    const categoria = document.getElementById('gastoCategoria').value || 'Otros';
    const nota = document.getElementById('gastoDesc').value.trim();

    if (monto <= 0) { alert('⚠️ Por favor ingresa un monto válido'); document.getElementById('gastoMonto').focus(); return; }
    // if (!categoria) { alert('⚠️ Selecciona una CATEGORÍA para el gasto'); document.getElementById('gastoCategoria').focus(); return; } // Removed strict check, default to Others

    // Construct description: "Combustible - Gasolina Camion" or just "Combustible"
    const descripcionFinal = categoria + (nota ? ` - ${nota} ` : '');

    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const nuevoGasto = {
      timestamp: Date.now(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      vendedor: window.currentUserEmail,
      hora,
      tipo: 'Gasto',
      categoria: categoria, // Structured Field
      descripcion: descripcionFinal,
      detalles: descripcionFinal,
      cantidad: 1, // Changed from '-' to 1 for consistency
      precioUnitario: `${formatCurrency(monto)}`,
      total: -Math.abs(monto)
    };

    ventasRef.add(nuevoGasto)
      .then(() => {
        // Update Local State IMMEDIATELY
        ventasDelDia.push(nuevoGasto);

        // Refresh UI
        actualizarTotalDiario();
        actualizarReportes(); // New Reports Module
        actualizarTablaRegistros();
        renderRecentActivity(); // If main dashboard has recent list
        guardarEnStorage();

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
      precioUnitario: `${formatCurrency(precio)} `,
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


  window.editarRegistro = function (id) {
    const loadingPopup = Swal.fire({
      title: 'Cargando...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    window.ventasRef.doc(id).get().then(doc => {
      loadingPopup.close();

      if (!doc.exists) {
        Swal.fire('Error', 'Registro no encontrado', 'error');
        return;
      }

      const data = doc.data();
      const isGasto = data.tipo === 'Gasto';
      const isCamion = data.tipo === 'Camión';

      // Prepare initial values
      const currentDetalle = data.detalles || data.descripcion || '';
      const currentQty = data.cantidad || 1;
      // Absolute values for editing
      const currentTotal = Math.abs(data.total || 0);
      let currentPrecio = 0;
      if (typeof data.precioUnitario === 'number') {
        currentPrecio = data.precioUnitario;
      } else if (typeof data.precioUnitario === 'string') {
        // Legacy: Extract number from string like "RD$ 30.00"
        currentPrecio = parseFloat(data.precioUnitario.replace(/[^0-9.]/g, '')) || (currentTotal / currentQty);
      } else {
        currentPrecio = (currentTotal / currentQty);
      }

      // Fix potential Infinity if qty is 0
      if (!isFinite(currentPrecio)) currentPrecio = currentTotal;

      // Determine Modality (Subtype) if applicable
      let currentModality = data.subtipo || 'Solo';
      if (!data.subtipo && isCamion) {
        // Try to guess from details if legacy
        if (currentDetalle.toLowerCase().includes('ayudante')) currentModality = 'Ayudante';
      }

      Swal.fire({
        title: 'Editar Registro',
        html: `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
              
              <!-- MODALITY / TYPE SELECTOR -->
              <div>
                <label style="display:block; margin-bottom:4px; color:#666; font-weight:600;">Modalidad / Tipo</label>
                <select id="swal-edit-mode" class="swal2-input" style="margin:0; width:100%; height:38px; padding:0 10px;">
                  ${isCamion
            ? `<option value="Solo" ${currentModality === 'Solo' ? 'selected' : ''}>👤 Solo (Yo)</option>
                         <option value="Ayudante" ${currentModality === 'Ayudante' ? 'selected' : ''}>👥 Con Ayudante</option>`
            : `<option value="${data.tipo}" selected>${data.tipo}</option>`
          }
                </select>
              </div>

              <!-- PAYMENT STATUS -->
              <div>
                <label style="display:block; margin-bottom:4px; color:#666; font-weight:600;">Estado de Pago</label>
                <select id="swal-edit-payment" class="swal2-input" style="margin:0; width:100%; height:38px; padding:0 10px;">
                  <option value="pagado" ${data.estadoPago === 'pagado' ? 'selected' : ''}>✅ PAGADO</option>
                  <option value="pendiente" ${data.estadoPago === 'pendiente' ? 'selected' : ''}>❌ PENDIENTE</option>
                </select>
              </div>
            </div>

            <!-- CLIENT SELECTOR -->
            <div style="margin-bottom:10px;">
              <label style="display:block; margin-bottom:4px; color:#666; font-weight:600;">Asignar a Cliente</label>
              <select id="swal-edit-client" class="swal2-input" style="margin:0; width:100%; height:38px; padding:0 10px;">
                <option value="" ${!data.clienteId ? 'selected' : ''}>👤 Cliente Casual (Sin ID)</option>
                ${(window.listaClientes || []).map(c => `
                  <option value="${c.id}" ${data.clienteId === c.id ? 'selected' : ''}>${c.nombre}</option>
                `).join('')}
              </select>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px;">
              <!-- QUANTITY INPUT -->
              <div>
                <label style="display:block; margin-bottom:4px; color:#666; font-weight:600;">Cantidad</label>
                <input id="swal-edit-qty" type="number" class="swal2-input" style="margin:0; width:100%; height:38px;" 
                       value="${currentQty}" min="1" step="1">
              </div>

              <!-- PRICE INPUT -->
              <div>
                <label style="display:block; margin-bottom:4px; color:#666; font-weight:600;">Precio Unitario</label>
                <input id="swal-edit-price" type="number" class="swal2-input" style="margin:0; width:100%; height:38px;" 
                       value="${currentPrecio}" min="0" step="any">
              </div>
            </div>

            <div>
              <!-- TOTAL READONLY -->
              <div>
                <label style="display:block; margin-bottom:4px; color:#666; font-weight:600;">Total (Calc)</label>
                <input id="swal-edit-total" type="text" class="swal2-input" style="margin:0; width:100%; height:38px; background:#f0f0f0; color:#333;" 
                       value="${currentTotal}" readonly>
              </div>
            </div>

            <!--DETAILS TEXTAREA-->
            <label style="display:block; margin-bottom:4px; color:#666; font-weight:600;">Comentario / Detalle</label>
            <textarea id="swal-edit-detail" class="swal2-textarea" style="margin:0; width:100%; height:80px; font-size:14px;" 
                      placeholder="Detalles de la venta...">${currentDetalle}</textarea>
            
            ${isGasto ? '<div style="margin-top:10px; font-size:12px; color:#d63031; background:rgba(231,76,60,0.1); padding:5px; border-radius:4px;">⚠️ Es un Gasto: El total se guardará como negativo.</div>' : ''}
          `,
        showCancelButton: true,
        confirmButtonText: '💾 Guardar Cambios',
        cancelButtonText: 'Cancelar',
        didOpen: () => {
          // LIVE CALCULATION LOGIC
          const qtyInput = document.getElementById('swal-edit-qty');
          const priceInput = document.getElementById('swal-edit-price');
          const totalInput = document.getElementById('swal-edit-total');

          function recalc() {
            const q = parseFloat(qtyInput.value) || 0;
            const p = parseFloat(priceInput.value) || 0;
            const t = q * p;
            totalInput.value = t.toFixed(2);
          }

          qtyInput.addEventListener('input', recalc);
          priceInput.addEventListener('input', recalc);
        },
        preConfirm: () => {
          const newModality = document.getElementById('swal-edit-mode').value;
          const newPayment = document.getElementById('swal-edit-payment').value;
          const newClientId = document.getElementById('swal-edit-client').value;
          const newClientName = document.getElementById('swal-edit-client').options[document.getElementById('swal-edit-client').selectedIndex].text.replace('👤 ', '');
          const newQty = parseFloat(document.getElementById('swal-edit-qty').value);
          const newPrice = parseFloat(document.getElementById('swal-edit-price').value);
          const newDetail = document.getElementById('swal-edit-detail').value.trim();

          if (!newDetail) return Swal.showValidationMessage('El detalle es obligatorio');
          if (isNaN(newQty) || newQty <= 0) return Swal.showValidationMessage('Cantidad inválida');
          if (isNaN(newPrice) || newPrice < 0) return Swal.showValidationMessage('Precio inválido');

          return { newModality, newPayment, newClientId, newClientName, newQty, newPrice, newDetail };
        }
      }).then((result) => {
        if (result.isConfirmed) {
          const { newModality, newPayment, newClientId, newClientName, newQty, newPrice, newDetail } = result.value;

          // Calculate Final Total
          let finalTotal = newQty * newPrice;

          // Handle Negativity for Expenses
          if (isGasto || (data.total < 0 && data.tipo !== 'Camión')) {
            finalTotal = -Math.abs(finalTotal);
          }

          const updateData = {
            subtipo: newModality, // Save specific mode
            estadoPago: newPayment,
            clienteId: newClientId || null,
            clienteNombre: newClientId ? newClientName : 'Casual',
            cantidad: newQty,
            precioUnitario: newPrice,
            total: finalTotal,
            detalles: newDetail,
            descripcion: newDetail,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          };

          // Update description if Camion to match format (optional but good for consistency)
          if (isCamion) {
            // Keep the format "Ruta: Name (Mode) - Address" if possible, or just append new comment
            // If user edited the whole detail box, use that.
            // If we want to force "Modalidad" into text:
            // updateData.detalles = `${ newDetail } `; // Just use what user wrote
          }

          window.ventasRef.doc(id).update(updateData).then(() => {
            Swal.fire({
              icon: 'success',
              title: 'Registro Actualizado',
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 2000
            });
          }).catch(err => {
            console.error(err);
            Swal.fire('Error', 'No se pudo actualizar', 'error');
          });
        }
      });

    }).catch(err => {
      loadingPopup.close();
      console.error(err);
      Swal.fire('Error', 'Error de conexión', 'error');
    });
  };

  // Consolidating renderTableRows... usage of duplicate removed.

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
    let totalDinero = 0; // Ganancia Neta
    let totalGrossSales = 0; // Ventas Brutas
    let totalLocal = 0;
    let totalDelivery = 0;
    let totalCamion = 0;
    let totalBotellones = 0;
    let totalOtro = 0;
    let totalGastos = 0;

    if (ventasDelDia) {
      ventasDelDia.forEach(r => {
        const val = Number(r.total) || 0;

        // Net Profit (Sales - Expenses)
        totalDinero += val;

        if (r.tipo === 'Gasto') {
          totalGastos += Math.abs(val);
        } else {
          // Gross Sales (Positive values only)
          if (val > 0) totalGrossSales += val;

          // Count Items
          const qty = Number(r.cantidad) || 0;
          totalBotellones += qty;

          if (r.tipo === 'Local') totalLocal += qty;
          if (r.tipo === 'Delivery') totalDelivery += qty;
          // if (r.tipo === 'Camión') totalCamion += qty; // Removido: Se calcula quincenalmente abajo
          if (r.tipo === 'Otros') totalOtro += qty;
        }
      });
    }

    // --- CÁLCULO CAMIÓN (Corte Quincenal: 1-15 y 16-Fin) ---
    if (window.allRecentVentas) {
      const now = new Date();
      const curDay = now.getDate();
      const startDay = curDay > 15 ? 16 : 1;

      // Inicio del periodo (00:00:00)
      const startDate = new Date(now.getFullYear(), now.getMonth(), startDay);
      startDate.setHours(0, 0, 0, 0);

      window.allRecentVentas.forEach(r => {
        if (r.tipo === 'Camión') {
          let d = null;
          if (r.createdAt && r.createdAt.seconds) d = new Date(r.createdAt.seconds * 1000);
          else if (r.timestamp) d = new Date(r.timestamp);

          // Si la venta es de este periodo, sumar
          if (d && d >= startDate) {
            totalCamion += (Number(r.cantidad) || 0);
          }
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
      elTotalGastos.style.width = (elTotalGastos.value.length + 2) + 'ch';
    }

    // Reuse calculated values for Dashboard
    const totalTx = ventasDelDia.length;

    // --- UPDATE NEW DASHBOARD CARDS ---

    // 1. Ganancia Neta (Net Profit)
    if (document.getElementById('dashNet')) {
      const dashNetEl = document.getElementById('dashNet');
      dashNetEl.textContent = formatCurrency(totalDinero);
      dashNetEl.style.color = totalDinero < 0 ? '#ff7675' : '#3498db';
    }

    // 2. Ventas Brutas (Gross Sales)
    if (document.getElementById('dashGrossSales')) {
      document.getElementById('dashGrossSales').textContent = formatCurrency(totalGrossSales);
    }

    // 3. Gastos (Expenses)
    if (document.getElementById('dashExpenses')) {
      document.getElementById('dashExpenses').textContent = formatCurrency(totalGastos);
    }

    // 4. Botellones
    if (document.getElementById('dashBotellones')) {
      document.getElementById('dashBotellones').textContent = totalBotellones;
    }

    // --- OLD DASHBOARD FALLBACK (Keep for safety or remove if unused) ---
    // Update UI
    if (document.getElementById('dashTotal')) {
      const dashTotalEl = document.getElementById('dashTotal');
      dashTotalEl.textContent = formatCurrency(totalDinero);
      if (totalDinero < 0) {
        dashTotalEl.style.color = '#ff7675';
      } else {
        dashTotalEl.style.color = '#2ecc71';
      }
    }

    // Debt Calculation - Global Query (All-time pending)
    window.db.collection('ventas')
      .where('estadoPago', '==', 'pendiente')
      .get()
      .then(snap => {
        let totalDeudaGlobal = 0;
        snap.forEach(doc => {
          totalDeudaGlobal += (Number(doc.data().total) || 0);
        });
        if (document.getElementById('dashDeuda')) {
          document.getElementById('dashDeuda').textContent = formatCurrency(totalDeudaGlobal);
        }
      })
      .catch(err => console.error("Error calculating global debt:", err));

    // Stock Calculation 
    // ... (Keep existing or update)

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
    notification.style.cssText = `position: fixed; top: 20px; right: 20px; background:${color}; color: white; padding: 12px 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); z-index: 9999; font-weight: 700;`;
    notification.textContent = mensaje;
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.opacity = '0'; notification.style.transform = 'translateY(-10px)'; setTimeout(() => notification.remove(), 300); }, 2600);
  }


  // --- 🧭 NAVEGACIÓN ---
  window.mostrarSeccion = function (targetTab) {
    const isAdmin = window.currentUserRole === 'admin';
    const restrictedSections = ['dashboard', 'reportes', 'config', 'empleados'];

    // Unauthorized access guard
    if (restrictedSections.includes(targetTab) && !isAdmin) {
      console.warn(`🔒 Access denied to ${targetTab} for role ${window.currentUserRole}`);
      // Redirect to their default section
      const fallback = (window.currentUserRole === 'camion') ? 'camion' : 'planta';
      if (targetTab !== fallback) return window.mostrarSeccion(fallback);
      return; // Stop if already on fallback to avoid recursion
    }

    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    const title = document.querySelector('header h2');
    const viewTitleMap = {
      'dashboard': 'Panel Principal',
      'planta': 'Venta en Planta',
      'camion': 'Venta Camiones',
      'ruta': 'Ruta del Día',
      'gastos': 'Registro de Gastos',
      'reportes': 'Reportes y Finanzas',
      'historial': 'Historial de Transacciones',
      'produccion': 'Registro de Producción',
      'clientes': 'Gestión de Clientes',
      'empleados': 'Gestión de Empleados',
      'perfil': 'Mi Perfil',
      'config': 'Configuración del Sistema'
    };

    // 1. Update Buttons
    navBtns.forEach(b => {
      b.classList.remove('active');
      if (b.getAttribute('data-tab') === targetTab) b.classList.add('active');
    });

    // 2. Update Views
    views.forEach(v => {
      v.classList.remove('active');
      v.style.display = 'none'; // Ensure hide
    });
    const targetView = document.getElementById(`view-${targetTab}`);
    if (targetView) {
      targetView.classList.add('active');
      targetView.style.display = 'block'; // Ensure show (overrides CSS grid quirks sometimes)
    }

    // 3. Update Title
    if (title && viewTitleMap[targetTab]) {
      title.textContent = viewTitleMap[targetTab];
    }

    // 4. Close Sidebar (Mobile)
    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
    }

    // 5. Specific View Logic
    if (targetTab === 'historial') {
      if (typeof actualizarTablaRegistros === 'function') actualizarTablaRegistros();
    } else if (targetTab === 'perfil') {
      if (typeof actualizarPerfilVisual === 'function') actualizarPerfilVisual();
    }

    // 6. Persist State
    localStorage.setItem('activeView', targetTab);
  };

  function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn, .drawer-btn');
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (targetTab) window.mostrarSeccion(targetTab);
      });
    });
  }

  // --- 🚀 INICIALIZACIÓN ---
  // Old init function removed


  // ---------- AUTH & LIFECYCLE ----------
  let currentUser = null; // Global reference for the current user

  // --- Listener de Autenticación ---
  // --- 🚀 AUTHENTICATION BRIDGE ---

  // This function is called by js/app.js -> js/modules/auth.js when auth state changes

  // --- AUTH UI UPDATE ---
  window.updateAuthUI = function (user) {
    const loginView = document.getElementById('view-login');
    const appContent = document.getElementById('app-content');
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');

    if (user) {
      console.log("✅ User authenticated:", user.email);
      currentUser = user;

      if (loginView) loginView.style.display = 'none';
      if (appContent) appContent.style.display = 'flex';
      if (loginScreen) loginScreen.style.display = 'none';
      if (appContainer) appContainer.style.display = 'block';

      window.currentUserEmail = user.email;

      // --- ROLE MAPPING (Case Insensitive) ---
      const email = user.email.toLowerCase();
      let role = 'invitado';
      if (email === 'admin@awa.com') role = 'admin';
      else if (email === 'camion@awa.com') role = 'camion';
      else if (email === 'planta@awa.com') role = 'planta';

      console.log(`👤 User: ${email}, Role: ${role} `);
      window.currentUserRole = role;

      const lastView = localStorage.getItem('activeView');

      // Standard show: clears inline style so CSS (media queries) can take over. (For Admin)
      const show = (id) => { const el = document.getElementById(id); if (el) el.style.removeProperty('display'); };
      // ForceShow: Use !important to override .mobile-hidden for specific Staff items.
      const forceShow = (id) => { const el = document.getElementById(id); if (el) el.style.setProperty('display', 'flex', 'important'); };
      // Fix: 'hide' forces none, overriding everything (even !important CSS).
      const hide = (id) => { const el = document.getElementById(id); if (el) el.style.setProperty('display', 'none', 'important'); };

      // --- RESET VISIBILITY (Prevent Leaks) ---
      ['nav-dashboard', 'nav-reportes', 'nav-clientes', 'nav-config', 'nav-planta', 'nav-produccion', 'nav-camion', 'nav-gastos', 'nav-historial', 'nav-more', 'nav-empleados', 'nav-perfil', 'nav-ruta'].forEach(hide);

      if (role === 'admin') {
        // --- ADMIN: PRIORITY NAV + DRAWER ---
        // Enable ALL standard nav items. 
        // CSS (.mobile-hidden) will hide secondary ones on Mobile, but show on Desktop.
        ['nav-dashboard', 'nav-reportes', 'nav-clientes', 'nav-historial', 'nav-more',
          'nav-planta', 'nav-camion', 'nav-gastos', 'nav-produccion', 'nav-config', 'nav-empleados', 'nav-perfil', 'nav-ruta'].forEach(show);

        // Ensure Menu View is managed
        // (No special action needed, mostrarSeccion handles it if ID exists)

        window.mostrarSeccion(lastView || 'dashboard');

      } else {
        // --- STAFF: DIRECT NAV (NO DRAWER) ---
        hide('mobileDrawer');

        if (role === 'camion') {
          // CAMION: Ruta, Dashboard, Clientes, Gastos, Historial, Perfil
          forceShow('nav-ruta');
          forceShow('nav-dashboard');
          forceShow('nav-clientes');
          forceShow('nav-gastos');
          forceShow('nav-historial');
          forceShow('nav-perfil');

          const allowed = ['ruta', 'dashboard', 'clientes', 'gastos', 'historial', 'perfil'];
          const target = (lastView && allowed.includes(lastView)) ? lastView : 'ruta';
          window.mostrarSeccion(target);

        } else if (role === 'planta') {
          // PLANTA: Planta, Produccion, Gastos, Historial, Perfil
          forceShow('nav-planta');
          forceShow('nav-produccion');
          forceShow('nav-gastos');
          forceShow('nav-historial');
          forceShow('nav-perfil');

          const allowed = ['planta', 'produccion', 'gastos', 'historial', 'perfil'];
          const target = (lastView && allowed.includes(lastView)) ? lastView : 'planta';
          window.mostrarSeccion(target);
        } else {
          window.mostrarSeccion('dashboard'); // Fallback
        }
      }

      init();
      actualizarEmpleadosVisual();
      actualizarFecha();

      // Re-setup navigation listeners to include new drawer buttons
      configurarNavegacion();

      // Notification Request
      if ('Notification' in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        window.solicitarNotificaciones();
      }

    } else {
      console.log("🔒 Logout");
      currentUser = null;
      window.currentUserEmail = null;
      window.currentUserRole = null;

      if (loginView) loginView.style.display = 'flex';
      if (appContent) appContent.style.display = 'none';
      if (loginScreen) loginScreen.style.display = 'flex';
      if (appContainer) appContainer.style.display = 'none';
    }
  };

  // ... (Login Form Listener remains similar)

  // ...

  // --- RENDER TABLE ROWS (HIDE DELETE) ---
  function renderTableRows(tbody, data) {
    if (!data) return;
    const isAdmin = window.currentUserRole === 'admin';

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
      let modalidad = '-';

      if (registro.tipo === 'Camión') {
        if (/Solo/i.test(detalles)) {
          modalidad = 'Solo';
          detalles = detalles.replace(/Solo/i, '').trim();
        } else if (/Ayudante/i.test(detalles)) {
          modalidad = 'Ayudante';
          detalles = detalles.replace(/Ayudante/i, '').trim();
        }
        detalles = detalles.replace(/^\s*-\s*/, '').replace(/\s*-\s*$/, '').replace(/\s*-\s*-\s*/g, ' - ').trim();
        if (detalles === '') detalles = '-';
      }

      const cantidad = registro.totalBotellones || registro.cantidad || '-';
      const total = Number(registro.total) || 0;
      const color = total < 0 ? '#e74c3c' : '#27ae60';
      const textoTotal = total < 0 ? ('-' + formatCurrency(Math.abs(total))) : formatCurrency(total);
      const precioUnit = registro.precioUnitario || '-';

      let fechaStr = '-';
      try {
        const fs = getFechaFromId(registro);
        fechaStr = fs.toLocaleDateString();
      } catch (e) { fechaStr = 'Hoy'; }

      let actionButtons = `
        <button class="edit-btn" onclick="event.stopPropagation(); editarRegistro('${registro.id}')" style="background:none; border:none; cursor:pointer; margin-right:8px;"><i class="bi bi-pencil-square"></i></button>
      `;

      // Only add delete button if Admin
      if (isAdmin) {
        actionButtons += `<button class="delete-btn" onclick="event.stopPropagation(); eliminarRegistro('${registro.id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer;"><i class="bi bi-trash"></i></button>`;
      }

      return `
        <tr class="venta-${tipoClass} history-card" onclick="this.classList.toggle('expanded')" style="cursor:pointer; background:rgba(255,255,255,0.03); transition:transform 0.2s;">
            <td class="col-date" data-label="Fecha" style="padding:16px; border-radius:12px 0 0 12px;">${fechaStr}</td>
            
            <td class="col-time" data-label="Hora" style="padding:16px;">
                <span class="mobile-label">Hora:</span>
                <span class="cell-value">${registro.hora || '-'}</span>
            </td>

            <td class="col-modalidad-mobile" data-label="Modalidad" style="padding:16px; display:none;">
                <span class="mobile-label">Modalidad:</span>
                <span class="cell-value">${modalidad}</span>
            </td>

            <td class="col-type" data-label="Tipo" style="padding:16px;">
                <span class="service-type ${tipoClass}">${registro.tipo || '-'}</span>
            </td>

            <td class="col-modalidad" data-label="Modalidad" style="padding:16px;">
                 <span class="modalidad-badge ${modalidad.toLowerCase()}">${modalidad}</span>
            </td>

            <td class="col-detail" data-label="Detalle" style="padding:16px; font-size:.95em; color:var(--text-main);">${detalles}</td>
            
            <td class="col-qty" data-label="Cant." style="padding:16px;" class="text-right">
                <span class="mobile-label">Cant:</span>
                <span class="cell-value">${cantidad}</span>
            </td>
            
            <td class="col-price" data-label="Precio" style="padding:16px;" class="text-right">
                <span class="mobile-label">Precio:</span>
                <span class="cell-value">${precioUnit}</span>
            </td>

            <td class="col-total" data-label="Total" style="padding:16px; border-radius:0 12px 12px 0;" class="text-right" style="font-weight:700; color:${color};">${textoTotal}</td>
            
            <td class="col-actions" style="padding:16px;">
                ${actionButtons}
            </td>
          </tr>
        `;

    }).join('');
  }


  // --- FORM LISTENERS (Using Bridged Window Functions) ---

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const pass = document.getElementById('loginPass').value;
      const btn = loginForm.querySelector('button');

      if (btn) {
        btn.disabled = true;
        btn.innerText = "Entrando...";
      }

      // Call the Bridged Login Function
      if (window.login) {
        window.login(email, pass)
          .then(() => {
            // UI update happens via onAuthStateChanged -> updateAuthUI
            if (btn) { btn.disabled = false; btn.innerText = "Entrar"; }
          })
          .catch(err => {
            console.error(err);
            alert("Error: " + err.message);
            if (btn) { btn.disabled = false; btn.innerText = "Entrar"; }
          });
      } else {
        alert("Error crítico: Módulo de Auth no cargado.");
      }
    });
  }

  // Logout Listeners
  const btnLogout = document.getElementById('btnLogout');
  const btnMobileLogout = document.getElementById('btnMobileLogout');

  function handleLogout() {
    if (window.logout) {
      window.logout().then(() => {
        window.location.reload();
      });
    }
  }
  window.handleLogout = handleLogout; // Expose to global scope for drawer button

  if (btnLogout) btnLogout.addEventListener('click', handleLogout);
  if (btnMobileLogout) btnMobileLogout.addEventListener('click', handleLogout);


  function configurarNavegacion() {
    const navBtns = document.querySelectorAll('.nav-btn, .drawer-btn'); // Support both

    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) window.mostrarSeccion(tab);
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
    if (registro.fecha) return new Date(registro.fecha);
    if (registro.createdAt && registro.createdAt.toDate) return registro.createdAt.toDate();
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
    doc.text(`Generado: ${fecha} `, 14, 30);

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

    doc.text(`Rentabilidad: ${net} | Margen: ${margin} | Ticket Prom: ${avg} `, 14, 45);

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
      // Only listen for recent items to avoid reading entire DB history
      // We filter by "today" in client, but limit query to recent 1500 to cover fortnight counters
      ventasRef.orderBy("createdAt", "desc").limit(1500).onSnapshot((snapshot) => {
        console.log("📡 Nuevo snapshot de Firestore");
        ventasDelDia = [];
        allRecentVentas = [];

        // Strict "Today" Filter (Day/Month/Year)
        const now = new Date();
        const tDay = now.getDate();
        const tMonth = now.getMonth();
        const tYear = now.getFullYear();



        snapshot.forEach((doc) => {
          const data = doc.data();
          const registro = { id: doc.id, ...data };

          // Store raw history
          const role = window.currentUserRole;
          const userEmail = window.currentUserEmail;

          let addToHistory = true;

          if (role !== 'admin') {
            const tipo = registro.tipo;
            const registroCat = (registro.categoria || '').toLowerCase();
            const isSensitiveExpense = tipo === 'Gasto' && (registroCat.includes('nómina') || registroCat.includes('nomina') || registroCat.includes('comida'));
            const isCreator = registro.vendedor === userEmail;

            // 1. If it's a sensitive expense, only the creator can see it
            if (isSensitiveExpense && !isCreator) {
              addToHistory = false;
            } else {
              // 2. Role-based filtering for visibility of other types
              if (role === 'camion') {
                // Camion user: only Truck sales and their own records (including Gastos)
                if (tipo !== 'Camión' && tipo !== 'Gasto') {
                  addToHistory = false;
                } else if (registro.vendedor && !isCreator && tipo !== 'Camión') {
                  // Don't show Gastos from others, but show all Truck sales for now (or refine if needed)
                  // For now, if it's Gasto and not theirs, hide it.
                  if (tipo === 'Gasto') addToHistory = false;
                }
              } else if (role === 'planta') {
                // Planta user: Local, Delivery, Produccion, Gastos (not sensitive from others)
                if (!['Local', 'Delivery', 'Gasto', 'Produccion', 'Producción'].includes(tipo)) {
                  addToHistory = false;
                } else if (registro.vendedor && !isCreator) {
                  // If it's a Gasto from someone else, only show if NOT sensitive (handled above)
                  // But usually Planta users should only see their own Gastos anyway if strict.
                  // For now, let's keep it simple: own Gastos = always, others Gastos = only if not sensitive.
                }
              }
            }
          }

          if (addToHistory) {
            allRecentVentas.push(registro);
          }

          // Dashboard Filter: Only Today
          let shouldInclude = false;

          if (data.createdAt === null) {
            // Pending local write -> Include (assume recent)
            shouldInclude = true;
          } else if (data.createdAt) {
            // Firestore Timestamp
            const d = new Date(data.createdAt.seconds * 1000);
            if (d.getDate() === tDay && d.getMonth() === tMonth && d.getFullYear() === tYear) {
              shouldInclude = true;
            }
          } else if (data.timestamp) {
            // Fallback for number timestamp
            const d = new Date(data.timestamp);
            if (d.getDate() === tDay && d.getMonth() === tMonth && d.getFullYear() === tYear) {
              shouldInclude = true;
            }
          } else if (data.fecha) {
            // Legacy String
            const d = new Date(data.fecha);
            if (d.getDate() === tDay && d.getMonth() === tMonth && d.getFullYear() === tYear) {
              shouldInclude = true;
            }
          }

          if (shouldInclude && addToHistory) {
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
    const allTabs = ['dashboard', 'planta', 'camion', 'ruta', 'gastos', 'reportes', 'historial', 'produccion', 'clientes', 'empleados', 'config', 'perfil'];
    let allowedTabs = [];

    if (role === 'admin') {
      allowedTabs = allTabs;
    } else if (role === 'planta') {
      allowedTabs = ['dashboard', 'planta', 'gastos', 'produccion', 'perfil'];
    } else if (role === 'camion') {
      allowedTabs = ['dashboard', 'camion', 'ruta', 'gastos', 'historial', 'clientes', 'perfil'];
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
      mesFilter.value = `${year} -${month} `;
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
          const inputAyer = document.getElementById('prodMedidorAyer');
          if (inputAyer) {
            inputAyer.value = data.medidorActual;

            // LOCK LOGIC: Allow only Admin to edit pre-filled values
            const role = window.currentUserRole || 'user';
            // Wait for role to be set if it's undefined (rare race condition safeguard)
            if (role !== 'admin') {
              inputAyer.disabled = true;
              inputAyer.title = "🔒 Bloqueado (Solo Admin puede editar)";
              inputAyer.style.cursor = "not-allowed";
              inputAyer.style.opacity = "0.7";
            }
          }
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
      yearMonth: `${fecha.getFullYear()} -${String(fecha.getMonth() + 1).padStart(2, '0')} ` // Helper index
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
  // 1. Auto-Reconnect on Resume (App Switching) & Date Check
  window.lastAppDate = window.lastAppDate || new Date().toDateString();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log("🔄 App resumed - checking status...");

      // Check for Date Change (Overnight Fix)
      const currentDate = new Date().toDateString();
      if (window.lastAppDate && window.lastAppDate !== currentDate) {
        console.log("📅 New day detected! Reloading app for fresh data...");
        window.location.reload();
        return; // Reload will happen
      }

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




console.log("🚀 v80 LOADED");

// --- MOBILE UI HELPERS (Static Drawer Refactor v108 - Animation Fixed) ---
window.toggleMobileDrawer = function () {
  const drawer = document.getElementById('mobileDrawer_v81');
  if (!drawer) return;

  const isActive = drawer.classList.contains('active');

  if (!isActive) {
    drawer.style.display = 'flex';
    setTimeout(() => {
      drawer.classList.add('active');
      document.body.style.overflow = 'hidden';
    }, 10);
  } else {
    drawer.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!drawer.classList.contains('active')) {
        drawer.style.display = 'none';
      }
    }, 400);
  }
};


// Hook into existing navigation to auto-close drawer
(function () {
  const originalMostrar = window.mostrarSeccion;
  console.log("Hooking mostrarSeccion. Original exists?", !!originalMostrar);

  window.mostrarSeccion = function (tab) {
    console.log(`Navigate requested to: ${tab} `);
    if (originalMostrar) {
      try {
        originalMostrar(tab);
      } catch (e) {
        console.error("Error inside original mostrarSeccion:", e);
      }
    } else {
      console.error("Original mostrarSeccion is undefined!");
    }
    const drawer = document.getElementById('mobileDrawer_v81');
    if (drawer) {
      drawer.style.display = 'none';
      document.body.style.overflow = ''; // Restore scroll
    }
  };
  // End of file
})();
