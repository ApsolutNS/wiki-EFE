// =============================
// admin-auth.js (FINAL)
// =============================
import { auth, db } from "./firebase-config.js";
import {
    signInWithEmailAndPassword,
    signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ============================================================
   LOGIN (email + contraseña con Firebase Auth)
   ============================================================ */
export async function intentarLogin(email, password) {
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const user = cred.user;

        // Validar permisos en Firestore por UID
        const ref = doc(db, "admin_users", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists() || snap.data().activo !== true) {
            console.warn("Usuario sin permisos admin");
            await signOut(auth);
            return false;
        }

        // Guardar UID en sesión local
        localStorage.setItem("fe_admin_uid", user.uid);

        return true;

    } catch (e) {
        console.error("Error login:", e);
        return false;
    }
}

/* ============================================================
   Sesión
   ============================================================ */
export function getCurrentUser() {
    return localStorage.getItem("fe_admin_uid");
}

export function logoutAdmin() {
    localStorage.removeItem("fe_admin_uid");
    return signOut(auth);
}
