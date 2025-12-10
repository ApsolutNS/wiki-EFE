import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } 
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * LOGIN SEGURO
 */
export async function intentarLogin(email, password) {
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;

        // Verificar rol admin
        const ref = doc(db, "admin_users", uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            console.warn("Usuario no tiene registro admin_users");
            await signOut(auth);
            return false;
        }

        const data = snap.data();

        if (!data.activo || data.role !== "admin") {
            console.warn("Usuario sin permisos admin");
            await signOut(auth);
            return false;
        }

        // Sesión válida
        localStorage.setItem("fe_admin_uid", uid);
        return true;

    } catch (e) {
        console.error("Error login:", e);
        return false;
    }
}

/**
 * OBTENER USUARIO LOGUEADO
 */
export function getCurrentUser() {
    return localStorage.getItem("fe_admin_uid") || null;
}

/**
 * LOGOUT
 */
export async function logoutAdmin() {
    localStorage.removeItem("fe_admin_uid");
    await signOut(auth);
}

/**
 * PROTEGER RUTAS
 */
export function protegerVista(callback) {
    onAuthStateChanged(auth, async user => {
        if (!user) {
            logoutAdmin();
            window.location.href = "admin.html"; // redirigir al login
            return;
        }

        const uid = user.uid;

        const ref = doc(db, "admin_users", uid);
        const snap = await getDoc(ref);

        if (!snap.exists() || snap.data().role !== "admin") {
            logoutAdmin();
            return;
        }

        callback(); // usuario autorizado
    });
}
