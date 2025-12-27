// --- UTILITIES ---

function formatCurrency(n) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(n);
}

function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

function getIconForType(tipo) {
  if (tipo === 'Local') return 'shop';
  if (tipo === 'Delivery') return 'bicycle';
  if (tipo === 'Camión') return 'truck';
  if (tipo === 'Gasto') return 'wallet2';
  return 'bag-check';
}

// --- AUTH UTILS ---
window.togglePasswordVisibility = function() {
    const input = document.getElementById('loginPass');
    const icon = document.getElementById('togglePasswordIcon');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    }
}
