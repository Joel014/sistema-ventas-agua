/**
 * Profile Module
 * Handles persistence for business name and profile photo in Firestore.
 */

export function initProfile() {
    const photoInput = document.getElementById('profilePhotoInput');
    const saveBtn = document.getElementById('btnSaveBusinessName');

    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) uploadProfilePhoto(file);
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const name = document.getElementById('editBusinessName').value;
            saveBusinessName(name);
        });
    }
}

export function resetNotifDot() {
    const dot = document.getElementById('rutaNotifDot');
    if (dot) dot.style.display = 'none';
    localStorage.setItem('awa_last_ruta_count', window.rutaDiaList ? window.rutaDiaList.length : 0);
}


async function uploadProfilePhoto(file) {
    if (file.size > 1024 * 1024) { // 1MB limit for Base64 storage
        Swal.fire('Error', 'La imagen es muy pesada (máximo 1MB)', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64 = e.target.result;
        try {
            await window.db.collection('config').doc('profile').set({
                photoBase64: base64
            }, { merge: true });

            Swal.fire('Éxito', 'Foto actualizada', 'success');
            actualizarPerfilVisual();
        } catch (err) {
            console.error("Error saving photo:", err);
            Swal.fire('Error', 'No se pudo guardar la foto', 'error');
        }
    };
    reader.readAsDataURL(file);
}

async function saveBusinessName(name) {
    if (!name || !name.trim()) return;

    try {
        await window.db.collection('config').doc('profile').set({
            businessName: name.trim()
        }, { merge: true });

        Swal.fire('Éxito', 'Nombre actualizado', 'success');
        actualizarPerfilVisual();
    } catch (err) {
        console.error("Error saving name:", err);
        Swal.fire('Error', 'No se pudo guardar el nombre', 'error');
    }
}

export async function actualizarPerfilVisual() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const email = user.email || 'usuario@correo.com';
    const role = window.currentUserRole || 'Invitado';

    // UI Elements
    const elements = {
        userEmail: document.getElementById('profileUserEmail'),
        emailDisplay: document.getElementById('profileEmailDisplay'),
        roleBadge: document.getElementById('profileRoleBadge'),
        businessName: document.getElementById('profileBusinessName'),
        editName: document.getElementById('editBusinessName'),
        avatar: document.getElementById('profileAvatar'),
        topAvatar: document.getElementById('topBarAvatar'),
        editAvatarBtn: document.querySelector('.btn-avatar-edit'),
        saveBusinessBtn: document.getElementById('btnSaveBusinessName')
    };

    const isAdmin = role === 'admin';

    // Static Data
    if (elements.userEmail) elements.userEmail.textContent = email;
    if (elements.emailDisplay) elements.emailDisplay.textContent = email;
    if (elements.roleBadge) elements.roleBadge.textContent = role.toUpperCase();

    // Role-based visibility for editing
    if (elements.editAvatarBtn) elements.editAvatarBtn.style.display = isAdmin ? 'flex' : 'none';
    if (elements.saveBusinessBtn) elements.saveBusinessBtn.style.display = isAdmin ? 'flex' : 'none';
    if (elements.editName) {
        elements.editName.readOnly = !isAdmin;
        // Visual feedback for read-only
        elements.editName.style.opacity = isAdmin ? '1' : '0.7';
    }

    // Fetch Persistent Data from Firestore
    try {
        const doc = await window.db.collection('config').doc('profile').get();
        if (doc.exists) {
            const data = doc.data();
            if (data.businessName) {
                if (elements.businessName) elements.businessName.textContent = data.businessName;
                if (elements.editName) elements.editName.value = data.businessName;
            } else {
                const defaultName = role === 'admin' ? "BizCore | Admin" : "BizCore Delivery";
                if (elements.businessName) elements.businessName.textContent = defaultName;
                if (elements.editName) elements.editName.value = defaultName;
            }

            if (data.photoBase64 && elements.avatar) {
                const imgHtml = `<img src="${data.photoBase64}" alt="Business Logo">`;
                elements.avatar.innerHTML = imgHtml;
                elements.avatar.classList.add('has-image');
                if (elements.topAvatar) {
                    elements.topAvatar.innerHTML = imgHtml;
                    elements.topAvatar.classList.add('has-image');
                }
            } else if (elements.avatar) {
                const iconHtml = `<i class="bi bi-person-fill"></i>`;
                elements.avatar.innerHTML = `<i class="bi bi-building"></i>`;
                elements.avatar.classList.remove('has-image');
                if (elements.topAvatar) {
                    elements.topAvatar.innerHTML = iconHtml;
                    elements.topAvatar.classList.remove('has-image');
                }
            }
        } else {
            // Default identity if no config exists
            const defaultName = role === 'admin' ? "BizCore | Admin" : "BizCore Delivery";
            if (elements.businessName) elements.businessName.textContent = defaultName;
            if (elements.editName) elements.editName.value = defaultName;
            if (elements.avatar) {
                elements.avatar.innerHTML = `<i class="bi bi-building"></i>`;
                elements.avatar.classList.remove('has-image');
            }
            if (elements.topAvatar) {
                elements.topAvatar.innerHTML = `<i class="bi bi-person-fill"></i>`;
            }
        }
    } catch (err) {
        console.error("Error loading profile data:", err);
    }
}
