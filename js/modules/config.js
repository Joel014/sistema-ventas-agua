/**
 * Config Module
 * Central source of truth for application constants and dynamic settings.
 */

export const APP_INFO = {
    NAME: "BizCore",
    VERSION: "v2.0",
    LAST_UPDATE: "2025"
};

// Default values (used if Firestore is empty)
export let PRICING = {
    LOCAL: 25,
    CAMION: 30,
    DELIVERY: 35
};

/**
 * Initializes a real-time listener for the system configuration.
 */
export function initConfigListener() {
    console.log("⚙️ Initializing Dynamic Config Listener...");

    const db = window.db;
    if (!db) {
        console.error("❌ Firestore not initialized. Config sync failed.");
        return;
    }

    // Reference to the main settings document
    const configRef = db.collection("config").doc("settings");

    return configRef.onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();

            // Update Global Variables
            if (data.precioLocal !== undefined) {
                PRICING.LOCAL = Number(data.precioLocal);
                window.PRECIO_LOCAL = PRICING.LOCAL;
            }
            if (data.precioCamion !== undefined) {
                PRICING.CAMION = Number(data.precioCamion);
                window.PRECIO_CAMION = PRICING.CAMION;
            }
            if (data.precioDelivery !== undefined) {
                PRICING.DELIVERY = Number(data.precioDelivery);
                window.PRECIO_DELIVERY = PRICING.DELIVERY;
            }

            console.log("💰 Dynamic Pricing Updated:", PRICING);

            // Sync UI Labels if they exist
            updatePricingLabels();

            // Sync Config Form if we are in that view
            updateConfigForm(data);
        } else {
            console.warn("⚠️ No remote config found. Using defaults.");
            // Optionally initialize with defaults
            // configRef.set(PRICING);
        }
    }, (error) => {
        console.error("❌ Error listening to config:", error);
    });
}

/**
 * Updates all price labels visible in the app.
 */
function updatePricingLabels() {
    const elLocal = document.getElementById('priceLocal');
    if (elLocal) elLocal.textContent = PRICING.LOCAL;

    const elCamion = document.getElementById('priceCamion');
    if (elCamion) elCamion.textContent = PRICING.CAMION;

    // Delivery price is usually shown in multiple places via placeholders or manual labels
    // We add more sync IDs if needed in the HTML
}

/**
 * Updates the fields in the Config View form.
 */
function updateConfigForm(data) {
    const inputLocal = document.getElementById('configPrecioLocal');
    const inputCamion = document.getElementById('configPrecioCamion');
    const inputDelivery = document.getElementById('configPrecioDelivery');

    if (inputLocal) inputLocal.value = data.precioLocal || PRICING.LOCAL;
    if (inputCamion) inputCamion.value = data.precioCamion || PRICING.CAMION;
    if (inputDelivery) inputDelivery.value = data.precioDelivery || PRICING.DELIVERY;
}

/**
 * Saves new configuration to Firestore.
 */
export async function saveConfig() {
    const inputLocal = document.getElementById('configPrecioLocal');
    const inputCamion = document.getElementById('configPrecioCamion');
    const inputDelivery = document.getElementById('configPrecioDelivery');

    if (!inputLocal || !inputCamion || !inputDelivery) return;

    const newConfig = {
        precioLocal: Number(inputLocal.value),
        precioCamion: Number(inputCamion.value),
        precioDelivery: Number(inputDelivery.value),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: window.currentUserEmail || 'unknown'
    };

    try {
        const db = window.db;
        await db.collection("config").doc("settings").set(newConfig, { merge: true });

        if (window.mostrarConfirmacion) {
            window.mostrarConfirmacion('✅ Configuración guardada correctamente', '#2ecc71');
        } else {
            alert("✅ Configuración guardada");
        }
    } catch (err) {
        console.error("❌ Error saving config:", err);
        alert("Error al guardar la configuración");
    }
}
