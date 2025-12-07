// ============================================
// FIREBASE CONFIG
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBL1qT2tLfFTJ_f_3apv_sxKnn28u0nccs",
    authDomain: "financiera-efectiva-kb.firebaseapp.com",
    projectId: "financiera-efectiva-kb",
    storageBucket: "financiera-efectiva-kb.firebasestorage.app",
    messagingSenderId: "508397908196",
    appId: "1:508397908196:web:31d28a73ef56160963fcf1"
};

// Inicializar app SOLO UNA VEZ
const app = initializeApp(firebaseConfig);

// Exportación ÚNICA (antes tenías duplicada)
export const db = getFirestore(app);
