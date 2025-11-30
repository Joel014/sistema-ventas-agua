import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export class AuthManager {
    constructor(appInstance) {
        this.app = appInstance;
        this.currentUser = null;
        this.userRole = null;
        this.init();
    }

    init() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUserRole(user.email);
                this.app.onLogin(this.userRole);
            } else {
                this.currentUser = null;
                this.userRole = null;
                this.app.onLogout();
            }
        });
    }

    async loadUserRole(email) {
        // Check if user exists in 'usuarios' collection, if not create with default role
        // For simplicity in this demo, we'll assign roles based on email patterns or default to 'admin' for the first user
        // In a real app, you'd create these documents manually in the console or via an admin panel

        try {
            const userRef = doc(db, "usuarios", email);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                this.userRole = data.rol;
            } else {
                // Auto-create for demo purposes (First user is Admin)
                // You should change this logic for production!
                const role = 'admin';
                await setDoc(userRef, {
                    email: email,
                    rol: role,
                    nombre: email.split('@')[0]
                });
                this.userRole = role;
            }
        } catch (error) {
            console.error("Error loading role:", error);
            this.userRole = 'invitado';
        }
    }

    async login(email, password) {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async logout() {
        await signOut(auth);
    }
}
