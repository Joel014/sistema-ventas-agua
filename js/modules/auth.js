/**
 * Auth Module
 * Wrapper specific for Firebase v8 (window.firebase) interaction.
 */

export function login(email, password) {
    if (!window.firebase) throw new Error("Firebase not initialized");
    return window.firebase.auth().signInWithEmailAndPassword(email, password);
}

export function logout() {
    if (!window.firebase) throw new Error("Firebase not initialized");
    return window.firebase.auth().signOut();
}

/**
 * Initialize Auth State Listener
 * @param {Function} onUserChanged - Callback(user) when state changes
 */
export function initAuth(onUserChanged) {
    if (!window.firebase) {
        console.error("Firebase not found when initAuth called");
        return;
    }
    window.firebase.auth().onAuthStateChanged((user) => {
        if (onUserChanged) onUserChanged(user);
    });
}
