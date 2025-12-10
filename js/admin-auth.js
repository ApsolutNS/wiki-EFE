/* ============================================================
   ADMIN-AUTH.JS — Sistema simple basado en Firestore + SHA-256
   ============================================================ */

import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Convertir password a SHA-256 (hex)
export async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// Guardar sesión
export function guardarSesion(user) {
    localStorage.setItem("fe_admin_user", JSON.stringify(user));
}

// Obtener sesión
export function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("fe_admin_user"));
    } catch {
        return null;
    }
}

// Cerrar sesión
export function logout() {
    localStorage.removeItem("fe_admin_user");
    location.reload();
}

// Intento de login
export async function intentarLogin(username, password) {
    try {
        const ref = doc(db, "admin_users", username);
        const snap = await getDoc(ref);

        if (!snap.exists()) return false;

        const data = snap.data();
        const hashIngresado = await sha256(password);

        if (hashIngresado !== data.hash) {
            return false;
        }

        const user = { username, role: data.role || "admin" };
        guardarSesion(user);
        return user;

    } catch (err) {
        console.error("Error login:", err);
        return false;
    }
}
