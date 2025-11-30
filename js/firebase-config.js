import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
export const db = getFirestore(app);
export const auth = getAuth(app);
