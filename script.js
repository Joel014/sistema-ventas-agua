        let ventasDelDia = [];
        let contadorVentas = 0;

        // Roster de repartidores
        let empleados = [];
        // Para esta venta, los inputs viven en el DOM. Calculamos sumas leyendo esos inputs.

        function agregarEmpleado() {
            const nombre = document.getElementById('empleadoNombre').value.trim();

            if (!nombre) {
                alert('⚠️ Por favor ingresa el nombre del repartidor');
                document.getElementById('empleadoNombre').focus();
                return;
            }

            if (empleados.some(emp => emp.nombre.toLowerCase() === nombre.toLowerCase())) {
                alert('⚠️ Ya existe un repartidor con ese nombre');
                return;
            }

            const empleado = {
                id: Date.now(),
                nombre: nombre
            };

            empleados.push(empleado);
            actualizarEmpleadosVisual();

            document.getElementById('empleadoNombre').value = '';
            document.getElementById('empleadoNombre').focus();
        }

        function eliminarEmpleado(id) {
            const emp = empleados.find(e => e.id === id);
            if (!emp) return;
            if (confirm(`¿Eliminar al repartidor "${emp.nombre}"?`)) {
                empleados = empleados.filter(e => e.id !== id);
                actualizarEmpleadosVisual();
                calcularTotal();
            }
        }

        function actualizarEmpleadosVisual() {
            const container = document.getElementById('empleadosContainer');
            if (empleados.length === 0) {
                container.innerHTML = '<div style="color: #999; font-style: italic; grid-column: 1 / -1;">No hay repartidores agregados</div>';
                return;
            }

            container.innerHTML = empleados.map(emp => `
                <div class="employee-card" id="emp-${emp.id}">
                    <div class="employee-header">
                        <div class="employee-name">👤 ${emp.nombre}</div>
                        <button class="remove-employee-btn" title="Eliminar repartidor" onclick="eliminarEmpleado(${emp.id})">×</button>
                    </div>
                    <div class="mini-label">Botellones de ESTE pedido</div>
                    
                    <div class="input-with-btn">
                        <input type="number" min="0" max="50" placeholder="0" 
                            class="empleado-cantidad" data-emp-id="${emp.id}" oninput="calcularTotal()">
                        <button type="button" class="save-inline-btn" onclick="guardarIndividual('empleado-${emp.id}')">💾</button>
                    </div>
                </div>
            `).join('');

        }

        function obtenerEntregasDeEstaVenta() {
            // Lee todas las cantidades > 0 ingresadas en tarjetas de empleados
            const inputs = document.querySelectorAll('.empleado-cantidad');
            const entregas = [];
            inputs.forEach(inp => {
                const cantidad = parseInt(inp.value) || 0;
                if (cantidad > 0) {
                    const empId = parseInt(inp.getAttribute('data-emp-id'));
                    const emp = empleados.find(e => e.id === empId);
                    if (emp) {
                        entregas.push({
                            empleadoId: emp.id,
                            nombre: emp.nombre,
                            cantidad: cantidad
                        });
                    }
                }
            });
            return entregas;
        }

        function calcularTotal() {
            const ventaLocal = parseInt(document.getElementById('ventaLocal').value) || 0;
            const camion = parseInt(document.getElementById('camion').value) || 0;

            const entregas = obtenerEntregasDeEstaVenta();
            const totalDelivery = entregas.reduce((sum, e) => sum + e.cantidad, 0);

            const totalBotellones = ventaLocal + totalDelivery + camion;
            const totalLocal = ventaLocal * 25;
            const totalDeliveryMonto = totalDelivery * 35;
            const totalCamion = camion * 30;
            const totalGeneral = totalLocal + totalDeliveryMonto + totalCamion;

            document.getElementById('totalBotellones').textContent = totalBotellones;
            document.getElementById('totalPagar').textContent = `$${totalGeneral}`;
            document.getElementById('montoFinal').textContent = `$${totalGeneral}`;

            // Tipo de servicio
            const tiposActivos = [];
            if (ventaLocal > 0) tiposActivos.push('Local');
            if (totalDelivery > 0) tiposActivos.push('Delivery');
            if (camion > 0) tiposActivos.push('Camión');

            const tipoServicio = tiposActivos.length === 0 ? '-' : (tiposActivos.length === 1 ? tiposActivos[0] : 'Mixto');
            
            let precioServicio = [];
            if (ventaLocal > 0) precioServicio.push('Local $25');
            if (totalDelivery > 0) precioServicio.push('Delivery $35');
            if (camion > 0) precioServicio.push('Camión $30');
            precioServicio = precioServicio.length === 0 ? '$0' : precioServicio.join(' | ');

            document.getElementById('tipoServicio').textContent = tipoServicio;
            document.getElementById('precioServicio').textContent = precioServicio;
        }

        function guardarVenta() {
            const ventaLocal = parseInt(document.getElementById('ventaLocal').value) || 0;
            const camion = parseInt(document.getElementById('camion').value) || 0;
            const entregas = obtenerEntregasDeEstaVenta();
            const totalDelivery = entregas.reduce((sum, e) => sum + e.cantidad, 0);

            if (ventaLocal === 0 && totalDelivery === 0 && camion === 0) {
                alert('⚠️ Debe ingresar al menos un botellón para guardar la venta');
                return;
            }

            const ahora = new Date();
            const hora = ahora.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});

            const totalBotellones = ventaLocal + totalDelivery + camion;
            const totalLocal = ventaLocal * 25;
            const totalDeliveryMonto = totalDelivery * 35;
            const totalCamion = camion * 30;
            const totalGeneral = totalLocal + totalDeliveryMonto + totalCamion;

            const tiposActivos = [];
            if (ventaLocal > 0) tiposActivos.push('Local');
            if (totalDelivery > 0) tiposActivos.push('Delivery');
            if (camion > 0) tiposActivos.push('Camión');

            const tipoServicio = tiposActivos.length === 0 ? '-' : (tiposActivos.length === 1 ? tiposActivos[0] : 'Mixto');
            const precioUnitario = tiposActivos.length === 1
                ? (tipoServicio === 'Local' ? '$25' : tipoServicio === 'Delivery' ? '$35' : '$30') 
                : 'Var.';

            // Detalles de reparto (quién llevó y cuánto)
            const detallesEntregas = entregas.length > 0
                ? entregas.map(e => `${e.nombre}(${e.cantidad})`).join(', ')
                : '';

            const nuevaVenta = {
                id: ++contadorVentas,
                hora: hora,
                tipo: tipoServicio,
                ventaLocal: ventaLocal,
                totalDelivery: totalDelivery,
                entregasDelivery: entregas, // [{empleadoId, nombre, cantidad}]
                detallesEntregas: detallesEntregas,
                camion: camion,
                totalBotellones: totalBotellones,
                precioUnitario: precioUnitario,
                total: totalGeneral
            };

            ventasDelDia.push(nuevaVenta);
            actualizarTablaRegistros();
            actualizarTotalDiario();
            limpiarFormulario();

            // Animación de confirmación
            const btnGuardar = document.querySelector('.btn-save');
            const textoOriginal = btnGuardar.innerHTML;
            btnGuardar.innerHTML = '✅ Guardado!';
            btnGuardar.style.background = '#27ae60';
            btnGuardar.classList.add('success-animation');
            
            setTimeout(() => {
                btnGuardar.innerHTML = textoOriginal;
                btnGuardar.style.background = 'linear-gradient(45deg, #56ab2f, #a8e6cf)';
                btnGuardar.classList.remove('success-animation');
            }, 1500);
        }

        function actualizarTablaRegistros() {
            const tbody = document.getElementById('tablaRegistros');
            
            if (ventasDelDia.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="color: #888; font-style: italic;">No hay ventas registradas</td></tr>';
                return;
            }
            
            tbody.innerHTML = ventasDelDia.map(venta => {
                let tipoClass = venta.tipo.toLowerCase();
                // Mapear correctamente las clases (sin acentos)
                if (tipoClass.includes('cam')) tipoClass = 'camion';
                else if (tipoClass.includes('loc')) tipoClass = 'local';
                else if (tipoClass.includes('mix')) tipoClass = 'mixto';
                else if (tipoClass.includes('del')) tipoClass = 'delivery';

                // Detalles visibles: para delivery mostramos quién llevó
                const detalles = venta.detallesEntregas && venta.detallesEntregas.trim().length > 0
                    ? venta.detallesEntregas
                    : '-';

                return `
                    <tr>
                        <td>${venta.hora}</td>
                        <td><span class="service-type ${tipoClass}">${venta.tipo}</span></td>
                        <td style="font-size: 0.9em;">${detalles}</td>
                        <td>${venta.totalBotellones}</td>
                        <td>${venta.precioUnitario}</td>
                        <td style="font-weight: bold; color: #27ae60;">${venta.total}</td>
                        <td><button class="delete-btn" onclick="eliminarVenta(${venta.id})">🗑️</button></td>
                    </tr>
                `;
            }).join('');
        }

        function eliminarVenta(id) {
            if (confirm('¿Está seguro de eliminar esta venta?')) {
                ventasDelDia = ventasDelDia.filter(venta => venta.id !== id);
                actualizarTablaRegistros();
                actualizarTotalDiario();
            }
        }

        function actualizarTotalDiario() {
            const totalDinero = ventasDelDia.reduce((sum, venta) => sum + venta.total, 0);
            const totalLocal = ventasDelDia.reduce((sum, venta) => sum + venta.ventaLocal, 0);
            const totalDelivery = ventasDelDia.reduce((sum, venta) => sum + (venta.totalDelivery || 0), 0);
            const totalCamion = ventasDelDia.reduce((sum, venta) => sum + (venta.camion || 0), 0);
            const totalBotellones = ventasDelDia.reduce((sum, venta) => sum + venta.totalBotellones, 0);
            
            document.getElementById('totalDiario').textContent = `$${totalDinero}`;
            document.getElementById('ventasLocal').textContent = totalLocal;
            document.getElementById('ventasDelivery').textContent = totalDelivery;
            document.getElementById('ventasCamion').textContent = totalCamion;
            document.getElementById('botellonesTotal').textContent = totalBotellones;
        }

        function limpiarFormulario() {
            document.getElementById('ventaLocal').value = '';
            document.getElementById('camion').value = '';
            // Limpiar cantidades por repartidor (pero mantener el roster)
            const inputs = document.querySelectorAll('.empleado-cantidad');
            inputs.forEach(inp => inp.value = '');
            calcularTotal();
        }

        function limpiarRegistros() {
            if (confirm('¿Está seguro de eliminar todos los registros del día?')) {
                ventasDelDia = [];
                contadorVentas = 0;
                actualizarTablaRegistros();
                actualizarTotalDiario();
            }
        }

        function exportarCSV() {
            if (ventasDelDia.length === 0) {
                alert("⚠️ No hay ventas para exportar");
                return;
            }

            const fecha = new Date().toLocaleDateString('es-ES');
            let csvContent = "Fecha,Hora,Tipo de Venta,Detalles Entregas,Cantidad Total,Precio Unitario,Total\n";

            ventasDelDia.forEach(venta => {
                let fila = [
                    fecha,
                    venta.hora,
                    venta.tipo,
                    `"${venta.detallesEntregas || ''}"`,
                    venta.totalBotellones,
                    venta.precioUnitario.replace('$',''),
                    venta.total
                ];
                csvContent += fila.join(",") + "\n";
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `ventas_agua_${fecha.replace(/\//g, '-')}.csv`);
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            alert("✅ Archivo CSV exportado correctamente!");
        }

        // Permitir agregar repartidor con Enter
        document.getElementById('empleadoNombre').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                agregarEmpleado();
            }
        });

        // Inicializar
        calcularTotal();

        function guardarIndividual(campo) {
    calcularTotal();
    guardarVenta(); 
    alert(`✅ Venta guardada desde el campo: ${campo}`);
}
