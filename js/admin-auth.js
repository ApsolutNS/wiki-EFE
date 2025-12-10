import { auth } from "./firebase-config.js";
import { db } from "./firebase-config.js";
import { signInWithEmailAndPassword, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { doc, getDoc } 
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ====================================================
   Inicio de sesión usando Firebase Authentication
   ==================================================== */
export async function intentarLogin(email, password) {
    try {
        // Login con Firebase Auth
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const user = cred.user;

        // Validación de permisos en Firestore
        const ref = doc(db, "admin_users", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            console.warn("UID sin permisos admin");
            return false;
        }

        const data = snap.data();
        if (!data.activo) {
            console.warn("Usuario desactivado");
            return false;
        }

        // Guardar sesión local
        localStorage.setItem("fe_admin_user", user.uid);

        return true;
    } catch (e) {
        console.error("Error login:", e);
        return false;
    }
}

/* ====================================================
   Obtener usuario desde sesión local
   ==================================================== */
export function getCurrentUser() {
    return localStorage.getItem("fe_admin_user");
}

/* ====================================================
   Logout
   ==================================================== */
export function logoutAdmin() {
    localStorage.removeItem("fe_admin_user");
    auth.signOut();
}
