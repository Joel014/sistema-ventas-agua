// --- 🔥 CONFIGURACIÓN FIREBASE & GLOBALES ---

const firebaseConfig = {
    apiKey: "AIzaSyCojK8pGgNKb9AhUHo50rgYiW769t_ljmk",
    authDomain: "sistemaventasagua.firebaseapp.com",
    projectId: "sistemaventasagua",
    storageBucket: "sistemaventasagua.firebasestorage.app",
    messagingSenderId: "699153205855",
    appId: "1:699153205855:web:33455493ba6e40b4d029ea"
};

// Inicializar Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Enable offline persistence
firebase.firestore().enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log("Persistence failed: Multiple tabs open");
        } else if (err.code == 'unimplemented') {
            console.log("Persistence not supported by browser");
        }
    });

// Inicializar Firestore (Global)
window.db = firebase.firestore();
window.ventasRef = db.collection("ventas");
window.empleadosRef = db.collection("empleados");
window.clientesRef = db.collection("clientes");
window.produccionRef = db.collection("produccion");

// Estado Global (Exposed to Window)
window.allRecentVentas = []; // Stores recent history (last 500)
window.ventasDelDia = [];    // Stores only today's data (for dashboard)
window.listaClientes = [];   // Stores truck clients
window.contadorVentas = 0;
window.empleados = [];
window.currentUser = null;   // Current Auth User
window.currentUserRole = null;

// Chart Instances
window.myPieChart = null;
window.myTrendChart = null;
window.gastosChartInstance = null;

// Constants
window.PRECIO_LOCAL = 25;
window.PRECIO_CAMION = 30;
window.PRECIO_DELIVERY = 35;
window.rutaDiaList = [];
window.rutaDiaList = [];
