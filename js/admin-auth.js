// ==============================
// ADMIN AUTH - basado 100% en Firestore
// ==============================
import { db } from "./firebase-config.js";
import { doc, getDoc } 
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ------ HASH SHA-256 ------
async function sha256(text) {
    const enc = new TextEncoder().encode(text);
    const buff = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buff))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// ------ LOGIN ------
export async function intentarLogin(username, password) {
    try {
        const ref = doc(db, "admin_users", username);
        const snap = await getDoc(ref);

        if (!snap.exists()) return false;

        const data = snap.data();

        if (data.disabled) return false;

        const hash = await sha256(password);

        if (hash !== data.passwordHash) return false;

        // Guardar sesión local
        sessionStorage.setItem("fe_admin_user", JSON.stringify({
            username: data.username,
            role: data.role
        }));

        return true;

    } catch (e) {
        console.error("Error login:", e);
        return false;
    }
}

// ------ OBTENER USUARIO ACTUAL ------
export function getCurrentUser() {
    const raw = sessionStorage.getItem("fe_admin_user");
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch { return null; }
}

// ------ LOGOUT ------
export function logoutAdmin() {
    sessionStorage.removeItem("fe_admin_user");
    window.location.reload();
}
