import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function intentarLogin(usuario, password) {
    const ref = doc(db, "admin_users", usuario);
    const snap = await getDoc(ref);

    if (!snap.exists()) return false;

    const data = snap.data();

    if (!data.activo) return false;

    if (data.password !== password) return false;

    // Guardar sesión
    localStorage.setItem("fe_admin_user", usuario);

    return true;
}

export function getCurrentUser() {
    return localStorage.getItem("fe_admin_user");
}

export function logoutAdmin() {
    localStorage.removeItem("fe_admin_user");
}
