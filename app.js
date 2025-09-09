function nuevaVenta() {
  const cliente = document.getElementById("cliente").value;
  const cantidad = parseInt(document.getElementById("cantidad").value);

  if (cliente && cantidad > 0) {
    const venta = { 
      cliente, 
      cantidad, 
      fecha: new Date().toISOString() 
    };

    guardarVenta(venta); // 👈 usa la función de script.js
  } else {
    alert("Completa los campos correctamente");
  }
}
